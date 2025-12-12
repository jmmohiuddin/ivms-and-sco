/**
 * Onboarding Intelligent Layer
 * Handles OCR, NLP, Sanctions, Risk Scoring, and Fraud Detection
 */

const OnboardingDocument = require('../../models/OnboardingDocument');
const OnboardingCase = require('../../models/OnboardingCase');
const VendorProfile = require('../../models/VendorProfile');
const RiskScore = require('../../models/RiskScore');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

class OnboardingIntelligent {
  constructor() {
    this.ocrConfidenceThreshold = 0.85;
    this.autoApproveRiskThreshold = 25;
    
    // Sanctions screening providers (placeholder)
    this.sanctionsProviders = ['OFAC', 'UN', 'EU', 'UK'];
    
    // Risk weights
    this.riskWeights = {
      documentConfidence: 0.15,
      sanctionsRisk: 0.25,
      geographicRisk: 0.15,
      financialRisk: 0.10,
      operationalRisk: 0.10,
      complianceRisk: 0.10,
      reputationalRisk: 0.10,
      fraudRisk: 0.05
    };

    // High-risk countries (example list)
    this.highRiskCountries = [
      'IR', 'KP', 'SY', 'CU', 'VE', 'BY', 'RU', 'MM'
    ];
  }

  /**
   * Process uploaded document with OCR
   */
  async processDocument(documentId) {
    try {
      const document = await OnboardingDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      document.processingStatus = 'processing';
      document.processingAttempts += 1;
      await document.save();

      // Call ML service for OCR
      const ocrResult = await this.callOCRService(document);

      // Update document with OCR results
      document.ocrStatus = 'completed';
      document.ocrConfidence = ocrResult.confidence;
      document.rawOcrText = ocrResult.raw_text;
      document.extractedFields = ocrResult.fields.map(field => ({
        fieldName: field.name,
        value: field.value,
        confidence: field.confidence,
        boundingBox: field.bounding_box,
        source: 'ocr'
      }));
      document.extractedData = ocrResult.structured_data;

      // Run validation
      await this.validateDocument(document);

      // Check for fraud indicators
      await this.checkDocumentFraud(document);

      document.processingStatus = document.ocrConfidence >= this.ocrConfidenceThreshold 
        ? 'completed' 
        : 'manual_required';
      document.lastProcessedAt = new Date();

      await document.save();

      // Update onboarding case task
      if (document.onboardingCase) {
        await this.updateCaseTask(document.onboardingCase, 'document_review', {
          documentId: document._id,
          confidence: document.ocrConfidence,
          status: document.processingStatus
        });
      }

      return document;
    } catch (error) {
      console.error('Document processing error:', error);
      
      const document = await OnboardingDocument.findById(documentId);
      if (document) {
        document.processingStatus = 'failed';
        document.processingError = error.message;
        await document.save();
      }
      
      throw error;
    }
  }

