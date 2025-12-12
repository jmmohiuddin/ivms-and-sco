/**
 * Onboarding Controller
 * Handles all onboarding-related HTTP requests
 */

const OnboardingIntake = require('../layers/onboarding/OnboardingIntake');
const OnboardingIntelligent = require('../layers/onboarding/OnboardingIntelligent');
const OnboardingOutput = require('../layers/onboarding/OnboardingOutput');
const OnboardingCase = require('../models/OnboardingCase');
const OnboardingDocument = require('../models/OnboardingDocument');
const VendorProfile = require('../models/VendorProfile');
const RiskScore = require('../models/RiskScore');
const ApprovalRecord = require('../models/ApprovalRecord');
const EvidenceBundle = require('../models/EvidenceBundle');
const Contact = require('../models/Contact');
const Vendor = require('../models/Vendor');
const crypto = require('crypto');

// ============================================
// INTAKE CONTROLLERS
// ============================================

/**
 * Create onboarding from self-service portal
 * POST /api/onboarding/portal or POST /api/onboarding/vendor
 */
exports.createFromPortal = async (req, res) => {
  try {
    const vendorData = req.body.vendorData || req.body;
    
    // Extract contact info from vendorData or contactData
    const contactName = vendorData.contactName || '';
    const nameParts = contactName.split(' ');
    
    const contactData = req.body.contactData || {
      firstName: vendorData.contactFirstName || vendorData.firstName || nameParts[0] || 'Contact',
      lastName: vendorData.contactLastName || vendorData.lastName || nameParts.slice(1).join(' ') || 'Person',
      email: vendorData.contactEmail || vendorData.email || `contact@${vendorData.legalName?.toLowerCase().replace(/\s+/g, '') || 'vendor'}.com`,
      phone: vendorData.contactPhone || vendorData.phone || '+1-000-000-0000'
    };
    
    // OnboardingIntake is exported as a singleton instance
    const result = await OnboardingIntake.createFromSelfService(vendorData, contactData);
    
    // For demo purposes, also create a Vendor record immediately
    // In production, this would happen after approval workflow
    try {
      const existingVendor = await Vendor.findOne({ 
        email: contactData.email 
      });

      if (!existingVendor) {
        const industryToCategory = {
          'manufacturing': 'raw-materials',
          'technology': 'technology',
          'logistics': 'logistics',
          'services': 'services',
          'packaging': 'packaging'
        };

        const newVendor = new Vendor({
          name: vendorData.legalName || vendorData.businessName || 'Vendor',
          email: contactData.email,
          phone: contactData.phone,
          address: {
            street: vendorData.address || '',
            city: vendorData.city || '',
            state: vendorData.state || '',
            zipCode: vendorData.zip || '',
            country: vendorData.country || 'USA'
          },
          category: industryToCategory[vendorData.industry?.toLowerCase()] || 'other',
          status: 'active',
          rating: 0,
          performanceScore: 50,
          contactPerson: {
            name: `${contactData.firstName} ${contactData.lastName}`,
            email: contactData.email,
            phone: contactData.phone,
            position: 'Primary Contact'
          }
        });

        await newVendor.save();
        console.log(`Vendor created from portal: ${newVendor.name} (${newVendor._id})`);
      }
    } catch (vendorError) {
      console.error('Error creating vendor record:', vendorError);
      // Don't fail the onboarding submission
    }
    
    res.status(201).json({
      success: true,
      message: 'Onboarding case created successfully',
      data: result
    });
  } catch (error) {
    console.error('Portal onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create onboarding case',
      error: error.message
    });
  }
};

/**
 * Create onboarding from invite
 * POST /api/onboarding/invite
 */
exports.createFromInvite = async (req, res) => {
  try {
    const { inviteToken, vendorData } = req.body;
    
    const result = await OnboardingIntake.createFromInvite(inviteToken, vendorData);
    
    res.status(201).json({
      success: true,
      message: 'Onboarding case created from invite',
      data: result
    });
  } catch (error) {
    console.error('Invite onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process invite',
      error: error.message
    });
  }
};

