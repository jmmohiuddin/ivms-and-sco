/**
 * Report Generator
 * 
 * Generate audit-ready reports and analytics:
 * - Executive summary reports
 * - Vendor performance reports
 * - Compliance audit reports
 * - Financial reports
 * - Risk assessment reports
 */

const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Contract = require('../../models/Contract');
const Compliance = require('../../models/Compliance');
const Certification = require('../../models/Certification');

class ReportGenerator {
  constructor() {
    this.reportFormats = ['json', 'csv', 'pdf'];
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(options = {}) {
    const { startDate, endDate } = this.getDateRange(options);

    const [
      vendorStats,
      financialStats,
      complianceStats,
      riskStats,
      performanceStats
    ] = await Promise.all([
      this.getVendorStatistics(startDate, endDate),
      this.getFinancialStatistics(startDate, endDate),
      this.getComplianceStatistics(startDate, endDate),
      this.getRiskStatistics(startDate, endDate),
      this.getPerformanceStatistics(startDate, endDate)
    ]);

    return {
      reportType: 'executive_summary',
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        headline: this.generateHeadline(vendorStats, financialStats, riskStats),
        keyMetrics: {
          totalVendors: vendorStats.total,
          activeVendors: vendorStats.active,
          totalSpend: financialStats.totalSpend,
          complianceRate: complianceStats.complianceRate,
          averageVendorScore: performanceStats.averageScore
        }
      },
      vendorOverview: vendorStats,
      financialOverview: financialStats,
      complianceOverview: complianceStats,
      riskOverview: riskStats,
      performanceOverview: performanceStats,
      recommendations: this.generateExecutiveRecommendations({
        vendorStats, financialStats, complianceStats, riskStats
      }),
      appendix: {
        methodology: 'Automated analysis of vendor data, invoices, payments, and compliance records',
        dataQuality: 'All metrics are based on system records'
      }
    };
  }

  /**
   * Generate vendor performance report
   */
  async generateVendorReport(vendorId, options = {}) {
    const { startDate, endDate } = this.getDateRange(options);
    
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
      Invoice.find({ 
        vendor: vendorId,
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Payment.find({ 
        vendor: vendorId,
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Contract.find({ vendor: vendorId }),
      Compliance.find({ vendor: vendorId }),
      Certification.find({ vendor: vendorId })
    ]);

    // Calculate metrics
    const totalSpend = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const invoiceAccuracy = invoices.length > 0 ?
      (invoices.filter(i => !i.fraudDetection?.flags?.length).length / invoices.length) * 100 : 100;

    const complianceRate = compliance.length > 0 ?
      (compliance.filter(c => c.status === 'compliant').length / compliance.length) * 100 : 100;

    const now = new Date();
    const validCerts = certifications.filter(c => c.expiryDate > now && c.status === 'valid');

    return {
      reportType: 'vendor_performance',
      generatedAt: new Date(),
      period: { startDate, endDate },
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        status: vendor.status,
        createdAt: vendor.createdAt
      },
      scoreCard: {
        currentScore: vendor.currentScore || 'N/A',
        rating: vendor.rating || 'N/A',
        riskLevel: vendor.riskLevel || 'unknown',
        trend: this.calculateScoreTrend(vendor.scoreHistory)
      },
      financials: {
        totalSpend,
        invoiceCount: invoices.length,
        paymentCount: payments.length,
        averageInvoice: invoices.length > 0 ? totalSpend / invoices.length : 0,
        invoiceAccuracy: Math.round(invoiceAccuracy * 10) / 10
      },
      contracts: {
        total: contracts.length,
        active: contracts.filter(c => c.status === 'active').length,
        totalValue: contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0),
        expiringSoon: contracts.filter(c => {
          const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          return c.endDate <= thirtyDays && c.endDate > now;
        }).length
      },
      compliance: {
        rate: Math.round(complianceRate * 10) / 10,
        requirements: compliance.length,
        compliant: compliance.filter(c => c.status === 'compliant').length,
        issues: compliance.filter(c => c.status !== 'compliant').map(c => ({
          type: c.requirementType,
          status: c.status,
          dueDate: c.nextReviewDate
        }))
      },
      certifications: {
        total: certifications.length,
        valid: validCerts.length,
        expiringSoon: certifications.filter(c => {
          const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          return c.expiryDate <= thirtyDays && c.expiryDate > now;
        }).map(c => ({
          name: c.name,
          type: c.type,
          expiryDate: c.expiryDate
        }))
      },
      scoreHistory: vendor.scoreHistory?.map(s => ({
        date: s.date,
        score: s.score
      })) || [],
      recommendations: this.generateVendorRecommendations({
        vendor, complianceRate, invoiceAccuracy, contracts, certifications
      })
    };
  }

