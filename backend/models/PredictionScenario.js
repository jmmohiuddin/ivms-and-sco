/**
 * Prediction Scenario Model
 * Stores what-if scenarios and simulation results
 */

const mongoose = require('mongoose');

// Input variable schema
const inputVariableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['spend', 'volume', 'pricing', 'vendor', 'market', 'operational']
  },
  baseValue: mongoose.Schema.Types.Mixed,
  adjustedValue: mongoose.Schema.Types.Mixed,
  changeType: {
    type: String,
    enum: ['absolute', 'percentage', 'multiplier']
  },
  changeAmount: Number,
  description: String
}, { _id: false });

// Output metric schema
const outputMetricSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['financial', 'operational', 'risk', 'compliance']
  },
  baselineValue: Number,
  projectedValue: Number,
  change: Number,
  changePercent: Number,
  confidence: Number,
  unit: String,
  breakdown: [{
    dimension: String,
    value: Number
  }]
}, { _id: false });

// Sensitivity analysis schema
const sensitivitySchema = new mongoose.Schema({
  variable: String,
  impactOnOutput: String,
  elasticity: Number, // % change in output per 1% change in input
  direction: {
    type: String,
    enum: ['positive', 'negative', 'mixed']
  },
  sensitivity: {
    type: String,
    enum: ['low', 'medium', 'high']
  }
}, { _id: false });

// Recommendation schema
const recommendationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['proceed', 'caution', 'avoid', 'optimize', 'defer']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  description: String,
  rationale: String,
  expectedBenefit: Number,
  expectedRisk: String,
  actionItems: [String]
}, { _id: false });

const predictionScenarioSchema = new mongoose.Schema({
  // Scenario identification
  scenarioId: {
    type: String,
    unique: true,
    default: function() {
      return `PS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  
  // Scenario metadata
  name: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['spend_optimization', 'risk_mitigation', 'vendor_change', 'market_shift', 'capacity_planning', 'budget_forecast', 'custom'],
    default: 'custom'
  },
  
  // Scenario type
  type: {
    type: String,
    enum: ['what_if', 'stress_test', 'optimization', 'comparison'],
    default: 'what_if'
  },
  
  // Scope
  scope: {
    level: {
      type: String,
      enum: ['organization', 'department', 'vendor', 'category', 'project']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String
  },
  
  // Time horizon
  timeHorizon: {
    startDate: Date,
    endDate: Date,
    period: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly']
    }
  },
  
  // Input variables (adjustments)
  inputVariables: [inputVariableSchema],
  
  // Baseline (before scenario)
  baseline: {
    dataAsOf: Date,
    metrics: [{
      name: String,
      value: Number,
      unit: String
    }]
  },
  
  // Output projections
  projections: [outputMetricSchema],
  
  // Comparison metrics
  comparison: {
    vsBaseline: {
      totalChange: Number,
      changePercent: Number,
      summary: String
    },
    vsPreviousPeriod: {
      totalChange: Number,
      changePercent: Number
    },
    vsTarget: {
      targetValue: Number,
      gap: Number,
      achievable: Boolean
    }
  },
  
  // Sensitivity analysis
  sensitivityAnalysis: [sensitivitySchema],
  
  // Risk assessment
  riskAssessment: {
    overallRisk: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    riskFactors: [{
      factor: String,
      probability: Number,
      impact: String,
      mitigation: String
    }],
    worstCase: {
      description: String,
      impact: Number
    },
    bestCase: {
      description: String,
      impact: Number
    }
  },
  
  // Monte Carlo simulation results (if run)
  monteCarloResults: {
    iterations: Number,
    percentiles: {
      p10: Number,
      p25: Number,
      p50: Number,
      p75: Number,
      p90: Number
    },
    distribution: [{
      bin: Number,
      frequency: Number
    }]
  },
  
  // Recommendations
  recommendations: [recommendationSchema],
  
  // Feature contributions
  featureContributions: [{
    feature: String,
    contribution: Number,
    description: String
  }],
  
  // Model information
  model: {
    name: String,
    version: String,
    computeTime: Number, // milliseconds
    warnings: [String]
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'running', 'completed', 'failed', 'archived'],
    default: 'draft'
  },
  
  // Sharing and collaboration
  visibility: {
    type: String,
    enum: ['private', 'team', 'organization'],
    default: 'private'
  },
  sharedWith: [{
    userId: mongoose.Schema.Types.ObjectId,
    permission: {
      type: String,
      enum: ['view', 'edit']
    }
  }],
  
  // User actions
  savedAsTemplate: {
    type: Boolean,
    default: false
  },
  templateName: String,
  
  // Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Indexes
predictionScenarioSchema.index({ scenarioId: 1 });
predictionScenarioSchema.index({ createdBy: 1, status: 1 });
predictionScenarioSchema.index({ category: 1 });
predictionScenarioSchema.index({ savedAsTemplate: 1 });
predictionScenarioSchema.index({ visibility: 1 });

// Get templates
predictionScenarioSchema.statics.getTemplates = async function(category = null) {
  const query = { savedAsTemplate: true };
  if (category) query.category = category;
  
  return this.find(query)
    .select('scenarioId name description category templateName inputVariables')
    .sort({ createdAt: -1 });
};

// Clone scenario
predictionScenarioSchema.methods.clone = async function(newName, userId) {
  const clonedData = this.toObject();
  delete clonedData._id;
  delete clonedData.scenarioId;
  delete clonedData.createdAt;
  delete clonedData.updatedAt;
  delete clonedData.completedAt;
  
  clonedData.name = newName;
  clonedData.status = 'draft';
  clonedData.createdBy = userId;
  clonedData.savedAsTemplate = false;
  
  const Scenario = this.constructor;
  return new Scenario(clonedData).save();
};

// Get summary
predictionScenarioSchema.methods.getSummary = function() {
  return {
    scenarioId: this.scenarioId,
    name: this.name,
    category: this.category,
    type: this.type,
    status: this.status,
    timeHorizon: {
      start: this.timeHorizon?.startDate,
      end: this.timeHorizon?.endDate
    },
    inputCount: this.inputVariables?.length || 0,
    keyChange: this.comparison?.vsBaseline?.changePercent 
      ? `${this.comparison.vsBaseline.changePercent > 0 ? '+' : ''}${this.comparison.vsBaseline.changePercent.toFixed(1)}%`
      : 'N/A',
    riskLevel: this.riskAssessment?.overallRisk || 'unknown',
    recommendationCount: this.recommendations?.length || 0,
    createdAt: this.createdAt
  };
};

// Run simulation (placeholder - actual logic in service layer)
predictionScenarioSchema.methods.runSimulation = async function() {
  this.status = 'running';
  await this.save();
  
  // Simulation would be handled by the prediction service
  // This is just a state transition
  return this;
};

// Complete simulation
predictionScenarioSchema.methods.complete = async function(results) {
  this.projections = results.projections || [];
  this.comparison = results.comparison || {};
  this.sensitivityAnalysis = results.sensitivityAnalysis || [];
  this.riskAssessment = results.riskAssessment || {};
  this.recommendations = results.recommendations || [];
  this.monteCarloResults = results.monteCarloResults || {};
  this.model = results.model || {};
  this.status = 'completed';
  this.completedAt = new Date();
  
  return this.save();
};

module.exports = mongoose.model('PredictionScenario', predictionScenarioSchema);