/**
 * Create onboarding from bulk upload
 * POST /api/onboarding/bulk
 */
exports.createFromBulk = async (req, res) => {
  try {
    const csvData = req.file; // Uploaded CSV file
    const uploadedBy = req.user.id;
    
    const result = await OnboardingIntake.createFromBulkUpload(csvData, uploadedBy);
    
    res.status(201).json({
      success: true,
      message: 'Bulk onboarding initiated',
      data: result
    });
  } catch (error) {
    console.error('Bulk onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
};

/**
 * Create onboarding from email (webhook)
 * POST /api/onboarding/email
 */
exports.createFromEmail = async (req, res) => {
  try {
    const emailData = req.body;
    
    const result = await OnboardingIntake.createFromEmail(emailData);
    
    res.status(201).json({
      success: true,
      message: 'Onboarding case created from email',
      data: result
    });
  } catch (error) {
    console.error('Email onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process email',
      error: error.message
    });
  }
};

/**
 * Get dynamic form configuration
 * GET /api/onboarding/form-config
 */
exports.getDynamicFormConfig = async (req, res) => {
  try {
    const { vendorType, country, riskProfile } = req.query;
    
    const config = await OnboardingIntake.getDynamicFormConfig(vendorType, country, riskProfile);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Form config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get form configuration',
      error: error.message
    });
  }
};

/**
 * Send vendor invitation
 * POST /api/onboarding/invite/send
 */
exports.sendVendorInvite = async (req, res) => {
  try {
    const { email, vendorName, vendorType, message } = req.body;
    const invitedBy = req.user.id;
    
    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Would store invite and send email in production
    console.log(`[INVITE] Sending invite to ${email} for ${vendorName}`);
    
    res.json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        email,
        vendorName,
        inviteToken: inviteToken.substring(0, 8) + '...', // Partial for security
        expiresAt: inviteExpiry
      }
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitation',
      error: error.message
    });
  }
};

// ============================================
// CASE MANAGEMENT CONTROLLERS
// ============================================

/**
 * Get all onboarding cases
 * GET /api/onboarding/cases
 */
exports.getAllCases = async (req, res) => {
  try {
    const { status, riskTier, assignedTo, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (riskTier) query.riskTier = riskTier;
    if (assignedTo) query.assignedTo = assignedTo;
    
    const cases = await OnboardingCase.find(query)
      .populate('vendorProfile', 'legalName dbaName primaryCategory')
      .populate('assignedTo', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await OnboardingCase.countDocuments(query);
    
    res.json({
      success: true,
      data: cases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cases',
      error: error.message
    });
  }
};

/**
 * Get single case by ID
 * GET /api/onboarding/cases/:id
 */
exports.getCaseById = async (req, res) => {
  try {
    const onboardingCase = await OnboardingCase.findById(req.params.id)
      .populate('vendorProfile')
      .populate('documents')
      .populate('riskScores')
      .populate('assignedTo', 'name email')
      .populate('approvals');
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    // Get associated contacts
    const contacts = await Contact.find({ vendorProfile: onboardingCase.vendorProfile._id });
    
    res.json({
      success: true,
      data: {
        ...onboardingCase.toJSON(),
        contacts
      }
    });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get case',
      error: error.message
    });
  }
};

/**
 * Update onboarding case
 * PUT /api/onboarding/cases/:id
 */
exports.updateCase = async (req, res) => {
  try {
    const allowedUpdates = ['notes', 'internalComments', 'tags', 'tasks'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    const onboardingCase = await OnboardingCase.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).populate('vendorProfile');
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Case updated successfully',
      data: onboardingCase
    });
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update case',
      error: error.message
    });
  }
};

/**
 * Submit case for review
 * POST /api/onboarding/cases/:id/submit
 */
