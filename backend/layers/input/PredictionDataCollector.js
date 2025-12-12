/**
 * Prediction Data Collector - Input Layer
 * Collects and prepares data for predictive analytics
 */

const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const VendorComplianceProfile = require('../../models/VendorComplianceProfile');
const ComplianceEvent = require('../../models/ComplianceEvent');
const RemediationCase = require('../../models/RemediationCase');
const axios = require('axios');

class PredictionDataCollector {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    this.dataCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Collect spend data for forecasting
   */
  async collectSpendData(options = {}) {
    const {
      vendorId = null,
      categoryId = null,
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      granularity = 'monthly'
    } = options;

    try {
      // Build aggregation pipeline
      const matchStage = {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['approved', 'paid', 'partially_paid'] }
      };

      if (vendorId) matchStage.vendor = vendorId;

      const groupBy = this._getGroupByDate(granularity);

      const spendData = await Invoice.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: groupBy,
            totalAmount: { $sum: '$totalAmount' },
            invoiceCount: { $sum: 1 },
            avgAmount: { $avg: '$totalAmount' },
            vendors: { $addToSet: '$vendor' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Transform for ML service
      const timeSeriesData = spendData.map(d => ({
        date: this._formatDateId(d._id, granularity),
        amount: d.totalAmount,
        count: d.invoiceCount,
        avgAmount: d.avgAmount,
        vendorCount: d.vendors.length
      }));

      // Add vendor breakdown if not filtering by vendor
      let vendorBreakdown = [];
      if (!vendorId) {
        vendorBreakdown = await this._getVendorSpendBreakdown(startDate, endDate);
      }

      // Add category breakdown
      const categoryBreakdown = await this._getCategorySpendBreakdown(startDate, endDate);

      return {
        timeSeries: timeSeriesData,
        vendorBreakdown,
        categoryBreakdown,
        summary: {
          totalSpend: timeSeriesData.reduce((sum, d) => sum + d.amount, 0),
          periodCount: timeSeriesData.length,
          avgPeriodSpend: timeSeriesData.length > 0 
            ? timeSeriesData.reduce((sum, d) => sum + d.amount, 0) / timeSeriesData.length 
            : 0
        },
        metadata: {
          startDate,
          endDate,
          granularity,
          collectedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error collecting spend data:', error);
      throw error;
    }
  }

  /**
   * Collect vendor performance data for risk prediction
   */
  async collectVendorRiskData(vendorId) {
    try {
      // Get vendor details
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) throw new Error('Vendor not found');

      // Get historical orders
      const orders = await Order.find({ vendor: vendorId })
        .sort({ createdAt: -1 })
        .limit(100);

      // Calculate delivery performance
      const deliveryPerformance = this._calculateDeliveryPerformance(orders);

      // Get invoice history
      const invoices = await Invoice.find({ vendor: vendorId })
        .sort({ createdAt: -1 })
        .limit(100);

      const invoiceMetrics = this._calculateInvoiceMetrics(invoices);

      // Get compliance data
      const complianceProfile = await VendorComplianceProfile.findOne({ vendorId });
      const complianceEvents = await ComplianceEvent.find({ vendorId })
        .sort({ timestamp: -1 })
        .limit(50);

      const complianceMetrics = this._calculateComplianceMetrics(complianceProfile, complianceEvents);

      // Get remediation history
      const remediationCases = await RemediationCase.find({ vendorId });
      const remediationMetrics = this._calculateRemediationMetrics(remediationCases);

      // Build feature vector
      return {
        vendorId: vendorId.toString(),
        vendorName: vendor.name || vendor.companyName,
        features: {
          operational: {
            orderCount: orders.length,
            ...deliveryPerformance
          },
          financial: {
            ...invoiceMetrics,
            totalSpend: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
          },
          compliance: complianceMetrics,
          remediation: remediationMetrics,
          tenure: {
            monthsActive: this._calculateTenure(vendor.createdAt),
            isActive: vendor.status === 'active'
          }
        },
        historicalData: {
          deliveryHistory: deliveryPerformance.history,
          invoiceHistory: invoiceMetrics.history,
          complianceHistory: complianceMetrics.history
        },
        metadata: {
          collectedAt: new Date(),
          dataPoints: {
            orders: orders.length,
            invoices: invoices.length,
            complianceEvents: complianceEvents.length,
            remediationCases: remediationCases.length
          }
        }
      };
    } catch (error) {
      console.error('Error collecting vendor risk data:', error);
      throw error;
    }
  }

  /**
   * Collect invoice and cashflow data
   */
  async collectCashflowData(options = {}) {
    const {
      startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      forecastDays = 90
    } = options;

    try {
      // Historical invoice data
      const invoices = await Invoice.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: 1 });

      // Group by week for time series
      const weeklyData = this._groupByWeek(invoices);

      // Get pending invoices for near-term forecast
      const pendingInvoices = await Invoice.find({
        status: { $in: ['pending', 'approved'] },
        dueDate: { $lte: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000) }
      });

