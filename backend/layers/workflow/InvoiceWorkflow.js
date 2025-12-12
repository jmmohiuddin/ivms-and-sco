/**
 * InvoiceWorkflow.js - Workflow Engine for Automated Invoicing
 * 
 * Handles:
 * - Approval workflow creation and management
 * - Multi-step/hierarchical approvals
 * - Delegation and escalation
 * - SLA monitoring and alerts
 * - Status transitions
 */

const Invoice = require('../../models/Invoice');
const InvoiceApproval = require('../../models/InvoiceApproval');
const InvoiceException = require('../../models/InvoiceException');
const User = require('../../models/User');

class InvoiceWorkflow {
  constructor() {
    // Approval thresholds by amount
    this.approvalMatrix = [
      { maxAmount: 1000, levels: 1, roles: ['ap_analyst'] },
      { maxAmount: 10000, levels: 1, roles: ['ap_supervisor'] },
      { maxAmount: 50000, levels: 2, roles: ['ap_supervisor', 'finance_manager'] },
      { maxAmount: 100000, levels: 2, roles: ['finance_manager', 'controller'] },
      { maxAmount: Infinity, levels: 3, roles: ['finance_manager', 'controller', 'cfo'] }
    ];

    // SLA settings (in hours)
    this.slaSettings = {
      standard: { response: 24, resolution: 48 },
      urgent: { response: 4, resolution: 24 },
      high_value: { response: 8, resolution: 24 }
    };
  }

  /**
   * Create approval workflow for invoice
   */
  async createApprovalWorkflow(invoiceId, options = {}) {
    const invoice = await Invoice.findById(invoiceId)
      .populate('vendor')
      .populate('vendorId');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Determine approval requirements
    const approvalConfig = this.determineApprovalConfig(invoice, options);

    // Get approvers for each level
    const steps = await this.buildApprovalSteps(approvalConfig, invoice);

    // Create approval record
    const approval = new InvoiceApproval({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      approvalType: approvalConfig.type,
      totalSteps: steps.length,
      steps,
      invoiceSummary: {
        vendorName: invoice.vendorName,
        vendorId: invoice.vendorId?._id || invoice.vendor?._id,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        category: invoice.category,
        costCenter: invoice.costCenter,
        department: invoice.department
      },
      matchRecordId: invoice.matchRecordId,
      matchScore: invoice.matchScore,
      glCoding: {
        glAccount: invoice.glAccount,
        costCenter: invoice.costCenter,
        department: invoice.department,
        projectCode: invoice.projectCode,
        codingConfidence: invoice.codingSuggestions?.[0]?.confidence,
        codingMethod: invoice.codingMethod
      },
      deadline: this.calculateDeadline(invoice),
      autoApproval: {
        eligible: approvalConfig.autoApprove,
        reason: approvalConfig.autoApproveReason,
        appliedRules: approvalConfig.appliedRules,
        threshold: approvalConfig.threshold
      },
      priority: invoice.flags?.isUrgent ? 'urgent' : 
               invoice.flags?.isHighValue ? 'high' : 'normal'
    });

    // Start first step
    if (steps.length > 0) {
      approval.status = 'in_progress';
      approval.currentStep = 1;
      steps[0].stepStatus = 'in_progress';
      steps[0].startedAt = new Date();
    }

    await approval.save();

    // Update invoice
    invoice.status = 'pending_approval';
    invoice.currentApprovalStep = 1;
    invoice.totalApprovalSteps = steps.length;
    invoice.auditTrail.push({
      action: 'approval_workflow_created',
      performedAt: new Date(),
      details: { 
        approvalId: approval._id,
        steps: steps.length,
        type: approvalConfig.type
      }
    });

    await invoice.save();

    // Send notifications to first step approvers
    await this.notifyApprovers(approval, 1);

    return {
      success: true,
      approvalId: approval._id,
      steps: steps.length,
      deadline: approval.deadline
    };
  }