exports.submitCase = async (req, res) => {
  try {
    const onboardingCase = await OnboardingCase.findById(req.params.id);
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    // Validate required documents
    const requiredDocs = onboardingCase.requiredDocuments.filter(d => d.required && !d.uploaded);
    if (requiredDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required documents',
        missingDocuments: requiredDocs.map(d => d.documentType)
      });
    }
    
    onboardingCase.status = 'submitted';
    onboardingCase.submittedAt = new Date();
    onboardingCase.addHistory('submitted', 'Case submitted for review', req.user?.id, 'user');
    
    await onboardingCase.save();
    
    // Trigger AI processing
    await OnboardingIntelligent.processCase(onboardingCase._id);
    
    res.json({
      success: true,
      message: 'Case submitted successfully',
      data: onboardingCase
    });
  } catch (error) {
    console.error('Submit case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit case',
      error: error.message
    });
  }
};

/**
 * Assign case to reviewer
 * POST /api/onboarding/cases/:id/assign
 */
exports.assignCase = async (req, res) => {
  try {
    const { assigneeId, notes } = req.body;
    
    const onboardingCase = await OnboardingCase.findById(req.params.id);
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    onboardingCase.assignedTo = assigneeId;
    onboardingCase.addHistory('assigned', `Case assigned: ${notes || 'No notes'}`, req.user.id, 'user');
    
    await onboardingCase.save();
    
    res.json({
      success: true,
      message: 'Case assigned successfully',
      data: onboardingCase
    });
  } catch (error) {
    console.error('Assign case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign case',
      error: error.message
    });
  }
};

/**
 * Get case timeline
 * GET /api/onboarding/cases/:id/timeline
 */
exports.getCaseTimeline = async (req, res) => {
  try {
    const onboardingCase = await OnboardingCase.findById(req.params.id)
      .select('history')
      .populate('history.performedBy', 'name email');
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    res.json({
      success: true,
      data: onboardingCase.history
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get timeline',
      error: error.message
    });
  }
};

/**
 * Add message to case
 * POST /api/onboarding/cases/:id/message
 */
exports.addCaseMessage = async (req, res) => {
  try {
    const { message } = req.body;
    
    const onboardingCase = await OnboardingCase.findById(req.params.id);
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    onboardingCase.vendorMessages.push({
      message,
      sentBy: req.user.id,
      sentByType: 'internal',
      sentAt: new Date()
    });
    
    await onboardingCase.save();
    
    res.json({
      success: true,
      message: 'Message added successfully'
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

// ============================================
// DOCUMENT CONTROLLERS
// ============================================

/**
 * Upload document
 * POST /api/onboarding/cases/:caseId/documents
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { documentType, documentCategory } = req.body;
    const file = req.file;
    
    const onboardingCase = await OnboardingCase.findById(caseId);
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    // Create document record
    const document = new OnboardingDocument({
      onboardingCase: caseId,
      vendorProfile: onboardingCase.vendorProfile,
      documentType,
      documentCategory: documentCategory || 'other',
      originalFileName: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: req.user?.id,
      uploadSource: 'portal'
    });
    
    await document.save();
    
    // Update case required documents
    const requiredDoc = onboardingCase.requiredDocuments.find(d => d.documentType === documentType);
    if (requiredDoc) {
      requiredDoc.uploaded = true;
      requiredDoc.documentId = document._id;
    }
    
    onboardingCase.documents.push(document._id);
    onboardingCase.addHistory('document_uploaded', `Document uploaded: ${documentType}`, req.user?.id, 'user');
    
    await onboardingCase.save();
    
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
};

/**
 * Get documents for case
 * GET /api/onboarding/cases/:caseId/documents
 */
exports.getCaseDocuments = async (req, res) => {
  try {
    const documents = await OnboardingDocument.find({ onboardingCase: req.params.caseId })
      .sort('-createdAt');
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents',
      error: error.message
    });
  }
};

/**
 * Get single document
 * GET /api/onboarding/documents/:id
 */
exports.getDocumentById = async (req, res) => {
  try {
    const document = await OnboardingDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document',
      error: error.message
    });
  }
};

