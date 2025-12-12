/**
 * Payment Tracker
 * 
 * Tracks and manages vendor payments including:
 * - Payment processing
 * - Payment history
 * - Payment analytics
 * - Payment scheduling
 */

const Payment = require('../../models/Payment');
const Invoice = require('../../models/Invoice');
const Vendor = require('../../models/Vendor');

class PaymentTracker {
  /**
   * Record a payment
   */
  static async recordPayment(paymentData) {
    // Validate invoice
    const invoice = await Invoice.findById(paymentData.invoice);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Generate payment reference
    const paymentCount = await Payment.countDocuments();
    const paymentReference = `PAY-${Date.now()}-${String(paymentCount + 1).padStart(6, '0')}`;

    const payment = await Payment.create({
      ...paymentData,
      paymentReference,
      vendor: invoice.vendor,
      status: 'completed'
    });

    // Update invoice status
    await this.updateInvoicePaymentStatus(paymentData.invoice);

    return payment;
  }

  /**
   * Update invoice payment status
   */
  static async updateInvoicePaymentStatus(invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    const payments = await Payment.find({ invoice: invoiceId, status: 'completed' });
    
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    let status = 'pending';
    if (totalPaid >= invoice.totalAmount) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    await Invoice.findByIdAndUpdate(invoiceId, {
      paymentStatus: status,
      amountPaid: totalPaid,
      balance: invoice.totalAmount - totalPaid
    });
  }

  /**
   * Get payment by ID
   */
  static async getPaymentDetails(paymentId) {
    const payment = await Payment.findById(paymentId)
      .populate('vendor', 'name email')
      .populate('invoice', 'invoiceNumber totalAmount');

    return payment;
  }