      // Calculate payment patterns
      const paymentPatterns = this._analyzePaymentPatterns(invoices);

      // Get upcoming known payments
      const scheduledPayments = pendingInvoices.map(inv => ({
        invoiceId: inv._id,
        vendorId: inv.vendor,
        amount: inv.totalAmount,
        dueDate: inv.dueDate,
        daysTillDue: Math.ceil((new Date(inv.dueDate) - new Date()) / (24 * 60 * 60 * 1000))
      }));

      return {
        timeSeries: weeklyData,
        paymentPatterns,
        scheduledPayments,
        summary: {
          totalPending: pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
          pendingCount: pendingInvoices.length,
          averagePaymentCycle: paymentPatterns.avgCycleDays
        },
        metadata: {
          startDate,
          endDate,
          forecastDays,
          collectedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error collecting cashflow data:', error);
      throw error;
    }
  }

  /**
   * Collect workload data for capacity forecasting
   */
  async collectWorkloadData(options = {}) {
    const {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      team = null
    } = options;

    try {
      // Invoice processing workload
      const invoiceWorkload = await Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              week: { $week: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            received: { $sum: 1 },
            processed: {
              $sum: { $cond: [{ $in: ['$status', ['approved', 'paid']] }, 1, 0] }
            },
            exceptions: {
              $sum: { $cond: [{ $eq: ['$status', 'exception'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } }
      ]);

      // Compliance review workload
      const complianceWorkload = await ComplianceEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              week: { $week: '$timestamp' },
              year: { $year: '$timestamp' }
            },
            events: { $sum: 1 },
            highSeverity: {
              $sum: { $cond: [{ $in: ['$severity', ['high', 'critical']] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } }
      ]);

      // Remediation case workload
      const remediationWorkload = await RemediationCase.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              week: { $week: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            newCases: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } }
      ]);

      // Current backlog
      const currentBacklog = {
        pendingInvoices: await Invoice.countDocuments({ status: 'pending' }),
        exceptionInvoices: await Invoice.countDocuments({ status: 'exception' }),
        openCases: await RemediationCase.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        pendingComplianceReviews: await ComplianceEvent.countDocuments({ processed: false })
      };

      return {
        invoiceWorkload: this._formatWeeklyData(invoiceWorkload),
        complianceWorkload: this._formatWeeklyData(complianceWorkload),
        remediationWorkload: this._formatWeeklyData(remediationWorkload),
        currentBacklog,
        metadata: {
          startDate,
          endDate,
          collectedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error collecting workload data:', error);
      throw error;
    }
  }

