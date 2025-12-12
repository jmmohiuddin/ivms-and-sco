/**
 * Onboarding Output Layer
 * Handles approvals, notifications, audit trails, evidence bundles, and SLA tracking
 */

const OnboardingCase = require('../../models/OnboardingCase');
const VendorProfile = require('../../models/VendorProfile');
const ApprovalRecord = require('../../models/ApprovalRecord');
const EvidenceBundle = require('../../models/EvidenceBundle');
const OnboardingDocument = require('../../models/OnboardingDocument');
const Contact = require('../../models/Contact');
const RiskScore = require('../../models/RiskScore');
const Vendor = require('../../models/Vendor');

class OnboardingOutput {
  constructor() {
    // Approval matrix by risk tier
    this.approvalMatrix = {
      low: [
        { role: 'system', required: true, order: 1 } // Auto-approve eligible
      ],
      medium: [
        { role: 'procurement_manager', required: true, order: 1 }
      ],
      high: [
        { role: 'procurement_manager', required: true, order: 1 },
        { role: 'compliance_officer', required: true, order: 2 }
      ],
      critical: [
        { role: 'compliance_officer', required: true, order: 1 },
        { role: 'finance_director', required: true, order: 2 },
        { role: 'legal_counsel', required: false, order: 3 }
      ]
    };

    // Notification templates
    this.notificationTemplates = {
      invite_sent: {
        subject: 'Invitation to Register as a Vendor',
        template: 'vendor_invite'
      },
      documents_requested: {
        subject: 'Additional Documents Required',
        template: 'documents_requested'
      },
      approved: {
        subject: 'Vendor Registration Approved',
        template: 'vendor_approved'
      },
      rejected: {
        subject: 'Vendor Registration Decision',
        template: 'vendor_rejected'
      },
      sla_warning: {
        subject: 'Onboarding SLA Warning',
        template: 'sla_warning'
      }
    };
  }

  /**
   * Process approval workflow
   */
  async processApproval(caseId, approverId, decision, reason, conditions = []) {
    try {
      const onboardingCase = await OnboardingCase.findById(caseId)
        .populate('vendorProfile')
        .populate('riskScores');

      if (!onboardingCase) {
        throw new Error('Onboarding case not found');
      }

      // Find current approval in matrix
      const currentApproval = onboardingCase.approvalMatrix.find(
        a => a.status === 'pending' && a.userId?.toString() === approverId
      );

      if (!currentApproval && decision !== 'auto_approve') {
        throw new Error('No pending approval found for this user');
      }

      // Get latest risk score
      const latestRiskScore = onboardingCase.riskScores?.length > 0
        ? onboardingCase.riskScores[onboardingCase.riskScores.length - 1]
        : null;

      // Create approval record
      const approvalRecord = new ApprovalRecord({
        onboardingCase: caseId,
        vendorProfile: onboardingCase.vendorProfile._id,
        approvalType: this.determineApprovalType(onboardingCase),
        approver: approverId,
        approverRole: currentApproval?.role,
        decision,
        reason,
        conditions: conditions.map(c => ({ condition: c, met: false })),
        riskScoreAtDecision: latestRiskScore?._id,
        riskTierAtDecision: onboardingCase.riskTier,
        requestedAt: currentApproval?.createdAt || new Date(),
        decidedAt: new Date(),
        isAutomated: decision === 'auto_approve',
        attestation: {
          attested: true,
          attestedAt: new Date(),
          attestationText: 'I have reviewed the vendor information and approve this decision.'
        }
      });

      await approvalRecord.save();

      // Update approval matrix
      if (currentApproval) {
        currentApproval.status = decision === 'approved' || decision === 'conditional' 
          ? 'approved' 
          : 'rejected';
        currentApproval.decidedAt = new Date();
        currentApproval.comments = reason;
      }

      // Check if all required approvals are complete
      const allApproved = onboardingCase.approvalMatrix
        .filter(a => a.required)
        .every(a => a.status === 'approved');

      const anyRejected = onboardingCase.approvalMatrix
        .some(a => a.status === 'rejected');

      if (anyRejected) {
        await this.rejectOnboarding(onboardingCase, approverId, reason);
      } else if (allApproved) {
        await this.completeOnboarding(onboardingCase, approverId, conditions);
      } else {
        // Move to next approver
        const nextPendingApproval = onboardingCase.approvalMatrix
          .find(a => a.status === 'pending');
        
        if (nextPendingApproval) {
          onboardingCase.status = 'pending_approval';
          // Would send notification to next approver here
        }
      }

      onboardingCase.addHistory(
        decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'returned_for_info',
        `${decision} by approver: ${reason}`,
        approverId,
        'user'
      );

      await onboardingCase.save();

      return {
        success: true,
        approvalRecord,
        caseStatus: onboardingCase.status
      };
    } catch (error) {
      console.error('Approval processing error:', error);
      throw error;
    }
  }