/**
 * Process document (OCR + extraction)
 * POST /api/onboarding/documents/:id/process
 */
exports.processDocument = async (req, res) => {
  try {
    const document = await OnboardingDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    const extractedData = await OnboardingIntelligent.extractDocumentData(document);
    
    res.json({
      success: true,
      message: 'Document processed successfully',
      data: extractedData
    });
  } catch (error) {
    console.error('Process document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process document',
      error: error.message
    });
  }
};

/**
 * Verify document manually
 * POST /api/onboarding/documents/:id/verify
 */
exports.verifyDocument = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const document = await OnboardingDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    document.verificationStatus = status;
    document.verification = {
      ...document.verification,
      method: 'manual',
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
      notes
    };
    
    await document.save();
    
    res.json({
      success: true,
      message: 'Document verified',
      data: document
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify document',
      error: error.message
    });
  }
};

/**
 * Update extracted data
 * PUT /api/onboarding/documents/:id/extracted-data
 */
exports.updateExtractedData = async (req, res) => {
  try {
    const { extractedData, fieldUpdates } = req.body;
    
    const document = await OnboardingDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Update specific fields
    if (fieldUpdates) {
      fieldUpdates.forEach(update => {
        const field = document.extractedFields.find(f => f.fieldName === update.fieldName);
        if (field) {
          field.extractedValue = update.newValue;
          field.wasManuallyEdited = true;
          field.editedBy = req.user.id;
          field.editedAt = new Date();
        }
      });
    }
    
    // Or replace all extracted data
    if (extractedData) {
      document.extractedData = extractedData;
    }
    
    document.processingStatus = 'manually_corrected';
    await document.save();
    
    res.json({
      success: true,
      message: 'Extracted data updated',
      data: document
    });
  } catch (error) {
    console.error('Update extracted data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update extracted data',
      error: error.message
    });
  }
};

// ============================================
// AI/ML PROCESSING CONTROLLERS
// ============================================

/**
 * Process case (full AI pipeline)
 * POST /api/onboarding/cases/:id/process
 */
exports.processCase = async (req, res) => {
  try {
    const result = await OnboardingIntelligent.processCase(req.params.id);
    
    res.json({
      success: true,
      message: 'Case processing completed',
      data: result
    });
  } catch (error) {
    console.error('Process case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process case',
      error: error.message
    });
  }
};

/**
 * Analyze contract
 * POST /api/onboarding/cases/:id/analyze-contract
 */
exports.analyzeContract = async (req, res) => {
  try {
    const { documentId } = req.body;
    
    const contractDoc = await OnboardingDocument.findById(documentId);
    if (!contractDoc) {
      return res.status(404).json({
        success: false,
        message: 'Contract document not found'
      });
    }
    
    const analysis = await OnboardingIntelligent.analyzeContract(req.params.id, contractDoc);
    
    res.json({
      success: true,
      message: 'Contract analysis completed',
      data: analysis
    });
  } catch (error) {
    console.error('Analyze contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze contract',
      error: error.message
    });
  }
};

/**
 * Run sanctions check
 * POST /api/onboarding/cases/:id/sanctions-check
 */
exports.runSanctionsCheck = async (req, res) => {
  try {
    const result = await OnboardingIntelligent.performSanctionsCheck(req.params.id);
    
    res.json({
      success: true,
      message: 'Sanctions check completed',
      data: result
    });
  } catch (error) {
    console.error('Sanctions check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run sanctions check',
      error: error.message
    });
  }
};

/**
 * Get risk score
 * GET /api/onboarding/cases/:id/risk
 */
