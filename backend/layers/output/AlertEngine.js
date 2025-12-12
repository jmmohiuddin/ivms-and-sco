/**
 * Alert Engine
 * 
 * Predictive alert generation and notification management:
 * - Real-time alerts
 * - Predictive alerts
 * - Alert prioritization
 * - Notification routing
 * - Alert escalation
 */

const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Contract = require('../../models/Contract');
const Compliance = require('../../models/Compliance');
const Certification = require('../../models/Certification');

class AlertEngine {
  constructor() {
    this.alertTypes = {
      INVOICE_OVERDUE: { priority: 'high', category: 'financial' },
      INVOICE_FRAUD_DETECTED: { priority: 'critical', category: 'fraud' },
      VENDOR_HIGH_RISK: { priority: 'high', category: 'risk' },
      VENDOR_SCORE_DECLINE: { priority: 'medium', category: 'performance' },
      CONTRACT_EXPIRING: { priority: 'medium', category: 'contract' },
      CONTRACT_RISK_CLAUSE: { priority: 'high', category: 'risk' },
      COMPLIANCE_VIOLATION: { priority: 'critical', category: 'compliance' },
      COMPLIANCE_EXPIRING: { priority: 'medium', category: 'compliance' },
      CERTIFICATION_EXPIRING: { priority: 'medium', category: 'compliance' },
      PAYMENT_ANOMALY: { priority: 'high', category: 'financial' },
      SPEND_THRESHOLD: { priority: 'medium', category: 'financial' },
      PERFORMANCE_DEGRADATION: { priority: 'medium', category: 'performance' }
    };

    this.thresholds = {
      vendorScoreDecline: 10,       // Alert if score drops by 10+ points
      contractExpiryDays: 30,       // Alert 30 days before expiry
      certificationExpiryDays: 30,  // Alert 30 days before expiry
      complianceReviewDays: 14,     // Alert 14 days before review
      spendThresholdPercent: 120,   // Alert if spend exceeds 120% of budget
      fraudRiskThreshold: 0.5       // Alert if fraud risk >= 50%
    };

    this.alerts = [];
  }

  /**
   * Run all alert checks
   */
  async runAlertChecks() {
    this.alerts = [];

    await Promise.all([
      this.checkOverdueInvoices(),
      this.checkFraudAlerts(),
      this.checkVendorRiskAlerts(),
      this.checkVendorScoreDeclines(),
      this.checkExpiringContracts(),
      this.checkComplianceViolations(),
      this.checkExpiringCertifications(),
      this.checkPaymentAnomalies()
    ]);

    // Sort by priority
    this.alerts.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return this.alerts;
  }