  /**
   * Auto-approve eligible cases
   */
  async processAutoApproval(caseId) {
    const onboardingCase = await OnboardingCase.findById(caseId)
      .populate('vendorProfile')
      .populate('riskScores');

    if (!onboardingCase) {
      throw new Error('Onboarding case not found');
    }

    if (!onboardingCase.autoApprovalEligible) {
      throw new Error('Case not eligible for auto-approval');
    }

    // Verify all checks passed
    const sanctions = onboardingCase.verificationResults?.sanctions?.status === 'clear';
    const documentsValid = onboardingCase.requiredDocuments
      .filter(d => d.required)
      .every(d => d.uploaded);

    if (!sanctions || !documentsValid) {
      throw new Error('Auto-approval criteria not met');
    }

    // Create auto-approval record
    const approvalRecord = new ApprovalRecord({
      onboardingCase: caseId,
      vendorProfile: onboardingCase.vendorProfile,
      approvalType: 'final_approval',
      approver: null, // System approval
      decision: 'approved',
      reason: 'Auto-approved: Low risk score and all verifications passed',
      requestedAt: new Date(),
      decidedAt: new Date(),
      isAutomated: true,
      automationRule: 'low_risk_auto_approve'
    });

    await approvalRecord.save();

    // Complete onboarding
    await this.completeOnboarding(onboardingCase, null, []);

    onboardingCase.addHistory(
      'auto_approved',
      'Case auto-approved based on risk score and verification results',
      null,
      'system'
    );

    await onboardingCase.save();

    return {
      success: true,
      approvalRecord,
      caseStatus: onboardingCase.status
    };
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(onboardingCase, approverId, conditions) {
    // Update case status
    onboardingCase.status = conditions?.length > 0 ? 'approved' : 'approved';
    onboardingCase.completedAt = new Date();
    onboardingCase.finalDecision = {
      decision: conditions?.length > 0 ? 'conditional' : 'approved',
      decidedBy: approverId,
      decidedAt: new Date(),
      conditions: conditions || []
    };

    // Update vendor profile
    const vendorProfile = await VendorProfile.findById(onboardingCase.vendorProfile);
    vendorProfile.status = 'approved';
    vendorProfile.onboardedAt = new Date();
    vendorProfile.onboardedBy = approverId;
    await vendorProfile.save();

    // Update contact status
    await Contact.updateMany(
      { vendorProfile: vendorProfile._id },
      { status: 'active' }
    );

    // Create Vendor record for main vendor list
    try {
      const primaryContact = await Contact.findOne({ 
        vendorProfile: vendorProfile._id, 
        isPrimary: true 
      });

      // Check if vendor already exists
      const existingVendor = await Vendor.findOne({ 
        email: vendorProfile.businessEmail || primaryContact?.email 
      });

      if (!existingVendor) {
        const newVendor = new Vendor({
          name: vendorProfile.legalName || vendorProfile.businessName,
          email: vendorProfile.businessEmail || primaryContact?.email || `vendor@${vendorProfile.legalName?.toLowerCase().replace(/\\s+/g, '')}.com`,
          phone: vendorProfile.businessPhone || primaryContact?.phone || 'N/A',
          address: {
            street: vendorProfile.businessAddress?.street,
            city: vendorProfile.businessAddress?.city,
            state: vendorProfile.businessAddress?.state,
            zipCode: vendorProfile.businessAddress?.zipCode,
            country: vendorProfile.country || 'USA'
          },
          category: this.mapIndustryToCategory(vendorProfile.industry),
          status: 'active',
          rating: 0,
          performanceScore: 50,
          contactPerson: primaryContact ? {
            name: `${primaryContact.firstName} ${primaryContact.lastName}`,
            email: primaryContact.email,
            phone: primaryContact.phone,
            position: primaryContact.role
          } : undefined,
          createdBy: approverId
        });

        await newVendor.save();
        console.log(`Vendor created: ${newVendor.name} (${newVendor._id})`);
      }
    } catch (error) {
      console.error('Error creating Vendor record:', error);
      // Don't fail the onboarding if vendor creation fails
    }

    // Generate evidence bundle
    const evidenceBundle = await this.generateEvidenceBundle(onboardingCase._id);
    onboardingCase.evidenceBundle = evidenceBundle._id;

    // Complete final task
    const approvalTask = onboardingCase.tasks.find(t => t.type === 'approval');
    if (approvalTask) {
      approvalTask.status = 'completed';
      approvalTask.completedAt = new Date();
      approvalTask.completedBy = approverId;
    }

    await onboardingCase.save();

    // Send approval notification
    await this.sendNotification(onboardingCase._id, 'approved');

    return onboardingCase;
  }

  /**
   * Map industry to vendor category
   */
  mapIndustryToCategory(industry) {
    const mapping = {
      'manufacturing': 'raw-materials',
      'technology': 'technology',
      'logistics': 'logistics',
      'services': 'services',
      'packaging': 'packaging'
    };
    return mapping[industry?.toLowerCase()] || 'other';
  }

  /**
   * Reject onboarding
   */
  async rejectOnboarding(onboardingCase, rejectedBy, reason) {
    onboardingCase.status = 'rejected';
    onboardingCase.completedAt = new Date();
    onboardingCase.finalDecision = {
      decision: 'rejected',
      decidedBy: rejectedBy,
      decidedAt: new Date(),
      reason
    };

    // Update vendor profile
    const vendorProfile = await VendorProfile.findById(onboardingCase.vendorProfile);
    vendorProfile.status = 'rejected';
    await vendorProfile.save();

    await onboardingCase.save();

    // Send rejection notification
    await this.sendNotification(onboardingCase._id, 'rejected');

    return onboardingCase;
  }

  /**
   * Generate evidence bundle
   */
  async generateEvidenceBundle(caseId) {
    try {
      const onboardingCase = await OnboardingCase.findById(caseId)
        .populate('vendorProfile')
        .populate('documents')
        .populate('riskScores');

      if (!onboardingCase) {
        throw new Error('Onboarding case not found');
      }

      const vendorProfile = onboardingCase.vendorProfile;
      const contacts = await Contact.find({ vendorProfile: vendorProfile._id });
      const approvals = await ApprovalRecord.find({ onboardingCase: caseId });
      const documents = await OnboardingDocument.find({ onboardingCase: caseId });

      // Create evidence bundle
      const evidenceBundle = new EvidenceBundle({
        onboardingCase: caseId,
        vendorProfile: vendorProfile._id,
        bundleType: 'onboarding_complete',
        
        vendorDataSnapshot: {
          legalName: vendorProfile.legalName,
          dbaName: vendorProfile.dbaName,
          registrationNumber: vendorProfile.registrationNumber,
          addresses: vendorProfile.addresses,
          taxIds: vendorProfile.taxIds,
          bankAccounts: vendorProfile.bankAccounts,
          classifications: vendorProfile.classifications,
          contacts: contacts.map(c => ({
            name: c.fullName,
            email: c.email,
            role: c.role,
            kycStatus: c.kycStatus
          })),
          snapshotAt: new Date()
        },

        documents: documents.map(doc => ({
          documentId: doc._id,
          documentType: doc.documentType,
          originalFileName: doc.originalFileName,
          fileHash: doc.fileHash,
          verificationStatus: doc.verificationStatus,
          extractedDataSnapshot: doc.extractedData,
          includedAt: new Date()
        })),

        riskAssessment: onboardingCase.riskScores?.length > 0 ? {
          riskScoreId: onboardingCase.riskScores[onboardingCase.riskScores.length - 1]._id,
          overallScore: onboardingCase.riskScores[onboardingCase.riskScores.length - 1].overallScore,
          riskTier: onboardingCase.riskTier,
          assessedAt: new Date()
        } : null,

        verificationResults: onboardingCase.verificationResults,

        approvals: approvals.map(a => ({
          approvalId: a._id,
          approvalType: a.approvalType,
          approver: a.approver?.toString(),
          approverRole: a.approverRole,
          decision: a.decision,
          reason: a.reason,
          decidedAt: a.decidedAt
        })),

        timeline: onboardingCase.history.map(h => ({
          action: h.action,
          description: h.description,
          performedBy: h.performedBy?.toString(),
          performedByType: h.performedByType,
          timestamp: h.timestamp,
          metadata: h.metadata
        })),

        finalDecision: onboardingCase.finalDecision,

        status: 'complete',
        retentionPolicy: 'standard',
        retainUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years
      });

      await evidenceBundle.save();

      return evidenceBundle;
    } catch (error) {
      console.error('Evidence bundle generation error:', error);
      throw error;
    }
  }

  /**
   * Export evidence bundle as PDF
   */
  async exportEvidenceBundle(bundleId, format = 'pdf') {
    const evidenceBundle = await EvidenceBundle.findById(bundleId);
    if (!evidenceBundle) {
      throw new Error('Evidence bundle not found');
    }

    // In production, would generate actual PDF
    // For now, return the bundle data
    const exportData = {
      bundleNumber: evidenceBundle.bundleNumber,
      vendorName: evidenceBundle.vendorDataSnapshot.legalName,
      exportedAt: new Date(),
      format,
      data: evidenceBundle.toJSON()
    };

    // Log access
    evidenceBundle.logAccess(null, 'downloaded', null, null);
    await evidenceBundle.save();

    return exportData;
  }

  /**
   * Send notification
   */
  async sendNotification(caseId, notificationType, additionalData = {}) {
    const onboardingCase = await OnboardingCase.findById(caseId)
      .populate('vendorProfile');

    if (!onboardingCase) return;

    const contact = await Contact.findOne({ 
      vendorProfile: onboardingCase.vendorProfile._id,
      isPrimaryContact: true 
    });

    if (!contact) return;

    const template = this.notificationTemplates[notificationType];
    if (!template) return;

    // In production, would send actual email
    console.log(`[NOTIFICATION] Sending ${notificationType} to ${contact.email}`);
    console.log(`Subject: ${template.subject}`);
    console.log(`Data:`, {
      vendorName: onboardingCase.vendorProfile.legalName,
      caseNumber: onboardingCase.caseNumber,
      ...additionalData
    });

    // Log notification in case
    onboardingCase.vendorMessages.push({
      message: `${template.subject} notification sent`,
      sentByType: 'system',
      sentAt: new Date()
    });

    await onboardingCase.save();

    return true;
  }

  /**
   * Check and update SLA status for all active cases
   */
  async checkSLAStatus() {
    const activeCases = await OnboardingCase.find({
      status: { $nin: ['approved', 'rejected', 'cancelled', 'expired'] },
      'sla.breached': false
    });

    const results = {
      checked: activeCases.length,
      warnings: 0,
      breaches: 0
    };

    for (const onboardingCase of activeCases) {
      const slaStatus = onboardingCase.checkSlaStatus();

      if (slaStatus === 'breached' && !onboardingCase.sla.breached) {
        onboardingCase.sla.breached = true;
        onboardingCase.addHistory(
          'sla_breach',
          'SLA breach: Target completion date exceeded',
          null,
          'system'
        );
        results.breaches++;
        
        // Send breach notification to assigned user
        // await this.sendInternalNotification(onboardingCase.assignedTo, 'sla_breach', onboardingCase);
      } else if (slaStatus === 'warning') {
        onboardingCase.addHistory(
          'sla_warning',
          'SLA warning: Approaching target completion date',
          null,
          'system'
        );
        results.warnings++;
        
        // Send warning notification
        await this.sendNotification(onboardingCase._id, 'sla_warning');
      }

      await onboardingCase.save();
    }

    return results;
  }

  /**
   * Get onboarding queue for reviewers
   */
  async getReviewQueue(filters = {}) {
    const query = {
      status: { $in: ['submitted', 'in_review', 'pending_approval'] }
    };

    if (filters.riskTier) {
      query.riskTier = filters.riskTier;
    }

    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }

    const cases = await OnboardingCase.find(query)
      .populate('vendorProfile', 'legalName primaryCategory riskTier')
      .populate('assignedTo', 'name email')
      .sort({ 
        riskTier: -1, // Critical first
        'sla.targetCompletionDate': 1 // Earliest deadline first
      })
      .limit(filters.limit || 50);

    return cases.map(c => ({
      caseId: c._id,
      caseNumber: c.caseNumber,
      vendorName: c.vendorProfile?.legalName,
      category: c.vendorProfile?.primaryCategory,
      riskTier: c.riskTier,
      status: c.status,
      progress: c.progressPercentage,
      daysInStatus: c.daysInStatus,
      slaStatus: c.checkSlaStatus(),
      targetDate: c.sla?.targetCompletionDate,
      assignedTo: c.assignedTo?.name
    }));
  }

