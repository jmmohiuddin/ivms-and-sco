/**
 * Compliance Routes
 * RESTful API endpoints for continuous compliance management
 */

const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const { protect } = require('../middleware/firebaseAuth');
const multer = require('multer');

// Configure file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// =====================================================
// COMPLIANCE PROFILE ROUTES
// =====================================================

// Get all compliance profiles
router.get('/profiles', protect, complianceController.getProfiles);

// Get all compliance violations
router.get('/violations', protect, complianceController.getViolations);

// Get compliance profile by vendor ID
router.get('/profiles/:vendorId', protect, complianceController.getProfileByVendor);

// Create or initialize compliance profile for vendor
router.post('/profiles', protect, complianceController.createProfile);

// Update compliance profile
router.put('/profiles/:vendorId', protect, complianceController.updateProfile);

// Get compliance profile summary
router.get('/profiles/:vendorId/summary', protect, complianceController.getProfileSummary);

// Get risk score with explanation
router.get('/profiles/:vendorId/risk', protect, complianceController.getRiskScore);

// Recalculate risk score
router.post('/profiles/:vendorId/risk/recalculate', protect, complianceController.recalculateRisk);

// Get risk explanation (SHAP)
router.get('/profiles/:vendorId/risk/explanation', protect, complianceController.getRiskExplanation);

// Get compliance attributes
router.get('/profiles/:vendorId/attributes', protect, complianceController.getAttributes);

// Add or update compliance attribute
router.put('/profiles/:vendorId/attributes/:attributeName', protect, complianceController.updateAttribute);

// Get signal history
router.get('/profiles/:vendorId/signals', protect, complianceController.getSignalHistory);

// Get enforcement history
router.get('/profiles/:vendorId/enforcements', protect, complianceController.getEnforcementHistory);

// Create audit snapshot
router.post('/profiles/:vendorId/snapshot', protect, complianceController.createSnapshot);

// =====================================================
// POLICY RULE ROUTES
// =====================================================

// Get all policy rules
router.get('/policies', protect, complianceController.getPolicies);

// Get policy by ID
router.get('/policies/:policyId', protect, complianceController.getPolicyById);

// Create new policy rule
router.post('/policies', protect, complianceController.createPolicy);

// Update policy rule
router.put('/policies/:policyId', protect, complianceController.updatePolicy);

// Delete/deactivate policy
router.delete('/policies/:policyId', protect, complianceController.deletePolicy);

// Test policy against vendor
router.post('/policies/:policyId/test', protect, complianceController.testPolicy);

// Evaluate all policies for vendor
router.post('/policies/evaluate/:vendorId', protect, complianceController.evaluatePolicies);

// Request policy approval
router.post('/policies/:policyId/approval/request', protect, complianceController.requestPolicyApproval);

// Approve/reject policy
router.post('/policies/:policyId/approval/decision', protect, complianceController.decidePolicyApproval);

// Get policy versions
router.get('/policies/:policyId/versions', protect, complianceController.getPolicyVersions);

// Clone policy
router.post('/policies/:policyId/clone', protect, complianceController.clonePolicy);

// =====================================================
// COMPLIANCE EVENT ROUTES
// =====================================================

// Get compliance events
router.get('/events', protect, complianceController.getEvents);

// Get event by ID
router.get('/events/:eventId', protect, complianceController.getEventById);

// Create manual event
router.post('/events', protect, complianceController.createEvent);

// Process pending events
router.post('/events/process', protect, complianceController.processEvents);

// Get event statistics
router.get('/events/stats', protect, complianceController.getEventStats);

// =====================================================
// SIGNAL INGESTION ROUTES
// =====================================================

// Full compliance scan (test endpoint)
router.post('/scan', protect, complianceController.runBatchChecks);

// Screen vendor for sanctions (test endpoint alias)
router.post('/screen', protect, complianceController.screenSanctions);

// Add certificate (test endpoint)
router.post('/certificates', protect, complianceController.checkExpiration);

// Ingest compliance signal
router.post('/signals', protect, complianceController.ingestSignal);

// Webhook receiver for external systems
router.post('/signals/webhook/:connectorId', complianceController.receiveWebhook);

// Screen vendor for sanctions
router.post('/signals/:vendorId/sanctions', protect, complianceController.screenSanctions);

// Check adverse media
router.post('/signals/:vendorId/adverse-media', protect, complianceController.checkAdverseMedia);

// Verify document
router.post('/signals/:vendorId/verify-document', protect, upload.single('document'), complianceController.verifyDocument);

// Check certificate expiration
router.post('/signals/:vendorId/check-expiration', protect, complianceController.checkExpiration);

// Run batch compliance checks
router.post('/signals/batch-check', protect, complianceController.runBatchChecks);

// =====================================================
// REMEDIATION CASE ROUTES
// =====================================================

// Get all remediation cases
router.get('/cases', protect, complianceController.getCases);

// Get case by case number
router.get('/cases/:caseNumber', protect, complianceController.getCaseByNumber);

// Create remediation case
router.post('/cases', protect, complianceController.createCase);

// Update case status
router.put('/cases/:caseNumber/status', protect, complianceController.updateCaseStatus);

// Add action to case
router.post('/cases/:caseNumber/actions', protect, complianceController.addCaseAction);

