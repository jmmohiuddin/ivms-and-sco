/**
 * Compliance Workflow Engine
 * Remediation orchestration, escalation, SLA tracking, and human-in-loop validation
 */

const RemediationCase = require('../../models/RemediationCase');
const VendorComplianceProfile = require('../../models/VendorComplianceProfile');
const PolicyRule = require('../../models/PolicyRule');
const ComplianceEvent = require('../../models/ComplianceEvent');
const ComplianceOutputLayer = require('../output/ComplianceOutput');

class ComplianceWorkflowEngine {
  constructor() {
    // SLA configurations by severity
    this.slaConfig = {
      critical: { responseDays: 1, resolutionDays: 3 },
      high: { responseDays: 2, resolutionDays: 7 },
      medium: { responseDays: 5, resolutionDays: 14 },
      low: { responseDays: 10, resolutionDays: 30 }
    };
    
    // Escalation matrix
    this.escalationMatrix = {
      1: { level: 'team_lead', afterDays: 0.5 },
      2: { level: 'manager', afterDays: 1 },
      3: { level: 'director', afterDays: 2 },
      4: { level: 'vp', afterDays: 3 },
      5: { level: 'executive', afterDays: 5 }
    };
  }

  // =====================================================
  // CASE MANAGEMENT
  // =====================================================

  /**
   * Create a new remediation case
   */
  async createCase(caseData) {
    try {
      const {
        vendorId,
        policyRuleId,
        type,
        severity,
        description,
        findings,
        triggeredBy
      } = caseData;
      
      // Calculate SLA deadline
      const slaConfig = this.slaConfig[severity] || this.slaConfig.medium;
      const slaDeadline = new Date(Date.now() + slaConfig.resolutionDays * 24 * 60 * 60 * 1000);
      
      // Get exposure data
      const exposure = await this.calculateExposure(vendorId);
      
      // Create the case
      const remediationCase = new RemediationCase({
        vendorId,
        policyRuleId,
        type: type || 'policy_violation',
        severity,
        priority: this.calculatePriority(severity, exposure),
        description,
        slaDeadline,
        exposure,
        status: 'open',
        actions: [{
          type: 'case_created',
          description: 'Remediation case created',
          status: 'completed',
          completedAt: new Date()
        }],
        history: [{
          action: 'case_created',
          performedBy: triggeredBy || 'system',
          timestamp: new Date(),
          details: { findings }
        }]
      });
      
      // Assign to appropriate team/person
      remediationCase.assignedTo = await this.determineAssignment(severity, type);
      
      await remediationCase.save();
      
      // Send notifications
      await this.notifyCaseCreated(remediationCase);
      
      return remediationCase;
    } catch (error) {
      console.error('Create case error:', error);
      throw error;
    }
  }

  /**
   * Calculate exposure for vendor
   */
  async calculateExposure(vendorId) {
    // This would query invoices, contracts, orders
    // Placeholder implementation
    return {
      pendingInvoices: {
        count: 0,
        totalValue: 0,
        currency: 'USD'
      },
      activeContracts: {
        count: 0,
        totalValue: 0,
        currency: 'USD'
      },
      openOrders: {
        count: 0,
        totalValue: 0,
        currency: 'USD'
      }
    };
  }