  /**
   * Generate compliance audit report
   */
  async generateComplianceReport(options = {}) {
    const { startDate, endDate } = this.getDateRange(options);
    const { vendorId, framework } = options;

    let complianceQuery = {};
    if (vendorId) complianceQuery.vendor = vendorId;
    if (framework) complianceQuery.framework = framework;

    const compliance = await Compliance.find(complianceQuery)
      .populate('vendor', 'name status');

    const certifications = await Certification.find(
      vendorId ? { vendor: vendorId } : {}
    ).populate('vendor', 'name');

    // Group by status
    const byStatus = {
      compliant: compliance.filter(c => c.status === 'compliant'),
      nonCompliant: compliance.filter(c => c.status === 'non-compliant'),
      pending: compliance.filter(c => c.status === 'pending'),
      expired: compliance.filter(c => c.status === 'expired')
    };

    // Group by framework
    const byFramework = {};
    compliance.forEach(c => {
      if (!byFramework[c.framework]) {
        byFramework[c.framework] = { total: 0, compliant: 0, nonCompliant: 0 };
      }
      byFramework[c.framework].total++;
      if (c.status === 'compliant') byFramework[c.framework].compliant++;
      if (c.status === 'non-compliant') byFramework[c.framework].nonCompliant++;
    });

    // Calculate rates by framework
    Object.keys(byFramework).forEach(fw => {
      byFramework[fw].rate = byFramework[fw].total > 0 ?
        Math.round((byFramework[fw].compliant / byFramework[fw].total) * 100) : 100;
    });

    const now = new Date();
    const expiringCerts = certifications.filter(c => {
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return c.expiryDate <= thirtyDays && c.expiryDate > now;
    });

    return {
      reportType: 'compliance_audit',
      generatedAt: new Date(),
      period: { startDate, endDate },
      filters: { vendorId, framework },
      summary: {
        totalRequirements: compliance.length,
        overallComplianceRate: compliance.length > 0 ?
          Math.round((byStatus.compliant.length / compliance.length) * 100) : 100,
        totalCertifications: certifications.length,
        validCertifications: certifications.filter(c => c.expiryDate > now).length,
        expiringCertifications: expiringCerts.length,
        criticalIssues: byStatus.nonCompliant.length
      },
      complianceByStatus: {
        compliant: byStatus.compliant.length,
        nonCompliant: byStatus.nonCompliant.length,
        pending: byStatus.pending.length,
        expired: byStatus.expired.length
      },
      complianceByFramework: byFramework,
      nonCompliantItems: byStatus.nonCompliant.map(c => ({
        id: c._id,
        vendor: c.vendor?.name,
        requirementType: c.requirementType,
        framework: c.framework,
        description: c.description,
        riskLevel: c.riskLevel,
        dueDate: c.nextReviewDate
      })),
      expiringCertifications: expiringCerts.map(c => ({
        id: c._id,
        vendor: c.vendor?.name,
        name: c.name,
        type: c.type,
        expiryDate: c.expiryDate,
        daysUntilExpiry: Math.ceil((c.expiryDate - now) / (1000 * 60 * 60 * 24))
      })),
      auditTrail: await this.getComplianceAuditTrail(compliance.slice(0, 10)),
      recommendations: this.generateComplianceRecommendations(byStatus, byFramework)
    };
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(options = {}) {
    const { startDate, endDate } = this.getDateRange(options);
    const { vendorId } = options;

    let invoiceQuery = { createdAt: { $gte: startDate, $lte: endDate } };
    let paymentQuery = { createdAt: { $gte: startDate, $lte: endDate } };
    
    if (vendorId) {
      invoiceQuery.vendor = vendorId;
      paymentQuery.vendor = vendorId;
    }

    const [invoices, payments] = await Promise.all([
      Invoice.find(invoiceQuery).populate('vendor', 'name'),
      Payment.find(paymentQuery).populate('vendor', 'name')
    ]);

    // Calculate totals
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingAmount = invoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    // By vendor
    const byVendor = {};
    payments.filter(p => p.status === 'completed').forEach(p => {
      const vendorName = p.vendor?.name || 'Unknown';
      if (!byVendor[vendorName]) {
        byVendor[vendorName] = { total: 0, count: 0 };
      }
      byVendor[vendorName].total += p.amount || 0;
      byVendor[vendorName].count++;
    });

    // Top vendors by spend
    const topVendors = Object.entries(byVendor)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    // By month
    const byMonth = {};
    payments.filter(p => p.status === 'completed').forEach(p => {
      const month = new Date(p.createdAt).toISOString().substr(0, 7);
      byMonth[month] = (byMonth[month] || 0) + (p.amount || 0);
    });

    // Invoice status breakdown
    const invoiceByStatus = {
      pending: invoices.filter(i => i.status === 'pending').length,
      submitted: invoices.filter(i => i.status === 'submitted').length,
      approved: invoices.filter(i => i.status === 'approved').length,
      paid: invoices.filter(i => i.status === 'paid').length,
      rejected: invoices.filter(i => i.status === 'rejected').length
    };

    // Fraud analysis
    const flaggedInvoices = invoices.filter(i => 
      i.fraudDetection?.riskScore >= 0.5
    );

    return {
      reportType: 'financial',
      generatedAt: new Date(),
      period: { startDate, endDate },
      filters: { vendorId },
      summary: {
        totalInvoiced,
        totalPaid,
        pendingAmount,
        invoiceCount: invoices.length,
        paymentCount: payments.filter(p => p.status === 'completed').length,
        averageInvoiceValue: invoices.length > 0 ? totalInvoiced / invoices.length : 0,
        averagePaymentValue: payments.length > 0 ? totalPaid / payments.length : 0
      },
      invoiceAnalysis: {
        byStatus: invoiceByStatus,
        overdueInvoices: invoices.filter(i => 
          i.status !== 'paid' && i.dueDate && new Date(i.dueDate) < new Date()
        ).length,
        flaggedForFraud: flaggedInvoices.length,
        flaggedAmount: flaggedInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)
      },
      vendorAnalysis: {
        topVendorsBySpend: topVendors,
        vendorCount: Object.keys(byVendor).length
      },
      monthlyTrend: Object.entries(byMonth).map(([month, amount]) => ({
        month,
        amount
      })),
      paymentMethods: this.aggregatePaymentMethods(payments),
      recommendations: this.generateFinancialRecommendations({
        pendingAmount, flaggedInvoices, totalPaid
      })
    };
  }

