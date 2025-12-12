/**
 * Compliance Controller
 * HTTP request handlers for compliance management API
 */

const ComplianceSignalLayer = require('../layers/input/ComplianceSignal');
const ComplianceIntelligenceLayer = require('../layers/intelligent/ComplianceIntelligent');
const ComplianceOutputLayer = require('../layers/output/ComplianceOutput');
const ComplianceWorkflowEngine = require('../layers/workflow/ComplianceWorkflow');
const VendorComplianceProfile = require('../models/VendorComplianceProfile');
const PolicyRule = require('../models/PolicyRule');
const ComplianceEvent = require('../models/ComplianceEvent');
const RemediationCase = require('../models/RemediationCase');
const AuditBundle = require('../models/AuditBundle');
const IntegrationConnector = require('../models/IntegrationConnector');

// =====================================================
// COMPLIANCE PROFILE HANDLERS
// =====================================================

exports.getProfiles = async (req, res) => {
  try {
    const { tier, status, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (tier) query.tier = tier;
    if (status) query['workflowStatus.status'] = status;
    
    const profiles = await VendorComplianceProfile.find(query)
      .populate('vendorId', 'name companyName category country')
      .sort({ 'compositeScore.value': 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await VendorComplianceProfile.countDocuments(query);
    
    res.json({
      success: true,
      data: profiles,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getViolations = async (req, res) => {
  try {
    const { vendorId, severity, status, page = 1, limit = 20 } = req.query;
    const query = { eventType: 'violation' };
    
    if (vendorId) query.vendorId = vendorId;
    if (severity) query.severity = severity;
    if (status) query.resolution = status;
    
    const violations = await ComplianceEvent.find(query)
      .populate('vendorId', 'name companyName')
      .populate('policyId', 'name code')
      .sort({ detectedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await ComplianceEvent.countDocuments(query);
    
    res.json({
      success: true,
      data: violations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProfileByVendor = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId })
      .populate('vendorId');
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createProfile = async (req, res) => {
  try {
    const profile = new VendorComplianceProfile({
      vendorId: req.body.vendorId,
      tier: req.body.tier || 'medium',
      complianceAttributes: req.body.attributes || [],
      monitoringConfig: req.body.monitoringConfig || {}
    });
    
    await profile.save();
    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOneAndUpdate(
      { vendorId: req.params.vendorId },
      req.body,
      { new: true }
    );
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProfileSummary = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    const summary = {
      vendorId: profile.vendorId,
      tier: profile.tier,
      compositeScore: profile.compositeScore?.value,
      scoreTrend: profile.compositeScore?.trend,
      attributeCount: profile.complianceAttributes?.length || 0,
      validAttributes: profile.complianceAttributes?.filter(a => a.status === 'valid').length || 0,
      expiredAttributes: profile.complianceAttributes?.filter(a => a.status === 'expired').length || 0,
      sanctionsStatus: profile.sanctionsStatus?.status,
      adverseMediaStatus: profile.adverseMediaStatus?.status,
      activeRestrictions: profile.workflowStatus?.restrictions?.filter(r => !r.liftedAt).length || 0,
      lastUpdated: profile.updatedAt
    };
    
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRiskScore = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    res.json({
      success: true,
      data: {
        compositeScore: profile.compositeScore?.value,
        trend: profile.compositeScore?.trend,
        factors: profile.compositeScore?.factors,
        tier: profile.tier,
        lastCalculatedAt: profile.compositeScore?.lastCalculatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.recalculateRisk = async (req, res) => {
  try {
    const result = await ComplianceIntelligenceLayer.calculateRiskScore(req.params.vendorId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRiskExplanation = async (req, res) => {
  try {
    const explanation = await ComplianceIntelligenceLayer.getRiskExplanation(req.params.vendorId);
    res.json({ success: true, data: explanation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAttributes = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    res.json({ success: true, data: profile.complianceAttributes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateAttribute = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    await profile.updateAttribute(req.params.attributeName, req.body);
    res.json({ success: true, data: profile.complianceAttributes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSignalHistory = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    res.json({ success: true, data: profile.signalHistory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getEnforcementHistory = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    res.json({ success: true, data: profile.enforcementHistory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createSnapshot = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    const snapshot = await profile.createAuditSnapshot(req.body.reason);
    res.json({ success: true, data: snapshot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// POLICY HANDLERS
// =====================================================

exports.getPolicies = async (req, res) => {
  try {
    const { isActive, severity, scope } = req.query;
    const query = {};
    
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (severity) query.severity = severity;
    
    const policies = await PolicyRule.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPolicyById = async (req, res) => {
  try {
    const policy = await PolicyRule.findById(req.params.policyId);
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const policy = new PolicyRule({
      ...req.body,
      createdBy: req.user?._id
    });
    
    await policy.save();
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const policy = await PolicyRule.findByIdAndUpdate(
      req.params.policyId,
      { ...req.body, version: { $inc: 1 } },
      { new: true }
    );
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const policy = await PolicyRule.findByIdAndUpdate(
      req.params.policyId,
      { isActive: false },
      { new: true }
    );
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    res.json({ success: true, message: 'Policy deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.testPolicy = async (req, res) => {
  try {
    const policy = await PolicyRule.findById(req.params.policyId);
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    const result = await policy.testAgainstVendor(req.body.vendorId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.evaluatePolicies = async (req, res) => {
  try {
    const result = await ComplianceIntelligenceLayer.evaluatePolicies(req.params.vendorId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.requestPolicyApproval = async (req, res) => {
  try {
    const policy = await PolicyRule.findById(req.params.policyId);
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    await policy.requestApproval(req.body.approvers);
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.decidePolicyApproval = async (req, res) => {
  try {
    const policy = await PolicyRule.findById(req.params.policyId);
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    policy.approvalHistory.push({
      approver: req.user?._id,
      decision: req.body.decision,
      comments: req.body.comments,
      decidedAt: new Date()
    });
    
    if (req.body.decision === 'approved') {
      policy.approvalStatus = 'approved';
    } else {
      policy.approvalStatus = 'rejected';
    }
    
    await policy.save();
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPolicyVersions = async (req, res) => {
  try {
    const policy = await PolicyRule.findById(req.params.policyId);
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    res.json({ 
      success: true, 
      data: { 
        currentVersion: policy.version,
        history: policy.approvalHistory 
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.clonePolicy = async (req, res) => {
  try {
    const originalPolicy = await PolicyRule.findById(req.params.policyId);
    
    if (!originalPolicy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    const clonedPolicy = new PolicyRule({
      ...originalPolicy.toObject(),
      _id: undefined,
      name: `${originalPolicy.name} (Copy)`,
      version: 1,
      approvalStatus: 'draft',
      approvalHistory: [],
      createdBy: req.user?._id
    });
    
    await clonedPolicy.save();
    res.status(201).json({ success: true, data: clonedPolicy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// EVENT HANDLERS
// =====================================================

exports.getEvents = async (req, res) => {
  try {
    const { vendorId, eventType, source, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (vendorId) query.vendorId = vendorId;
    if (eventType) query.eventType = eventType;
    if (source) query.source = source;
    
    const events = await ComplianceEvent.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('vendorId', 'name companyName');
    
    const total = await ComplianceEvent.countDocuments(query);
    
    res.json({
      success: true,
      data: events,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await ComplianceEvent.findById(req.params.eventId)
      .populate('vendorId');
    
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const event = await ComplianceSignalLayer.processSignal(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.processEvents = async (req, res) => {
  try {
    const unprocessed = await ComplianceSignalLayer.getUnprocessedEvents();
    const results = [];
    
    for (const event of unprocessed) {
      try {
        await event.process();
        results.push({ eventId: event._id, success: true });
      } catch (error) {
        results.push({ eventId: event._id, success: false, error: error.message });
      }
    }
    
    res.json({ success: true, data: { processed: results.length, results } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getEventStats = async (req, res) => {
  try {
    const stats = await ComplianceEvent.aggregate([
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          lastOccurred: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// SIGNAL INGESTION HANDLERS
// =====================================================

exports.ingestSignal = async (req, res) => {
  try {
    const event = await ComplianceSignalLayer.processSignal(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.receiveWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-signature'] || req.headers['x-hub-signature-256'];
    const event = await ComplianceSignalLayer.processWebhook(
      req.params.connectorId,
      req.body,
      signature
    );
    
    res.json({ success: true, data: { eventId: event._id } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.screenSanctions = async (req, res) => {
  try {
    const result = await ComplianceSignalLayer.screenSanctions(
      req.params.vendorId,
      req.body
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.checkAdverseMedia = async (req, res) => {
  try {
    const result = await ComplianceSignalLayer.checkAdverseMedia(
      req.params.vendorId,
      req.body
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.verifyDocument = async (req, res) => {
  try {
    const documentData = {
      ...req.body,
      fileBuffer: req.file?.buffer,
      fileName: req.file?.originalname,
      fileType: req.file?.mimetype
    };
    
    const result = await ComplianceSignalLayer.verifyDocument(
      req.params.vendorId,
      documentData
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.checkExpiration = async (req, res) => {
  try {
    const result = await ComplianceSignalLayer.checkCertificateExpiration(
      req.params.vendorId
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.runBatchChecks = async (req, res) => {
  try {
    const result = await ComplianceSignalLayer.runBatchChecks(req.body.checkTypes);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// REMEDIATION CASE HANDLERS
// =====================================================

exports.getCases = async (req, res) => {
  try {
    const { status, severity, priority, vendorId, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (priority) query.priority = priority;
    if (vendorId) query.vendorId = vendorId;
    
    const cases = await RemediationCase.find(query)
      .sort({ slaDeadline: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('vendorId', 'name companyName');
    
    const total = await RemediationCase.countDocuments(query);
    
    res.json({
      success: true,
      data: cases,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCaseByNumber = async (req, res) => {
  try {
    const remediationCase = await RemediationCase.findOne({ caseNumber: req.params.caseNumber })
      .populate('vendorId')
      .populate('policyRuleId');
    
    if (!remediationCase) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }
    
    res.json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createCase = async (req, res) => {
  try {
    const remediationCase = await ComplianceWorkflowEngine.createCase({
      ...req.body,
      triggeredBy: req.user?._id || 'manual'
    });
    
    res.status(201).json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCaseStatus = async (req, res) => {
  try {
    const remediationCase = await ComplianceWorkflowEngine.updateCaseStatus(
      req.params.caseNumber,
      req.body.status,
      { updatedBy: req.user?._id, reason: req.body.reason }
    );
    
    res.json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addCaseAction = async (req, res) => {
  try {
    const remediationCase = await ComplianceWorkflowEngine.addCaseAction(
      req.params.caseNumber,
      { ...req.body, performedBy: req.user?._id }
    );
    
    res.json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.completeAction = async (req, res) => {
  try {
    const remediationCase = await ComplianceWorkflowEngine.completeAction(
      req.params.caseNumber,
      req.params.actionId,
      { ...req.body, completedBy: req.user?._id }
    );
    
    res.json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.escalateCase = async (req, res) => {
  try {
    const remediationCase = await ComplianceWorkflowEngine.escalateCase(
      req.params.caseNumber,
      { ...req.body, escalatedBy: req.user?._id }
    );
    
    res.json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.resolveCase = async (req, res) => {
  try {
    const remediationCase = await ComplianceWorkflowEngine.resolveCase(
      req.params.caseNumber,
      { ...req.body, resolvedBy: req.user?._id }
    );
    
    res.json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCaseSLA = async (req, res) => {
  try {
    const slaStatus = await ComplianceWorkflowEngine.getSLAStatus(req.params.caseNumber);
    res.json({ success: true, data: slaStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.notifyVendor = async (req, res) => {
  try {
    const remediationCase = await ComplianceWorkflowEngine.sendVendorRemediationRequest(
      req.params.caseNumber,
      req.body
    );
    
    res.json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.recordVendorResponse = async (req, res) => {
  try {
    const remediationCase = await ComplianceWorkflowEngine.recordVendorResponse(
      req.params.caseNumber,
      req.body
    );
    
    res.json({ success: true, data: remediationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCasesAtRisk = async (req, res) => {
  try {
    const cases = await ComplianceWorkflowEngine.getCasesAtRisk();
    res.json({ success: true, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getOverdueCases = async (req, res) => {
  try {
    const cases = await RemediationCase.find({
      status: { $nin: ['resolved', 'closed', 'cancelled'] },
      slaDeadline: { $lt: new Date() }
    }).populate('vendorId', 'name companyName');
    
    res.json({ success: true, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.autoEscalate = async (req, res) => {
  try {
    const results = await ComplianceWorkflowEngine.autoEscalateOverdueCases();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// HUMAN VALIDATION HANDLERS
// =====================================================

exports.requestValidation = async (req, res) => {
  try {
    const validationCase = await ComplianceWorkflowEngine.requestValidation(req.body);
    res.status(201).json({ success: true, data: validationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.submitValidation = async (req, res) => {
  try {
    const validationCase = await ComplianceWorkflowEngine.submitValidation(
      req.params.caseNumber,
      { ...req.body, validatedBy: req.user?._id }
    );
    
    res.json({ success: true, data: validationCase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPendingValidations = async (req, res) => {
  try {
    const cases = await RemediationCase.find({
      type: 'human_validation',
      status: 'pending_review'
    }).populate('vendorId', 'name companyName');
    
    res.json({ success: true, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// CONTRACT ENFORCEMENT HANDLERS
// =====================================================

exports.applyEnforcement = async (req, res) => {
  try {
    const enforcement = await ComplianceOutputLayer.enforceContract(
      req.params.vendorId,
      req.body
    );
    
    res.json({ success: true, data: enforcement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.liftRestrictions = async (req, res) => {
  try {
    const result = await ComplianceOutputLayer.liftRestrictions(
      req.params.vendorId,
      req.body.restrictionTypes,
      { liftedBy: req.user?._id, reason: req.body.reason }
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRestrictions = async (req, res) => {
  try {
    const profile = await VendorComplianceProfile.findOne({ vendorId: req.params.vendorId });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    
    const activeRestrictions = profile.workflowStatus?.restrictions?.filter(r => !r.liftedAt) || [];
    res.json({ success: true, data: activeRestrictions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// CONTRACT ANALYSIS HANDLERS
// =====================================================

exports.analyzeContract = async (req, res) => {
  try {
    const contractText = req.body.contractText || req.file?.buffer?.toString();
    const result = await ComplianceIntelligenceLayer.analyzeContract(
      contractText,
      req.body.vendorId
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.extractObligations = async (req, res) => {
  try {
    const contractText = req.body.contractText || req.file?.buffer?.toString();
    const obligations = await ComplianceIntelligenceLayer.extractObligations(contractText);
    res.json({ success: true, data: obligations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// AUDIT BUNDLE HANDLERS
// =====================================================

exports.getAuditBundles = async (req, res) => {
  try {
    const { vendorId, bundleType, status, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (vendorId) query['subject.vendorId'] = vendorId;
    if (bundleType) query.bundleType = bundleType;
    if (status) query.status = status;
    
    const bundles = await AuditBundle.find(query)
      .sort({ 'generation.generatedAt': -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await AuditBundle.countDocuments(query);
    
    res.json({
      success: true,
      data: bundles,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAuditBundleById = async (req, res) => {
  try {
    const bundle = await AuditBundle.findOne({ bundleId: req.params.bundleId });
    
    if (!bundle) {
      return res.status(404).json({ success: false, error: 'Bundle not found' });
    }
    
    // Log access
    await bundle.logAccess(req.user?._id, 'view', req.ip);
    
    res.json({ success: true, data: bundle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.generateAuditBundle = async (req, res) => {
  try {
    const bundle = await ComplianceOutputLayer.generateAuditBundle(
      req.params.vendorId,
      { ...req.body, generatedBy: req.user?._id }
    );
    
    res.status(201).json({ success: true, data: bundle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.exportAuditBundle = async (req, res) => {
  try {
    const format = req.query.format || 'pdf';
    const result = await ComplianceOutputLayer.exportAuditBundle(
      req.params.bundleId,
      format
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.sealAuditBundle = async (req, res) => {
  try {
    const bundle = await AuditBundle.findOne({ bundleId: req.params.bundleId });
    
    if (!bundle) {
      return res.status(404).json({ success: false, error: 'Bundle not found' });
    }
    
    await bundle.seal(req.user?._id);
    res.json({ success: true, data: bundle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.verifyBundleIntegrity = async (req, res) => {
  try {
    const bundle = await AuditBundle.findOne({ bundleId: req.params.bundleId });
    
    if (!bundle) {
      return res.status(404).json({ success: false, error: 'Bundle not found' });
    }
    
    const verification = bundle.verifyIntegrity();
    res.json({ success: true, data: verification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// CONNECTOR HANDLERS
// =====================================================

exports.getConnectors = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const query = {};
    
    if (type) query.integrationType = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const connectors = await IntegrationConnector.find(query)
      .select('-authentication.credentials');
    
    res.json({ success: true, data: connectors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getConnectorById = async (req, res) => {
  try {
    const connector = await IntegrationConnector.findOne({ connectorId: req.params.connectorId })
      .select('-authentication.credentials');
    
    if (!connector) {
      return res.status(404).json({ success: false, error: 'Connector not found' });
    }
    
    res.json({ success: true, data: connector });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createConnector = async (req, res) => {
  try {
    const connector = new IntegrationConnector({
      ...req.body,
      createdBy: req.user?._id
    });
    
    await connector.save();
    res.status(201).json({ success: true, data: connector });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateConnector = async (req, res) => {
  try {
    const connector = await IntegrationConnector.findOneAndUpdate(
      { connectorId: req.params.connectorId },
      { ...req.body, updatedBy: req.user?._id },
      { new: true }
    ).select('-authentication.credentials');
    
    if (!connector) {
      return res.status(404).json({ success: false, error: 'Connector not found' });
    }
    
    res.json({ success: true, data: connector });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteConnector = async (req, res) => {
  try {
    const connector = await IntegrationConnector.findOneAndUpdate(
      { connectorId: req.params.connectorId },
      { 
        isActive: false, 
        deactivatedAt: new Date(), 
        deactivatedBy: req.user?._id 
      },
      { new: true }
    );
    
    if (!connector) {
      return res.status(404).json({ success: false, error: 'Connector not found' });
    }
    
    res.json({ success: true, message: 'Connector deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.testConnector = async (req, res) => {
  try {
    const connector = await IntegrationConnector.findOne({ connectorId: req.params.connectorId });
    
    if (!connector) {
      return res.status(404).json({ success: false, error: 'Connector not found' });
    }
    
    await connector.checkHealth();
    res.json({ success: true, data: { health: connector.health } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getConnectorHealth = async (req, res) => {
  try {
    const connector = await IntegrationConnector.findOne({ connectorId: req.params.connectorId });
    
    if (!connector) {
      return res.status(404).json({ success: false, error: 'Connector not found' });
    }
    
    res.json({ success: true, data: connector.health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getConnectorsHealthSummary = async (req, res) => {
  try {
    const summary = await IntegrationConnector.getHealthSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// DASHBOARD & REPORTING HANDLERS
// =====================================================

exports.getDashboard = async (req, res) => {
  try {
    const [
      profileStats,
      workflowMetrics,
      recentEvents,
      topRisks
    ] = await Promise.all([
      VendorComplianceProfile.aggregate([
        { $group: { _id: '$tier', count: { $sum: 1 } } }
      ]),
      ComplianceWorkflowEngine.getDashboardMetrics(),
      ComplianceSignalLayer.getRecentEvents(null, 10),
      ComplianceOutputLayer.generateComplianceReport({ startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
    ]);
    
    res.json({
      success: true,
      data: {
        vendorsByTier: profileStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        workflows: workflowMetrics,
        recentEvents,
        topRisks: topRisks.topRisks
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getWorkflowMetrics = async (req, res) => {
  try {
    const metrics = await ComplianceWorkflowEngine.getDashboardMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSLAMetrics = async (req, res) => {
  try {
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    const metrics = await ComplianceWorkflowEngine.getSLAMetrics(startDate, endDate);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getComplianceTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const events = await ComplianceEvent.find({ timestamp: { $gte: startDate } });
    const eventsByDay = {};
    
    events.forEach(e => {
      const day = e.timestamp.toISOString().split('T')[0];
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: Object.entries(eventsByDay).map(([date, count]) => ({ date, count }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRiskDistribution = async (req, res) => {
  try {
    const distribution = await VendorComplianceProfile.aggregate([
      {
        $bucket: {
          groupBy: '$compositeScore.value',
          boundaries: [0, 40, 60, 80, 100],
          default: 'unknown',
          output: { count: { $sum: 1 } }
        }
      }
    ]);
    
    res.json({ success: true, data: distribution });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const report = await ComplianceOutputLayer.generateComplianceReport(req.body);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getReport = async (req, res) => {
  try {
    // Reports would be stored/cached
    res.json({ success: true, data: { message: 'Report retrieval not implemented' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// ANOMALY DETECTION HANDLERS
// =====================================================

exports.detectAnomalies = async (req, res) => {
  try {
    const anomalies = await ComplianceIntelligenceLayer.detectAnomalies(req.params.vendorId);
    res.json({ success: true, data: anomalies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSystemAnomalies = async (req, res) => {
  try {
    const profiles = await VendorComplianceProfile.find({ isActive: true });
    const allAnomalies = [];
    
    for (const profile of profiles.slice(0, 20)) { // Limit for performance
      try {
        const result = await ComplianceIntelligenceLayer.detectAnomalies(profile.vendorId);
        if (result.anomalies?.length > 0) {
          allAnomalies.push({
            vendorId: profile.vendorId,
            anomalies: result.anomalies
          });
        }
      } catch (error) {
        // Continue with other vendors
      }
    }
    
    res.json({ success: true, data: allAnomalies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// =====================================================
// BATCH OPERATION HANDLERS
// =====================================================

exports.batchRiskCalculation = async (req, res) => {
  try {
    const results = await ComplianceIntelligenceLayer.runBatchRiskCalculation();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.batchPolicyEvaluation = async (req, res) => {
  try {
    const results = await ComplianceIntelligenceLayer.runBatchPolicyEvaluation();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.processWorkflows = async (req, res) => {
  try {
    const results = await ComplianceWorkflowEngine.processPendingWorkflows();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
