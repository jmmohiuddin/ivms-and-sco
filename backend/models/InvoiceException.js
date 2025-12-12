const mongoose = require('mongoose');

const invoiceExceptionSchema = new mongoose.Schema({
  // Reference to invoice
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  invoiceNumber: String,
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile'
  },
  vendorName: String,
  
  // Exception identification
  exceptionCode: {
    type: String,
    required: true,
    index: true
  },
  
  exceptionType: {
    type: String,
    enum: [
      // Matching exceptions
      'po_not_found',
      'grn_not_found',
      'quantity_mismatch',
      'price_mismatch',
      'amount_mismatch',
      'partial_match',
      'no_match',
      
      // Validation exceptions
      'missing_required_field',
      'invalid_tax_calculation',
      'invalid_tax_id',
      'currency_mismatch',
      'date_error',
      
      // Fraud/duplicate exceptions
      'duplicate_invoice',
      'fraud_suspected',
      'bank_account_change',
      'anomaly_detected',
      
      // Approval exceptions
      'approval_timeout',
      'approval_rejected',
      'over_budget',
      'unauthorized_vendor',
      
      // Processing exceptions
      'ocr_failure',
      'extraction_low_confidence',
      'file_corrupt',
      'unsupported_format',
      
      // Other
      'vendor_dispute',
      'hold_requested',
      'manual_review_required',
      'other'
    ],
    required: true
  },
  
  // Severity
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Priority for queue ordering
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  
  // Status
  status: {
    type: String,
    enum: ['open', 'in_progress', 'pending_vendor', 'pending_info', 'resolved', 'escalated', 'closed'],
    default: 'open',
    index: true
  },
  
  // Description and details
  title: {
    type: String,
    required: true
  },
  description: String,
  
  // Affected data
  affectedFields: [{
    fieldName: String,
    invoiceValue: mongoose.Schema.Types.Mixed,
    expectedValue: mongoose.Schema.Types.Mixed,
    variance: mongoose.Schema.Types.Mixed
  }],
  
  affectedLineItems: [{
    lineNumber: Number,
    issue: String,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Root cause analysis
  rootCause: {
    category: {
      type: String,
      enum: ['vendor_error', 'system_error', 'data_quality', 'policy_violation', 'process_gap', 'unknown']
    },
    description: String,
    identifiedAt: Date,
    identifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Financial impact
  financialImpact: {
    amountAtRisk: Number,
    potentialOverpayment: Number,
    potentialUnderpayment: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  // Suggested resolutions
  suggestedActions: [{
    action: {
      type: String,
      enum: [
        'approve_with_adjustment',
        'reject_invoice',
        'request_credit_note',
        'contact_vendor',
        'update_po',
        'create_grn',
        'manual_match',
        'split_invoice',
        'merge_invoices',
        'update_vendor_record',
        'escalate',
        'waive_exception',
        'other'
      ]
    },
    description: String,
    confidence: Number,
    parameters: mongoose.Schema.Types.Mixed,
    automatable: {
      type: Boolean,
      default: false
    }
  }],
  
  // One-click resolution actions
  quickActions: [{
    label: String,
    actionType: String,
    parameters: mongoose.Schema.Types.Mixed,
    requiresConfirmation: {
      type: Boolean,
      default: true
    }
  }],
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // SLA tracking
  sla: {
    responseDeadline: Date,
    resolutionDeadline: Date,
    isBreached: {
      type: Boolean,
      default: false
    },
    breachType: {
      type: String,
      enum: ['response', 'resolution']
    },
    breachedAt: Date
  },
  
  // Escalation
  escalation: {
    isEscalated: {
      type: Boolean,
      default: false
    },
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalatedAt: Date,
    escalationReason: String,
    escalationLevel: {
      type: Number,
      default: 0
    }
  },
  
  // Resolution
  resolution: {
    action: String,
    description: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    timeTakenMinutes: Number,
    adjustmentsMade: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Communication trail
  communications: [{
    type: {
      type: String,
      enum: ['internal_note', 'vendor_message', 'email', 'system']
    },
    message: String,
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    to: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [String]
  }],
  
  // Related exceptions
  relatedExceptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceException'
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
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Tags for filtering
  tags: [String],
  
  // Auto-generated or manual
  source: {
    type: String,
    enum: ['auto', 'manual', 'escalation'],
    default: 'auto'
  }
}, {
  timestamps: true
});

// Indexes
invoiceExceptionSchema.index({ status: 1, priority: -1 });
invoiceExceptionSchema.index({ assignedTo: 1, status: 1 });
invoiceExceptionSchema.index({ exceptionType: 1 });
invoiceExceptionSchema.index({ severity: 1 });
invoiceExceptionSchema.index({ 'sla.resolutionDeadline': 1 });
invoiceExceptionSchema.index({ createdAt: -1 });

// Pre-save middleware
invoiceExceptionSchema.pre('save', function(next) {
  // Generate exception code if not set
  if (!this.exceptionCode) {
    const prefix = this.exceptionType.substring(0, 3).toUpperCase();
    this.exceptionCode = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }
  
  // Check SLA breach
  if (this.sla.resolutionDeadline && new Date() > this.sla.resolutionDeadline && this.status === 'open') {
    this.sla.isBreached = true;
    this.sla.breachType = 'resolution';
    this.sla.breachedAt = new Date();
  }
  
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
invoiceExceptionSchema.methods.assign = function(userId, assignedBy) {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  this.assignedBy = assignedBy;
  this.status = 'in_progress';
  this.auditTrail.push({
    action: 'assigned',
    performedBy: assignedBy,
    performedAt: new Date(),
    details: { assignedTo: userId }
  });
  return this.save();
};

invoiceExceptionSchema.methods.escalate = function(escalateTo, reason, userId) {
  this.escalation.isEscalated = true;
  this.escalation.escalatedTo = escalateTo;
  this.escalation.escalatedAt = new Date();
  this.escalation.escalationReason = reason;
  this.escalation.escalationLevel += 1;
  this.status = 'escalated';
  this.auditTrail.push({
    action: 'escalated',
    performedBy: userId,
    performedAt: new Date(),
    details: { escalatedTo, reason }
  });
  return this.save();
};

invoiceExceptionSchema.methods.resolve = function(action, description, userId, adjustments = []) {
  this.status = 'resolved';
  this.resolution = {
    action,
    description,
    resolvedBy: userId,
    resolvedAt: new Date(),
    timeTakenMinutes: Math.round((new Date() - this.createdAt) / 60000),
    adjustmentsMade: adjustments
  };
  this.auditTrail.push({
    action: 'resolved',
    performedBy: userId,
    performedAt: new Date(),
    details: { action, description }
  });
  return this.save();
};

invoiceExceptionSchema.methods.addCommunication = function(type, message, fromUserId, to = null) {
  this.communications.push({
    type,
    message,
    from: fromUserId,
    to,
    timestamp: new Date()
  });
  return this.save();
};

// Static methods
invoiceExceptionSchema.statics.getOpenByAssignee = function(userId) {
  return this.find({
    assignedTo: userId,
    status: { $in: ['open', 'in_progress', 'pending_info'] }
  })
  .populate('invoiceId', 'invoiceNumber totalAmount vendorName')
  .sort({ priority: -1, 'sla.resolutionDeadline': 1 });
};

invoiceExceptionSchema.statics.getExceptionStats = async function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          type: '$exceptionType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalImpact: { $sum: '$financialImpact.amountAtRisk' }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' },
        totalImpact: { $sum: '$totalImpact' }
      }
    },
    { $sort: { totalCount: -1 } }
  ]);
};

invoiceExceptionSchema.statics.getPriorityQueue = function(limit = 50) {
  return this.find({ status: { $in: ['open', 'in_progress'] } })
    .populate('invoiceId', 'invoiceNumber totalAmount dueDate vendorName')
    .populate('assignedTo', 'name email')
    .sort({ severity: -1, priority: -1, 'sla.resolutionDeadline': 1 })
    .limit(limit);
};

module.exports = mongoose.model('InvoiceException', invoiceExceptionSchema);