  /**
   * Collect data for anomaly detection
   */
  async collectAnomalyData(entityType, entityId = null) {
    try {
      let data = {};

      switch (entityType) {
        case 'invoice':
          data = await this._collectInvoiceAnomalyData(entityId);
          break;
        case 'vendor':
          data = await this._collectVendorAnomalyData(entityId);
          break;
        case 'spending':
          data = await this._collectSpendingAnomalyData();
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      return data;
    } catch (error) {
      console.error('Error collecting anomaly data:', error);
      throw error;
    }
  }

  // Helper methods
  _getGroupByDate(granularity) {
    switch (granularity) {
      case 'daily':
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
      case 'weekly':
        return {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
      case 'monthly':
      default:
        return {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
      case 'quarterly':
        return {
          year: { $year: '$createdAt' },
          quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } }
        };
    }
  }

  _formatDateId(id, granularity) {
    if (granularity === 'daily') {
      return `${id.year}-${String(id.month).padStart(2, '0')}-${String(id.day).padStart(2, '0')}`;
    } else if (granularity === 'weekly') {
      return `${id.year}-W${String(id.week).padStart(2, '0')}`;
    } else if (granularity === 'quarterly') {
      return `${id.year}-Q${id.quarter}`;
    }
    return `${id.year}-${String(id.month).padStart(2, '0')}`;
  }

  async _getVendorSpendBreakdown(startDate, endDate) {
    return Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: '$vendor',
          totalSpend: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      { $unwind: '$vendorInfo' },
      {
        $project: {
          vendorId: '$_id',
          vendorName: { $ifNull: ['$vendorInfo.name', '$vendorInfo.companyName'] },
          totalSpend: 1,
          invoiceCount: 1
        }
      },
      { $sort: { totalSpend: -1 } },
      { $limit: 20 }
    ]);
  }

  async _getCategorySpendBreakdown(startDate, endDate) {
    // This would need a category field on invoices
    // Simplified implementation
    return [];
  }

  _calculateDeliveryPerformance(orders) {
    if (orders.length === 0) {
      return { onTimeRate: 0, avgDelayDays: 0, history: [] };
    }

    let onTimeCount = 0;
    let totalDelayDays = 0;
    const history = [];

    orders.forEach(order => {
      const expectedDate = order.expectedDeliveryDate;
      const actualDate = order.deliveredAt || order.updatedAt;
      
      if (expectedDate && actualDate) {
        const diffDays = (new Date(actualDate) - new Date(expectedDate)) / (24 * 60 * 60 * 1000);
        if (diffDays <= 0) {
          onTimeCount++;
        } else {
          totalDelayDays += diffDays;
        }
        
        history.push({
          date: order.createdAt,
          delayDays: Math.max(0, diffDays)
        });
      }
    });

    return {
      onTimeRate: orders.length > 0 ? (onTimeCount / orders.length) * 100 : 0,
      avgDelayDays: orders.length > onTimeCount ? totalDelayDays / (orders.length - onTimeCount) : 0,
      lateDeliveries: orders.length - onTimeCount,
      totalOrders: orders.length,
      history: history.slice(0, 20)
    };
  }

  _calculateInvoiceMetrics(invoices) {
    if (invoices.length === 0) {
      return { avgAmount: 0, disputeRate: 0, history: [] };
    }

    const disputedCount = invoices.filter(inv => inv.status === 'disputed').length;
    const amounts = invoices.map(inv => inv.totalAmount || 0);
    
    return {
      avgAmount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      maxAmount: Math.max(...amounts),
      minAmount: Math.min(...amounts),
      disputeRate: (disputedCount / invoices.length) * 100,
      invoiceCount: invoices.length,
      history: invoices.slice(0, 20).map(inv => ({
        date: inv.createdAt,
        amount: inv.totalAmount,
        status: inv.status
      }))
    };
  }

  _calculateComplianceMetrics(profile, events) {
    const metrics = {
      currentScore: profile?.compositeScore?.value || 50,
      tier: profile?.tier || 'unknown',
      attributeCount: profile?.complianceAttributes?.length || 0,
      validAttributes: 0,
      expiredAttributes: 0,
      history: []
    };

    if (profile?.complianceAttributes) {
      metrics.validAttributes = profile.complianceAttributes.filter(a => a.status === 'valid').length;
      metrics.expiredAttributes = profile.complianceAttributes.filter(a => a.status === 'expired').length;
    }

    metrics.recentEvents = events.length;
    metrics.highSeverityEvents = events.filter(e => e.severity === 'high' || e.severity === 'critical').length;
    
    metrics.history = events.slice(0, 20).map(e => ({
      date: e.timestamp,
      type: e.eventType,
      severity: e.severity
    }));

    return metrics;
  }

  _calculateRemediationMetrics(cases) {
    if (cases.length === 0) {
      return { totalCases: 0, avgResolutionDays: 0 };
    }

    const resolvedCases = cases.filter(c => c.status === 'resolved');
    let totalResolutionDays = 0;

    resolvedCases.forEach(c => {
      if (c.resolvedAt && c.createdAt) {
        totalResolutionDays += (new Date(c.resolvedAt) - new Date(c.createdAt)) / (24 * 60 * 60 * 1000);
      }
    });

    return {
      totalCases: cases.length,
      openCases: cases.filter(c => c.status !== 'resolved' && c.status !== 'closed').length,
      resolvedCases: resolvedCases.length,
      avgResolutionDays: resolvedCases.length > 0 ? totalResolutionDays / resolvedCases.length : 0,
      escalationRate: (cases.filter(c => c.escalated).length / cases.length) * 100
    };
  }

  _calculateTenure(createdAt) {
    if (!createdAt) return 0;
    const diffTime = Math.abs(new Date() - new Date(createdAt));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  }

  _groupByWeek(invoices) {
    const weeklyData = {};
    
    invoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          date: weekKey,
          amount: 0,
          count: 0,
          paid: 0
        };
      }
      
      weeklyData[weekKey].amount += inv.totalAmount || 0;
      weeklyData[weekKey].count++;
      if (inv.status === 'paid') {
        weeklyData[weekKey].paid += inv.totalAmount || 0;
      }
    });

    return Object.values(weeklyData).sort((a, b) => a.date.localeCompare(b.date));
  }

  _analyzePaymentPatterns(invoices) {
    const paidInvoices = invoices.filter(inv => inv.paidAt && inv.dueDate);
    
    if (paidInvoices.length === 0) {
      return { avgCycleDays: 30, onTimeRate: 0 };
    }

    let totalCycleDays = 0;
    let onTimeCount = 0;

    paidInvoices.forEach(inv => {
      const cycleDays = (new Date(inv.paidAt) - new Date(inv.createdAt)) / (24 * 60 * 60 * 1000);
      totalCycleDays += cycleDays;
      
      if (new Date(inv.paidAt) <= new Date(inv.dueDate)) {
        onTimeCount++;
      }
    });

    return {
      avgCycleDays: totalCycleDays / paidInvoices.length,
      onTimeRate: (onTimeCount / paidInvoices.length) * 100,
      sampleSize: paidInvoices.length
    };
  }

  _formatWeeklyData(aggregatedData) {
    return aggregatedData.map(d => ({
      week: `${d._id.year}-W${String(d._id.week).padStart(2, '0')}`,
      ...d,
      _id: undefined
    }));
  }

  async _collectInvoiceAnomalyData(invoiceId) {
    if (invoiceId) {
      const invoice = await Invoice.findById(invoiceId).populate('vendor');
      if (!invoice) throw new Error('Invoice not found');

      // Get historical invoices from same vendor
      const historicalInvoices = await Invoice.find({
        vendor: invoice.vendor._id,
        _id: { $ne: invoiceId }
      }).sort({ createdAt: -1 }).limit(50);

      return {
        target: {
          id: invoice._id,
          amount: invoice.totalAmount,
          vendor: invoice.vendor.name || invoice.vendor.companyName,
          date: invoice.createdAt
        },
        historical: historicalInvoices.map(inv => ({
          amount: inv.totalAmount,
          date: inv.createdAt
        })),
        statistics: this._calculateStatistics(historicalInvoices.map(inv => inv.totalAmount))
      };
    }

    // Collect all recent invoices for batch anomaly detection
    const recentInvoices = await Invoice.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).populate('vendor');

    return {
      invoices: recentInvoices.map(inv => ({
        id: inv._id,
        amount: inv.totalAmount,
        vendorId: inv.vendor?._id,
        vendorName: inv.vendor?.name || inv.vendor?.companyName,
        date: inv.createdAt
      }))
    };
  }

  async _collectVendorAnomalyData(vendorId) {
    if (vendorId) {
      return this.collectVendorRiskData(vendorId);
    }

    // Collect all active vendors for batch analysis
    const vendors = await Vendor.find({ status: 'active' });
    const vendorData = [];

    for (const vendor of vendors.slice(0, 50)) {
      try {
        const data = await this.collectVendorRiskData(vendor._id);
        vendorData.push(data);
      } catch (err) {
        // Skip vendors with data collection errors
      }
    }

    return { vendors: vendorData };
  }

  async _collectSpendingAnomalyData() {
    const dailySpend = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalSpend: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return {
      dailySpend: dailySpend.map(d => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        amount: d.totalSpend,
        count: d.invoiceCount
      })),
      statistics: this._calculateStatistics(dailySpend.map(d => d.totalSpend))
    };
  }

  _calculateStatistics(values) {
    if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return {
      mean,
      std: Math.sqrt(variance),
      min: Math.min(...values),
      max: Math.max(...values),
      median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
    };
  }
}

module.exports = new PredictionDataCollector();
