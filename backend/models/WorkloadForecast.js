/**
 * Workload Forecast Model
 * Predicts operational workload for teams (AP, procurement, compliance)
 */

const mongoose = require('mongoose');

// Team workload schema
const teamWorkloadSchema = new mongoose.Schema({
  team: {
    type: String,
    enum: ['accounts_payable', 'procurement', 'compliance', 'onboarding', 'disputes', 'general'],
    required: true
  },
  
  // Current state
  currentBacklog: Number,
  averageProcessingTime: Number, // minutes
  teamCapacity: Number, // items per day
  utilizationRate: Number, // percentage
  
  // Predictions
  predictedVolume: {
    total: Number,
    breakdown: {
      invoices: Number,
      approvals: Number,
      reviews: Number,
      disputes: Number,
      onboardings: Number,
      complianceChecks: Number
    }
  },
  
  // Confidence
  confidenceInterval: {
    lower: Number,
    upper: Number
  },
  
  // Trend
  trend: {
    type: String,
    enum: ['increasing', 'stable', 'decreasing']
  },
  trendPercentage: Number,
  
  // Peak periods
  peakPeriods: [{
    date: Date,
    expectedVolume: Number,
    reason: String
  }],
  
  // Bottlenecks
  bottlenecks: [{
    stage: String,
    severity: String,
    expectedDelay: Number,
    suggestedAction: String
  }],
  
  // Staff recommendations
  staffingRecommendation: {
    currentFTE: Number,
    requiredFTE: Number,
    gap: Number,
    action: {
      type: String,
      enum: ['maintain', 'increase', 'redistribute', 'temporary_help']
    }
  }
}, { _id: false });

// SLA projection schema
const slaProjectionSchema = new mongoose.Schema({
  slaType: String,
  currentCompliance: Number,
  projectedCompliance: Number,
  atRisk: Boolean,
  riskFactors: [String],
  recommendations: [String]
}, { _id: false });

// Workload item schema
const workloadItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['invoice', 'approval', 'onboarding', 'compliance_review', 'dispute', 'contract_renewal']
  },
  itemId: mongoose.Schema.Types.ObjectId,
  description: String,
  estimatedArrival: Date,
  estimatedEffort: Number, // minutes
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent']
  },
  assignedTeam: String,
  slaDeadline: Date
}, { _id: false });

const workloadForecastSchema = new mongoose.Schema({
  // Forecast identification
  forecastId: {
    type: String,
    unique: true,
    default: function() {
      return `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  
  // Forecast scope
  scope: {
    type: {
      type: String,
      enum: ['organization', 'team', 'individual'],
      default: 'organization'
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String
  },
  
  // Time period
  period: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
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
  
  // Overall summary
  summary: {
    totalPredictedItems: Number,
    totalEstimatedHours: Number,
    averageDailyVolume: Number,
    peakDay: {
      date: Date,
      volume: Number
    },
    lowestDay: {
      date: Date,
      volume: Number
    },
    overallTrend: String,
    capacityStatus: {
      type: String,
      enum: ['under_capacity', 'optimal', 'near_capacity', 'over_capacity']
    }
  },
  
  // Team-level workloads
  teamWorkloads: [teamWorkloadSchema],
  
  // SLA projections
  slaProjections: [slaProjectionSchema],
  
  // Specific upcoming items
  upcomingItems: [workloadItemSchema],
  
  // Daily breakdown
  dailyBreakdown: [{
    date: Date,
    predictedVolume: Number,
    predictedHours: Number,
    isWeekend: Boolean,
    isHoliday: Boolean,
    holidayName: String,
    capacityUtilization: Number
  }],
  
  // Recommendations
  recommendations: [{
    type: {
      type: String,
      enum: ['redistribute', 'expedite', 'defer', 'staff_up', 'automate', 'outsource']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    team: String,
    description: String,
    estimatedImpact: String,
    deadline: Date
  }],
  
  // Feature contributions
  featureContributions: [{
    feature: String,
    contribution: Number,
    description: String
  }],
  
  // Model metadata
  model: {
    name: {
      type: String,
      enum: ['time_series', 'regression', 'ensemble'],
      default: 'ensemble'
    },
    version: String,
    accuracy: {
      mape: Number,
      rmse: Number
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'superseded', 'archived'],
    default: 'active'
  },
  
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
workloadForecastSchema.index({ forecastId: 1 });
workloadForecastSchema.index({ 'scope.type': 1, 'scope.entityId': 1 });
workloadForecastSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
workloadForecastSchema.index({ status: 1 });

// Get teams at capacity risk
workloadForecastSchema.methods.getTeamsAtRisk = function() {
  return this.teamWorkloads.filter(tw => 
    tw.utilizationRate > 85 || 
    tw.staffingRecommendation?.gap > 0 ||
    tw.bottlenecks?.length > 0
  );
};

// Get days with high volume
workloadForecastSchema.methods.getHighVolumeDays = function(threshold = 1.5) {
  const avgVolume = this.summary.averageDailyVolume || 0;
  return this.dailyBreakdown.filter(day => 
    day.predictedVolume > avgVolume * threshold
  );
};

// Get summary for dashboard
workloadForecastSchema.methods.getDashboardSummary = function() {
  const teamsAtRisk = this.getTeamsAtRisk();
  const highVolumeDays = this.getHighVolumeDays();
  const slasAtRisk = this.slaProjections.filter(s => s.atRisk);
  
  return {
    forecastId: this.forecastId,
    period: {
      start: this.period.startDate,
      end: this.period.endDate
    },
    summary: this.summary,
    alerts: {
      teamsAtRisk: teamsAtRisk.length,
      highVolumeDays: highVolumeDays.length,
      slasAtRisk: slasAtRisk.length,
      urgentRecommendations: this.recommendations.filter(r => r.priority === 'urgent').length
    },
    teamBreakdown: this.teamWorkloads.map(tw => ({
      team: tw.team,
      utilization: tw.utilizationRate,
      trend: tw.trend,
      status: tw.utilizationRate > 90 ? 'critical' : 
              tw.utilizationRate > 75 ? 'warning' : 'healthy'
    }))
  };
};

module.exports = mongoose.model('WorkloadForecast', workloadForecastSchema);
