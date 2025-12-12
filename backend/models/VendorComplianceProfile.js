/**
 * Vendor Compliance Profile Model
 * Canonical compliance profile per vendor with compliance attributes
 */

const mongoose = require('mongoose');

// Compliance Attribute Schema (embedded)
const complianceAttributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: [
      // Certifications
      'ISO27001', 'ISO9001', 'ISO14001', 'SOC2_TYPE1', 'SOC2_TYPE2', 'SOC1',
      'PCI_DSS', 'HIPAA', 'GDPR', 'CCPA', 'FedRAMP', 'CMMC',
      // Licenses
      'BUSINESS_LICENSE', 'PROFESSIONAL_LICENSE', 'IMPORT_LICENSE', 'EXPORT_LICENSE',
      // Insurance
      'GENERAL_LIABILITY', 'CYBER_INSURANCE', 'WORKERS_COMP', 'PROFESSIONAL_LIABILITY', 'PRODUCT_LIABILITY',
      // Tax & Financial
      'TAX_REGISTRATION', 'VAT_REGISTRATION', 'W9_W8', 'BANK_VERIFICATION', 'FINANCIAL_STATEMENT',
      // KYC/AML
      'KYC_VERIFICATION', 'AML_CHECK', 'SANCTIONS_CHECK', 'PEP_CHECK', 'ADVERSE_MEDIA_CHECK',
      // Security
      'PENETRATION_TEST', 'VULNERABILITY_SCAN', 'SECURITY_QUESTIONNAIRE', 'DATA_PROCESSING_AGREEMENT',
      // ESG
      'ESG_CERTIFICATION', 'SUSTAINABILITY_REPORT', 'DIVERSITY_CERTIFICATION',
      // Other
      'CERTIFICATE_OF_INCORPORATION', 'PROOF_OF_ADDRESS', 'DIRECTOR_VERIFICATION', 'UBO_VERIFICATION',
      'CUSTOM'
    ]
  },
  customName: String, // For CUSTOM type
  status: {
    type: String,
    enum: ['valid', 'expired', 'expiring_soon', 'pending_review', 'rejected', 'absent', 'not_required'],
    default: 'absent'
  },
  issueDate: Date,
  expiryDate: Date,
  reminderDates: [Date], // 30, 15, 7 days before expiry
  evidenceRef: {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    fileUrl: String,
    fileName: String,
    fileType: String,
    uploadedAt: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  extractedData: {
    certificateNumber: String,
    issuingAuthority: String,
    scope: String,
    coverageAmount: Number,
    currency: String,
    additionalFields: mongoose.Schema.Types.Mixed
  },
  verification: {
    method: {
      type: String,
      enum: ['manual', 'ocr', 'api', 'digital_signature', 'registry_check', 'third_party']
    },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confidence: { type: Number, min: 0, max: 1 },
    checksum: String, // For digitally signed documents
    provenance: {
      source: String,
      sourceId: String,
      rawPayloadRef: String
    }
  },
  history: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    previousEvidence: String
  }],
  notes: String,
  isRequired: { type: Boolean, default: false },
  requiredBy: [{ // Which policies require this
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyRule' },
    policyName: String
  }]
}, { _id: true });

