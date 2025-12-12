const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Firebase UID (primary identifier)
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  
  photoURL: {
    type: String,
    default: null
  },
  
  // Legacy password field (kept for backward compatibility)
  password: {
    type: String,
    select: false
  },
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['admin', 'vendor', 'user', 'approver', 'finance', 'manager'],
    default: 'user'
  },
  
  permissions: [{
    type: String,
    enum: [
      'view_vendors',
      'edit_vendors',
      'approve_vendors',
      'view_invoices',
      'edit_invoices',
      'approve_invoices',
      'view_compliance',
      'manage_compliance',
      'view_analytics',
      'view_predictions',
      'manage_users',
      'system_admin'
    ]
  }],
  
  // Company/Organization Information
  company: {
    name: String,
    department: String,
    position: String,
    employeeId: String
  },
  
  // Contact Information
  phone: {
    type: String,
    trim: true
  },
  
  // Vendor-specific fields
  vendorProfile: {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    companyName: String,
    taxId: String,
    businessType: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Activity Tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    signupSource: {
      type: String,
      enum: ['web', 'mobile', 'api', 'import'],
      default: 'web'
    }
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'company.name': 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full permissions based on role
userSchema.virtual('allPermissions').get(function() {
  const rolePermissions = {
    admin: ['system_admin', 'manage_users', 'view_analytics', 'view_predictions', 'manage_compliance', 'approve_invoices', 'approve_vendors'],
    finance: ['view_invoices', 'edit_invoices', 'approve_invoices', 'view_analytics', 'view_vendors'],
    approver: ['view_vendors', 'approve_vendors', 'view_invoices', 'approve_invoices', 'view_compliance'],
    manager: ['view_vendors', 'edit_vendors', 'view_invoices', 'view_analytics'],
    vendor: ['view_invoices', 'view_compliance'],
    user: ['view_vendors', 'view_invoices', 'view_compliance']
  };
  
  return [...new Set([...rolePermissions[this.role] || [], ...this.permissions])];
});

// Method to check if user has specific permission
userSchema.methods.hasPermission = function(permission) {
  return this.allPermissions.includes(permission);
};

// Method to update last login
userSchema.methods.recordLogin = async function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  await this.save();
};

// Static method to find or create user from Firebase
userSchema.statics.findOrCreateFromFirebase = async function(firebaseUser) {
  let user = await this.findOne({ firebaseUid: firebaseUser.uid });
  
  if (!user) {
    // Determine role based on email
    let role = 'user';
    const email = firebaseUser.email.toLowerCase();
    
    if (email.includes('@admin') || email.includes('admin@')) {
      role = 'admin';
    } else if (email.includes('@vendor') || email.includes('vendor@')) {
      role = 'vendor';
    } else if (email.includes('@finance')) {
      role = 'finance';
    } else if (email.includes('@approver')) {
      role = 'approver';
    }
    
    user = await this.create({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
      photoURL: firebaseUser.photoURL,
      role: role,
      isEmailVerified: firebaseUser.emailVerified,
      metadata: {
        signupSource: 'web'
      }
    });
    
    console.log(`✅ New user created: ${user.email} (${user.role})`);
  } else {
    // Update user info from Firebase
    user.displayName = firebaseUser.displayName || user.displayName;
    user.photoURL = firebaseUser.photoURL || user.photoURL;
    user.isEmailVerified = firebaseUser.emailVerified;
    await user.recordLogin();
  }
  
  return user;
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Auto-assign permissions based on role if not set
  if (this.isModified('role') && this.permissions.length === 0) {
    const rolePermissions = {
      admin: ['system_admin', 'manage_users', 'view_analytics'],
      finance: ['view_invoices', 'edit_invoices', 'approve_invoices'],
      approver: ['approve_vendors', 'approve_invoices'],
      manager: ['view_vendors', 'edit_vendors', 'view_invoices'],
      vendor: ['view_invoices'],
      user: ['view_vendors', 'view_invoices']
    };
    
    this.permissions = rolePermissions[this.role] || [];
  }
  
  next();
});

module.exports = mongoose.model('User', userSchema);
