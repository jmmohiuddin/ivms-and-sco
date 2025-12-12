/**
 * Compliance Output Layer
 * Alert dispatch, contract enforcement, audit bundles, and external notifications
 */

const VendorComplianceProfile = require('../../models/VendorComplianceProfile');
const PolicyRule = require('../../models/PolicyRule');
const ComplianceEvent = require('../../models/ComplianceEvent');
const RemediationCase = require('../../models/RemediationCase');
const AuditBundle = require('../../models/AuditBundle');
const IntegrationConnector = require('../../models/IntegrationConnector');
const axios = require('axios');

class ComplianceOutputLayer {
  constructor() {
    this.ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
  }

  // =====================================================
  // ALERT DISPATCH
  // =====================================================

  /**
   * Send compliance alert through configured channels
   */
  async sendAlert(alertData) {
    try {
      const {
        vendorId,
        alertType,
        severity,
        title,
        message,
        data,
        recipients
      } = alertData;
      
      const channels = this.getAlertChannels(severity, recipients);
      const results = [];
      
      for (const channel of channels) {
        try {
          const result = await this.dispatchToChannel(channel, {
            alertType,
            severity,
            title,
            message,
            vendorId,
            data,
            timestamp: new Date()
          });
          results.push({ channel: channel.type, success: true, result });
        } catch (error) {
          results.push({ channel: channel.type, success: false, error: error.message });
        }
      }
      
      // Log alert dispatch
      if (vendorId) {
        const profile = await VendorComplianceProfile.findOne({ vendorId });
        if (profile) {
          await profile.addEvent({
            type: 'alert_dispatched',
            description: `Alert: ${title}`,
            triggeredBy: 'alert_system',
            severity,
            data: { alertType, channels: results }
          });
        }
      }
      
      return { dispatched: true, results };
    } catch (error) {
      console.error('Alert dispatch error:', error);
      throw error;
    }
  }

  /**
   * Get alert channels based on severity
   */
  getAlertChannels(severity, recipients = []) {
    const channels = [];
    
    // Always include in-app notification
    channels.push({ type: 'in_app', recipients });
    
    // Email for all severities
    channels.push({ type: 'email', recipients });
    
    // Slack/Teams for medium+ severity
    if (['medium', 'high', 'critical'].includes(severity)) {
      channels.push({ type: 'slack', channel: '#compliance-alerts' });
    }
    
    // SMS/Call for critical
    if (severity === 'critical') {
      channels.push({ type: 'sms', recipients: recipients.filter(r => r.phone) });
      channels.push({ type: 'pagerduty', service: 'compliance' });
    }
    
    return channels;
  }

  /**
   * Dispatch alert to specific channel
   */
  async dispatchToChannel(channel, alertPayload) {
    switch (channel.type) {
      case 'in_app':
        return this.sendInAppNotification(channel.recipients, alertPayload);
        
      case 'email':
        return this.sendEmailAlert(channel.recipients, alertPayload);
        
      case 'slack':
        return this.sendSlackAlert(channel.channel, alertPayload);
        
      case 'sms':
        return this.sendSMSAlert(channel.recipients, alertPayload);
        
      case 'pagerduty':
        return this.triggerPagerDuty(channel.service, alertPayload);
        
      default:
        console.warn(`Unknown alert channel: ${channel.type}`);
        return { sent: false, reason: 'Unknown channel' };
    }
  }

  async sendInAppNotification(recipients, payload) {
    // Store notification in database for in-app display
    // Implementation would use your notification system
    return { sent: true, notificationId: `NOTIF-${Date.now()}` };
  }

  async sendEmailAlert(recipients, payload) {
    // Implementation would use email service (SendGrid, SES, etc.)
    const emailData = {
      to: recipients.map(r => r.email || r),
      subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
      body: this.formatEmailBody(payload)
    };
    
    // Placeholder - would call actual email service
    console.log('Email alert:', emailData);
    return { sent: true, emailId: `EMAIL-${Date.now()}` };
  }

  formatEmailBody(payload) {
    return `
      Compliance Alert
      
      Severity: ${payload.severity}
      Type: ${payload.alertType}
      Time: ${payload.timestamp}
      
      ${payload.message}
      
      ${payload.data ? JSON.stringify(payload.data, null, 2) : ''}
    `;
  }

