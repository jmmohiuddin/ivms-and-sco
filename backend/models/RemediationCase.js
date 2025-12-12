/**
 * Remediation Case Model
 * Case management for compliance remediation workflows
 */

const mongoose = require('mongoose');

const remediationCaseSchema = new mongoose.Schema({
  // Case Identification
  caseNumber: {
    type: String,
    required: true,
    unique: true,
    default: () => `REM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`
  },
  
  // Case Type & Category
  caseType: {
    type: String,
    required: true,
    enum: [
      'document_expiration', 'document_missing', 'document_invalid',
      'sanctions_match', 'pep_match', 'adverse_media',
      'policy_violation', 'risk_escalation',
      'kyc_refresh', 'aml_alert',
      'vendor_dispute', 'contract_non_compliance',
      'insurance_lapse', 'certification_expired',
      'custom'
    ]
  },
  category: {
    type: String,
    enum: ['compliance', 'risk', 'legal', 'financial', 'operational', 'security'],
    required: true
  },
  
  // Severity & Priority
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  priority: {
    type: Number,
    default: 50,
    min: 1,
    max: 100
  },
  
  // Case Subject
  subject: {
    title: { type: String, required: true },
    description: String,
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    complianceProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorComplianceProfile' },
    triggeringEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceEvent' },
    policyViolationId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyRule' },
    affectedAttributes: [String]
  },
  
  // Assignment & Ownership
  ownership: {
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: String,
    previousOwners: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      assignedAt: Date,
      removedAt: Date,
      reason: String
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendorContact: {
      name: String,
      email: String,
      phone: String
    }
  },
  
  // Status & Workflow
  status: {
    type: String,
    required: true,
    enum: [
      'open', 'in_progress', 'pending_vendor', 'pending_review',
      'pending_approval', 'escalated', 'on_hold',
      'resolved', 'closed', 'cancelled'
    ],
    default: 'open'
  },
  subStatus: String,
  resolution: {
    type: String,
    enum: [
      'remediated', 'accepted_risk', 'false_positive', 'vendor_terminated',
      'policy_exception', 'superseded', 'cancelled', 'expired'
    ]
  },
  resolutionDetails: String,
  
  // SLA & Deadlines
  sla: {
    responseDeadline: Date, // Initial response required by
    resolutionDeadline: Date, // Full resolution required by
    responseBreached: { type: Boolean, default: false },
    resolutionBreached: { type: Boolean, default: false },
    breachedAt: Date,
    slaPolicy: String // Which SLA policy applies
  },
  
  // Impact Assessment
  impact: {
    exposureAmount: Number,
    currency: { type: String, default: 'USD' },
    affectedContracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }],
    affectedInvoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    affectedOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    businessImpact: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical']
    },
    complianceImpact: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical']
    },
    reputationalRisk: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical']
    }
  },
  
  // Required Actions
  requiredActions: [{
    actionId: {
      type: String,
      default: () => `ACT-${Math.random().toString(36).substr(2, 9)}`
    },
    actionType: {
      type: String,
      enum: [
        'upload_document', 'provide_explanation', 'update_information',
        'obtain_certification', 'complete_questionnaire', 'schedule_audit',
        'payment_required', 'contract_amendment', 'internal_review',
        'legal_review', 'vendor_meeting', 'custom'
      ]
    },
    description: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue', 'waived'],
      default: 'pending'
    },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    evidence: {
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      notes: String,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  }],
  
  // Suggested Actions (AI-generated)
  suggestedActions: [{
    action: String,
    reasoning: String,
    confidence: Number,
    accepted: Boolean,
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Vendor Communication
  vendorCommunications: [{
    communicationId: {
      type: String,
      default: () => `COMM-${Math.random().toString(36).substr(2, 9)}`
    },
    type: {
      type: String,
      enum: ['notification', 'request', 'reminder', 'escalation', 'response', 'acknowledgment']
    },
    channel: {
      type: String,
      enum: ['email', 'portal', 'phone', 'meeting', 'letter']
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound']
    },
    subject: String,
    content: String,
    templateUsed: String,
    sentAt: Date,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveryStatus: String,
    readAt: Date,
    respondedAt: Date,
    attachments: [{
      name: String,
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
    }]
  }],
  
  // Escalation
  escalation: {
    isEscalated: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 },
    escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: Date,
    escalationReason: String,
    escalationHistory: [{
      level: Number,
      escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      escalatedAt: Date,
      reason: String
    }]
  },
  
  // Enforcement Actions Taken
  enforcementActions: [{
    actionType: {
      type: String,
      enum: [
        'payment_hold', 'payment_release', 'order_block', 'order_release',
        'access_restriction', 'access_restoration', 'vendor_suspension',
        'vendor_reinstatement', 'contract_termination', 'penalty_applied'
      ]
    },
    appliedAt: Date,
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    reversedAt: Date,
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reverseReason: String
  }],
  
  // Case History/Timeline
  history: [{
    action: String,
    actionType: {
      type: String,
      enum: [
        'created', 'updated', 'assigned', 'status_changed',
        'comment_added', 'document_attached', 'escalated',
        'sla_breached', 'action_completed', 'vendor_notified',
        'vendor_responded', 'resolved', 'reopened', 'closed'
      ]
    },
    timestamp: { type: Date, default: Date.now },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorType: { type: String, enum: ['user', 'system', 'vendor'] },
    details: mongoose.Schema.Types.Mixed,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    comment: String
  }],
  
  // Comments & Notes
  comments: [{
    commentId: {
      type: String,
      default: () => `CMT-${Math.random().toString(36).substr(2, 9)}`
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    isInternal: { type: Boolean, default: true }, // Internal vs vendor-visible
    createdAt: { type: Date, default: Date.now },
    editedAt: Date,
    attachments: [{
      name: String,
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
    }]
  }],
  
  // Related Cases
  relatedCases: [{
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'RemediationCase' },
    relationship: {
      type: String,
      enum: ['duplicate', 'related', 'parent', 'child', 'supersedes', 'superseded_by']
    }
  }],
  
  // Evidence & Documents
  attachments: [{
    name: String,
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: Date,
    category: String,
    description: String
  }],
  
  // Audit Bundle Reference
  auditBundleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditBundle' },
  
  // Metadata
  tags: [String],
  customFields: mongoose.Schema.Types.Mixed,
  
  // Timestamps
  openedAt: { type: Date, default: Date.now },
  firstResponseAt: Date,
  resolvedAt: Date,
  closedAt: Date
}, {
  timestamps: true
});

