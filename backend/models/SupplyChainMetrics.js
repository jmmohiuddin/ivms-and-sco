const mongoose = require('mongoose');

const supplyChainMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  metrics: {
    // Delivery Performance
    onTimeDeliveryRate: { type: Number, min: 0, max: 100 },
    averageLeadTime: { type: Number }, // in days
    deliveryVariance: { type: Number }, // standard deviation in days
    
    // Quality Metrics
    defectRate: { type: Number, min: 0, max: 100 },
    returnRate: { type: Number, min: 0, max: 100 },
    qualityScore: { type: Number, min: 0, max: 100 },
    
    // Cost Metrics
    costPerUnit: { type: Number },
    priceVariance: { type: Number }, // % change from baseline
    totalSpend: { type: Number },
    
    // Inventory Metrics
    stockoutFrequency: { type: Number },
    inventoryTurnover: { type: Number },
    carryingCost: { type: Number },
    
    // Reliability
    orderFulfillmentRate: { type: Number, min: 0, max: 100 },
    responseTime: { type: Number }, // hours
    communicationScore: { type: Number, min: 0, max: 100 }
  },
  // Calculated composite scores
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Index for efficient queries
supplyChainMetricsSchema.index({ vendor: 1, date: -1 });

module.exports = mongoose.model('SupplyChainMetrics', supplyChainMetricsSchema);
