/**
 * Risk Assessment
 * 
 * Comprehensive risk assessment for vendors and transactions:
 * - Multi-factor risk scoring
 * - Risk categorization
 * - Risk mitigation recommendations
 */

const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const Contract = require('../../models/Contract');
const Compliance = require('../../models/Compliance');

class RiskAssessment {
  constructor() {
    // Risk factor weights
    this.riskFactors = {
      financial: 0.25,
      operational: 0.20,
      compliance: 0.20,
      reputational: 0.15,
      strategic: 0.10,
      geographic: 0.10
    };

    // Risk thresholds
    this.thresholds = {
      critical: 80,
      high: 60,
      medium: 40,
      low: 20
    };
  }

  /**
   * Perform comprehensive vendor risk assessment
   */
  async assessVendorRisk(vendorId) {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Assess each risk factor
      const [
        financialRisk,
        operationalRisk,
        complianceRisk,
        reputationalRisk,
        strategicRisk,
        geographicRisk
      ] = await Promise.all([
        this.assessFinancialRisk(vendorId),
        this.assessOperationalRisk(vendorId),
        this.assessComplianceRisk(vendorId),
        this.assessReputationalRisk(vendor),
        this.assessStrategicRisk(vendorId),
        this.assessGeographicRisk(vendor)
      ]);

      // Calculate weighted risk score
      const riskScores = {
        financial: financialRisk.score,
        operational: operationalRisk.score,
        compliance: complianceRisk.score,
        reputational: reputationalRisk.score,
        strategic: strategicRisk.score,
        geographic: geographicRisk.score
      };

      const overallRiskScore = Object.entries(this.riskFactors).reduce((total, [factor, weight]) => {
        return total + (riskScores[factor] * weight);
      }, 0);

      // Determine risk level
      const riskLevel = this.getRiskLevel(overallRiskScore);

      // Generate risk assessment report
      const assessment = {
        vendorId,
        vendorName: vendor.name,
        assessedAt: new Date(),
        overallRiskScore: Math.round(overallRiskScore),
        riskLevel,
        riskFactors: {
          financial: financialRisk,
          operational: operationalRisk,
          compliance: complianceRisk,
          reputational: reputationalRisk,
          strategic: strategicRisk,
          geographic: geographicRisk
        },
        topRisks: this.identifyTopRisks(riskScores),
        mitigationActions: this.generateMitigationActions(riskScores, riskLevel),
        recommendations: this.generateRecommendations(riskScores)
      };

      // Update vendor risk level
      await Vendor.findByIdAndUpdate(vendorId, {
        riskLevel,
        lastRiskAssessment: new Date()
      });

      return assessment;
    } catch (error) {
      console.error('Risk assessment error:', error);
      throw error;
    }
  }

  /**
   * Assess financial risk
   */
  async assessFinancialRisk(vendorId) {
    const invoices = await Invoice.find({ vendor: vendorId });
    
    // Calculate financial metrics
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const fraudFlagged = invoices.filter(i => i.fraudDetection?.riskScore >= 0.5).length;
    const overdueInvoices = invoices.filter(i => 
      i.status !== 'paid' && i.dueDate && new Date(i.dueDate) < new Date()
    ).length;

    // Calculate risk score
    let score = 0;
    
    // High fraud detection flags = higher risk
    if (invoices.length > 0) {
      score += (fraudFlagged / invoices.length) * 50;
    }
    
    // Overdue invoices indicate financial issues
    if (invoices.length > 0) {
      score += (overdueInvoices / invoices.length) * 30;
    }
    
    // Add base risk for new vendors with no history
    if (invoices.length < 5) {
      score += 20;
    }

    return {
      score: Math.min(100, Math.round(score)),
      totalInvoiced,
      fraudFlaggedCount: fraudFlagged,
      overdueCount: overdueInvoices,
      invoiceCount: invoices.length,
      indicators: this.getFinancialIndicators(score, fraudFlagged, overdueInvoices)
    };
  }

  /**
   * Assess operational risk
   */
  async assessOperationalRisk(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    const contracts = await Contract.find({ vendor: vendorId, status: 'active' });
    
    let score = 0;
    const indicators = [];

    // Check vendor age (newer vendors = higher operational risk)
    if (vendor) {
      const ageDays = Math.floor((Date.now() - vendor.createdAt) / (1000 * 60 * 60 * 24));
      if (ageDays < 30) {
        score += 30;
        indicators.push('New vendor (< 30 days)');
      } else if (ageDays < 90) {
        score += 15;
        indicators.push('Relatively new vendor (< 90 days)');
      }
    }

    // Check contract complexity
    const highValueContracts = contracts.filter(c => c.totalValue > 100000);
    if (highValueContracts.length > 0) {
      score += 20;
      indicators.push(`${highValueContracts.length} high-value contracts`);
    }

    // Check performance score
    if (vendor?.currentScore && vendor.currentScore < 60) {
      score += 30;
      indicators.push('Low performance score');
    }

    return {
      score: Math.min(100, Math.round(score)),
      vendorAge: vendor ? Math.floor((Date.now() - vendor.createdAt) / (1000 * 60 * 60 * 24)) : 0,
      activeContracts: contracts.length,
      performanceScore: vendor?.currentScore || 0,
      indicators
    };
  }

  /**
   * Assess compliance risk
   */
  async assessComplianceRisk(vendorId) {
    const compliance = await Compliance.find({ vendor: vendorId });
    
    let score = 0;
    const issues = [];

    // Check compliance status
    const nonCompliant = compliance.filter(c => c.status === 'non-compliant');
    const pending = compliance.filter(c => c.status === 'pending');
    const expired = compliance.filter(c => c.status === 'expired');

    if (nonCompliant.length > 0) {
      score += (nonCompliant.length * 25);
      issues.push(...nonCompliant.map(c => `Non-compliant: ${c.requirementType}`));
    }

    if (expired.length > 0) {
      score += (expired.length * 20);
      issues.push(...expired.map(c => `Expired: ${c.requirementType}`));
    }

    if (pending.length > 0) {
      score += (pending.length * 10);
      issues.push(...pending.map(c => `Pending: ${c.requirementType}`));
    }

    // No compliance records = potential risk
    if (compliance.length === 0) {
      score += 30;
      issues.push('No compliance records on file');
    }

    const complianceRate = compliance.length > 0 ?
      (compliance.filter(c => c.status === 'compliant').length / compliance.length) * 100 : 0;

    return {
      score: Math.min(100, Math.round(score)),
      totalRequirements: compliance.length,
      nonCompliantCount: nonCompliant.length,
      pendingCount: pending.length,
      expiredCount: expired.length,
      complianceRate: Math.round(complianceRate),
      issues
    };
  }

  /**
   * Assess reputational risk
   */
  async assessReputationalRisk(vendor) {
    let score = 0;
    const factors = [];

    // Check vendor rating
    if (vendor.rating) {
      const ratingScores = { A: 0, B: 10, C: 30, D: 50, F: 70 };
      score += ratingScores[vendor.rating] || 0;
      if (['D', 'F'].includes(vendor.rating)) {
        factors.push(`Low rating: ${vendor.rating}`);
      }
    }

    // Check current score
    if (vendor.currentScore) {
      if (vendor.currentScore < 50) {
        score += 30;
        factors.push('Poor performance score');
      } else if (vendor.currentScore < 70) {
        score += 15;
        factors.push('Below average performance');
      }
    }

    // Check for high risk designation
    if (vendor.riskLevel === 'high' || vendor.riskLevel === 'critical') {
      score += 20;
      factors.push(`Currently designated as ${vendor.riskLevel} risk`);
    }

    return {
      score: Math.min(100, Math.round(score)),
      rating: vendor.rating,
      currentScore: vendor.currentScore,
      factors
    };
  }

  /**
   * Assess strategic risk
   */
  async assessStrategicRisk(vendorId) {
    const contracts = await Contract.find({ vendor: vendorId, status: 'active' });
    
    let score = 0;
    const factors = [];

    // Check contract concentration
    const totalValue = contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    
    if (contracts.length === 1 && totalValue > 500000) {
      score += 40;
      factors.push('Single point of failure - high value contract');
    }

    // Check for expiring contracts
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiring = contracts.filter(c => c.endDate && new Date(c.endDate) <= thirtyDays);
    
    if (expiring.length > 0) {
      score += 20;
      factors.push(`${expiring.length} contract(s) expiring within 30 days`);
    }

    // Check for risky contracts
    const riskyContracts = contracts.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical');
    if (riskyContracts.length > 0) {
      score += 25;
      factors.push(`${riskyContracts.length} high-risk contracts`);
    }

    return {
      score: Math.min(100, Math.round(score)),
      activeContracts: contracts.length,
      totalContractValue: totalValue,
      expiringContracts: expiring.length,
      riskyContracts: riskyContracts.length,
      factors
    };
  }

  /**
   * Assess geographic risk
   */
  async assessGeographicRisk(vendor) {
    let score = 0;
    const factors = [];

    // High-risk regions (simplified)
    const highRiskRegions = ['international', 'overseas'];
    const mediumRiskRegions = ['remote'];

    const location = (vendor.address?.country || vendor.region || '').toLowerCase();
    
    if (highRiskRegions.some(r => location.includes(r))) {
      score += 40;
      factors.push('International vendor - additional risk considerations');
    } else if (mediumRiskRegions.some(r => location.includes(r))) {
      score += 20;
      factors.push('Remote location may impact service delivery');
    }

    // No location data = some risk
    if (!vendor.address && !vendor.region) {
      score += 15;
      factors.push('No location information on file');
    }

    return {
      score: Math.round(score),
      location: vendor.address?.country || vendor.region || 'Unknown',
      factors
    };
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score >= this.thresholds.critical) return 'critical';
    if (score >= this.thresholds.high) return 'high';
    if (score >= this.thresholds.medium) return 'medium';
    if (score >= this.thresholds.low) return 'low';
    return 'minimal';
  }

  /**
   * Get financial indicators
   */
  getFinancialIndicators(score, fraudFlagged, overdue) {
    const indicators = [];
    if (fraudFlagged > 0) indicators.push(`${fraudFlagged} fraud-flagged invoice(s)`);
    if (overdue > 0) indicators.push(`${overdue} overdue invoice(s)`);
    if (score > 50) indicators.push('Elevated financial risk');
    return indicators;
  }

  /**
   * Identify top risks
   */
  identifyTopRisks(riskScores) {
    return Object.entries(riskScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factor, score]) => ({
        factor,
        score,
        level: this.getRiskLevel(score)
      }));
  }

  /**
   * Generate mitigation actions
   */
  generateMitigationActions(riskScores, riskLevel) {
    const actions = [];

    if (riskScores.compliance > 40) {
      actions.push({
        priority: 'high',
        action: 'Conduct compliance audit',
        timeline: '1 week'
      });
    }

    if (riskScores.financial > 40) {
      actions.push({
        priority: 'high',
        action: 'Review financial controls and payment terms',
        timeline: '2 weeks'
      });
    }

    if (riskScores.operational > 40) {
      actions.push({
        priority: 'medium',
        action: 'Evaluate operational capabilities',
        timeline: '1 month'
      });
    }

    if (riskLevel === 'critical' || riskLevel === 'high') {
      actions.push({
        priority: 'critical',
        action: 'Schedule vendor review meeting',
        timeline: 'Immediate'
      });
    }

    return actions;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(riskScores) {
    const recommendations = [];
    const highestRisk = Object.entries(riskScores).sort((a, b) => b[1] - a[1])[0];

    if (highestRisk) {
      const [factor, score] = highestRisk;
      const level = this.getRiskLevel(score);
      
      recommendations.push({
        priority: level === 'critical' || level === 'high' ? 'high' : 'medium',
        recommendation: `Focus on ${factor} risk mitigation - current level: ${level}`,
        impact: 'Reducing this risk factor will have the greatest impact on overall risk profile'
      });
    }

    return recommendations;
  }

  /**
   * Batch assess multiple vendors
   */
  async batchAssessRisks(vendorIds) {
    const results = {
      assessed: [],
      failed: []
    };

    for (const vendorId of vendorIds) {
      try {
        const assessment = await this.assessVendorRisk(vendorId);
        results.assessed.push({
          vendorId,
          riskLevel: assessment.riskLevel,
          score: assessment.overallRiskScore
        });
      } catch (error) {
        results.failed.push({ vendorId, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new RiskAssessment();
