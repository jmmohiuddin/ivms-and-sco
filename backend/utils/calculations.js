/**
 * Utility functions for supply chain calculations
 */

/**
 * Calculate days between two dates
 */
exports.daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
};

/**
 * Calculate percentage change
 */
exports.percentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Calculate weighted average
 */
exports.weightedAverage = (values, weights) => {
  if (values.length !== weights.length) {
    throw new Error('Values and weights must have same length');
  }
  const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  return weightedSum / weightSum;
};

/**
 * Calculate standard deviation
 */
exports.standardDeviation = (values) => {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / n);
};

/**
 * Calculate coefficient of variation
 */
exports.coefficientOfVariation = (values) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  return (exports.standardDeviation(values) / mean) * 100;
};

/**
 * Calculate moving average
 */
exports.movingAverage = (data, period) => {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
};

/**
 * Linear regression for trend analysis
 */
exports.linearRegression = (values) => {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += Math.pow(values[i] - predicted, 2);
    ssTot += Math.pow(values[i] - yMean, 2);
  }

  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
};

/**
 * Detect seasonality in data
 */
exports.detectSeasonality = (data, seasonLength = 12) => {
  if (data.length < seasonLength * 2) {
    return { hasSeasonality: false, seasonalIndices: [] };
  }

  // Calculate seasonal indices
  const numSeasons = Math.floor(data.length / seasonLength);
  const seasonalSums = new Array(seasonLength).fill(0);
  const seasonalCounts = new Array(seasonLength).fill(0);

  for (let i = 0; i < data.length; i++) {
    const seasonIndex = i % seasonLength;
    seasonalSums[seasonIndex] += data[i];
    seasonalCounts[seasonIndex]++;
  }

  const overallMean = data.reduce((a, b) => a + b, 0) / data.length;
  const seasonalIndices = seasonalSums.map((sum, i) => 
    seasonalCounts[i] > 0 ? (sum / seasonalCounts[i]) / overallMean : 1
  );

  // Check if seasonality is significant (variation > 10%)
  const indexVariation = exports.coefficientOfVariation(seasonalIndices);
  const hasSeasonality = indexVariation > 10;

  return { hasSeasonality, seasonalIndices, variation: indexVariation };
};

/**
 * Format currency
 */
exports.formatCurrency = (value, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(value);
};

/**
 * Calculate inventory turnover ratio
 */
exports.inventoryTurnover = (costOfGoodsSold, averageInventory) => {
  if (averageInventory === 0) return 0;
  return costOfGoodsSold / averageInventory;
};

/**
 * Calculate days of inventory
 */
exports.daysOfInventory = (averageInventory, costOfGoodsSold) => {
  if (costOfGoodsSold === 0) return 0;
  return (averageInventory / costOfGoodsSold) * 365;
};

/**
 * Calculate fill rate
 */
exports.fillRate = (ordersFullyFilled, totalOrders) => {
  if (totalOrders === 0) return 100;
  return (ordersFullyFilled / totalOrders) * 100;
};

/**
 * Calculate on-time delivery rate
 */
exports.onTimeDeliveryRate = (onTimeDeliveries, totalDeliveries) => {
  if (totalDeliveries === 0) return 100;
  return (onTimeDeliveries / totalDeliveries) * 100;
};
