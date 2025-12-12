const mongoose = require('mongoose');

// Enhanced Line Item Schema with matching support
const lineItemSchema = new mongoose.Schema({
  lineNumber: {
    type: Number,
    required: true
  },
  sku: {
    type: String,
    trim: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitOfMeasure: {
    type: String,
    default: 'EA'
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  lineTotal: {
    type: Number,
    required: true
  },
  lineTax: {
    type: Number,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0
  },
  glCode: String,
  costCenter: String,
  projectCode: String,
  matchedPOLineId: mongoose.Schema.Types.ObjectId,
  matchedGRNLineId: mongoose.Schema.Types.ObjectId,
  matchStatus: {
    type: String,
    enum: ['unmatched', 'matched', 'partial', 'mismatch'],
    default: 'unmatched'
  },
  matchConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  extractionConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  boundingBox: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    page: Number
  }
});

// Extracted field schema for OCR results
const extractedFieldSchema = new mongoose.Schema({
  fieldName: {
    type: String,
    required: true
  },
  value: mongoose.Schema.Types.Mixed,
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  boundingBox: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    page: Number
  },
  extractionMethod: {
    type: String,
    enum: ['ocr', 'template', 'ml', 'manual'],
    default: 'ocr'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Bank details schema with fraud detection
const bankDetailsSchema = new mongoose.Schema({
  bankName: String,
  accountName: String,
  accountNumber: String,
  routingNumber: String,
  swiftCode: String,
  iban: String,
  verified: {
    type: Boolean,
    default: false
  },
  changeDetected: {
    type: Boolean,
    default: false
  },
  previousAccountHash: String
});

const invoiceSchema = new mongoose.Schema({
  // Core identification
  invoiceNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    index: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  vendorName: String,
  vendorTaxId: String,
  
  // Dates
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  processedDate: Date,
  approvedDate: Date,
  paidAt: Date,
  
  // Financial details
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  shippingAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  
  // Payment terms
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net15', 'net30', 'net45', 'net60', 'net90', 'due_on_receipt', '2_10_net30', 'custom'],
    default: 'net30'
  },
  paymentTermsDays: {
    type: Number,
    default: 30
  },
  earlyPaymentDiscount: {
    discountPercent: Number,
    discountDays: Number,
    discountAmount: Number
  },
  
  // Line items (enhanced)
  items: [lineItemSchema],
  
  // Extracted fields with confidence
  extractedFields: [extractedFieldSchema],
  overallExtractionConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Source & files
  source: {
    type: String,
    enum: ['portal', 'email', 'api', 'edi', 'sftp', 'mobile', 'scan', 'manual'],
    default: 'manual'
  },
  sourceReference: String,
  rawFiles: [{
    fileName: String,
    filePath: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    pageCount: Number,
    ocrProcessed: {
      type: Boolean,
      default: false
    },
    extractedText: String
  }],
  documentUrl: String,
  documentHash: String,
  
  // Invoice type & classification
  invoiceType: {
    type: String,
    enum: ['standard', 'credit_memo', 'debit_memo', 'proforma', 'recurring', 'prepayment', 'final'],
    default: 'standard'
  },
  category: {
    type: String,
    enum: ['goods', 'services', 'mixed', 'subscription', 'utilities', 'travel', 'other'],
    default: 'goods'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']
    },
    nextExpectedDate: Date,
    autoApprove: Boolean
  },
  
  // PO & matching
  hasPO: {
    type: Boolean,
    default: false
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  purchaseOrderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  }],
  purchaseOrderNumbers: [String],
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  
  // GL & coding
  glAccount: String,
  costCenter: String,
  department: String,
  projectCode: String,
  codingSuggestions: [{
    glAccount: String,
    costCenter: String,
    confidence: Number,
    reason: String
  }],
  codingMethod: {
    type: String,
    enum: ['manual', 'auto', 'suggested', 'historical'],
    default: 'manual'
  },
  
  // Bank details
  bankDetails: bankDetailsSchema,
  
  // Tax information
  taxDetails: {
    taxType: {
      type: String,
      enum: ['VAT', 'GST', 'SALES_TAX', 'NONE', 'MIXED']
    },
    taxRate: Number,
    taxId: String,
    taxIdValid: Boolean,
    taxCalculationCorrect: Boolean,
    taxJurisdiction: String,
    withholdingTax: Number
  },
  
  // Status & workflow
  status: {
    type: String,
    enum: [
      'draft', 'submitted', 'processing', 'extracted', 'matching',
      'matched', 'pending_review', 'pending_approval', 'approved',
      'rejected', 'on_hold', 'exception', 'scheduled', 'paid',
      'partial', 'cancelled', 'disputed', 'archived'
    ],
    default: 'pending_review',
    index: true
  },
  subStatus: String,
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'scheduled'],
    default: 'unpaid'
  },
  
  // OCR and Validation (legacy support)
  validationStatus: {
    type: String,
    enum: ['pending', 'validated', 'failed', 'manual-review'],
    default: 'pending'
  },
  ocrProcessed: {
    type: Boolean,
    default: false
  },
  ocrData: {
    rawText: String,
    extractedFields: mongoose.Schema.Types.Mixed,
    confidence: Number,
    processedAt: Date
  },
  
  // Matching
  matchType: {
    type: String,
    enum: ['2-way', '3-way', 'n-way', 'non-po'],
    default: '3-way'
  },
  matchStatus: {
    type: String,
    enum: ['unmatched', 'auto_matched', 'manual_matched', 'partial_match', 'no_match', 'exception'],
    default: 'unmatched'
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 1
  },
  matchRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatchRecord'
  },
  
  // Fraud Detection
  fraudScore: {
    type: Number,
    min: 0,
    max: 100
  },
  fraudFlags: [{
    flag: String,
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    detectedAt: Date
  }],
  
  // Flags & checks
  flags: {
    isDuplicate: {
      type: Boolean,
      default: false
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    duplicateConfidence: Number,
    isFraudSuspect: {
      type: Boolean,
      default: false
    },
    fraudReasons: [String],
    hasAnomaly: {
      type: Boolean,
      default: false
    },
    anomalyReasons: [String],
    bankAccountChanged: {
      type: Boolean,
      default: false
    },
    requiresManualReview: {
      type: Boolean,
      default: false
    },
    reviewReasons: [String],
    isUrgent: {
      type: Boolean,
      default: false
    },
    isHighValue: {
      type: Boolean,
      default: false
    }
  },
  
  // Flagging (legacy support)
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  flaggedAt: Date,
  
  // Approval
  approvalRequired: {
    type: Boolean,
    default: true
  },
  autoApproved: {
    type: Boolean,
    default: false
  },
  approvalThreshold: Number,
  currentApprovalStep: {
    type: Number,
    default: 0
  },
  totalApprovalSteps: {
    type: Number,
    default: 1
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  
  // SLA tracking
  sla: {
    processingDeadline: Date,
    approvalDeadline: Date,
    paymentDeadline: Date,
    isBreached: {
      type: Boolean,
      default: false
    },
    breachType: String,
    escalatedAt: Date,
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Processing metrics
  processingMetrics: {
    extractionTime: Number,
    matchingTime: Number,
    totalProcessingTime: Number,
    humanTouchCount: {
      type: Number,
      default: 0
    },
    automationScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // Comments & notes
  notes: String,
  internalNotes: String,
  vendorNotes: String,
  comments: [{
    comment: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: true
    }
  }],
  
  // Dispute handling
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    disputeReason: String,
    disputedAt: Date,
    disputedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    disputeResolution: String,
    resolvedAt: Date
  },
  
  // ERP integration
  erpReference: String,
  erpPostingDate: Date,
  erpPostingStatus: {
    type: String,
    enum: ['pending', 'posted', 'failed', 'reversed']
  },
  
  // Status History
  statusHistory: [{
    status: String,
    notes: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Audit trail
  auditTrail: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String
  }],
  
  // Evidence bundle reference
  evidenceBundleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvidenceBundle'
  },
  
  // Exception handling
  exceptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceException'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
invoiceSchema.index({ vendor: 1, invoiceDate: -1 });
invoiceSchema.index({ vendorId: 1, invoiceNumber: 1 });
invoiceSchema.index({ status: 1, receivedDate: -1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ fraudScore: 1 });
invoiceSchema.index({ 'flags.isDuplicate': 1 });
invoiceSchema.index({ 'flags.isFraudSuspect': 1 });
invoiceSchema.index({ assignedTo: 1, status: 1 });
invoiceSchema.index({ totalAmount: 1 });

// Virtual for days until due
invoiceSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const today = new Date();
  const diffTime = this.dueDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for aging bucket
invoiceSchema.virtual('agingBucket').get(function() {
  const days = this.daysUntilDue;
  if (days === null) return 'unknown';
  if (days > 30) return 'not_due';
  if (days > 0) return 'current';
  if (days >= -30) return '1-30_days';
  if (days >= -60) return '31-60_days';
  if (days >= -90) return '61-90_days';
  return '90+_days';
});

// Pre-save middleware
invoiceSchema.pre('save', function(next) {
  // Calculate balance
  this.balance = this.totalAmount - this.amountPaid;
  
  // Set high value flag
  if (this.totalAmount > 50000) {
    this.flags = this.flags || {};
    this.flags.isHighValue = true;
  }
  
  // Add to audit trail on status change
  if (this.isModified('status')) {
    this.auditTrail = this.auditTrail || [];
    this.auditTrail.push({
      action: `status_changed_to_${this.status}`,
      performedAt: new Date(),
      details: { newStatus: this.status }
    });
  }
  
  next();
});

// Methods
invoiceSchema.methods.addAuditEntry = function(action, userId, details, ipAddress) {
  this.auditTrail = this.auditTrail || [];
  this.auditTrail.push({
    action,
    performedBy: userId,
    performedAt: new Date(),
    details,
    ipAddress
  });
  return this.save();
};

invoiceSchema.methods.calculateTotals = function() {
  let subtotal = 0;
  let taxAmount = 0;
  
  this.items.forEach(item => {
    subtotal += item.lineTotal || (item.quantity * item.unitPrice);
    taxAmount += item.lineTax || 0;
  });
  
  this.subtotal = subtotal;
  this.taxAmount = taxAmount;
  this.totalAmount = subtotal + taxAmount + (this.shippingAmount || 0) - (this.discountAmount || 0);
  this.balance = this.totalAmount - this.amountPaid;
  
  return this;
};

// Static methods
invoiceSchema.statics.findDuplicates = async function(vendorId, invoiceNumber, totalAmount, invoiceDate) {
  const dateRange = new Date(invoiceDate);
  const startDate = new Date(dateRange);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(invoiceDate);
  endDate.setDate(endDate.getDate() + 7);
  
  return this.find({
    $or: [
      { vendorId, invoiceNumber },
      { vendor: vendorId, invoiceNumber },
      {
        $or: [{ vendorId }, { vendor: vendorId }],
        totalAmount: { $gte: totalAmount * 0.99, $lte: totalAmount * 1.01 },
        invoiceDate: { $gte: startDate, $lte: endDate }
      }
    ]
  });
};

invoiceSchema.statics.getAgingReport = async function(vendorId = null) {
  const match = { status: { $nin: ['paid', 'cancelled', 'archived'] } };
  if (vendorId) {
    match.$or = [{ vendorId }, { vendor: vendorId }];
  }
  
  return this.aggregate([
    { $match: match },
    {
      $addFields: {
        daysOverdue: {
          $divide: [
            { $subtract: [new Date(), '$dueDate'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $bucket: {
        groupBy: '$daysOverdue',
        boundaries: [-Infinity, 0, 30, 60, 90, Infinity],
        default: 'unknown',
        output: {
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          invoices: { $push: { id: '$_id', invoiceNumber: '$invoiceNumber', amount: '$totalAmount' } }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Invoice', invoiceSchema);
