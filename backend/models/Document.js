const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  fileData: {
    type: Buffer,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  documentType: {
    type: String,
    enum: ['invoice', 'contract', 'certificate', 'compliance', 'tax', 'identity', 'other'],
    default: 'other'
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'processed', 'failed'],
    default: 'uploaded'
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed
  },
  tags: [{
    type: String
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster queries
DocumentSchema.index({ vendorId: 1, createdAt: -1 });
DocumentSchema.index({ invoiceId: 1, createdAt: -1 });
DocumentSchema.index({ documentType: 1 });
DocumentSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Document', DocumentSchema);
