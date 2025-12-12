/**
 * Spend Forecast Model
 * Stores spend predictions by vendor, category, project, cost center
 */

const mongoose = require('mongoose');

// Forecast breakdown schema
const forecastBreakdownSchema = new mongoose.Schema({
  dimension: {
    type: String,
    enum: ['vendor', 'category', 'project', 'cost_center', 'department'],
    required: true
  },
  dimensionId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'breakdowns.dimensionModel'
  },
  dimensionModel: {
    type: String,
    enum: ['Vendor', 'Category', 'Project', 'CostCenter', 'Department']
  },
  dimensionName: String,
  predictedAmount: Number,
  confidenceLow: Number,
  confidenceHigh: Number,
  percentageOfTotal: Number,
  trend: {
    type: String,
    enum: ['increasing', 'stable', 'decreasing']
  },
  trendPercentage: Number
}, { _id: false });

// Seasonality component schema
const seasonalitySchema = new mongoose.Schema({
  component: {
    type: String,
    enum: ['yearly', 'quarterly', 'monthly', 'weekly', 'holiday']
  },
  impact: Number, // percentage impact
  phase: Number,  // timing offset
  description: String
}, { _id: false });

// Budget alert schema
const budgetAlertSchema = new mongoose.Schema({
  budgetId: mongoose.Schema.Types.ObjectId,
  budgetName: String,
  budgetAmount: Number,
  projectedSpend: Number,
  projectedExceedDate: Date,
  exceedPercentage: Number,
  severity: {
    type: String,
    enum: ['warning', 'critical']
  },
  alertedAt: Date,
  acknowledged: { type: Boolean, default: false }
}, { _id: false });

// Feature contribution schema (SHAP-like explanations)
const featureContributionSchema = new mongoose.Schema({
  feature: String,
  value: mongoose.Schema.Types.Mixed,
  contribution: Number,
  direction: {
    type: String,
    enum: ['positive', 'negative']
  },
  description: String
}, { _id: false });

const spendForecastSchema = new mongoose.Schema({
  // Forecast identification
  forecastId: {
    type: String,
    unique: true,
    default: function() {
      return `SF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  
  // Forecast scope
  scope: {
    type: {
      type: String,
      enum: ['organization', 'vendor', 'category', 'project', 'cost_center'],
      default: 'organization'
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String
  },
  
  // Time period
  period: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  // Prediction values
  prediction: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    confidenceLevel: {
      type: Number, // 0-100
      default: 95
    },
    confidenceInterval: {
      lower: Number,
      upper: Number
    },
    standardError: Number
  },
  
  // Historical comparison
  historical: {
    previousPeriodActual: Number,
    yearOverYearActual: Number,
    averagePeriodSpend: Number,
    changeFromPrevious: Number, // percentage
    changeFromYoY: Number // percentage
  },
  
  // Breakdowns by dimension
  breakdowns: [forecastBreakdownSchema],
  
  // Seasonality analysis
  seasonality: [seasonalitySchema],
  
  // Budget alerts
  budgetAlerts: [budgetAlertSchema],
  
  // Feature contributions (explainability)
  featureContributions: [featureContributionSchema],
  
  // Model metadata
  model: {
    name: {
      type: String,
      enum: ['prophet', 'arima', 'lstm', 'deepar', 'ensemble', 'heuristic'],
      default: 'ensemble'
    },
    version: String,
    trainedAt: Date,
    accuracy: {
      mape: Number, // Mean Absolute Percentage Error
      rmse: Number, // Root Mean Square Error
      r2: Number    // R-squared
    },
    dataPoints: Number,
    features: [String]
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'superseded', 'archived'],
    default: 'active'
  },
  
  // Tracking
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Supersession
  supersededBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpendForecast'
  },
  supersedes: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpendForecast'
  }
}, {
  timestamps: true
});

// Indexes
spendForecastSchema.index({ forecastId: 1 });
spendForecastSchema.index({ 'scope.type': 1, 'scope.entityId': 1 });
spendForecastSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
spendForecastSchema.index({ status: 1, createdAt: -1 });
spendForecastSchema.index({ 'budgetAlerts.severity': 1 });

// Get active forecast for scope and period
spendForecastSchema.statics.getActiveForecast = async function(scopeType, entityId, startDate, endDate) {
  return this.findOne({
    'scope.type': scopeType,
    ...(entityId && { 'scope.entityId': entityId }),
    'period.startDate': { $lte: startDate },
    'period.endDate': { $gte: endDate },
    status: 'active'
  }).sort({ createdAt: -1 });
};

// Get forecasts with budget alerts
spendForecastSchema.statics.getAlertForecasts = async function(severity = null) {
  const query = {
    status: 'active',
    'budgetAlerts.0': { $exists: true }
  };
  
  if (severity) {
    query['budgetAlerts.severity'] = severity;
  }
  
  return this.find(query).sort({ 'budgetAlerts.projectedExceedDate': 1 });
};

// Generate forecast summary
spendForecastSchema.methods.getSummary = function() {
  return {
    forecastId: this.forecastId,
    scope: this.scope,
    period: {
      type: this.period.type,
      start: this.period.startDate,
      end: this.period.endDate
    },
    prediction: {
      amount: this.prediction.amount,
      range: `${this.prediction.confidenceInterval?.lower?.toFixed(2)} - ${this.prediction.confidenceInterval?.upper?.toFixed(2)}`,
      confidence: `${this.prediction.confidenceLevel}%`
    },
    trend: this.getTrend(),
    alertCount: this.budgetAlerts?.length || 0,
    criticalAlerts: this.budgetAlerts?.filter(a => a.severity === 'critical').length || 0
  };
};

// Calculate overall trend
spendForecastSchema.methods.getTrend = function() {
  const change = this.historical?.changeFromPrevious || 0;
  if (change > 5) return { direction: 'increasing', percentage: change };
  if (change < -5) return { direction: 'decreasing', percentage: Math.abs(change) };
  return { direction: 'stable', percentage: Math.abs(change) };
};

// Check if forecast will exceed budget
spendForecastSchema.methods.checkBudgetExceed = function(budgetAmount) {
  if (!budgetAmount) return null;
  
  const upperBound = this.prediction.confidenceInterval?.upper || this.prediction.amount;
  
  if (upperBound > budgetAmount) {
    return {
      willExceed: true,
      exceedAmount: upperBound - budgetAmount,
      exceedPercentage: ((upperBound - budgetAmount) / budgetAmount) * 100,
      probability: this.prediction.amount > budgetAmount ? 'high' : 'medium'
    };
  }
  
  return { willExceed: false };
};

module.exports = mongoose.model('SpendForecast', spendForecastSchema);
