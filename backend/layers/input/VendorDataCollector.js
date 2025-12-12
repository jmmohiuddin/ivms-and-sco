/**
 * Vendor Data Collector
 * 
 * Centralized collection of vendor profile data, contacts, and basic information.
 * Aggregates data from multiple sources into a unified vendor profile.
 */

const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const Compliance = require('../../models/Compliance');
const Certification = require('../../models/Certification');
const Contract = require('../../models/Contract');
const Payment = require('../../models/Payment');

class VendorDataCollector {
  /**
   * Collect comprehensive vendor profile
   */
  static async getVendorProfile(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Aggregate all related data
    const [invoices, compliance, certifications, contracts, payments] = await Promise.all([
      Invoice.find({ vendor: vendorId }).sort({ createdAt: -1 }).limit(10),
      Compliance.find({ vendor: vendorId }),
      Certification.find({ vendor: vendorId }),
      Contract.find({ vendor: vendorId }),
      Payment.find({ vendor: vendorId }).sort({ paymentDate: -1 }).limit(10)
    ]);

    return {
      vendor,
      summary: {
        totalInvoices: await Invoice.countDocuments({ vendor: vendorId }),
        totalPayments: await Payment.countDocuments({ vendor: vendorId }),
        activeContracts: contracts.filter(c => c.status === 'active').length,
        complianceStatus: this.calculateComplianceStatus(compliance),
        certificationStatus: this.calculateCertificationStatus(certifications)
      },
      recentInvoices: invoices,
      compliance,
      certifications,
      contracts,
      recentPayments: payments
    };
  }

  /**
   * Bulk import vendor data
   */
  static async bulkImportVendors(vendorDataArray) {
    const results = {
      success: [],
      failed: []
    };

    for (const vendorData of vendorDataArray) {
      try {
        // Check if vendor exists
        let vendor = await Vendor.findOne({ email: vendorData.email });
        
        if (vendor) {
          // Update existing vendor
          vendor = await Vendor.findByIdAndUpdate(vendor._id, vendorData, { new: true });
          results.success.push({ id: vendor._id, action: 'updated', name: vendor.name });
        } else {
          // Create new vendor
          vendor = await Vendor.create(vendorData);
          results.success.push({ id: vendor._id, action: 'created', name: vendor.name });
        }
      } catch (error) {
        results.failed.push({ data: vendorData, error: error.message });
      }
    }

    return results;
  }

  /**
   * Collect vendor contact information
   */
  static async getVendorContacts(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return {
      primary: {
        name: vendor.contactPerson?.name,
        email: vendor.contactPerson?.email,
        phone: vendor.contactPerson?.phone,
        position: vendor.contactPerson?.position
      },
      company: {
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        website: vendor.website
      },
      additionalContacts: vendor.additionalContacts || []
    };
  }

  /**
   * Aggregate vendor data from multiple vendors
   */
  static async aggregateVendorData(filters = {}) {
    const query = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.riskLevel) query.riskLevel = filters.riskLevel;

    const vendors = await Vendor.find(query);
    
    const aggregatedData = {
      totalVendors: vendors.length,
      byStatus: {},
      byCategory: {},
      byRiskLevel: {},
      averageRating: 0,
      totalSpend: 0
    };

    let totalRating = 0;
    let ratedVendors = 0;

    for (const vendor of vendors) {
      // Status breakdown
      aggregatedData.byStatus[vendor.status] = (aggregatedData.byStatus[vendor.status] || 0) + 1;
      
      // Category breakdown
      if (vendor.category) {
        aggregatedData.byCategory[vendor.category] = (aggregatedData.byCategory[vendor.category] || 0) + 1;
      }
      
      // Risk level breakdown
      if (vendor.riskLevel) {
        aggregatedData.byRiskLevel[vendor.riskLevel] = (aggregatedData.byRiskLevel[vendor.riskLevel] || 0) + 1;
      }

      // Rating calculation
      if (vendor.performanceRating) {
        totalRating += vendor.performanceRating;
        ratedVendors++;
      }
    }

    aggregatedData.averageRating = ratedVendors > 0 ? (totalRating / ratedVendors).toFixed(2) : 0;

    return aggregatedData;
  }

  /**
   * Calculate compliance status
   */
  static calculateComplianceStatus(complianceRecords) {
    if (!complianceRecords || complianceRecords.length === 0) {
      return { status: 'unknown', percentage: 0 };
    }

    const compliant = complianceRecords.filter(c => c.status === 'compliant').length;
    const percentage = Math.round((compliant / complianceRecords.length) * 100);

    return {
      status: percentage >= 80 ? 'good' : percentage >= 50 ? 'warning' : 'critical',
      percentage,
      total: complianceRecords.length,
      compliant
    };
  }

  /**
   * Calculate certification status
   */
  static calculateCertificationStatus(certifications) {
    if (!certifications || certifications.length === 0) {
      return { status: 'none', valid: 0, expired: 0, expiringSoon: 0 };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let valid = 0;
    let expired = 0;
    let expiringSoon = 0;

    for (const cert of certifications) {
      if (new Date(cert.expiryDate) < now) {
        expired++;
      } else if (new Date(cert.expiryDate) < thirtyDaysFromNow) {
        expiringSoon++;
      } else {
        valid++;
      }
    }

    return {
      status: expired > 0 ? 'critical' : expiringSoon > 0 ? 'warning' : 'good',
      valid,
      expired,
      expiringSoon,
      total: certifications.length
    };
  }

  /**
   * Search vendors with unified criteria
   */
  static async searchVendors(searchParams) {
    const {
      query,
      status,
      category,
      riskLevel,
      minRating,
      complianceStatus,
      page = 1,
      limit = 20
    } = searchParams;

    const searchQuery = {};

    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { 'contactPerson.name': { $regex: query, $options: 'i' } }
      ];
    }

    if (status) searchQuery.status = status;
    if (category) searchQuery.category = category;
    if (riskLevel) searchQuery.riskLevel = riskLevel;
    if (minRating) searchQuery.performanceRating = { $gte: minRating };

    const vendors = await Vendor.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Vendor.countDocuments(searchQuery);

    return {
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = VendorDataCollector;
