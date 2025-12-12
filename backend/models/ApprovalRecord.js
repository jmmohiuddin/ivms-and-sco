const mongoose = require('mongoose');

const approvalRecordSchema = new mongoose.Schema({
  // Ownership
  onboardingCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingCase',
    required: true
  },
  vendorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true
  },
  
  // Approval Type
  approvalType: {
    type: String,
    enum: [
      'initial_review', 'document_approval', 'compliance_approval',
      'financial_approval', 'final_approval', 'exception_approval',
      'override_approval', 'reactivation_approval'
    ],
    required: true
  },
  
  // Approver Information
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approverRole: String,
  approverDepartment: String,
  delegatedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Decision
  decision: {
    type: String,
    enum: ['approved', 'rejected', 'conditional', 'deferred', 'escalated'],
    required: true
  },
  
  // Reasoning
  reason: String,
  reasonCode: String,
  conditions: [{
    condition: String,
    dueDate: Date,
    met: Boolean,
    metAt: Date
  }],
  
  // Context
  riskScoreAtDecision: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RiskScore'
  },
  riskTierAtDecision: String,
  documentsReviewed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingDocument'
  }],
  
  // Timing
  requestedAt: {
    type: Date,
    required: true
  },
  decidedAt: {
    type: Date,
    required: true
  },
  responseTime: Number, // in minutes
  slaBreached: {
    type: Boolean,
    default: false
  },
  
  // Approval Chain
  approvalLevel: Number, // 1, 2, 3 etc.
  nextApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  previousApproval: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalRecord'
  },
  
  // Automated vs Manual
  isAutomated: {
    type: Boolean,
    default: false
  },
  automationRule: String,
  
  // Override Information
  isOverride: {
    type: Boolean,
    default: false
  },
  overrideJustification: String,
  overrideApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Signature/Attestation
  attestation: {
    attested: Boolean,
    attestedAt: Date,
    attestationText: String,
    ipAddress: String,
    userAgent: String
  },
  
  // Evidence
  supportingDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingDocument'
  }],
  notes: String,
  
  // Immutable Hash for Audit
  recordHash: String,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
approvalRecordSchema.index({ onboardingCase: 1, createdAt: -1 });
approvalRecordSchema.index({ vendorProfile: 1 });
approvalRecordSchema.index({ approver: 1, decidedAt: -1 });
approvalRecordSchema.index({ decision: 1 });
approvalRecordSchema.index({ approvalType: 1 });
approvalRecordSchema.index({ createdAt: -1 });

// Virtual for is approved
approvalRecordSchema.virtual('isApproved').get(function() {
  return this.decision === 'approved' || this.decision === 'conditional';
});

// Pre-save hook to calculate response time and generate hash
approvalRecordSchema.pre('save', function(next) {
  if (this.requestedAt && this.decidedAt) {
    this.responseTime = Math.round((this.decidedAt - this.requestedAt) / (1000 * 60));
  }
  
  // Generate hash for immutability verification
  if (this.isNew) {
    const crypto = require('crypto');
    const hashData = JSON.stringify({
      onboardingCase: this.onboardingCase,
      approver: this.approver,
      decision: this.decision,
      decidedAt: this.decidedAt,
      reason: this.reason
    });
    this.recordHash = crypto.createHash('sha256').update(hashData).digest('hex');
  }
  
  next();
});

module.exports = mongoose.model('ApprovalRecord', approvalRecordSchema);