  /**
   * Check for overdue invoices
   */
  async checkOverdueInvoices() {
    const overdueInvoices = await Invoice.find({
      status: { $in: ['pending', 'submitted', 'approved'] },
      dueDate: { $lt: new Date() }
    }).populate('vendor', 'name');

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor(
        (Date.now() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)
      );

      this.addAlert({
        type: 'INVOICE_OVERDUE',
        title: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
        description: `Invoice from ${invoice.vendor?.name || 'Unknown Vendor'} totaling $${invoice.totalAmount?.toLocaleString()} is past due`,
        entityType: 'invoice',
        entityId: invoice._id,
        vendorId: invoice.vendor?._id,
        vendorName: invoice.vendor?.name,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          daysOverdue,
          dueDate: invoice.dueDate
        },
        actions: [
          { label: 'View Invoice', action: 'view_invoice', entityId: invoice._id },
          { label: 'Contact Vendor', action: 'contact_vendor', entityId: invoice.vendor?._id },
          { label: 'Escalate', action: 'escalate', entityId: invoice._id }
        ]
      });
    }
  }

  /**
   * Check for fraud alerts
   */
  async checkFraudAlerts() {
    const flaggedInvoices = await Invoice.find({
      'fraudDetection.riskScore': { $gte: this.thresholds.fraudRiskThreshold },
      status: { $nin: ['rejected', 'cancelled'] }
    }).populate('vendor', 'name');

    for (const invoice of flaggedInvoices) {
      const riskScore = invoice.fraudDetection?.riskScore || 0;
      const flags = invoice.fraudDetection?.flags || [];

      this.addAlert({
        type: 'INVOICE_FRAUD_DETECTED',
        title: `Potential fraud detected on invoice ${invoice.invoiceNumber}`,
        description: `Risk score: ${Math.round(riskScore * 100)}%. Flags: ${flags.map(f => f.type).join(', ')}`,
        entityType: 'invoice',
        entityId: invoice._id,
        vendorId: invoice.vendor?._id,
        vendorName: invoice.vendor?.name,
        priority: riskScore >= 0.7 ? 'critical' : 'high',
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          riskScore,
          flags
        },
        actions: [
          { label: 'Review Invoice', action: 'review_invoice', entityId: invoice._id },
          { label: 'Hold Payment', action: 'hold_payment', entityId: invoice._id },
          { label: 'Escalate to Fraud Team', action: 'escalate_fraud', entityId: invoice._id }
        ]
      });
    }
  }

  /**
   * Check for high-risk vendors
   */
  async checkVendorRiskAlerts() {
    const highRiskVendors = await Vendor.find({
      riskLevel: { $in: ['high', 'critical'] }
    });

    for (const vendor of highRiskVendors) {
      this.addAlert({
        type: 'VENDOR_HIGH_RISK',
        title: `High risk vendor: ${vendor.name}`,
        description: `Vendor is classified as ${vendor.riskLevel} risk with score of ${vendor.currentScore || 'N/A'}`,
        entityType: 'vendor',
        entityId: vendor._id,
        vendorId: vendor._id,
        vendorName: vendor.name,
        priority: vendor.riskLevel === 'critical' ? 'critical' : 'high',
        metadata: {
          riskLevel: vendor.riskLevel,
          score: vendor.currentScore,
          rating: vendor.rating
        },
        actions: [
          { label: 'Review Vendor', action: 'review_vendor', entityId: vendor._id },
          { label: 'View Risk Assessment', action: 'view_risk', entityId: vendor._id },
          { label: 'Suspend Vendor', action: 'suspend_vendor', entityId: vendor._id }
        ]
      });
    }
  }

  /**
   * Check for vendor score declines
   */
  async checkVendorScoreDeclines() {
    const vendors = await Vendor.find({
      scoreHistory: { $exists: true },
      'scoreHistory.1': { $exists: true }
    });

    for (const vendor of vendors) {
      const history = vendor.scoreHistory || [];
      if (history.length < 2) continue;

      const currentScore = history[history.length - 1]?.score || 0;
      const previousScore = history[history.length - 2]?.score || 0;
      const decline = previousScore - currentScore;

      if (decline >= this.thresholds.vendorScoreDecline) {
        this.addAlert({
          type: 'VENDOR_SCORE_DECLINE',
          title: `Score decline for vendor: ${vendor.name}`,
          description: `Vendor score dropped from ${previousScore} to ${currentScore} (${decline} point decline)`,
          entityType: 'vendor',
          entityId: vendor._id,
          vendorId: vendor._id,
          vendorName: vendor.name,
          metadata: {
            currentScore,
            previousScore,
            decline,
            rating: vendor.rating
          },
          actions: [
            { label: 'View Performance', action: 'view_performance', entityId: vendor._id },
            { label: 'Schedule Review', action: 'schedule_review', entityId: vendor._id }
          ]
        });
      }
    }
  }

  /**
   * Check for expiring contracts
   */
  async checkExpiringContracts() {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + this.thresholds.contractExpiryDays);

    const expiringContracts = await Contract.find({
      status: 'active',
      endDate: { $lte: thresholdDate, $gte: new Date() }
    }).populate('vendor', 'name');

    for (const contract of expiringContracts) {
      const daysUntilExpiry = Math.floor(
        (new Date(contract.endDate) - Date.now()) / (1000 * 60 * 60 * 24)
      );

      this.addAlert({
        type: 'CONTRACT_EXPIRING',
        title: `Contract "${contract.title}" expiring in ${daysUntilExpiry} days`,
        description: `Contract with ${contract.vendor?.name || 'Unknown'} worth $${contract.totalValue?.toLocaleString()} is expiring soon`,
        entityType: 'contract',
        entityId: contract._id,
        vendorId: contract.vendor?._id,
        vendorName: contract.vendor?.name,
        priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
        metadata: {
          contractTitle: contract.title,
          endDate: contract.endDate,
          daysUntilExpiry,
          totalValue: contract.totalValue,
          autoRenew: contract.autoRenew
        },
        actions: [
          { label: 'View Contract', action: 'view_contract', entityId: contract._id },
          { label: 'Initiate Renewal', action: 'renew_contract', entityId: contract._id },
          { label: 'Start RFP', action: 'start_rfp', entityId: contract._id }
        ]
      });
    }
  }

  /**
   * Check for compliance violations
   */
  async checkComplianceViolations() {
    const violations = await Compliance.find({
      status: { $in: ['non-compliant', 'expired'] }
    }).populate('vendor', 'name');

    for (const violation of violations) {
      this.addAlert({
        type: 'COMPLIANCE_VIOLATION',
        title: `Compliance violation: ${violation.requirementType}`,
        description: `${violation.vendor?.name || 'Unknown Vendor'} is ${violation.status} for ${violation.requirementType}`,
        entityType: 'compliance',
        entityId: violation._id,
        vendorId: violation.vendor?._id,
        vendorName: violation.vendor?.name,
        priority: 'critical',
        metadata: {
          requirementType: violation.requirementType,
          status: violation.status,
          framework: violation.framework,
          riskLevel: violation.riskLevel
        },
        actions: [
          { label: 'View Details', action: 'view_compliance', entityId: violation._id },
          { label: 'Create Action Plan', action: 'create_action_plan', entityId: violation._id },
          { label: 'Contact Vendor', action: 'contact_vendor', entityId: violation.vendor?._id }
        ]
      });
    }

    // Also check for upcoming reviews
    const reviewThreshold = new Date();
    reviewThreshold.setDate(reviewThreshold.getDate() + this.thresholds.complianceReviewDays);

    const upcomingReviews = await Compliance.find({
      status: 'compliant',
      nextReviewDate: { $lte: reviewThreshold, $gte: new Date() }
    }).populate('vendor', 'name');

    for (const compliance of upcomingReviews) {
      const daysUntilReview = Math.floor(
        (new Date(compliance.nextReviewDate) - Date.now()) / (1000 * 60 * 60 * 24)
      );

      this.addAlert({
        type: 'COMPLIANCE_EXPIRING',
        title: `Compliance review due in ${daysUntilReview} days`,
        description: `${compliance.requirementType} for ${compliance.vendor?.name} needs review`,
        entityType: 'compliance',
        entityId: compliance._id,
        vendorId: compliance.vendor?._id,
        vendorName: compliance.vendor?.name,
        priority: daysUntilReview <= 7 ? 'high' : 'medium',
        metadata: {
          requirementType: compliance.requirementType,
          nextReviewDate: compliance.nextReviewDate,
          daysUntilReview
        },
        actions: [
          { label: 'Schedule Review', action: 'schedule_review', entityId: compliance._id },
          { label: 'View Compliance', action: 'view_compliance', entityId: compliance._id }
        ]
      });
    }
  }

  /**
   * Check for expiring certifications
   */
  async checkExpiringCertifications() {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + this.thresholds.certificationExpiryDays);

    const expiringCerts = await Certification.find({
      status: 'valid',
      expiryDate: { $lte: thresholdDate, $gte: new Date() }
    }).populate('vendor', 'name');

    for (const cert of expiringCerts) {
      const daysUntilExpiry = Math.floor(
        (new Date(cert.expiryDate) - Date.now()) / (1000 * 60 * 60 * 24)
      );

      this.addAlert({
        type: 'CERTIFICATION_EXPIRING',
        title: `Certification "${cert.name}" expiring in ${daysUntilExpiry} days`,
        description: `${cert.type} certification for ${cert.vendor?.name} needs renewal`,
        entityType: 'certification',
        entityId: cert._id,
        vendorId: cert.vendor?._id,
        vendorName: cert.vendor?.name,
        priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
        metadata: {
          certName: cert.name,
          certType: cert.type,
          expiryDate: cert.expiryDate,
          daysUntilExpiry,
          issuingBody: cert.issuingBody
        },
        actions: [
          { label: 'Request Renewal', action: 'request_renewal', entityId: cert._id },
          { label: 'View Certificate', action: 'view_certificate', entityId: cert._id }
        ]
      });
    }
  }

  /**
   * Check for payment anomalies
   */
  async checkPaymentAnomalies() {
    // Get recent high-value payments
    const recentPayments = await Payment.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('vendor', 'name');

    // Group by vendor and check for anomalies
    const vendorPayments = {};
    for (const payment of recentPayments) {
      const vendorId = payment.vendor?._id?.toString() || 'unknown';
      if (!vendorPayments[vendorId]) {
        vendorPayments[vendorId] = {
          vendor: payment.vendor,
          payments: [],
          total: 0
        };
      }
      vendorPayments[vendorId].payments.push(payment);
      vendorPayments[vendorId].total += payment.amount || 0;
    }

    // Alert on unusual payment patterns
    for (const [vendorId, data] of Object.entries(vendorPayments)) {
      if (data.payments.length >= 3 && data.total > 100000) {
        this.addAlert({
          type: 'PAYMENT_ANOMALY',
          title: `Unusual payment activity for ${data.vendor?.name || 'Unknown Vendor'}`,
          description: `${data.payments.length} payments totaling $${data.total.toLocaleString()} in the last 7 days`,
          entityType: 'vendor',
          entityId: vendorId,
          vendorId: vendorId,
          vendorName: data.vendor?.name,
          metadata: {
            paymentCount: data.payments.length,
            totalAmount: data.total,
            period: '7 days'
          },
          actions: [
            { label: 'Review Payments', action: 'review_payments', entityId: vendorId },
            { label: 'View Vendor', action: 'view_vendor', entityId: vendorId }
          ]
        });
      }
    }
  }

  /**
   * Add alert to the list
   */
  addAlert(alertData) {
    const alertTypeConfig = this.alertTypes[alertData.type] || {};
    
    this.alerts.push({
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertData.type,
      priority: alertData.priority || alertTypeConfig.priority || 'medium',
      category: alertTypeConfig.category || 'general',
      title: alertData.title,
      description: alertData.description,
      entityType: alertData.entityType,
      entityId: alertData.entityId,
      vendorId: alertData.vendorId,
      vendorName: alertData.vendorName,
      metadata: alertData.metadata || {},
      actions: alertData.actions || [],
      createdAt: new Date(),
      status: 'active',
      acknowledged: false
    });
  }

  /**
   * Get alerts by priority
   */
  getAlertsByPriority(priority) {
    return this.alerts.filter(a => a.priority === priority);
  }

  /**
   * Get alerts by category
   */
  getAlertsByCategory(category) {
    return this.alerts.filter(a => a.category === category);
  }

  /**
   * Get alerts for specific vendor
   */
  getVendorAlerts(vendorId) {
    return this.alerts.filter(a => a.vendorId?.toString() === vendorId.toString());
  }

  /**
   * Get alert summary
   */
  getAlertSummary() {
    return {
      total: this.alerts.length,
      byPriority: {
        critical: this.alerts.filter(a => a.priority === 'critical').length,
        high: this.alerts.filter(a => a.priority === 'high').length,
        medium: this.alerts.filter(a => a.priority === 'medium').length,
        low: this.alerts.filter(a => a.priority === 'low').length
      },
      byCategory: {
        financial: this.alerts.filter(a => a.category === 'financial').length,
        fraud: this.alerts.filter(a => a.category === 'fraud').length,
        risk: this.alerts.filter(a => a.category === 'risk').length,
        compliance: this.alerts.filter(a => a.category === 'compliance').length,
        contract: this.alerts.filter(a => a.category === 'contract').length,
        performance: this.alerts.filter(a => a.category === 'performance').length
      },
      acknowledged: this.alerts.filter(a => a.acknowledged).length,
      active: this.alerts.filter(a => !a.acknowledged).length
    };
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
    }
    return alert;
  }

  /**
   * Dismiss alert
   */
  dismissAlert(alertId, reason) {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      const dismissed = this.alerts.splice(index, 1)[0];
      dismissed.status = 'dismissed';
      dismissed.dismissReason = reason;
      dismissed.dismissedAt = new Date();
      return dismissed;
    }
    return null;
  }
}

module.exports = new AlertEngine();