  /**
   * Get onboarding analytics
   */
  async getOnboardingAnalytics(dateRange = {}) {
    const startDate = dateRange.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange.end || new Date();

    const [
      totalCases,
      completedCases,
      rejectedCases,
      averageTime,
      byStatus,
      byRiskTier,
      autoApprovals
    ] = await Promise.all([
      OnboardingCase.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      OnboardingCase.countDocuments({ 
        status: 'approved',
        completedAt: { $gte: startDate, $lte: endDate }
      }),
      OnboardingCase.countDocuments({
        status: 'rejected',
        completedAt: { $gte: startDate, $lte: endDate }
      }),
      this.calculateAverageOnboardingTime(startDate, endDate),
      OnboardingCase.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      OnboardingCase.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$riskTier', count: { $sum: 1 } } }
      ]),
      ApprovalRecord.countDocuments({
        isAutomated: true,
        createdAt: { $gte: startDate, $lte: endDate }
      })
    ]);

    return {
      summary: {
        totalCases,
        completedCases,
        rejectedCases,
        pendingCases: totalCases - completedCases - rejectedCases,
        approvalRate: totalCases > 0 ? ((completedCases / (completedCases + rejectedCases)) * 100).toFixed(1) : 0,
        autoApprovalRate: completedCases > 0 ? ((autoApprovals / completedCases) * 100).toFixed(1) : 0
      },
      timing: {
        averageOnboardingDays: averageTime,
        targetDays: 3
      },
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      byRiskTier: byRiskTier.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
      dateRange: { start: startDate, end: endDate }
    };
  }

  /**
   * Calculate average onboarding time
   */
  async calculateAverageOnboardingTime(startDate, endDate) {
    const completedCases = await OnboardingCase.find({
      status: 'approved',
      submittedAt: { $exists: true },
      completedAt: { $gte: startDate, $lte: endDate }
    });

    if (completedCases.length === 0) return 0;

    const totalDays = completedCases.reduce((sum, c) => {
      const days = (c.completedAt - c.submittedAt) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return (totalDays / completedCases.length).toFixed(1);
  }

  /**
   * Determine approval type
   */
  determineApprovalType(onboardingCase) {
    const pendingApprovals = onboardingCase.approvalMatrix.filter(a => a.status === 'pending');
    
    if (pendingApprovals.length === 1) {
      return 'final_approval';
    }
    
    return 'initial_review';
  }

  /**
   * Setup approval matrix for case
   */
  async setupApprovalMatrix(caseId) {
    const onboardingCase = await OnboardingCase.findById(caseId);
    if (!onboardingCase) {
      throw new Error('Onboarding case not found');
    }

    const matrix = this.approvalMatrix[onboardingCase.riskTier] || this.approvalMatrix.medium;
    
    onboardingCase.approvalMatrix = matrix.map(m => ({
      role: m.role,
      required: m.required,
      order: m.order,
      status: 'pending'
    }));

    await onboardingCase.save();
    return onboardingCase.approvalMatrix;
  }
}

module.exports = new OnboardingOutput();
