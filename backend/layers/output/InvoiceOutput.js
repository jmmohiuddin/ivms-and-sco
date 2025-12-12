/**
 * InvoiceOutput.js - Output Layer for Automated Invoicing
 * 
 * Handles all output operations:
 * - Invoice status updates & notifications
 * - ERP integration & posting
 * - Payment instruction generation
 * - Remittance advice
 * - Audit trail & evidence bundles
 * - Analytics & reporting
 */

const Invoice = require('../../models/Invoice');
const MatchRecord = require('../../models/MatchRecord');
const InvoiceException = require('../../models/InvoiceException');
const InvoiceApproval = require('../../models/InvoiceApproval');
const PaymentInstruction = require('../../models/PaymentInstruction');
const EvidenceBundle = require('../../models/EvidenceBundle');

class InvoiceOutput {
  constructor() {
    this.erpConnector = null; // Placeholder for ERP integration
    this.paymentRail = null; // Placeholder for payment rail integration
  }

  /**
   * Generate comprehensive invoice response
   */
  async getInvoiceDetails(invoiceId) {
    const invoice = await Invoice.findById(invoiceId)
      .populate('vendor', 'name email')
      .populate('vendorId', 'legalName businessName')
      .populate('assignedTo', 'name email')
      .populate('approvedBy', 'name email');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get match record if exists
    let matchRecord = null;
    if (invoice.matchRecordId) {
      matchRecord = await MatchRecord.findById(invoice.matchRecordId);
    }

    // Get exceptions
    const exceptions = await InvoiceException.find({ invoiceId: invoice._id })
      .sort({ createdAt: -1 });

    // Get approval record if exists
    const approval = await InvoiceApproval.findOne({ invoiceId: invoice._id })
      .populate('steps.approvers.userId', 'name email');

    // Get payment instruction if exists
    const paymentInstruction = await PaymentInstruction.findOne({ invoiceId: invoice._id });

    return {
      invoice: this.formatInvoice(invoice),
      matching: matchRecord ? this.formatMatchRecord(matchRecord) : null,
      exceptions: exceptions.map(e => this.formatException(e)),
      approval: approval ? this.formatApproval(approval) : null,
      payment: paymentInstruction ? this.formatPaymentInstruction(paymentInstruction) : null,
      timeline: this.generateTimeline(invoice, exceptions, approval),
      actions: this.getAvailableActions(invoice)
    };
  }

  /**
   * Format invoice for API response
   */
  formatInvoice(invoice) {
    return {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      vendor: {
        id: invoice.vendorId?._id || invoice.vendor?._id,
        name: invoice.vendorName || invoice.vendorId?.legalName || invoice.vendor?.name
      },
      dates: {
        invoiceDate: invoice.invoiceDate,
        receivedDate: invoice.receivedDate,
        dueDate: invoice.dueDate,
        processedDate: invoice.processedDate,
        approvedDate: invoice.approvedDate,
        paidDate: invoice.paidAt
      },
      amounts: {
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        shippingAmount: invoice.shippingAmount,
        discountAmount: invoice.discountAmount,
        totalAmount: invoice.totalAmount,
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
        currency: invoice.currency
      },
      lineItems: invoice.items?.map(item => ({
        lineNumber: item.lineNumber,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        matchStatus: item.matchStatus
      })),
      status: {
        current: invoice.status,
        subStatus: invoice.subStatus,
        paymentStatus: invoice.paymentStatus,
        matchStatus: invoice.matchStatus
      },
      flags: invoice.flags,
      confidence: invoice.overallExtractionConfidence,
      automationScore: invoice.processingMetrics?.automationScore,
      source: invoice.source,
      documents: invoice.rawFiles?.map(f => ({
        fileName: f.fileName,
        fileType: f.fileType,
        uploadedAt: f.uploadedAt
      })),
      coding: {
        glAccount: invoice.glAccount,
        costCenter: invoice.costCenter,
        department: invoice.department,
        projectCode: invoice.projectCode,
        method: invoice.codingMethod,
        suggestions: invoice.codingSuggestions
      },
      purchaseOrders: invoice.purchaseOrderNumbers,
      agingBucket: invoice.agingBucket,
      daysUntilDue: invoice.daysUntilDue
    };
  }

