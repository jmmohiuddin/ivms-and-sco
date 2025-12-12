const mongoose = require('mongoose');

const optimizationResultSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'inventory_optimization',
      'vendor_selection',
      'route_optimization',
      'order_optimization',
      'cost_reduction',
      'risk_mitigation'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'applied'],
    default: 'pending'
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed
  },
  results: {
    recommendations: [{
      action: String,
      description: String,
      priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      expectedImpact: {
        metric: String,
        currentValue: Number,
        projectedValue: Number,
        improvement: Number,
        unit: String
      },
      affectedEntities: [{
        entityType: { type: String, enum: ['vendor', 'product', 'order'] },
        entityId: mongoose.Schema.Types.ObjectId,
        entityName: String
      }],
      implementationSteps: [String],
      estimatedSavings: Number,
      riskLevel: { type: String, enum: ['low', 'medium', 'high'] }
    }],
    summary: {
      totalRecommendations: Number,
      potentialSavings: Number,
      implementationComplexity: String,
      timeToImplement: String
    },
    metrics: {
      optimizationScore: Number,
      confidenceLevel: Number,
      dataPointsAnalyzed: Number
    }
  },
  appliedAt: Date,
  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: String,
    actualImpact: mongoose.Schema.Types.Mixed
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OptimizationResult', optimizationResultSchema);
