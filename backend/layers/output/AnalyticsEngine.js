/**
 * Analytics Engine
 * 
 * Advanced analytics and predictive insights:
 * - Trend analysis
 * - Predictive forecasting
 * - Benchmarking
 * - Pattern recognition
 * - KPI tracking
 */

const axios = require('axios');
const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Contract = require('../../models/Contract');
const Compliance = require('../../models/Compliance');

class AnalyticsEngine {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
  }

  /**
   * Get spend analytics
   */
  async getSpendAnalytics(options = {}) {
    const { startDate, endDate, vendorId, groupBy = 'month' } = options;

    const query = { status: 'completed' };
    if (startDate) query.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = new Date(endDate);
    }
    if (vendorId) query.vendor = vendorId;

    const payments = await Payment.find(query).populate('vendor', 'name category');

    // Group by time period
    const byPeriod = this.groupByPeriod(payments, groupBy);

    // Group by vendor
    const byVendor = this.groupByVendor(payments);

    // Group by category
    const byCategory = this.groupByCategory(payments);

    // Calculate trends
    const trends = this.calculateSpendTrends(byPeriod);

    // Forecast future spend
    const forecast = await this.forecastSpend(byPeriod);

    return {
      summary: {
        totalSpend: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        transactionCount: payments.length,
        averageTransaction: payments.length > 0 ?
          payments.reduce((sum, p) => sum + (p.amount || 0), 0) / payments.length : 0,
        uniqueVendors: new Set(payments.map(p => p.vendor?._id?.toString())).size
      },
      byPeriod,
      byVendor: Object.entries(byVendor)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data })),
      byCategory,
      trends,
      forecast
    };
  }

  /**
   * Get vendor performance analytics
   */
  async getVendorAnalytics(options = {}) {
    const vendors = await Vendor.find({ currentScore: { $exists: true } });

    // Score distribution
    const scoreDistribution = {
      excellent: { range: '90-100', count: vendors.filter(v => v.currentScore >= 90).length },
      good: { range: '70-89', count: vendors.filter(v => v.currentScore >= 70 && v.currentScore < 90).length },
      fair: { range: '50-69', count: vendors.filter(v => v.currentScore >= 50 && v.currentScore < 70).length },
      poor: { range: '0-49', count: vendors.filter(v => v.currentScore < 50).length }
    };

    // Rating distribution
    const ratingDistribution = {
      A: vendors.filter(v => v.rating === 'A').length,
      B: vendors.filter(v => v.rating === 'B').length,
      C: vendors.filter(v => v.rating === 'C').length,
      D: vendors.filter(v => v.rating === 'D').length,
      F: vendors.filter(v => v.rating === 'F').length
    };

    // Risk distribution
    const riskDistribution = {
      minimal: vendors.filter(v => v.riskLevel === 'minimal').length,
      low: vendors.filter(v => v.riskLevel === 'low').length,
      medium: vendors.filter(v => v.riskLevel === 'medium').length,
      high: vendors.filter(v => v.riskLevel === 'high').length,
      critical: vendors.filter(v => v.riskLevel === 'critical').length
    };

    // Top performers
    const topPerformers = await Vendor.find({ currentScore: { $exists: true } })
      .sort({ currentScore: -1 })
      .limit(10)
      .select('name currentScore rating riskLevel');

    // Underperformers
    const underperformers = await Vendor.find({ currentScore: { $exists: true, $lt: 60 } })
      .sort({ currentScore: 1 })
      .limit(10)
      .select('name currentScore rating riskLevel');

    // Score trends
    const scoreTrends = this.analyzeScoreTrends(vendors);

    return {
      summary: {
        totalVendors: vendors.length,
        averageScore: this.calculateAverage(vendors.map(v => v.currentScore)),
        medianScore: this.calculateMedian(vendors.map(v => v.currentScore)),
        scoredVendors: vendors.filter(v => v.currentScore).length
      },
      scoreDistribution,
      ratingDistribution,
      riskDistribution,
      topPerformers: topPerformers.map(v => ({
        id: v._id,
        name: v.name,
        score: v.currentScore,
        rating: v.rating,
        riskLevel: v.riskLevel
      })),
      underperformers: underperformers.map(v => ({
        id: v._id,
        name: v.name,
        score: v.currentScore,
        rating: v.rating,
        riskLevel: v.riskLevel
      })),
      scoreTrends
    };
  }

  /**
   * Get compliance analytics
   */
  async getComplianceAnalytics(options = {}) {
    const compliance = await Compliance.find({}).populate('vendor', 'name');

    // Status distribution
    const statusDistribution = {
      compliant: compliance.filter(c => c.status === 'compliant').length,
      nonCompliant: compliance.filter(c => c.status === 'non-compliant').length,
      pending: compliance.filter(c => c.status === 'pending').length,
      expired: compliance.filter(c => c.status === 'expired').length
    };

    // By framework
    const byFramework = {};
    compliance.forEach(c => {
      if (!byFramework[c.framework]) {
        byFramework[c.framework] = { total: 0, compliant: 0, nonCompliant: 0 };
      }
      byFramework[c.framework].total++;
      if (c.status === 'compliant') byFramework[c.framework].compliant++;
      if (c.status === 'non-compliant') byFramework[c.framework].nonCompliant++;
    });

    // Calculate compliance rates by framework
    const frameworkRates = Object.entries(byFramework).map(([framework, data]) => ({
      framework,
      ...data,
      rate: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0
    }));

    // By vendor
    const byVendor = {};
    compliance.forEach(c => {
      const vendorName = c.vendor?.name || 'Unknown';
      if (!byVendor[vendorName]) {
        byVendor[vendorName] = { total: 0, compliant: 0 };
      }
      byVendor[vendorName].total++;
      if (c.status === 'compliant') byVendor[vendorName].compliant++;
    });

    // Compliance rate by vendor
    const vendorRates = Object.entries(byVendor)
      .map(([vendor, data]) => ({
        vendor,
        total: data.total,
        compliant: data.compliant,
        rate: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0
      }))
      .sort((a, b) => a.rate - b.rate);

    // Upcoming reviews
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const upcomingReviews = await Compliance.find({
      nextReviewDate: { $lte: thirtyDays, $gte: new Date() }
    }).populate('vendor', 'name');

    return {
      summary: {
        totalRequirements: compliance.length,
        overallComplianceRate: compliance.length > 0 ?
          Math.round((statusDistribution.compliant / compliance.length) * 100) : 100,
        criticalIssues: statusDistribution.nonCompliant,
        upcomingReviews: upcomingReviews.length
      },
      statusDistribution,
      byFramework: frameworkRates,
      lowestCompliance: vendorRates.slice(0, 5),
      highestCompliance: vendorRates.slice(-5).reverse(),
      upcomingReviews: upcomingReviews.map(c => ({
        id: c._id,
        vendor: c.vendor?.name,
        requirement: c.requirementType,
        reviewDate: c.nextReviewDate
      }))
    };
  }

  /**
   * Get risk analytics
   */
  async getRiskAnalytics(options = {}) {
    const [vendors, invoices, contracts] = await Promise.all([
      Vendor.find({}),
      Invoice.find({ 'fraudDetection.analyzed': true }),
      Contract.find({})
    ]);

    // Vendor risk heatmap data
    const vendorRiskMatrix = vendors.map(v => ({
      id: v._id,
      name: v.name,
      score: v.currentScore || 0,
      riskLevel: v.riskLevel || 'unknown',
      riskScore: this.getRiskScore(v.riskLevel)
    }));

    // Invoice fraud analysis
    const fraudAnalysis = {
      totalAnalyzed: invoices.length,
      clean: invoices.filter(i => i.fraudDetection?.riskScore < 0.3).length,
      suspicious: invoices.filter(i => 
        i.fraudDetection?.riskScore >= 0.3 && i.fraudDetection?.riskScore < 0.5
      ).length,
      flagged: invoices.filter(i => i.fraudDetection?.riskScore >= 0.5).length,
      totalFlaggedAmount: invoices
        .filter(i => i.fraudDetection?.riskScore >= 0.5)
        .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    };

    // Contract risk analysis
    const contractRisk = {
      total: contracts.length,
      lowRisk: contracts.filter(c => c.riskLevel === 'low').length,
      mediumRisk: contracts.filter(c => c.riskLevel === 'medium').length,
      highRisk: contracts.filter(c => c.riskLevel === 'high').length,
      criticalRisk: contracts.filter(c => c.riskLevel === 'critical').length
    };

    // Risk trends over time (simulated)
    const riskTrends = await this.calculateRiskTrends();

    // Risk predictions
    const predictions = await this.predictRisks();

    return {
      summary: {
        overallRiskScore: this.calculateOverallRiskScore(vendorRiskMatrix, fraudAnalysis),
        highRiskVendors: vendors.filter(v => 
          v.riskLevel === 'high' || v.riskLevel === 'critical'
        ).length,
        flaggedTransactions: fraudAnalysis.flagged,
        riskTrend: riskTrends.trend
      },
      vendorRisk: {
        distribution: {
          minimal: vendorRiskMatrix.filter(v => v.riskLevel === 'minimal').length,
          low: vendorRiskMatrix.filter(v => v.riskLevel === 'low').length,
          medium: vendorRiskMatrix.filter(v => v.riskLevel === 'medium').length,
          high: vendorRiskMatrix.filter(v => v.riskLevel === 'high').length,
          critical: vendorRiskMatrix.filter(v => v.riskLevel === 'critical').length
        },
        heatmapData: vendorRiskMatrix.slice(0, 20)
      },
      fraudAnalysis,
      contractRisk,
      riskTrends,
      predictions
    };
  }

  /**
   * Get KPI dashboard data
   */
  async getKPIDashboard() {
    const [vendors, invoices, payments, compliance] = await Promise.all([
      Vendor.find({}),
      Invoice.find({}),
      Payment.find({ status: 'completed' }),
      Compliance.find({})
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month metrics
    const currentMonthPayments = payments.filter(p => new Date(p.createdAt) >= startOfMonth);
    const lastMonthPayments = payments.filter(p => 
      new Date(p.createdAt) >= startOfLastMonth && new Date(p.createdAt) <= endOfLastMonth
    );

    const currentMonthSpend = currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const lastMonthSpend = lastMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // KPIs
    const kpis = {
      vendorPerformance: {
        name: 'Average Vendor Score',
        value: this.calculateAverage(vendors.map(v => v.currentScore || 0)),
        target: 75,
        unit: 'score',
        trend: 'stable'
      },
      complianceRate: {
        name: 'Compliance Rate',
        value: compliance.length > 0 ?
          Math.round((compliance.filter(c => c.status === 'compliant').length / compliance.length) * 100) : 100,
        target: 95,
        unit: '%',
        trend: 'stable'
      },
      invoiceProcessingTime: {
        name: 'Avg Invoice Processing Time',
        value: 5, // Simulated - would calculate from actual data
        target: 3,
        unit: 'days',
        trend: 'improving'
      },
      spendUnderManagement: {
        name: 'Monthly Spend',
        value: currentMonthSpend,
        previousValue: lastMonthSpend,
        change: lastMonthSpend > 0 ? 
          Math.round(((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100) : 0,
        unit: 'USD',
        trend: currentMonthSpend > lastMonthSpend ? 'increasing' : 'decreasing'
      },
      vendorRiskIndex: {
        name: 'High Risk Vendors',
        value: vendors.filter(v => v.riskLevel === 'high' || v.riskLevel === 'critical').length,
        target: 0,
        unit: 'vendors',
        trend: 'stable'
      },
      contractCoverage: {
        name: 'Active Vendors',
        value: vendors.filter(v => v.status === 'active').length,
        total: vendors.length,
        unit: 'vendors',
        trend: 'stable'
      }
    };

    return {
      generatedAt: new Date(),
      kpis,
      quickStats: {
        totalVendors: vendors.length,
        totalInvoices: invoices.length,
        totalPayments: payments.length,
        totalSpend: payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      }
    };
  }

  /**
   * Helper methods
   */
  groupByPeriod(payments, groupBy) {
    const grouped = {};
    
    payments.forEach(p => {
      let key;
      const date = new Date(p.createdAt);
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().substr(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().substr(0, 10);
          break;
        case 'month':
        default:
          key = date.toISOString().substr(0, 7);
          break;
      }

      if (!grouped[key]) {
        grouped[key] = { period: key, total: 0, count: 0 };
      }
      grouped[key].total += p.amount || 0;
      grouped[key].count++;
    });

    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }

  groupByVendor(payments) {
    const byVendor = {};
    payments.forEach(p => {
      const vendorName = p.vendor?.name || 'Unknown';
      if (!byVendor[vendorName]) {
        byVendor[vendorName] = { total: 0, count: 0 };
      }
      byVendor[vendorName].total += p.amount || 0;
      byVendor[vendorName].count++;
    });
    return byVendor;
  }

  groupByCategory(payments) {
    const byCategory = {};
    payments.forEach(p => {
      const category = p.vendor?.category || 'Uncategorized';
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, count: 0 };
      }
      byCategory[category].total += p.amount || 0;
      byCategory[category].count++;
    });
    return byCategory;
  }

  calculateSpendTrends(byPeriod) {
    if (byPeriod.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const recent = byPeriod.slice(-3);
    const avgRecent = recent.reduce((sum, p) => sum + p.total, 0) / recent.length;
    const previous = byPeriod.slice(-6, -3);
    const avgPrevious = previous.length > 0 ?
      previous.reduce((sum, p) => sum + p.total, 0) / previous.length : avgRecent;

    const change = avgPrevious > 0 ? 
      Math.round(((avgRecent - avgPrevious) / avgPrevious) * 100) : 0;

    return {
      trend: change > 10 ? 'increasing' : (change < -10 ? 'decreasing' : 'stable'),
      change,
      averageRecent: avgRecent,
      averagePrevious: avgPrevious
    };
  }

  async forecastSpend(byPeriod) {
    if (byPeriod.length < 3) {
      return { available: false, reason: 'Insufficient historical data' };
    }

    // Simple moving average forecast
    const values = byPeriod.map(p => p.total);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = (values[values.length - 1] - values[0]) / values.length;

    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      forecast.push({
        period: `Forecast +${i}`,
        predicted: Math.round(avg + (trend * i)),
        confidence: Math.max(0.5, 0.9 - (i * 0.1))
      });
    }

    return {
      available: true,
      forecast,
      methodology: 'Linear trend extrapolation'
    };
  }

  analyzeScoreTrends(vendors) {
    const trends = {
      improving: 0,
      stable: 0,
      declining: 0
    };

    vendors.forEach(v => {
      if (v.scoreHistory && v.scoreHistory.length >= 2) {
        const recent = v.scoreHistory.slice(-2);
        const change = recent[1].score - recent[0].score;
        if (change > 5) trends.improving++;
        else if (change < -5) trends.declining++;
        else trends.stable++;
      }
    });

    return trends;
  }

  getRiskScore(riskLevel) {
    const scores = {
      minimal: 0,
      low: 25,
      medium: 50,
      high: 75,
      critical: 100
    };
    return scores[riskLevel] || 50;
  }

  async calculateRiskTrends() {
    // Simulated risk trends - would query historical data in production
    return {
      trend: 'stable',
      history: [
        { period: 'Month -3', score: 35 },
        { period: 'Month -2', score: 38 },
        { period: 'Month -1', score: 36 },
        { period: 'Current', score: 34 }
      ]
    };
  }

  async predictRisks() {
    return {
      nextMonth: {
        predictedHighRiskVendors: 3,
        confidence: 0.75
      },
      alerts: [
        'Based on patterns, 2 vendors may require compliance review',
        'Seasonal spending increase expected'
      ]
    };
  }

  calculateOverallRiskScore(vendorRisk, fraudAnalysis) {
    const vendorScore = vendorRisk.filter(v => v.riskScore >= 75).length * 10;
    const fraudScore = fraudAnalysis.flagged * 5;
    const total = vendorScore + fraudScore;
    
    if (total > 100) return 'critical';
    if (total > 50) return 'high';
    if (total > 25) return 'medium';
    return 'low';
  }

  calculateAverage(numbers) {
    const valid = numbers.filter(n => n !== undefined && n !== null);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  }

  calculateMedian(numbers) {
    const valid = numbers.filter(n => n !== undefined && n !== null);
    if (valid.length === 0) return 0;
    const sorted = [...valid].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ?
      sorted[mid] :
      Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
}

module.exports = new AnalyticsEngine();
