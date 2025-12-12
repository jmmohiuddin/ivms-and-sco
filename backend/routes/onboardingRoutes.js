const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { protect: auth, authorize } = require('../middleware/firebaseAuth');
const upload = require('../middleware/upload');

// ============================================
// INTAKE ROUTES - Smart Multi-channel Capture
// ============================================

/**
 * @route   POST /api/onboarding/vendor
 * @desc    Create vendor directly (test/admin endpoint)
 * @access  Public for testing, Private for production
 */
router.post('/vendor', onboardingController.createFromPortal);

/**
 * @route   POST /api/onboarding/portal
 * @desc    Create onboarding from self-service portal
 * @access  Public (vendor self-registration)
 */
router.post('/portal', onboardingController.createFromPortal);

/**
 * @route   POST /api/onboarding/invite
 * @desc    Create onboarding from invite link
 * @access  Private - requires valid invite token
 */
router.post('/invite', onboardingController.createFromInvite);

/**
 * @route   POST /api/onboarding/bulk
 * @desc    Bulk upload vendors via CSV
 * @access  Private - Admin/Procurement
 */
router.post('/bulk', auth, authorize('admin', 'procurement_manager'), upload.single('file'), onboardingController.createFromBulk);

/**
 * @route   POST /api/onboarding/email
 * @desc    Create onboarding from parsed email (webhook)
 * @access  Private - internal webhook
 */
router.post('/email', onboardingController.createFromEmail);

/**
 * @route   GET /api/onboarding/form-config
 * @desc    Get dynamic form configuration
 * @access  Public
 */
router.get('/form-config', onboardingController.getDynamicFormConfig);

/**
 * @route   POST /api/onboarding/invite/send
 * @desc    Send vendor invitation
 * @access  Private - Procurement
 */
router.post('/invite/send', auth, authorize('admin', 'procurement_manager'), onboardingController.sendVendorInvite);

// ============================================
// CASE MANAGEMENT ROUTES
// ============================================

/**
 * @route   GET /api/onboarding/cases
 * @desc    Get all onboarding cases (with filters)
 * @access  Private - Admin/Procurement/Compliance
 */
router.get('/cases', auth, onboardingController.getAllCases);

/**
 * @route   GET /api/onboarding/cases/:id
 * @desc    Get single onboarding case
 * @access  Private
 */
router.get('/cases/:id', auth, onboardingController.getCaseById);

/**
 * @route   PUT /api/onboarding/cases/:id
 * @desc    Update onboarding case
 * @access  Private
 */
router.put('/cases/:id', auth, onboardingController.updateCase);

/**
 * @route   POST /api/onboarding/cases/:id/submit
 * @desc    Submit case for review
 * @access  Private
 */
router.post('/cases/:id/submit', auth, onboardingController.submitCase);

/**
 * @route   POST /api/onboarding/cases/:id/assign
 * @desc    Assign case to reviewer
 * @access  Private - Admin/Manager
 */
router.post('/cases/:id/assign', auth, authorize('admin', 'procurement_manager'), onboardingController.assignCase);

/**
 * @route   GET /api/onboarding/cases/:id/timeline
 * @desc    Get case timeline/history
 * @access  Private
 */
router.get('/cases/:id/timeline', auth, onboardingController.getCaseTimeline);

/**
 * @route   POST /api/onboarding/cases/:id/message
 * @desc    Add message to case (vendor communication)
 * @access  Private
 */
router.post('/cases/:id/message', auth, onboardingController.addCaseMessage);

// ============================================
// DOCUMENT ROUTES
// ============================================

/**
 * @route   POST /api/onboarding/cases/:caseId/documents
 * @desc    Upload document to case
 * @access  Private
 */
router.post('/cases/:caseId/documents', auth, upload.single('document'), onboardingController.uploadDocument);

/**
 * @route   GET /api/onboarding/cases/:caseId/documents
 * @desc    Get all documents for case
 * @access  Private
 */
router.get('/cases/:caseId/documents', auth, onboardingController.getCaseDocuments);

/**
 * @route   GET /api/onboarding/documents/:id
 * @desc    Get single document
 * @access  Private
 */
router.get('/documents/:id', auth, onboardingController.getDocumentById);

/**
 * @route   POST /api/onboarding/documents/:id/process
 * @desc    Process document (OCR + extraction)
 * @access  Private
 */
router.post('/documents/:id/process', auth, onboardingController.processDocument);

/**
 * @route   POST /api/onboarding/documents/:id/verify
 * @desc    Manually verify document
 * @access  Private - Admin/Compliance
 */
router.post('/documents/:id/verify', auth, authorize('admin', 'compliance_officer'), onboardingController.verifyDocument);

/**
 * @route   PUT /api/onboarding/documents/:id/extracted-data
 * @desc    Update extracted data (manual correction)
 * @access  Private
 */
router.put('/documents/:id/extracted-data', auth, onboardingController.updateExtractedData);

// ============================================
// AI/ML PROCESSING ROUTES
// ============================================

/**
 * @route   POST /api/onboarding/cases/:id/process
 * @desc    Run full AI processing on case
 * @access  Private
 */
router.post('/cases/:id/process', auth, onboardingController.processCase);

/**
 * @route   POST /api/onboarding/cases/:id/analyze-contract
 * @desc    Run NLP contract analysis
 * @access  Private
 */
