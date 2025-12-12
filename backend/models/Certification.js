const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  certificationNumber: {
    type: String,
    required: true
  },
  certificationType: {
    type: String,
    required: true,
    enum: [
      'ISO',
      'SOC',
      'PCI-DSS',
      'HIPAA',
      'GDPR',
      'safety',
      'quality',
      'environmental',
      'industry',
      'professional',
      'government',
      'other'
    ]
  },
  category: {
    type: String,
    enum: [
      'quality-management',
      'information-security',
      'environmental',
      'health-safety',
      'financial',
      'industry-specific',
      'professional',
      'regulatory',
      'other'
    ]
  },
  // Certification Details
  issuingAuthority: {
    name: String,
    country: String,
    website: String,
    accreditationNumber: String
  },
  scope: String,
  standard: String,
  version: String,
  // Dates
  issueDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  lastAuditDate: Date,
  nextAuditDate: Date,
  // Status
  status: {
    type: String,
    enum: ['valid', 'expired', 'expiring-soon', 'suspended', 'revoked', 'archived'],
    default: 'valid'
  },
  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationMethod: {
    type: String,
    enum: ['manual', 'automated', 'third-party', 'issuer-verification']
  },
  verificationNotes: String,
  // Document
  documentUrl: String,
  documentHash: String,
  // OCR Processing
  ocrProcessed: {
    type: Boolean,
    default: false
  },
  ocrData: {
    rawText: String,
    extractedFields: mongoose.Schema.Types.Mixed,
    confidence: Number,
    processedAt: Date
  },
  // Renewal
  renewalReminder: {
    type: Boolean,
    default: true
  },
  renewalReminderDays: {
    type: Number,
    default: 30
  },
  previousCertification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certification'
  },
  // Audit History
  auditHistory: [{
    auditDate: Date,
    auditor: String,
    result: {
      type: String,
      enum: ['passed', 'conditional', 'failed']
    },
    findings: String,
    correctiveActions: String
  }],
  // History
  history: [{
    action: String,
    description: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  archivedAt: Date
}, {
  timestamps: true
});

// Indexes
certificationSchema.index({ vendor: 1, certificationType: 1 });
certificationSchema.index({ expiryDate: 1 });
certificationSchema.index({ status: 1 });
certificationSchema.index({ certificationNumber: 1 });

// Virtual for days until expiry
certificationSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  return Math.ceil((new Date(this.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
});

// Pre-save to update status based on expiry
certificationSchema.pre('save', function(next) {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  if (this.expiryDate < now) {
    this.status = 'expired';
  } else if (this.expiryDate < thirtyDays) {
    this.status = 'expiring-soon';
  }
  
  next();
});

module.exports = mongoose.model('Certification', certificationSchema);
