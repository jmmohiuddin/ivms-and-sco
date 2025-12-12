const mongoose = require('mongoose');

const invoiceApprovalSchema = new mongoose.Schema({
  // Reference to invoice
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  invoiceNumber: String,
  
  // Approval workflow definition
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalWorkflow'
  },
  workflowName: String,
  
  // Approval type
  approvalType: {
    type: String,
    enum: ['single', 'sequential', 'parallel', 'hierarchical', 'conditional'],
    default: 'sequential'
  },
  
  // Current state
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'escalated', 'expired'],
    default: 'pending',
    index: true
  },
  
  // Step tracking
  currentStep: {
    type: Number,
    default: 1
  },
  totalSteps: {
    type: Number,
    default: 1
  },
  
  // Approval steps
  steps: [{
    stepNumber: {
      type: Number,
      required: true
    },
    stepName: String,
    stepType: {
      type: String,
      enum: ['single', 'any', 'all', 'percentage'],
      default: 'single'
    },
    requiredApprovals: {
      type: Number,
      default: 1
    },
    approvalPercentage: Number, // For percentage-based approval
    
    // Approvers for this step
    approvers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      userName: String,
      userEmail: String,
      role: String,
      department: String,
      approvalLimit: Number, // Max amount this user can approve
      
      // Response
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'delegated', 'skipped', 'expired'],
        default: 'pending'
      },
      decision: {
        type: String,
        enum: ['approve', 'reject', 'request_info', 'delegate']
      },
      comments: String,
      respondedAt: Date,
      delegatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      
      // Notification tracking
      notifiedAt: Date,
      remindersSent: {
        type: Number,
        default: 0
      },
      lastReminderAt: Date
    }],
    
    // Step status
    stepStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'rejected', 'skipped'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    
    // Step conditions
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'in', 'not_in', 'contains']
      },
      value: mongoose.Schema.Types.Mixed
    }],
    
    // Escalation for this step
    escalation: {
      enabled: {
        type: Boolean,
        default: true
      },
      afterHours: {
        type: Number,
        default: 24
      },
      escalateTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  }],
  
  // Auto-approval settings
  autoApproval: {
    eligible: {
      type: Boolean,
      default: false
    },
    reason: String,
    appliedRules: [String],
    threshold: Number
  },
  
  // Invoice summary for quick reference
  invoiceSummary: {
    vendorName: String,
    vendorId: mongoose.Schema.Types.ObjectId,
    totalAmount: Number,
    currency: String,
    dueDate: Date,
    category: String,
    costCenter: String,
    department: String
  },
  
  // Supporting evidence
  supportingDocuments: [{
    documentType: {
      type: String,
      enum: ['po', 'grn', 'contract', 'quote', 'receipt', 'other']
    },
    documentId: mongoose.Schema.Types.ObjectId,
    documentNumber: String,
    description: String,
    url: String
  }],
  
  // Match record reference
  matchRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatchRecord'
  },
  matchScore: Number,
  
  // GL coding info
  glCoding: {
    glAccount: String,
    costCenter: String,
    department: String,
    projectCode: String,
    codingConfidence: Number,
    codingMethod: {
      type: String,
      enum: ['auto', 'suggested', 'manual', 'historical']
    }
  },
  
  // Deadlines
  submittedAt: {
    type: Date,
    default: Date.now
  },
  deadline: Date,
  
  // Final outcome
  finalDecision: {
    type: String,
    enum: ['approved', 'rejected', 'cancelled']
  },
  finalDecisionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  finalDecisionAt: Date,
  finalComments: String,
  
  // GL overrides during approval
  glOverrides: [{
    field: String,
    originalValue: String,
    newValue: String,
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    overriddenAt: Date,
    reason: String
  }],
  
  // Amount adjustments
  adjustments: [{
    type: {
      type: String,
      enum: ['discount', 'penalty', 'correction', 'partial_payment', 'other']
    },
    amount: Number,
    reason: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date
  }],
  
  // Notifications sent
  notifications: [{
    type: {
      type: String,
      enum: ['approval_request', 'reminder', 'escalation', 'approved', 'rejected', 'info_request']
    },
    recipientId: mongoose.Schema.Types.ObjectId,
    recipientEmail: String,
    sentAt: Date,
    channel: {
      type: String,
      enum: ['email', 'in_app', 'sms', 'push']
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed']
    }
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
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String
  }],
  
  // Metadata
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [String],
  
  // Mobile approval data
  mobileApprovalEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
invoiceApprovalSchema.index({ invoiceId: 1 });
invoiceApprovalSchema.index({ status: 1, currentStep: 1 });
invoiceApprovalSchema.index({ 'steps.approvers.userId': 1, status: 1 });
invoiceApprovalSchema.index({ deadline: 1 });
invoiceApprovalSchema.index({ createdAt: -1 });

