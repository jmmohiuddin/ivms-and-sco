/**
 * Invoice Controller
 * Handles all invoice-related HTTP requests
 */

const InvoiceIntake = require('../layers/input/InvoiceIntake');
const InvoiceIntelligent = require('../layers/intelligent/InvoiceIntelligent');
const InvoiceOutput = require('../layers/output/InvoiceOutput');
const InvoiceWorkflow = require('../layers/workflow/InvoiceWorkflow');
const Invoice = require('../models/Invoice');
const MatchRecord = require('../models/MatchRecord');
const InvoiceException = require('../models/InvoiceException');
const InvoiceApproval = require('../models/InvoiceApproval');
const PaymentInstruction = require('../models/PaymentInstruction');

// ===== Invoice Submission & Management =====

/**
 * Submit new invoice with file upload
 */
exports.submitInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    const files = req.files || [];
    const source = req.body.source || 'portal';

    const result = await InvoiceIntake.submitInvoice(invoiceData, files, source);

    // Auto-process if configured
    if (req.body.autoProcess !== false) {
      try {
        await InvoiceIntelligent.processInvoice(result.invoiceId);
      } catch (processError) {
        console.error('Auto-process error:', processError);
        // Don't fail the submission, just log
      }
    }

    res.status(201).json({
      success: true,
      message: 'Invoice submitted successfully',
      data: result
    });
  } catch (error) {
    console.error('Submit invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Submit invoice via API (structured data)
 */
exports.apiSubmitInvoice = async (req, res) => {
  try {
    const result = await InvoiceIntake.submitInvoice(req.body, [], 'api');

    res.status(201).json({
      success: true,
      message: 'Invoice submitted via API',
      data: result
    });
  } catch (error) {
    console.error('API submit error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Bulk upload invoices
 */
exports.bulkUpload = async (req, res) => {
  try {
    const invoices = JSON.parse(req.body.invoices || '[]');
    const files = req.files || [];

    const result = await InvoiceIntake.bulkUpload(invoices, files, 'bulk');

    res.status(201).json({
      success: true,
      message: `Bulk upload complete: ${result.successful}/${result.total} successful`,
      data: result
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all invoices with filters
 */
exports.getInvoices = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      vendorId: req.query.vendorId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      amountMin: req.query.amountMin ? parseFloat(req.query.amountMin) : undefined,
      amountMax: req.query.amountMax ? parseFloat(req.query.amountMax) : undefined,
      assignedTo: req.query.assignedTo,
      hasException: req.query.hasException === 'true',
      search: req.query.search
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sort: req.query.sort ? JSON.parse(req.query.sort) : { receivedDate: -1 }
    };

    const result = await InvoiceOutput.getInvoices(filters, pagination);

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create simple invoice (test endpoint)
 */
exports.createInvoice = async (req, res) => {
  try {
    const { vendorId, invoiceNumber, amount, dueDate, status, description } = req.body;

    if (!invoiceNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number and amount are required'
      });
    }

    const invoice = await Invoice.create({
      vendorId,
      invoiceNumber,
      invoiceAmount: amount,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: status || 'pending',
      description,
      receivedDate: new Date(),
      source: 'manual'
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get invoice by ID
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const result = await InvoiceOutput.getInvoiceDetails(req.params.id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update invoice
 */
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Only allow updates on certain statuses
    const editableStatuses = ['draft', 'submitted', 'pending_review', 'exception'];
    if (!editableStatuses.includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update invoice in ${invoice.status} status`
      });
    }

    // Update allowed fields
    const allowedFields = ['items', 'glAccount', 'costCenter', 'department', 'projectCode', 'notes'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        invoice[field] = req.body[field];
      }
    });

    invoice.auditTrail.push({
      action: 'invoice_updated',
      performedBy: req.user?._id,
      performedAt: new Date(),
      details: { updatedFields: Object.keys(req.body) }
    });

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete invoice (soft delete)
 */
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Only allow deletion of draft/submitted invoices
    if (!['draft', 'submitted', 'rejected'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete invoice in ${invoice.status} status`
      });
    }

    invoice.status = 'cancelled';
    invoice.auditTrail.push({
      action: 'invoice_deleted',
      performedBy: req.user?._id,
      performedAt: new Date()
    });

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Processing =====

/**
 * Process invoice (OCR, matching, validation)
 */
exports.processInvoice = async (req, res) => {
  try {
    const result = await InvoiceIntelligent.processInvoice(req.params.id);

    res.json({
      success: true,
      message: 'Invoice processed successfully',
      data: result
    });
  } catch (error) {
    console.error('Process invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Reprocess invoice
 */
exports.reprocessInvoice = async (req, res) => {
  try {
    // Reset processing state
    await Invoice.findByIdAndUpdate(req.params.id, {
      ocrProcessed: false,
      matchStatus: 'unmatched',
      status: 'submitted'
    });

    const result = await InvoiceIntelligent.processInvoice(req.params.id);

    res.json({
      success: true,
      message: 'Invoice reprocessed successfully',
      data: result
    });
  } catch (error) {
    console.error('Reprocess invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Matching =====

/**
 * Get match record for invoice
 */
exports.getMatchRecord = async (req, res) => {
  try {
    const matchRecord = await MatchRecord.findOne({ invoiceId: req.params.id });

    if (!matchRecord) {
      return res.status(404).json({
        success: false,
        message: 'Match record not found'
      });
    }

    res.json({
      success: true,
      data: matchRecord
    });
  } catch (error) {
    console.error('Get match record error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Force match to PO
 */
exports.forceMatch = async (req, res) => {
  try {
    const { poIds, grnIds } = req.body;
    const result = await InvoiceIntelligent.forceMatch(
      req.params.id,
      poIds,
      grnIds,
      req.user?._id
    );

    res.json({
      success: true,
      message: 'Invoice matched successfully',
      data: result
    });
  } catch (error) {
    console.error('Force match error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update match record
 */
exports.updateMatch = async (req, res) => {
  try {
    const matchRecord = await MatchRecord.findOne({ invoiceId: req.params.id });

    if (!matchRecord) {
      return res.status(404).json({
        success: false,
        message: 'Match record not found'
      });
    }

    // Update match record with overrides
    if (req.body.override) {
      await matchRecord.addManualOverride(
        req.body.override.field,
        req.body.override.originalValue,
        req.body.override.newValue,
        req.body.override.reason,
        req.user?._id
      );
    }

    res.json({
      success: true,
      message: 'Match record updated',
      data: matchRecord
    });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Approval Workflow =====

/**
 * Create approval workflow
 */
exports.createApprovalWorkflow = async (req, res) => {
  try {
    const options = {
      forceSteps: req.body.steps,
      approvalType: req.body.type
    };

    const result = await InvoiceWorkflow.createApprovalWorkflow(req.params.id, options);

    res.json({
      success: true,
      message: 'Approval workflow created',
      data: result
    });
  } catch (error) {
    console.error('Create approval workflow error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get approval status
 */
exports.getApprovalStatus = async (req, res) => {
  try {
    const approval = await InvoiceWorkflow.getApprovalHistory(req.params.id);

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'No approval workflow found for this invoice'
      });
    }

    res.json({
      success: true,
      data: approval
    });
  } catch (error) {
    console.error('Get approval status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Approve invoice
 */
exports.approveInvoice = async (req, res) => {
  try {
    const { comments, glOverrides } = req.body;
    const result = await InvoiceWorkflow.processApproval(
      req.params.id,
      req.user?._id,
      'approve',
      comments,
      glOverrides
    );

    res.json({
      success: true,
      message: 'Invoice approved',
      data: result
    });
  } catch (error) {
    console.error('Approve invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Reject invoice
 */
exports.rejectInvoice = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await InvoiceWorkflow.processApproval(
      req.params.id,
      req.user?._id,
      'reject',
      reason
    );

    res.json({
      success: true,
      message: 'Invoice rejected',
      data: result
    });
  } catch (error) {
    console.error('Reject invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delegate approval
 */
exports.delegateApproval = async (req, res) => {
  try {
    const { delegateTo } = req.body;
    const result = await InvoiceWorkflow.delegateApproval(
      req.params.id,
      req.user?._id,
      delegateTo
    );

    res.json({
      success: true,
      message: 'Approval delegated',
      data: result
    });
  } catch (error) {
    console.error('Delegate approval error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Escalate approval
 */
exports.escalateApproval = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await InvoiceWorkflow.escalateApproval(
      req.params.id,
      reason,
      req.user?._id
    );

    res.json({
      success: true,
      message: 'Approval escalated',
      data: result
    });
  } catch (error) {
    console.error('Escalate approval error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Request more information
 */
exports.requestInfo = async (req, res) => {
  try {
    const requestDetails = {
      question: req.body.question,
      recipientEmail: req.body.recipientEmail
    };

    const result = await InvoiceWorkflow.requestInfo(
      req.params.id,
      requestDetails,
      req.user?._id
    );

    res.json({
      success: true,
      message: 'Information requested',
      data: result
    });
  } catch (error) {
    console.error('Request info error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Hold & Release =====

/**
 * Put invoice on hold
 */
exports.putOnHold = async (req, res) => {
  try {
    const { reason, releaseDate } = req.body;
    const result = await InvoiceWorkflow.putOnHold(
      req.params.id,
      reason,
      req.user?._id,
      releaseDate
    );

    res.json({
      success: true,
      message: 'Invoice put on hold',
      data: result
    });
  } catch (error) {
    console.error('Put on hold error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Release from hold
 */
exports.releaseFromHold = async (req, res) => {
  try {
    const result = await InvoiceWorkflow.releaseFromHold(
      req.params.id,
      req.user?._id
    );

    res.json({
      success: true,
      message: 'Invoice released from hold',
      data: result
    });
  } catch (error) {
    console.error('Release from hold error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== GL Coding =====

/**
 * Update GL coding
 */
exports.updateCoding = async (req, res) => {
  try {
    const result = await InvoiceIntelligent.updateCoding(
      req.params.id,
      req.body,
      req.user?._id
    );

    res.json({
      success: true,
      message: 'GL coding updated',
      data: result
    });
  } catch (error) {
    console.error('Update coding error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get coding suggestions
 */
exports.getCodingSuggestions = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: {
        currentCoding: {
          glAccount: invoice.glAccount,
          costCenter: invoice.costCenter,
          department: invoice.department,
          projectCode: invoice.projectCode
        },
        suggestions: invoice.codingSuggestions || []
      }
    });
  } catch (error) {
    console.error('Get coding suggestions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Payment =====

/**
 * Create payment instruction
 */
exports.createPaymentInstruction = async (req, res) => {
  try {
    const result = await InvoiceOutput.createPaymentInstruction(
      req.params.id,
      req.body,
      req.user?._id
    );

    res.json({
      success: true,
      message: 'Payment instruction created',
      data: result
    });
  } catch (error) {
    console.error('Create payment instruction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get payment status
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const instruction = await PaymentInstruction.findOne({ invoiceId: req.params.id });

    if (!instruction) {
      return res.status(404).json({
        success: false,
        message: 'No payment instruction found'
      });
    }

    res.json({
      success: true,
      data: instruction
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Schedule payment
 */
exports.schedulePayment = async (req, res) => {
  try {
    const instruction = await PaymentInstruction.findOne({ invoiceId: req.params.id });

    if (!instruction) {
      return res.status(404).json({
        success: false,
        message: 'No payment instruction found'
      });
    }

    instruction.scheduledDate = req.body.scheduledDate;
    instruction.status = 'scheduled';
    await instruction.save();

    res.json({
      success: true,
      message: 'Payment scheduled',
      data: {
        scheduledDate: instruction.scheduledDate
      }
    });
  } catch (error) {
    console.error('Schedule payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Evidence & Audit =====

/**
 * Generate evidence bundle
 */
exports.generateEvidenceBundle = async (req, res) => {
  try {
    const result = await InvoiceOutput.generateEvidenceBundle(
      req.params.id,
      req.user?._id
    );

    res.json({
      success: true,
      message: 'Evidence bundle generated',
      data: result
    });
  } catch (error) {
    console.error('Generate evidence bundle error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get audit trail
 */
exports.getAuditTrail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('auditTrail.performedBy', 'name email');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice.auditTrail
    });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Add note to invoice
 */
exports.addNote = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.comments = invoice.comments || [];
    invoice.comments.push({
      comment: req.body.note,
      createdBy: req.user?._id,
      createdAt: new Date(),
      isInternal: req.body.isInternal !== false
    });

    await invoice.save();

    res.json({
      success: true,
      message: 'Note added'
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Exceptions =====

/**
 * Get exception queue
 */
exports.getExceptionQueue = async (req, res) => {
  try {
    const filters = {
      exceptionType: req.query.type,
      severity: req.query.severity,
      assignedTo: req.query.assignedTo
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await InvoiceOutput.getExceptionQueue(filters, pagination);

    res.json({
      success: true,
      data: result.exceptions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get exception queue error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get exception by ID
 */
exports.getException = async (req, res) => {
  try {
    const exception = await InvoiceException.findById(req.params.exceptionId)
      .populate('invoiceId')
      .populate('assignedTo', 'name email');

    if (!exception) {
      return res.status(404).json({
        success: false,
        message: 'Exception not found'
      });
    }

    res.json({
      success: true,
      data: exception
    });
  } catch (error) {
    console.error('Get exception error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Resolve exception
 */
exports.resolveException = async (req, res) => {
  try {
    const resolution = {
      action: req.body.action,
      description: req.body.description,
      adjustments: req.body.adjustments
    };

    const result = await InvoiceWorkflow.resolveException(
      req.params.exceptionId,
      resolution,
      req.user?._id
    );

    res.json({
      success: true,
      message: 'Exception resolved',
      data: result
    });
  } catch (error) {
    console.error('Resolve exception error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Assign exception
 */
exports.assignException = async (req, res) => {
  try {
    const exception = await InvoiceException.findById(req.params.exceptionId);

    if (!exception) {
      return res.status(404).json({
        success: false,
        message: 'Exception not found'
      });
    }

    await exception.assign(req.body.assignTo, req.user?._id);

    res.json({
      success: true,
      message: 'Exception assigned'
    });
  } catch (error) {
    console.error('Assign exception error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Analytics & Reporting =====

/**
 * Get dashboard analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const dateRange = {
      start: req.query.startDate,
      end: req.query.endDate
    };

    const result = await InvoiceOutput.getAnalytics(dateRange);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get aging report
 */
exports.getAgingReport = async (req, res) => {
  try {
    const report = await Invoice.getAgingReport(req.query.vendorId);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get aging report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get processing metrics
 */
exports.getProcessingMetrics = async (req, res) => {
  try {
    const metrics = await Invoice.aggregate([
      {
        $match: {
          processedDate: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingMetrics.totalProcessingTime' },
          avgAutomationScore: { $avg: '$processingMetrics.automationScore' },
          avgHumanTouches: { $avg: '$processingMetrics.humanTouchCount' },
          totalProcessed: { $sum: 1 },
          autoApproved: { $sum: { $cond: ['$autoApproved', 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: metrics[0] || {}
    });
  } catch (error) {
    console.error('Get processing metrics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Export invoices to CSV
 */
exports.exportToCSV = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      vendorId: req.query.vendorId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    const csv = await InvoiceOutput.exportToCSV(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export to CSV error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Vendor Portal =====

/**
 * Vendor: Submit invoice
 */
exports.vendorSubmitInvoice = async (req, res) => {
  try {
    // Verify vendor is submitting their own invoice
    const invoiceData = {
      ...req.body,
      vendorId: req.user?.vendorId,
      source: 'portal'
    };

    const files = req.files || [];
    const result = await InvoiceIntake.submitInvoice(invoiceData, files, 'portal');

    res.status(201).json({
      success: true,
      message: 'Invoice submitted successfully',
      data: {
        invoiceId: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        status: result.status
      }
    });
  } catch (error) {
    console.error('Vendor submit invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Vendor: Get invoice status
 */
exports.getVendorInvoices = async (req, res) => {
  try {
    const vendorId = req.user?.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor access required'
      });
    }

    const filters = {
      vendorId,
      status: req.query.status
    };

    const result = await InvoiceOutput.getInvoices(filters, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    });

    res.json({
      success: true,
      data: result.invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        totalAmount: inv.totalAmount,
        status: inv.status,
        paymentStatus: inv.paymentStatus
      })),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get vendor invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Vendor: Get invoice details
 */
exports.getVendorInvoiceDetails = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Verify vendor owns this invoice
    const vendorId = req.user?.vendorId;
    if (invoice.vendorId?.toString() !== vendorId?.toString() && 
        invoice.vendor?.toString() !== vendorId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Return limited vendor-facing details
    res.json({
      success: true,
      data: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        lineItems: invoice.items?.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        }))
      }
    });
  } catch (error) {
    console.error('Get vendor invoice details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Vendor: Initiate dispute
 */
exports.initiateDispute = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.dispute = {
      isDisputed: true,
      disputeReason: req.body.reason,
      disputedAt: new Date(),
      disputedBy: req.user?._id
    };
    invoice.status = 'disputed';

    invoice.auditTrail.push({
      action: 'dispute_initiated',
      performedBy: req.user?._id,
      performedAt: new Date(),
      details: { reason: req.body.reason }
    });

    await invoice.save();

    res.json({
      success: true,
      message: 'Dispute initiated'
    });
  } catch (error) {
    console.error('Initiate dispute error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ===== Webhooks =====

exports.webhookProcessed = async (req, res) => {
  // Placeholder for webhook
  res.json({ success: true, message: 'Webhook received' });
};

exports.webhookApproved = async (req, res) => {
  // Placeholder for webhook
  res.json({ success: true, message: 'Webhook received' });
};

exports.webhookPaid = async (req, res) => {
  // Placeholder for webhook
  res.json({ success: true, message: 'Webhook received' });
};

// ===== Mobile Approval =====

/**
 * Get pending approvals for mobile
 */
exports.getMobilePendingApprovals = async (req, res) => {
  try {
    const approvals = await InvoiceWorkflow.getPendingApprovalsForUser(req.user?._id);

    const mobileData = approvals.map(a => ({
      id: a.invoiceId?._id,
      invoiceNumber: a.invoiceId?.invoiceNumber,
      vendorName: a.invoiceSummary?.vendorName,
      amount: a.invoiceSummary?.totalAmount,
      currency: a.invoiceSummary?.currency,
      deadline: a.deadline,
      priority: a.priority
    }));

    res.json({
      success: true,
      data: mobileData
    });
  } catch (error) {
    console.error('Get mobile pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mobile quick approve
 */
exports.mobileApprove = async (req, res) => {
  try {
    const result = await InvoiceWorkflow.processApproval(
      req.params.id,
      req.user?._id,
      'approve',
      req.body.comments || 'Approved via mobile'
    );

    res.json({
      success: true,
      message: 'Invoice approved',
      data: result
    });
  } catch (error) {
    console.error('Mobile approve error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mobile quick reject
 */
exports.mobileReject = async (req, res) => {
  try {
    const result = await InvoiceWorkflow.processApproval(
      req.params.id,
      req.user?._id,
      'reject',
      req.body.reason || 'Rejected via mobile'
    );

    res.json({
      success: true,
      message: 'Invoice rejected',
      data: result
    });
  } catch (error) {
    console.error('Mobile reject error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