// Indexes
remediationCaseSchema.index({ caseNumber: 1 }, { unique: true });
remediationCaseSchema.index({ status: 1 });
remediationCaseSchema.index({ severity: 1 });
remediationCaseSchema.index({ 'subject.vendorId': 1 });
remediationCaseSchema.index({ 'ownership.assignedTo': 1 });
remediationCaseSchema.index({ 'sla.resolutionDeadline': 1 });
remediationCaseSchema.index({ caseType: 1 });
remediationCaseSchema.index({ openedAt: -1 });

// Virtual for SLA status
remediationCaseSchema.virtual('slaStatus').get(function() {
  const now = new Date();
  
  if (this.status === 'resolved' || this.status === 'closed') {
    return 'completed';
  }
  
  if (this.sla.resolutionBreached) {
    return 'breached';
  }
  
  if (this.sla.resolutionDeadline && this.sla.resolutionDeadline < now) {
    return 'overdue';
  }
  
  const hoursRemaining = (this.sla.resolutionDeadline - now) / (1000 * 60 * 60);
  if (hoursRemaining < 24) {
    return 'at_risk';
  }
  
  return 'on_track';
});

// Methods
remediationCaseSchema.methods.addHistoryEntry = function(action, actionType, actor, details, actorType = 'user') {
  this.history.push({
    action,
    actionType,
    actor,
    actorType,
    details,
    timestamp: new Date()
  });
};

