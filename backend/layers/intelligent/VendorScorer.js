/**
 * Vendor Scorer
 * 
 * ML-based vendor scoring and performance evaluation:
 * - Performance scoring
 * - Risk assessment
 * - Reliability metrics
 * - Predictive analytics
 * - Recommendation engine
 */

const axios = require('axios');
const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Contract = require('../../models/Contract');
const Compliance = require('../../models/Compliance');
const Certification = require('../../models/Certification');

class VendorScorer {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    
    // Scoring weights
    this.weights = {
      performance: 0.25,
      financial: 0.20,
      compliance: 0.20,
      reliability: 0.15,
      quality: 0.10,
      communication: 0.10
    };

    // Performance benchmarks
    this.benchmarks = {
      onTimeDelivery: 95,        // Expected 95% on-time
      defectRate: 2,             // Maximum 2% defect rate
      responseTime: 24,          // Expected response within 24 hours
      invoiceAccuracy: 98,       // Expected 98% accurate invoices
      complianceRate: 100        // Expected 100% compliance
    };
  }

  /**
   * Calculate comprehensive vendor score
   */
  async calculateVendorScore(vendorId) {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Gather all metrics
      const [
        performanceMetrics,
        financialMetrics,
        complianceMetrics,
        reliabilityMetrics,
        qualityMetrics,
        communicationMetrics
      ] = await Promise.all([
        this.calculatePerformanceMetrics(vendorId),
        this.calculateFinancialMetrics(vendorId),
        this.calculateComplianceMetrics(vendorId),
        this.calculateReliabilityMetrics(vendorId),
        this.calculateQualityMetrics(vendorId),
        this.calculateCommunicationMetrics(vendorId)
      ]);

      // Calculate weighted score
      const scores = {
        performance: performanceMetrics.score,
        financial: financialMetrics.score,
        compliance: complianceMetrics.score,
        reliability: reliabilityMetrics.score,
        quality: qualityMetrics.score,
        communication: communicationMetrics.score
      };

      const overallScore = Object.entries(this.weights).reduce((total, [key, weight]) => {
        return total + (scores[key] * weight);
      }, 0);

      // Generate rating
      const rating = this.scoreToRating(overallScore);

      // Calculate trend
      const historicalScores = vendor.scoreHistory || [];
      const trend = this.calculateTrend(historicalScores, overallScore);

      // Compile full score card
      const scoreCard = {
        vendorId,
        vendorName: vendor.name,
        calculatedAt: new Date(),
        overallScore: Math.round(overallScore),
        rating,
        trend,
        categoryScores: scores,
        metrics: {
          performance: performanceMetrics,
          financial: financialMetrics,
          compliance: complianceMetrics,
          reliability: reliabilityMetrics,
          quality: qualityMetrics,
          communication: communicationMetrics
        },
        strengths: this.identifyStrengths(scores),
        weaknesses: this.identifyWeaknesses(scores),
        recommendations: this.generateRecommendations(scores, { 
          performanceMetrics, 
          financialMetrics, 
          complianceMetrics 
        }),
        riskLevel: this.assessRiskLevel(scores)
      };

      // Update vendor with score
      await Vendor.findByIdAndUpdate(vendorId, {
        $set: {
          currentScore: overallScore,
          rating,
          riskLevel: scoreCard.riskLevel,
          lastScoreDate: new Date()
        },
        $push: {
          scoreHistory: {
            $each: [{
              score: overallScore,
              date: new Date(),
              categoryScores: scores
            }],
            $slice: -12  // Keep last 12 scores
          }
        }
      });

      return scoreCard;
    } catch (error) {
      console.error('Vendor scoring error:', error);
      throw error;
    }
  }

  /**
   * Calculate performance metrics
   */
  async calculatePerformanceMetrics(vendorId) {
    // Get delivery data (simulated - would come from actual delivery records)
    const orders = await Invoice.find({
      vendor: vendorId,
      status: 'paid',
      createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
    });

    const totalOrders = orders.length;
    
    // Calculate on-time delivery (simulated based on due date vs payment date)
    let onTimeCount = 0;
    orders.forEach(order => {
      if (order.paidDate && order.dueDate && order.paidDate <= order.dueDate) {
        onTimeCount++;
      }
    });

    const onTimeRate = totalOrders > 0 ? (onTimeCount / totalOrders) * 100 : 100;
    
    // Performance score calculation
    const score = Math.min(100, (onTimeRate / this.benchmarks.onTimeDelivery) * 100);

    return {
      score: Math.round(score),
      metrics: {
        totalOrders,
        onTimeDeliveries: onTimeCount,
        onTimeRate: Math.round(onTimeRate * 10) / 10,
        benchmark: this.benchmarks.onTimeDelivery
      },
      status: score >= 90 ? 'excellent' : (score >= 70 ? 'good' : 'needs improvement')
    };
  }

  /**
   * Calculate financial metrics
   */
  async calculateFinancialMetrics(vendorId) {
    const invoices = await Invoice.find({
      vendor: vendorId,
      createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
    });

    const payments = await Payment.find({
      vendor: vendorId,
      createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
    });

    // Calculate invoice accuracy
    const totalInvoices = invoices.length;
    const accurateInvoices = invoices.filter(inv => 
      !inv.fraudDetection?.flags?.length
    ).length;
    const invoiceAccuracy = totalInvoices > 0 ? 
      (accurateInvoices / totalInvoices) * 100 : 100;

    // Calculate payment terms compliance
    const totalPayments = payments.length;
    const onTimePayments = payments.filter(p => p.status === 'completed').length;
    const paymentCompliance = totalPayments > 0 ?
      (onTimePayments / totalPayments) * 100 : 100;

    // Calculate total spend
    const totalSpend = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Financial score
    const accuracyScore = (invoiceAccuracy / this.benchmarks.invoiceAccuracy) * 100;
    const score = Math.min(100, (accuracyScore * 0.6) + (paymentCompliance * 0.4));

    return {
      score: Math.round(score),
      metrics: {
        totalInvoices,
        accurateInvoices,
        invoiceAccuracy: Math.round(invoiceAccuracy * 10) / 10,
        totalPayments,
        paymentCompliance: Math.round(paymentCompliance * 10) / 10,
        totalSpend,
        averageInvoiceValue: totalInvoices > 0 ? totalSpend / totalInvoices : 0
      },
      status: score >= 90 ? 'excellent' : (score >= 70 ? 'good' : 'needs improvement')
    };
  }

  /**
   * Calculate compliance metrics
   */
  async calculateComplianceMetrics(vendorId) {
    const compliance = await Compliance.find({ vendor: vendorId });
    const certifications = await Certification.find({ vendor: vendorId });

    // Calculate compliance rate
    const totalRequirements = compliance.length;
    const metRequirements = compliance.filter(c => c.status === 'compliant').length;
    const complianceRate = totalRequirements > 0 ?
      (metRequirements / totalRequirements) * 100 : 100;

    // Calculate certification validity
    const now = new Date();
    const validCerts = certifications.filter(c => 
      c.expiryDate > now && c.status === 'valid'
    ).length;
    const totalCerts = certifications.length;
    const certificationRate = totalCerts > 0 ?
      (validCerts / totalCerts) * 100 : 100;

    // Compliance score
    const score = (complianceRate * 0.6) + (certificationRate * 0.4);

    // Identify compliance gaps
    const gaps = compliance
      .filter(c => c.status !== 'compliant')
      .map(c => ({
        requirement: c.requirementType,
        status: c.status,
        dueDate: c.nextReviewDate
      }));

    // Identify expiring certifications
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringCerts = certifications
      .filter(c => c.expiryDate <= thirtyDaysFromNow && c.expiryDate > now)
      .map(c => ({
        name: c.name,
        expiryDate: c.expiryDate
      }));

    return {
      score: Math.round(score),
      metrics: {
        totalRequirements,
        metRequirements,
        complianceRate: Math.round(complianceRate * 10) / 10,
        totalCertifications: totalCerts,
        validCertifications: validCerts,
        certificationRate: Math.round(certificationRate * 10) / 10
      },
      gaps,
      expiringCertifications: expiringCerts,
      status: score >= 90 ? 'excellent' : (score >= 70 ? 'good' : 'needs improvement')
    };
  }

  /**
   * Calculate reliability metrics
   */
  async calculateReliabilityMetrics(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    
    // Calculate vendor tenure
    const vendorAge = vendor ? 
      Math.floor((Date.now() - vendor.createdAt) / (1000 * 60 * 60 * 24)) : 0;
    
    // Get consistency of service (based on invoice regularity)
    const invoices = await Invoice.find({
      vendor: vendorId,
      createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: 1 });

    // Calculate consistency score based on regular activity
    let consistencyScore = 100;
    if (invoices.length > 1) {
      const intervals = [];
      for (let i = 1; i < invoices.length; i++) {
        const interval = invoices[i].createdAt - invoices[i-1].createdAt;
        intervals.push(interval);
      }
      
      if (intervals.length > 0) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = avgInterval > 0 ? stdDev / avgInterval : 0;
        
        // Lower CV = more consistent
        consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));
      }
    }

    // Tenure score (longer = better, caps at 5 years)
    const tenureScore = Math.min(100, (vendorAge / (5 * 365)) * 100);

    // Overall reliability score
    const score = (consistencyScore * 0.6) + (tenureScore * 0.4);

    return {
      score: Math.round(score),
      metrics: {
        vendorAgeDays: vendorAge,
        vendorAgeYears: Math.round(vendorAge / 365 * 10) / 10,
        consistencyScore: Math.round(consistencyScore),
        tenureScore: Math.round(tenureScore),
        totalTransactions: invoices.length
      },
      status: score >= 90 ? 'excellent' : (score >= 70 ? 'good' : 'needs improvement')
    };
  }

  /**
   * Calculate quality metrics
   */
  async calculateQualityMetrics(vendorId) {
    // Get invoices with fraud detection data
    const invoices = await Invoice.find({
      vendor: vendorId,
      'fraudDetection.analyzed': true,
      createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
    });

    // Calculate defect rate (invoices with fraud flags)
    const totalAnalyzed = invoices.length;
    const cleanInvoices = invoices.filter(inv => 
      !inv.fraudDetection?.flags?.length || 
      inv.fraudDetection.riskScore < 0.3
    ).length;

    const cleanRate = totalAnalyzed > 0 ? 
      (cleanInvoices / totalAnalyzed) * 100 : 100;

    // Quality score
    const defectRate = 100 - cleanRate;
    const score = Math.max(0, 100 - (defectRate / this.benchmarks.defectRate) * 100);

    return {
      score: Math.round(Math.min(100, score)),
      metrics: {
        totalAnalyzed,
        cleanInvoices,
        cleanRate: Math.round(cleanRate * 10) / 10,
        defectRate: Math.round(defectRate * 10) / 10,
        benchmark: this.benchmarks.defectRate
      },
      status: score >= 90 ? 'excellent' : (score >= 70 ? 'good' : 'needs improvement')
    };
  }

  /**
   * Calculate communication metrics
   */
  async calculateCommunicationMetrics(vendorId) {
    // Simulated communication metrics
    // In real implementation, would track response times, issue resolution, etc.
    
    const vendor = await Vendor.findById(vendorId);
    
    // Base score on available contact information
    let infoScore = 0;
    if (vendor) {
      if (vendor.email) infoScore += 25;
      if (vendor.phone) infoScore += 25;
      if (vendor.contactPerson) infoScore += 25;
      if (vendor.address) infoScore += 25;
    }

    // Simulate response time score (would be calculated from actual data)
    const responseTimeScore = 80; // Default good score

    const score = (infoScore * 0.4) + (responseTimeScore * 0.6);

    return {
      score: Math.round(score),
      metrics: {
        contactInfoComplete: infoScore === 100,
        infoScore,
        responseTimeScore
      },
      status: score >= 90 ? 'excellent' : (score >= 70 ? 'good' : 'needs improvement')
    };
  }

  /**
   * Convert score to rating
   */
  scoreToRating(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Calculate trend from historical scores
   */
  calculateTrend(historicalScores, currentScore) {
    if (historicalScores.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const recentScores = historicalScores.slice(-3);
    const avgRecent = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
    const change = currentScore - avgRecent;

    if (change > 5) return { direction: 'improving', change: Math.round(change) };
    if (change < -5) return { direction: 'declining', change: Math.round(change) };
    return { direction: 'stable', change: Math.round(change) };
  }

  /**
   * Identify vendor strengths
   */
  identifyStrengths(scores) {
    const strengths = [];
    const sortedScores = Object.entries(scores)
      .sort((a, b) => b[1] - a[1]);

    sortedScores.slice(0, 2).forEach(([category, score]) => {
      if (score >= 80) {
        strengths.push({
          category,
          score,
          description: this.getCategoryDescription(category, 'strength')
        });
      }
    });

    return strengths;
  }

  /**
   * Identify vendor weaknesses
   */
  identifyWeaknesses(scores) {
    const weaknesses = [];
    const sortedScores = Object.entries(scores)
      .sort((a, b) => a[1] - b[1]);

    sortedScores.slice(0, 2).forEach(([category, score]) => {
      if (score < 70) {
        weaknesses.push({
          category,
          score,
          description: this.getCategoryDescription(category, 'weakness')
        });
      }
    });

    return weaknesses;
  }

  /**
   * Get category description
   */
  getCategoryDescription(category, type) {
    const descriptions = {
      performance: {
        strength: 'Consistently delivers on time and meets performance targets',
        weakness: 'Delivery performance needs improvement'
      },
      financial: {
        strength: 'Excellent invoice accuracy and financial stability',
        weakness: 'Invoice accuracy or financial practices need attention'
      },
      compliance: {
        strength: 'Maintains excellent compliance and certifications',
        weakness: 'Compliance gaps or expiring certifications need attention'
      },
      reliability: {
        strength: 'Proven track record with consistent service',
        weakness: 'Reliability concerns - consider backup vendors'
      },
      quality: {
        strength: 'High quality standards with minimal issues',
        weakness: 'Quality concerns detected in recent transactions'
      },
      communication: {
        strength: 'Responsive and maintains clear communication',
        weakness: 'Communication responsiveness needs improvement'
      }
    };

    return descriptions[category]?.[type] || '';
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(scores, metrics) {
    const recommendations = [];

    // Performance recommendations
    if (scores.performance < 70) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        action: 'Schedule performance review meeting',
        details: 'Discuss delivery timelines and set improvement targets'
      });
    }

    // Compliance recommendations
    if (scores.compliance < 90) {
      if (metrics.complianceMetrics.gaps?.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'compliance',
          action: 'Address compliance gaps immediately',
          details: `${metrics.complianceMetrics.gaps.length} compliance requirements need attention`
        });
      }

      if (metrics.complianceMetrics.expiringCertifications?.length > 0) {
        recommendations.push({
          priority: 'medium',
          category: 'compliance',
          action: 'Request certification renewals',
          details: `${metrics.complianceMetrics.expiringCertifications.length} certifications expiring soon`
        });
      }
    }

    // Financial recommendations
    if (scores.financial < 70) {
      recommendations.push({
        priority: 'medium',
        category: 'financial',
        action: 'Review invoice submission process',
        details: 'High rate of invoice issues detected'
      });
    }

    // Overall recommendations
    if (Object.values(scores).every(s => s >= 85)) {
      recommendations.push({
        priority: 'low',
        category: 'relationship',
        action: 'Consider preferred vendor status',
        details: 'Vendor demonstrates excellent performance across all categories'
      });
    }

    return recommendations;
  }

  /**
   * Assess overall risk level
   */
  assessRiskLevel(scores) {
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
    const minScore = Math.min(...Object.values(scores));

    if (minScore < 50 || avgScore < 60) return 'high';
    if (minScore < 60 || avgScore < 70) return 'medium';
    if (minScore < 70 || avgScore < 80) return 'low';
    return 'minimal';
  }

  /**
   * Compare multiple vendors
   */
  async compareVendors(vendorIds) {
    const comparisons = await Promise.all(
      vendorIds.map(id => this.calculateVendorScore(id))
    );

    // Rank by overall score
    const ranked = comparisons.sort((a, b) => b.overallScore - a.overallScore);

    // Find best in each category
    const categoryLeaders = {};
    for (const category of Object.keys(this.weights)) {
      const leader = comparisons.reduce((best, current) => {
        if (!best || current.categoryScores[category] > best.categoryScores[category]) {
          return current;
        }
        return best;
      }, null);
      categoryLeaders[category] = {
        vendorId: leader.vendorId,
        vendorName: leader.vendorName,
        score: leader.categoryScores[category]
      };
    }

    return {
      ranking: ranked.map((v, i) => ({
        rank: i + 1,
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        overallScore: v.overallScore,
        rating: v.rating
      })),
      categoryLeaders,
      comparison: comparisons
    };
  }

  /**
   * Batch score vendors
   */
  async batchScoreVendors(vendorIds) {
    const results = {
      scored: [],
      failed: []
    };

    for (const vendorId of vendorIds) {
      try {
        const scoreCard = await this.calculateVendorScore(vendorId);
        results.scored.push({
          vendorId,
          score: scoreCard.overallScore,
          rating: scoreCard.rating
        });
      } catch (error) {
        results.failed.push({ vendorId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get vendor score trends
   */
  async getScoreTrends(vendorId, months = 12) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.scoreHistory) {
      return { trends: [], hasData: false };
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const relevantHistory = vendor.scoreHistory.filter(h => 
      new Date(h.date) >= cutoffDate
    );

    return {
      hasData: relevantHistory.length > 0,
      trends: relevantHistory.map(h => ({
        date: h.date,
        score: h.score,
        categoryScores: h.categoryScores
      })),
      summary: {
        startScore: relevantHistory[0]?.score,
        endScore: relevantHistory[relevantHistory.length - 1]?.score,
        change: relevantHistory.length > 1 ? 
          relevantHistory[relevantHistory.length - 1].score - relevantHistory[0].score : 0,
        dataPoints: relevantHistory.length
      }
    };
  }
}

module.exports = new VendorScorer();