  /**
   * Determine approval configuration based on invoice
   */
  determineApprovalConfig(invoice, options) {
    const config = {
      type: 'sequential',
      levels: 1,
      roles: [],
      autoApprove: false,
      autoApproveReason: null,
      appliedRules: [],
      threshold: null
    };

    // Check for auto-approval
    if (invoice.autoApproved) {
      config.autoApprove = true;
      config.autoApproveReason = 'Met auto-approval criteria';
      config.appliedRules.push('auto_approved');
      return config;
    }

    // Find matching threshold
    const threshold = this.approvalMatrix.find(t => invoice.totalAmount <= t.maxAmount);
    if (threshold) {
      config.levels = threshold.levels;
      config.roles = threshold.roles;
      config.threshold = threshold.maxAmount;
    }

    // Adjust for special cases
    if (invoice.flags?.isHighValue) {
      config.levels = Math.max(config.levels, 2);
      config.appliedRules.push('high_value');
    }

    if (invoice.flags?.isFraudSuspect || invoice.flags?.hasAnomaly) {
      config.levels = Math.max(config.levels, 2);
      config.type = 'sequential';
      config.appliedRules.push('requires_review');
    }

    if (invoice.matchStatus === 'no_match' || invoice.matchStatus === 'partial_match') {
      config.levels = Math.max(config.levels, 2);
      config.appliedRules.push('matching_exception');
    }

    // Non-PO invoices need extra approval
    if (!invoice.hasPO && invoice.totalAmount > 5000) {
      config.levels = Math.max(config.levels, 2);
      config.appliedRules.push('non_po_invoice');
    }

    // Override with options if provided
    if (options.forceSteps) {
      config.levels = options.forceSteps;
    }
    if (options.approvalType) {
      config.type = options.approvalType;
    }

    return config;
  }

  /**
   * Build approval steps with approvers
   */
  async buildApprovalSteps(config, invoice) {
    const steps = [];

    for (let i = 0; i < config.levels; i++) {
      const role = config.roles[i] || config.roles[config.roles.length - 1];
      
      // Find users with this role
      const approvers = await this.findApprovers(role, invoice);

      steps.push({
        stepNumber: i + 1,
        stepName: `${role.replace('_', ' ').toUpperCase()} Approval`,
        stepType: approvers.length > 1 ? 'any' : 'single',
        requiredApprovals: 1,
        approvers: approvers.map(user => ({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          role: role,
          department: user.department,
          approvalLimit: user.approvalLimit,
          status: 'pending'
        })),
        stepStatus: 'pending',
        escalation: {
          enabled: true,
          afterHours: this.slaSettings.standard.response
        }
      });
    }

    return steps;
  }

  /**
   * Find approvers by role
   */
  async findApprovers(role, invoice) {
    // Try to find users with specific role
    let users = await User.find({ 
      role: role,
      isActive: true
    }).limit(5);

    // If no specific role users, find by department
    if (users.length === 0 && invoice.department) {
      users = await User.find({
        department: invoice.department,
        isActive: true
      }).limit(3);
    }

    // Fallback to admin users
    if (users.length === 0) {
      users = await User.find({
        role: { $in: ['admin', 'manager'] },
        isActive: true
      }).limit(3);
    }

    // If still no users, create placeholder
    if (users.length === 0) {
      return [{
        _id: null,
        name: 'System Admin',
        email: 'admin@ivms.local',
        role: role
      }];
    }

    return users;
  }