router.post('/cases/:id/analyze-contract', auth, onboardingController.analyzeContract);

/**
 * @route   POST /api/onboarding/cases/:id/sanctions-check
 * @desc    Run sanctions screening
 * @access  Private
 */
router.post('/cases/:id/sanctions-check', auth, onboardingController.runSanctionsCheck);

/**
 * @route   GET /api/onboarding/cases/:id/risk
 * @desc    Get risk score for case
 * @access  Private
 */
router.get('/cases/:id/risk', auth, onboardingController.getCaseRiskScore);

/**
 * @route   POST /api/onboarding/cases/:id/risk/calculate
 * @desc    Calculate/recalculate risk score
 * @access  Private
 */
router.post('/cases/:id/risk/calculate', auth, onboardingController.calculateRiskScore);

/**
 * @route   POST /api/onboarding/cases/:id/fraud-check
 * @desc    Run fraud detection
 * @access  Private
 */
router.post('/cases/:id/fraud-check', auth, onboardingController.runFraudCheck);

// ============================================
// APPROVAL WORKFLOW ROUTES
// ============================================

/**
 * @route   POST /api/onboarding/cases/:id/approve
 * @desc    Approve onboarding case
 * @access  Private - Based on approval matrix
 */
router.post('/cases/:id/approve', auth, onboardingController.approveCase);

/**
 * @route   POST /api/onboarding/cases/:id/reject
 * @desc    Reject onboarding case
 * @access  Private - Based on approval matrix
 */
router.post('/cases/:id/reject', auth, onboardingController.rejectCase);

/**
 * @route   POST /api/onboarding/cases/:id/request-info
 * @desc    Request additional information
 * @access  Private
 */
router.post('/cases/:id/request-info', auth, onboardingController.requestInfo);

/**
 * @route   POST /api/onboarding/cases/:id/escalate
 * @desc    Escalate case
 * @access  Private
 */
router.post('/cases/:id/escalate', auth, onboardingController.escalateCase);

/**
 * @route   GET /api/onboarding/cases/:id/approvals
 * @desc    Get approval history for case
 * @access  Private
 */
router.get('/cases/:id/approvals', auth, onboardingController.getCaseApprovals);

// ============================================
// EVIDENCE & AUDIT ROUTES
// ============================================

/**
 * @route   POST /api/onboarding/cases/:id/evidence-bundle
 * @desc    Generate evidence bundle for case
 * @access  Private - Admin/Compliance
 */
router.post('/cases/:id/evidence-bundle', auth, authorize('admin', 'compliance_officer'), onboardingController.generateEvidenceBundle);

/**
 * @route   GET /api/onboarding/evidence/:bundleId
 * @desc    Get evidence bundle
 * @access  Private
 */
router.get('/evidence/:bundleId', auth, onboardingController.getEvidenceBundle);

/**
 * @route   GET /api/onboarding/evidence/:bundleId/export
 * @desc    Export evidence bundle as PDF
 * @access  Private
 */
router.get('/evidence/:bundleId/export', auth, onboardingController.exportEvidenceBundle);

/**
 * @route   GET /api/onboarding/cases/:id/audit-trail
 * @desc    Get complete audit trail
 * @access  Private - Admin/Compliance
 */
router.get('/cases/:id/audit-trail', auth, authorize('admin', 'compliance_officer'), onboardingController.getAuditTrail);

// ============================================
// REVIEW QUEUE ROUTES
// ============================================

/**
 * @route   GET /api/onboarding/queue
 * @desc    Get review queue
 * @access  Private
 */
router.get('/queue', auth, onboardingController.getReviewQueue);

/**
 * @route   GET /api/onboarding/my-queue
 * @desc    Get cases assigned to current user
 * @access  Private
 */
router.get('/my-queue', auth, onboardingController.getMyQueue);

/**
 * @route   POST /api/onboarding/queue/claim/:id
 * @desc    Claim case from queue
 * @access  Private
 */
router.post('/queue/claim/:id', auth, onboardingController.claimCase);

// ============================================
// ANALYTICS & REPORTING ROUTES
// ============================================

/**
 * @route   GET /api/onboarding/analytics
 * @desc    Get onboarding analytics
 * @access  Private - Admin/Manager
 */
router.get('/analytics', auth, authorize('admin', 'procurement_manager'), onboardingController.getAnalytics);

/**
 * @route   GET /api/onboarding/sla-report
 * @desc    Get SLA compliance report
 * @access  Private - Admin/Manager
 */
router.get('/sla-report', auth, authorize('admin', 'procurement_manager'), onboardingController.getSLAReport);

/**
 * @route   GET /api/onboarding/vendor-status/:vendorId
 * @desc    Get vendor's onboarding status (vendor-facing)
 * @access  Private - with vendor token
 */
router.get('/vendor-status/:vendorId', onboardingController.getVendorStatus);

// ============================================
// WEBHOOK ROUTES
// ============================================

/**
 * @route   POST /api/onboarding/webhooks/document-verified
 * @desc    Webhook for external document verification
 * @access  Private - webhook signature validation
 */
router.post('/webhooks/document-verified', onboardingController.webhookDocumentVerified);

/**
 * @route   POST /api/onboarding/webhooks/sanctions-result
 * @desc    Webhook for sanctions check result
 * @access  Private - webhook signature validation
 */
router.post('/webhooks/sanctions-result', onboardingController.webhookSanctionsResult);

module.exports = router;
