const mongoose = require('mongoose');

const featureContributionSchema = new mongoose.Schema({
  feature: {
    type: String,
    required: true
  },
  value: mongoose.Schema.Types.Mixed,
  contribution: {
    type: Number, // Can be positive or negative
    required: true
  },
  weight: Number,
  description: String
});

const riskScoreSchema = new mongoose.Schema({
  // Ownership
  vendorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true
  },
  onboardingCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingCase'
  },
  
  // Score Type
  scoreType: {
    type: String,
    enum: ['onboarding', 'periodic', 'event_triggered', 'manual'],
    default: 'onboarding'
  },
  
  // Overall Score
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  riskTier: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  
  // Component Scores
  componentScores: {
    documentConfidence: {
      score: Number,
      weight: Number,
      factors: [String]
    },
    sanctionsRisk: {
      score: Number,
      weight: Number,
      hits: Number,
      sources: [String]
    },
    geographicRisk: {
      score: Number,
      weight: Number,
      countries: [String],
      highRiskCountries: [String]
    },
    financialRisk: {
      score: Number,
      weight: Number,
      factors: [String]
    },
    operationalRisk: {
      score: Number,
      weight: Number,
      factors: [String]
    },
    complianceRisk: {
      score: Number,
      weight: Number,
      missingCertifications: [String],
      expiredCertifications: [String]
    },
    reputationalRisk: {
      score: Number,
      weight: Number,
      adverseNewsCount: Number,
      sources: [String]
    },
    fraudRisk: {
      score: Number,
      weight: Number,
      indicators: [String]
    }
  },
  
  // Feature Contributions (SHAP-like explanations)
  featureContributions: [featureContributionSchema],
  
  // Top Risk Factors
  topRiskFactors: [{
    factor: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    recommendation: String
  }],
  
  // Model Information
  modelVersion: {
    type: String,
    required: true
  },
  modelName: String,
  algorithmType: {
    type: String,
    enum: ['rule_based', 'ml_supervised', 'ml_unsupervised', 'hybrid'],
    default: 'hybrid'
  },
  
  // Confidence in Score
  scoreConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Thresholds Used
  thresholds: {
    autoApprove: Number,
    lowRisk: Number,
    mediumRisk: Number,
    highRisk: Number,
    critical: Number
  },
  
  // Decision
  recommendedAction: {
    type: String,
    enum: ['auto_approve', 'standard_review', 'enhanced_review', 'reject', 'escalate'],
    required: true
  },
  
  // Overrides
  overridden: {
    type: Boolean,
    default: false
  },
  overriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  overriddenAt: Date,
  overrideReason: String,
  originalTier: String,
  
  // Data Inputs (snapshot)
  inputData: {
    type: mongoose.Schema.Types.Mixed,
    select: false // Don't include by default in queries
  },
  
  // Validity
  validUntil: Date,
  supersededBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RiskScore'
  },
  isLatest: {
    type: Boolean,
    default: true
  },
  
  // Audit
  calculatedBy: {
    type: String,
    enum: ['system', 'manual', 'api'],
    default: 'system'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
riskScoreSchema.index({ vendorProfile: 1, createdAt: -1 });
riskScoreSchema.index({ onboardingCase: 1 });
riskScoreSchema.index({ riskTier: 1 });
riskScoreSchema.index({ isLatest: 1, vendorProfile: 1 });
riskScoreSchema.index({ createdAt: -1 });

// Static method to determine risk tier from score
riskScoreSchema.statics.calculateRiskTier = function(score, thresholds = {}) {
  const { lowRisk = 30, mediumRisk = 50, highRisk = 70 } = thresholds;
  
  if (score <= lowRisk) return 'low';
  if (score <= mediumRisk) return 'medium';
  if (score <= highRisk) return 'high';
  return 'critical';
};

// Static method to determine recommended action
riskScoreSchema.statics.determineAction = function(tier, autoApproveThreshold, score) {
  if (tier === 'low' && score <= autoApproveThreshold) {
    return 'auto_approve';
  }
  
  switch (tier) {
    case 'low':
      return 'standard_review';
    case 'medium':
      return 'standard_review';
    case 'high':
      return 'enhanced_review';
    case 'critical':
      return 'escalate';
    default:
      return 'standard_review';
  }
};

// Method to get explanation summary
riskScoreSchema.methods.getExplanationSummary = function() {
  const summary = {
    overallScore: this.overallScore,
    riskTier: this.riskTier,
    topFactors: this.topRiskFactors.slice(0, 5),
    keyContributions: this.featureContributions
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5),
    recommendation: this.recommendedAction
  };
  
  return summary;
};

// Pre-save hook to mark previous scores as not latest
riskScoreSchema.pre('save', async function(next) {
  if (this.isNew && this.isLatest) {
    await this.constructor.updateMany(
      { vendorProfile: this.vendorProfile, _id: { $ne: this._id } },
      { isLatest: false }
    );
  }
  next();
});

module.exports = mongoose.model('RiskScore', riskScoreSchema);