  /**
   * Calculate approval deadline
   */
  calculateDeadline(invoice) {
    const sla = invoice.flags?.isUrgent ? this.slaSettings.urgent :
               invoice.flags?.isHighValue ? this.slaSettings.high_value :
               this.slaSettings.standard;

    const deadline = new Date();
    deadline.setHours(deadline.getHours() + sla.resolution);

    // Don't exceed invoice due date
    if (invoice.dueDate && invoice.dueDate < deadline) {
      return new Date(invoice.dueDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before due
    }

    return deadline;
  }

  /**
   * Process approval decision
   */
  async processApproval(invoiceId, approverId, decision, comments, glOverrides = null) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const approval = await InvoiceApproval.findOne({ invoiceId });
    if (!approval) {
      throw new Error('Approval workflow not found');
    }

    // Validate approver is in current step
    const currentStep = approval.steps.find(s => s.stepNumber === approval.currentStep);
    if (!currentStep) {
      throw new Error('Invalid approval step');
    }

    const approver = currentStep.approvers.find(a => 
      a.userId?.toString() === approverId.toString() && a.status === 'pending'
    );

    if (!approver) {
      throw new Error('You are not authorized to approve this invoice at this step');
    }

    // Record decision
    approver.status = decision === 'approve' ? 'approved' : 'rejected';
    approver.decision = decision;
    approver.comments = comments;
    approver.respondedAt = new Date();

    // Apply GL overrides if provided
    if (glOverrides && decision === 'approve') {
      approval.glOverrides.push({
        field: 'glAccount',
        originalValue: invoice.glAccount,
        newValue: glOverrides.glAccount,
        overriddenBy: approverId,
        overriddenAt: new Date(),
        reason: glOverrides.reason
      });

      // Update invoice coding
      if (glOverrides.glAccount) invoice.glAccount = glOverrides.glAccount;
      if (glOverrides.costCenter) invoice.costCenter = glOverrides.costCenter;
      if (glOverrides.department) invoice.department = glOverrides.department;
      if (glOverrides.projectCode) invoice.projectCode = glOverrides.projectCode;
    }

    // Add to audit trail
    approval.auditTrail.push({
      action: `step_${approval.currentStep}_${decision}`,
      performedBy: approverId,
      performedAt: new Date(),
      details: { decision, comments, glOverrides }
    });

    // Determine next action based on step type and decision
    await this.processStepCompletion(approval, currentStep, decision, approverId);

    // Update invoice metrics
    invoice.processingMetrics = invoice.processingMetrics || {};
    invoice.processingMetrics.humanTouchCount = (invoice.processingMetrics.humanTouchCount || 0) + 1;

    await approval.save();
    await invoice.save();

    // Send notifications
    await this.sendDecisionNotifications(approval, invoice, decision, comments);

    return {
      success: true,
      decision,
      approvalStatus: approval.status,
      invoiceStatus: invoice.status,
      currentStep: approval.currentStep,
      totalSteps: approval.totalSteps,
      isComplete: approval.status === 'approved' || approval.status === 'rejected'
    };
  }

  /**
   * Process step completion
   */
  async processStepCompletion(approval, currentStep, decision, userId) {
    const invoice = await Invoice.findById(approval.invoiceId);

    if (decision === 'reject') {
      // Rejection stops the workflow
      currentStep.stepStatus = 'rejected';
      currentStep.completedAt = new Date();
      approval.status = 'rejected';
      approval.finalDecision = 'rejected';
      approval.finalDecisionBy = userId;
      approval.finalDecisionAt = new Date();

      // Update invoice
      invoice.status = 'rejected';
      invoice.auditTrail.push({
        action: 'invoice_rejected',
        performedBy: userId,
        performedAt: new Date(),
        details: { step: approval.currentStep }
      });

      await invoice.save();
      return;
    }

    // For approve decision
    const approvedCount = currentStep.approvers.filter(a => a.status === 'approved').length;
    const pendingCount = currentStep.approvers.filter(a => a.status === 'pending').length;

    // Check if step is complete based on step type
    let stepComplete = false;

    switch (currentStep.stepType) {
      case 'single':
      case 'any':
        stepComplete = approvedCount >= currentStep.requiredApprovals;
        break;
      case 'all':
        stepComplete = pendingCount === 0 && approvedCount === currentStep.approvers.length;
        break;
      case 'percentage':
        const percentage = (approvedCount / currentStep.approvers.length) * 100;
        stepComplete = percentage >= (currentStep.approvalPercentage || 50);
        break;
    }

    if (stepComplete) {
      currentStep.stepStatus = 'completed';
      currentStep.completedAt = new Date();

      // Check if this was the last step
      if (approval.currentStep >= approval.totalSteps) {
        // Workflow complete
        approval.status = 'approved';
        approval.finalDecision = 'approved';
        approval.finalDecisionBy = userId;
        approval.finalDecisionAt = new Date();

        // Update invoice
        invoice.status = 'approved';
        invoice.approvedDate = new Date();
        invoice.approvedBy = userId;
        invoice.auditTrail.push({
          action: 'invoice_approved',
          performedBy: userId,
          performedAt: new Date()
        });

        await invoice.save();
      } else {
        // Move to next step
        approval.currentStep += 1;
        invoice.currentApprovalStep = approval.currentStep;

        const nextStep = approval.steps.find(s => s.stepNumber === approval.currentStep);
        if (nextStep) {
          nextStep.stepStatus = 'in_progress';
          nextStep.startedAt = new Date();
        }

        await invoice.save();

        // Notify next step approvers
        await this.notifyApprovers(approval, approval.currentStep);
      }
    }
  }

