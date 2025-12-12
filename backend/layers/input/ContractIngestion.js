/**
 * Contract Ingestion
 * 
 * Manages contract data collection and storage:
 * - Contract creation and management
 * - Contract tracking and renewal
 * - Contract analytics
 */

const Contract = require('../../models/Contract');
const Vendor = require('../../models/Vendor');

class ContractIngestion {
  /**
   * Create a new contract
   */
  static async createContract(contractData) {
    const vendor = await Vendor.findById(contractData.vendor);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Generate contract number
    const contractCount = await Contract.countDocuments();
    const contractNumber = `CON-${Date.now()}-${String(contractCount + 1).padStart(5, '0')}`;

    const contract = await Contract.create({
      ...contractData,
      contractNumber,
      status: 'draft'
    });

    return contract;
  }

  /**
   * Bulk import contracts
   */
  static async bulkImportContracts(contracts) {
    const results = {
      success: [],
      failed: [],
      duplicates: []
    };

    for (const contractData of contracts) {
      try {
        // Check for duplicate
        const existing = await Contract.findOne({
          vendor: contractData.vendor,
          title: contractData.title,
          startDate: contractData.startDate
        });

        if (existing) {
          results.duplicates.push({ title: contractData.title });
          continue;
        }

        const contract = await this.createContract(contractData);
        results.success.push({ id: contract._id, title: contract.title });
      } catch (error) {
        results.failed.push({ data: contractData, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get contract details
   */
  static async getContractDetails(contractId) {
    const contract = await Contract.findById(contractId)
      .populate('vendor', 'name email contactPerson')
      .populate('amendments')
      .populate('relatedDocuments');

    if (!contract) {
      throw new Error('Contract not found');
    }

    return {
      contract,
      timeline: this.generateContractTimeline(contract),
      financialSummary: this.calculateFinancialSummary(contract)
    };
  }

  /**
   * Generate contract timeline
   */
  static generateContractTimeline(contract) {
    const timeline = [];

    timeline.push({
      date: contract.createdAt,
      event: 'Contract Created',
      type: 'creation'
    });

    if (contract.signedDate) {
      timeline.push({
        date: contract.signedDate,
        event: 'Contract Signed',
        type: 'signature'
      });
    }

    timeline.push({
      date: contract.startDate,
      event: 'Contract Start',
      type: 'start'
    });

    timeline.push({
      date: contract.endDate,
      event: 'Contract End',
      type: 'end'
    });

    if (contract.amendments) {
      contract.amendments.forEach((amendment, index) => {
        timeline.push({
          date: amendment.date,
          event: `Amendment ${index + 1}`,
          type: 'amendment',
          details: amendment.description
        });
      });
    }

    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Calculate financial summary
   */
  static calculateFinancialSummary(contract) {
    const now = new Date();
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    
    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    const progressPercentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    return {
      totalValue: contract.totalValue,
      progressPercentage: Math.round(progressPercentage),
      remainingValue: contract.totalValue * (1 - progressPercentage / 100),
      monthlyValue: contract.totalValue / (totalDuration / (1000 * 60 * 60 * 24 * 30)),
      daysRemaining: Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
    };
  }

  /**
   * Get vendor contracts
   */
  static async getVendorContracts(vendorId) {
    const contracts = await Contract.find({ vendor: vendorId })
      .sort({ startDate: -1 });

    const summary = {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'active').length,
      expired: contracts.filter(c => c.status === 'expired').length,
      totalValue: contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0),
      byType: {}
    };

    contracts.forEach(c => {
      summary.byType[c.contractType] = (summary.byType[c.contractType] || 0) + 1;
    });

    return { contracts, summary };
  }

  /**
   * Get expiring contracts
   */
  static async getExpiringContracts(daysAhead = 60) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiring = await Contract.find({
      endDate: {
        $gte: new Date(),
        $lte: futureDate
      },
      status: 'active'
    })
    .populate('vendor', 'name email contactPerson')
    .sort({ endDate: 1 });

    return expiring.map(contract => ({
      ...contract.toObject(),
      daysUntilExpiry: Math.ceil(
        (new Date(contract.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      ),
      renewalRecommendation: this.generateRenewalRecommendation(contract)
    }));
  }

  /**
   * Generate renewal recommendation
   */
  static generateRenewalRecommendation(contract) {
    const daysUntilExpiry = Math.ceil(
      (new Date(contract.endDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 30) {
      return {
        urgency: 'high',
        recommendation: 'Immediate renewal action required',
        suggestedAction: 'Initiate renewal negotiations'
      };
    } else if (daysUntilExpiry <= 60) {
      return {
        urgency: 'medium',
        recommendation: 'Plan for renewal',
        suggestedAction: 'Review contract terms and vendor performance'
      };
    } else {
      return {
        urgency: 'low',
        recommendation: 'Monitor contract',
        suggestedAction: 'Schedule renewal review'
      };
    }
  }

  /**
   * Update contract status
   */
  static async updateContractStatus(contractId, status, notes) {
    const contract = await Contract.findByIdAndUpdate(
      contractId,
      {
        status,
        $push: {
          statusHistory: {
            status,
            notes,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    return contract;
  }

  /**
   * Add amendment to contract
   */
  static async addAmendment(contractId, amendmentData) {
    const contract = await Contract.findByIdAndUpdate(
      contractId,
      {
        $push: {
          amendments: {
            ...amendmentData,
            date: new Date(),
            amendmentNumber: `AMD-${Date.now()}`
          }
        }
      },
      { new: true }
    );

    return contract;
  }

  /**
   * Get contract analytics
   */
  static async getContractAnalytics() {
    const [
      statusBreakdown,
      typeBreakdown,
      valueByVendor,
      monthlyExpirations,
      totalValue
    ] = await Promise.all([
      Contract.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Contract.aggregate([
        { $group: { _id: '$contractType', count: { $sum: 1 }, totalValue: { $sum: '$totalValue' } } }
      ]),
      Contract.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: '$vendor',
            contractCount: { $sum: 1 },
            totalValue: { $sum: '$totalValue' }
          }
        },
        { $sort: { totalValue: -1 } },
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
      Contract.aggregate([
        {
          $match: {
            endDate: {
              $gte: new Date(),
              $lte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$endDate' },
              year: { $year: '$endDate' }
            },
            count: { $sum: 1 },
            value: { $sum: '$totalValue' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Contract.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$totalValue' } } }
      ])
    ]);

    return {
      statusBreakdown,
      typeBreakdown,
      topVendorsByValue: valueByVendor,
      monthlyExpirations,
      totalActiveValue: totalValue[0]?.total || 0
    };
  }

  /**
   * Search contracts
   */
  static async searchContracts(searchParams) {
    const {
      query,
      status,
      contractType,
      vendorId,
      startDateFrom,
      startDateTo,
      page = 1,
      limit = 20
    } = searchParams;

    const searchQuery = {};

    if (query) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { contractNumber: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (status) searchQuery.status = status;
    if (contractType) searchQuery.contractType = contractType;
    if (vendorId) searchQuery.vendor = vendorId;
    
    if (startDateFrom || startDateTo) {
      searchQuery.startDate = {};
      if (startDateFrom) searchQuery.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) searchQuery.startDate.$lte = new Date(startDateTo);
    }

    const contracts = await Contract.find(searchQuery)
      .populate('vendor', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Contract.countDocuments(searchQuery);

    return {
      contracts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = ContractIngestion;
