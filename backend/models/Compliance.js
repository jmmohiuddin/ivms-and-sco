const mongoose = require('mongoose');

const complianceSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  complianceType: {
    type: String,
    required: true,
    enum: [
      'regulatory',
      'financial',
      'operational',
      'environmental',
      'safety',
      'data-protection',
      'quality',
      'labor',
      'anti-corruption',
      'trade',
      'industry-specific',
      'other'
    ]
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['compliant', 'non-compliant', 'pending', 'under-review', 'expired', 'waived'],
    default: 'pending'
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  // Compliance Details
  requirementSource: {
    type: String,
    enum: ['government', 'industry', 'internal', 'contractual', 'international'],
    default: 'internal'
  },
  regulation: {
    name: String,
    code: String,
    jurisdiction: String
  },
  // Assessment
  assessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assessmentDate: Date,
  assessmentMethod: {
    type: String,
    enum: ['self-assessment', 'audit', 'third-party', 'automated', 'document-review']
  },
  assessmentScore: {
    type: Number,
    min: 0,
    max: 100
  },
  // Evidence and Documentation
  evidence: [{
    documentType: String,
    documentUrl: String,
    uploadedAt: Date,
    expiryDate: Date,
    verified: Boolean
  }],
  // Dates
  effectiveDate: Date,
  expiryDate: Date,
  nextReviewDate: Date,
  recordedAt: {
    type: Date,
    default: Date.now
  },
  // Non-compliance Details
  nonComplianceDetails: {
    findings: String,
    rootCause: String,
    impact: String,
    remediationPlan: String,
    remediationDeadline: Date,
    remediationStatus: {
      type: String,
      enum: ['not-started', 'in-progress', 'completed', 'overdue']
    }
  },
  // Risk Assessment
  riskLevel: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  financialImpact: Number,
  reputationalImpact: {
    type: String,
    enum: ['severe', 'moderate', 'minor', 'none']
  },
  // Audit Trail
  history: [{
    action: String,
    previousStatus: String,
    newStatus: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  // NLP Analysis Results
  nlpAnalysis: {
    processed: Boolean,
    processedAt: Date,
    extractedTerms: [String],
    riskIndicators: [{
      indicator: String,
      confidence: Number,
      context: String
    }],
    sentiment: String,
    summary: String
  },
  notes: String,
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes
complianceSchema.index({ vendor: 1, complianceType: 1 });
complianceSchema.index({ status: 1 });
complianceSchema.index({ expiryDate: 1 });
complianceSchema.index({ riskLevel: 1 });

module.exports = mongoose.model('Compliance', complianceSchema);
