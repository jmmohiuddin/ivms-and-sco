/**
 * Certification Manager
 * 
 * Manages vendor certifications including:
 * - Industry certifications (ISO, SOC, etc.)
 * - Professional qualifications
 * - Safety certifications
 * - Quality certifications
 */

const Certification = require('../../models/Certification');
const Vendor = require('../../models/Vendor');

class CertificationManager {
  /**
   * Add certification
   */
  static async addCertification(certData) {
    const vendor = await Vendor.findById(certData.vendor);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Check for duplicate certification
    const existing = await Certification.findOne({
      vendor: certData.vendor,
      certificationNumber: certData.certificationNumber
    });

    if (existing) {
      throw new Error('Certification already exists for this vendor');
    }

    const certification = await Certification.create({
      ...certData,
      status: this.determineCertificationStatus(certData.expiryDate)
    });

    // Update vendor certification score
    await this.updateVendorCertificationScore(certData.vendor);

    return certification;
  }

  /**
   * Bulk import certifications
   */
  static async bulkImportCertifications(certifications) {
    const results = {
      success: [],
      failed: [],
      duplicates: []
    };

    for (const cert of certifications) {
      try {
        const existing = await Certification.findOne({
          vendor: cert.vendor,
          certificationNumber: cert.certificationNumber
        });

        if (existing) {
          results.duplicates.push({ certificationNumber: cert.certificationNumber });
          continue;
        }

        const newCert = await this.addCertification(cert);
        results.success.push({ id: newCert._id, name: newCert.name });
      } catch (error) {
        results.failed.push({ data: cert, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get vendor certifications
   */
  static async getVendorCertifications(vendorId) {
    const certifications = await Certification.find({ vendor: vendorId })
      .sort({ expiryDate: 1 });

    const summary = this.calculateCertificationSummary(certifications);

    return {
      certifications,
      summary
    };
  }

  /**
   * Calculate certification summary
   */
  static calculateCertificationSummary(certifications) {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const summary = {
      total: certifications.length,
      valid: 0,
      expired: 0,
      expiringSoon: 0,
      expiringIn90Days: 0,
      byType: {},
      byCategory: {}
    };

    certifications.forEach(cert => {
      const expiryDate = new Date(cert.expiryDate);

      // Status count
      if (expiryDate < now) {
        summary.expired++;
      } else if (expiryDate < thirtyDays) {
        summary.expiringSoon++;
      } else if (expiryDate < ninetyDays) {
        summary.expiringIn90Days++;
      } else {
        summary.valid++;
      }

      // By type
      summary.byType[cert.certificationType] = 
        (summary.byType[cert.certificationType] || 0) + 1;

      // By category
      if (cert.category) {
        summary.byCategory[cert.category] = 
          (summary.byCategory[cert.category] || 0) + 1;
      }
    });

    summary.healthScore = this.calculateHealthScore(summary);

    return summary;
  }

  /**
   * Calculate certification health score
   */
  static calculateHealthScore(summary) {
    if (summary.total === 0) return 0;

    const validPercentage = (summary.valid / summary.total) * 100;
    const expiredPenalty = summary.expired * 20;
    const expiringSoonPenalty = summary.expiringSoon * 5;

    return Math.max(0, Math.round(validPercentage - expiredPenalty - expiringSoonPenalty));
  }

  /**
   * Determine certification status based on expiry date
   */
  static determineCertificationStatus(expiryDate) {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiry = new Date(expiryDate);

    if (expiry < now) return 'expired';
    if (expiry < thirtyDays) return 'expiring-soon';
    return 'valid';
  }

  /**
   * Update vendor certification score
   */
  static async updateVendorCertificationScore(vendorId) {
    const certifications = await Certification.find({ vendor: vendorId });
    const summary = this.calculateCertificationSummary(certifications);

    await Vendor.findByIdAndUpdate(vendorId, {
      certificationScore: summary.healthScore,
      certificationCount: summary.total,
      hasExpiredCertifications: summary.expired > 0
    });
  }

  /**
   * Get expiring certifications
   */
  static async getExpiringCertifications(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiring = await Certification.find({
      expiryDate: {
        $gte: new Date(),
        $lte: futureDate
      }
    })
    .populate('vendor', 'name email contactPerson')
    .sort({ expiryDate: 1 });

    return expiring.map(cert => ({
      ...cert.toObject(),
      daysUntilExpiry: Math.ceil(
        (new Date(cert.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      )
    }));
  }

  /**
   * Get expired certifications
   */
  static async getExpiredCertifications() {
    return await Certification.find({
      expiryDate: { $lt: new Date() }
    })
    .populate('vendor', 'name email contactPerson')
    .sort({ expiryDate: -1 });
  }

  /**
   * Renew certification
   */
  static async renewCertification(certificationId, renewalData) {
    const cert = await Certification.findById(certificationId);
    if (!cert) {
      throw new Error('Certification not found');
    }

    // Archive old certification
    await Certification.findByIdAndUpdate(certificationId, {
      status: 'archived',
      archivedAt: new Date()
    });

    // Create new certification
    const newCert = await Certification.create({
      vendor: cert.vendor,
      name: cert.name,
      certificationType: cert.certificationType,
      category: cert.category,
      issuingAuthority: cert.issuingAuthority,
      ...renewalData,
      previousCertification: certificationId,
      status: 'valid'
    });

    await this.updateVendorCertificationScore(cert.vendor);

    return newCert;
  }

  /**
   * Verify certification
   */
  static async verifyCertification(certificationId, verificationData) {
    const cert = await Certification.findByIdAndUpdate(
      certificationId,
      {
        $set: {
          verified: true,
          verifiedAt: new Date(),
          verifiedBy: verificationData.verifiedBy,
          verificationMethod: verificationData.method,
          verificationNotes: verificationData.notes
        }
      },
      { new: true }
    );

    return cert;
  }

  /**
   * Get certification analytics
   */
  static async getCertificationAnalytics() {
    const [
      typeDistribution,
      statusDistribution,
      monthlyExpirations,
      vendorCoverage
    ] = await Promise.all([
      Certification.aggregate([
        { $group: { _id: '$certificationType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Certification.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Certification.aggregate([
        {
          $match: {
            expiryDate: {
              $gte: new Date(),
              $lte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$expiryDate' },
              year: { $year: '$expiryDate' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Certification.aggregate([
        {
          $group: {
            _id: '$vendor',
            certCount: { $sum: 1 },
            validCount: {
              $sum: {
                $cond: [{ $gt: ['$expiryDate', new Date()] }, 1, 0]
              }
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
            certCount: 1,
            validCount: 1
          }
        },
        { $sort: { certCount: -1 } },
        { $limit: 20 }
      ])
    ]);

    return {
      typeDistribution,
      statusDistribution,
      monthlyExpirations,
      vendorCoverage
    };
  }
}

module.exports = CertificationManager;
