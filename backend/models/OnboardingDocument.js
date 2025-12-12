const mongoose = require('mongoose');

const extractedFieldSchema = new mongoose.Schema({
  fieldName: {
    type: String,
    required: true
  },
  value: mongoose.Schema.Types.Mixed,
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  boundingBox: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    page: Number
  },
  source: {
    type: String,
    enum: ['ocr', 'nlp', 'manual', 'api'],
    default: 'ocr'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  originalValue: mongoose.Schema.Types.Mixed, // Before any corrections
  correctedValue: mongoose.Schema.Types.Mixed
});

const validationResultSchema = new mongoose.Schema({
  rule: {
    type: String,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  message: String,
  severity: {
    type: String,
    enum: ['error', 'warning', 'info'],
    default: 'error'
  },
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

const onboardingDocumentSchema = new mongoose.Schema({
  // Ownership
  vendorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile'
  },
  onboardingCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingCase'
  },
  
  // Document Classification
  documentType: {
    type: String,
    required: true,
    enum: [
      // Registration & Legal
      'business_registration', 'articles_of_incorporation', 'certificate_of_good_standing',
      'operating_agreement', 'partnership_agreement',
      
      // Tax Documents
      'w9', 'w8ben', 'w8bene', 'tax_registration', 'vat_certificate', 'gst_certificate',
      'tax_exemption_certificate',
      
      // Bank Documents
      'bank_statement', 'voided_check', 'bank_letter', 'bank_verification_letter',
      
      // Identity
      'passport', 'drivers_license', 'national_id', 'utility_bill', 'government_id',
      
      // Insurance
      'insurance_certificate', 'coi', 'workers_comp_certificate',
      
      // Certifications
      'iso_certificate', 'quality_certificate', 'compliance_certificate',
      'diversity_certificate', 'safety_certificate',
      
      // Contracts
      'master_agreement', 'nda', 'terms_and_conditions', 'sow', 'purchase_agreement',
      
      // Financial
      'financial_statement', 'audit_report', 'credit_report',
      
      // Other
      'reference_letter', 'capability_statement', 'product_catalog', 'other'
    ]
  },
  documentCategory: {
    type: String,
    enum: ['legal', 'tax', 'banking', 'identity', 'insurance', 'certification', 'contract', 'financial', 'other'],
    required: true
  },
  
  // File Information
  originalFileName: {
    type: String,
    required: true
  },
  storedFileName: String,
  filePath: String,
  fileUrl: String,
  mimeType: String,
  fileSize: Number, // in bytes
  fileHash: String, // SHA-256 hash for integrity
  
  // Document Details
  title: String,
  description: String,
  language: {
    type: String,
    default: 'en'
  },
  pageCount: Number,
  
  // Processing Status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'manual_required'],
    default: 'pending'
  },
  processingError: String,
  processingAttempts: {
    type: Number,
    default: 0
  },
  lastProcessedAt: Date,
  
  // OCR Results
  ocrStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'not_applicable'],
    default: 'pending'
  },
  ocrConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  rawOcrText: String,
  ocrEngine: String,
  ocrLanguage: String,
  
  // Extracted Fields
  extractedFields: [extractedFieldSchema],
  extractedData: mongoose.Schema.Types.Mixed, // Structured extracted data
  
  // NLP Analysis (for contracts)
  nlpAnalysis: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'not_applicable']
    },
    clauses: [{
      type: String,
      text: String,
      startPosition: Number,
      endPosition: Number,
      risk: String,
      notes: String
    }],
    entities: [{
      type: String,
      value: String,
      confidence: Number
    }],
    sentiment: {
      score: Number,
      classification: String
    },
    riskIndicators: [{
      type: String,
      severity: String,
      description: String,
      location: String
    }],
    summary: String
  },
  
  // Validation
  validationStatus: {
    type: String,
    enum: ['pending', 'valid', 'invalid', 'needs_review', 'expired'],
    default: 'pending'
  },
  validationResults: [validationResultSchema],
  crossFieldValidation: [{
    field1: String,
    field2: String,
    rule: String,
    passed: Boolean,
    message: String
  }],
  
  // Fraud / Tampering Detection
  fraudCheckStatus: {
    type: String,
    enum: ['pending', 'clear', 'suspicious', 'confirmed_fraud', 'not_applicable'],
    default: 'pending'
  },
  fraudIndicators: [{
    type: String,
    severity: String,
    description: String,
    confidence: Number
  }],
  
  // Document Validity
  issueDate: Date,
  expiryDate: Date,
  isExpired: {
    type: Boolean,
    default: false
  },
  expiryNotificationSent: Boolean,
  
  // Verification
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'needs_review'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  verificationMethod: {
    type: String,
    enum: ['automated', 'manual', 'third_party', 'hybrid']
  },
  verificationNotes: String,
  rejectionReason: String,
  
  // Quality Metrics
  imageQuality: {
    score: Number,
    issues: [String] // e.g., 'blurry', 'low_resolution', 'skewed'
  },
  
  // Document Version
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    documentId: mongoose.Schema.Types.ObjectId,
    replacedAt: Date,
    reason: String
  }],
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingDocument'
  },
  
  // Retention
  retentionPolicy: String,
  retainUntil: Date,
  markedForDeletion: {
    type: Boolean,
    default: false
  },
  
  // Access Control
  accessLevel: {
    type: String,
    enum: ['public', 'internal', 'restricted', 'confidential'],
    default: 'internal'
  },
  accessLog: [{
    userId: mongoose.Schema.Types.ObjectId,
    action: String,
    timestamp: Date,
    ipAddress: String
  }],
  
  // Audit
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedByType: {
    type: String,
    enum: ['vendor', 'internal', 'system', 'api'],
    default: 'vendor'
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
onboardingDocumentSchema.index({ vendorProfile: 1, documentType: 1 });
onboardingDocumentSchema.index({ onboardingCase: 1 });
onboardingDocumentSchema.index({ processingStatus: 1 });
onboardingDocumentSchema.index({ verificationStatus: 1 });
onboardingDocumentSchema.index({ expiryDate: 1 });
onboardingDocumentSchema.index({ fileHash: 1 });
onboardingDocumentSchema.index({ createdAt: -1 });

// Virtual for is document valid
onboardingDocumentSchema.virtual('isValid').get(function() {
  if (this.verificationStatus !== 'verified') return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  if (this.fraudCheckStatus === 'suspicious' || this.fraudCheckStatus === 'confirmed_fraud') return false;
  return true;
});

// Virtual for overall confidence
onboardingDocumentSchema.virtual('overallConfidence').get(function() {
  if (!this.extractedFields || this.extractedFields.length === 0) return 0;
  
  const avgConfidence = this.extractedFields.reduce((sum, field) => 
    sum + (field.confidence || 0), 0) / this.extractedFields.length;
  
  return Math.round(avgConfidence * 100) / 100;
});

// Method to check if document needs reprocessing
onboardingDocumentSchema.methods.needsReprocessing = function() {
  if (this.processingStatus === 'failed') return true;
  if (this.ocrConfidence && this.ocrConfidence < 0.7) return true;
  if (this.imageQuality?.score && this.imageQuality.score < 0.5) return true;
  return false;
};

// Method to add validation result
onboardingDocumentSchema.methods.addValidationResult = function(rule, passed, message, severity = 'error') {
  this.validationResults.push({
    rule,
    passed,
    message,
    severity,
    checkedAt: new Date()
  });
  
  // Update overall validation status
  const failedErrors = this.validationResults.filter(v => !v.passed && v.severity === 'error');
  if (failedErrors.length > 0) {
    this.validationStatus = 'invalid';
  } else {
    const failedWarnings = this.validationResults.filter(v => !v.passed && v.severity === 'warning');
    this.validationStatus = failedWarnings.length > 0 ? 'needs_review' : 'valid';
  }
};

// Pre-save hook to check expiry
onboardingDocumentSchema.pre('save', function(next) {
  if (this.expiryDate) {
    this.isExpired = this.expiryDate < new Date();
  }
  next();
});

module.exports = mongoose.model('OnboardingDocument', onboardingDocumentSchema);
