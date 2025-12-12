/**
 * Compliance Collector
 * 
 * Gathers and manages vendor compliance data including:
 * - Regulatory compliance
 * - Industry standards
 * - Internal policies
 * - Audit requirements
 */

const Compliance = require('../../models/Compliance');
const Vendor = require('../../models/Vendor');

class ComplianceCollector {
  /**
   * Record compliance data
   */
  static async recordCompliance(complianceData) {
    const vendor = await Vendor.findById(complianceData.vendor);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const compliance = await Compliance.create({
      ...complianceData,
      recordedAt: new Date()
    });

    // Update vendor risk level based on compliance
    await this.updateVendorRiskLevel(complianceData.vendor);

    return compliance;
  }

  /**
   * Bulk import compliance records
   */
  static async bulkImportCompliance(records) {
    const results = {
      success: [],
      failed: []
    };

    for (const record of records) {
      try {
        const compliance = await this.recordCompliance(record);
        results.success.push({ id: compliance._id, type: compliance.complianceType });
      } catch (error) {
        results.failed.push({ data: record, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get vendor compliance status
   */
  static async getVendorCompliance(vendorId) {
    const records = await Compliance.find({ vendor: vendorId })
      .sort({ recordedAt: -1 });

    const summary = this.calculateComplianceSummary(records);

    return {
      records,
      summary,
      riskAssessment: this.assessComplianceRisk(records)
    };
  }

  /**
   * Calculate compliance summary
   */
  static calculateComplianceSummary(records) {
    if (!records || records.length === 0) {
      return {
        overallStatus: 'unknown',
        score: 0,
        byType: {},
        issues: []
      };
    }

    let totalScore = 0;
    const byType = {};
    const issues = [];

    records.forEach(record => {
      // Track by type
      if (!byType[record.complianceType]) {
        byType[record.complianceType] = {
          total: 0,
          compliant: 0,
          nonCompliant: 0,
          pending: 0
        };
      }

      byType[record.complianceType].total++;
      
      if (record.status === 'compliant') {
        byType[record.complianceType].compliant++;
        totalScore += 100;
      } else if (record.status === 'non-compliant') {
        byType[record.complianceType].nonCompliant++;
        issues.push({
          type: record.complianceType,
          description: record.description,
          severity: record.severity,
          recordedAt: record.recordedAt
        });
      } else {
        byType[record.complianceType].pending++;
        totalScore += 50;
      }
    });

    const averageScore = Math.round(totalScore / records.length);

    return {
      overallStatus: averageScore >= 80 ? 'good' : averageScore >= 50 ? 'warning' : 'critical',
      score: averageScore,
      byType,
      issues: issues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
    };
  }

  /**
   * Assess compliance risk
   */
  static assessComplianceRisk(records) {
    const criticalIssues = records.filter(r => 
      r.status === 'non-compliant' && r.severity === 'critical'
    ).length;

    const highIssues = records.filter(r => 
      r.status === 'non-compliant' && r.severity === 'high'
    ).length;

    const expiringSoon = records.filter(r => {
      if (!r.expiryDate) return false;
      const daysToExpiry = Math.ceil((new Date(r.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      return daysToExpiry > 0 && daysToExpiry <= 30;
    }).length;

    let riskLevel = 'low';
    let riskScore = 0;

    if (criticalIssues > 0) {
      riskLevel = 'critical';
      riskScore = 90 + (criticalIssues * 5);
    } else if (highIssues > 0) {
      riskLevel = 'high';
      riskScore = 60 + (highIssues * 10);
    } else if (expiringSoon > 0) {
      riskLevel = 'medium';
      riskScore = 30 + (expiringSoon * 5);
    }

    return {
      riskLevel,
      riskScore: Math.min(riskScore, 100),
      factors: {
        criticalIssues,
        highIssues,
        expiringSoon
      },
      recommendations: this.generateComplianceRecommendations(records)
    };
  }

  /**
   * Generate compliance recommendations
   */
  static generateComplianceRecommendations(records) {
    const recommendations = [];

    // Check for expired compliance
    const expired = records.filter(r => r.expiryDate && new Date(r.expiryDate) < new Date());
    if (expired.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Renew expired compliance certificates',
        details: `${expired.length} compliance record(s) have expired`,
        type: 'renewal'
      });
    }

    // Check for non-compliant items
    const nonCompliant = records.filter(r => r.status === 'non-compliant');
    if (nonCompliant.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Address non-compliance issues',
        details: `${nonCompliant.length} non-compliance issue(s) require immediate attention`,
        type: 'remediation'
      });
    }

    // Check for missing compliance types
    const requiredTypes = ['regulatory', 'financial', 'operational', 'environmental'];
    const existingTypes = [...new Set(records.map(r => r.complianceType))];
    const missingTypes = requiredTypes.filter(t => !existingTypes.includes(t));
    
    if (missingTypes.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Complete missing compliance assessments',
        details: `Missing compliance assessments: ${missingTypes.join(', ')}`,
        type: 'assessment'
      });
    }

    return recommendations;
  }

  /**
   * Update vendor risk level based on compliance
   */
  static async updateVendorRiskLevel(vendorId) {
    const records = await Compliance.find({ vendor: vendorId });
    const riskAssessment = this.assessComplianceRisk(records);

    await Vendor.findByIdAndUpdate(vendorId, {
      complianceRiskLevel: riskAssessment.riskLevel,
      complianceScore: 100 - riskAssessment.riskScore
    });
  }

  /**
   * Get compliance due for renewal
   */
  static async getComplianceDueForRenewal(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const dueSoon = await Compliance.find({
      expiryDate: {
        $gte: new Date(),
        $lte: futureDate
      }
    })
    .populate('vendor', 'name email')
    .sort({ expiryDate: 1 });

    return dueSoon.map(record => ({
      ...record.toObject(),
      daysUntilExpiry: Math.ceil((new Date(record.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    }));
  }

  /**
   * Get compliance analytics
   */
  static async getComplianceAnalytics() {
    const [
      statusBreakdown,
      typeBreakdown,
      vendorCompliance
    ] = await Promise.all([
      Compliance.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Compliance.aggregate([
        { $group: { _id: '$complianceType', count: { $sum: 1 } } }
      ]),
      Compliance.aggregate([
        {
          $group: {
            _id: '$vendor',
            total: { $sum: 1 },
            compliant: {
              $sum: { $cond: [{ $eq: ['$status', 'compliant'] }, 1, 0] }
            }
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
            vendorName: '$vendorInfo.name',
            total: 1,
            compliant: 1,
            complianceRate: {
              $multiply: [{ $divide: ['$compliant', '$total'] }, 100]
            }
          }
        },
        { $sort: { complianceRate: -1 } }
      ])
    ]);

    return {
      statusBreakdown,
      typeBreakdown,
      vendorCompliance
    };
  }
}

module.exports = ComplianceCollector;