  /**
   * Delegate approval to another user
   */
  async delegateApproval(invoiceId, fromUserId, toUserId) {
    const approval = await InvoiceApproval.findOne({ invoiceId });
    if (!approval) {
      throw new Error('Approval workflow not found');
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      throw new Error('Delegate user not found');
    }

    const result = await approval.delegate(fromUserId, toUserId, toUser.name, toUser.email);

    // Notify delegated user
    await this.sendNotification('delegation', toUser.email, {
      invoiceId,
      invoiceNumber: approval.invoiceNumber,
      delegatedBy: fromUserId
    });

    return {
      success: true,
      delegatedTo: toUser.name
    };
  }

  /**
   * Escalate approval
   */
  async escalateApproval(invoiceId, reason, userId) {
    const invoice = await Invoice.findById(invoiceId);
    const approval = await InvoiceApproval.findOne({ invoiceId });

    if (!approval) {
      throw new Error('Approval workflow not found');
    }

    // Find escalation target
    const currentStep = approval.steps.find(s => s.stepNumber === approval.currentStep);
    let escalateTo = currentStep?.escalation?.escalateTo;

    // If no specific escalation target, find a manager
    if (!escalateTo) {
      const managers = await User.find({ 
        role: { $in: ['manager', 'admin', 'controller'] },
        isActive: true 
      }).limit(1);
      escalateTo = managers[0]?._id;
    }

    await approval.escalate(escalateTo, reason, userId);

    // Update invoice
    invoice.sla = invoice.sla || {};
    invoice.sla.escalatedAt = new Date();
    invoice.sla.escalatedTo = escalateTo;

    invoice.auditTrail.push({
      action: 'approval_escalated',
      performedBy: userId,
      performedAt: new Date(),
      details: { reason, escalatedTo }
    });

    await invoice.save();

    // Notify escalation target
    if (escalateTo) {
      const escalateUser = await User.findById(escalateTo);
      await this.sendNotification('escalation', escalateUser?.email, {
        invoiceId,
        invoiceNumber: approval.invoiceNumber,
        reason
      });
    }

    return {
      success: true,
      escalatedTo,
      reason
    };
  }

  /**
   * Request additional information
   */
  async requestInfo(invoiceId, requestDetails, userId) {
    const invoice = await Invoice.findById(invoiceId);
    const approval = await InvoiceApproval.findOne({ invoiceId });

    if (!approval) {
      throw new Error('Approval workflow not found');
    }

    // Update current approver status
    const currentStep = approval.steps.find(s => s.stepNumber === approval.currentStep);
    const approver = currentStep?.approvers.find(a => 
      a.userId?.toString() === userId.toString()
    );

    if (approver) {
      approver.decision = 'request_info';
      approver.comments = requestDetails.question;
      approver.respondedAt = new Date();
    }

    // Add notification to approval
    approval.notifications.push({
      type: 'info_request',
      recipientId: invoice.vendorId || invoice.vendor,
      sentAt: new Date(),
      channel: 'email',
      status: 'sent'
    });

    approval.auditTrail.push({
      action: 'info_requested',
      performedBy: userId,
      performedAt: new Date(),
      details: requestDetails
    });

    await approval.save();

    // Update invoice status
    invoice.status = 'pending_review';
    invoice.subStatus = 'awaiting_info';
    invoice.auditTrail.push({
      action: 'info_requested',
      performedBy: userId,
      performedAt: new Date(),
      details: requestDetails
    });

    await invoice.save();

    // Send notification to vendor
    await this.sendNotification('info_request', requestDetails.recipientEmail, {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      question: requestDetails.question
    });

    return {
      success: true,
      status: 'awaiting_info'
    };
  }