  /**
   * Calculate priority based on severity and exposure
   */
  calculatePriority(severity, exposure) {
    const severityScore = { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 2;
    const exposureValue = 
      (exposure.pendingInvoices?.totalValue || 0) +
      (exposure.activeContracts?.totalValue || 0);
    
    // High exposure increases priority
    if (exposureValue > 1000000 && severityScore >= 2) return 'urgent';
    if (exposureValue > 500000 && severityScore >= 3) return 'urgent';
    if (severityScore === 4) return 'urgent';
    if (severityScore === 3) return 'high';
    if (severityScore === 2) return 'normal';
    return 'low';
  }

  /**
   * Determine case assignment
   */
  async determineAssignment(severity, type) {
    // Assignment logic based on type and severity
    // In real implementation, would query team/user database
    const assignments = {
      policy_violation: 'compliance_team',
      sanctions_hit: 'legal_team',
      document_expired: 'vendor_management',
      adverse_media: 'risk_team'
    };
    
    return assignments[type] || 'compliance_team';
  }

  /**
   * Notify stakeholders of new case
   */
  async notifyCaseCreated(remediationCase) {
    await ComplianceOutputLayer.sendAlert({
      vendorId: remediationCase.vendorId,
      alertType: 'remediation_case_created',
      severity: remediationCase.severity,
      title: `New Remediation Case: ${remediationCase.caseNumber}`,
      message: remediationCase.description,
      data: {
        caseNumber: remediationCase.caseNumber,
        type: remediationCase.type,
        slaDeadline: remediationCase.slaDeadline
      },
      recipients: [{ email: `${remediationCase.assignedTo}@company.com` }]
    });
  }

  // =====================================================
  // CASE WORKFLOW
  // =====================================================

  /**
   * Add action to case
   */
  async addCaseAction(caseNumber, actionData) {
    try {
      const remediationCase = await RemediationCase.findOne({ caseNumber });
      if (!remediationCase) {
        throw new Error('Case not found');
      }
      
      await remediationCase.addAction({
        type: actionData.type,
        description: actionData.description,
        assignedTo: actionData.assignedTo,
        dueDate: actionData.dueDate,
        notes: actionData.notes
      });
      
      // Record in history
      remediationCase.history.push({
        action: 'action_added',
        performedBy: actionData.performedBy,
        timestamp: new Date(),
        details: actionData
      });
      
      await remediationCase.save();
      
      return remediationCase;
    } catch (error) {
      console.error('Add action error:', error);
      throw error;
    }
  }

  /**
   * Complete a case action
   */
  async completeAction(caseNumber, actionId, completionData) {
    try {
      const remediationCase = await RemediationCase.findOne({ caseNumber });
      if (!remediationCase) {
        throw new Error('Case not found');
      }
      
      const action = remediationCase.actions.id(actionId);
      if (!action) {
        throw new Error('Action not found');
      }
      
      action.status = 'completed';
      action.completedAt = new Date();
      action.notes = completionData.notes || action.notes;
      
      // Check if all required actions are complete
      const allComplete = remediationCase.actions
        .filter(a => a.type !== 'case_created')
        .every(a => a.status === 'completed');
      
      if (allComplete && remediationCase.status === 'in_progress') {
        remediationCase.status = 'pending_review';
      }
      
      remediationCase.history.push({
        action: 'action_completed',
        performedBy: completionData.completedBy,
        timestamp: new Date(),
        details: { actionId, notes: completionData.notes }
      });
      
      await remediationCase.save();
      
      return remediationCase;
    } catch (error) {
      console.error('Complete action error:', error);
      throw error;
    }
  }

  /**
   * Update case status
   */
  async updateCaseStatus(caseNumber, status, updateData = {}) {
    try {
      const remediationCase = await RemediationCase.findOne({ caseNumber });
      if (!remediationCase) {
        throw new Error('Case not found');
      }
      
      const previousStatus = remediationCase.status;
      remediationCase.status = status;
      
      if (status === 'in_progress' && previousStatus === 'open') {
        remediationCase.acknowledgedAt = new Date();
      }
      
      remediationCase.history.push({
        action: 'status_changed',
        performedBy: updateData.updatedBy || 'system',
        timestamp: new Date(),
        details: { 
          from: previousStatus, 
          to: status,
          reason: updateData.reason 
        }
      });
      
      await remediationCase.save();
      
      // Notify if significant status change
      if (['resolved', 'escalated'].includes(status)) {
        await this.notifyStatusChange(remediationCase, previousStatus, status);
      }
      
      return remediationCase;
    } catch (error) {
      console.error('Update status error:', error);
      throw error;
    }
  }

  async notifyStatusChange(remediationCase, fromStatus, toStatus) {
    await ComplianceOutputLayer.sendAlert({
      vendorId: remediationCase.vendorId,
      alertType: 'case_status_change',
      severity: 'low',
      title: `Case ${remediationCase.caseNumber} Status: ${toStatus}`,
      message: `Case status changed from ${fromStatus} to ${toStatus}`,
      data: { caseNumber: remediationCase.caseNumber, fromStatus, toStatus }
    });
  }

  // =====================================================
  // ESCALATION
  // =====================================================

  /**
   * Escalate a case
   */
  async escalateCase(caseNumber, escalationData) {
    try {
      const remediationCase = await RemediationCase.findOne({ caseNumber });
      if (!remediationCase) {
        throw new Error('Case not found');
      }
      
      const currentLevel = remediationCase.escalations?.length || 0;
      const nextLevel = Math.min(currentLevel + 1, 5);
      const escalationConfig = this.escalationMatrix[nextLevel];
      
      await remediationCase.escalate(
        escalationConfig.level,
        escalationData.reason,
        escalationData.escalatedBy
      );
      
      // Update assignment
      remediationCase.assignedTo = escalationConfig.level;
      await remediationCase.save();
      
      // Send escalation notification
      await this.notifyEscalation(remediationCase, escalationConfig.level);
      
      return remediationCase;
    } catch (error) {
      console.error('Escalate case error:', error);
      throw error;
    }
  }

  async notifyEscalation(remediationCase, toLevel) {
    await ComplianceOutputLayer.sendAlert({
      vendorId: remediationCase.vendorId,
      alertType: 'case_escalated',
      severity: 'high',
      title: `ESCALATION: Case ${remediationCase.caseNumber}`,
      message: `Case escalated to ${toLevel}. Severity: ${remediationCase.severity}. SLA: ${remediationCase.slaDeadline}`,
      data: {
        caseNumber: remediationCase.caseNumber,
        severity: remediationCase.severity,
        slaDeadline: remediationCase.slaDeadline,
        escalatedTo: toLevel
      }
    });
  }

  /**
   * Auto-escalate overdue cases
   */
  async autoEscalateOverdueCases() {
    try {
      const overdueCases = await RemediationCase.find({
        status: { $nin: ['resolved', 'closed', 'cancelled'] },
        slaDeadline: { $lt: new Date() }
      });
      
      const results = [];
      
      for (const remediationCase of overdueCases) {
        try {
          // Check if already at max escalation
          if ((remediationCase.escalations?.length || 0) < 5) {
            await this.escalateCase(remediationCase.caseNumber, {
              reason: 'Auto-escalated due to SLA breach',
              escalatedBy: 'system'
            });
            results.push({ caseNumber: remediationCase.caseNumber, escalated: true });
          }
        } catch (error) {
          results.push({ caseNumber: remediationCase.caseNumber, escalated: false, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Auto-escalate error:', error);
      throw error;
    }
  }

  // =====================================================
  // SLA TRACKING
  // =====================================================

  /**
   * Get SLA status for a case
   */
  async getSLAStatus(caseNumber) {
    const remediationCase = await RemediationCase.findOne({ caseNumber });
    if (!remediationCase) {
      throw new Error('Case not found');
    }
    
    const now = new Date();
    const slaDeadline = new Date(remediationCase.slaDeadline);
    const timeRemaining = slaDeadline - now;
    const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
    
    let status;
    if (remediationCase.status === 'resolved') {
      const resolvedAt = new Date(remediationCase.resolution?.resolvedAt);
      status = resolvedAt <= slaDeadline ? 'met' : 'breached';
    } else if (now > slaDeadline) {
      status = 'breached';
    } else if (hoursRemaining <= 24) {
      status = 'at_risk';
    } else {
      status = 'on_track';
    }
    
    return {
      caseNumber,
      slaDeadline,
      currentStatus: remediationCase.status,
      slaStatus: status,
      hoursRemaining: Math.max(0, hoursRemaining),
      percentageUsed: this.calculateSLAPercentage(remediationCase)
    };
  }

  calculateSLAPercentage(remediationCase) {
    const slaConfig = this.slaConfig[remediationCase.severity] || this.slaConfig.medium;
    const totalHours = slaConfig.resolutionDays * 24;
    const createdAt = new Date(remediationCase.createdAt);
    const now = new Date();
    const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);
    
    return Math.min(100, Math.round((hoursElapsed / totalHours) * 100));
  }

  /**
   * Get cases at risk of SLA breach
   */
  async getCasesAtRisk() {
    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000); // Within 24 hours
    
    return RemediationCase.find({
      status: { $nin: ['resolved', 'closed', 'cancelled'] },
      slaDeadline: { $lte: threshold, $gt: new Date() }
    }).sort({ slaDeadline: 1 });
  }

  /**
   * Get SLA metrics
   */
  async getSLAMetrics(startDate, endDate) {
    const cases = await RemediationCase.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const resolved = cases.filter(c => c.status === 'resolved');
    const metSLA = resolved.filter(c => {
      const resolvedAt = new Date(c.resolution?.resolvedAt);
      return resolvedAt <= new Date(c.slaDeadline);
    });
    
    return {
      totalCases: cases.length,
      resolvedCases: resolved.length,
      slaCompliance: resolved.length > 0 
        ? Math.round((metSLA.length / resolved.length) * 100) 
        : 100,
      averageResolutionTime: this.calculateAverageResolutionTime(resolved),
      bySeverity: this.calculateSLABySeverity(cases)
    };
  }

  calculateAverageResolutionTime(resolvedCases) {
    if (resolvedCases.length === 0) return 0;
    
    const totalHours = resolvedCases.reduce((sum, c) => {
      const resolvedAt = new Date(c.resolution?.resolvedAt || c.updatedAt);
      const createdAt = new Date(c.createdAt);
      return sum + ((resolvedAt - createdAt) / (1000 * 60 * 60));
    }, 0);
    
    return Math.round(totalHours / resolvedCases.length);
  }

  calculateSLABySeverity(cases) {
    const severities = ['critical', 'high', 'medium', 'low'];
    return severities.reduce((acc, severity) => {
      const severityCases = cases.filter(c => c.severity === severity);
      const resolved = severityCases.filter(c => c.status === 'resolved');
      const metSLA = resolved.filter(c => {
        const resolvedAt = new Date(c.resolution?.resolvedAt);
        return resolvedAt <= new Date(c.slaDeadline);
      });
      
      acc[severity] = {
        total: severityCases.length,
        resolved: resolved.length,
        slaCompliance: resolved.length > 0 
          ? Math.round((metSLA.length / resolved.length) * 100) 
          : 100
      };
      return acc;
    }, {});
  }

  // =====================================================
  // RESOLUTION
  // =====================================================

  /**
   * Resolve a case
   */
  async resolveCase(caseNumber, resolutionData) {
    try {
      const remediationCase = await RemediationCase.findOne({ caseNumber });
      if (!remediationCase) {
        throw new Error('Case not found');
      }
      
      await remediationCase.resolve(
        resolutionData.type,
        resolutionData.summary,
        resolutionData.resolvedBy
      );
      
      // Update vendor compliance profile
      await this.updateProfileOnResolution(remediationCase, resolutionData);
      
      // Lift any restrictions if applicable
      if (resolutionData.liftRestrictions) {
        await ComplianceOutputLayer.liftRestrictions(
          remediationCase.vendorId,
          resolutionData.liftRestrictions,
          {
            liftedBy: resolutionData.resolvedBy,
            reason: `Case ${caseNumber} resolved`
          }
        );
      }
      
      // Calculate metrics
      await remediationCase.calculateMetrics();
      
      return remediationCase;
    } catch (error) {
      console.error('Resolve case error:', error);
      throw error;
    }
  }

  async updateProfileOnResolution(remediationCase, resolutionData) {
    const profile = await VendorComplianceProfile.findOne({ 
      vendorId: remediationCase.vendorId 
    });
    
    if (profile) {
      await profile.addEvent({
        type: 'remediation_resolved',
        description: `Case ${remediationCase.caseNumber} resolved: ${resolutionData.summary}`,
        triggeredBy: resolutionData.resolvedBy,
        data: {
          caseNumber: remediationCase.caseNumber,
          resolutionType: resolutionData.type
        }
      });
    }
  }

  // =====================================================
  // HUMAN-IN-LOOP VALIDATION
  // =====================================================

  /**
   * Request human validation for automated decision
   */
  async requestValidation(validationData) {
    try {
      const {
        vendorId,
        decisionType,
        automatedDecision,
        confidence,
        context,
        requiredApprovers
      } = validationData;
      
      // Create validation case
      const validationCase = new RemediationCase({
        vendorId,
        type: 'human_validation',
        severity: confidence < 0.7 ? 'high' : 'medium',
        priority: 'high',
        description: `Human validation required for: ${decisionType}`,
        status: 'pending_review',
        actions: [{
          type: 'review',
          description: `Validate automated ${decisionType} decision`,
          assignedTo: requiredApprovers?.[0] || 'compliance_team',
          status: 'pending'
        }],
        history: [{
          action: 'validation_requested',
          performedBy: 'system',
          timestamp: new Date(),
          details: {
            decisionType,
            automatedDecision,
            confidence,
            context
          }
        }]
      });
      
      await validationCase.save();
      
      // Notify validators
      await ComplianceOutputLayer.sendAlert({
        vendorId,
        alertType: 'validation_required',
        severity: 'medium',
        title: `Validation Required: ${decisionType}`,
        message: `Automated decision requires human validation. Confidence: ${Math.round(confidence * 100)}%`,
        data: { caseNumber: validationCase.caseNumber, automatedDecision },
        recipients: requiredApprovers?.map(a => ({ email: `${a}@company.com` })) || []
      });
      
      return validationCase;
    } catch (error) {
      console.error('Request validation error:', error);
      throw error;
    }
  }

  /**
   * Submit validation decision
   */
  async submitValidation(caseNumber, validationDecision) {
    try {
      const validationCase = await RemediationCase.findOne({ caseNumber });
      if (!validationCase) {
        throw new Error('Validation case not found');
      }
      
      const { approved, decision, rationale, validatedBy } = validationDecision;
      
      validationCase.vendorResponse = {
        response: approved ? 'validated' : 'rejected',
        receivedAt: new Date(),
        content: rationale
      };
      
      validationCase.history.push({
        action: 'validation_submitted',
        performedBy: validatedBy,
        timestamp: new Date(),
        details: { approved, decision, rationale }
      });
      
      if (approved) {
        // Apply the validated decision
        await this.applyValidatedDecision(validationCase, decision);
        validationCase.status = 'resolved';
        validationCase.resolution = {
          type: 'validated',
          summary: `Decision validated: ${rationale}`,
          resolvedBy: validatedBy,
          resolvedAt: new Date()
        };
      } else {
        // Escalate for manual handling
        validationCase.status = 'escalated';
        await this.escalateCase(caseNumber, {
          reason: `Automated decision rejected: ${rationale}`,
          escalatedBy: validatedBy
        });
      }
      
      await validationCase.save();
      
      return validationCase;
    } catch (error) {
      console.error('Submit validation error:', error);
      throw error;
    }
  }

  async applyValidatedDecision(validationCase, decision) {
    const profile = await VendorComplianceProfile.findOne({ 
      vendorId: validationCase.vendorId 
    });
    
    if (profile) {
      await profile.addEvent({
        type: 'validated_decision_applied',
        description: `Validated decision applied: ${decision}`,
        triggeredBy: 'validation_workflow',
        data: { decision }
      });
    }
  }

  // =====================================================
  // VENDOR COMMUNICATION
  // =====================================================

  /**
   * Send remediation request to vendor
   */
  async sendVendorRemediationRequest(caseNumber, requestData) {
    try {
      const remediationCase = await RemediationCase.findOne({ caseNumber });
      if (!remediationCase) {
        throw new Error('Case not found');
      }
      
      await remediationCase.notifyVendor(
        'remediation_request',
        requestData.message,
        requestData.requiredActions,
        requestData.deadline
      );
      
      return remediationCase;
    } catch (error) {
      console.error('Send vendor request error:', error);
      throw error;
    }
  }

  /**
   * Record vendor response
   */
  async recordVendorResponse(caseNumber, responseData) {
    try {
      const remediationCase = await RemediationCase.findOne({ caseNumber });
      if (!remediationCase) {
        throw new Error('Case not found');
      }
      
      remediationCase.vendorResponse = {
        response: responseData.response,
        receivedAt: new Date(),
        content: responseData.content,
        attachments: responseData.attachments
      };
      
      remediationCase.communications.push({
        type: 'vendor_response',
        direction: 'inbound',
        sentAt: new Date(),
        content: responseData.content,
        attachments: responseData.attachments
      });
      
      remediationCase.history.push({
        action: 'vendor_responded',
        performedBy: 'vendor',
        timestamp: new Date(),
        details: responseData
      });
      
      await remediationCase.save();
      
      // Notify case owner
      await ComplianceOutputLayer.sendAlert({
        vendorId: remediationCase.vendorId,
        alertType: 'vendor_response_received',
        severity: 'low',
        title: `Vendor Response: Case ${caseNumber}`,
        message: `Vendor has responded to remediation request`,
        data: { caseNumber, responseType: responseData.response }
      });
      
      return remediationCase;
    } catch (error) {
      console.error('Record vendor response error:', error);
      throw error;
    }
  }

  // =====================================================
  // BATCH OPERATIONS
  // =====================================================

  /**
   * Process all pending workflows
   */
  async processPendingWorkflows() {
    try {
      // Check for SLA breaches
      await this.autoEscalateOverdueCases();
      
      // Send reminders for at-risk cases
      const atRiskCases = await this.getCasesAtRisk();
      for (const c of atRiskCases) {
        await ComplianceOutputLayer.sendAlert({
          vendorId: c.vendorId,
          alertType: 'sla_warning',
          severity: 'medium',
          title: `SLA Warning: Case ${c.caseNumber}`,
          message: `Case is at risk of SLA breach. Deadline: ${c.slaDeadline}`,
          recipients: [{ email: `${c.assignedTo}@company.com` }]
        });
      }
      
      // Check for stale cases (no activity in X days)
      const staleCases = await this.getStaleCases();
      for (const c of staleCases) {
        await this.escalateCase(c.caseNumber, {
          reason: 'No activity for extended period',
          escalatedBy: 'system'
        });
      }
      
      return {
        escalated: (await this.autoEscalateOverdueCases()).length,
        atRisk: atRiskCases.length,
        stale: staleCases.length
      };
    } catch (error) {
      console.error('Process workflows error:', error);
      throw error;
    }
  }

  async getStaleCases() {
    const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    return RemediationCase.find({
      status: { $in: ['open', 'in_progress'] },
      updatedAt: { $lt: staleThreshold }
    });
  }

  /**
   * Get workflow dashboard metrics
   */
  async getDashboardMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    const [openCases, atRiskCases, resolvedLast30, slaMetrics] = await Promise.all([
      RemediationCase.countDocuments({ status: { $nin: ['resolved', 'closed', 'cancelled'] } }),
      this.getCasesAtRisk(),
      RemediationCase.countDocuments({ 
        status: 'resolved', 
        'resolution.resolvedAt': { $gte: thirtyDaysAgo } 
      }),
      this.getSLAMetrics(thirtyDaysAgo, now)
    ]);
    
    return {
      openCases,
      atRiskCount: atRiskCases.length,
      resolvedLast30Days: resolvedLast30,
      slaCompliance: slaMetrics.slaCompliance,
      averageResolutionTime: slaMetrics.averageResolutionTime,
      byStatus: await this.getCasesByStatus(),
      bySeverity: slaMetrics.bySeverity
    };
  }

  async getCasesByStatus() {
    const statuses = ['open', 'in_progress', 'pending_review', 'escalated', 'resolved'];
    const counts = {};
    
    for (const status of statuses) {
      counts[status] = await RemediationCase.countDocuments({ status });
    }
    
    return counts;
  }
}

module.exports = new ComplianceWorkflowEngine();
