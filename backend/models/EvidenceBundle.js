const mongoose = require('mongoose');

const evidenceBundleSchema = new mongoose.Schema({
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
  
  // Bundle Identification
  bundleNumber: {
    type: String,
    unique: true,
    required: true
  },
  bundleType: {
    type: String,
    enum: ['onboarding_complete', 'audit_export', 'compliance_review', 'investigation', 'periodic_review'],
    default: 'onboarding_complete'
  },
  
  // Status
  status: {
    type: String,
    enum: ['generating', 'complete', 'failed', 'archived'],
    default: 'generating'
  },
  
  // Snapshot of Vendor Data
  vendorDataSnapshot: {
    legalName: String,
    dbaName: String,
    registrationNumber: String,
    addresses: [mongoose.Schema.Types.Mixed],
    taxIds: [mongoose.Schema.Types.Mixed],
    bankAccounts: [mongoose.Schema.Types.Mixed],
    classifications: [mongoose.Schema.Types.Mixed],
    contacts: [mongoose.Schema.Types.Mixed],
    snapshotAt: Date
  },
  
  // Documents Included
  documents: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OnboardingDocument'
    },
    documentType: String,
    originalFileName: String,
    fileHash: String,
    verificationStatus: String,
    extractedDataSnapshot: mongoose.Schema.Types.Mixed,
    includedAt: Date
  }],
  
  // Risk Assessment
  riskAssessment: {
    riskScoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiskScore'
    },
    overallScore: Number,
    riskTier: String,
    componentScores: mongoose.Schema.Types.Mixed,
    topRiskFactors: [mongoose.Schema.Types.Mixed],
    assessedAt: Date
  },
  
  // Verification Results
  verificationResults: {
    sanctions: {
      status: String,
      checkedAt: Date,
      provider: String,
      results: mongoose.Schema.Types.Mixed
    },
    businessRegistry: {
      status: String,
      checkedAt: Date,
      provider: String,
      results: mongoose.Schema.Types.Mixed
    },
    bankAccount: {
      status: String,
      verifiedAt: Date,
      method: String
    },
    identity: {
      status: String,
      verifiedAt: Date,
      method: String
    }
  },
  
  // Approval Chain
  approvals: [{
    approvalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalRecord'
    },
    approvalType: String,
    approver: String,
    approverRole: String,
    decision: String,
    reason: String,
    decidedAt: Date
  }],
  
  // Complete Timeline/History
  timeline: [{
    action: String,
    description: String,
    performedBy: String,
    performedByType: String,
    timestamp: Date,
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Final Decision
  finalDecision: {
    decision: String,
    decidedBy: String,
    decidedAt: Date,
    reason: String,
    conditions: [String]
  },
  
  // Bundle Integrity
  bundleHash: {
    type: String,
    required: true
  },
  hashAlgorithm: {
    type: String,
    default: 'SHA-256'
  },
  
  // Export Information
  exportedFiles: [{
    format: {
      type: String,
      enum: ['pdf', 'json', 'zip']
    },
    fileName: String,
    filePath: String,
    fileUrl: String,
    fileSize: Number,
    generatedAt: Date,
    expiresAt: Date
  }],
  
  // Retention
  retentionPolicy: {
    type: String,
    default: 'standard'
  },
  retainUntil: Date,
  
  // Access Log
  accessLog: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['viewed', 'downloaded', 'shared']
    },
    timestamp: Date,
    ipAddress: String,
    userAgent: String
  }],
  
  // Metadata
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  generatedAt: Date,
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
evidenceBundleSchema.index({ bundleNumber: 1 });
evidenceBundleSchema.index({ onboardingCase: 1 });
evidenceBundleSchema.index({ vendorProfile: 1 });
evidenceBundleSchema.index({ status: 1 });
evidenceBundleSchema.index({ createdAt: -1 });

// Static method to generate bundle number
evidenceBundleSchema.statics.generateBundleNumber = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  const lastBundle = await this.findOne({
    bundleNumber: new RegExp(`^EVB-${year}${month}${day}`)
  }).sort({ bundleNumber: -1 });
  
  let sequence = 1;
  if (lastBundle) {
    const lastSequence = parseInt(lastBundle.bundleNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  return `EVB-${year}${month}${day}-${sequence.toString().padStart(4, '0')}`;
};

// Method to calculate and set bundle hash
evidenceBundleSchema.methods.calculateBundleHash = function() {
  const crypto = require('crypto');
  
  const hashData = JSON.stringify({
    bundleNumber: this.bundleNumber,
    vendorDataSnapshot: this.vendorDataSnapshot,
    documents: this.documents.map(d => ({
      documentId: d.documentId,
      fileHash: d.fileHash
    })),
    riskAssessment: {
      overallScore: this.riskAssessment?.overallScore,
      riskTier: this.riskAssessment?.riskTier
    },
    approvals: this.approvals.map(a => ({
      approvalType: a.approvalType,
      decision: a.decision,
      decidedAt: a.decidedAt
    })),
    finalDecision: this.finalDecision,
    generatedAt: this.generatedAt
  });
  
  this.bundleHash = crypto.createHash('sha256').update(hashData).digest('hex');
  return this.bundleHash;
};

// Method to verify bundle integrity
evidenceBundleSchema.methods.verifyIntegrity = function() {
  const currentHash = this.bundleHash;
  this.calculateBundleHash();
  return currentHash === this.bundleHash;
};

// Method to add access log entry
evidenceBundleSchema.methods.logAccess = function(userId, action, ipAddress, userAgent) {
  this.accessLog.push({
    userId,
    action,
    timestamp: new Date(),
    ipAddress,
    userAgent
  });
};

// Pre-save hook
evidenceBundleSchema.pre('save', async function(next) {
  if (this.isNew) {
    if (!this.bundleNumber) {
      this.bundleNumber = await this.constructor.generateBundleNumber();
    }
    this.generatedAt = new Date();
    this.calculateBundleHash();
  }
  next();
});

module.exports = mongoose.model('EvidenceBundle', evidenceBundleSchema);