// Pre-save middleware
invoiceApprovalSchema.pre('save', function(next) {
  // Add to audit trail on status change
  if (this.isModified('status')) {
    this.auditTrail.push({
      action: `status_changed_to_${this.status}`,
      performedAt: new Date(),
      details: { newStatus: this.status, step: this.currentStep }
    });
  }
  next();
});

// Methods
invoiceApprovalSchema.methods.processApproval = function(userId, decision, comments) {
  const currentStepData = this.steps.find(s => s.stepNumber === this.currentStep);
  if (!currentStepData) return null;
  
  const approver = currentStepData.approvers.find(a => a.userId.toString() === userId.toString());
  if (!approver) return null;
  
  approver.status = decision === 'approve' ? 'approved' : 'rejected';
  approver.decision = decision;
  approver.comments = comments;
  approver.respondedAt = new Date();
  
  // Check if step is complete
  const approvedCount = currentStepData.approvers.filter(a => a.status === 'approved').length;
  const rejectedCount = currentStepData.approvers.filter(a => a.status === 'rejected').length;
  
  if (currentStepData.stepType === 'single' || currentStepData.stepType === 'any') {
    if (decision === 'approve') {
      currentStepData.stepStatus = 'completed';
      this.moveToNextStep();
    } else {
      currentStepData.stepStatus = 'rejected';
      this.status = 'rejected';
      this.finalDecision = 'rejected';
      this.finalDecisionBy = userId;
      this.finalDecisionAt = new Date();
    }
  } else if (currentStepData.stepType === 'all') {
    if (rejectedCount > 0) {
      currentStepData.stepStatus = 'rejected';
      this.status = 'rejected';
      this.finalDecision = 'rejected';
      this.finalDecisionBy = userId;
      this.finalDecisionAt = new Date();
    } else if (approvedCount === currentStepData.approvers.length) {
      currentStepData.stepStatus = 'completed';
      this.moveToNextStep();
    }
  }
  
  this.auditTrail.push({
    action: `step_${this.currentStep}_${decision}`,
    performedBy: userId,
    performedAt: new Date(),
    details: { decision, comments }
  });
  
  return this.save();
};

invoiceApprovalSchema.methods.moveToNextStep = function() {
  if (this.currentStep >= this.totalSteps) {
    this.status = 'approved';
    this.finalDecision = 'approved';
    this.finalDecisionAt = new Date();
  } else {
    this.currentStep += 1;
    const nextStep = this.steps.find(s => s.stepNumber === this.currentStep);
    if (nextStep) {
      nextStep.stepStatus = 'in_progress';
      nextStep.startedAt = new Date();
    }
    this.status = 'in_progress';
  }
};

invoiceApprovalSchema.methods.delegate = function(fromUserId, toUserId, toUserName, toUserEmail) {
  const currentStepData = this.steps.find(s => s.stepNumber === this.currentStep);
  if (!currentStepData) return null;
  
  const approver = currentStepData.approvers.find(a => a.userId.toString() === fromUserId.toString());
  if (!approver) return null;
  
  approver.status = 'delegated';
  approver.decision = 'delegate';
  approver.delegatedTo = toUserId;
  approver.respondedAt = new Date();
  
  // Add delegated user as new approver
  currentStepData.approvers.push({
    userId: toUserId,
    userName: toUserName,
    userEmail: toUserEmail,
    status: 'pending',
    notifiedAt: new Date()
  });
  
  this.auditTrail.push({
    action: 'delegated',
    performedBy: fromUserId,
    performedAt: new Date(),
    details: { delegatedTo: toUserId }
  });
  
  return this.save();
};

invoiceApprovalSchema.methods.escalate = function(escalateTo, reason, userId) {
  this.status = 'escalated';
  
  const currentStepData = this.steps.find(s => s.stepNumber === this.currentStep);
  if (currentStepData && currentStepData.escalation) {
    currentStepData.escalation.escalateTo = escalateTo;
  }
  
  this.auditTrail.push({
    action: 'escalated',
    performedBy: userId,
    performedAt: new Date(),
    details: { escalateTo, reason }
  });
  
  return this.save();
};

// Static methods
invoiceApprovalSchema.statics.getPendingForUser = function(userId) {
  return this.find({
    status: { $in: ['pending', 'in_progress'] },
    'steps.approvers': {
      $elemMatch: {
        userId: userId,
        status: 'pending'
      }
    }
  })
  .populate('invoiceId', 'invoiceNumber totalAmount vendorName dueDate')
  .sort({ priority: -1, deadline: 1 });
};

invoiceApprovalSchema.statics.getApprovalStats = async function(userId, startDate, endDate) {
  const match = {
    'steps.approvers.userId': userId
  };
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    { $unwind: '$steps' },
    { $unwind: '$steps.approvers' },
    { $match: { 'steps.approvers.userId': userId } },
    {
      $group: {
        _id: '$steps.approvers.status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$invoiceSummary.totalAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('InvoiceApproval', invoiceApprovalSchema);
