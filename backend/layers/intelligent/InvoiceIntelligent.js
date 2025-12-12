/**
 * InvoiceIntelligent.js - Intelligence Layer for Automated Invoicing
 * 
 * Handles all AI/ML processing:
 * - Advanced OCR & field extraction
 * - Semantic line-item matching
 * - 3-way/n-way matching
 * - Tax & compliance validation
 * - Duplicate & fraud detection
 * - Auto-coding & GL mapping
 * - Anomaly detection
 */

const Invoice = require('../../models/Invoice');
const MatchRecord = require('../../models/MatchRecord');
const InvoiceException = require('../../models/InvoiceException');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

class InvoiceIntelligent {
  constructor() {
    this.toleranceSettings = {
      priceVariancePercent: 2,
      quantityVariancePercent: 5,
      amountVarianceAbsolute: 10
    };
    this.autoApproveThreshold = 10000; // Auto-approve invoices below this amount
    this.confidenceThreshold = 0.85; // Minimum confidence for auto-processing
  }

  /**
   * Process invoice through intelligence layer
   */
  async processInvoice(invoiceId) {
    try {
      const invoice = await Invoice.findById(invoiceId)
        .populate('vendor')
        .populate('vendorId');

      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      // Update status to processing
      invoice.status = 'processing';
      await invoice.save();

      const startTime = Date.now();
      const results = {
        extraction: null,
        matching: null,
        validation: null,
        duplicateCheck: null,
        fraudCheck: null,
        coding: null,
        anomalyCheck: null
      };

      // Step 1: Enhanced extraction if needed
      if (!invoice.ocrProcessed || invoice.overallExtractionConfidence < this.confidenceThreshold) {
        results.extraction = await this.enhanceExtraction(invoice);
      }

      // Step 2: Duplicate detection
      results.duplicateCheck = await this.checkDuplicates(invoice);
      if (results.duplicateCheck.isDuplicate) {
        invoice.flags.isDuplicate = true;
        invoice.flags.duplicateOf = results.duplicateCheck.duplicateOf;
        invoice.flags.duplicateConfidence = results.duplicateCheck.confidence;
        await this.createException(invoice, 'duplicate_invoice', results.duplicateCheck);
      }

      // Step 3: Fraud detection
      results.fraudCheck = await this.detectFraud(invoice);
      if (results.fraudCheck.isSuspicious) {
        invoice.flags.isFraudSuspect = true;
        invoice.flags.fraudReasons = results.fraudCheck.reasons;
        invoice.fraudScore = results.fraudCheck.score;
        await this.createException(invoice, 'fraud_suspected', results.fraudCheck);
      }

      // Step 4: PO/GRN Matching
      if (invoice.hasPO || invoice.purchaseOrderNumbers?.length > 0) {
        results.matching = await this.performMatching(invoice);
        invoice.matchStatus = results.matching.status;
        invoice.matchScore = results.matching.score;
        invoice.matchRecordId = results.matching.matchRecordId;
      } else {
        // Non-PO invoice
        invoice.matchType = 'non-po';
        invoice.matchStatus = 'no_match';
      }

      // Step 5: Tax validation
      results.validation = await this.validateTax(invoice);
      if (!results.validation.valid) {
        await this.createException(invoice, 'invalid_tax_calculation', results.validation);
      }

      // Step 6: Auto-coding
      results.coding = await this.suggestCoding(invoice);
      invoice.codingSuggestions = results.coding.suggestions;
      if (results.coding.autoApply) {
        invoice.glAccount = results.coding.suggestions[0]?.glAccount;
        invoice.costCenter = results.coding.suggestions[0]?.costCenter;
        invoice.codingMethod = 'auto';
      }

      // Step 7: Anomaly detection
      results.anomalyCheck = await this.detectAnomalies(invoice);
      if (results.anomalyCheck.hasAnomaly) {
        invoice.flags.hasAnomaly = true;
        invoice.flags.anomalyReasons = results.anomalyCheck.reasons;
      }

      // Calculate processing metrics
      const processingTime = Date.now() - startTime;
      invoice.processingMetrics = {
        extractionTime: results.extraction?.processingTime || 0,
        matchingTime: results.matching?.processingTime || 0,
        totalProcessingTime: processingTime,
        automationScore: this.calculateAutomationScore(results)
      };

      // Determine final status
      const finalStatus = await this.determineStatus(invoice, results);
      invoice.status = finalStatus.status;
      invoice.subStatus = finalStatus.subStatus;

      // Check auto-approval eligibility
      if (finalStatus.autoApproveEligible) {
        invoice.autoApproved = true;
        invoice.approvedDate = new Date();
        invoice.status = 'approved';
      }

      invoice.processedDate = new Date();
      invoice.ocrProcessed = true;

      // Add audit entry
      invoice.auditTrail.push({
        action: 'invoice_processed',
        performedAt: new Date(),
        details: {
          matchScore: invoice.matchScore,
          automationScore: invoice.processingMetrics.automationScore,
          autoApproved: invoice.autoApproved
        }
      });

      await invoice.save();

      return {
        success: true,
        invoiceId: invoice._id,
        status: invoice.status,
        matchScore: invoice.matchScore,
        automationScore: invoice.processingMetrics.automationScore,
        autoApproved: invoice.autoApproved,
        exceptions: results.duplicateCheck.isDuplicate || results.fraudCheck.isSuspicious,
        processingTime
      };

    } catch (error) {
      console.error('Invoice processing error:', error);
      
      // Update invoice with error status
      await Invoice.findByIdAndUpdate(invoiceId, {
        status: 'exception',
        subStatus: 'processing_failed',
        $push: {
          auditTrail: {
            action: 'processing_failed',
            performedAt: new Date(),
            details: { error: error.message }
          }
        }
      });

      throw error;
    }
  }

