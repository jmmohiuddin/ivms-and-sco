/**
 * Compliance Event Model
 * Tracks all compliance-related events and signals
 */

const mongoose = require('mongoose');

const complianceEventSchema = new mongoose.Schema({
  // Event Identification
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Event Type & Category
  eventType: {
    type: String,
    required: true,
    enum: [
      // Document Events
      'document_uploaded', 'document_expired', 'document_expiring_soon',
      'document_verified', 'document_rejected', 'document_requested',
      // Sanctions & Watchlist
      'sanctions_match_found', 'sanctions_match_cleared', 'pep_match_found',
      'watchlist_hit', 'adverse_media_detected',
      // Verification Events
      'kyc_completed', 'kyc_failed', 'aml_check_completed', 'aml_alert',
      'registry_change_detected', 'ownership_change_detected',
      // Risk Events
      'risk_score_changed', 'tier_changed', 'anomaly_detected',
      // Policy Events
      'policy_violation_detected', 'policy_violation_resolved',
      'policy_created', 'policy_updated', 'policy_activated',
      // Enforcement Events
      'payment_held', 'payment_released', 'vendor_suspended',
      'vendor_reinstated', 'access_restricted', 'access_restored',
      // Remediation Events
      'remediation_case_created', 'remediation_case_resolved',
      'remediation_escalated', 'sla_breached',
      // External Events
      'external_signal_received', 'api_sync_completed', 'connector_error',
      // Audit Events
      'audit_bundle_created', 'compliance_review_completed'
    ]
  },
  category: {
    type: String,
    enum: ['document', 'sanctions', 'verification', 'risk', 'policy', 'enforcement', 'remediation', 'external', 'audit'],
    required: true
  },
  
  // Severity & Priority
  severity: {
    type: String,
    enum: ['info', 'low', 'medium', 'high', 'critical'],
    default: 'info'
  },
  priority: {
    type: Number,
    default: 50,
    min: 1,
    max: 100
  },
  
  // Source Information
  source: {
    type: {
      type: String,
      enum: ['system', 'user', 'integration', 'scheduled_scan', 'webhook', 'manual'],
      required: true
    },
    provider: String, // e.g., 'dow_jones', 'lexis_nexis', 'internal_ocr'
    connectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'IntegrationConnector' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: String,
    userAgent: String
  },
  
  // Target Entity
  target: {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    complianceProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorComplianceProfile' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyRule' },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'RemediationCase' }
  },
  
  // Attribute Affected
  attributeAffected: {
    name: String, // e.g., 'ISO27001', 'sanctions_status'
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changeType: {
      type: String,
      enum: ['created', 'updated', 'deleted', 'expired', 'renewed', 'verified', 'invalidated']
    }
  },
  
  // Event Details
  details: {
    title: String,
    description: String,
    impact: String,
    affectedAssets: {
      contracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }],
      invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
      orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
      totalExposure: Number
    },
    matchDetails: mongoose.Schema.Types.Mixed, // For sanctions/watchlist matches
    extractedData: mongoose.Schema.Types.Mixed, // For document processing
    anomalyDetails: mongoose.Schema.Types.Mixed // For anomaly detection
  },
  
  // Raw Payload Reference
  rawPayload: {
    ref: String, // S3 or storage reference
    checksum: String,
    contentType: String,
    size: Number
  },
  
  // Confidence & Provenance
  confidence: {
    score: { type: Number, min: 0, max: 1 },
    method: String, // How confidence was calculated
    factors: [{ factor: String, weight: Number, score: Number }]
  },
  provenance: {
    originalSource: String,
    transformations: [String],
    verificationChain: [{
      step: String,
      verifiedAt: Date,
      verifiedBy: String,
      result: String
    }]
  },
  
  // Triggered Actions
  triggeredActions: [{
    actionType: String,
    status: { type: String, enum: ['pending', 'executed', 'failed', 'skipped'] },
    executedAt: Date,
    result: mongoose.Schema.Types.Mixed,
    error: String
  }],
  
  // Review Status
  reviewStatus: {
    required: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'in_review', 'approved', 'rejected', 'escalated'], default: 'pending' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    decision: String,
    comments: String,
    appealStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected']
    }
  },
  
  // Related Events
  relatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceEvent' }],
  parentEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceEvent' },
  
  // Notification Status
  notifications: [{
    channel: String,
    recipient: String,
    sentAt: Date,
    status: String,
    messageId: String
  }],
  
  // Processing Status
  processingStatus: {
    type: String,
    enum: ['received', 'processing', 'processed', 'failed', 'archived'],
    default: 'received'
  },
  processedAt: Date,
  errorDetails: String,
  retryCount: { type: Number, default: 0 },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  tags: [String],
  
  // Timestamps
  occurredAt: { type: Date, default: Date.now }, // When the event actually occurred
  receivedAt: { type: Date, default: Date.now }, // When we received/detected it
  expiresAt: Date // For auto-cleanup
}, {
  timestamps: true
});

// Indexes
complianceEventSchema.index({ eventId: 1 }, { unique: true });
complianceEventSchema.index({ eventType: 1 });
complianceEventSchema.index({ severity: 1 });
complianceEventSchema.index({ 'target.vendorId': 1 });
complianceEventSchema.index({ 'source.type': 1 });
complianceEventSchema.index({ occurredAt: -1 });
complianceEventSchema.index({ 'reviewStatus.status': 1 });
complianceEventSchema.index({ processingStatus: 1 });
complianceEventSchema.index({ category: 1, severity: 1 });
complianceEventSchema.index({ 'target.vendorId': 1, occurredAt: -1 });

// TTL index for auto-cleanup of old events
complianceEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
complianceEventSchema.methods.markAsProcessed = function() {
  this.processingStatus = 'processed';
  this.processedAt = new Date();
  return this.save();
};

complianceEventSchema.methods.addTriggeredAction = function(actionType, status, result) {
  this.triggeredActions.push({
    actionType,
    status,
    executedAt: new Date(),
    result
  });
  return this.save();
};

complianceEventSchema.methods.requiresHumanReview = function() {
  // High-severity events or low-confidence detections require review
  return this.severity === 'critical' || 
         this.severity === 'high' ||
         (this.confidence?.score && this.confidence.score < 0.7);
};

// Statics
complianceEventSchema.statics.getRecentHighSeverity = function(hours = 24) {
  const since = new Date();
  since.setHours(since.getHours() - hours);
  
  return this.find({
    severity: { $in: ['high', 'critical'] },
    occurredAt: { $gte: since }
  }).sort({ occurredAt: -1 });
};

complianceEventSchema.statics.getPendingReviews = function() {
  return this.find({
    'reviewStatus.required': true,
    'reviewStatus.status': { $in: ['pending', 'in_review'] }
  }).sort({ severity: -1, priority: -1 });
};

complianceEventSchema.statics.getEventsByVendor = function(vendorId, options = {}) {
  const query = { 'target.vendorId': vendorId };
  
  if (options.severity) {
    query.severity = { $in: options.severity };
  }
  if (options.since) {
    query.occurredAt = { $gte: options.since };
  }
  if (options.category) {
    query.category = options.category;
  }
  
  return this.find(query)
    .sort({ occurredAt: -1 })
    .limit(options.limit || 100);
};

complianceEventSchema.statics.getEventStats = function(vendorId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        'target.vendorId': mongoose.Types.ObjectId(vendorId),
        occurredAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: { severity: '$severity', category: '$category' },
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('ComplianceEvent', complianceEventSchema);
