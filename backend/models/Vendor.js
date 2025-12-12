const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a vendor name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'USA'
    }
  },
  category: {
    type: String,
    enum: ['raw-materials', 'packaging', 'logistics', 'technology', 'services', 'other'],
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  performanceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'blacklisted'],
    default: 'pending'
  },
  contactPerson: {
    name: String,
    email: String,
    phone: String,
    position: String
  },
  contractDetails: {
    startDate: Date,
    endDate: Date,
    terms: String,
    paymentTerms: String
  },
  certifications: [{
    name: String,
    issuedBy: String,
    validUntil: Date
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search optimization
vendorSchema.index({ name: 'text', category: 1, status: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