  /**
   * Format match record for API response
   */
  formatMatchRecord(matchRecord) {
    return {
      id: matchRecord._id,
      matchType: matchRecord.matchType,
      status: matchRecord.overallMatchStatus,
      score: matchRecord.overallMatchScore,
      purchaseOrders: matchRecord.matchedPurchaseOrders,
      grns: matchRecord.matchedGRNs,
      summary: matchRecord.matchSummary,
      mismatches: matchRecord.mismatchReasons,
      suggestedActions: matchRecord.suggestedActions,
      autoMatchEligible: matchRecord.autoMatchEligible
    };
  }

  /**
   * Format exception for API response
   */
  formatException(exception) {
    return {
      id: exception._id,
      code: exception.exceptionCode,
      type: exception.exceptionType,
      severity: exception.severity,
      priority: exception.priority,
      status: exception.status,
      title: exception.title,
      description: exception.description,
      suggestedActions: exception.suggestedActions,
      quickActions: exception.quickActions,
      sla: exception.sla,
      assignedTo: exception.assignedTo,
      createdAt: exception.createdAt
    };
  }

  /**
   * Format approval for API response
   */
  formatApproval(approval) {
    return {
      id: approval._id,
      status: approval.status,
      currentStep: approval.currentStep,
      totalSteps: approval.totalSteps,
      steps: approval.steps.map(step => ({
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        status: step.stepStatus,
        approvers: step.approvers.map(a => ({
          id: a.userId?._id,
          name: a.userName || a.userId?.name,
          status: a.status,
          decision: a.decision,
          comments: a.comments,
          respondedAt: a.respondedAt
        }))
      })),
      deadline: approval.deadline,
      finalDecision: approval.finalDecision
    };
  }

  /**
   * Format payment instruction for API response
   */
  formatPaymentInstruction(instruction) {
    return {
      id: instruction._id,
      instructionNumber: instruction.instructionNumber,
      status: instruction.status,
      paymentMethod: instruction.paymentMethod,
      scheduledDate: instruction.scheduledDate,
      amount: instruction.netPaymentAmount,
      currency: instruction.currency,
      bankAccount: {
        bankName: instruction.bankAccount?.bankName,
        accountNumber: instruction.bankAccount?.accountNumber ? 
          '****' + instruction.bankAccount.accountNumber.slice(-4) : null
      }
    };
  }

