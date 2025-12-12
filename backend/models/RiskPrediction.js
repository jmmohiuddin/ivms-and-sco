/**
 * Risk Prediction Model
 * Stores vendor risk predictions with probability scores and drivers
 */

const mongoose = require('mongoose');

// Risk factor schema
const riskFactorSchema = new mongoose.Schema({
  factor: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['operational', 'financial', 'compliance', 'delivery', 'quality', 'external'],
    required: true
  },
  score: {
    type: Number, // 0-100
    required: true
  },
  weight: {
    type: Number,
    default: 1.0
  },
  trend: {
    type: String,
    enum: ['improving', 'stable', 'deteriorating']
  },
  signals: [{
    source: String,
    value: mongoose.Schema.Types.Mixed,
    timestamp: Date,
    impact: Number
  }],
  description: String
}, { _id: false });

// Prediction detail schema
const predictionDetailSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'delayed_delivery',
      'quality_issue',
      'compliance_lapse',
      'financial_instability',
      'dispute_likelihood',
      'contract_breach',
      'payment_default',
      'service_disruption'
    ],
    required: true
  },
  probability: {
    type: Number, // 0-1
    required: true
  },
  confidenceLevel: {
    type: Number, // 0-100
    default: 80
  },
  timeframe: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months']
    }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  potentialImpact: {
    financial: Number,
    operational: String,
    reputational: String
  },
  drivingFactors: [{
    factor: String,
    contribution: Number,
    value: mongoose.Schema.Types.Mixed
  }],
  mitigationSuggestions: [String]
}, { _id: false });

// Historical event schema
const historicalEventSchema = new mongoose.Schema({
  eventType: String,
  occurredAt: Date,
  description: String,
  impact: String,
  resolved: Boolean,
  resolutionTime: Number // days
}, { _id: false });

// Trajectory point schema
const trajectoryPointSchema = new mongoose.Schema({
  date: Date,
  riskScore: Number,
  event: String
}, { _id: false });