exports.getCaseRiskScore = async (req, res) => {
  try {
    const riskScores = await RiskScore.find({ onboardingCase: req.params.id })
      .sort('-createdAt')
      .limit(1);
    
    if (riskScores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No risk score found'
      });
    }
    
    res.json({
      success: true,
      data: riskScores[0]
    });
  } catch (error) {
    console.error('Get risk score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get risk score',
      error: error.message
    });
  }
};

/**
 * Calculate risk score
 * POST /api/onboarding/cases/:id/risk/calculate
 */
exports.calculateRiskScore = async (req, res) => {
  try {
    const riskScore = await OnboardingIntelligent.calculateRiskScore(req.params.id);
    
    res.json({
      success: true,
      message: 'Risk score calculated',
      data: riskScore
    });
  } catch (error) {
    console.error('Calculate risk score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate risk score',
      error: error.message
    });
  }
};

/**
 * Run fraud check
 * POST /api/onboarding/cases/:id/fraud-check
 */
exports.runFraudCheck = async (req, res) => {
  try {
    const documents = await OnboardingDocument.find({ onboardingCase: req.params.id });
    const result = await OnboardingIntelligent.detectFraud(req.params.id, documents);
    
    res.json({
      success: true,
      message: 'Fraud check completed',
      data: result
    });
  } catch (error) {
    console.error('Fraud check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run fraud check',
      error: error.message
    });
  }
};

// ============================================
// APPROVAL CONTROLLERS
// ============================================

/**
 * Approve case
 * POST /api/onboarding/cases/:id/approve
 */
exports.approveCase = async (req, res) => {
  try {
    const { reason, conditions } = req.body;
    
    const result = await OnboardingOutput.processApproval(
      req.params.id,
      req.user.id,
      'approved',
      reason,
      conditions
    );
    
    res.json({
      success: true,
      message: 'Case approved',
      data: result
    });
  } catch (error) {
    console.error('Approve case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve case',
      error: error.message
    });
  }
};

/**
 * Reject case
 * POST /api/onboarding/cases/:id/reject
 */
exports.rejectCase = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const result = await OnboardingOutput.processApproval(
      req.params.id,
      req.user.id,
      'rejected',
      reason
    );
    
    res.json({
      success: true,
      message: 'Case rejected',
      data: result
    });
  } catch (error) {
    console.error('Reject case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject case',
      error: error.message
    });
  }
};

/**
 * Request additional information
 * POST /api/onboarding/cases/:id/request-info
 */
exports.requestInfo = async (req, res) => {
  try {
    const { requestedItems, message } = req.body;
    
    const onboardingCase = await OnboardingCase.findById(req.params.id);
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    onboardingCase.status = 'pending_info';
    onboardingCase.addHistory(
      'returned_for_info',
      `Additional information requested: ${message}`,
      req.user.id,
      'user'
    );
    
    // Add requested items as tasks
    requestedItems.forEach(item => {
      onboardingCase.tasks.push({
        type: 'additional_document',
        title: item.title,
        description: item.description,
        status: 'pending',
        dueDate: item.dueDate
      });
    });
    
    await onboardingCase.save();
    
    // Send notification to vendor
    await OnboardingOutput.sendNotification(req.params.id, 'documents_requested', { requestedItems });
    
    res.json({
      success: true,
      message: 'Information request sent'
    });
  } catch (error) {
    console.error('Request info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request information',
      error: error.message
    });
  }
};

/**
 * Escalate case
 * POST /api/onboarding/cases/:id/escalate
 */
exports.escalateCase = async (req, res) => {
  try {
    const { reason, escalateTo } = req.body;
    
    const onboardingCase = await OnboardingCase.findById(req.params.id);
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    onboardingCase.status = 'escalated';
    onboardingCase.assignedTo = escalateTo;
    onboardingCase.addHistory(
      'escalated',
      `Case escalated: ${reason}`,
      req.user.id,
      'user'
    );
    
    await onboardingCase.save();
    
    res.json({
      success: true,
      message: 'Case escalated'
    });
  } catch (error) {
    console.error('Escalate case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate case',
      error: error.message
    });
  }
};

