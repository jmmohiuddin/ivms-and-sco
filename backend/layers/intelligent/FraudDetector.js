/**
 * Fraud Detector
 * 
 * ML-based fraud detection for invoices and transactions:
 * - Anomaly detection
 * - Duplicate invoice detection
 * - Price variance analysis
 * - Vendor behavior analysis
 * - Pattern recognition
 */

const axios = require('axios');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Vendor = require('../../models/Vendor');

class FraudDetector {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    
    // Fraud detection thresholds
    this.thresholds = {
      priceVariancePercent: 20,      // Flag if price varies by more than 20%
      duplicateTimeWindow: 7,         // Days to check for duplicate invoices
      rushPaymentDays: 3,            // Flag if payment requested within 3 days
      roundAmountThreshold: 1000,     // Flag round amounts above this
      frequencyMultiplier: 2,         // Flag if frequency is 2x normal
      vendorAgeMinDays: 30           // New vendor warning threshold
    };

    // Risk weights for scoring
    this.riskWeights = {
      duplicateInvoice: 0.35,
      priceAnomaly: 0.25,
      rushPayment: 0.15,
      roundAmount: 0.05,
      newVendor: 0.10,
      frequencyAnomaly: 0.10
    };
  }

  /**
   * Analyze invoice for fraud indicators
   */
  async analyzeInvoice(invoiceId) {
    try {
      const invoice = await Invoice.findById(invoiceId).populate('vendor');
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Run all fraud checks
      const fraudAnalysis = {
        analyzed: true,
        analyzedAt: new Date(),
        duplicateCheck: await this.checkDuplicateInvoice(invoice),
        priceAnalysis: await this.analyzePrice(invoice),
        vendorAnalysis: await this.analyzeVendorBehavior(invoice.vendor),
        patternAnalysis: await this.analyzePatterns(invoice),
        rushPaymentCheck: this.checkRushPayment(invoice),
        roundAmountCheck: this.checkRoundAmount(invoice),
        anomalyScore: 0,
        fraudIndicators: []
      };

      // Calculate overall anomaly score
      fraudAnalysis.anomalyScore = this.calculateAnomalyScore(fraudAnalysis);
      fraudAnalysis.riskLevel = this.determineRiskLevel(fraudAnalysis.anomalyScore);
      fraudAnalysis.fraudIndicators = this.compileFraudIndicators(fraudAnalysis);
      fraudAnalysis.recommendations = this.generateRecommendations(fraudAnalysis);

      // Update invoice with fraud analysis
      await Invoice.findByIdAndUpdate(invoiceId, {
        fraudDetection: {
          analyzed: true,
          riskScore: fraudAnalysis.anomalyScore,
          flags: fraudAnalysis.fraudIndicators,
          analyzedAt: new Date()
        }
      });

      return fraudAnalysis;
    } catch (error) {
      console.error('Fraud analysis error:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate invoices
   */
  async checkDuplicateInvoice(invoice) {
    const timeWindow = new Date();
    timeWindow.setDate(timeWindow.getDate() - this.thresholds.duplicateTimeWindow);

    // Find potential duplicates
    const potentialDuplicates = await Invoice.find({
      _id: { $ne: invoice._id },
      vendor: invoice.vendor._id || invoice.vendor,
      createdAt: { $gte: timeWindow },
      $or: [
        { invoiceNumber: invoice.invoiceNumber },
        { 
          totalAmount: invoice.totalAmount,
          invoiceDate: invoice.invoiceDate 
        },
        {
          totalAmount: { 
            $gte: invoice.totalAmount * 0.99,
            $lte: invoice.totalAmount * 1.01
          }
        }
      ]
    });

    return {
      isDuplicate: potentialDuplicates.length > 0,
      duplicateCount: potentialDuplicates.length,
      potentialDuplicates: potentialDuplicates.map(d => ({
        id: d._id,
        invoiceNumber: d.invoiceNumber,
        amount: d.totalAmount,
        date: d.invoiceDate,
        matchReason: this.getDuplicateMatchReason(invoice, d)
      })),
      confidence: potentialDuplicates.length > 0 ? 0.85 : 0,
      risk: potentialDuplicates.length > 0 ? 'high' : 'none'
    };
  }

  /**
   * Get reason for duplicate match
   */
  getDuplicateMatchReason(original, duplicate) {
    const reasons = [];
    
    if (original.invoiceNumber === duplicate.invoiceNumber) {
      reasons.push('Same invoice number');
    }
    if (original.totalAmount === duplicate.totalAmount) {
      reasons.push('Same amount');
    }
    if (original.invoiceDate?.toDateString() === duplicate.invoiceDate?.toDateString()) {
      reasons.push('Same date');
    }
    
    return reasons.join(', ');
  }

  /**
   * Analyze price for anomalies
   */
  async analyzePrice(invoice) {
    // Get historical prices for same items/vendor
    const historicalInvoices = await Invoice.find({
      vendor: invoice.vendor._id || invoice.vendor,
      _id: { $ne: invoice._id },
      status: 'paid'
    }).sort({ createdAt: -1 }).limit(20);

    if (historicalInvoices.length === 0) {
      return {
        hasAnomaly: false,
        reason: 'No historical data for comparison',
        confidence: 0
      };
    }

    // Calculate average and standard deviation
    const amounts = historicalInvoices.map(inv => inv.totalAmount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / amounts.length
    );

    // Check if current invoice is an outlier
    const deviation = Math.abs(invoice.totalAmount - avg);
    const zScore = stdDev > 0 ? deviation / stdDev : 0;
    const variancePercent = ((invoice.totalAmount - avg) / avg) * 100;

    const hasAnomaly = zScore > 2 || Math.abs(variancePercent) > this.thresholds.priceVariancePercent;

    return {
      hasAnomaly,
      currentAmount: invoice.totalAmount,
      averageAmount: avg,
      standardDeviation: stdDev,
      zScore,
      variancePercent,
      direction: variancePercent > 0 ? 'above' : 'below',
      confidence: hasAnomaly ? Math.min(0.9, zScore * 0.3) : 0,
      risk: hasAnomaly ? (zScore > 3 ? 'high' : 'medium') : 'none'
    };
  }

  /**
   * Analyze vendor behavior patterns
   */
  async analyzeVendorBehavior(vendor) {
    if (!vendor) {
      return { 
        hasAnomaly: false,
        reason: 'Vendor not found',
        confidence: 0
      };
    }

    const vendorId = vendor._id || vendor;
    
    // Get vendor's invoice history
    const recentInvoices = await Invoice.find({
      vendor: vendorId,
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    });

    const olderInvoices = await Invoice.find({
      vendor: vendorId,
      createdAt: { 
        $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      }
    });

    // Calculate frequency change
    const recentFrequency = recentInvoices.length;
    const olderFrequency = olderInvoices.length || 1;
    const frequencyChange = recentFrequency / olderFrequency;

    // Check vendor age
    const vendorRecord = await Vendor.findById(vendorId);
    const vendorAge = vendorRecord ? 
      Math.floor((Date.now() - vendorRecord.createdAt) / (1000 * 60 * 60 * 24)) : 0;
    const isNewVendor = vendorAge < this.thresholds.vendorAgeMinDays;

    // Analyze amount patterns
    const amounts = recentInvoices.map(i => i.totalAmount);
    const avgAmount = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const maxAmount = Math.max(...amounts, 0);

    return {
      hasAnomaly: frequencyChange >= this.thresholds.frequencyMultiplier || isNewVendor,
      vendorAge,
      isNewVendor,
      recentInvoiceCount: recentInvoices.length,
      frequencyChange,
      averageInvoiceAmount: avgAmount,
      maxInvoiceAmount: maxAmount,
      confidence: isNewVendor ? 0.6 : (frequencyChange >= 2 ? 0.7 : 0),
      risk: isNewVendor ? 'medium' : (frequencyChange >= 3 ? 'high' : 'low')
    };
  }

  /**
   * Analyze patterns in invoice data
   */
  async analyzePatterns(invoice) {
    const patterns = {
      hasSequentialNumbers: false,
      hasWeekendSubmission: false,
      hasAfterHoursSubmission: false,
      unusualLineItems: false
    };

    // Check for sequential invoice numbers
    const recentInvoices = await Invoice.find({
      vendor: invoice.vendor._id || invoice.vendor
    }).sort({ invoiceNumber: 1 }).limit(10);

    if (recentInvoices.length >= 3) {
      const numbers = recentInvoices
        .map(i => parseInt(i.invoiceNumber?.replace(/\D/g, '')))
        .filter(n => !isNaN(n));
      
      // Check if numbers are suspiciously sequential
      let sequentialCount = 0;
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] === numbers[i-1] + 1) sequentialCount++;
      }
      patterns.hasSequentialNumbers = sequentialCount >= 3;
    }

    // Check submission timing
    const submissionDate = invoice.createdAt || new Date();
    const dayOfWeek = submissionDate.getDay();
    const hour = submissionDate.getHours();

    patterns.hasWeekendSubmission = dayOfWeek === 0 || dayOfWeek === 6;
    patterns.hasAfterHoursSubmission = hour < 6 || hour > 22;

    // Check line items for anomalies
    if (invoice.items && invoice.items.length > 0) {
      const descriptions = invoice.items.map(i => i.description?.toLowerCase() || '');
      const genericTerms = ['services', 'consulting', 'misc', 'other', 'various'];
      const genericCount = descriptions.filter(d => 
        genericTerms.some(term => d.includes(term))
      ).length;
      
      patterns.unusualLineItems = genericCount === invoice.items.length;
    }

    const anomalyCount = Object.values(patterns).filter(v => v).length;
    
    return {
      ...patterns,
      anomalyCount,
      hasAnomaly: anomalyCount >= 2,
      confidence: anomalyCount >= 2 ? 0.5 + (anomalyCount * 0.1) : 0,
      risk: anomalyCount >= 3 ? 'high' : (anomalyCount >= 2 ? 'medium' : 'low')
    };
  }

  /**
   * Check for rush payment requests
   */
  checkRushPayment(invoice) {
    if (!invoice.dueDate) {
      return { isRush: false, confidence: 0 };
    }

    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    const isRush = daysUntilDue <= this.thresholds.rushPaymentDays;

    return {
      isRush,
      daysUntilDue,
      confidence: isRush ? 0.6 : 0,
      risk: isRush ? 'medium' : 'none'
    };
  }

  /**
   * Check for suspicious round amounts
   */
  checkRoundAmount(invoice) {
    const amount = invoice.totalAmount;
    const isRound = amount >= this.thresholds.roundAmountThreshold && 
                    amount % 100 === 0;
    
    // Check if all line items are also round
    let allItemsRound = false;
    if (invoice.items && invoice.items.length > 0) {
      allItemsRound = invoice.items.every(item => 
        (item.amount || item.quantity * item.unitPrice) % 10 === 0
      );
    }

    const isSuspicious = isRound && allItemsRound;

    return {
      isRound,
      allItemsRound,
      isSuspicious,
      amount,
      confidence: isSuspicious ? 0.4 : 0,
      risk: isSuspicious ? 'low' : 'none'
    };
  }

  /**
   * Calculate overall anomaly score
   */
  calculateAnomalyScore(analysis) {
    let score = 0;

    if (analysis.duplicateCheck.isDuplicate) {
      score += this.riskWeights.duplicateInvoice * analysis.duplicateCheck.confidence;
    }

    if (analysis.priceAnalysis.hasAnomaly) {
      score += this.riskWeights.priceAnomaly * analysis.priceAnalysis.confidence;
    }

    if (analysis.rushPaymentCheck.isRush) {
      score += this.riskWeights.rushPayment * analysis.rushPaymentCheck.confidence;
    }

    if (analysis.roundAmountCheck.isSuspicious) {
      score += this.riskWeights.roundAmount * analysis.roundAmountCheck.confidence;
    }

    if (analysis.vendorAnalysis.isNewVendor) {
      score += this.riskWeights.newVendor * analysis.vendorAnalysis.confidence;
    }

    if (analysis.patternAnalysis.hasAnomaly) {
      score += this.riskWeights.frequencyAnomaly * analysis.patternAnalysis.confidence;
    }

    return Math.min(1, score);
  }

  /**
   * Determine risk level from score
   */
  determineRiskLevel(score) {
    if (score >= 0.7) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.3) return 'medium';
    if (score >= 0.1) return 'low';
    return 'none';
  }

  /**
   * Compile fraud indicators
   */
  compileFraudIndicators(analysis) {
    const indicators = [];

    if (analysis.duplicateCheck.isDuplicate) {
      indicators.push({
        type: 'DUPLICATE_INVOICE',
        severity: 'high',
        description: `Potential duplicate invoice detected (${analysis.duplicateCheck.duplicateCount} matches)`,
        confidence: analysis.duplicateCheck.confidence
      });
    }

    if (analysis.priceAnalysis.hasAnomaly) {
      indicators.push({
        type: 'PRICE_ANOMALY',
        severity: analysis.priceAnalysis.risk,
        description: `Invoice amount ${analysis.priceAnalysis.variancePercent.toFixed(1)}% ${analysis.priceAnalysis.direction} average`,
        confidence: analysis.priceAnalysis.confidence
      });
    }

    if (analysis.vendorAnalysis.isNewVendor) {
      indicators.push({
        type: 'NEW_VENDOR',
        severity: 'medium',
        description: `Vendor account is only ${analysis.vendorAnalysis.vendorAge} days old`,
        confidence: analysis.vendorAnalysis.confidence
      });
    }

    if (analysis.rushPaymentCheck.isRush) {
      indicators.push({
        type: 'RUSH_PAYMENT',
        severity: 'medium',
        description: `Payment due in ${analysis.rushPaymentCheck.daysUntilDue} days`,
        confidence: analysis.rushPaymentCheck.confidence
      });
    }

    if (analysis.roundAmountCheck.isSuspicious) {
      indicators.push({
        type: 'ROUND_AMOUNT',
        severity: 'low',
        description: 'Invoice contains only round amounts',
        confidence: analysis.roundAmountCheck.confidence
      });
    }

    if (analysis.patternAnalysis.hasAnomaly) {
      const patternIssues = [];
      if (analysis.patternAnalysis.hasWeekendSubmission) patternIssues.push('weekend submission');
      if (analysis.patternAnalysis.hasAfterHoursSubmission) patternIssues.push('after-hours submission');
      if (analysis.patternAnalysis.unusualLineItems) patternIssues.push('generic line items');
      if (analysis.patternAnalysis.hasSequentialNumbers) patternIssues.push('sequential invoice numbers');

      indicators.push({
        type: 'PATTERN_ANOMALY',
        severity: analysis.patternAnalysis.risk,
        description: `Unusual patterns detected: ${patternIssues.join(', ')}`,
        confidence: analysis.patternAnalysis.confidence
      });
    }

    return indicators;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.anomalyScore >= 0.7) {
      recommendations.push({
        priority: 'critical',
        action: 'Hold payment and escalate to fraud team immediately'
      });
    } else if (analysis.anomalyScore >= 0.5) {
      recommendations.push({
        priority: 'high',
        action: 'Require additional approval before processing'
      });
    }

    if (analysis.duplicateCheck.isDuplicate) {
      recommendations.push({
        priority: 'high',
        action: 'Verify this is not a duplicate submission before payment'
      });
    }

    if (analysis.priceAnalysis.hasAnomaly) {
      recommendations.push({
        priority: 'medium',
        action: 'Request itemized breakdown and compare with contract rates'
      });
    }

    if (analysis.vendorAnalysis.isNewVendor) {
      recommendations.push({
        priority: 'medium',
        action: 'Verify vendor credentials and banking information'
      });
    }

    return recommendations;
  }

  /**
   * Batch fraud analysis for multiple invoices
   */
  async batchAnalyzeInvoices(invoiceIds) {
    const results = {
      analyzed: [],
      highRisk: [],
      failed: []
    };

    for (const invoiceId of invoiceIds) {
      try {
        const analysis = await this.analyzeInvoice(invoiceId);
        results.analyzed.push({ id: invoiceId, analysis });
        
        if (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical') {
          results.highRisk.push({ id: invoiceId, riskLevel: analysis.riskLevel });
        }
      } catch (error) {
        results.failed.push({ id: invoiceId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get fraud statistics for dashboard
   */
  async getFraudStatistics(startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find({
      ...query,
      'fraudDetection.analyzed': true
    });

    const stats = {
      totalAnalyzed: invoices.length,
      byRiskLevel: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
      byIndicatorType: {},
      totalFlagged: 0,
      averageRiskScore: 0
    };

    let totalScore = 0;
    for (const invoice of invoices) {
      const riskScore = invoice.fraudDetection?.riskScore || 0;
      totalScore += riskScore;

      const riskLevel = this.determineRiskLevel(riskScore);
      stats.byRiskLevel[riskLevel]++;

      if (riskLevel !== 'none' && riskLevel !== 'low') {
        stats.totalFlagged++;
      }

      if (invoice.fraudDetection?.flags) {
        for (const flag of invoice.fraudDetection.flags) {
          stats.byIndicatorType[flag.type] = (stats.byIndicatorType[flag.type] || 0) + 1;
        }
      }
    }

    stats.averageRiskScore = invoices.length > 0 ? totalScore / invoices.length : 0;

    return stats;
  }

  /**
   * Real-time fraud monitoring
   */
  async monitorTransactions() {
    // Get unanalyzed invoices from last 24 hours
    const recentInvoices = await Invoice.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      'fraudDetection.analyzed': { $ne: true }
    });

    const alerts = [];

    for (const invoice of recentInvoices) {
      try {
        const analysis = await this.analyzeInvoice(invoice._id);
        
        if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
          alerts.push({
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            vendor: invoice.vendor,
            amount: invoice.totalAmount,
            riskLevel: analysis.riskLevel,
            indicators: analysis.fraudIndicators,
            detectedAt: new Date()
          });
        }
      } catch (error) {
        console.error(`Error monitoring invoice ${invoice._id}:`, error);
      }
    }

    return alerts;
  }
}

module.exports = new FraudDetector();
