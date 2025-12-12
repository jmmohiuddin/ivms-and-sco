/**
 * Dashboard Generator
 * 
 * Aggregates data for real-time dashboard visibility:
 * - Executive dashboard metrics
 * - Vendor performance dashboards
 * - Risk monitoring dashboards
 * - Compliance status dashboards
 * - Financial overview dashboards
 */

const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Contract = require('../../models/Contract');
const Compliance = require('../../models/Compliance');
const Certification = require('../../models/Certification');

class DashboardGenerator {
  constructor() {
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    this.cache = new Map();
  }

  /**
   * Generate executive dashboard data
   */
  async getExecutiveDashboard() {
    const cacheKey = 'executive_dashboard';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const [
      vendorMetrics,
      financialMetrics,
      riskMetrics,
      complianceMetrics,
      performanceMetrics
    ] = await Promise.all([
      this.getVendorSummary(),
      this.getFinancialSummary(),
      this.getRiskSummary(),
      this.getComplianceSummary(),
      this.getPerformanceSummary()
    ]);

    const dashboard = {
      generatedAt: new Date(),
      vendorMetrics,
      financialMetrics,
      riskMetrics,
      complianceMetrics,
      performanceMetrics,
      alerts: await this.getTopAlerts(5),
      recentActivity: await this.getRecentActivity()
    };

    this.setCache(cacheKey, dashboard);
    return dashboard;
  }

  /**
   * Get vendor summary metrics
   */
  async getVendorSummary() {
    const vendors = await Vendor.find({});
    const activeVendors = vendors.filter(v => v.status === 'active');
    
    // Rating distribution
    const ratingDistribution = {
      A: vendors.filter(v => v.rating === 'A').length,
      B: vendors.filter(v => v.rating === 'B').length,
      C: vendors.filter(v => v.rating === 'C').length,
      D: vendors.filter(v => v.rating === 'D').length,
      F: vendors.filter(v => v.rating === 'F').length,
      unrated: vendors.filter(v => !v.rating).length
    };

    // Risk level distribution
    const riskDistribution = {
      minimal: vendors.filter(v => v.riskLevel === 'minimal').length,
      low: vendors.filter(v => v.riskLevel === 'low').length,
      medium: vendors.filter(v => v.riskLevel === 'medium').length,
      high: vendors.filter(v => v.riskLevel === 'high').length
    };

    // New vendors this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newVendorsThisMonth = vendors.filter(v => 
      new Date(v.createdAt) >= startOfMonth
    ).length;