  /**
   * Put invoice on hold
   */
  async putOnHold(invoiceId, reason, userId, releaseDate = null) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const previousStatus = invoice.status;
    invoice.status = 'on_hold';
    invoice.subStatus = reason;

    invoice.auditTrail.push({
      action: 'put_on_hold',
      performedBy: userId,
      performedAt: new Date(),
      details: { reason, releaseDate, previousStatus }
    });

    await invoice.save();

    // Update approval if exists
    const approval = await InvoiceApproval.findOne({ invoiceId });
    if (approval && approval.status === 'in_progress') {
      approval.status = 'on_hold';
      approval.auditTrail.push({
        action: 'put_on_hold',
        performedBy: userId,
        performedAt: new Date(),
        details: { reason }
      });
      await approval.save();
    }

    return {
      success: true,
      previousStatus,
      releaseDate
    };
  }

  /**
   * Release invoice from hold
   */
  async releaseFromHold(invoiceId, userId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'on_hold') {
      throw new Error('Invoice is not on hold');
    }

    // Determine what status to restore to
    const approval = await InvoiceApproval.findOne({ invoiceId });
    let newStatus = 'pending_review';

    if (approval) {
      if (approval.status === 'approved') {
        newStatus = 'approved';
      } else if (approval.currentStep > 0) {
        newStatus = 'pending_approval';
        approval.status = 'in_progress';
        await approval.save();
      }
    }

    invoice.status = newStatus;
    invoice.subStatus = null;

    invoice.auditTrail.push({
      action: 'released_from_hold',
      performedBy: userId,
      performedAt: new Date(),
      details: { newStatus }
    });

    await invoice.save();

    return {
      success: true,
      newStatus
    };
  }

  /**
   * Resolve exception
   */
  async resolveException(exceptionId, resolution, userId) {
    const exception = await InvoiceException.findById(exceptionId);
    if (!exception) {
      throw new Error('Exception not found');
    }

    await exception.resolve(
      resolution.action,
      resolution.description,
      userId,
      resolution.adjustments
    );

    // Update invoice
    const invoice = await Invoice.findById(exception.invoiceId);
    if (invoice) {
      // Apply adjustments if any
      if (resolution.adjustments) {
        for (const adj of resolution.adjustments) {
          if (adj.field === 'totalAmount') {
            invoice.totalAmount = adj.newValue;
          }
          if (adj.field === 'glAccount') {
            invoice.glAccount = adj.newValue;
          }
        }
      }

      // Update status based on resolution action
      if (resolution.action === 'approve_with_adjustment') {
        invoice.status = 'pending_approval';
      } else if (resolution.action === 'reject_invoice') {
        invoice.status = 'rejected';
      } else {
        invoice.status = 'pending_review';
      }

      invoice.auditTrail.push({
        action: 'exception_resolved',
        performedBy: userId,
        performedAt: new Date(),
        details: resolution
      });

      await invoice.save();
    }

    return {
      success: true,
      exceptionId,
      resolution: resolution.action,
      invoiceStatus: invoice?.status
    };
  }

  /**
   * Check and process SLA breaches
   */
  async checkSLABreaches() {
    const now = new Date();

    // Find approvals with breached deadlines
    const breachedApprovals = await InvoiceApproval.find({
      status: 'in_progress',
      deadline: { $lt: now }
    }).populate('invoiceId');

    const results = [];

    for (const approval of breachedApprovals) {
      // Mark as breached
      approval.status = 'escalated';
      approval.auditTrail.push({
        action: 'sla_breached',
        performedAt: now,
        details: { deadline: approval.deadline }
      });

      await approval.save();

      // Update invoice
      if (approval.invoiceId) {
        approval.invoiceId.sla = approval.invoiceId.sla || {};
        approval.invoiceId.sla.isBreached = true;
        approval.invoiceId.sla.breachType = 'approval_deadline';
        await approval.invoiceId.save();
      }

      // Auto-escalate
      await this.escalateApproval(approval.invoiceId._id, 'SLA breach - auto-escalated', null);

      results.push({
        invoiceId: approval.invoiceId._id,
        invoiceNumber: approval.invoiceNumber,
        deadline: approval.deadline
      });
    }

    // Find exceptions with breached SLAs
    const breachedExceptions = await InvoiceException.find({
      status: { $in: ['open', 'in_progress'] },
      'sla.resolutionDeadline': { $lt: now },
      'sla.isBreached': { $ne: true }
    });

    for (const exception of breachedExceptions) {
      exception.sla.isBreached = true;
      exception.sla.breachType = 'resolution';
      exception.sla.breachedAt = now;
      exception.priority = Math.min(exception.priority + 2, 10);
      
      await exception.save();

      results.push({
        type: 'exception',
        exceptionId: exception._id,
        invoiceId: exception.invoiceId
      });
    }

    return {
      breachesProcessed: results.length,
      breaches: results
    };
  }

  /**
   * Notify approvers
   */
  async notifyApprovers(approval, stepNumber) {
    const step = approval.steps.find(s => s.stepNumber === stepNumber);
    if (!step) return;

    for (const approver of step.approvers) {
      if (approver.status === 'pending' && approver.userEmail) {
        await this.sendNotification('approval_request', approver.userEmail, {
          invoiceId: approval.invoiceId,
          invoiceNumber: approval.invoiceNumber,
          amount: approval.invoiceSummary.totalAmount,
          vendorName: approval.invoiceSummary.vendorName,
          deadline: approval.deadline
        });

        approver.notifiedAt = new Date();
      }
    }

    await approval.save();
  }

  /**
   * Send decision notifications
   */
  async sendDecisionNotifications(approval, invoice, decision, comments) {
    // Notify vendor for rejection
    if (decision === 'reject') {
      await this.sendNotification('rejection', invoice.vendorId || invoice.vendor, {
        invoiceNumber: invoice.invoiceNumber,
        reason: comments
      });
    }

    // Notify submitter for approval completion
    if (approval.status === 'approved') {
      await this.sendNotification('approved', invoice.vendorId || invoice.vendor, {
        invoiceNumber: invoice.invoiceNumber,
        paymentDate: invoice.dueDate
      });
    }
  }

  /**
   * Send notification (placeholder)
   */
  async sendNotification(type, recipient, data) {
    console.log(`Notification [${type}] to ${recipient}:`, data);
    return { success: true };
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovalsForUser(userId) {
    return InvoiceApproval.getPendingForUser(userId);
  }

  /**
   * Get approval history for invoice
   */
  async getApprovalHistory(invoiceId) {
    const approval = await InvoiceApproval.findOne({ invoiceId })
      .populate('steps.approvers.userId', 'name email')
      .populate('finalDecisionBy', 'name email');

    if (!approval) {
      return null;
    }

    return {
      id: approval._id,
      status: approval.status,
      steps: approval.steps.map(step => ({
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        status: step.stepStatus,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        approvers: step.approvers.map(a => ({
          name: a.userName || a.userId?.name,
          email: a.userEmail || a.userId?.email,
          status: a.status,
          decision: a.decision,
          comments: a.comments,
          respondedAt: a.respondedAt
        }))
      })),
      finalDecision: approval.finalDecision,
      finalDecisionBy: approval.finalDecisionBy?.name,
      finalDecisionAt: approval.finalDecisionAt,
      auditTrail: approval.auditTrail
    };
  }
}

module.exports = new InvoiceWorkflow();
