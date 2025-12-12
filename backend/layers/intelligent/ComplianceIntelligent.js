/**
 * Compliance Intelligence Layer
 * Policy engine, risk scoring, NLP analysis, and anomaly detection
 */

const VendorComplianceProfile = require('../../models/VendorComplianceProfile');
const PolicyRule = require('../../models/PolicyRule');
const ComplianceEvent = require('../../models/ComplianceEvent');
const RemediationCase = require('../../models/RemediationCase');
const axios = require('axios');

class ComplianceIntelligenceLayer {
  constructor() {
    this.ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
  }

  // =====================================================
  // POLICY ENGINE
  // =====================================================

  /**
   * Evaluate all active policies against a vendor
   */
  async evaluatePolicies(vendorId, vendorData = null) {
    try {
      // Get vendor compliance profile
      const profile = await VendorComplianceProfile.findOne({ vendorId })
        .populate('vendorId');
      
      if (!profile) {
        throw new Error('Vendor compliance profile not found');
      }
      
      const vendor = vendorData || profile.vendorId;
      
      // Get applicable policies
      const policies = await this.getApplicablePolicies(vendor);
      
      const evaluationResults = [];
      const violations = [];
      
      for (const policy of policies) {
        const result = await this.evaluateSinglePolicy(policy, profile, vendor);
        evaluationResults.push(result);
        
        if (!result.passed) {
          violations.push({
            policyId: policy._id,
            policyName: policy.name,
            severity: policy.severity,
            findings: result.findings,
            enforcementAction: policy.enforcementAction
          });
        }
      }
      
      // Handle enforcement actions
      for (const violation of violations) {
        await this.handlePolicyViolation(profile, violation);
      }
      
      // Update profile with evaluation results
      profile.lastPolicyEvaluation = {
        evaluatedAt: new Date(),
        policiesEvaluated: policies.length,
        violations: violations.length,
        results: evaluationResults
      };
      await profile.save();
      
      return {
        vendorId,
        evaluatedAt: new Date(),
        policiesChecked: policies.length,
        passed: violations.length === 0,
        violations,
        results: evaluationResults
      };
    } catch (error) {
      console.error('Policy evaluation error:', error);
      throw error;
    }
  }

