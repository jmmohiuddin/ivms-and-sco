const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    required: true,
    unique: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  contractType: {
    type: String,
    required: true,
    enum: [
      'master-service-agreement',
      'purchase-agreement',
      'service-level-agreement',
      'non-disclosure-agreement',
      'licensing',
      'subscription',
      'maintenance',
      'consulting',
      'supply',
      'framework',
      'other'
    ]
  },
  // Contract Value
  totalValue: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentTerms: String,
  paymentSchedule: [{
    dueDate: Date,
    amount: Number,
    description: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    }
  }],
  // Dates
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  signedDate: Date,
  effectiveDate: Date,
  // Auto-renewal
  autoRenewal: {
    type: Boolean,
    default: false
  },
  renewalTerms: String,
  renewalNoticePeriod: Number, // days
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending-approval', 'pending-signature', 'active', 'suspended', 'expired', 'terminated', 'renewed'],
    default: 'draft'
  },
  // Signatories
  internalSignatory: {
    name: String,
    title: String,
    email: String,
    signedAt: Date
  },
  vendorSignatory: {
    name: String,
    title: String,
    email: String,
    signedAt: Date
  },
  // Terms and Conditions
  keyTerms: [{
    term: String,
    description: String,
    category: String
  }],
  obligations: {
    vendor: [String],
    company: [String]
  },
  deliverables: [{
    description: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'delayed'],
      default: 'pending'
    }
  }],
  // Risk and Compliance
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  riskAssessment: {
    score: Number,
    factors: [String],
    mitigations: [String],
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assessedAt: Date
  },
  complianceRequirements: [String],
  // NLP Analysis
  nlpAnalysis: {
    processed: Boolean,
    processedAt: Date,
    extractedClauses: [{
      type: String,
      content: String,
      importance: String,
      riskIndicator: Boolean
    }],
    keyEntities: [{
      entity: String,
      type: String,
      context: String
    }],
    riskClauses: [{
      clause: String,
      riskType: String,
      severity: String,
      recommendation: String
    }],
    summary: String,
    sentiment: String,
    complianceGaps: [String]
  },
  // Documents
  documentUrl: String,
  documentHash: String,
  relatedDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  // Amendments
  amendments: [{
    amendmentNumber: String,
    date: Date,
    description: String,
    changedTerms: [String],
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    documentUrl: String
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
  // Approval Workflow
  approvalWorkflow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedAt: Date,
    comments: String
  }],
  notes: String,
  internalNotes: String,
  tags: [String]
}, {
  timestamps: true
});

// Indexes
contractSchema.index({ vendor: 1, status: 1 });
contractSchema.index({ endDate: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ contractType: 1 });
contractSchema.index({ 'nlpAnalysis.processed': 1 });

// Virtual for contract duration
contractSchema.virtual('durationDays').get(function() {
  if (!this.startDate || !this.endDate) return null;
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for days remaining
contractSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return null;
  return Math.max(0, Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24)));
});

module.exports = mongoose.model('Contract', contractSchema);