/**
 * Get case approvals
 * GET /api/onboarding/cases/:id/approvals
 */
exports.getCaseApprovals = async (req, res) => {
  try {
    const approvals = await ApprovalRecord.find({ onboardingCase: req.params.id })
      .populate('approver', 'name email')
      .sort('createdAt');
    
    res.json({
      success: true,
      data: approvals
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get approvals',
      error: error.message
    });
  }
};

// ============================================
// EVIDENCE & AUDIT CONTROLLERS
// ============================================

/**
 * Generate evidence bundle
 * POST /api/onboarding/cases/:id/evidence-bundle
 */
exports.generateEvidenceBundle = async (req, res) => {
  try {
    const evidenceBundle = await OnboardingOutput.generateEvidenceBundle(req.params.id);
    
    res.json({
      success: true,
      message: 'Evidence bundle generated',
      data: evidenceBundle
    });
  } catch (error) {
    console.error('Generate evidence bundle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate evidence bundle',
      error: error.message
    });
  }
};

/**
 * Get evidence bundle
 * GET /api/onboarding/evidence/:bundleId
 */
exports.getEvidenceBundle = async (req, res) => {
  try {
    const evidenceBundle = await EvidenceBundle.findById(req.params.bundleId);
    
    if (!evidenceBundle) {
      return res.status(404).json({
        success: false,
        message: 'Evidence bundle not found'
      });
    }
    
    // Log access
    evidenceBundle.logAccess(req.user.id, 'viewed', null, null);
    await evidenceBundle.save();
    
    res.json({
      success: true,
      data: evidenceBundle
    });
  } catch (error) {
    console.error('Get evidence bundle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get evidence bundle',
      error: error.message
    });
  }
};

/**
 * Export evidence bundle
 * GET /api/onboarding/evidence/:bundleId/export
 */
exports.exportEvidenceBundle = async (req, res) => {
  try {
    const format = req.query.format || 'pdf';
    
    const exportData = await OnboardingOutput.exportEvidenceBundle(req.params.bundleId, format);
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Export evidence bundle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export evidence bundle',
      error: error.message
    });
  }
};

/**
 * Get audit trail
 * GET /api/onboarding/cases/:id/audit-trail
 */
exports.getAuditTrail = async (req, res) => {
  try {
    const onboardingCase = await OnboardingCase.findById(req.params.id)
      .populate('history.performedBy', 'name email');
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    // Get all related records for complete audit trail
    const approvals = await ApprovalRecord.find({ onboardingCase: req.params.id });
    const documents = await OnboardingDocument.find({ onboardingCase: req.params.id });
    
    res.json({
      success: true,
      data: {
        caseHistory: onboardingCase.history,
        approvals,
        documents: documents.map(d => ({
          id: d._id,
          type: d.documentType,
          uploadedAt: d.createdAt,
          processingStatus: d.processingStatus,
          verificationStatus: d.verificationStatus
        }))
      }
    });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit trail',
      error: error.message
    });
  }
};

// ============================================
// QUEUE CONTROLLERS
// ============================================

/**
 * Get review queue
 * GET /api/onboarding/queue
 */
exports.getReviewQueue = async (req, res) => {
  try {
    const queue = await OnboardingOutput.getReviewQueue(req.query);
    
    res.json({
      success: true,
      data: queue
    });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue',
      error: error.message
    });
  }
};

/**
 * Get my queue
 * GET /api/onboarding/my-queue
 */
exports.getMyQueue = async (req, res) => {
  try {
    const queue = await OnboardingOutput.getReviewQueue({
      ...req.query,
      assignedTo: req.user.id
    });
    
    res.json({
      success: true,
      data: queue
    });
  } catch (error) {
    console.error('Get my queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue',
      error: error.message
    });
  }
};

/**
 * Claim case
 * POST /api/onboarding/queue/claim/:id
 */
