const mongoose = require('mongoose');

const demandForecastSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  forecastDate: {
    type: Date,
    required: true
  },
  forecastPeriod: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    default: 'monthly'
  },
  predictions: {
    demandQuantity: { type: Number, required: true },
    confidenceLevel: { type: Number, min: 0, max: 100 },
    lowerBound: { type: Number },
    upperBound: { type: Number }
  },
  factors: {
    seasonality: { type: Number },
    trend: { type: Number },
    historicalAverage: { type: Number },
    externalFactors: [{
      name: String,
      impact: Number
    }]
  },
  modelUsed: {
    type: String,
    enum: ['moving_average', 'exponential_smoothing', 'arima', 'prophet', 'lstm', 'ensemble'],
    default: 'exponential_smoothing'
  },
  accuracy: {
    mape: { type: Number }, // Mean Absolute Percentage Error
    rmse: { type: Number }, // Root Mean Square Error
    mae: { type: Number }   // Mean Absolute Error
  },
  status: {
    type: String,
    enum: ['pending', 'generated', 'validated', 'applied'],
    default: 'pending'
  },
  generatedBy: {
    type: String,
    enum: ['system', 'manual', 'ml-service'],
    default: 'system'
  }
}, {
  timestamps: true
});

demandForecastSchema.index({ product: 1, forecastDate: -1 });

module.exports = mongoose.model('DemandForecast', demandForecastSchema);
