const mongoose = require('mongoose');

// Schema for individual line match details
const lineMatchDetailSchema = new mongoose.Schema({
  invoiceLineNumber: {
    type: Number,
    required: true
  },
  invoiceLineId: mongoose.Schema.Types.ObjectId,
  poLineNumber: Number,
  poLineId: mongoose.Schema.Types.ObjectId,
  grnLineNumber: Number,
  grnLineId: mongoose.Schema.Types.ObjectId,
  
  // Matching results
  descriptionMatch: {
    score: { type: Number, min: 0, max: 1 },
    invoiceDescription: String,
    poDescription: String,
    matchMethod: {
      type: String,
      enum: ['exact', 'fuzzy', 'semantic', 'sku']
    }
  },
  
  quantityMatch: {
    invoiceQty: Number,
    poQty: Number,
    grnQty: Number,
    variance: Number,
    variancePercent: Number,
    withinTolerance: Boolean
  },
  
  priceMatch: {
    invoicePrice: Number,
    poPrice: Number,
    variance: Number,
    variancePercent: Number,
    withinTolerance: Boolean
  },
  
  amountMatch: {
    invoiceAmount: Number,
    expectedAmount: Number,
    variance: Number,
    variancePercent: Number,
    withinTolerance: Boolean
  },
  
  lineMatchStatus: {
    type: String,
    enum: ['matched', 'partial', 'mismatch', 'unmatched'],
    default: 'unmatched'
  },
  lineMatchScore: {
    type: Number,
    min: 0,
    max: 1
  },
  mismatchReasons: [String]
});

// Main Match Record Schema
const matchRecordSchema = new mongoose.Schema({
  // Reference to invoice
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  invoiceNumber: String,
  
  // Matched documents
  matchedPurchaseOrders: [{
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder'
    },
    poNumber: String,
    poAmount: Number,
    matchContribution: Number // percentage of invoice matched to this PO
  }],
  
  matchedGRNs: [{
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoodsReceivedNote'
    },
    grnNumber: String,
    grnAmount: Number,
    receiptDate: Date
  }],
  
  matchedContracts: [{
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract'
    },
    contractNumber: String,
    contractType: String
  }],
  
  // Match configuration used
  matchType: {
    type: String,
    enum: ['2-way', '3-way', 'n-way', 'non-po', 'contract-based'],
    required: true
  },
  
  // Overall match results
  overallMatchStatus: {
    type: String,
    enum: ['auto_matched', 'manual_matched', 'partial_match', 'no_match', 'exception'],
    default: 'no_match'
  },
  
  overallMatchScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  
  // Tolerance settings used
  toleranceSettings: {
    priceVariancePercent: {
      type: Number,
      default: 2
    },
    quantityVariancePercent: {
      type: Number,
      default: 5
    },
    amountVarianceAbsolute: {
      type: Number,
      default: 10 // in currency units
    }
  },
  
  // Line-level matching details
  lineMatchDetails: [lineMatchDetailSchema],
  
  // Summary statistics
  matchSummary: {
    totalInvoiceLines: Number,
    matchedLines: Number,
    partialMatchLines: Number,
    unmatchedLines: Number,
    totalInvoiceAmount: Number,
    matchedAmount: Number,
    unmatchedAmount: Number
  },
  
  // Mismatch analysis
  mismatchReasons: [{
    reason: {
      type: String,
      enum: [
        'po_not_found',
        'grn_not_found',
        'quantity_mismatch',
        'price_mismatch',
        'description_mismatch',
        'amount_mismatch',
        'tax_mismatch',
        'currency_mismatch',
        'vendor_mismatch',
        'date_mismatch',
        'duplicate_invoice',
        'po_closed',
        'po_cancelled',
        'over_billed',
        'under_received',
        'no_receipt',
        'partial_receipt',
        'other'
      ]
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical']
    },
    description: String,
    affectedLines: [Number],
    suggestedAction: String
  }],
  
  // Auto-match eligibility
  autoMatchEligible: {
    type: Boolean,
    default: false
  },
  autoMatchBlockers: [String],
  
  // Suggested actions
  suggestedActions: [{
    action: {
      type: String,
      enum: [
        'approve',
        'reject',
        'request_credit_note',
        'adjust_quantity',
        'adjust_price',
        'split_invoice',
        'create_exception',
        'manual_review',
        'contact_vendor',
        'update_po',
        'create_grn'
      ]
    },
    description: String,
    confidence: Number,
    parameters: mongoose.Schema.Types.Mixed
  }],
  
  // Processing metadata
  matchingEngine: {
    type: String,
    default: 'ivms-matcher-v1'
  },
  matchingVersion: String,
  processingTimeMs: Number,
  
  // Manual overrides
  manualOverrides: [{
    field: String,
    originalValue: mongoose.Schema.Types.Mixed,
    overrideValue: mongoose.Schema.Types.Mixed,
    reason: String,
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    overriddenAt: Date
  }],
  
  // Review tracking
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  
  // Evidence for audit
  matchEvidence: {
    poSnapshots: [mongoose.Schema.Types.Mixed],
    grnSnapshots: [mongoose.Schema.Types.Mixed],
    algorithmDetails: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
matchRecordSchema.index({ invoiceId: 1 });
matchRecordSchema.index({ overallMatchStatus: 1 });
matchRecordSchema.index({ overallMatchScore: -1 });
matchRecordSchema.index({ 'matchedPurchaseOrders.poNumber': 1 });
matchRecordSchema.index({ createdAt: -1 });

// Methods
matchRecordSchema.methods.isWithinTolerance = function() {
  return this.overallMatchScore >= 0.95 && this.autoMatchEligible;
};

matchRecordSchema.methods.calculateMatchScore = function() {
  if (!this.lineMatchDetails || this.lineMatchDetails.length === 0) {
    return 0;
  }
  
  const totalScore = this.lineMatchDetails.reduce((sum, line) => {
    return sum + (line.lineMatchScore || 0);
  }, 0);
  
  return totalScore / this.lineMatchDetails.length;
};

matchRecordSchema.methods.addManualOverride = function(field, originalValue, overrideValue, reason, userId) {
  this.manualOverrides.push({
    field,
    originalValue,
    overrideValue,
    reason,
    overriddenBy: userId,
    overriddenAt: new Date()
  });
  return this.save();
};

// Static methods
matchRecordSchema.statics.findByInvoice = function(invoiceId) {
  return this.findOne({ invoiceId }).populate('reviewedBy', 'name email');
};

matchRecordSchema.statics.getMatchingStats = async function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$overallMatchStatus',
        count: { $sum: 1 },
        avgScore: { $avg: '$overallMatchScore' },
        totalAmount: { $sum: '$matchSummary.totalInvoiceAmount' }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        avgScore: { $round: ['$avgScore', 2] },
        totalAmount: 1,
        _id: 0
      }
    }
  ]);
};

module.exports = mongoose.model('MatchRecord', matchRecordSchema);