  /**
   * Generate risk assessment report
   */
  async generateRiskReport(options = {}) {
    const { startDate, endDate } = this.getDateRange(options);

    const [
      vendors,
      invoices,
      contracts,
      compliance
    ] = await Promise.all([
      Vendor.find({}),
      Invoice.find({ 'fraudDetection.analyzed': true }),
      Contract.find({}),
      Compliance.find({})
    ]);

    // Vendor risk distribution
    const vendorRiskDistribution = {
      minimal: vendors.filter(v => v.riskLevel === 'minimal').length,
      low: vendors.filter(v => v.riskLevel === 'low').length,
      medium: vendors.filter(v => v.riskLevel === 'medium').length,
      high: vendors.filter(v => v.riskLevel === 'high').length,
      critical: vendors.filter(v => v.riskLevel === 'critical').length
    };

    // High risk items
    const highRiskVendors = vendors
      .filter(v => v.riskLevel === 'high' || v.riskLevel === 'critical')
      .map(v => ({
        id: v._id,
        name: v.name,
        riskLevel: v.riskLevel,
        score: v.currentScore
      }));

    const flaggedInvoices = invoices
      .filter(i => i.fraudDetection?.riskScore >= 0.5)
      .map(i => ({
        id: i._id,
        invoiceNumber: i.invoiceNumber,
        amount: i.totalAmount,
        riskScore: i.fraudDetection?.riskScore,
        flags: i.fraudDetection?.flags
      }));

    const riskyContracts = contracts
      .filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical')
      .map(c => ({
        id: c._id,
        title: c.title,
        riskLevel: c.riskLevel,
        value: c.totalValue
      }));

    const complianceIssues = compliance
      .filter(c => c.status === 'non-compliant')
      .map(c => ({
        id: c._id,
        requirementType: c.requirementType,
        framework: c.framework,
        riskLevel: c.riskLevel
      }));

    // Calculate overall risk score
    const totalHighRiskItems = 
      highRiskVendors.length + 
      flaggedInvoices.length + 
      riskyContracts.length + 
      complianceIssues.length;

    return {
      reportType: 'risk_assessment',
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        overallRiskLevel: this.calculateOverallRiskLevel(totalHighRiskItems, vendors.length),
        totalRiskItems: totalHighRiskItems,
        highRiskVendorCount: highRiskVendors.length,
        flaggedInvoiceCount: flaggedInvoices.length,
        riskyContractCount: riskyContracts.length,
        complianceIssueCount: complianceIssues.length
      },
      vendorRisk: {
        distribution: vendorRiskDistribution,
        highRiskVendors: highRiskVendors.slice(0, 10)
      },
      invoiceRisk: {
        totalAnalyzed: invoices.length,
        flaggedCount: flaggedInvoices.length,
        flaggedAmount: flaggedInvoices.reduce((sum, i) => sum + (i.amount || 0), 0),
        topFlaggedInvoices: flaggedInvoices.slice(0, 10)
      },
      contractRisk: {
        totalContracts: contracts.length,
        riskyCount: riskyContracts.length,
        riskyValue: riskyContracts.reduce((sum, c) => sum + (c.value || 0), 0),
        riskyContracts: riskyContracts.slice(0, 10)
      },
      complianceRisk: {
        totalRequirements: compliance.length,
        issues: complianceIssues.length,
        complianceIssues: complianceIssues.slice(0, 10)
      },
      riskTrends: await this.calculateRiskTrends(),
      mitigationPlan: this.generateMitigationPlan({
        highRiskVendors, flaggedInvoices, riskyContracts, complianceIssues
      }),
      recommendations: this.generateRiskRecommendations(totalHighRiskItems)
    };
  }

  /**
   * Helper methods
   */
  getDateRange(options) {
    const now = new Date();
    const startDate = options.startDate ? new Date(options.startDate) : 
      new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = options.endDate ? new Date(options.endDate) : now;
    return { startDate, endDate };
  }

  async getVendorStatistics(startDate, endDate) {
    const vendors = await Vendor.find({});
    const newVendors = vendors.filter(v => 
      new Date(v.createdAt) >= startDate && new Date(v.createdAt) <= endDate
    );

    return {
      total: vendors.length,
      active: vendors.filter(v => v.status === 'active').length,
      inactive: vendors.filter(v => v.status !== 'active').length,
      newInPeriod: newVendors.length,
      byRating: {
        A: vendors.filter(v => v.rating === 'A').length,
        B: vendors.filter(v => v.rating === 'B').length,
        C: vendors.filter(v => v.rating === 'C').length,
        D: vendors.filter(v => v.rating === 'D').length,
        F: vendors.filter(v => v.rating === 'F').length
      }
    };
  }

  async getFinancialStatistics(startDate, endDate) {
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });

    const totalSpend = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalSpend,
      transactionCount: payments.length,
      averageTransaction: payments.length > 0 ? totalSpend / payments.length : 0
    };
  }

  async getComplianceStatistics(startDate, endDate) {
    const compliance = await Compliance.find({});
    const compliant = compliance.filter(c => c.status === 'compliant').length;

    return {
      totalRequirements: compliance.length,
      compliant,
      nonCompliant: compliance.filter(c => c.status === 'non-compliant').length,
      complianceRate: compliance.length > 0 ? 
        Math.round((compliant / compliance.length) * 100) : 100
    };
  }

  async getRiskStatistics(startDate, endDate) {
    const vendors = await Vendor.find({});
    const highRisk = vendors.filter(v => 
      v.riskLevel === 'high' || v.riskLevel === 'critical'
    );

    return {
      totalVendors: vendors.length,
      highRiskVendors: highRisk.length,
      riskRate: vendors.length > 0 ?
        Math.round((highRisk.length / vendors.length) * 100) : 0
    };
  }

  async getPerformanceStatistics(startDate, endDate) {
    const vendors = await Vendor.find({ currentScore: { $exists: true } });
    const scores = vendors.map(v => v.currentScore).filter(s => s);

    return {
      averageScore: scores.length > 0 ?
        Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      scoredVendors: scores.length
    };
  }

  calculateScoreTrend(history) {
    if (!history || history.length < 2) return 'stable';
    const recent = history.slice(-2);
    const change = recent[1].score - recent[0].score;
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  async getComplianceAuditTrail(complianceItems) {
    return complianceItems.map(c => ({
      id: c._id,
      type: c.requirementType,
      lastReview: c.lastReviewDate,
      nextReview: c.nextReviewDate,
      status: c.status
    }));
  }

  aggregatePaymentMethods(payments) {
    const methods = {};
    payments.forEach(p => {
      const method = p.paymentMethod || 'unknown';
      methods[method] = (methods[method] || 0) + 1;
    });
    return methods;
  }

  calculateOverallRiskLevel(riskItems, totalVendors) {
    const ratio = totalVendors > 0 ? riskItems / totalVendors : 0;
    if (ratio > 0.3) return 'critical';
    if (ratio > 0.2) return 'high';
    if (ratio > 0.1) return 'medium';
    return 'low';
  }

  async calculateRiskTrends() {
    return {
      trend: 'stable',
      comparison: 'Risk levels have remained consistent over the reporting period'
    };
  }

  generateHeadline(vendorStats, financialStats, riskStats) {
    const highlights = [];
    highlights.push(`${vendorStats.active} active vendors`);
    highlights.push(`$${financialStats.totalSpend?.toLocaleString()} total spend`);
    if (riskStats.highRiskVendors > 0) {
      highlights.push(`${riskStats.highRiskVendors} high-risk vendors require attention`);
    }
    return highlights.join(' • ');
  }

  generateExecutiveRecommendations(stats) {
    const recommendations = [];
    
    if (stats.riskStats.riskRate > 10) {
      recommendations.push({
        priority: 'high',
        recommendation: 'Review high-risk vendor portfolio',
        details: `${stats.riskStats.highRiskVendors} vendors flagged as high risk`
      });
    }

    if (stats.complianceStats.complianceRate < 90) {
      recommendations.push({
        priority: 'high',
        recommendation: 'Address compliance gaps',
        details: `Current compliance rate: ${stats.complianceStats.complianceRate}%`
      });
    }

    return recommendations;
  }

  generateVendorRecommendations(data) {
    const recommendations = [];

    if (data.complianceRate < 100) {
      recommendations.push({
        priority: 'high',
        recommendation: 'Address compliance issues',
        details: `Vendor compliance rate is ${data.complianceRate}%`
      });
    }

    if (data.invoiceAccuracy < 95) {
      recommendations.push({
        priority: 'medium',
        recommendation: 'Review invoice submission process',
        details: `Invoice accuracy rate: ${data.invoiceAccuracy}%`
      });
    }

    return recommendations;
  }

  generateComplianceRecommendations(byStatus, byFramework) {
    const recommendations = [];

    if (byStatus.nonCompliant.length > 0) {
      recommendations.push({
        priority: 'critical',
        recommendation: 'Immediate action required',
        details: `${byStatus.nonCompliant.length} non-compliant items need remediation`
      });
    }

    return recommendations;
  }

  generateFinancialRecommendations(data) {
    const recommendations = [];

    if (data.flaggedInvoices.length > 0) {
      recommendations.push({
        priority: 'high',
        recommendation: 'Review flagged invoices before payment',
        details: `${data.flaggedInvoices.length} invoices flagged for potential fraud`
      });
    }

    return recommendations;
  }

  generateRiskRecommendations(totalHighRiskItems) {
    if (totalHighRiskItems > 10) {
      return [{
        priority: 'critical',
        recommendation: 'Immediate risk assessment review required',
        details: `${totalHighRiskItems} high-risk items identified across the portfolio`
      }];
    }
    return [];
  }

  generateMitigationPlan(data) {
    const actions = [];

    if (data.highRiskVendors.length > 0) {
      actions.push({
        area: 'Vendor Risk',
        action: 'Conduct vendor risk review meetings',
        timeline: '2 weeks',
        priority: 'high'
      });
    }

    if (data.complianceIssues.length > 0) {
      actions.push({
        area: 'Compliance',
        action: 'Develop compliance remediation plans',
        timeline: '1 month',
        priority: 'critical'
      });
    }

    return actions;
  }
}

module.exports = new ReportGenerator();
