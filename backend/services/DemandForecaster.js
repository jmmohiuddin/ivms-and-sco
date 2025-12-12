/**
 * Demand Forecasting Service
 * Uses statistical methods for demand prediction
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const DemandForecast = require('../models/DemandForecast');

class DemandForecaster {
  
  /**
   * Simple Moving Average
   */
  static movingAverage(data, period) {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  /**
   * Exponential Moving Average (EMA)
   */
  static exponentialMovingAverage(data, alpha = 0.3) {
    if (data.length === 0) return 0;
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = alpha * data[i] + (1 - alpha) * ema;
    }
    return ema;
  }

  /**
   * Double Exponential Smoothing (Holt's Method)
   * Captures level and trend
   */
  static doubleExponentialSmoothing(data, alpha = 0.3, beta = 0.1, periods = 3) {
    if (data.length < 2) return { forecast: data[0] || 0, trend: 0 };

    let level = data[0];
    let trend = data[1] - data[0];

    for (let i = 1; i < data.length; i++) {
      const prevLevel = level;
      level = alpha * data[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    // Forecast future periods
    const forecasts = [];
    for (let i = 1; i <= periods; i++) {
      forecasts.push(level + i * trend);
    }

    return {
      level,
      trend,
      forecasts,
      forecast: level + trend
    };
  }

  /**
   * Triple Exponential Smoothing (Holt-Winters)
   * Captures level, trend, and seasonality
   */
  static tripleExponentialSmoothing(data, seasonLength = 12, alpha = 0.3, beta = 0.1, gamma = 0.1, periods = 3) {
    if (data.length < seasonLength * 2) {
      return this.doubleExponentialSmoothing(data, alpha, beta, periods);
    }

    // Initialize
    const seasons = [];
    let level = data.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
    let trend = 0;

    for (let i = 0; i < seasonLength; i++) {
      const secondPeriodAvg = data.slice(seasonLength, seasonLength * 2).reduce((a, b) => a + b, 0) / seasonLength;
      trend += (data[seasonLength + i] - data[i]) / seasonLength;
      seasons.push(data[i] / level);
    }
    trend /= seasonLength;

    // Smooth
    for (let i = seasonLength; i < data.length; i++) {
      const prevLevel = level;
      const seasonIndex = i % seasonLength;
      level = alpha * (data[i] / seasons[seasonIndex]) + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      seasons[seasonIndex] = gamma * (data[i] / level) + (1 - gamma) * seasons[seasonIndex];
    }

    // Forecast
    const forecasts = [];
    for (let i = 1; i <= periods; i++) {
      const seasonIndex = (data.length + i - 1) % seasonLength;
      forecasts.push((level + i * trend) * seasons[seasonIndex]);
    }

    return {
      level,
      trend,
      seasons,
      forecasts,
      forecast: forecasts[0]
    };
  }

  /**
   * Calculate forecast accuracy metrics
   */
  static calculateAccuracy(actual, predicted) {
    if (actual.length !== predicted.length || actual.length === 0) {
      return { mape: null, rmse: null, mae: null };
    }

    let sumAPE = 0;
    let sumSE = 0;
    let sumAE = 0;
    let validCount = 0;

    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== 0) {
        sumAPE += Math.abs((actual[i] - predicted[i]) / actual[i]);
        validCount++;
      }
      sumSE += Math.pow(actual[i] - predicted[i], 2);
      sumAE += Math.abs(actual[i] - predicted[i]);
    }

    return {
      mape: validCount > 0 ? (sumAPE / validCount) * 100 : null,
      rmse: Math.sqrt(sumSE / actual.length),
      mae: sumAE / actual.length
    };
  }

  /**
   * Generate demand forecast for a product
   */
  static async forecastProductDemand(productId, periodsAhead = 3, period = 'monthly') {
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    // Get historical order data
    const lookbackDays = period === 'daily' ? 90 : period === 'weekly' ? 365 : 730;
    const orders = await Order.find({
      'items.product': productId,
      status: 'delivered',
      createdAt: { $gte: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: 1 });

    // Aggregate demand by period
    const demandByPeriod = this.aggregateDemandByPeriod(orders, productId, period);

    if (demandByPeriod.length < 3) {
      // Not enough data, use simple estimation
      const avgDemand = demandByPeriod.length > 0 
        ? demandByPeriod.reduce((a, b) => a + b, 0) / demandByPeriod.length 
        : 10;

      return {
        product: productId,
        forecastPeriod: period,
        predictions: {
          demandQuantity: Math.round(avgDemand),
          confidenceLevel: 50,
          lowerBound: Math.round(avgDemand * 0.7),
          upperBound: Math.round(avgDemand * 1.3)
        },
        factors: {
          historicalAverage: avgDemand,
          trend: 0,
          seasonality: 1
        },
        modelUsed: 'moving_average',
        accuracy: { mape: null, rmse: null, mae: null }
      };
    }

    // Use appropriate forecasting method
    let forecast;
    let modelUsed;

    if (demandByPeriod.length >= 24 && period === 'monthly') {
      // Use Holt-Winters for seasonal data
      forecast = this.tripleExponentialSmoothing(demandByPeriod, 12, 0.3, 0.1, 0.1, periodsAhead);
      modelUsed = 'exponential_smoothing';
    } else {
      // Use Double Exponential Smoothing
      forecast = this.doubleExponentialSmoothing(demandByPeriod, 0.3, 0.1, periodsAhead);
      modelUsed = 'exponential_smoothing';
    }

    // Calculate confidence interval (simple approach)
    const stdDev = this.calculateStdDev(demandByPeriod);
    const confidenceLevel = Math.min(90, 50 + demandByPeriod.length * 2);

    // Calculate accuracy on last few periods (cross-validation)
    const trainData = demandByPeriod.slice(0, -3);
    const testData = demandByPeriod.slice(-3);
    let accuracy = { mape: null, rmse: null, mae: null };

    if (trainData.length >= 3) {
      const testForecast = this.doubleExponentialSmoothing(trainData, 0.3, 0.1, 3);
      accuracy = this.calculateAccuracy(testData, testForecast.forecasts || [testForecast.forecast]);
    }

    const forecastValue = Array.isArray(forecast.forecasts) ? forecast.forecasts[0] : forecast.forecast;

    return {
      product: productId,
      forecastPeriod: period,
      predictions: {
        demandQuantity: Math.max(0, Math.round(forecastValue)),
        confidenceLevel,
        lowerBound: Math.max(0, Math.round(forecastValue - 1.96 * stdDev)),
        upperBound: Math.round(forecastValue + 1.96 * stdDev)
      },
      factors: {
        historicalAverage: demandByPeriod.reduce((a, b) => a + b, 0) / demandByPeriod.length,
        trend: forecast.trend || 0,
        seasonality: forecast.seasons ? forecast.seasons[0] : 1
      },
      modelUsed,
      accuracy
    };
  }

  /**
   * Aggregate demand data by time period
   */
  static aggregateDemandByPeriod(orders, productId, period) {
    const demandMap = new Map();

    orders.forEach(order => {
      const item = order.items.find(i => i.product.toString() === productId.toString());
      if (!item) return;

      const date = new Date(order.createdAt);
      let key;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      demandMap.set(key, (demandMap.get(key) || 0) + item.quantity);
    });

    return Array.from(demandMap.values());
  }

  /**
   * Calculate standard deviation
   */
  static calculateStdDev(data) {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / data.length);
  }

  /**
   * Generate forecasts for all products
   */
  static async generateAllForecasts(period = 'monthly', periodsAhead = 3) {
    const products = await Product.find({ isActive: true });
    const forecasts = [];

    for (const product of products) {
      try {
        const forecast = await this.forecastProductDemand(product._id, periodsAhead, period);
        
        // Save to database
        const savedForecast = await DemandForecast.create({
          product: product._id,
          forecastDate: new Date(),
          forecastPeriod: period,
          predictions: forecast.predictions,
          factors: forecast.factors,
          modelUsed: forecast.modelUsed,
          accuracy: forecast.accuracy,
          status: 'generated',
          generatedBy: 'system'
        });

        forecasts.push(savedForecast);
      } catch (error) {
        console.error(`Error forecasting for product ${product._id}:`, error);
      }
    }

    return forecasts;
  }
}

module.exports = DemandForecaster;