  /**
   * Enhanced OCR extraction using ML service
   */
  async enhanceExtraction(invoice) {
    const startTime = Date.now();

    try {
      // Call ML service for enhanced extraction
      const response = await axios.post(`${ML_SERVICE_URL}/api/invoice/extract`, {
        invoiceId: invoice._id.toString(),
        files: invoice.rawFiles.map(f => f.filePath),
        existingFields: invoice.extractedFields
      });

      const mlResult = response.data;

      // Update invoice with enhanced extraction
      if (mlResult.success) {
        invoice.extractedFields = mlResult.fields;
        invoice.overallExtractionConfidence = mlResult.confidence;
        
        // Update line items if extracted
        if (mlResult.lineItems && mlResult.lineItems.length > 0) {
          invoice.items = mlResult.lineItems.map((item, index) => ({
            lineNumber: index + 1,
            ...item
          }));
        }

        // Update header fields if higher confidence
        if (mlResult.invoiceNumber && mlResult.fieldConfidences?.invoiceNumber > 0.9) {
          invoice.invoiceNumber = mlResult.invoiceNumber;
        }
        if (mlResult.totalAmount && mlResult.fieldConfidences?.totalAmount > 0.9) {
          invoice.totalAmount = mlResult.totalAmount;
        }
      }

      return {
        success: true,
        confidence: mlResult.confidence,
        fieldsExtracted: mlResult.fields?.length || 0,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('ML extraction error:', error);
      return {
        success: false,
        confidence: invoice.overallExtractionConfidence,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check for duplicate invoices
   */
  async checkDuplicates(invoice) {
    try {
      // Check by invoice number and vendor
      const duplicates = await Invoice.findDuplicates(
        invoice.vendorId || invoice.vendor,
        invoice.invoiceNumber,
        invoice.totalAmount,
        invoice.invoiceDate
      );

      // Exclude current invoice
      const otherDuplicates = duplicates.filter(d => 
        d._id.toString() !== invoice._id.toString()
      );

      if (otherDuplicates.length > 0) {
        // Calculate similarity score
        const mostSimilar = otherDuplicates[0];
        let confidence = 0;

        // Exact invoice number match
        if (mostSimilar.invoiceNumber === invoice.invoiceNumber) {
          confidence += 0.5;
        }

        // Amount match
        const amountDiff = Math.abs(mostSimilar.totalAmount - invoice.totalAmount);
        if (amountDiff < 0.01) {
          confidence += 0.3;
        } else if (amountDiff / invoice.totalAmount < 0.01) {
          confidence += 0.2;
        }

        // Date proximity
        const dateDiff = Math.abs(mostSimilar.invoiceDate - invoice.invoiceDate);
        if (dateDiff < 86400000) { // Within 1 day
          confidence += 0.2;
        }

        // Document hash match
        if (invoice.documentHash && mostSimilar.documentHash === invoice.documentHash) {
          confidence = 1.0; // Definite duplicate
        }

        return {
          isDuplicate: confidence > 0.7,
          duplicateOf: mostSimilar._id,
          duplicateInvoiceNumber: mostSimilar.invoiceNumber,
          confidence,
          candidates: otherDuplicates.slice(0, 5).map(d => ({
            id: d._id,
            invoiceNumber: d.invoiceNumber,
            totalAmount: d.totalAmount,
            invoiceDate: d.invoiceDate
          }))
        };
      }

      return { isDuplicate: false, confidence: 0 };

    } catch (error) {
      console.error('Duplicate check error:', error);
      return { isDuplicate: false, error: error.message };
    }
  }

  /**
   * Fraud detection
   */
  async detectFraud(invoice) {
    const reasons = [];
    let score = 0;

    try {
      // Call ML service for fraud detection
      const response = await axios.post(`${ML_SERVICE_URL}/api/invoice/fraud-check`, {
        invoiceId: invoice._id.toString(),
        vendorId: (invoice.vendorId || invoice.vendor)?.toString(),
        amount: invoice.totalAmount,
        bankDetails: invoice.bankDetails
      });

      if (response.data.success) {
        score = response.data.fraudScore || 0;
        if (response.data.flags) {
          reasons.push(...response.data.flags);
        }
      }
    } catch (error) {
      console.error('ML fraud check error:', error);
    }

    // Additional rule-based checks
    
    // Check for bank account changes
    if (invoice.bankDetails?.changeDetected) {
      reasons.push('Bank account recently changed');
      score += 20;
    }

    // Check for unusual amount
    if (invoice.totalAmount > 100000) {
      reasons.push('High value invoice');
      score += 10;
    }

    // Check for round numbers (potential invoice stuffing)
    if (invoice.totalAmount % 1000 === 0 && invoice.totalAmount > 5000) {
      reasons.push('Suspicious round amount');
      score += 5;
    }

    // Check invoice date vs received date
    const daysDiff = Math.abs((invoice.invoiceDate - invoice.receivedDate) / 86400000);
    if (daysDiff > 90) {
      reasons.push('Invoice date significantly differs from received date');
      score += 15;
    }

    return {
      isSuspicious: score >= 30,
      score: Math.min(score, 100),
      reasons
    };
  }

  /**
   * Perform PO/GRN matching
   */
  async performMatching(invoice) {
    const startTime = Date.now();

    try {
      // Call ML service for semantic matching
      const response = await axios.post(`${ML_SERVICE_URL}/api/invoice/match`, {
        invoiceId: invoice._id.toString(),
        vendorId: (invoice.vendorId || invoice.vendor)?.toString(),
        poNumbers: invoice.purchaseOrderNumbers,
        lineItems: invoice.items,
        totalAmount: invoice.totalAmount,
        tolerances: this.toleranceSettings
      });

      const mlResult = response.data;

      // Create match record
      const matchRecord = new MatchRecord({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        matchType: invoice.hasPO ? '3-way' : 'non-po',
        overallMatchStatus: mlResult.status,
        overallMatchScore: mlResult.score,
        toleranceSettings: this.toleranceSettings,
        matchedPurchaseOrders: mlResult.matchedPOs || [],
        matchedGRNs: mlResult.matchedGRNs || [],
        lineMatchDetails: mlResult.lineMatches || [],
        matchSummary: {
          totalInvoiceLines: invoice.items?.length || 0,
          matchedLines: mlResult.matchedLines || 0,
          partialMatchLines: mlResult.partialMatchLines || 0,
          unmatchedLines: mlResult.unmatchedLines || 0,
          totalInvoiceAmount: invoice.totalAmount,
          matchedAmount: mlResult.matchedAmount || 0,
          unmatchedAmount: mlResult.unmatchedAmount || invoice.totalAmount
        },
        mismatchReasons: mlResult.mismatchReasons || [],
        autoMatchEligible: mlResult.score >= 0.95 && mlResult.mismatchReasons.length === 0,
        suggestedActions: mlResult.suggestedActions || [],
        processingTimeMs: Date.now() - startTime
      });

      await matchRecord.save();

      // Create exceptions for mismatches
      if (mlResult.mismatchReasons && mlResult.mismatchReasons.length > 0) {
        for (const mismatch of mlResult.mismatchReasons) {
          if (mismatch.severity === 'error' || mismatch.severity === 'critical') {
            await this.createException(invoice, mismatch.reason, {
              description: mismatch.description,
              affectedLines: mismatch.affectedLines,
              suggestedAction: mismatch.suggestedAction
            });
          }
        }
      }

      return {
        status: mlResult.status,
        score: mlResult.score,
        matchRecordId: matchRecord._id,
        autoMatchEligible: matchRecord.autoMatchEligible,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Matching error:', error);
      
      // Fallback to basic matching
      return await this.performBasicMatching(invoice, startTime);
    }
  }

  /**
   * Basic matching fallback
   */
  async performBasicMatching(invoice, startTime) {
    // Simple matching logic when ML service is unavailable
    const matchRecord = new MatchRecord({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      matchType: 'non-po',
      overallMatchStatus: 'no_match',
      overallMatchScore: 0,
      toleranceSettings: this.toleranceSettings,
      matchSummary: {
        totalInvoiceLines: invoice.items?.length || 0,
        matchedLines: 0,
        partialMatchLines: 0,
        unmatchedLines: invoice.items?.length || 0,
        totalInvoiceAmount: invoice.totalAmount,
        matchedAmount: 0,
        unmatchedAmount: invoice.totalAmount
      },
      autoMatchEligible: false,
      processingTimeMs: Date.now() - startTime
    });

    await matchRecord.save();

    return {
      status: 'no_match',
      score: 0,
      matchRecordId: matchRecord._id,
      autoMatchEligible: false,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Validate tax calculations
   */
  async validateTax(invoice) {
    const issues = [];

    // Calculate expected tax
    const calculatedTax = invoice.subtotal * (invoice.taxDetails?.taxRate || 0) / 100;
    const taxDifference = Math.abs(calculatedTax - invoice.taxAmount);

    // Check if tax calculation is within tolerance
    if (taxDifference > 1) { // More than $1 difference
      issues.push({
        field: 'taxAmount',
        expected: calculatedTax,
        actual: invoice.taxAmount,
        difference: taxDifference
      });
    }

    // Validate tax ID format (basic validation)
    if (invoice.vendorTaxId) {
      const taxIdValid = this.validateTaxIdFormat(invoice.vendorTaxId);
      if (!taxIdValid) {
        issues.push({
          field: 'taxId',
          value: invoice.vendorTaxId,
          error: 'Invalid tax ID format'
        });
      }
    }

    // Check for required tax fields based on jurisdiction
    if (invoice.taxAmount > 0 && !invoice.taxDetails?.taxType) {
      issues.push({
        field: 'taxType',
        error: 'Tax type not specified for taxable invoice'
      });
    }

    return {
      valid: issues.length === 0,
      issues,
      taxCalculationCorrect: taxDifference <= 1
    };
  }

  /**
   * Validate tax ID format
   */
  validateTaxIdFormat(taxId) {
    // US EIN format: XX-XXXXXXX
    const einPattern = /^\d{2}-\d{7}$/;
    // Generic alphanumeric pattern
    const genericPattern = /^[A-Z0-9-]{5,20}$/i;
    
    return einPattern.test(taxId) || genericPattern.test(taxId);
  }

  /**
   * Suggest GL coding
   */
  async suggestCoding(invoice) {
    try {
      // Call ML service for coding suggestions
      const response = await axios.post(`${ML_SERVICE_URL}/api/invoice/suggest-coding`, {
        invoiceId: invoice._id.toString(),
        vendorId: (invoice.vendorId || invoice.vendor)?.toString(),
        category: invoice.category,
        lineItems: invoice.items,
        amount: invoice.totalAmount
      });

      if (response.data.success) {
        const suggestions = response.data.suggestions || [];
        const topSuggestion = suggestions[0];

        return {
          suggestions,
          autoApply: topSuggestion && topSuggestion.confidence >= 0.9,
          confidence: topSuggestion?.confidence || 0
        };
      }
    } catch (error) {
      console.error('Coding suggestion error:', error);
    }

    // Fallback suggestions based on category
    const defaultCoding = this.getDefaultCoding(invoice.category);
    return {
      suggestions: [defaultCoding],
      autoApply: false,
      confidence: 0.5
    };
  }

  /**
   * Get default GL coding by category
   */
  getDefaultCoding(category) {
    const defaults = {
      'goods': { glAccount: '5100', costCenter: 'INVENTORY', confidence: 0.6, reason: 'Default for goods' },
      'services': { glAccount: '6200', costCenter: 'SERVICES', confidence: 0.6, reason: 'Default for services' },
      'subscription': { glAccount: '6300', costCenter: 'SOFTWARE', confidence: 0.6, reason: 'Default for subscriptions' },
      'utilities': { glAccount: '6400', costCenter: 'FACILITIES', confidence: 0.6, reason: 'Default for utilities' },
      'travel': { glAccount: '6500', costCenter: 'T&E', confidence: 0.6, reason: 'Default for travel' },
      'other': { glAccount: '6900', costCenter: 'GENERAL', confidence: 0.4, reason: 'Default for uncategorized' }
    };

    return defaults[category] || defaults['other'];
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(invoice) {
    const anomalies = [];

    try {
      // Call ML service for anomaly detection
      const response = await axios.post(`${ML_SERVICE_URL}/api/invoice/detect-anomalies`, {
        invoiceId: invoice._id.toString(),
        vendorId: (invoice.vendorId || invoice.vendor)?.toString(),
        amount: invoice.totalAmount,
        lineItems: invoice.items,
        invoiceDate: invoice.invoiceDate
      });

      if (response.data.success && response.data.anomalies) {
        anomalies.push(...response.data.anomalies);
      }
    } catch (error) {
      console.error('Anomaly detection error:', error);
    }

    // Rule-based anomaly checks
    
    // Check for unusual payment terms
    if (invoice.paymentTermsDays < 15 && invoice.totalAmount > 50000) {
      anomalies.push('Short payment terms for high-value invoice');
    }

    // Check for future invoice date
    if (invoice.invoiceDate > new Date()) {
      anomalies.push('Invoice date is in the future');
    }

    // Check for very old invoice
    const ageInDays = (new Date() - invoice.invoiceDate) / 86400000;
    if (ageInDays > 180) {
      anomalies.push('Invoice is older than 6 months');
    }

    // Check for negative amounts
    if (invoice.totalAmount < 0 && invoice.invoiceType !== 'credit_memo') {
      anomalies.push('Negative amount on non-credit memo invoice');
    }

    return {
      hasAnomaly: anomalies.length > 0,
      reasons: anomalies,
      count: anomalies.length
    };
  }

  /**
   * Create exception record
   */
  async createException(invoice, exceptionType, details) {
    try {
      const exception = new InvoiceException({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        vendorId: invoice.vendorId || invoice.vendor,
        vendorName: invoice.vendorName,
        exceptionType,
        severity: this.getExceptionSeverity(exceptionType),
        priority: this.getExceptionPriority(exceptionType, invoice.totalAmount),
        title: this.getExceptionTitle(exceptionType),
        description: details.description || JSON.stringify(details),
        affectedFields: details.affectedFields || [],
        financialImpact: {
          amountAtRisk: invoice.totalAmount,
          currency: invoice.currency
        },
        suggestedActions: details.suggestedActions || this.getSuggestedActions(exceptionType),
        sla: {
          responseDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
          resolutionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      await exception.save();

      // Update invoice with exception reference
      invoice.exceptionId = exception._id;

      return exception;

    } catch (error) {
      console.error('Exception creation error:', error);
      return null;
    }
  }

  /**
   * Get exception severity
   */
  getExceptionSeverity(exceptionType) {
    const severities = {
      'duplicate_invoice': 'high',
      'fraud_suspected': 'critical',
      'po_not_found': 'medium',
      'grn_not_found': 'medium',
      'quantity_mismatch': 'medium',
      'price_mismatch': 'medium',
      'amount_mismatch': 'high',
      'invalid_tax_calculation': 'medium',
      'bank_account_change': 'high',
      'anomaly_detected': 'medium'
    };
    return severities[exceptionType] || 'medium';
  }

  /**
   * Get exception priority
   */
  getExceptionPriority(exceptionType, amount) {
    let priority = 5;
    
    // Adjust by type
    if (exceptionType === 'fraud_suspected') priority = 10;
    if (exceptionType === 'duplicate_invoice') priority = 9;
    if (exceptionType === 'bank_account_change') priority = 8;

    // Adjust by amount
    if (amount > 100000) priority = Math.min(priority + 2, 10);
    else if (amount > 50000) priority = Math.min(priority + 1, 10);

    return priority;
  }

  /**
   * Get exception title
   */
  getExceptionTitle(exceptionType) {
    const titles = {
      'duplicate_invoice': 'Potential Duplicate Invoice',
      'fraud_suspected': 'Fraud Alert',
      'po_not_found': 'Purchase Order Not Found',
      'grn_not_found': 'Goods Receipt Not Found',
      'quantity_mismatch': 'Quantity Mismatch',
      'price_mismatch': 'Price Mismatch',
      'amount_mismatch': 'Amount Mismatch',
      'invalid_tax_calculation': 'Invalid Tax Calculation',
      'bank_account_change': 'Bank Account Change Detected',
      'anomaly_detected': 'Anomaly Detected'
    };
    return titles[exceptionType] || 'Invoice Exception';
  }

  /**
   * Get suggested actions for exception type
   */
  getSuggestedActions(exceptionType) {
    const actions = {
      'duplicate_invoice': [
        { action: 'reject_invoice', description: 'Reject as duplicate', confidence: 0.8 },
        { action: 'manual_review', description: 'Review manually', confidence: 0.5 }
      ],
      'fraud_suspected': [
        { action: 'escalate', description: 'Escalate to fraud team', confidence: 0.9 },
        { action: 'contact_vendor', description: 'Contact vendor for verification', confidence: 0.6 }
      ],
      'po_not_found': [
        { action: 'manual_match', description: 'Manually match to PO', confidence: 0.7 },
        { action: 'create_exception', description: 'Request PO from buyer', confidence: 0.6 }
      ],
      'quantity_mismatch': [
        { action: 'approve_with_adjustment', description: 'Approve with quantity adjustment', confidence: 0.7 },
        { action: 'contact_vendor', description: 'Request credit note', confidence: 0.5 }
      ],
      'price_mismatch': [
        { action: 'approve_with_adjustment', description: 'Approve with price adjustment', confidence: 0.6 },
        { action: 'contact_vendor', description: 'Negotiate price correction', confidence: 0.5 }
      ]
    };

    return actions[exceptionType] || [
      { action: 'manual_review', description: 'Review manually', confidence: 0.5 }
    ];
  }

  /**
   * Determine final status after processing
   */
  async determineStatus(invoice, results) {
    // Check for blocking exceptions
    if (results.duplicateCheck?.isDuplicate && results.duplicateCheck.confidence > 0.9) {
      return { status: 'exception', subStatus: 'duplicate', autoApproveEligible: false };
    }

    if (results.fraudCheck?.isSuspicious && results.fraudCheck.score > 50) {
      return { status: 'exception', subStatus: 'fraud_review', autoApproveEligible: false };
    }

    // Check match status
    if (invoice.hasPO) {
      if (results.matching?.score < 0.8) {
        return { status: 'exception', subStatus: 'match_failed', autoApproveEligible: false };
      }
    }

    // Check for anomalies
    if (results.anomalyCheck?.hasAnomaly) {
      return { status: 'pending_review', subStatus: 'anomaly_review', autoApproveEligible: false };
    }

    // Check auto-approval eligibility
    const autoApproveEligible = 
      invoice.totalAmount <= this.autoApproveThreshold &&
      (!invoice.hasPO || results.matching?.autoMatchEligible) &&
      !results.duplicateCheck?.isDuplicate &&
      !results.fraudCheck?.isSuspicious &&
      !results.anomalyCheck?.hasAnomaly &&
      (results.coding?.autoApply || invoice.glAccount);

    if (autoApproveEligible) {
      return { status: 'approved', subStatus: 'auto_approved', autoApproveEligible: true };
    }

    // Default to pending approval
    return { status: 'pending_approval', subStatus: null, autoApproveEligible: false };
  }

  /**
   * Calculate automation score
   */
  calculateAutomationScore(results) {
    let score = 0;
    let factors = 0;

    // Extraction confidence
    if (results.extraction?.confidence) {
      score += results.extraction.confidence * 20;
      factors++;
    }

    // Match score
    if (results.matching?.score) {
      score += results.matching.score * 30;
      factors++;
    }

    // Coding confidence
    if (results.coding?.confidence) {
      score += results.coding.confidence * 20;
      factors++;
    }

    // No duplicates
    if (!results.duplicateCheck?.isDuplicate) {
      score += 10;
      factors++;
    }

    // No fraud
    if (!results.fraudCheck?.isSuspicious) {
      score += 10;
      factors++;
    }

    // No anomalies
    if (!results.anomalyCheck?.hasAnomaly) {
      score += 10;
      factors++;
    }

    return factors > 0 ? Math.round(score) : 0;
  }

  /**
   * Force match invoice to PO
   */
  async forceMatch(invoiceId, poIds, grnIds, userId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Create or update match record
    let matchRecord = await MatchRecord.findOne({ invoiceId });
    if (!matchRecord) {
      matchRecord = new MatchRecord({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        matchType: '3-way'
      });
    }

    matchRecord.overallMatchStatus = 'manual_matched';
    matchRecord.overallMatchScore = 1.0;
    matchRecord.matchedPurchaseOrders = poIds.map(id => ({ poId: id }));
    matchRecord.matchedGRNs = (grnIds || []).map(id => ({ grnId: id }));
    matchRecord.manualOverrides.push({
      field: 'match',
      originalValue: 'no_match',
      overrideValue: 'manual_matched',
      reason: 'Manually matched by user',
      overriddenBy: userId,
      overriddenAt: new Date()
    });

    await matchRecord.save();

    // Update invoice
    invoice.matchStatus = 'manual_matched';
    invoice.matchScore = 1.0;
    invoice.matchRecordId = matchRecord._id;
    invoice.purchaseOrderIds = poIds;
    invoice.hasPO = true;
    invoice.status = 'matched';
    invoice.processingMetrics.humanTouchCount = (invoice.processingMetrics.humanTouchCount || 0) + 1;

    invoice.auditTrail.push({
      action: 'manual_match',
      performedBy: userId,
      performedAt: new Date(),
      details: { poIds, grnIds }
    });

    await invoice.save();

    return { success: true, matchRecordId: matchRecord._id };
  }

  /**
   * Update GL coding
   */
  async updateCoding(invoiceId, coding, userId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const previousCoding = {
      glAccount: invoice.glAccount,
      costCenter: invoice.costCenter,
      department: invoice.department,
      projectCode: invoice.projectCode
    };

    invoice.glAccount = coding.glAccount || invoice.glAccount;
    invoice.costCenter = coding.costCenter || invoice.costCenter;
    invoice.department = coding.department || invoice.department;
    invoice.projectCode = coding.projectCode || invoice.projectCode;
    invoice.codingMethod = 'manual';

    invoice.auditTrail.push({
      action: 'coding_updated',
      performedBy: userId,
      performedAt: new Date(),
      details: { previous: previousCoding, new: coding }
    });

    await invoice.save();

    return { success: true };
  }
}

module.exports = new InvoiceIntelligent();