exports.claimCase = async (req, res) => {
  try {
    const onboardingCase = await OnboardingCase.findById(req.params.id);
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    if (onboardingCase.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Case already assigned'
      });
    }
    
    onboardingCase.assignedTo = req.user.id;
    onboardingCase.addHistory('claimed', 'Case claimed from queue', req.user.id, 'user');
    
    await onboardingCase.save();
    
    res.json({
      success: true,
      message: 'Case claimed successfully'
    });
  } catch (error) {
    console.error('Claim case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim case',
      error: error.message
    });
  }
};

// ============================================
// ANALYTICS CONTROLLERS
// ============================================

/**
 * Get onboarding analytics
 * GET /api/onboarding/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const analytics = await OnboardingOutput.getOnboardingAnalytics({
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined
    });
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
};

/**
 * Get SLA report
 * GET /api/onboarding/sla-report
 */
exports.getSLAReport = async (req, res) => {
  try {
    const slaResults = await OnboardingOutput.checkSLAStatus();
    
    // Get SLA metrics
    const totalActive = await OnboardingCase.countDocuments({
      status: { $nin: ['approved', 'rejected', 'cancelled'] }
    });
    
    const breached = await OnboardingCase.countDocuments({
      'sla.breached': true,
      status: { $nin: ['approved', 'rejected', 'cancelled'] }
    });
    
    res.json({
      success: true,
      data: {
        totalActiveCases: totalActive,
        breachedCases: breached,
        complianceRate: totalActive > 0 ? (((totalActive - breached) / totalActive) * 100).toFixed(1) : 100,
        checkResults: slaResults
      }
    });
  } catch (error) {
    console.error('Get SLA report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SLA report',
      error: error.message
    });
  }
};

/**
 * Get vendor onboarding status (public facing)
 * GET /api/onboarding/vendor-status/:vendorId
 */
exports.getVendorStatus = async (req, res) => {
  try {
    const onboardingCase = await OnboardingCase.findOne({
      vendorProfile: req.params.vendorId
    }).select('caseNumber status progressPercentage submittedAt requiredDocuments');
    
    if (!onboardingCase) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding case not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        caseNumber: onboardingCase.caseNumber,
        status: onboardingCase.status,
        progress: onboardingCase.progressPercentage,
        submittedAt: onboardingCase.submittedAt,
        pendingDocuments: onboardingCase.requiredDocuments
          .filter(d => d.required && !d.uploaded)
          .map(d => d.documentType)
      }
    });
  } catch (error) {
    console.error('Get vendor status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vendor status',
      error: error.message
    });
  }
};

// ============================================
// WEBHOOK CONTROLLERS
// ============================================

/**
 * Webhook: Document verified externally
 * POST /api/onboarding/webhooks/document-verified
 */
exports.webhookDocumentVerified = async (req, res) => {
  try {
    const { documentId, verificationResult, verificationProvider } = req.body;
    
    const document = await OnboardingDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    document.verificationStatus = verificationResult.status;
    document.verification = {
      method: 'external',
      provider: verificationProvider,
      verifiedAt: new Date(),
      externalResults: verificationResult
    };
    
    await document.save();
    
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook document verified error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Webhook: Sanctions check result
 * POST /api/onboarding/webhooks/sanctions-result
 */
exports.webhookSanctionsResult = async (req, res) => {
  try {
    const { caseId, sanctionsResult } = req.body;
    
    const onboardingCase = await OnboardingCase.findById(caseId);
    
    if (!onboardingCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    onboardingCase.verificationResults.sanctions = {
      status: sanctionsResult.status,
      checkedAt: new Date(),
      matches: sanctionsResult.matches,
      provider: sanctionsResult.provider
    };
    
    onboardingCase.addHistory(
      'verification_completed',
      `Sanctions check completed: ${sanctionsResult.status}`,
      null,
      'system'
    );
    
    await onboardingCase.save();
    
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook sanctions result error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
