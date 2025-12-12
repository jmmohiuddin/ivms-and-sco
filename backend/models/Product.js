const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  sku: {
    type: String,
    required: [true, 'Please add a SKU'],
    unique: true,
    uppercase: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['piece', 'kg', 'liter', 'meter', 'box', 'pallet']
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  inventory: {
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    minStock: {
      type: Number,
      default: 10
    },
    maxStock: {
      type: Number,
      default: 1000
    },
    reorderPoint: {
      type: Number,
      default: 20
    },
    location: String
  },
  leadTime: {
    type: Number, // in days
    default: 7
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search optimization
productSchema.index({ name: 'text', sku: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);
