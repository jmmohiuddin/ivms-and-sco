const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'low_stock',
      'stockout_risk',
      'vendor_performance',
      'delivery_delay',
      'price_increase',
      'quality_issue',
      'demand_spike',
      'supply_disruption',
      'contract_expiry',
      'optimization_opportunity'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  entity: {
    type: { type: String, enum: ['vendor', 'product', 'order', 'system'] },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  suggestedActions: [{
    action: String,
    description: String
  }],
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active'
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  expiresAt: Date
}, {
  timestamps: true
});

alertSchema.index({ status: 1, severity: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
