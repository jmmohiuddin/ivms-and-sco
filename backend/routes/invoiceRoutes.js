const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/firebaseAuth');
const upload = require('../middleware/upload');

// ===== Invoice Submission & Management =====

// Submit new invoice (with file upload)
router.post(
  '/submit',
  protect,
  upload.documents,
  invoiceController.submitInvoice
);

// Submit invoice via API (structured data)
router.post(
  '/api-submit',
  protect,
  invoiceController.apiSubmitInvoice
);

// Bulk upload invoices
router.post(
  '/bulk-upload',
  protect,
  upload.bulkUpload,
  invoiceController.bulkUpload
);

// Get all invoices with filters
router.get(
  '/',
  protect,
  invoiceController.getInvoices
);

// Simple invoice creation (test endpoint)
router.post(
  '/',
  protect,
  invoiceController.createInvoice
);

// Get invoice by ID
router.get(
  '/:id',
  protect,
  invoiceController.getInvoiceById
);

// Update invoice
router.put(
  '/:id',
  protect,
  invoiceController.updateInvoice
);

// Delete invoice (soft delete)
router.delete(
  '/:id',
  protect,
  authorize('admin', 'finance_manager'),
  invoiceController.deleteInvoice
);

// ===== Processing =====

// Process invoice (OCR, matching, validation)
router.post(
  '/:id/process',
  protect,
  invoiceController.processInvoice
);

// Reprocess invoice
router.post(
  '/:id/reprocess',
  protect,
  invoiceController.reprocessInvoice
);

// ===== Matching =====

// Get match record for invoice
router.get(
  '/:id/match',
  protect,
  invoiceController.getMatchRecord
);

// Force match to PO
router.post(
  '/:id/match',
  protect,
  invoiceController.forceMatch
);

// Update match record
router.put(
  '/:id/match',
  protect,
  invoiceController.updateMatch
);

// ===== Approval Workflow =====

// Create approval workflow
router.post(
  '/:id/approval/create',
  protect,
  invoiceController.createApprovalWorkflow
);

// Get approval status
router.get(
  '/:id/approval',
  protect,
  invoiceController.getApprovalStatus
);

// Approve invoice
router.post(
  '/:id/approve',
  protect,
  invoiceController.approveInvoice
);

// Reject invoice
router.post(
  '/:id/reject',
  protect,
  invoiceController.rejectInvoice
);

// Delegate approval
router.post(
  '/:id/delegate',
  protect,
  invoiceController.delegateApproval
);

// Escalate approval
router.post(
  '/:id/escalate',
  protect,
  invoiceController.escalateApproval
);

// Request more information
router.post(
  '/:id/request-info',
  protect,
  invoiceController.requestInfo
);

// ===== Hold & Release =====

// Put invoice on hold
router.post(
  '/:id/hold',
  protect,
  invoiceController.putOnHold
);

// Release from hold
router.post(
  '/:id/release',
  protect,
  invoiceController.releaseFromHold
);

// ===== GL Coding =====

// Update GL coding
router.put(
  '/:id/coding',
  protect,
  invoiceController.updateCoding
);

// Get coding suggestions
router.get(
  '/:id/coding/suggestions',
  protect,
  invoiceController.getCodingSuggestions
);

// ===== Payment =====

// Create payment instruction
router.post(
  '/:id/payment',
  protect,
  invoiceController.createPaymentInstruction
);

// Get payment status
router.get(
  '/:id/payment',
  protect,
  invoiceController.getPaymentStatus
);

// Schedule payment
router.post(
  '/:id/payment/schedule',
  protect,
  invoiceController.schedulePayment
);

// ===== Evidence & Audit =====

// Generate evidence bundle
router.post(
  '/:id/evidence-bundle',
  protect,
  invoiceController.generateEvidenceBundle
);

// Get audit trail
router.get(
  '/:id/audit-trail',
  protect,
  invoiceController.getAuditTrail
);

// Add note to invoice
router.post(
  '/:id/notes',
  protect,
  invoiceController.addNote
);

// ===== Exceptions =====

// Get exception queue
router.get(
  '/exceptions/queue',
  protect,
  invoiceController.getExceptionQueue
);

// Get exception by ID
router.get(
  '/exceptions/:exceptionId',
  protect,
  invoiceController.getException
);

// Resolve exception
router.post(
  '/exceptions/:exceptionId/resolve',
  protect,
  invoiceController.resolveException
);

// Assign exception
router.post(
  '/exceptions/:exceptionId/assign',
  protect,
  invoiceController.assignException
);

// ===== Analytics & Reporting =====

// Get dashboard analytics
router.get(
  '/analytics/dashboard',
  protect,
  invoiceController.getAnalytics
);

// Get aging report
router.get(
  '/analytics/aging',
  protect,
  invoiceController.getAgingReport
);

// Get processing metrics
router.get(
  '/analytics/processing',
  protect,
  invoiceController.getProcessingMetrics
);

// Export invoices to CSV
router.get(
  '/export/csv',
  protect,
  invoiceController.exportToCSV
);

// ===== Vendor Portal =====

// Vendor: Submit invoice
router.post(
  '/vendor/submit',
  protect,
  upload.documents,
  invoiceController.vendorSubmitInvoice
);

// Vendor: Get invoice status
router.get(
  '/vendor/invoices',
  protect,
  invoiceController.getVendorInvoices
);

// Vendor: Get invoice details
router.get(
  '/vendor/invoices/:id',
  protect,
  invoiceController.getVendorInvoiceDetails
);

// Vendor: Initiate dispute
router.post(
  '/vendor/invoices/:id/dispute',
  protect,
  invoiceController.initiateDispute
);

// ===== Webhooks =====

// Invoice processed webhook
router.post(
  '/webhooks/processed',
  invoiceController.webhookProcessed
);

// Invoice approved webhook
router.post(
  '/webhooks/approved',
  invoiceController.webhookApproved
);

// Invoice paid webhook
router.post(
  '/webhooks/paid',
  invoiceController.webhookPaid
);

// ===== Mobile Approval =====

// Get pending approvals for mobile
router.get(
  '/mobile/pending',
  protect,
  invoiceController.getMobilePendingApprovals
);

// Mobile quick approve
router.post(
  '/mobile/:id/approve',
  protect,
  invoiceController.mobileApprove
);

// Mobile quick reject
router.post(
  '/mobile/:id/reject',
  protect,
  invoiceController.mobileReject
);

module.exports = router;
