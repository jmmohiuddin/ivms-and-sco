const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['headquarters', 'billing', 'shipping', 'registered', 'other'],
    default: 'headquarters'
  },
  street1: String,
  street2: String,
  city: String,
  state: String,
  postalCode: String,
  country: {
    type: String,
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date
});

const taxIdSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['EIN', 'VAT', 'GST', 'TIN', 'SSN', 'ITIN', 'ABN', 'other'],
    required: true
  },
  value: {
    type: String,
    required: true
  },
  country: String,
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verificationSource: String
});

const bankAccountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: true
  },
  bankName: String,
  accountNumber: {
    type: String,
    required: true
  },
  routingNumber: String,
  swiftCode: String,
  iban: String,
  country: String,
  currency: {
    type: String,
    default: 'USD'
  },
  accountType: {
    type: String,
    enum: ['checking', 'savings', 'business'],
    default: 'business'
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['micro_deposit', 'instant_verification', 'manual', 'bank_statement'],
  },
  verifiedAt: Date
});

const classificationSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  subCategory: String,
  naicsCode: String,
  sicCode: String,
  unspscCode: String,
  tags: [String]
});

const vendorProfileSchema = new mongoose.Schema({
  // Link to base Vendor model (if exists)
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  
  // Core Legal Information
  legalName: {
    type: String,
    required: true,
    trim: true
  },
  dbaName: {
    type: String,
    trim: true
  },
  registrationNumber: {
    type: String,
    trim: true
  },
  incorporationDate: Date,
  incorporationCountry: String,
  incorporationState: String,
  businessType: {
    type: String,
    enum: ['corporation', 'llc', 'partnership', 'sole_proprietorship', 'nonprofit', 'government', 'other']
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'in_review', 'approved', 'rejected', 'suspended', 'inactive'],
    default: 'draft'
  },
  
  // Addresses
  addresses: [addressSchema],
  
  // Tax Information
  taxIds: [taxIdSchema],
  taxExempt: {
    type: Boolean,
    default: false
  },
  taxExemptCertificate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  
  // Bank Accounts
  bankAccounts: [bankAccountSchema],
  
  // Classification
  classifications: [classificationSchema],
  primaryCategory: String,
  
  // Size & Spend
  employeeCount: Number,
  annualRevenue: Number,
  estimatedAnnualSpend: Number,
  spendTier: {
    type: String,
    enum: ['tier1', 'tier2', 'tier3', 'tier4'],
    default: 'tier3'
  },
  
  // Risk & Compliance
  riskTier: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  currentRiskScore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RiskScore'
  },
  
  // Sanctions & Compliance Checks
  sanctionsStatus: {
    type: String,
    enum: ['clear', 'flagged', 'pending', 'not_checked'],
    default: 'not_checked'
  },
  lastSanctionsCheck: Date,
  pepStatus: {
    type: String,
    enum: ['clear', 'flagged', 'pending', 'not_checked'],
    default: 'not_checked'
  },
  
  // Certifications & Compliance
  certifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certification'
  }],
  
  // Diversity Classifications
  diversityClassifications: [{
    type: {
      type: String,
      enum: ['MBE', 'WBE', 'WOSB', 'VOSB', 'SDVOSB', 'HUBZone', '8a', 'DBE', 'LGBTBE', 'other']
    },
    certified: Boolean,
    certificationNumber: String,
    expiryDate: Date,
    certifyingBody: String
  }],
  
  // Insurance
  insurancePolicies: [{
    type: {
      type: String,
      enum: ['general_liability', 'professional_liability', 'workers_comp', 'auto', 'cyber', 'umbrella', 'other']
    },
    carrier: String,
    policyNumber: String,
    coverageAmount: Number,
    deductible: Number,
    effectiveDate: Date,
    expiryDate: Date,
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }
  }],
  
  // Onboarding
  onboardingCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OnboardingCase'
  },
  onboardedAt: Date,
  onboardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Data Quality
  dataCompleteness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastDataQualityCheck: Date,
  
  // Metadata
  source: {
    type: String,
    enum: ['self_service', 'internal', 'bulk_import', 'api', 'migration'],
    default: 'self_service'
  },
  externalIds: [{
    system: String,
    id: String
  }],
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vendorProfileSchema.index({ legalName: 'text', dbaName: 'text' });
vendorProfileSchema.index({ status: 1 });
vendorProfileSchema.index({ riskTier: 1 });
vendorProfileSchema.index({ 'taxIds.value': 1 });
vendorProfileSchema.index({ registrationNumber: 1 });
vendorProfileSchema.index({ createdAt: -1 });

// Virtual for primary address
vendorProfileSchema.virtual('primaryAddress').get(function() {
  return this.addresses.find(a => a.isPrimary) || this.addresses[0];
});

// Virtual for primary bank account
vendorProfileSchema.virtual('primaryBankAccount').get(function() {
  return this.bankAccounts.find(b => b.isPrimary) || this.bankAccounts[0];
});

// Method to calculate data completeness
vendorProfileSchema.methods.calculateDataCompleteness = function() {
  const requiredFields = [
    'legalName',
    'registrationNumber',
    'businessType',
    'addresses',
    'taxIds',
    'bankAccounts',
    'primaryCategory'
  ];
  
  const optionalFields = [
    'dbaName',
    'incorporationDate',
    'employeeCount',
    'annualRevenue',
    'certifications',
    'insurancePolicies'
  ];
  
  let score = 0;
  const requiredWeight = 0.7;
  const optionalWeight = 0.3;
  
  // Check required fields
  let requiredCount = 0;
  requiredFields.forEach(field => {
    const value = this[field];
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      requiredCount++;
    }
  });
  
  // Check optional fields
  let optionalCount = 0;
  optionalFields.forEach(field => {
    const value = this[field];
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      optionalCount++;
    }
  });
  
  score = (requiredCount / requiredFields.length) * requiredWeight * 100 +
          (optionalCount / optionalFields.length) * optionalWeight * 100;
  
  this.dataCompleteness = Math.round(score);
  return this.dataCompleteness;
};

// Pre-save hook to update data completeness
vendorProfileSchema.pre('save', function(next) {
  this.calculateDataCompleteness();
  next();
});

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
