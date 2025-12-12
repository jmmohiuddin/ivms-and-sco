const mongoose = require('mongoose');

const paymentInstructionSchema = new mongoose.Schema({
  // Reference to invoice
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  invoiceNumber: String,
  
  // Reference to approval
  approvalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceApproval'
  },
  
  // Vendor information
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true
  },
  vendorName: String,
  vendorTaxId: String,
  
  // Payment instruction number
  instructionNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Payment type
  paymentType: {
    type: String,
    enum: ['full', 'partial', 'advance', 'final', 'refund'],
    default: 'full'
  },
  
  // Amount details
  invoiceAmount: {
    type: Number,
    required: true
  },
  paymentAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  exchangeRate: Number,
  paymentAmountLocal: Number, // Amount in local currency if different
  
  // Deductions
  deductions: [{
    type: {
      type: String,
      enum: ['early_payment_discount', 'withholding_tax', 'penalty', 'credit_adjustment', 'other']
    },
    description: String,
    amount: Number,
    percentage: Number
  }],
  totalDeductions: {
    type: Number,
    default: 0
  },
  netPaymentAmount: Number,
  
  // Bank account details
  bankAccount: {
    bankName: String,
    bankCode: String,
    branchName: String,
    branchCode: String,
    accountName: String,
    accountNumber: String,
    accountType: {
      type: String,
      enum: ['checking', 'savings', 'business']
    },
    routingNumber: String,
    swiftCode: String,
    iban: String,
    bankAddress: String,
    intermediaryBank: {
      bankName: String,
      swiftCode: String,
      accountNumber: String
    }
  },
  
  // Bank account verification
  bankVerification: {
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verificationMethod: {
      type: String,
      enum: ['manual', 'micro_deposit', 'api', 'document']
    },
    lastVerificationDate: Date
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['ach', 'wire', 'swift', 'check', 'virtual_card', 'real_time', 'sepa', 'other'],
    required: true
  },
  
  // Payment scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  valueDate: Date, // Date funds will be available
  paymentWindow: {
    earliestDate: Date,
    latestDate: Date
  },
  
  // Early payment discount
  earlyPaymentDiscount: {
    eligible: {
      type: Boolean,
      default: false
    },
    discountPercent: Number,
    discountAmount: Number,
    discountDeadline: Date,
    applied: {
      type: Boolean,
      default: false
    }
  },
  
  // GL posting information
  glPosting: {
    ledgerAccount: String,
    costCenter: String,
    department: String,
    projectCode: String,
    postingDate: Date,
    fiscalPeriod: String,
    fiscalYear: Number
  },
  
  // Status
  status: {
    type: String,
    enum: [
      'draft',
      'pending_approval',
      'approved',
      'scheduled',
      'processing',
      'sent',
      'completed',
      'failed',
      'cancelled',
      'on_hold',
      'reversed'
    ],
    default: 'draft',
    index: true
  },
  
  // Processing status
  processingStatus: {
    submittedToBank: Boolean,
    submittedAt: Date,
    bankReference: String,
    bankResponse: mongoose.Schema.Types.Mixed,
    confirmationNumber: String,
    confirmedAt: Date,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0
    },
    lastRetryAt: Date
  },
  
  // Remittance information
  remittance: {
    format: {
      type: String,
      enum: ['pdf', 'email', 'edi', 'portal']
    },
    sentAt: Date,
    sentTo: String,
    referenceNumber: String,
    details: [{
      invoiceNumber: String,
      invoiceDate: Date,
      invoiceAmount: Number,
      paymentAmount: Number,
      discounts: Number,
      deductions: Number
    }]
  },
  
  // ERP integration
  erpIntegration: {
    erpSystem: String,
    erpReference: String,
    postedToERP: {
      type: Boolean,
      default: false
    },
    postedAt: Date,
    erpResponse: mongoose.Schema.Types.Mixed,
    journalEntryId: String
  },
  
  // Payment rail integration
  paymentRail: {
    provider: String, // e.g., 'stripe', 'plaid', 'wise', 'bank_api'
    externalId: String,
    trackingUrl: String,
    estimatedArrival: Date,
    actualArrival: Date
  },
  
  // Approval for payment
  paymentApproval: {
    required: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    approvalComments: String
  },
  
  // Hold information
  hold: {
    isOnHold: {
      type: Boolean,
      default: false
    },
    holdReason: String,
    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    heldAt: Date,
    releaseDate: Date,
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    releasedAt: Date
  },
  
  // Batch payment reference
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentBatch'
  },
  batchSequence: Number,
  
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
  
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ['scheduled', 'sent', 'completed', 'failed', 'remittance']
    },
    recipientType: {
      type: String,
      enum: ['vendor', 'internal', 'approver']
    },
    recipientEmail: String,
    sentAt: Date,
    status: String
  }],
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Indexes
paymentInstructionSchema.index({ vendorId: 1, status: 1 });
paymentInstructionSchema.index({ scheduledDate: 1, status: 1 });
paymentInstructionSchema.index({ batchId: 1 });
paymentInstructionSchema.index({ 'processingStatus.bankReference': 1 });
paymentInstructionSchema.index({ createdAt: -1 });