  /**
   * Get vendor payments
   */
  static async getVendorPayments(vendorId, filters = {}) {
    const query = { vendor: vendorId };
    
    if (filters.startDate && filters.endDate) {
      query.paymentDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    if (filters.status) {
      query.status = filters.status;
    }

    const payments = await Payment.find(query)
      .populate('invoice', 'invoiceNumber')
      .sort({ paymentDate: -1 });

    const summary = {
      total: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      byMethod: {},
      byStatus: {}
    };

    payments.forEach(p => {
      summary.byMethod[p.paymentMethod] = (summary.byMethod[p.paymentMethod] || 0) + 1;
      summary.byStatus[p.status] = (summary.byStatus[p.status] || 0) + 1;
    });

    return { payments, summary };
  }

  /**
   * Get pending payments
   */
  static async getPendingPayments() {
    const pendingInvoices = await Invoice.find({
      paymentStatus: { $in: ['pending', 'partial'] }
    })
    .populate('vendor', 'name email paymentTerms')
    .sort({ dueDate: 1 });

    return pendingInvoices.map(invoice => ({
      invoice: {
        id: invoice._id,
        number: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        amountPaid: invoice.amountPaid || 0,
        balance: invoice.totalAmount - (invoice.amountPaid || 0),
        dueDate: invoice.dueDate
      },
      vendor: invoice.vendor,
      daysUntilDue: Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24)),
      urgency: this.calculatePaymentUrgency(invoice)
    }));
  }

  /**
   * Calculate payment urgency
   */
  static calculatePaymentUrgency(invoice) {
    const daysUntilDue = Math.ceil(
      (new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    const balance = invoice.totalAmount - (invoice.amountPaid || 0);

    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 3 || balance > 50000) return 'critical';
    if (daysUntilDue <= 7 || balance > 20000) return 'high';
    if (daysUntilDue <= 14) return 'medium';
    return 'low';
  }

  /**
   * Schedule a payment
   */
  static async schedulePayment(scheduleData) {
    const invoice = await Invoice.findById(scheduleData.invoice);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const scheduledPayment = await Payment.create({
      ...scheduleData,
      vendor: invoice.vendor,
      status: 'scheduled',
      paymentReference: `SCH-${Date.now()}`
    });

    return scheduledPayment;
  }

  /**
   * Process scheduled payments
   */
  static async processScheduledPayments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const duePayments = await Payment.find({
      status: 'scheduled',
      scheduledDate: { $lte: today }
    });

    const results = {
      processed: [],
      failed: []
    };

    for (const payment of duePayments) {
      try {
        payment.status = 'completed';
        payment.paymentDate = new Date();
        await payment.save();

        await this.updateInvoicePaymentStatus(payment.invoice);

        results.processed.push({ id: payment._id, reference: payment.paymentReference });
      } catch (error) {
        results.failed.push({ id: payment._id, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get payment analytics
   */
  static async getPaymentAnalytics(dateRange = {}) {
    const matchQuery = { status: 'completed' };
    
    if (dateRange.startDate && dateRange.endDate) {
      matchQuery.paymentDate = {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      };
    }

    const [
      monthlyPayments,
      methodBreakdown,
      vendorPayments,
      paymentTrends
    ] = await Promise.all([
      Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              month: { $month: '$paymentDate' },
              year: { $year: '$paymentDate' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
      ]),
      Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$vendor',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
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
      ]),
      Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ])
    ]);

    return {
      monthlyPayments,
      methodBreakdown,
      topVendors: vendorPayments,
      dailyTrends: paymentTrends.reverse()
    };
  }

  /**
   * Get payment summary for vendor
   */
  static async getVendorPaymentSummary(vendorId) {
    const [totalPayments, lastPayment, avgPaymentTime] = await Promise.all([
      Payment.aggregate([
        { $match: { vendor: vendorId, status: 'completed' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Payment.findOne({ vendor: vendorId, status: 'completed' })
        .sort({ paymentDate: -1 }),
      Invoice.aggregate([
        { $match: { vendor: vendorId, paymentStatus: 'paid' } },
        {
          $project: {
            paymentTime: {
              $divide: [
                { $subtract: ['$paidAt', '$invoiceDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDays: { $avg: '$paymentTime' }
          }
        }
      ])
    ]);

    return {
      totalPaid: totalPayments[0]?.total || 0,
      paymentCount: totalPayments[0]?.count || 0,
      lastPayment: lastPayment?.paymentDate,
      averagePaymentDays: Math.round(avgPaymentTime[0]?.avgDays || 0)
    };
  }

  /**
   * Reconcile payments
   */
  static async reconcilePayments(vendorId) {
    const invoices = await Invoice.find({ vendor: vendorId });
    const payments = await Payment.find({ vendor: vendorId, status: 'completed' });

    const reconciliation = {
      matched: [],
      unmatched: [],
      discrepancies: []
    };

    for (const invoice of invoices) {
      const invoicePayments = payments.filter(
        p => p.invoice?.toString() === invoice._id.toString()
      );
      const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);

      if (totalPaid === invoice.totalAmount) {
        reconciliation.matched.push({
          invoice: invoice.invoiceNumber,
          amount: invoice.totalAmount
        });
      } else if (totalPaid > invoice.totalAmount) {
        reconciliation.discrepancies.push({
          invoice: invoice.invoiceNumber,
          expected: invoice.totalAmount,
          received: totalPaid,
          difference: totalPaid - invoice.totalAmount,
          type: 'overpayment'
        });
      } else if (totalPaid < invoice.totalAmount && totalPaid > 0) {
        reconciliation.discrepancies.push({
          invoice: invoice.invoiceNumber,
          expected: invoice.totalAmount,
          received: totalPaid,
          difference: invoice.totalAmount - totalPaid,
          type: 'underpayment'
        });
      } else {
        reconciliation.unmatched.push({
          invoice: invoice.invoiceNumber,
          amount: invoice.totalAmount
        });
      }
    }

    return reconciliation;
  }
}

module.exports = PaymentTracker;