  /**
   * Call OCR service
   */
  async callOCRService(document) {
    try {
      // Map document type to OCR endpoint
      const endpoint = this.getOCREndpoint(document.documentType);
      
      const response = await axios.post(`${ML_SERVICE_URL}${endpoint}`, {
        image_path: document.filePath,
        document_type: document.documentType
      }, {
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      // Return simulated OCR result for development
      return this.simulateOCRResult(document);
    }
  }

  /**
   * Get OCR endpoint based on document type
   */
  getOCREndpoint(documentType) {
    const endpoints = {
      'w9': '/ocr/invoice', // W9 uses similar extraction
      'w8ben': '/ocr/invoice',
      'business_registration': '/ocr/certificate',
      'insurance_certificate': '/ocr/certificate',
      'bank_statement': '/ocr/invoice',
      'voided_check': '/ocr/invoice',
      'master_agreement': '/ocr/contract',
      'nda': '/ocr/contract'
    };
    
    return endpoints[documentType] || '/ocr/invoice';
  }

  /**
   * Simulate OCR result for development
   */
  simulateOCRResult(document) {
    const baseResult = {
      success: true,
      confidence: 0.92,
      raw_text: 'Simulated OCR text extraction',
      fields: [],
      structured_data: {}
    };

    switch (document.documentType) {
      case 'w9':
        return {
          ...baseResult,
          fields: [
            { name: 'name', value: 'Sample Company LLC', confidence: 0.95 },
            { name: 'business_name', value: 'Sample Company', confidence: 0.94 },
            { name: 'tax_classification', value: 'LLC', confidence: 0.92 },
            { name: 'ein', value: '12-3456789', confidence: 0.98 },
            { name: 'address', value: '123 Main St, City, ST 12345', confidence: 0.91 }
          ],
          structured_data: {
            name: 'Sample Company LLC',
            ein: '12-3456789',
            tax_classification: 'LLC'
          }
        };

      case 'business_registration':
        return {
          ...baseResult,
          fields: [
            { name: 'legal_name', value: 'Sample Corporation', confidence: 0.96 },
            { name: 'registration_number', value: 'REG-2024-001234', confidence: 0.97 },
            { name: 'date_incorporated', value: '2020-01-15', confidence: 0.93 },
            { name: 'state', value: 'Delaware', confidence: 0.95 }
          ],
          structured_data: {
            legal_name: 'Sample Corporation',
            registration_number: 'REG-2024-001234',
            date_incorporated: '2020-01-15'
          }
        };

      case 'insurance_certificate':
        return {
          ...baseResult,
          fields: [
            { name: 'insured_name', value: 'Sample Company LLC', confidence: 0.94 },
            { name: 'policy_number', value: 'POL-2024-567890', confidence: 0.96 },
            { name: 'coverage_amount', value: '2000000', confidence: 0.92 },
            { name: 'effective_date', value: '2024-01-01', confidence: 0.94 },
            { name: 'expiry_date', value: '2025-01-01', confidence: 0.94 }
          ],
          structured_data: {
            insured_name: 'Sample Company LLC',
            policy_number: 'POL-2024-567890',
            coverage_amount: 2000000,
            expiry_date: '2025-01-01'
          }
        };

      default:
        return baseResult;
    }
  }

  /**
   * Validate document fields
   */
  async validateDocument(document) {
    const validationRules = this.getValidationRules(document.documentType);
    
    for (const rule of validationRules) {
      const field = document.extractedFields.find(f => f.fieldName === rule.field);
      
      if (rule.required && !field?.value) {
        document.addValidationResult(rule.name, false, `Required field ${rule.field} is missing`, 'error');
        continue;
      }

      if (field?.value && rule.pattern) {
        const regex = new RegExp(rule.pattern);
        const passed = regex.test(field.value);
        document.addValidationResult(
          rule.name,
          passed,
          passed ? `${rule.field} format valid` : `${rule.field} format invalid`,
          passed ? 'info' : 'error'
        );
      }

      if (field?.value && rule.validator) {
        const result = await rule.validator(field.value, document);
        document.addValidationResult(rule.name, result.passed, result.message, result.severity);
      }
    }
  }

  /**
   * Get validation rules for document type
   */
  getValidationRules(documentType) {
    const rules = {
      'w9': [
        { field: 'name', name: 'name_required', required: true },
        { field: 'ein', name: 'ein_format', required: true, pattern: '^\\d{2}-\\d{7}$' }
      ],
      'business_registration': [
        { field: 'legal_name', name: 'legal_name_required', required: true },
        { field: 'registration_number', name: 'reg_number_required', required: true }
      ],
      'insurance_certificate': [
        { field: 'policy_number', name: 'policy_required', required: true },
        { field: 'expiry_date', name: 'expiry_check', required: true,
          validator: async (value) => {
            const expiry = new Date(value);
            const now = new Date();
            const daysUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24);
            
            if (expiry < now) {
              return { passed: false, message: 'Insurance has expired', severity: 'error' };
            }
            if (daysUntilExpiry < 30) {
              return { passed: true, message: 'Insurance expiring soon', severity: 'warning' };
            }
            return { passed: true, message: 'Insurance valid', severity: 'info' };
          }
        }
      ]
    };

    return rules[documentType] || [];
  }

  /**
   * Check document for fraud indicators
   */
  async checkDocumentFraud(document) {
    const fraudIndicators = [];

    // Check for low confidence areas
    const lowConfidenceFields = document.extractedFields.filter(f => f.confidence < 0.7);
    if (lowConfidenceFields.length > 0) {
      fraudIndicators.push({
        type: 'low_confidence',
        severity: 'medium',
        description: `${lowConfidenceFields.length} fields have low OCR confidence`,
        confidence: 0.6
      });
    }

    // Check for duplicate document hash
    const duplicateDoc = await OnboardingDocument.findOne({
      _id: { $ne: document._id },
      fileHash: document.fileHash,
      vendorProfile: { $ne: document.vendorProfile }
    });

    if (duplicateDoc) {
      fraudIndicators.push({
        type: 'duplicate_document',
        severity: 'high',
        description: 'Same document submitted by another vendor',
        confidence: 0.95
      });
    }

    document.fraudIndicators = fraudIndicators;
    document.fraudCheckStatus = fraudIndicators.some(i => i.severity === 'high') 
      ? 'suspicious' 
      : 'clear';
  }

  /**
   * Analyze contract with NLP
   */
  async analyzeContract(documentId) {
    try {
      const document = await OnboardingDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Call NLP service
      const nlpResult = await this.callNLPService(document);

      document.nlpAnalysis = {
        status: 'completed',
        clauses: nlpResult.clauses,
        entities: nlpResult.entities,
        sentiment: nlpResult.sentiment,
        riskIndicators: nlpResult.risks,
        summary: nlpResult.summary
      };

      await document.save();
      return document.nlpAnalysis;
    } catch (error) {
      console.error('NLP analysis error:', error);
      throw error;
    }
  }

  /**
   * Call NLP service
   */
  async callNLPService(document) {
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/nlp/analyze-contract`, {
        text: document.rawOcrText || 'Contract text content',
        contract_id: document._id
      }, {
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      // Return simulated result
      return {
        clauses: [
          { type: 'payment_terms', text: 'Net 30 payment terms', risk: 'low' },
          { type: 'liability', text: 'Limited liability clause', risk: 'medium' },
          { type: 'termination', text: '30 days notice for termination', risk: 'low' }
        ],
        entities: [
          { type: 'organization', value: 'Sample Company LLC', confidence: 0.95 },
          { type: 'date', value: '2024-01-01', confidence: 0.92 }
        ],
        sentiment: { score: 0.2, classification: 'neutral' },
        risks: [
          { type: 'indemnity', severity: 'medium', description: 'Broad indemnification clause' }
        ],
        summary: 'Standard service agreement with typical commercial terms.'
      };
    }
  }

  /**
   * Run sanctions screening
   */
  async runSanctionsCheck(vendorProfileId) {
    try {
      const vendorProfile = await VendorProfile.findById(vendorProfileId);
      if (!vendorProfile) {
        throw new Error('Vendor profile not found');
      }

      const searchTerms = [
        vendorProfile.legalName,
        vendorProfile.dbaName,
        ...vendorProfile.addresses.map(a => a.country)
      ].filter(Boolean);

      // Simulate sanctions check (would call external API in production)
      const results = await this.simulateSanctionsCheck(searchTerms);

      // Update vendor profile
      vendorProfile.sanctionsStatus = results.hits.length > 0 ? 'flagged' : 'clear';
      vendorProfile.lastSanctionsCheck = new Date();
      await vendorProfile.save();

      // Update onboarding case
      if (vendorProfile.onboardingCase) {
        const onboardingCase = await OnboardingCase.findById(vendorProfile.onboardingCase);
        if (onboardingCase) {
          onboardingCase.verificationResults.sanctions = {
            status: results.hits.length > 0 ? 'flagged' : 'clear',
            checkedAt: new Date(),
            provider: 'OFAC/SDN',
            hits: results.hits
          };

          await this.updateCaseTask(onboardingCase._id, 'sanctions_check', {
            status: onboardingCase.verificationResults.sanctions.status,
            hits: results.hits.length
          });

          onboardingCase.addHistory(
            'sanctions_check_completed',
            `Sanctions check completed: ${results.hits.length} potential matches`,
            null,
            'system'
          );

          await onboardingCase.save();
        }
      }

      return results;
    } catch (error) {
      console.error('Sanctions check error:', error);
      throw error;
    }
  }

  /**
   * Simulate sanctions check
   */
  async simulateSanctionsCheck(searchTerms) {
    // In production, this would call OFAC API, World-Check, etc.
    return {
      searched: searchTerms,
      hits: [], // No hits in simulation
      sources: this.sanctionsProviders,
      checkedAt: new Date()
    };
  }

  /**
   * Calculate risk score for vendor
   */
  async calculateRiskScore(vendorProfileId, onboardingCaseId = null) {
    try {
      const vendorProfile = await VendorProfile.findById(vendorProfileId)
        .populate('onboardingCase');
      
      if (!vendorProfile) {
        throw new Error('Vendor profile not found');
      }

      const onboardingCase = onboardingCaseId 
        ? await OnboardingCase.findById(onboardingCaseId).populate('documents')
        : vendorProfile.onboardingCase;

      // Calculate component scores
      const componentScores = {
        documentConfidence: await this.calculateDocumentConfidenceScore(onboardingCase),
        sanctionsRisk: this.calculateSanctionsRiskScore(vendorProfile),
        geographicRisk: this.calculateGeographicRiskScore(vendorProfile),
        financialRisk: this.calculateFinancialRiskScore(vendorProfile),
        operationalRisk: this.calculateOperationalRiskScore(vendorProfile),
        complianceRisk: await this.calculateComplianceRiskScore(vendorProfile),
        reputationalRisk: { score: 10, weight: this.riskWeights.reputationalRisk, factors: [] },
        fraudRisk: await this.calculateFraudRiskScore(onboardingCase)
      };

      // Calculate overall score
      let overallScore = 0;
      const featureContributions = [];

      for (const [key, component] of Object.entries(componentScores)) {
        const weight = this.riskWeights[key] || 0;
        const contribution = component.score * weight;
        overallScore += contribution;

        featureContributions.push({
          feature: key,
          value: component.score,
          contribution,
          weight,
          description: `${key.replace(/([A-Z])/g, ' $1').trim()} risk score`
        });
      }

      // Determine risk tier and action
      const riskTier = RiskScore.calculateRiskTier(overallScore);
      const recommendedAction = RiskScore.determineAction(
        riskTier, 
        this.autoApproveRiskThreshold, 
        overallScore
      );

      // Create risk score record
      const riskScore = new RiskScore({
        vendorProfile: vendorProfileId,
        onboardingCase: onboardingCase?._id,
        scoreType: 'onboarding',
        overallScore: Math.round(overallScore),
        riskTier,
        componentScores,
        featureContributions,
        topRiskFactors: this.identifyTopRiskFactors(componentScores),
        modelVersion: '1.0.0',
        algorithmType: 'hybrid',
        scoreConfidence: 0.85,
        thresholds: {
          autoApprove: this.autoApproveRiskThreshold,
          lowRisk: 30,
          mediumRisk: 50,
          highRisk: 70,
          critical: 90
        },
        recommendedAction,
        isLatest: true
      });

      await riskScore.save();

      // Update vendor profile
      vendorProfile.riskTier = riskTier;
      vendorProfile.currentRiskScore = riskScore._id;
      await vendorProfile.save();

      // Update onboarding case
      if (onboardingCase) {
        onboardingCase.riskTier = riskTier;
        onboardingCase.riskScores.push(riskScore._id);
        onboardingCase.autoApprovalEligible = recommendedAction === 'auto_approve';

        onboardingCase.addHistory(
          'risk_score_updated',
          `Risk score calculated: ${Math.round(overallScore)} (${riskTier})`,
          null,
          'system',
          { score: overallScore, tier: riskTier, action: recommendedAction }
        );

        await onboardingCase.save();
      }

      return riskScore;
    } catch (error) {
      console.error('Risk score calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate document confidence score
   */
  async calculateDocumentConfidenceScore(onboardingCase) {
    if (!onboardingCase?.documents || onboardingCase.documents.length === 0) {
      return { score: 50, weight: this.riskWeights.documentConfidence, factors: ['No documents'] };
    }

    const documents = await OnboardingDocument.find({ 
      _id: { $in: onboardingCase.documents } 
    });

    const avgConfidence = documents.reduce((sum, doc) => 
      sum + (doc.ocrConfidence || 0), 0) / documents.length;

    const factors = [];
    if (avgConfidence < 0.8) factors.push('Low OCR confidence');
    
    const lowConfidenceDocs = documents.filter(d => (d.ocrConfidence || 0) < 0.7);
    if (lowConfidenceDocs.length > 0) {
      factors.push(`${lowConfidenceDocs.length} documents need review`);
    }

    // Lower score = lower risk, so invert confidence
    const score = (1 - avgConfidence) * 100;

    return {
      score: Math.round(score),
      weight: this.riskWeights.documentConfidence,
      factors
    };
  }

  /**
   * Calculate sanctions risk score
   */
  calculateSanctionsRiskScore(vendorProfile) {
    const factors = [];
    let score = 0;

    if (vendorProfile.sanctionsStatus === 'flagged') {
      score = 100;
      factors.push('Sanctions hit detected');
    } else if (vendorProfile.sanctionsStatus === 'not_checked') {
      score = 50;
      factors.push('Sanctions check pending');
    }

    if (vendorProfile.pepStatus === 'flagged') {
      score = Math.max(score, 80);
      factors.push('PEP match detected');
    }

    return {
      score,
      weight: this.riskWeights.sanctionsRisk,
      hits: vendorProfile.sanctionsStatus === 'flagged' ? 1 : 0,
      sources: this.sanctionsProviders,
      factors
    };
  }

  /**
   * Calculate geographic risk score
   */
  calculateGeographicRiskScore(vendorProfile) {
    const factors = [];
    let score = 0;
    const countries = [];
    const highRiskCountries = [];

    for (const address of vendorProfile.addresses) {
      if (address.country) {
        countries.push(address.country);
        if (this.highRiskCountries.includes(address.country)) {
          highRiskCountries.push(address.country);
          score = Math.max(score, 80);
          factors.push(`High-risk country: ${address.country}`);
        }
      }
    }

    if (vendorProfile.incorporationCountry) {
      if (this.highRiskCountries.includes(vendorProfile.incorporationCountry)) {
        score = 90;
        factors.push(`Incorporated in high-risk country: ${vendorProfile.incorporationCountry}`);
      }
    }

    return {
      score,
      weight: this.riskWeights.geographicRisk,
      countries: [...new Set(countries)],
      highRiskCountries: [...new Set(highRiskCountries)],
      factors
    };
  }

  /**
   * Calculate financial risk score
   */
  calculateFinancialRiskScore(vendorProfile) {
    const factors = [];
    let score = 20; // Base score

    // Check bank account verification
    const hasVerifiedBank = vendorProfile.bankAccounts?.some(b => b.verified);
    if (!hasVerifiedBank) {
      score += 30;
      factors.push('Bank account not verified');
    }

    // Check tax information
    const hasTaxId = vendorProfile.taxIds?.length > 0;
    if (!hasTaxId) {
      score += 20;
      factors.push('No tax ID provided');
    }

    return {
      score: Math.min(100, score),
      weight: this.riskWeights.financialRisk,
      factors
    };
  }

  /**
   * Calculate operational risk score
   */
  calculateOperationalRiskScore(vendorProfile) {
    const factors = [];
    let score = 20;

    // New vendor (less than 1 year)
    if (vendorProfile.incorporationDate) {
      const age = (Date.now() - new Date(vendorProfile.incorporationDate)) / (1000 * 60 * 60 * 24 * 365);
      if (age < 1) {
        score += 30;
        factors.push('Company less than 1 year old');
      } else if (age < 3) {
        score += 15;
        factors.push('Company less than 3 years old');
      }
    }

    // Small company
    if (vendorProfile.employeeCount && vendorProfile.employeeCount < 10) {
      score += 15;
      factors.push('Small company (less than 10 employees)');
    }

    return {
      score: Math.min(100, score),
      weight: this.riskWeights.operationalRisk,
      factors
    };
  }

  /**
   * Calculate compliance risk score
   */
  async calculateComplianceRiskScore(vendorProfile) {
    const factors = [];
    let score = 20;
    const missingCertifications = [];
    const expiredCertifications = [];

    // Check insurance
    const hasValidInsurance = vendorProfile.insurancePolicies?.some(p => 
      p.expiryDate && new Date(p.expiryDate) > new Date()
    );
    
    if (!hasValidInsurance && vendorProfile.insurancePolicies?.length > 0) {
      score += 25;
      factors.push('No valid insurance');
    }

    // Check certifications (would check against required certs for category)
    if (!vendorProfile.certifications || vendorProfile.certifications.length === 0) {
      score += 15;
      factors.push('No certifications on file');
    }

    return {
      score: Math.min(100, score),
      weight: this.riskWeights.complianceRisk,
      missingCertifications,
      expiredCertifications,
      factors
    };
  }

  /**
   * Calculate fraud risk score
   */
  async calculateFraudRiskScore(onboardingCase) {
    const factors = [];
    let score = 10;

    if (!onboardingCase?.documents) {
      return { score, weight: this.riskWeights.fraudRisk, indicators: [], factors };
    }

    const documents = await OnboardingDocument.find({ 
      _id: { $in: onboardingCase.documents } 
    });

    for (const doc of documents) {
      if (doc.fraudCheckStatus === 'suspicious') {
        score += 40;
        factors.push(`Suspicious document: ${doc.documentType}`);
      }
    }

    return {
      score: Math.min(100, score),
      weight: this.riskWeights.fraudRisk,
      indicators: factors,
      factors
    };
  }

  /**
   * Identify top risk factors from component scores
   */
  identifyTopRiskFactors(componentScores) {
    const factors = [];

    for (const [key, component] of Object.entries(componentScores)) {
      if (component.score > 50 && component.factors) {
        for (const factor of component.factors) {
          factors.push({
            factor,
            severity: component.score >= 80 ? 'high' : component.score >= 50 ? 'medium' : 'low',
            description: factor,
            recommendation: this.getRecommendation(key, component.score)
          });
        }
      }
    }

    return factors.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    }).slice(0, 5);
  }

  /**
   * Get recommendation for risk factor
   */
  getRecommendation(riskType, score) {
    const recommendations = {
      documentConfidence: 'Request clearer document scans or manual review',
      sanctionsRisk: 'Escalate to compliance team for review',
      geographicRisk: 'Conduct enhanced due diligence',
      financialRisk: 'Verify bank account via micro-deposits',
      operationalRisk: 'Request additional references or financial statements',
      complianceRisk: 'Request updated certifications and insurance',
      fraudRisk: 'Flag for fraud investigation'
    };

    return recommendations[riskType] || 'Review and verify';
  }

  /**
   * Update task in onboarding case
   */
  async updateCaseTask(caseId, taskType, result) {
    const onboardingCase = await OnboardingCase.findById(caseId);
    if (!onboardingCase) return;

    const task = onboardingCase.tasks.find(t => t.type === taskType);
    if (task) {
      task.status = result.status === 'flagged' || result.status === 'failed' 
        ? 'failed' 
        : 'completed';
      task.completedAt = new Date();
      task.result = result;
    }

    await onboardingCase.save();
  }
}

module.exports = new OnboardingIntelligent();