const riskPredictionSchema = new mongoose.Schema({
  // Prediction identification
  predictionId: {
    type: String,
    unique: true,
    default: function() {
      return `RP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  
  // Vendor reference
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  vendorName: String,
  
  // Overall risk assessment
  overallRisk: {
    score: {
      type: Number, // 0-100
      required: true
    },
    tier: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'deteriorating'],
      default: 'stable'
    },
    trendDuration: {
      value: Number,
      unit: String
    },
    confidenceLevel: {
      type: Number,
      default: 85
    }
  },
  
  // Individual risk factors
  riskFactors: [riskFactorSchema],
  
  // Specific predictions
  predictions: [predictionDetailSchema],
  
  // Risk trajectory (trend over time)
  trajectory: [trajectoryPointSchema],
  
  // Historical events that inform prediction
  historicalEvents: [historicalEventSchema],
  
  // External signals
  externalSignals: {
    financialHealth: {
      score: Number,
      source: String,
      lastUpdated: Date
    },
    adverseMedia: {
      alertCount: Number,
      severity: String,
      lastAlert: Date
    },
    marketConditions: {
      industryRisk: String,
      geopoliticalRisk: String,
      supplyChainRisk: String
    },
    creditRating: {
      rating: String,
      agency: String,
      outlook: String
    }
  },
  
  // Comparison with peer vendors
  peerComparison: {
    percentile: Number, // where this vendor ranks among peers
    industryAverage: Number,
    categoryAverage: Number,
    betterThanPeers: Boolean
  },
  
  // Recommended actions
  recommendedActions: [{
    action: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    category: String,
    expectedImpact: String,
    effort: String,
    deadline: Date
  }],
  
  // Model metadata
  model: {
    name: {
      type: String,
      enum: ['gradient_boosting', 'random_forest', 'neural_network', 'ensemble'],
      default: 'ensemble'
    },
    version: String,
    trainedAt: Date,
    accuracy: {
      precision: Number,
      recall: Number,
      f1Score: Number,
      auc: Number
    },
    features: [String]
  },
  
  // Alert configuration
  alerts: {
    thresholdBreached: { type: Boolean, default: false },
    lastAlertSent: Date,
    alertRecipients: [String],
    suppressUntil: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'superseded', 'archived'],
    default: 'active'
  },
  
  // Validity period
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: Date,
  
  // Tracking
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
riskPredictionSchema.index({ predictionId: 1 });
riskPredictionSchema.index({ vendorId: 1, status: 1 });
riskPredictionSchema.index({ 'overallRisk.score': -1 });
riskPredictionSchema.index({ 'overallRisk.tier': 1 });
riskPredictionSchema.index({ createdAt: -1 });
riskPredictionSchema.index({ 'predictions.type': 1, 'predictions.probability': -1 });

// Get active prediction for vendor
riskPredictionSchema.statics.getActiveForVendor = async function(vendorId) {
  return this.findOne({
    vendorId,
    status: 'active',
    validFrom: { $lte: new Date() },
    $or: [
      { validUntil: { $gte: new Date() } },
      { validUntil: null }
    ]
  }).sort({ createdAt: -1 });
};

// Get high risk vendors
riskPredictionSchema.statics.getHighRiskVendors = async function(threshold = 70) {
  return this.find({
    status: 'active',
    'overallRisk.score': { $gte: threshold }
  })
  .populate('vendorId', 'name companyName')
  .sort({ 'overallRisk.score': -1 });
};

// Get vendors with specific risk type
riskPredictionSchema.statics.getVendorsWithRisk = async function(riskType, minProbability = 0.5) {
  return this.find({
    status: 'active',
    'predictions.type': riskType,
    'predictions.probability': { $gte: minProbability }
  })
  .populate('vendorId', 'name companyName')
  .sort({ 'predictions.probability': -1 });
};

// Get risk summary
riskPredictionSchema.methods.getSummary = function() {
  const topRisks = this.predictions
    .filter(p => p.probability > 0.3)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);
    
  return {
    predictionId: this.predictionId,
    vendorId: this.vendorId,
    vendorName: this.vendorName,
    overallRisk: {
      score: this.overallRisk.score,
      tier: this.overallRisk.tier,
      trend: this.overallRisk.trend
    },
    topRisks: topRisks.map(r => ({
      type: r.type,
      probability: `${(r.probability * 100).toFixed(0)}%`,
      severity: r.severity,
      timeframe: r.timeframe ? `${r.timeframe.value} ${r.timeframe.unit}` : 'N/A'
    })),
    confidence: `${this.overallRisk.confidenceLevel}%`,
    actionCount: this.recommendedActions?.length || 0,
    urgentActions: this.recommendedActions?.filter(a => a.priority === 'urgent').length || 0
  };
};

// Check if any threshold is breached
riskPredictionSchema.methods.checkThresholds = function(thresholds = {}) {
  const defaults = {
    overallScore: 80,
    probabilityHigh: 0.7,
    probabilityCritical: 0.9
  };
  
  const config = { ...defaults, ...thresholds };
  const breaches = [];
  
  if (this.overallRisk.score >= config.overallScore) {
    breaches.push({
      type: 'overall_score',
      value: this.overallRisk.score,
      threshold: config.overallScore
    });
  }
  
  this.predictions.forEach(pred => {
    if (pred.probability >= config.probabilityCritical) {
      breaches.push({
        type: 'critical_probability',
        riskType: pred.type,
        value: pred.probability,
        threshold: config.probabilityCritical
      });
    } else if (pred.probability >= config.probabilityHigh) {
      breaches.push({
        type: 'high_probability',
        riskType: pred.type,
        value: pred.probability,
        threshold: config.probabilityHigh
      });
    }
  });
  
  return breaches;
};

// Get trend analysis
riskPredictionSchema.methods.getTrendAnalysis = function() {
  if (!this.trajectory || this.trajectory.length < 2) {
    return { trend: 'insufficient_data' };
  }
  
  const sorted = [...this.trajectory].sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent = sorted.slice(-6);
  const avgRecent = recent.reduce((sum, p) => sum + p.riskScore, 0) / recent.length;
  const older = sorted.slice(0, -6);
  const avgOlder = older.length > 0 
    ? older.reduce((sum, p) => sum + p.riskScore, 0) / older.length 
    : avgRecent;
  
  const change = avgRecent - avgOlder;
  const changePercent = avgOlder > 0 ? (change / avgOlder) * 100 : 0;
  
  return {
    trend: change > 5 ? 'deteriorating' : change < -5 ? 'improving' : 'stable',
    changePercent: changePercent.toFixed(1),
    recentAverage: avgRecent.toFixed(1),
    dataPoints: this.trajectory.length
  };
};

module.exports = mongoose.model('RiskPrediction', riskPredictionSchema);
