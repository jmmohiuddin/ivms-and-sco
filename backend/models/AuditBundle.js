/**
 * Audit Bundle Model
 * Immutable snapshots for audit-ready evidence packages
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const auditBundleSchema = new mongoose.Schema({
  // Bundle Identification
  bundleId: {
    type: String,
    required: true,
    unique: true,
    default: () => `AUD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`
  },
  
  // Bundle Type & Purpose
  bundleType: {
    type: String,
    required: true,
    enum: [
      'vendor_compliance_snapshot', 'remediation_case_evidence',
      'policy_enforcement_record', 'periodic_audit', 'ad_hoc_export',
      'regulatory_submission', 'due_diligence_package', 'incident_report'
    ]
  },
  purpose: String,
  
  // Subject Entity
  subject: {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorName: String,
    complianceProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorComplianceProfile' },
    remediationCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'RemediationCase' },
    policyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PolicyRule' }]
  },
  
  // Time Range
  timeRange: {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    snapshotAt: { type: Date, default: Date.now }
  },
  
  // Compliance Profile Snapshot
  complianceSnapshot: {
    tier: String,
    compositeScore: Number,
    scoreTrend: String,
    scoreFactors: [{
      name: String,
      weight: Number,
      score: Number,
      contribution: Number
    }],
    compliancePercentage: Number,
    attributes: [{
      name: String,
      status: String,
      issueDate: Date,
      expiryDate: Date,
      verificationMethod: String,
      confidence: Number,
      extractedData: mongoose.Schema.Types.Mixed
    }],
    sanctionsStatus: {
      status: String,
      lastCheckAt: Date,
      matchCount: Number
    },
    adverseMediaStatus: {
      status: String,
      lastCheckAt: Date,
      alertCount: Number
    },
    workflowStatus: String,
    restrictions: [String]
  },
  
  // Documents & Evidence
  artifacts: [{
    artifactId: {
      type: String,
      default: () => `ART-${Math.random().toString(36).substr(2, 9)}`
    },
    artifactType: {
      type: String,
      enum: [
        'document', 'certificate', 'screenshot', 'report',
        'email', 'log_export', 'api_response', 'signature',
        'decision_record', 'timeline', 'risk_assessment'
      ]
    },
    name: String,
    description: String,
    category: String, // certification, insurance, kyc, etc.
    
    // File Reference
    file: {
      storageRef: String, // S3/storage path
      fileName: String,
      fileType: String,
      fileSize: Number,
      checksum: String, // SHA-256
      checksumAlgorithm: { type: String, default: 'SHA-256' }
    },
    
    // For inline data (small items)
    inlineData: mongoose.Schema.Types.Mixed,
    
    // Metadata
    originalDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    capturedAt: Date,
    source: String,
    extractedFields: mongoose.Schema.Types.Mixed,
    
    // Verification
    verified: Boolean,
    verifiedBy: String,
    verifiedAt: Date,
    verificationNotes: String
  }],
  
  // Events & Timeline
  events: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceEvent' },
    eventType: String,
    occurredAt: Date,
    severity: String,
    summary: String,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Decisions & Actions
  decisions: [{
    decisionId: String,
    decisionType: {
      type: String,
      enum: ['approval', 'rejection', 'escalation', 'override', 'exception', 'enforcement']
    },
    madeBy: String,
    madeAt: Date,
    decision: String,
    rationale: String,
    evidence: [String], // References to artifacts
    approvals: [{
      approver: String,
      approvedAt: Date,
      comments: String
    }]
  }],
  
  // Policy Evaluation Results
  policyEvaluations: [{
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyRule' },
    policyCode: String,
    policyName: String,
    evaluatedAt: Date,
    result: { type: String, enum: ['pass', 'fail', 'not_applicable'] },
    findings: [String],
    enforcementActions: [String]
  }],
  
  // Remediation Summary
  remediationSummary: {
    totalCases: Number,
    resolvedCases: Number,
    openCases: Number,
    averageResolutionTime: Number,
    cases: [{
      caseNumber: String,
      caseType: String,
      severity: String,
      status: String,
      resolution: String,
      openedAt: Date,
      resolvedAt: Date
    }]
  },
  
  // Risk Summary
  riskSummary: {
    overallRiskLevel: String,
    riskTrend: String,
    keyRisks: [{
      riskType: String,
      severity: String,
      description: String,
      mitigationStatus: String
    }],
    exposureAmount: Number,
    currency: String
  },
  
  // Bundle Integrity
  integrity: {
    checksum: String, // SHA-256 of entire bundle content
    checksumAlgorithm: { type: String, default: 'SHA-256' },
    signedBy: String,
    signedAt: Date,
    signature: String,
    certificateRef: String,
    tamperEvident: { type: Boolean, default: true }
  },
  
  // Generation Metadata
  generation: {
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, default: Date.now },
    generationMethod: {
      type: String,
      enum: ['manual', 'scheduled', 'triggered', 'api']
    },
    triggerEvent: String,
    generationDuration: Number, // milliseconds
    artifactCount: Number,
    totalSize: Number // bytes
  },
  
  // Access Control
  access: {
    visibility: {
      type: String,
      enum: ['private', 'internal', 'restricted', 'auditors'],
      default: 'restricted'
    },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    allowedRoles: [String],
    accessLog: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      accessedAt: Date,
      action: { type: String, enum: ['view', 'download', 'export'] },
      ipAddress: String
    }]
  },
  
  // Export & Distribution
  exports: [{
    exportId: String,
    format: { type: String, enum: ['pdf', 'zip', 'json', 'worm'] },
    exportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    exportedAt: Date,
    destination: String, // email, download, storage path
    deliveryStatus: String,
    expiresAt: Date
  }],
  
  // Retention & Lifecycle
  retention: {
    policy: String,
    retainUntil: Date,
    deleteAfter: Date,
    legalHold: { type: Boolean, default: false },
    legalHoldReason: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['generating', 'complete', 'failed', 'archived', 'deleted'],
    default: 'generating'
  },
  errorDetails: String,
  
  // Metadata
  tags: [String],
  notes: String,
  externalRef: String, // Reference to external audit system
  
  // Immutability flag
  isSealed: { type: Boolean, default: false },
  sealedAt: Date,
  sealedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes
auditBundleSchema.index({ bundleId: 1 }, { unique: true });
auditBundleSchema.index({ 'subject.vendorId': 1 });
auditBundleSchema.index({ bundleType: 1 });
auditBundleSchema.index({ status: 1 });
auditBundleSchema.index({ 'generation.generatedAt': -1 });
auditBundleSchema.index({ 'retention.retainUntil': 1 });

// Pre-save middleware to calculate checksum
auditBundleSchema.pre('save', function(next) {
  if (this.isModified() && !this.isSealed) {
    // Calculate bundle checksum
    const content = JSON.stringify({
      subject: this.subject,
      complianceSnapshot: this.complianceSnapshot,
      artifacts: this.artifacts.map(a => ({ id: a.artifactId, checksum: a.file?.checksum })),
      events: this.events,
      decisions: this.decisions,
      policyEvaluations: this.policyEvaluations,
      timeRange: this.timeRange
    });
    
    this.integrity.checksum = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }
  next();
});

// Methods
auditBundleSchema.methods.seal = function(sealedBy) {
  if (this.isSealed) {
    throw new Error('Bundle is already sealed');
  }
  
  this.isSealed = true;
  this.sealedAt = new Date();
  this.sealedBy = sealedBy;
  this.status = 'complete';
  
  return this.save();
};

auditBundleSchema.methods.verifyIntegrity = function() {
  const content = JSON.stringify({
    subject: this.subject,
    complianceSnapshot: this.complianceSnapshot,
    artifacts: this.artifacts.map(a => ({ id: a.artifactId, checksum: a.file?.checksum })),
    events: this.events,
    decisions: this.decisions,
    policyEvaluations: this.policyEvaluations,
    timeRange: this.timeRange
  });
  
  const calculatedChecksum = crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
  
  return {
    isValid: calculatedChecksum === this.integrity.checksum,
    storedChecksum: this.integrity.checksum,
    calculatedChecksum
  };
};

auditBundleSchema.methods.addArtifact = function(artifact) {
  if (this.isSealed) {
    throw new Error('Cannot modify sealed bundle');
  }
  
  // Calculate file checksum if file data provided
  if (artifact.fileData) {
    artifact.file.checksum = crypto
      .createHash('sha256')
      .update(artifact.fileData)
      .digest('hex');
  }
  
  this.artifacts.push(artifact);
  return this;
};

auditBundleSchema.methods.logAccess = function(userId, action, ipAddress) {
  this.access.accessLog.push({
    userId,
    accessedAt: new Date(),
    action,
    ipAddress
  });
  
  // Keep only last 1000 access entries
  if (this.access.accessLog.length > 1000) {
    this.access.accessLog = this.access.accessLog.slice(-1000);
  }
  
  return this.save();
};

// Statics
auditBundleSchema.statics.createVendorSnapshot = async function(vendorId, complianceProfile, options = {}) {
  const bundle = new this({
    bundleType: 'vendor_compliance_snapshot',
    purpose: options.purpose || 'Periodic compliance snapshot',
    subject: {
      vendorId,
      vendorName: options.vendorName,
      complianceProfileId: complianceProfile._id
    },
    timeRange: {
      from: options.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: options.to || new Date(),
      snapshotAt: new Date()
    },
    complianceSnapshot: {
      tier: complianceProfile.tier,
      compositeScore: complianceProfile.compositeScore?.value,
      scoreTrend: complianceProfile.compositeScore?.trend,
      scoreFactors: complianceProfile.compositeScore?.factors,
      compliancePercentage: complianceProfile.calculateCompliancePercentage(),
      attributes: complianceProfile.complianceAttributes.map(a => ({
        name: a.name,
        status: a.status,
        issueDate: a.issueDate,
        expiryDate: a.expiryDate,
        verificationMethod: a.verification?.method,
        confidence: a.verification?.confidence,
        extractedData: a.extractedData
      })),
      sanctionsStatus: {
        status: complianceProfile.sanctionsStatus?.status,
        lastCheckAt: complianceProfile.sanctionsStatus?.lastCheckAt,
        matchCount: complianceProfile.sanctionsStatus?.matches?.length
      },
      adverseMediaStatus: {
        status: complianceProfile.adverseMediaStatus?.status,
        lastCheckAt: complianceProfile.adverseMediaStatus?.lastCheckAt,
        alertCount: complianceProfile.adverseMediaStatus?.alerts?.length
      },
      workflowStatus: complianceProfile.workflowStatus?.currentAction,
      restrictions: complianceProfile.workflowStatus?.restrictions?.map(r => r.type)
    },
    generation: {
      generatedBy: options.generatedBy,
      generationMethod: options.method || 'manual'
    }
  });
  
  return bundle.save();
};

auditBundleSchema.statics.getBundlesForVendor = function(vendorId) {
  return this.find({
    'subject.vendorId': vendorId,
    status: { $ne: 'deleted' }
  }).sort({ 'generation.generatedAt': -1 });
};

module.exports = mongoose.model('AuditBundle', auditBundleSchema);