// Pre-save middleware
paymentInstructionSchema.pre('save', function(next) {
  // Generate instruction number if not set
  if (!this.instructionNumber) {
    this.instructionNumber = `PAY-${Date.now().toString(36).toUpperCase()}`;
  }
  
  // Calculate net payment amount
  this.netPaymentAmount = this.paymentAmount - (this.totalDeductions || 0);
  
  // Add to audit trail on status change
  if (this.isModified('status')) {
    this.auditTrail.push({
      action: `status_changed_to_${this.status}`,
      performedAt: new Date(),
      details: { newStatus: this.status }
    });
  }
  
  next();
});

// Methods
paymentInstructionSchema.methods.approve = function(userId, comments) {
  this.paymentApproval.required = true;
  this.paymentApproval.approvedBy = userId;
  this.paymentApproval.approvedAt = new Date();
  this.paymentApproval.approvalComments = comments;
  this.status = 'approved';
  
  this.auditTrail.push({
    action: 'payment_approved',
    performedBy: userId,
    performedAt: new Date(),
    details: { comments }
  });
  
  return this.save();
};

paymentInstructionSchema.methods.putOnHold = function(userId, reason, releaseDate = null) {
  this.hold.isOnHold = true;
  this.hold.holdReason = reason;
  this.hold.heldBy = userId;
  this.hold.heldAt = new Date();
  this.hold.releaseDate = releaseDate;
  this.status = 'on_hold';
  
  this.auditTrail.push({
    action: 'put_on_hold',
    performedBy: userId,
    performedAt: new Date(),
    details: { reason, releaseDate }
  });
  
  return this.save();
};

paymentInstructionSchema.methods.releaseHold = function(userId) {
  this.hold.isOnHold = false;
  this.hold.releasedBy = userId;
  this.hold.releasedAt = new Date();
  this.status = 'scheduled';
  
  this.auditTrail.push({
    action: 'hold_released',
    performedBy: userId,
    performedAt: new Date()
  });
  
  return this.save();
};

paymentInstructionSchema.methods.markAsCompleted = function(confirmationNumber, bankReference) {
  this.status = 'completed';
  this.processingStatus.confirmationNumber = confirmationNumber;
  this.processingStatus.bankReference = bankReference;
  this.processingStatus.confirmedAt = new Date();
  
  this.auditTrail.push({
    action: 'payment_completed',
    performedAt: new Date(),
    details: { confirmationNumber, bankReference }
  });
  
  return this.save();
};

paymentInstructionSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.processingStatus.failureReason = reason;
  this.processingStatus.retryCount += 1;
  this.processingStatus.lastRetryAt = new Date();
  
  this.auditTrail.push({
    action: 'payment_failed',
    performedAt: new Date(),
    details: { reason, retryCount: this.processingStatus.retryCount }
  });
  
  return this.save();
};

// Static methods
paymentInstructionSchema.statics.getScheduledPayments = function(startDate, endDate) {
  return this.find({
    scheduledDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['approved', 'scheduled'] }
  })
  .populate('vendorId', 'legalName businessName')
  .populate('invoiceId', 'invoiceNumber totalAmount')
  .sort({ scheduledDate: 1 });
};

paymentInstructionSchema.statics.getCashflowForecast = async function(days = 30) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.aggregate([
    {
      $match: {
        scheduledDate: { $gte: new Date(), $lte: endDate },
        status: { $in: ['approved', 'scheduled', 'processing'] }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$scheduledDate' }
        },
        totalAmount: { $sum: '$netPaymentAmount' },
        count: { $sum: 1 },
        payments: { $push: { id: '$_id', vendor: '$vendorName', amount: '$netPaymentAmount' } }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

paymentInstructionSchema.statics.getPaymentStats = async function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$netPaymentAmount' }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        totalAmount: 1,
        _id: 0
      }
    }
  ]);
};

module.exports = mongoose.model('PaymentInstruction', paymentInstructionSchema);
