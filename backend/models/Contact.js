const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  // Link to vendor profile
  vendorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorProfile',
    required: true
  },
  
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  title: String,
  department: String,
  
  // Contact Details
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  mobile: String,
  fax: String,
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['primary', 'billing', 'technical', 'sales', 'compliance', 'executive', 'other'],
    default: 'primary'
  },
  isPrimaryContact: {
    type: Boolean,
    default: false
  },
  canApproveOrders: {
    type: Boolean,
    default: false
  },
  canAccessPortal: {
    type: Boolean,
    default: true
  },
  
  // Portal Access
  portalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastPortalLogin: Date,
  
  // KYC/Identity Verification
  kycStatus: {
    type: String,
    enum: ['not_started', 'pending', 'in_review', 'verified', 'failed', 'expired'],
    default: 'not_started'
  },
  kycVerifiedAt: Date,
  kycMethod: {
    type: String,
    enum: ['document', 'kba', 'video', 'manual', 'third_party']
  },
  kycProvider: String,
  kycReferenceId: String,
  kycExpiresAt: Date,
  
  // KBA (Knowledge-Based Authentication)
  kbaAttempts: {
    type: Number,
    default: 0
  },
  kbaLastAttempt: Date,
  kbaLocked: {
    type: Boolean,
    default: false
  },
  
  // Identity Documents
  identityDocuments: [{
    type: {
      type: String,
      enum: ['passport', 'drivers_license', 'national_id', 'other']
    },
    documentNumber: String,
    issuingCountry: String,
    expiryDate: Date,
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    verified: Boolean,
    verifiedAt: Date
  }],
  
  // Communication Preferences
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  preferredTimezone: String,
  communicationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    phone: { type: Boolean, default: false }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending_verification', 'suspended'],
    default: 'pending_verification'
  },
  
  // Notes
  notes: String,
  
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
contactSchema.index({ vendorProfile: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ isPrimaryContact: 1, vendorProfile: 1 });
contactSchema.index({ kycStatus: 1 });

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Static method to find primary contact
contactSchema.statics.findPrimaryContact = function(vendorProfileId) {
  return this.findOne({ vendorProfile: vendorProfileId, isPrimaryContact: true });
};

// Method to check if KYC is valid
contactSchema.methods.isKycValid = function() {
  if (this.kycStatus !== 'verified') return false;
  if (this.kycExpiresAt && this.kycExpiresAt < new Date()) return false;
  return true;
};

// Pre-save hook to ensure only one primary contact per vendor
contactSchema.pre('save', async function(next) {
  if (this.isPrimaryContact && this.isModified('isPrimaryContact')) {
    await this.constructor.updateMany(
      { vendorProfile: this.vendorProfile, _id: { $ne: this._id } },
      { isPrimaryContact: false }
    );
  }
  next();
});

module.exports = mongoose.model('Contact', contactSchema);