remediationCaseSchema.methods.escalate = function(escalatedTo, reason, escalatedBy) {
  this.escalation.isEscalated = true;
  this.escalation.escalationLevel += 1;
  this.escalation.escalatedTo = escalatedTo;
  this.escalation.escalatedAt = new Date();
  this.escalation.escalationReason = reason;
  
  this.escalation.escalationHistory.push({
    level: this.escalation.escalationLevel,
    escalatedTo,
    escalatedAt: new Date(),
    reason
  });
  
  this.addHistoryEntry(
    `Case escalated to level ${this.escalation.escalationLevel}`,
    'escalated',
    escalatedBy,
    { reason, escalatedTo }
  );
  
  return this.save();
};

remediationCaseSchema.methods.resolve = function(resolution, details, resolvedBy) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolutionDetails = details;
  this.resolvedAt = new Date();
  
  this.addHistoryEntry(
    `Case resolved: ${resolution}`,
    'resolved',
    resolvedBy,
    { resolution, details }
  );
  
  return this.save();
};

remediationCaseSchema.methods.checkSLABreach = function() {
  const now = new Date();
  let breached = false;
  
  if (!this.sla.responseBreached && this.sla.responseDeadline && this.sla.responseDeadline < now && !this.firstResponseAt) {
    this.sla.responseBreached = true;
    breached = true;
  }
  
  if (!this.sla.resolutionBreached && this.sla.resolutionDeadline && this.sla.resolutionDeadline < now) {
    this.sla.resolutionBreached = true;
    this.sla.breachedAt = now;
    breached = true;
  }
  
  if (breached) {
    this.addHistoryEntry('SLA breached', 'sla_breached', null, {
      responseBreached: this.sla.responseBreached,
      resolutionBreached: this.sla.resolutionBreached
    }, 'system');
  }
  
  return breached;
};

// Statics
remediationCaseSchema.statics.getOpenCases = function(filters = {}) {
  const query = {
    status: { $nin: ['resolved', 'closed', 'cancelled'] }
  };
  
  if (filters.vendorId) query['subject.vendorId'] = filters.vendorId;
  if (filters.assignedTo) query['ownership.assignedTo'] = filters.assignedTo;
  if (filters.severity) query.severity = filters.severity;
  if (filters.caseType) query.caseType = filters.caseType;
  
  return this.find(query)
    .populate('subject.vendorId', 'name')
    .populate('ownership.assignedTo', 'name email')
    .sort({ priority: -1, 'sla.resolutionDeadline': 1 });
};

remediationCaseSchema.statics.getOverdueCases = function() {
  return this.find({
    status: { $nin: ['resolved', 'closed', 'cancelled'] },
    'sla.resolutionDeadline': { $lt: new Date() }
  }).sort({ 'sla.resolutionDeadline': 1 });
};

remediationCaseSchema.statics.getCaseStats = function(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return this.aggregate([
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ],
        byType: [
          { $group: { _id: '$caseType', count: { $sum: 1 } } }
        ],
        recentlyOpened: [
          { $match: { openedAt: { $gte: since } } },
          { $count: 'count' }
        ],
        recentlyResolved: [
          { $match: { resolvedAt: { $gte: since } } },
          { $count: 'count' }
        ],
        avgResolutionTime: [
          {
            $match: {
              resolvedAt: { $exists: true },
              openedAt: { $exists: true }
            }
          },
          {
            $project: {
              resolutionTime: { $subtract: ['$resolvedAt', '$openedAt'] }
            }
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$resolutionTime' }
            }
          }
        ]
      }
    }
  ]);
};

module.exports = mongoose.model('RemediationCase', remediationCaseSchema);