  async sendSlackAlert(channel, payload) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return { sent: false, reason: 'Slack webhook not configured' };
    }
    
    const severityEmoji = {
      low: ':information_source:',
      medium: ':warning:',
      high: ':exclamation:',
      critical: ':rotating_light:'
    };
    
    const slackMessage = {
      channel,
      attachments: [{
        color: this.getSeverityColor(payload.severity),
        title: `${severityEmoji[payload.severity] || ''} ${payload.title}`,
        text: payload.message,
        fields: [
          { title: 'Severity', value: payload.severity, short: true },
          { title: 'Type', value: payload.alertType, short: true }
        ],
        ts: Math.floor(payload.timestamp.getTime() / 1000)
      }]
    };
    
    try {
      await axios.post(webhookUrl, slackMessage);
      return { sent: true };
    } catch (error) {
      return { sent: false, error: error.message };
    }
  }

  getSeverityColor(severity) {
    const colors = {
      low: '#36a64f',
      medium: '#ff9800',
      high: '#f44336',
      critical: '#9c27b0'
    };
    return colors[severity] || '#808080';
  }

  async sendSMSAlert(recipients, payload) {
    // Implementation would use Twilio or similar
    return { sent: true, count: recipients.length };
  }

  async triggerPagerDuty(service, payload) {
    // Implementation would use PagerDuty API
    return { sent: true, incidentId: `INC-${Date.now()}` };
  }

  // =====================================================
  // CONTRACT ENFORCEMENT
  // =====================================================

  /**
   * Apply contract enforcement actions
   */
  async enforceContract(vendorId, enforcementData) {
    try {
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      if (!profile) {
        throw new Error('Vendor compliance profile not found');
      }
      
      const { action, reason, policyId, severity } = enforcementData;
      const enforcement = {
        action,
        reason,
        policyId,
        severity,
        appliedAt: new Date(),
        status: 'active'
      };
      
      // Apply enforcement based on action type
      switch (action) {
        case 'warning':
          await this.issueWarning(profile, enforcement);
          break;
          
        case 'hold_payments':
          await this.holdPayments(vendorId, enforcement);
          break;
          
        case 'block_orders':
          await this.blockNewOrders(vendorId, enforcement);
          break;
          
        case 'suspend':
          await this.suspendVendor(vendorId, enforcement);
          break;
          
        case 'terminate':
          await this.initiateTermination(vendorId, enforcement);
          break;
          
        case 'penalty':
          await this.applyPenalty(vendorId, enforcementData.penaltyAmount, enforcement);
          break;
      }
      
      // Record enforcement in history
      profile.enforcementHistory.push(enforcement);
      await profile.save();
      
      // Send notifications
      await this.sendAlert({
        vendorId,
        alertType: 'enforcement_action',
        severity: severity || 'high',
        title: `Contract Enforcement: ${action}`,
        message: reason,
        data: enforcement,
        recipients: await this.getComplianceTeam()
      });
      
      return enforcement;
    } catch (error) {
      console.error('Contract enforcement error:', error);
      throw error;
    }
  }

  async issueWarning(profile, enforcement) {
    profile.workflowStatus = {
      ...profile.workflowStatus,
      warnings: [...(profile.workflowStatus?.warnings || []), {
        issuedAt: new Date(),
        reason: enforcement.reason,
        policyId: enforcement.policyId
      }]
    };
  }

  async holdPayments(vendorId, enforcement) {
    // Call ERP or payment system to hold payments
    const connectors = await IntegrationConnector.getActiveByType('erp_system');
    
    for (const connector of connectors) {
      try {
        await axios.post(`${connector.connection.baseUrl}/vendors/${vendorId}/hold-payments`, {
          reason: enforcement.reason,
          holdUntil: enforcement.holdUntil
        }, {
          headers: this.getConnectorHeaders(connector)
        });
      } catch (error) {
        console.error(`Failed to hold payments via ${connector.name}:`, error.message);
      }
    }
    
    const profile = await VendorComplianceProfile.findOne({ vendorId });
    profile.workflowStatus.restrictions = profile.workflowStatus.restrictions || [];
    profile.workflowStatus.restrictions.push({
      type: 'hold_payments',
      appliedAt: new Date(),
      reason: enforcement.reason
    });
    await profile.save();
  }

  async blockNewOrders(vendorId, enforcement) {
    const profile = await VendorComplianceProfile.findOne({ vendorId });
    profile.workflowStatus.restrictions = profile.workflowStatus.restrictions || [];
    profile.workflowStatus.restrictions.push({
      type: 'block_new_orders',
      appliedAt: new Date(),
      reason: enforcement.reason
    });
    await profile.save();
    
    // Notify procurement systems
    await this.notifyProcurementSystems(vendorId, 'block', enforcement);
  }

  async suspendVendor(vendorId, enforcement) {
    const profile = await VendorComplianceProfile.findOne({ vendorId });
    profile.workflowStatus = {
      status: 'suspended',
      suspendedAt: new Date(),
      suspensionReason: enforcement.reason,
      restrictions: [
        { type: 'hold_payments', appliedAt: new Date() },
        { type: 'block_new_orders', appliedAt: new Date() },
        { type: 'suspended', appliedAt: new Date() }
      ]
    };
    await profile.save();
    
    // Notify all integrated systems
    await this.notifyAllSystems(vendorId, 'vendor_suspended', enforcement);
  }

  async initiateTermination(vendorId, enforcement) {
    const profile = await VendorComplianceProfile.findOne({ vendorId });
    profile.workflowStatus = {
      status: 'pending_termination',
      terminationInitiatedAt: new Date(),
      terminationReason: enforcement.reason,
      restrictions: [
        { type: 'hold_payments', appliedAt: new Date() },
        { type: 'block_new_orders', appliedAt: new Date() },
        { type: 'pending_termination', appliedAt: new Date() }
      ]
    };
    await profile.save();
    
    // Create termination workflow
    await this.createTerminationWorkflow(vendorId, enforcement);
  }

  async applyPenalty(vendorId, amount, enforcement) {
    // Record penalty in financial system
    const profile = await VendorComplianceProfile.findOne({ vendorId });
    profile.penalties = profile.penalties || [];
    profile.penalties.push({
      amount,
      currency: enforcement.currency || 'USD',
      reason: enforcement.reason,
      appliedAt: new Date(),
      status: 'pending'
    });
    await profile.save();
  }

  async notifyProcurementSystems(vendorId, action, enforcement) {
    // Notify ERP and procurement systems
    console.log(`Notifying procurement systems: ${action} for vendor ${vendorId}`);
  }

  async notifyAllSystems(vendorId, eventType, data) {
    const connectors = await IntegrationConnector.find({
      isActive: true,
      'webhookConfig.enabled': true
    });
    
    for (const connector of connectors) {
      try {
        if (connector.webhookConfig.events.includes(eventType)) {
          await this.sendWebhook(connector, { vendorId, eventType, data });
        }
      } catch (error) {
        console.error(`Failed to notify ${connector.name}:`, error.message);
      }
    }
  }

  async createTerminationWorkflow(vendorId, enforcement) {
    // Create remediation case for termination review
    const terminationCase = new RemediationCase({
      vendorId,
      type: 'termination_review',
      severity: 'critical',
      priority: 'urgent',
      description: `Contract termination initiated: ${enforcement.reason}`,
      actions: [
        { type: 'review', description: 'Review termination decision', status: 'pending' },
        { type: 'approval', description: 'Legal approval required', status: 'pending' },
        { type: 'notification', description: 'Notify vendor', status: 'pending' },
        { type: 'transition', description: 'Complete transition plan', status: 'pending' }
      ]
    });
    await terminationCase.save();
  }

  getConnectorHeaders(connector) {
    // Build headers based on connector auth configuration
    const headers = { ...connector.requestConfig.headers };
    
    if (connector.authentication.method === 'api_key') {
      const headerName = connector.authentication.headerName || 'X-API-Key';
      headers[headerName] = connector.getCredential('apiKey');
    }
    
    return headers;
  }

  async getComplianceTeam() {
    // Return compliance team members
    return [
      { email: 'compliance@company.com' },
      { email: 'risk@company.com' }
    ];
  }

  // =====================================================
  // LIFT RESTRICTIONS
  // =====================================================

  /**
   * Remove enforcement restrictions
   */
  async liftRestrictions(vendorId, restrictionTypes, liftData) {
    try {
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      if (!profile) {
        throw new Error('Vendor compliance profile not found');
      }
      
      const lifted = [];
      
      for (const type of restrictionTypes) {
        const restriction = profile.workflowStatus?.restrictions?.find(r => r.type === type);
        if (restriction) {
          restriction.liftedAt = new Date();
          restriction.liftedBy = liftData.liftedBy;
          restriction.liftReason = liftData.reason;
          lifted.push(type);
        }
      }
      
      // Update active restrictions
      profile.workflowStatus.restrictions = profile.workflowStatus.restrictions.filter(
        r => !r.liftedAt
      );
      
      // Update status if no more restrictions
      if (profile.workflowStatus.restrictions.length === 0) {
        profile.workflowStatus.status = 'active';
      }
      
      await profile.save();
      
      // Notify systems
      await this.notifyAllSystems(vendorId, 'restrictions_lifted', {
        lifted,
        reason: liftData.reason
      });
      
      // Record event
      await profile.addEvent({
        type: 'restrictions_lifted',
        description: `Restrictions lifted: ${lifted.join(', ')}`,
        triggeredBy: liftData.liftedBy,
        data: liftData
      });
      
      return { lifted };
    } catch (error) {
      console.error('Lift restrictions error:', error);
      throw error;
    }
  }

  // =====================================================
  // AUDIT BUNDLE GENERATION
  // =====================================================

  /**
   * Generate comprehensive audit bundle
   */
  async generateAuditBundle(vendorId, options = {}) {
    try {
      const profile = await VendorComplianceProfile.findOne({ vendorId })
        .populate('vendorId');
      
      if (!profile) {
        throw new Error('Vendor compliance profile not found');
      }
      
      // Create audit bundle
      const bundle = await AuditBundle.createVendorSnapshot(
        vendorId,
        profile,
        {
          vendorName: profile.vendorId?.name || profile.vendorId?.companyName,
          purpose: options.purpose || 'Compliance audit',
          from: options.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          to: options.to || new Date(),
          generatedBy: options.generatedBy,
          method: options.method || 'manual'
        }
      );
      
      // Add compliance events
      const events = await ComplianceEvent.find({
        vendorId,
        timestamp: { $gte: bundle.timeRange.from, $lte: bundle.timeRange.to }
      }).sort({ timestamp: -1 });
      
      bundle.events = events.map(e => ({
        eventId: e._id,
        eventType: e.eventType,
        occurredAt: e.timestamp,
        severity: e.severity,
        summary: `${e.eventType}: ${e.attributeAffected || 'N/A'}`,
        details: e.newValue
      }));
      
      // Add remediation cases
      const cases = await RemediationCase.find({
        vendorId,
        createdAt: { $gte: bundle.timeRange.from, $lte: bundle.timeRange.to }
      });
      
      bundle.remediationSummary = {
        totalCases: cases.length,
        resolvedCases: cases.filter(c => c.status === 'resolved').length,
        openCases: cases.filter(c => c.status !== 'resolved').length,
        averageResolutionTime: this.calculateAverageResolutionTime(cases),
        cases: cases.map(c => ({
          caseNumber: c.caseNumber,
          caseType: c.type,
          severity: c.severity,
          status: c.status,
          resolution: c.resolution?.summary,
          openedAt: c.createdAt,
          resolvedAt: c.resolution?.resolvedAt
        }))
      };
      
      // Add policy evaluations
      const policies = await PolicyRule.find({ isActive: true });
      bundle.policyEvaluations = profile.lastPolicyEvaluation?.results || [];
      
      // Add risk summary
      bundle.riskSummary = {
        overallRiskLevel: profile.tier,
        riskTrend: profile.compositeScore?.trend,
        keyRisks: profile.riskFactors?.map(f => ({
          riskType: f.factor,
          severity: this.mapScoreToSeverity(f.score),
          description: f.details,
          mitigationStatus: 'monitored'
        })) || []
      };
      
      // Seal the bundle
      bundle.status = 'complete';
      bundle.generation.artifactCount = bundle.artifacts.length;
      await bundle.save();
      
      return bundle;
    } catch (error) {
      console.error('Audit bundle generation error:', error);
      throw error;
    }
  }

  calculateAverageResolutionTime(cases) {
    const resolvedCases = cases.filter(c => c.resolution?.resolvedAt);
    if (resolvedCases.length === 0) return 0;
    
    const totalTime = resolvedCases.reduce((sum, c) => {
      return sum + (new Date(c.resolution.resolvedAt) - new Date(c.createdAt));
    }, 0);
    
    return Math.round(totalTime / resolvedCases.length / (1000 * 60 * 60)); // Hours
  }

  mapScoreToSeverity(score) {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  /**
   * Export audit bundle in specified format
   */
  async exportAuditBundle(bundleId, format = 'pdf') {
    try {
      const bundle = await AuditBundle.findOne({ bundleId });
      if (!bundle) {
        throw new Error('Audit bundle not found');
      }
      
      let exportResult;
      
      switch (format) {
        case 'pdf':
          exportResult = await this.exportToPDF(bundle);
          break;
        case 'json':
          exportResult = await this.exportToJSON(bundle);
          break;
        case 'zip':
          exportResult = await this.exportToZip(bundle);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      // Record export
      bundle.exports.push({
        exportId: `EXP-${Date.now()}`,
        format,
        exportedBy: exportResult.exportedBy,
        exportedAt: new Date(),
        destination: exportResult.destination,
        deliveryStatus: 'completed'
      });
      await bundle.save();
      
      return exportResult;
    } catch (error) {
      console.error('Audit bundle export error:', error);
      throw error;
    }
  }

  async exportToPDF(bundle) {
    // Implementation would use PDFKit or similar
    return {
      format: 'pdf',
      destination: `/exports/audit-bundles/${bundle.bundleId}.pdf`,
      size: 0
    };
  }

  async exportToJSON(bundle) {
    return {
      format: 'json',
      data: JSON.stringify(bundle.toObject(), null, 2),
      destination: `/exports/audit-bundles/${bundle.bundleId}.json`
    };
  }

  async exportToZip(bundle) {
    // Implementation would use archiver
    return {
      format: 'zip',
      destination: `/exports/audit-bundles/${bundle.bundleId}.zip`,
      size: 0
    };
  }

  // =====================================================
  // EXTERNAL NOTIFICATIONS / WEBHOOKS
  // =====================================================

  /**
   * Send webhook to external system
   */
  async sendWebhook(connector, payload) {
    try {
      const webhookUrl = connector.connection.baseUrl + (connector.webhookConfig.endpoint || '');
      
      // Sign payload
      const signature = this.signPayload(payload, connector.webhookConfig.secret);
      
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          [connector.webhookConfig.signatureHeader || 'X-Signature']: signature
        },
        timeout: connector.requestConfig.timeout || 30000
      });
      
      connector.recordRequest(true);
      await connector.save();
      
      return { sent: true, status: response.status };
    } catch (error) {
      connector.recordRequest(false);
      await connector.save();
      
      throw error;
    }
  }

  signPayload(payload, secret) {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret || '')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Notify ERP system of compliance status changes
   */
  async notifyERP(vendorId, eventType, data) {
    try {
      const connectors = await IntegrationConnector.getActiveByType('erp_system');
      const results = [];
      
      for (const connector of connectors) {
        try {
          const result = await axios.post(
            `${connector.connection.baseUrl}/compliance-events`,
            {
              vendorId,
              eventType,
              data,
              timestamp: new Date()
            },
            {
              headers: this.getConnectorHeaders(connector),
              timeout: connector.requestConfig.timeout
            }
          );
          
          connector.recordRequest(true);
          await connector.save();
          
          results.push({ connector: connector.name, success: true });
        } catch (error) {
          connector.recordRequest(false);
          await connector.save();
          
          results.push({ connector: connector.name, success: false, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      console.error('ERP notification error:', error);
      throw error;
    }
  }

  // =====================================================
  // REPORTING
  // =====================================================

  /**
   * Generate compliance summary report
   */
  async generateComplianceReport(options = {}) {
    try {
      const { startDate, endDate, groupBy } = options;
      
      const profiles = await VendorComplianceProfile.find({ isActive: true })
        .populate('vendorId');
      
      const events = await ComplianceEvent.find({
        timestamp: {
          $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate || new Date()
        }
      });
      
      const cases = await RemediationCase.find({
        createdAt: {
          $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate || new Date()
        }
      });
      
      const report = {
        generatedAt: new Date(),
        period: {
          from: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: endDate || new Date()
        },
        summary: {
          totalVendors: profiles.length,
          vendorsByTier: this.countByField(profiles, 'tier'),
          averageComplianceScore: this.calculateAverageScore(profiles),
          totalEvents: events.length,
          eventsByType: this.countByField(events, 'eventType'),
          eventsBySeverity: this.countByField(events, 'severity'),
          totalCases: cases.length,
          casesByStatus: this.countByField(cases, 'status'),
          casesBySeverity: this.countByField(cases, 'severity')
        },
        trends: await this.calculateTrends(profiles, events),
        topRisks: this.identifyTopRisks(profiles),
        recommendations: this.generateRecommendations(profiles, cases)
      };
      
      return report;
    } catch (error) {
      console.error('Report generation error:', error);
      throw error;
    }
  }

  countByField(items, field) {
    return items.reduce((acc, item) => {
      const value = item[field] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  calculateAverageScore(profiles) {
    const scores = profiles
      .filter(p => p.compositeScore?.value)
      .map(p => p.compositeScore.value);
    
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  async calculateTrends(profiles, events) {
    // Group events by week/day
    const eventsByDay = {};
    events.forEach(e => {
      const day = e.timestamp.toISOString().split('T')[0];
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;
    });
    
    return {
      eventTrend: Object.entries(eventsByDay).map(([date, count]) => ({ date, count })),
      scoreTrend: profiles.filter(p => p.compositeScore?.trend)
        .reduce((acc, p) => {
          acc[p.compositeScore.trend] = (acc[p.compositeScore.trend] || 0) + 1;
          return acc;
        }, {})
    };
  }

  identifyTopRisks(profiles) {
    const riskCounts = {};
    
    profiles.forEach(p => {
      (p.riskFactors || []).forEach(f => {
        if (f.score < 60) {
          riskCounts[f.factor] = (riskCounts[f.factor] || 0) + 1;
        }
      });
    });
    
    return Object.entries(riskCounts)
      .map(([risk, count]) => ({ risk, vendorCount: count }))
      .sort((a, b) => b.vendorCount - a.vendorCount)
      .slice(0, 10);
  }

  generateRecommendations(profiles, cases) {
    const recommendations = [];
    
    // Check for vendors with declining scores
    const declining = profiles.filter(p => p.compositeScore?.trend === 'declining');
    if (declining.length > 0) {
      recommendations.push({
        priority: 'high',
        recommendation: `Review ${declining.length} vendors with declining compliance scores`,
        action: 'Schedule compliance reviews'
      });
    }
    
    // Check for overdue remediation cases
    const overdue = cases.filter(c => 
      c.status !== 'resolved' && 
      c.slaDeadline && 
      new Date(c.slaDeadline) < new Date()
    );
    if (overdue.length > 0) {
      recommendations.push({
        priority: 'critical',
        recommendation: `${overdue.length} remediation cases are past SLA deadline`,
        action: 'Escalate overdue cases'
      });
    }
    
    // Check for expiring documents
    const expiringSoon = profiles.filter(p =>
      p.complianceAttributes?.some(a =>
        a.expiryDate && 
        new Date(a.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      )
    );
    if (expiringSoon.length > 0) {
      recommendations.push({
        priority: 'medium',
        recommendation: `${expiringSoon.length} vendors have documents expiring within 30 days`,
        action: 'Send renewal reminders'
      });
    }
    
    return recommendations;
  }
}

module.exports = new ComplianceOutputLayer();