  /**
   * Generate timeline from invoice events
   */
  generateTimeline(invoice, exceptions, approval) {
    const events = [];

    // Invoice submission
    events.push({
      type: 'submitted',
      date: invoice.receivedDate,
      title: 'Invoice Submitted',
      description: `Invoice received via ${invoice.source}`
    });

    // Processing
    if (invoice.processedDate) {
      events.push({
        type: 'processed',
        date: invoice.processedDate,
        title: 'Invoice Processed',
        description: `Automation score: ${invoice.processingMetrics?.automationScore || 0}%`
      });
    }

    // Exceptions
    exceptions.forEach(ex => {
      events.push({
        type: 'exception',
        date: ex.createdAt,
        title: ex.title,
        description: ex.description,
        severity: ex.severity
      });
    });

    // Approval steps
    if (approval) {
      approval.steps.forEach(step => {
        step.approvers.forEach(approver => {
          if (approver.respondedAt) {
            events.push({
              type: approver.decision === 'approve' ? 'approved' : 'rejected',
              date: approver.respondedAt,
              title: `${approver.decision === 'approve' ? 'Approved' : 'Rejected'} by ${approver.userName}`,
              description: approver.comments
            });
          }
        });
      });
    }

    // Final approval
    if (invoice.approvedDate) {
      events.push({
        type: 'approved',
        date: invoice.approvedDate,
        title: invoice.autoApproved ? 'Auto-Approved' : 'Invoice Approved',
        description: invoice.autoApproved ? 'Met auto-approval criteria' : null
      });
    }

    // Payment
    if (invoice.paidAt) {
      events.push({
        type: 'paid',
        date: invoice.paidAt,
        title: 'Payment Completed',
        description: `Amount: ${invoice.currency} ${invoice.amountPaid}`
      });
    }

    // Sort by date
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Get available actions for invoice
   */
  getAvailableActions(invoice) {
    const actions = [];

    switch (invoice.status) {
      case 'submitted':
      case 'processing':
        actions.push({ action: 'process', label: 'Process Invoice' });
        break;
        
      case 'pending_review':
      case 'pending_approval':
        actions.push({ action: 'approve', label: 'Approve' });
        actions.push({ action: 'reject', label: 'Reject' });
        actions.push({ action: 'request_info', label: 'Request Info' });
        actions.push({ action: 'hold', label: 'Put on Hold' });
        break;
        
      case 'exception':
        actions.push({ action: 'resolve_exception', label: 'Resolve Exception' });
        actions.push({ action: 'escalate', label: 'Escalate' });
        actions.push({ action: 'reject', label: 'Reject' });
        break;
        
      case 'approved':
        actions.push({ action: 'schedule_payment', label: 'Schedule Payment' });
        actions.push({ action: 'hold', label: 'Put on Hold' });
        break;
        
      case 'scheduled':
        actions.push({ action: 'release_payment', label: 'Release Payment' });
        actions.push({ action: 'cancel_payment', label: 'Cancel Payment' });
        break;
        
      case 'on_hold':
        actions.push({ action: 'release', label: 'Release from Hold' });
        actions.push({ action: 'reject', label: 'Reject' });
        break;
    }

    // Common actions
    if (!['paid', 'cancelled', 'archived'].includes(invoice.status)) {
      actions.push({ action: 'add_note', label: 'Add Note' });
      actions.push({ action: 'assign', label: 'Assign' });
    }

    return actions;
  }

  /**
   * Create payment instruction for approved invoice
   */
  async createPaymentInstruction(invoiceId, paymentDetails, userId) {
    const invoice = await Invoice.findById(invoiceId)
      .populate('vendorId');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'approved') {
      throw new Error('Invoice must be approved before creating payment instruction');
    }

    // Calculate payment amount with any early payment discount
    let paymentAmount = invoice.totalAmount - invoice.amountPaid;
    let deductions = [];

    if (paymentDetails.applyEarlyPaymentDiscount && invoice.earlyPaymentDiscount?.discountPercent) {
      const discountAmount = paymentAmount * (invoice.earlyPaymentDiscount.discountPercent / 100);
      deductions.push({
        type: 'early_payment_discount',
        description: `${invoice.earlyPaymentDiscount.discountPercent}% early payment discount`,
        amount: discountAmount,
        percentage: invoice.earlyPaymentDiscount.discountPercent
      });
      paymentAmount -= discountAmount;
    }

    const instruction = new PaymentInstruction({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      vendorId: invoice.vendorId?._id || invoice.vendor,
      vendorName: invoice.vendorName,
      invoiceAmount: invoice.totalAmount,
      paymentAmount: invoice.totalAmount - invoice.amountPaid,
      currency: invoice.currency,
      deductions,
      totalDeductions: deductions.reduce((sum, d) => sum + d.amount, 0),
      netPaymentAmount: paymentAmount,
      bankAccount: paymentDetails.bankAccount || invoice.bankDetails,
      paymentMethod: paymentDetails.paymentMethod || 'ach',
      scheduledDate: paymentDetails.scheduledDate || this.calculatePaymentDate(invoice),
      glPosting: {
        ledgerAccount: invoice.glAccount,
        costCenter: invoice.costCenter,
        department: invoice.department,
        projectCode: invoice.projectCode
      },
      status: 'scheduled',
      createdBy: userId,
      priority: invoice.flags?.isUrgent ? 'urgent' : 'normal'
    });

    await instruction.save();

    // Update invoice status
    invoice.status = 'scheduled';
    invoice.auditTrail.push({
      action: 'payment_scheduled',
      performedBy: userId,
      performedAt: new Date(),
      details: { 
        instructionId: instruction._id,
        scheduledDate: instruction.scheduledDate,
        amount: instruction.netPaymentAmount
      }
    });

    await invoice.save();

    return {
      success: true,
      instructionId: instruction._id,
      instructionNumber: instruction.instructionNumber,
      scheduledDate: instruction.scheduledDate,
      amount: instruction.netPaymentAmount
    };
  }

