/**
 * Invoice Processor
 * 
 * Handles invoice data collection, validation, and processing.
 * Integrates with OCR and fraud detection in the Intelligent Layer.
 */

const Invoice = require('../../models/Invoice');
const Vendor = require('../../models/Vendor');
const Payment = require('../../models/Payment');

class InvoiceProcessor {
  /**
   * Create new invoice
   */
  static async createInvoice(invoiceData) {
    // Validate vendor exists
    const vendor = await Vendor.findById(invoiceData.vendor);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNumber = `INV-${Date.now()}-${String(invoiceCount + 1).padStart(6, '0')}`;

    const invoice = await Invoice.create({
      ...invoiceData,
      invoiceNumber,
      status: 'pending',
      validationStatus: 'pending'
    });

    return invoice;
  }

  /**
   * Bulk import invoices
   */
  static async bulkImportInvoices(invoicesData) {
    const results = {
      success: [],
      failed: [],
      duplicates: []
    };

    for (const data of invoicesData) {
      try {
        // Check for duplicates
        const existing = await Invoice.findOne({
          vendor: data.vendor,
          invoiceNumber: data.invoiceNumber
        });

        if (existing) {
          results.duplicates.push({ invoiceNumber: data.invoiceNumber, existingId: existing._id });
          continue;
        }

        const invoice = await this.createInvoice(data);
        results.success.push({ id: invoice._id, invoiceNumber: invoice.invoiceNumber });
      } catch (error) {
        results.failed.push({ data, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get invoice with full details
   */
  static async getInvoiceDetails(invoiceId) {
    const invoice = await Invoice.findById(invoiceId)
      .populate('vendor', 'name email phone')
      .populate('items.product', 'name sku price')
      .populate('payments');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Calculate payment status
    const totalPaid = await Payment.aggregate([
      { $match: { invoice: invoice._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const amountPaid = totalPaid[0]?.total || 0;

    return {
      invoice,
      paymentSummary: {
        totalAmount: invoice.totalAmount,
        amountPaid,
        balance: invoice.totalAmount - amountPaid,
        paymentStatus: amountPaid >= invoice.totalAmount ? 'paid' : 
                       amountPaid > 0 ? 'partial' : 'unpaid'
      }
    };
  }

  /**
   * Get invoices by vendor
   */
  static async getVendorInvoices(vendorId, filters = {}) {
    const query = { vendor: vendorId };
    
    if (filters.status) query.status = filters.status;
    if (filters.startDate && filters.endDate) {
      query.invoiceDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    const invoices = await Invoice.find(query)
      .sort({ invoiceDate: -1 })
      .populate('items.product', 'name sku');

    // Calculate summary
    const summary = {
      total: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      byStatus: {}
    };

    invoices.forEach(inv => {
      summary.byStatus[inv.status] = (summary.byStatus[inv.status] || 0) + 1;
    });

    return { invoices, summary };
  }

  /**
   * Get overdue invoices
   */
  static async getOverdueInvoices() {
    const today = new Date();
    
    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: today },
      status: { $nin: ['paid', 'cancelled'] }
    })
    .populate('vendor', 'name email')
    .sort({ dueDate: 1 });

    return overdueInvoices.map(invoice => ({
      ...invoice.toObject(),
      daysOverdue: Math.ceil((today - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)),
      urgency: this.calculateUrgency(invoice.dueDate, invoice.totalAmount)
    }));
  }

  /**
   * Calculate urgency level
   */
  static calculateUrgency(dueDate, amount) {
    const daysOverdue = Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue > 60 || amount > 50000) return 'critical';
    if (daysOverdue > 30 || amount > 20000) return 'high';
    if (daysOverdue > 14 || amount > 5000) return 'medium';
    return 'low';
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId, status, notes) {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status,
        $push: {
          statusHistory: {
            status,
            notes,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    return invoice;
  }

  /**
   * Get invoice analytics
   */
  static async getInvoiceAnalytics(dateRange = {}) {
    const matchQuery = {};
    
    if (dateRange.startDate && dateRange.endDate) {
      matchQuery.invoiceDate = {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      };
    }

    const analytics = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            month: { $month: '$invoiceDate' },
            year: { $year: '$invoiceDate' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgAmount: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    const statusBreakdown = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const vendorBreakdown = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$vendor',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      { $unwind: '$vendorInfo' }
    ]);

    return {
      monthlyTrends: analytics,
      statusBreakdown,
      topVendors: vendorBreakdown
    };
  }

  /**
   * Flag invoice for review
   */
  static async flagForReview(invoiceId, reason, flaggedBy) {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        $set: {
          flagged: true,
          flagReason: reason,
          flaggedBy,
          flaggedAt: new Date()
        }
      },
      { new: true }
    );

    return invoice;
  }
}

module.exports = InvoiceProcessor;