// Main Vendor Compliance Profile Schema
const vendorComplianceProfileSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    unique: true
  },
  
  // Risk Tiering
  tier: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  previousTier: String,
  tierChangedAt: Date,
  tierChangedReason: String,
  
  // Composite Risk Score
  compositeScore: {
    value: { type: Number, min: 0, max: 100, default: 50 },
    updatedAt: Date,
    trend: { type: String, enum: ['improving', 'stable', 'degrading'] },
    factors: [{
      name: String,
      weight: Number,
      score: Number,
      contribution: Number, // SHAP-like contribution
      details: String
    }]
  },
  
  // Compliance Attributes
  complianceAttributes: [complianceAttributeSchema],
  
  // Sanctions & Watchlist Status
  sanctionsStatus: {
    status: { type: String, enum: ['clear', 'potential_match', 'confirmed_match', 'pending_review'], default: 'clear' },
    lastCheckAt: Date,
    matches: [{
      listName: String,
      matchedName: String,
      matchScore: Number,
      matchType: String, // exact, fuzzy, alias
      listId: String,
      source: String,
      reviewedAt: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolution: { type: String, enum: ['confirmed', 'false_positive', 'pending'] }
    }],
    pepMatches: [{
      name: String,
      position: String,
      country: String,
      matchScore: Number,
      source: String
    }]
  },
  
  // Adverse Media Status
  adverseMediaStatus: {
    status: { type: String, enum: ['clear', 'alerts_found', 'confirmed_issue'], default: 'clear' },
    lastCheckAt: Date,
    alerts: [{
      headline: String,
      source: String,
      publishedAt: Date,
      sentiment: { type: String, enum: ['negative', 'neutral', 'positive'] },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      categories: [String], // fraud, legal, environmental, etc.
      url: String,
      snippet: String,
      reviewedAt: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolution: String
    }]
  },
  
  // Monitoring Configuration
  monitoringConfig: {
    frequency: { type: String, enum: ['realtime', 'daily', 'weekly', 'monthly'], default: 'daily' },
    enabledChecks: {
      sanctions: { type: Boolean, default: true },
      pep: { type: Boolean, default: true },
      adverseMedia: { type: Boolean, default: true },
      registryChanges: { type: Boolean, default: true },
      certExpirations: { type: Boolean, default: true },
      financialHealth: { type: Boolean, default: false }
    },
    alertRecipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    escalationPath: [{
      level: Number,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      delayHours: Number
    }]
  },
  
  // Workflow Status
  workflowStatus: {
    currentAction: {
      type: String,
      enum: ['none', 'monitor', 'restricted', 'review_required', 'suspended', 'terminated'],
      default: 'none'
    },
    actionReason: String,
    actionTakenAt: Date,
    actionTakenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    restrictions: [{
      type: { type: String, enum: ['payment_hold', 'new_orders_blocked', 'reduced_limits', 'manual_approval_required'] },
      appliedAt: Date,
      reason: String,
      autoLiftAt: Date
    }]
  },
  
  // Open Remediation Cases
  openRemediations: [{
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'RemediationCase' },
    severity: String,
    summary: String,
    dueDate: Date
  }],
  
  // Linked Assets at Risk
  linkedAssets: {
    activeContracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }],
    pendingInvoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    pendingOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    totalExposure: Number,
    currency: { type: String, default: 'USD' }
  },
  
  // Scan & Sync Metadata
  lastFullScan: Date,
  lastIncrementalScan: Date,
  nextScheduledScan: Date,
  scanStatus: {
    type: String,
    enum: ['idle', 'scanning', 'error', 'queued'],
    default: 'idle'
  },
  lastScanError: String,
  
  // Data Sources
  dataSources: [{
    provider: String,
    connectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'IntegrationConnector' },
    lastSyncAt: Date,
    status: String,
    dataTypes: [String]
  }],
  
  // Audit Trail
  auditLog: [{
    action: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorType: { type: String, enum: ['user', 'system', 'integration'] },
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes
vendorComplianceProfileSchema.index({ vendorId: 1 });
vendorComplianceProfileSchema.index({ tier: 1 });
vendorComplianceProfileSchema.index({ 'compositeScore.value': 1 });
vendorComplianceProfileSchema.index({ 'sanctionsStatus.status': 1 });
vendorComplianceProfileSchema.index({ 'complianceAttributes.status': 1 });
vendorComplianceProfileSchema.index({ 'complianceAttributes.expiryDate': 1 });
vendorComplianceProfileSchema.index({ nextScheduledScan: 1 });

// Methods
vendorComplianceProfileSchema.methods.getExpiringAttributes = function(daysAhead = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
  
  return this.complianceAttributes.filter(attr => 
    attr.status === 'valid' && 
    attr.expiryDate && 
    attr.expiryDate <= cutoffDate
  );
};

vendorComplianceProfileSchema.methods.getMissingRequiredAttributes = function() {
  return this.complianceAttributes.filter(attr => 
    attr.isRequired && 
    (attr.status === 'absent' || attr.status === 'expired')
  );
};

vendorComplianceProfileSchema.methods.calculateCompliancePercentage = function() {
  const required = this.complianceAttributes.filter(a => a.isRequired);
  if (required.length === 0) return 100;
  
  const compliant = required.filter(a => a.status === 'valid').length;
  return Math.round((compliant / required.length) * 100);
};

vendorComplianceProfileSchema.methods.addAuditEntry = function(action, actor, details, actorType = 'user') {
  this.auditLog.push({
    action,
    actor,
    actorType,
    details,
    timestamp: new Date()
  });
  
  // Keep only last 1000 entries
  if (this.auditLog.length > 1000) {
    this.auditLog = this.auditLog.slice(-1000);
  }
};

// Statics
vendorComplianceProfileSchema.statics.getHighRiskVendors = function() {
  return this.find({ tier: { $in: ['high', 'critical'] } })
    .populate('vendorId', 'name email')
    .sort({ 'compositeScore.value': -1 });
};

vendorComplianceProfileSchema.statics.getVendorsWithExpiringDocs = function(daysAhead = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
  
  return this.find({
    'complianceAttributes.expiryDate': { $lte: cutoffDate },
    'complianceAttributes.status': 'valid'
  }).populate('vendorId', 'name email');
};

module.exports = mongoose.model('VendorComplianceProfile', vendorComplianceProfileSchema);