  /**
   * Get policies applicable to a vendor
   */
  async getApplicablePolicies(vendor) {
    const policies = await PolicyRule.find({
      isActive: true,
      approvalStatus: 'approved',
      $or: [
        { effectiveDate: { $lte: new Date() } },
        { effectiveDate: null }
      ]
    });
    
    return policies.filter(policy => {
      const scope = policy.scope;
      
      // Check country scope
      if (scope.countries?.length > 0 && 
          !scope.countries.includes(vendor.country)) {
        return false;
      }
      
      // Check category scope
      if (scope.categories?.length > 0 && 
          !scope.categories.includes(vendor.category)) {
        return false;
      }
      
      // Check vendor tier scope
      if (scope.vendorTiers?.length > 0 && 
          !scope.vendorTiers.includes(vendor.tier)) {
        return false;
      }
      
      // Check contract value
      if (scope.minContractValue && 
          (vendor.contractValue || 0) < scope.minContractValue) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Evaluate a single policy against vendor data
   */
  async evaluateSinglePolicy(policy, profile, vendor) {
    const findings = [];
    let allConditionsMet = true;
    
    for (const condition of policy.conditions) {
      const conditionResult = this.evaluateCondition(condition, profile, vendor);
      
      if (!conditionResult.met) {
        findings.push({
          condition: condition.field,
          operator: condition.operator,
          expected: condition.value,
          actual: conditionResult.actual,
          message: conditionResult.message
        });
        
        if (condition.logicalOperator !== 'OR') {
          allConditionsMet = false;
        }
      } else if (condition.logicalOperator === 'OR') {
        allConditionsMet = true; // At least one OR condition is met
      }
    }
    
    return {
      policyId: policy._id,
      policyName: policy.name,
      passed: allConditionsMet,
      findings,
      evaluatedAt: new Date()
    };
  }

  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition, profile, vendor) {
    const { field, operator, value } = condition;
    
    // Get actual value from profile or vendor
    const actual = this.getFieldValue(field, profile, vendor);
    
    let met = false;
    let message = '';
    
    switch (operator) {
      case 'equals':
        met = actual === value;
        message = `Expected ${field} to equal ${value}, got ${actual}`;
        break;
        
      case 'not_equals':
        met = actual !== value;
        message = `Expected ${field} to not equal ${value}`;
        break;
        
      case 'greater_than':
        met = actual > value;
        message = `Expected ${field} to be greater than ${value}, got ${actual}`;
        break;
        
      case 'less_than':
        met = actual < value;
        message = `Expected ${field} to be less than ${value}, got ${actual}`;
        break;
        
      case 'contains':
        met = Array.isArray(actual) ? actual.includes(value) : String(actual).includes(value);
        message = `Expected ${field} to contain ${value}`;
        break;
        
      case 'not_contains':
        met = Array.isArray(actual) ? !actual.includes(value) : !String(actual).includes(value);
        message = `Expected ${field} to not contain ${value}`;
        break;
        
      case 'in':
        met = Array.isArray(value) && value.includes(actual);
        message = `Expected ${field} to be in ${JSON.stringify(value)}`;
        break;
        
      case 'not_in':
        met = !Array.isArray(value) || !value.includes(actual);
        message = `Expected ${field} to not be in ${JSON.stringify(value)}`;
        break;
        
      case 'exists':
        met = actual !== null && actual !== undefined;
        message = `Expected ${field} to exist`;
        break;
        
      case 'not_exists':
        met = actual === null || actual === undefined;
        message = `Expected ${field} to not exist`;
        break;
        
      case 'expired':
        met = actual && new Date(actual) < new Date();
        message = `Expected ${field} to be expired`;
        break;
        
      case 'not_expired':
        met = !actual || new Date(actual) >= new Date();
        message = `Expected ${field} to not be expired`;
        break;
        
      case 'within_days':
        if (actual) {
          const daysUntil = Math.ceil((new Date(actual) - new Date()) / (1000 * 60 * 60 * 24));
          met = daysUntil <= value;
          message = `Expected ${field} to be within ${value} days`;
        }
        break;
        
      default:
        message = `Unknown operator: ${operator}`;
    }
    
    return { met, actual, message };
  }

  /**
   * Get field value from profile or vendor data
   */
  getFieldValue(field, profile, vendor) {
    // Check profile first
    const profileValue = this.getNestedValue(profile.toObject(), field);
    if (profileValue !== undefined) return profileValue;
    
    // Check vendor data
    return this.getNestedValue(vendor, field);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * Handle policy violation based on enforcement mode
   */
  async handlePolicyViolation(profile, violation) {
    const policy = await PolicyRule.findById(violation.policyId);
    
    switch (policy.enforcementMode) {
      case 'monitor':
        // Just log, no action
        await profile.addEvent({
          type: 'policy_violation_monitored',
          description: `Policy violation: ${violation.policyName}`,
          triggeredBy: 'policy_engine',
          severity: violation.severity,
          data: violation
        });
        break;
        
      case 'alert':
        // Create alert but don't block
        await this.createViolationAlert(profile, violation);
        break;
        
      case 'soft_enforce':
        // Create remediation case, flag for review
        await this.createRemediationCase(profile, violation);
        await this.flagForReview(profile, violation);
        break;
        
      case 'hard_enforce':
        // Block transactions, create urgent remediation
        await this.createRemediationCase(profile, violation, 'urgent');
        await this.applyRestrictions(profile, violation);
        break;
    }
  }

  async createViolationAlert(profile, violation) {
    await profile.addEvent({
      type: 'policy_violation_alert',
      description: `Alert: ${violation.policyName} - ${violation.findings.map(f => f.message).join('; ')}`,
      triggeredBy: 'policy_engine',
      severity: violation.severity,
      data: violation
    });
  }

  async createRemediationCase(profile, violation, priority = null) {
    const caseData = {
      vendorId: profile.vendorId,
      policyRuleId: violation.policyId,
      severity: violation.severity,
      priority: priority || (violation.severity === 'critical' ? 'urgent' : 'normal'),
      type: 'policy_violation',
      description: `Policy violation: ${violation.policyName}`,
      findings: violation.findings
    };
    
    const remediationCase = new RemediationCase(caseData);
    await remediationCase.save();
    
    return remediationCase;
  }

  async flagForReview(profile, violation) {
    profile.workflowStatus = {
      ...profile.workflowStatus,
      status: 'under_review',
      flaggedAt: new Date(),
      flagReason: `Policy violation: ${violation.policyName}`
    };
    await profile.save();
  }

  async applyRestrictions(profile, violation) {
    const restrictions = [];
    
    switch (violation.enforcementAction) {
      case 'block_new_orders':
        restrictions.push({ type: 'block_new_orders', appliedAt: new Date() });
        break;
      case 'hold_payments':
        restrictions.push({ type: 'hold_payments', appliedAt: new Date() });
        break;
      case 'suspend_vendor':
        restrictions.push({ type: 'suspend_vendor', appliedAt: new Date() });
        break;
    }
    
    profile.workflowStatus = {
      ...profile.workflowStatus,
      restrictions: [...(profile.workflowStatus?.restrictions || []), ...restrictions]
    };
    await profile.save();
    
    await profile.addEvent({
      type: 'restrictions_applied',
      description: `Restrictions applied: ${restrictions.map(r => r.type).join(', ')}`,
      triggeredBy: 'policy_engine',
      severity: 'high'
    });
  }

  // =====================================================
  // RISK SCORING
  // =====================================================

  /**
   * Calculate comprehensive risk score for vendor
   */
  async calculateRiskScore(vendorId) {
    try {
      const profile = await VendorComplianceProfile.findOne({ vendorId })
        .populate('vendorId');
      
      if (!profile) {
        throw new Error('Vendor compliance profile not found');
      }
      
      // Call ML service for risk calculation
      const response = await axios.post(
        `${this.ML_SERVICE_URL}/compliance/calculate-risk`,
        {
          vendorId: vendorId.toString(),
          complianceAttributes: profile.complianceAttributes,
          riskFactors: profile.riskFactors,
          sanctionsStatus: profile.sanctionsStatus,
          adverseMediaStatus: profile.adverseMediaStatus,
          signalHistory: profile.signalHistory.slice(-100),
          category: profile.vendorId?.category,
          country: profile.vendorId?.country,
          contractValue: profile.vendorId?.contractValue
        },
        { timeout: 30000 }
      );
      
      const riskResult = response.data;
      
      // Update profile with new risk score
      profile.compositeScore = {
        value: riskResult.compositeScore,
        trend: this.calculateTrend(profile.compositeScore?.value, riskResult.compositeScore),
        factors: riskResult.factors,
        lastCalculatedAt: new Date()
      };
      
      // Update tier based on score
      profile.tier = this.determineTier(riskResult.compositeScore);
      
      await profile.save();
      
      return riskResult;
    } catch (error) {
      console.error('Risk score calculation error:', error);
      throw error;
    }
  }

  calculateTrend(previousScore, currentScore) {
    if (!previousScore) return 'stable';
    const diff = currentScore - previousScore;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  determineTier(score) {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  /**
   * Get risk breakdown with SHAP explanations
   */
  async getRiskExplanation(vendorId) {
    try {
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      
      const response = await axios.post(
        `${this.ML_SERVICE_URL}/compliance/risk-explanation`,
        {
          vendorId: vendorId.toString(),
          compositeScore: profile.compositeScore,
          complianceAttributes: profile.complianceAttributes,
          riskFactors: profile.riskFactors
        },
        { timeout: 30000 }
      );
      
      return response.data;
    } catch (error) {
      console.error('Risk explanation error:', error);
      throw error;
    }
  }

  // =====================================================
  // ANOMALY DETECTION
  // =====================================================

  /**
   * Detect anomalies in compliance patterns
   */
  async detectAnomalies(vendorId) {
    try {
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      
      // Get historical data
      const events = await ComplianceEvent.find({ vendorId })
        .sort({ timestamp: -1 })
        .limit(500);
      
      const response = await axios.post(
        `${this.ML_SERVICE_URL}/compliance/detect-anomalies`,
        {
          vendorId: vendorId.toString(),
          events: events.map(e => ({
            type: e.eventType,
            timestamp: e.timestamp,
            source: e.source,
            severity: e.severity
          })),
          currentProfile: {
            tier: profile.tier,
            compositeScore: profile.compositeScore?.value,
            attributeStatuses: profile.complianceAttributes.map(a => ({
              name: a.name,
              status: a.status
            }))
          }
        },
        { timeout: 30000 }
      );
      
      const anomalies = response.data.anomalies || [];
      
      // Create events for significant anomalies
      for (const anomaly of anomalies.filter(a => a.score > 0.7)) {
        await profile.addEvent({
          type: 'anomaly_detected',
          description: anomaly.description,
          triggeredBy: 'anomaly_detection',
          severity: anomaly.score > 0.9 ? 'critical' : 'high',
          data: anomaly
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw error;
    }
  }

  // =====================================================
  // CONTRACT NLP ANALYSIS
  // =====================================================

  /**
   * Analyze contract for compliance clauses
   */
  async analyzeContract(contractText, vendorId = null) {
    try {
      const response = await axios.post(
        `${this.ML_SERVICE_URL}/compliance/analyze-contract`,
        {
          contractText,
          vendorId: vendorId?.toString()
        },
        { timeout: 60000 }
      );
      
      const analysis = response.data;
      
      if (vendorId) {
        const profile = await VendorComplianceProfile.findOne({ vendorId });
        if (profile) {
          profile.contractAnalysis = {
            analyzedAt: new Date(),
            complianceClausesFound: analysis.clauses?.length || 0,
            obligations: analysis.obligations || [],
            riskClauses: analysis.riskClauses || [],
            missingStandardClauses: analysis.missingClauses || []
          };
          await profile.save();
        }
      }
      
      return analysis;
    } catch (error) {
      console.error('Contract analysis error:', error);
      throw error;
    }
  }

  /**
   * Extract compliance obligations from contract
   */
  async extractObligations(contractText) {
    try {
      const response = await axios.post(
        `${this.ML_SERVICE_URL}/compliance/extract-obligations`,
        { contractText },
        { timeout: 60000 }
      );
      
      return response.data.obligations || [];
    } catch (error) {
      console.error('Obligation extraction error:', error);
      throw error;
    }
  }

  // =====================================================
  // PROFILE MANAGEMENT
  // =====================================================

  /**
   * Normalize and update compliance profile from signals
   */
  async updateProfileFromSignals(vendorId) {
    try {
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      if (!profile) {
        throw new Error('Vendor compliance profile not found');
      }
      
      // Get unprocessed events for this vendor
      const pendingEvents = await ComplianceEvent.find({
        vendorId,
        processingStatus: 'pending'
      }).sort({ timestamp: 1 });
      
      for (const event of pendingEvents) {
        await this.applyEventToProfile(profile, event);
        event.processingStatus = 'processed';
        await event.save();
      }
      
      // Recalculate risk score after updates
      await this.calculateRiskScore(vendorId);
      
      // Re-evaluate policies
      await this.evaluatePolicies(vendorId);
      
      return profile;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  /**
   * Apply a compliance event to vendor profile
   */
  async applyEventToProfile(profile, event) {
    switch (event.eventType) {
      case 'document_verified':
      case 'document_uploaded':
        await profile.updateAttribute(
          event.attributeAffected,
          {
            status: 'valid',
            verifiedAt: new Date(),
            confidence: event.confidence
          }
        );
        break;
        
      case 'document_expired':
      case 'document_rejected':
        await profile.updateAttribute(
          event.attributeAffected,
          { status: 'expired' }
        );
        break;
        
      case 'certificate_invalid':
        await profile.updateAttribute(
          event.attributeAffected,
          { status: 'invalid' }
        );
        break;
        
      case 'sanctions_hit':
        profile.sanctionsStatus = {
          status: 'flagged',
          lastCheckAt: new Date(),
          matches: event.newValue?.hits || []
        };
        break;
        
      case 'sanctions_clear':
        profile.sanctionsStatus = {
          status: 'clear',
          lastCheckAt: new Date(),
          matches: []
        };
        break;
        
      case 'adverse_media_alert':
        profile.adverseMediaStatus = {
          status: 'flagged',
          lastCheckAt: new Date(),
          alerts: event.newValue?.alerts || []
        };
        break;
        
      case 'credit_rating_change':
        await profile.addRiskFactor({
          factor: 'credit_rating',
          score: this.mapCreditRatingToScore(event.newValue),
          weight: 0.15,
          details: event.newValue
        });
        break;
        
      case 'insurance_lapsed':
        await profile.updateAttribute('insurance', { status: 'expired' });
        break;
        
      case 'insurance_renewed':
        await profile.updateAttribute('insurance', {
          status: 'valid',
          expiryDate: event.newValue?.expiryDate
        });
        break;
    }
    
    await profile.addEvent({
      type: event.eventType,
      description: `Signal processed: ${event.eventType}`,
      triggeredBy: event.source,
      data: event.newValue
    });
  }

  mapCreditRatingToScore(ratingData) {
    const ratingMap = {
      'AAA': 100, 'AA+': 95, 'AA': 90, 'AA-': 85,
      'A+': 80, 'A': 75, 'A-': 70,
      'BBB+': 65, 'BBB': 60, 'BBB-': 55,
      'BB+': 50, 'BB': 45, 'BB-': 40,
      'B+': 35, 'B': 30, 'B-': 25,
      'CCC': 15, 'CC': 10, 'C': 5, 'D': 0
    };
    return ratingMap[ratingData?.rating] || 50;
  }

  // =====================================================
  // BATCH INTELLIGENCE OPERATIONS
  // =====================================================

  /**
   * Run batch risk recalculation
   */
  async runBatchRiskCalculation() {
    const profiles = await VendorComplianceProfile.find({ isActive: true });
    const results = { processed: 0, errors: [] };
    
    for (const profile of profiles) {
      try {
        await this.calculateRiskScore(profile.vendorId);
        results.processed++;
      } catch (error) {
        results.errors.push({
          vendorId: profile.vendorId,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Run batch policy evaluation
   */
  async runBatchPolicyEvaluation() {
    const profiles = await VendorComplianceProfile.find({ isActive: true });
    const results = { 
      processed: 0, 
      violations: [],
      errors: [] 
    };
    
    for (const profile of profiles) {
      try {
        const evaluation = await this.evaluatePolicies(profile.vendorId);
        results.processed++;
        
        if (evaluation.violations.length > 0) {
          results.violations.push({
            vendorId: profile.vendorId,
            violations: evaluation.violations
          });
        }
      } catch (error) {
        results.errors.push({
          vendorId: profile.vendorId,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new ComplianceIntelligenceLayer();