  /**
   * Calculate optimal payment date
   */
  calculatePaymentDate(invoice) {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);

    // If early payment discount available and beneficial
    if (invoice.earlyPaymentDiscount?.discountDeadline) {
      const discountDeadline = new Date(invoice.earlyPaymentDiscount.discountDeadline);
      if (discountDeadline > today) {
        return discountDeadline;
      }
    }

    // Default to 2 days before due date
    const paymentDate = new Date(dueDate);
    paymentDate.setDate(paymentDate.getDate() - 2);

    return paymentDate > today ? paymentDate : today;
  }

  /**
   * Post invoice to ERP system
   */
  async postToERP(invoiceId, userId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Placeholder for ERP integration
    // In production, would call ERP API
    const erpResponse = {
      success: true,
      erpReference: `ERP-${Date.now()}`,
      journalEntryId: `JE-${Date.now()}`
    };

    invoice.erpReference = erpResponse.erpReference;
    invoice.erpPostingDate = new Date();
    invoice.erpPostingStatus = 'posted';

    invoice.auditTrail.push({
      action: 'posted_to_erp',
      performedBy: userId,
      performedAt: new Date(),
      details: erpResponse
    });

    await invoice.save();

    return erpResponse;
  }

  /**
   * Generate remittance advice
   */
  async generateRemittance(paymentInstructionId) {
    const instruction = await PaymentInstruction.findById(paymentInstructionId)
      .populate('invoiceId');

    if (!instruction) {
      throw new Error('Payment instruction not found');
    }

    const remittance = {
      remittanceNumber: `REM-${Date.now()}`,
      vendorName: instruction.vendorName,
      paymentDate: instruction.scheduledDate,
      paymentMethod: instruction.paymentMethod,
      totalAmount: instruction.netPaymentAmount,
      currency: instruction.currency,
      details: [{
        invoiceNumber: instruction.invoiceNumber,
        invoiceDate: instruction.invoiceId?.invoiceDate,
        invoiceAmount: instruction.invoiceAmount,
        paymentAmount: instruction.netPaymentAmount,
        discounts: instruction.totalDeductions,
        deductions: instruction.deductions
      }],
      bankAccount: {
        bankName: instruction.bankAccount?.bankName,
        accountNumber: instruction.bankAccount?.accountNumber ? 
          '****' + instruction.bankAccount.accountNumber.slice(-4) : null
      }
    };

    // Update instruction with remittance info
    instruction.remittance = {
      format: 'pdf',
      referenceNumber: remittance.remittanceNumber,
      details: remittance.details
    };

    await instruction.save();

    return remittance;
  }

  /**
   * Generate evidence bundle for audit
   */
  async generateEvidenceBundle(invoiceId, userId) {
    const invoice = await Invoice.findById(invoiceId)
      .populate('vendor')
      .populate('vendorId')
      .populate('approvedBy', 'name email');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const matchRecord = await MatchRecord.findOne({ invoiceId });
    const approval = await InvoiceApproval.findOne({ invoiceId });
    const exceptions = await InvoiceException.find({ invoiceId });
    const paymentInstruction = await PaymentInstruction.findOne({ invoiceId });

    const bundle = new EvidenceBundle({
      referenceType: 'invoice',
      referenceId: invoice._id,
      title: `Evidence Bundle - Invoice ${invoice.invoiceNumber}`,
      description: 'Complete audit trail for invoice processing',
      documents: invoice.rawFiles?.map(f => ({
        name: f.fileName,
        type: f.fileType,
        url: f.filePath,
        uploadedAt: f.uploadedAt
      })) || [],
      auditTrail: invoice.auditTrail,
      generatedBy: userId,
      status: 'complete',
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        vendorName: invoice.vendorName,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        matchScore: matchRecord?.overallMatchScore,
        automationScore: invoice.processingMetrics?.automationScore,
        approvalSteps: approval?.steps?.length || 0,
        exceptionsCount: exceptions.length
      }
    });

    // Add sections
    bundle.sections = [
      {
        title: 'Invoice Details',
        content: this.formatInvoice(invoice)
      },
      {
        title: 'Matching Evidence',
        content: matchRecord ? this.formatMatchRecord(matchRecord) : 'No matching performed'
      },
      {
        title: 'Approval History',
        content: approval ? this.formatApproval(approval) : 'No approval workflow'
      },
      {
        title: 'Exceptions',
        content: exceptions.map(e => this.formatException(e))
      },
      {
        title: 'Payment Information',
        content: paymentInstruction ? this.formatPaymentInstruction(paymentInstruction) : 'No payment scheduled'
      }
    ];

    await bundle.save();

    // Update invoice with bundle reference
    invoice.evidenceBundleId = bundle._id;
    await invoice.save();

    return {
      bundleId: bundle._id,
      title: bundle.title,
      sections: bundle.sections.map(s => s.title),
      documentsCount: bundle.documents.length,
      generatedAt: bundle.createdAt
    };
  }

  /**
   * Get invoice list with filters
   */
  async getInvoices(filters = {}, pagination = {}) {
    const query = {};
    
    // Apply filters
    if (filters.status) {
      query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
    }
    if (filters.vendorId) {
      query.$or = [{ vendorId: filters.vendorId }, { vendor: filters.vendorId }];
    }
    if (filters.dateFrom || filters.dateTo) {
      query.invoiceDate = {};
      if (filters.dateFrom) query.invoiceDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.invoiceDate.$lte = new Date(filters.dateTo);
    }
    if (filters.amountMin || filters.amountMax) {
      query.totalAmount = {};
      if (filters.amountMin) query.totalAmount.$gte = filters.amountMin;
      if (filters.amountMax) query.totalAmount.$lte = filters.amountMax;
    }
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }
    if (filters.hasException) {
      query.exceptionId = { $exists: true };
    }
    if (filters.search) {
      query.$or = [
        { invoiceNumber: { $regex: filters.search, $options: 'i' } },
        { vendorName: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Pagination
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;
    const sort = pagination.sort || { receivedDate: -1 };

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('vendor', 'name')
        .populate('vendorId', 'legalName businessName')
        .populate('assignedTo', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(query)
    ]);

    return {
      invoices: invoices.map(inv => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        vendorName: inv.vendorName || inv.vendorId?.legalName || inv.vendor?.name,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        currency: inv.currency,
        status: inv.status,
        matchStatus: inv.matchStatus,
        flags: inv.flags,
        assignedTo: inv.assignedTo?.name,
        automationScore: inv.processingMetrics?.automationScore,
        agingBucket: inv.agingBucket
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get exception queue
   */
  async getExceptionQueue(filters = {}, pagination = {}) {
    const query = {
      status: { $in: ['open', 'in_progress', 'pending_info'] }
    };

    if (filters.exceptionType) {
      query.exceptionType = filters.exceptionType;
    }
    if (filters.severity) {
      query.severity = filters.severity;
    }
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const [exceptions, total] = await Promise.all([
      InvoiceException.find(query)
        .populate('invoiceId', 'invoiceNumber totalAmount vendorName dueDate')
        .populate('assignedTo', 'name email')
        .sort({ priority: -1, 'sla.resolutionDeadline': 1 })
        .skip(skip)
        .limit(limit),
      InvoiceException.countDocuments(query)
    ]);

    return {
      exceptions: exceptions.map(this.formatException),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get analytics data
   */
  async getAnalytics(dateRange = {}) {
    const startDate = dateRange.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange.end ? new Date(dateRange.end) : new Date();

    const [
      statusDistribution,
      processingMetrics,
      exceptionStats,
      agingReport,
      automationRate,
      dpoTrend
    ] = await Promise.all([
      // Status distribution
      Invoice.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } }
      ]),
      
      // Processing metrics
      Invoice.aggregate([
        { $match: { processedDate: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingMetrics.totalProcessingTime' },
            avgAutomationScore: { $avg: '$processingMetrics.automationScore' },
            totalProcessed: { $sum: 1 },
            autoApproved: { $sum: { $cond: ['$autoApproved', 1, 0] } }
          }
        }
      ]),
      
      // Exception stats
      InvoiceException.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$exceptionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Aging report
      Invoice.getAgingReport(),
      
      // Automation rate over time
      Invoice.aggregate([
        { $match: { processedDate: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$processedDate' } },
            total: { $sum: 1 },
            autoApproved: { $sum: { $cond: ['$autoApproved', 1, 0] } },
            avgScore: { $avg: '$processingMetrics.automationScore' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // DPO trend
      Invoice.aggregate([
        { $match: { paidAt: { $gte: startDate, $lte: endDate } } },
        {
          $project: {
            paymentDate: '$paidAt',
            dpo: {
              $divide: [
                { $subtract: ['$paidAt', '$invoiceDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
            avgDPO: { $avg: '$dpo' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const metrics = processingMetrics[0] || {};

    return {
      summary: {
        totalInvoices: statusDistribution.reduce((sum, s) => sum + s.count, 0),
        totalValue: statusDistribution.reduce((sum, s) => sum + s.totalAmount, 0),
        avgProcessingTime: metrics.avgProcessingTime || 0,
        avgAutomationScore: metrics.avgAutomationScore || 0,
        automationRate: metrics.totalProcessed > 0 ? 
          (metrics.autoApproved / metrics.totalProcessed * 100).toFixed(1) : 0
      },
      statusDistribution: statusDistribution.map(s => ({
        status: s._id,
        count: s.count,
        amount: s.totalAmount
      })),
      exceptionBreakdown: exceptionStats.map(e => ({
        type: e._id,
        count: e.count
      })),
      agingReport,
      automationTrend: automationRate.map(a => ({
        date: a._id,
        total: a.total,
        autoApproved: a.autoApproved,
        rate: ((a.autoApproved / a.total) * 100).toFixed(1),
        avgScore: a.avgScore?.toFixed(1) || 0
      })),
      dpoTrend: dpoTrend.map(d => ({
        date: d._id,
        avgDPO: d.avgDPO?.toFixed(1) || 0,
        invoicesPaid: d.count
      }))
    };
  }

  /**
   * Send notification
   */
  async sendNotification(type, recipient, data) {
    // Placeholder for notification service
    console.log(`Notification: ${type} to ${recipient}`, data);
    return { success: true, type, recipient };
  }

  /**
   * Export invoices to CSV
   */
  async exportToCSV(filters = {}) {
    const { invoices } = await this.getInvoices(filters, { limit: 10000 });
    
    const headers = [
      'Invoice Number', 'Vendor', 'Invoice Date', 'Due Date', 
      'Total Amount', 'Currency', 'Status', 'Match Status', 'Aging Bucket'
    ];

    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.vendorName,
      inv.invoiceDate?.toISOString().split('T')[0],
      inv.dueDate?.toISOString().split('T')[0],
      inv.totalAmount,
      inv.currency,
      inv.status,
      inv.matchStatus,
      inv.agingBucket
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    return csv;
  }
}

module.exports = new InvoiceOutput();