    return {
      total: vendors.length,
      active: activeVendors.length,
      inactive: vendors.length - activeVendors.length,
      newThisMonth: newVendorsThisMonth,
      ratingDistribution,
      riskDistribution,
      averageScore: this.calculateAverage(vendors.map(v => v.currentScore || 0))
    };
  }

  /**
   * Get financial summary metrics
   */
  async getFinancialSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month payments
    const currentMonthPayments = await Payment.find({
      createdAt: { $gte: startOfMonth },
      status: 'completed'
    });

    // Last month payments
    const lastMonthPayments = await Payment.find({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      status: 'completed'
    });

    // Pending invoices
    const pendingInvoices = await Invoice.find({
      status: { $in: ['pending', 'submitted'] }
    });

    // Calculate totals
    const currentMonthSpend = currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const lastMonthSpend = lastMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    // Month over month change
    const momChange = lastMonthSpend > 0 ? 
      ((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

    // Overdue invoices
    const overdueInvoices = await Invoice.find({
      status: { $in: ['pending', 'submitted', 'approved'] },
      dueDate: { $lt: now }
    });

    return {
      currentMonthSpend,
      lastMonthSpend,
      monthOverMonthChange: Math.round(momChange * 10) / 10,
      pendingInvoices: pendingInvoices.length,
      pendingAmount,
      overdueInvoices: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
      totalPaymentsThisMonth: currentMonthPayments.length
    };
  }

  /**
   * Get risk summary metrics
   */
  async getRiskSummary() {
    // High risk vendors
    const highRiskVendors = await Vendor.find({
      riskLevel: { $in: ['high', 'critical'] }
    });

    // Invoices with fraud flags
    const flaggedInvoices = await Invoice.find({
      'fraudDetection.riskScore': { $gte: 0.5 }
    });

    // Contracts with risk clauses
    const riskyContracts = await Contract.find({
      riskLevel: { $in: ['high', 'critical'] }
    });

    // Compliance issues
    const complianceIssues = await Compliance.find({
      status: { $ne: 'compliant' }
    });

    // Expiring certifications
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringCerts = await Certification.find({
      expiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
    });

    return {
      highRiskVendors: highRiskVendors.length,
      flaggedInvoices: flaggedInvoices.length,
      riskyContracts: riskyContracts.length,
      complianceIssues: complianceIssues.length,
      expiringCertifications: expiringCerts.length,
      overallRiskScore: this.calculateOverallRiskScore({
        highRiskVendors: highRiskVendors.length,
        flaggedInvoices: flaggedInvoices.length,
        complianceIssues: complianceIssues.length
      }),
      topRisks: await this.identifyTopRisks()
    };
  }

  /**
   * Get compliance summary metrics
   */
  async getComplianceSummary() {
    const compliance = await Compliance.find({});
    const certifications = await Certification.find({});
    const now = new Date();

    // Compliance status breakdown
    const complianceByStatus = {
      compliant: compliance.filter(c => c.status === 'compliant').length,
      nonCompliant: compliance.filter(c => c.status === 'non-compliant').length,
      pending: compliance.filter(c => c.status === 'pending').length,
      expired: compliance.filter(c => c.status === 'expired').length
    };

    // Certification status
    const certByStatus = {
      valid: certifications.filter(c => c.status === 'valid' && c.expiryDate > now).length,
      expired: certifications.filter(c => c.expiryDate < now).length,
      expiringSoon: certifications.filter(c => {
        const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return c.expiryDate <= thirtyDays && c.expiryDate > now;
      }).length
    };

    // Compliance rate
    const complianceRate = compliance.length > 0 ?
      (complianceByStatus.compliant / compliance.length) * 100 : 100;

    return {
      totalRequirements: compliance.length,
      complianceByStatus,
      complianceRate: Math.round(complianceRate * 10) / 10,
      totalCertifications: certifications.length,
      certByStatus,
      upcomingAudits: await this.getUpcomingAudits(),
      recentComplianceChanges: await this.getRecentComplianceChanges()
    };
  }

  /**
   * Get performance summary metrics
   */
  async getPerformanceSummary() {
    const vendors = await Vendor.find({ currentScore: { $exists: true } });
    const scores = vendors.map(v => v.currentScore).filter(s => s);

    // Score distribution
    const scoreDistribution = {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 70 && s < 90).length,
      fair: scores.filter(s => s >= 50 && s < 70).length,
      poor: scores.filter(s => s < 50).length
    };

    // Top performers
    const topPerformers = await Vendor.find({ currentScore: { $exists: true } })
      .sort({ currentScore: -1 })
      .limit(5)
      .select('name currentScore rating');

    // Underperformers
    const underperformers = await Vendor.find({ 
      currentScore: { $exists: true, $lt: 60 } 
    })
      .sort({ currentScore: 1 })
      .limit(5)
      .select('name currentScore rating');

    return {
      averageScore: this.calculateAverage(scores),
      medianScore: this.calculateMedian(scores),
      scoreDistribution,
      topPerformers: topPerformers.map(v => ({
        id: v._id,
        name: v.name,
        score: v.currentScore,
        rating: v.rating
      })),
      underperformers: underperformers.map(v => ({
        id: v._id,
        name: v.name,
        score: v.currentScore,
        rating: v.rating
      })),
      trendsPositive: vendors.filter(v => 
        v.scoreHistory?.length >= 2 && 
        v.scoreHistory[v.scoreHistory.length - 1]?.score > v.scoreHistory[v.scoreHistory.length - 2]?.score
      ).length,
      trendsNegative: vendors.filter(v => 
        v.scoreHistory?.length >= 2 && 
        v.scoreHistory[v.scoreHistory.length - 1]?.score < v.scoreHistory[v.scoreHistory.length - 2]?.score
      ).length
    };
  }

  /**
   * Get vendor-specific dashboard
   */
  async getVendorDashboard(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const [
      invoices,
      payments,
      contracts,
      compliance,
      certifications
    ] = await Promise.all([
      Invoice.find({ vendor: vendorId }),
      Payment.find({ vendor: vendorId }),
      Contract.find({ vendor: vendorId }),
      Compliance.find({ vendor: vendorId }),
      Certification.find({ vendor: vendorId })
    ]);

    // Calculate metrics
    const totalSpend = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingAmount = invoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const complianceRate = compliance.length > 0 ?
      (compliance.filter(c => c.status === 'compliant').length / compliance.length) * 100 : 100;

    const now = new Date();
    const validCerts = certifications.filter(c => c.expiryDate > now && c.status === 'valid');

    return {
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        status: vendor.status,
        score: vendor.currentScore,
        rating: vendor.rating,
        riskLevel: vendor.riskLevel
      },
      financial: {
        totalSpend,
        pendingAmount,
        invoiceCount: invoices.length,
        paymentCount: payments.length
      },
      contracts: {
        total: contracts.length,
        active: contracts.filter(c => c.status === 'active').length,
        expiringSoon: contracts.filter(c => {
          const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          return c.endDate <= thirtyDays && c.endDate > now;
        }).length
      },
      compliance: {
        rate: Math.round(complianceRate * 10) / 10,
        total: compliance.length,
        issues: compliance.filter(c => c.status !== 'compliant').length
      },
      certifications: {
        total: certifications.length,
        valid: validCerts.length,
        expiringSoon: certifications.filter(c => {
          const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          return c.expiryDate <= thirtyDays && c.expiryDate > now;
        }).length
      },
      scoreHistory: vendor.scoreHistory?.slice(-12) || [],
      recentActivity: await this.getVendorRecentActivity(vendorId)
    };
  }

  /**
   * Get risk monitoring dashboard
   */
  async getRiskDashboard() {
    const [
      vendorRisks,
      invoiceRisks,
      contractRisks,
      complianceRisks
    ] = await Promise.all([
      this.getVendorRisks(),
      this.getInvoiceRisks(),
      this.getContractRisks(),
      this.getComplianceRisks()
    ]);

    return {
      generatedAt: new Date(),
      summary: {
        totalRisks: vendorRisks.length + invoiceRisks.length + 
                    contractRisks.length + complianceRisks.length,
        criticalRisks: [
          ...vendorRisks.filter(r => r.severity === 'critical'),
          ...invoiceRisks.filter(r => r.severity === 'critical'),
          ...contractRisks.filter(r => r.severity === 'critical'),
          ...complianceRisks.filter(r => r.severity === 'critical')
        ].length,
        highRisks: [
          ...vendorRisks.filter(r => r.severity === 'high'),
          ...invoiceRisks.filter(r => r.severity === 'high'),
          ...contractRisks.filter(r => r.severity === 'high'),
          ...complianceRisks.filter(r => r.severity === 'high')
        ].length
      },
      vendorRisks,
      invoiceRisks,
      contractRisks,
      complianceRisks,
      riskTrends: await this.getRiskTrends(),
      mitigationActions: await this.getRecommendedMitigations()
    };
  }

  /**
   * Helper methods
   */
  async getTopAlerts(limit) {
    // Get most critical alerts
    const alerts = [];
    
    // Overdue invoices
    const overdueInvoices = await Invoice.find({
      status: { $in: ['pending', 'submitted', 'approved'] },
      dueDate: { $lt: new Date() }
    }).limit(limit);
    
    overdueInvoices.forEach(inv => {
      alerts.push({
        type: 'overdue_invoice',
        severity: 'high',
        message: `Invoice ${inv.invoiceNumber} is overdue`,
        entityId: inv._id,
        entityType: 'invoice'
      });
    });

    return alerts.slice(0, limit);
  }

  async getRecentActivity() {
    const recentInvoices = await Invoice.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('invoiceNumber status totalAmount createdAt');

    const recentPayments = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('amount status createdAt');

    return {
      invoices: recentInvoices,
      payments: recentPayments
    };
  }

  async getVendorRecentActivity(vendorId) {
    const [invoices, payments] = await Promise.all([
      Invoice.find({ vendor: vendorId })
        .sort({ createdAt: -1 })
        .limit(5),
      Payment.find({ vendor: vendorId })
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    return { invoices, payments };
  }

  async getVendorRisks() {
    const highRiskVendors = await Vendor.find({
      riskLevel: { $in: ['high', 'critical'] }
    }).select('name riskLevel currentScore');

    return highRiskVendors.map(v => ({
      type: 'vendor',
      entityId: v._id,
      entityName: v.name,
      severity: v.riskLevel,
      score: v.currentScore
    }));
  }

  async getInvoiceRisks() {
    const riskyInvoices = await Invoice.find({
      'fraudDetection.riskScore': { $gte: 0.5 }
    }).populate('vendor', 'name');

    return riskyInvoices.map(inv => ({
      type: 'invoice',
      entityId: inv._id,
      entityName: inv.invoiceNumber,
      vendorName: inv.vendor?.name,
      severity: inv.fraudDetection?.riskScore >= 0.7 ? 'critical' : 'high',
      flags: inv.fraudDetection?.flags
    }));
  }

  async getContractRisks() {
    const riskyContracts = await Contract.find({
      riskLevel: { $in: ['high', 'critical'] }
    }).populate('vendor', 'name');

    return riskyContracts.map(c => ({
      type: 'contract',
      entityId: c._id,
      entityName: c.title,
      vendorName: c.vendor?.name,
      severity: c.riskLevel
    }));
  }

  async getComplianceRisks() {
    const nonCompliant = await Compliance.find({
      status: { $ne: 'compliant' }
    }).populate('vendor', 'name');

    return nonCompliant.map(c => ({
      type: 'compliance',
      entityId: c._id,
      entityName: c.requirementType,
      vendorName: c.vendor?.name,
      severity: c.status === 'non-compliant' ? 'high' : 'medium'
    }));
  }

  async getUpcomingAudits() {
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return await Compliance.find({
      nextReviewDate: { $lte: thirtyDays, $gte: new Date() }
    }).limit(5);
  }

  async getRecentComplianceChanges() {
    return await Compliance.find({})
      .sort({ updatedAt: -1 })
      .limit(5);
  }

  async getRiskTrends() {
    // Simulated trends - in production would query historical data
    return {
      lastMonth: { high: 5, medium: 10, low: 15 },
      thisMonth: { high: 3, medium: 12, low: 18 },
      trend: 'improving'
    };
  }

  async getRecommendedMitigations() {
    const mitigations = [];
    
    // Check for high-risk vendors
    const highRiskVendors = await Vendor.find({ riskLevel: 'high' }).limit(3);
    highRiskVendors.forEach(v => {
      mitigations.push({
        priority: 'high',
        action: `Review and address risk factors for vendor: ${v.name}`,
        entityType: 'vendor',
        entityId: v._id
      });
    });

    return mitigations;
  }

  identifyTopRisks() {
    return []; // Would be populated with actual risk data
  }

  calculateOverallRiskScore({ highRiskVendors, flaggedInvoices, complianceIssues }) {
    const score = (highRiskVendors * 3) + (flaggedInvoices * 2) + complianceIssues;
    if (score > 20) return 'critical';
    if (score > 10) return 'high';
    if (score > 5) return 'medium';
    return 'low';
  }

  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }

  calculateMedian(numbers) {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? 
      sorted[mid] : 
      Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new DashboardGenerator();
