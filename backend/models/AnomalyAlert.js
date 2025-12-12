/**
 * Anomaly Alert Model
 * Stores detected anomalies and fraud-like patterns
 */

const mongoose = require('mongoose');

// Anomaly detail schema
const anomalyDetailSchema = new mongoose.Schema({
  field: String,
  expectedValue: mongoose.Schema.Types.Mixed,
  actualValue: mongoose.Schema.Types.Mixed,
  deviation: Number,
  deviationPercent: Number,
  method: {
    type: String,
    enum: ['statistical', 'isolation_forest', 'autoencoder', 'rule_based', 'clustering']
  }
}, { _id: false });

// Related entity schema
const relatedEntitySchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['vendor', 'invoice', 'payment', 'user', 'contract', 'order']
  },
  entityId: mongoose.Schema.Types.ObjectId,
  entityName: String,
  relationship: String
}, { _id: false });

// Investigation action schema
const investigationActionSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'assigned', 'reviewed', 'escalated', 'resolved', 'dismissed', 'confirmed_fraud']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  notes: String,
  evidence: [String]
}, { _id: false });

const anomalyAlertSchema = new mongoose.Schema({
  // Alert identification
  alertId: {
    type: String,
    unique: true,
    default: function() {
      return `AA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  
  // Anomaly classification
  anomalyType: {
    type: String,
    enum: [
      'duplicate_invoice',
      'unusual_amount',
      'price_anomaly',
      'timing_anomaly',
      'bank_detail_change',
      'vendor_behavior_change',
      'spending_spike',
      'approval_pattern',
      'tax_inconsistency',
      'quantity_anomaly',
      'contract_deviation',
      'split_invoice',
      'round_tripping',
      'shell_company_indicator'
    ],
    required: true
  },
  
  // Category
  category: {
    type: String,
    enum: ['fraud', 'error', 'policy_violation', 'unusual_pattern', 'data_quality'],
    required: true
  },
  
  // Severity and confidence
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  
  confidence: {
    score: {
      type: Number, // 0-100
      required: true
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  
  // Anomaly score from model
  anomalyScore: {
    type: Number,
    required: true
  },
  
  // Subject of the anomaly
  subject: {
    entityType: {
      type: String,
      enum: ['invoice', 'vendor', 'payment', 'order', 'user', 'transaction'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    entityName: String,
    entityDetails: mongoose.Schema.Types.Mixed
  },
  
  // Anomaly details
  details: [anomalyDetailSchema],
  
  // Description
  description: {
    summary: {
      type: String,
      required: true
    },
    explanation: String,
    potentialImpact: String,
    estimatedLoss: Number
  },
  
  // Related entities
  relatedEntities: [relatedEntitySchema],
  
  // Similar past anomalies
  similarAnomalies: [{
    alertId: String,
    similarity: Number,
    outcome: String
  }],
  
  // Feature contributions (explainability)
  featureContributions: [{
    feature: String,
    contribution: Number,
    value: mongoose.Schema.Types.Mixed,
    description: String
  }],
  
  // Detection metadata
  detection: {
    method: {
      type: String,
      enum: ['isolation_forest', 'autoencoder', 'statistical', 'rule_based', 'graph_analysis', 'ensemble'],
      required: true
    },
    model: {
      name: String,
      version: String
    },
    detectedAt: {
      type: Date,
      default: Date.now
    },
    dataWindow: {
      start: Date,
      end: Date
    }
  },
  
  // Investigation status
  status: {
    type: String,
    enum: ['new', 'investigating', 'pending_review', 'escalated', 'resolved', 'dismissed', 'confirmed'],
    default: 'new'
  },
  
  // Assignment
  assignment: {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    dueDate: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    }
  },
  
  // Investigation history
  investigationHistory: [investigationActionSchema],
  
  // Resolution
  resolution: {
    outcome: {
      type: String,
      enum: ['false_positive', 'error_corrected', 'policy_violation_addressed', 'fraud_confirmed', 'no_action_needed']
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    notes: String,
    actionsTaken: [String],
    amountRecovered: Number
  },
  
  // Notification tracking
  notifications: {
    sent: [{ 
      channel: String, 
      recipient: String, 
      sentAt: Date,
      acknowledged: Boolean
    }],
    suppressUntil: Date
  },
  
  // Links and evidence
  evidence: [{
    type: {
      type: String,
      enum: ['document', 'screenshot', 'log', 'report']
    },
    name: String,
    url: String,
    uploadedAt: Date,
    uploadedBy: mongoose.Schema.Types.ObjectId
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
}, {
  timestamps: true
});

// Indexes
anomalyAlertSchema.index({ alertId: 1 });
anomalyAlertSchema.index({ anomalyType: 1, severity: 1 });
anomalyAlertSchema.index({ category: 1 });
anomalyAlertSchema.index({ status: 1 });
anomalyAlertSchema.index({ 'subject.entityType': 1, 'subject.entityId': 1 });
anomalyAlertSchema.index({ 'assignment.assignedTo': 1, status: 1 });
anomalyAlertSchema.index({ createdAt: -1 });
anomalyAlertSchema.index({ anomalyScore: -1 });
anomalyAlertSchema.index({ 'confidence.score': -1 });

// Get unresolved alerts by severity
anomalyAlertSchema.statics.getUnresolvedBySeverity = async function(severity = null) {
  const query = {
    status: { $nin: ['resolved', 'dismissed', 'confirmed'] }
  };
  
  if (severity) {
    query.severity = severity;
  }
  
  return this.find(query)
    .sort({ severity: -1, anomalyScore: -1, createdAt: -1 })
    .populate('assignment.assignedTo', 'name email');
};

// Get alerts for entity
anomalyAlertSchema.statics.getForEntity = async function(entityType, entityId) {
  return this.find({
    'subject.entityType': entityType,
    'subject.entityId': entityId
  }).sort({ createdAt: -1 });
};

// Get similar anomalies
anomalyAlertSchema.statics.findSimilar = async function(anomalyType, entityType, excludeId = null) {
  const query = {
    anomalyType,
    'subject.entityType': entityType,
    status: { $in: ['resolved', 'confirmed'] }
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(5);
};

// Assign alert
anomalyAlertSchema.methods.assign = async function(userId, priority = 'medium', dueDate = null) {
  this.assignment = {
    assignedTo: userId,
    assignedAt: new Date(),
    priority,
    dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
  this.status = 'investigating';
  
  this.investigationHistory.push({
    action: 'assigned',
    performedBy: userId,
    notes: `Assigned with ${priority} priority`
  });
  
  return this.save();
};

// Resolve alert
anomalyAlertSchema.methods.resolve = async function(userId, outcome, notes, actionsTaken = []) {
  this.resolution = {
    outcome,
    resolvedBy: userId,
    resolvedAt: new Date(),
    notes,
    actionsTaken
  };
  
  this.status = outcome === 'fraud_confirmed' ? 'confirmed' : 'resolved';
  
  this.investigationHistory.push({
    action: outcome === 'fraud_confirmed' ? 'confirmed_fraud' : 'resolved',
    performedBy: userId,
    notes
  });
  
  return this.save();
};

// Get summary for dashboard
anomalyAlertSchema.methods.getSummary = function() {
  return {
    alertId: this.alertId,
    type: this.anomalyType,
    category: this.category,
    severity: this.severity,
    confidence: this.confidence.score,
    subject: {
      type: this.subject.entityType,
      name: this.subject.entityName
    },
    summary: this.description.summary,
    status: this.status,
    detectedAt: this.detection.detectedAt,
    estimatedLoss: this.description.estimatedLoss
  };
};

module.exports = mongoose.model('AnomalyAlert', anomalyAlertSchema);
