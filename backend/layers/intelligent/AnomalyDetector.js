/**
 * Anomaly Detector
 * 
 * ML-based anomaly detection for transactions and behaviors:
 * - Statistical anomaly detection
 * - Pattern-based anomaly detection
 * - Time series anomaly detection
 */

const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Vendor = require('../../models/Vendor');

class AnomalyDetector {
  constructor() {
    // Anomaly detection parameters
    this.config = {
      zScoreThreshold: 2.5,       // Standard deviations for outlier
      iqrMultiplier: 1.5,         // IQR multiplier for outliers
      minDataPoints: 5,            // Minimum data points for analysis
      lookbackDays: 90,            // Days to look back for pattern analysis
      confidenceThreshold: 0.7     // Minimum confidence to flag anomaly
    };
  }

  /**
   * Detect anomalies in invoice amounts
   */
  async detectInvoiceAmountAnomalies(vendorId) {
    const lookbackDate = new Date(Date.now() - this.config.lookbackDays * 24 * 60 * 60 * 1000);
    
    const invoices = await Invoice.find({
      vendor: vendorId,
      createdAt: { $gte: lookbackDate }
    }).sort({ createdAt: 1 });

    if (invoices.length < this.config.minDataPoints) {
      return {
        detected: false,
        reason: 'Insufficient data for analysis',
        dataPoints: invoices.length
      };
    }

    const amounts = invoices.map(i => i.totalAmount || 0);
    const stats = this.calculateStatistics(amounts);
    const anomalies = [];

    invoices.forEach((invoice, index) => {
      const amount = invoice.totalAmount || 0;
      const zScore = Math.abs((amount - stats.mean) / stats.stdDev);
      const iqrAnomaly = amount < (stats.q1 - this.config.iqrMultiplier * stats.iqr) ||
                         amount > (stats.q3 + this.config.iqrMultiplier * stats.iqr);

      if (zScore > this.config.zScoreThreshold || iqrAnomaly) {
        anomalies.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount,
          zScore: Math.round(zScore * 100) / 100,
          deviation: Math.round(((amount - stats.mean) / stats.mean) * 100),
          anomalyType: zScore > this.config.zScoreThreshold ? 'z-score' : 'iqr',
          confidence: Math.min(0.95, 0.6 + (zScore * 0.1)),
          direction: amount > stats.mean ? 'above' : 'below'
        });
      }
    });

    return {
      detected: anomalies.length > 0,
      anomalyCount: anomalies.length,
      statistics: stats,
      anomalies,
      totalInvoicesAnalyzed: invoices.length
    };
  }

  /**
   * Detect anomalies in payment patterns
   */
  async detectPaymentPatternAnomalies(vendorId) {
    const lookbackDate = new Date(Date.now() - this.config.lookbackDays * 24 * 60 * 60 * 1000);
    
    const payments = await Payment.find({
      vendor: vendorId,
      createdAt: { $gte: lookbackDate },
      status: 'completed'
    }).sort({ createdAt: 1 });

    if (payments.length < this.config.minDataPoints) {
      return {
        detected: false,
        reason: 'Insufficient data for analysis',
        dataPoints: payments.length
      };
    }

    // Analyze payment frequency
    const intervals = [];
    for (let i = 1; i < payments.length; i++) {
      const interval = payments[i].createdAt - payments[i-1].createdAt;
      intervals.push(interval / (1000 * 60 * 60 * 24)); // Convert to days
    }

    const frequencyStats = this.calculateStatistics(intervals);
    const anomalies = [];

    // Check for frequency anomalies
    for (let i = 1; i < intervals.length; i++) {
      const interval = intervals[i];
      const zScore = Math.abs((interval - frequencyStats.mean) / frequencyStats.stdDev);

      if (zScore > this.config.zScoreThreshold) {
        anomalies.push({
          paymentId: payments[i+1]._id,
          interval: Math.round(interval * 10) / 10,
          expectedInterval: Math.round(frequencyStats.mean * 10) / 10,
          zScore: Math.round(zScore * 100) / 100,
          anomalyType: interval < frequencyStats.mean ? 'frequency_increase' : 'frequency_decrease',
          confidence: Math.min(0.95, 0.6 + (zScore * 0.1))
        });
      }
    }

    // Analyze amount patterns
    const amounts = payments.map(p => p.amount || 0);
    const amountStats = this.calculateStatistics(amounts);

    payments.forEach((payment, index) => {
      const amount = payment.amount || 0;
      const zScore = Math.abs((amount - amountStats.mean) / amountStats.stdDev);

      if (zScore > this.config.zScoreThreshold) {
        anomalies.push({
          paymentId: payment._id,
          amount,
          expectedAmount: Math.round(amountStats.mean),
          zScore: Math.round(zScore * 100) / 100,
          anomalyType: 'amount_outlier',
          direction: amount > amountStats.mean ? 'above' : 'below',
          confidence: Math.min(0.95, 0.6 + (zScore * 0.1))
        });
      }
    });

    return {
      detected: anomalies.length > 0,
      anomalyCount: anomalies.length,
      frequencyStats: {
        meanInterval: Math.round(frequencyStats.mean * 10) / 10,
        stdDevInterval: Math.round(frequencyStats.stdDev * 10) / 10
      },
      amountStats: {
        mean: Math.round(amountStats.mean),
        stdDev: Math.round(amountStats.stdDev)
      },
      anomalies,
      totalPaymentsAnalyzed: payments.length
    };
  }

  /**
   * Detect vendor behavior anomalies
   */
  async detectVendorBehaviorAnomalies(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const anomalies = [];

    // Check score history for sudden changes
    if (vendor.scoreHistory && vendor.scoreHistory.length >= 3) {
      const scores = vendor.scoreHistory.map(h => h.score);
      const stats = this.calculateStatistics(scores);

      for (let i = 1; i < scores.length; i++) {
        const change = scores[i] - scores[i-1];
        const changeZScore = Math.abs(change / Math.max(stats.stdDev, 1));

        if (Math.abs(change) > 15) { // Significant change
          anomalies.push({
            type: 'score_change',
            previousScore: scores[i-1],
            newScore: scores[i],
            change,
            date: vendor.scoreHistory[i].date,
            confidence: Math.min(0.9, 0.5 + (Math.abs(change) / 100))
          });
        }
      }
    }

    // Check for unusual activity patterns
    const recentInvoices = await Invoice.find({
      vendor: vendorId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const olderInvoices = await Invoice.find({
      vendor: vendorId,
      createdAt: {
        $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    });

    const recentMonthlyRate = recentInvoices.length;
    const olderMonthlyRate = olderInvoices.length / 2; // 2-month period

    if (olderMonthlyRate > 0 && recentMonthlyRate > olderMonthlyRate * 2) {
      anomalies.push({
        type: 'activity_spike',
        recentActivity: recentInvoices.length,
        historicalAverage: Math.round(olderMonthlyRate),
        increase: Math.round((recentMonthlyRate / olderMonthlyRate - 1) * 100),
        confidence: 0.75
      });
    }

    return {
      detected: anomalies.length > 0,
      vendorId,
      vendorName: vendor.name,
      anomalyCount: anomalies.length,
      anomalies,
      currentScore: vendor.currentScore,
      riskLevel: vendor.riskLevel
    };
  }

  /**
   * Detect time series anomalies
   */
  async detectTimeSeriesAnomalies(options = {}) {
    const { metric = 'spend', groupBy = 'day', lookbackDays = 90 } = options;
    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const payments = await Payment.find({
      createdAt: { $gte: startDate },
      status: 'completed'
    }).sort({ createdAt: 1 });

    // Group by time period
    const timeSeries = {};
    payments.forEach(payment => {
      let key;
      const date = new Date(payment.createdAt);
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().substr(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().substr(0, 10);
          break;
        case 'month':
        default:
          key = date.toISOString().substr(0, 7);
          break;
      }

      if (!timeSeries[key]) {
        timeSeries[key] = { period: key, value: 0, count: 0 };
      }
      timeSeries[key].value += payment.amount || 0;
      timeSeries[key].count++;
    });

    const dataPoints = Object.values(timeSeries).sort((a, b) => a.period.localeCompare(b.period));
    
    if (dataPoints.length < this.config.minDataPoints) {
      return {
        detected: false,
        reason: 'Insufficient time periods for analysis',
        dataPoints: dataPoints.length
      };
    }

    // Calculate statistics
    const values = dataPoints.map(d => d.value);
    const stats = this.calculateStatistics(values);

    // Detect anomalies
    const anomalies = [];
    dataPoints.forEach(point => {
      const zScore = Math.abs((point.value - stats.mean) / stats.stdDev);
      
      if (zScore > this.config.zScoreThreshold) {
        anomalies.push({
          period: point.period,
          value: Math.round(point.value),
          expectedValue: Math.round(stats.mean),
          zScore: Math.round(zScore * 100) / 100,
          deviation: Math.round(((point.value - stats.mean) / stats.mean) * 100),
          transactionCount: point.count,
          confidence: Math.min(0.95, 0.6 + (zScore * 0.1))
        });
      }
    });

    return {
      detected: anomalies.length > 0,
      metric,
      groupBy,
      statistics: stats,
      anomalies,
      dataPoints: dataPoints.length,
      timeSeries: dataPoints
    };
  }

  /**
   * Calculate statistics for a dataset
   */
  calculateStatistics(data) {
    if (data.length === 0) {
      return { mean: 0, stdDev: 0, q1: 0, median: 0, q3: 0, iqr: 0 };
    }

    // Mean
    const mean = data.reduce((a, b) => a + b, 0) / data.length;

    // Standard deviation
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // Quartiles
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    return {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      q1: Math.round(q1 * 100) / 100,
      median: Math.round(median * 100) / 100,
      q3: Math.round(q3 * 100) / 100,
      iqr: Math.round(iqr * 100) / 100,
      min: Math.min(...data),
      max: Math.max(...data),
      count: data.length
    };
  }

  /**
   * Batch anomaly detection for all vendors
   */
  async batchDetectAnomalies() {
    const vendors = await Vendor.find({ status: 'active' });
    const results = {
      analyzed: 0,
      anomaliesFound: 0,
      vendorAnomalies: []
    };

    for (const vendor of vendors) {
      try {
        const [invoiceAnomalies, paymentAnomalies, behaviorAnomalies] = await Promise.all([
          this.detectInvoiceAmountAnomalies(vendor._id),
          this.detectPaymentPatternAnomalies(vendor._id),
          this.detectVendorBehaviorAnomalies(vendor._id)
        ]);

        const totalAnomalies = 
          (invoiceAnomalies.anomalyCount || 0) +
          (paymentAnomalies.anomalyCount || 0) +
          (behaviorAnomalies.anomalyCount || 0);

        if (totalAnomalies > 0) {
          results.vendorAnomalies.push({
            vendorId: vendor._id,
            vendorName: vendor.name,
            totalAnomalies,
            invoiceAnomalies: invoiceAnomalies.anomalyCount || 0,
            paymentAnomalies: paymentAnomalies.anomalyCount || 0,
            behaviorAnomalies: behaviorAnomalies.anomalyCount || 0
          });
          results.anomaliesFound += totalAnomalies;
        }

        results.analyzed++;
      } catch (error) {
        console.error(`Error analyzing vendor ${vendor._id}:`, error.message);
      }
    }

    // Sort by total anomalies
    results.vendorAnomalies.sort((a, b) => b.totalAnomalies - a.totalAnomalies);

    return results;
  }

  /**
   * Get anomaly summary
   */
  async getAnomalySummary() {
    const batchResults = await this.batchDetectAnomalies();
    const timeSeriesAnomalies = await this.detectTimeSeriesAnomalies({ groupBy: 'week' });

    return {
      generatedAt: new Date(),
      vendorsAnalyzed: batchResults.analyzed,
      totalAnomaliesDetected: batchResults.anomaliesFound,
      vendorsWithAnomalies: batchResults.vendorAnomalies.length,
      topVendorsByAnomalies: batchResults.vendorAnomalies.slice(0, 10),
      timeSeriesAnomalies: {
        detected: timeSeriesAnomalies.detected,
        count: timeSeriesAnomalies.anomalies?.length || 0,
        anomalies: timeSeriesAnomalies.anomalies?.slice(0, 5) || []
      }
    };
  }
}

module.exports = new AnomalyDetector();