// Complete action
router.put('/cases/:caseNumber/actions/:actionId/complete', protect, complianceController.completeAction);

// Escalate case
router.post('/cases/:caseNumber/escalate', protect, complianceController.escalateCase);

// Resolve case
router.post('/cases/:caseNumber/resolve', protect, complianceController.resolveCase);

// Get SLA status
router.get('/cases/:caseNumber/sla', protect, complianceController.getCaseSLA);

// Send vendor notification
router.post('/cases/:caseNumber/notify-vendor', protect, complianceController.notifyVendor);

// Record vendor response
router.post('/cases/:caseNumber/vendor-response', protect, complianceController.recordVendorResponse);

// Get cases at risk
router.get('/cases/status/at-risk', protect, complianceController.getCasesAtRisk);

// Get overdue cases
router.get('/cases/status/overdue', protect, complianceController.getOverdueCases);

// Auto-escalate overdue
router.post('/cases/auto-escalate', protect, complianceController.autoEscalate);

// =====================================================
// HUMAN VALIDATION ROUTES
// =====================================================

// Request human validation
router.post('/validation/request', protect, complianceController.requestValidation);

// Submit validation decision
router.post('/validation/:caseNumber/submit', protect, complianceController.submitValidation);

// Get pending validations
router.get('/validation/pending', protect, complianceController.getPendingValidations);

// =====================================================
// CONTRACT ENFORCEMENT ROUTES
// =====================================================

// Apply enforcement action
router.post('/enforcement/:vendorId', protect, complianceController.applyEnforcement);

// Lift restrictions
router.post('/enforcement/:vendorId/lift', protect, complianceController.liftRestrictions);

// Get active restrictions
router.get('/enforcement/:vendorId/restrictions', protect, complianceController.getRestrictions);

// =====================================================
// CONTRACT ANALYSIS ROUTES
// =====================================================

// Analyze contract for compliance
router.post('/contracts/analyze', protect, upload.single('contract'), complianceController.analyzeContract);

// Extract obligations from contract
router.post('/contracts/extract-obligations', protect, upload.single('contract'), complianceController.extractObligations);

// =====================================================
// AUDIT BUNDLE ROUTES
// =====================================================

// Get audit bundles
router.get('/audits', protect, complianceController.getAuditBundles);

// Get audit bundle by ID
router.get('/audits/:bundleId', protect, complianceController.getAuditBundleById);

// Generate audit bundle
router.post('/audits/generate/:vendorId', protect, complianceController.generateAuditBundle);

// Export audit bundle
router.get('/audits/:bundleId/export', protect, complianceController.exportAuditBundle);

// Seal audit bundle
router.post('/audits/:bundleId/seal', protect, complianceController.sealAuditBundle);

// Verify bundle integrity
router.get('/audits/:bundleId/verify', protect, complianceController.verifyBundleIntegrity);

// =====================================================
// INTEGRATION CONNECTOR ROUTES
// =====================================================

// Get all connectors
router.get('/connectors', protect, complianceController.getConnectors);

// Get connector by ID
router.get('/connectors/:connectorId', protect, complianceController.getConnectorById);

// Create connector
router.post('/connectors', protect, complianceController.createConnector);

// Update connector
router.put('/connectors/:connectorId', protect, complianceController.updateConnector);

// Delete connector
router.delete('/connectors/:connectorId', protect, complianceController.deleteConnector);

// Test connector
router.post('/connectors/:connectorId/test', protect, complianceController.testConnector);

// Get connector health
router.get('/connectors/:connectorId/health', protect, complianceController.getConnectorHealth);

// Get all connectors health summary
router.get('/connectors/health/summary', protect, complianceController.getConnectorsHealthSummary);

// =====================================================
// DASHBOARD & REPORTING ROUTES
// =====================================================

// Get compliance dashboard
router.get('/dashboard', protect, complianceController.getDashboard);

// Get workflow metrics
router.get('/dashboard/workflows', protect, complianceController.getWorkflowMetrics);

// Get SLA metrics
router.get('/dashboard/sla', protect, complianceController.getSLAMetrics);

// Get compliance trends
router.get('/dashboard/trends', protect, complianceController.getComplianceTrends);

// Get risk distribution
router.get('/dashboard/risk-distribution', protect, complianceController.getRiskDistribution);

// Generate compliance report
router.post('/reports/generate', protect, complianceController.generateReport);

// Get report by ID
router.get('/reports/:reportId', protect, complianceController.getReport);

// =====================================================
// ANOMALY DETECTION ROUTES
// =====================================================

// Detect anomalies for vendor
router.get('/anomalies/:vendorId', protect, complianceController.detectAnomalies);

// Get system-wide anomalies
router.get('/anomalies', protect, complianceController.getSystemAnomalies);

// =====================================================
// BATCH OPERATIONS
// =====================================================

// Run batch risk recalculation
router.post('/batch/risk-calculation', protect, complianceController.batchRiskCalculation);

// Run batch policy evaluation
router.post('/batch/policy-evaluation', protect, complianceController.batchPolicyEvaluation);

// Process all pending workflows
router.post('/batch/process-workflows', protect, complianceController.processWorkflows);

module.exports = router;
