const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentReference: {
    type: String,
    required: true,
    unique: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: [
      'bank-transfer',
      'wire-transfer',
      'check',
      'credit-card',
      'ach',
      'paypal',
      'virtual-card',
      'other'
    ]
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  scheduledDate: Date,
  status: {
    type: String,
    enum: ['scheduled', 'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  // Bank Details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    swiftCode: String,
    iban: String
  },
  // Transaction Details
  transactionId: String,
  externalReference: String,
  confirmationNumber: String,
  // Processing
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  // Approval
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvalStatus: {
    type: String,
    enum: ['not-required', 'pending', 'approved', 'rejected'],
    default: 'not-required'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalNotes: String,
  // Fraud Detection
  fraudScore: {
    type: Number,
    min: 0,
    max: 100
  },
  fraudFlags: [{
    flag: String,
    description: String,
    severity: String,
    detectedAt: Date
  }],
  // Reconciliation
  reconciled: {
    type: Boolean,
    default: false
  },
  reconciledAt: Date,
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reconciliationNotes: String,
  // Fees
  fees: {
    processingFee: {
      type: Number,
      default: 0
    },
    currencyConversionFee: {
      type: Number,
      default: 0
    },
    otherFees: {
      type: Number,
      default: 0
    }
  },
  netAmount: Number,
  // Exchange Rate (for international payments)
  exchangeRate: Number,
  originalCurrency: String,
  originalAmount: Number,
  // Documents
  receiptUrl: String,
  supportingDocuments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],
  // History
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
  notes: String,
  internalNotes: String,
  // Refund Details (if applicable)
  refund: {
    reason: String,
    refundedAmount: Number,
    refundedAt: Date,
    refundReference: String
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ vendor: 1, paymentDate: -1 });
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ fraudScore: 1 });

// Pre-save to calculate net amount
paymentSchema.pre('save', function(next) {
  const totalFees = (this.fees?.processingFee || 0) + 
                    (this.fees?.currencyConversionFee || 0) + 
                    (this.fees?.otherFees || 0);
  this.netAmount = this.amount - totalFees;
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
