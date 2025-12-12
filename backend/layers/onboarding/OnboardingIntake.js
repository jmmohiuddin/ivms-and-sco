/**
 * Onboarding Intake Service
 * Handles smart intake, multi-channel captures, and dynamic form generation
 */

const VendorProfile = require('../../models/VendorProfile');
const Contact = require('../../models/Contact');
const OnboardingCase = require('../../models/OnboardingCase');
const crypto = require('crypto');

class OnboardingIntake {
  constructor() {
    // Default SLA settings (in days)
    this.slaSettings = {
      low: 3,
      medium: 5,
      high: 7,
      critical: 10
    };

    // Required documents by vendor type
    this.requiredDocuments = {
      corporation: [
        { type: 'business_registration', name: 'Certificate of Incorporation', required: true },
        { type: 'w9', name: 'W-9 Form', required: true },
        { type: 'bank_statement', name: 'Bank Statement or Voided Check', required: true },
        { type: 'insurance_certificate', name: 'Certificate of Insurance', required: false }
      ],
      llc: [
        { type: 'business_registration', name: 'Articles of Organization', required: true },
        { type: 'operating_agreement', name: 'Operating Agreement', required: false },
        { type: 'w9', name: 'W-9 Form', required: true },
        { type: 'bank_statement', name: 'Bank Statement or Voided Check', required: true }
      ],
      sole_proprietorship: [
        { type: 'business_registration', name: 'Business License', required: true },
        { type: 'w9', name: 'W-9 Form', required: true },
        { type: 'government_id', name: 'Government-Issued ID', required: true },
        { type: 'bank_statement', name: 'Bank Statement or Voided Check', required: true }
      ],
      partnership: [
        { type: 'partnership_agreement', name: 'Partnership Agreement', required: true },
        { type: 'business_registration', name: 'Business Registration', required: true },
        { type: 'w9', name: 'W-9 Form', required: true },
        { type: 'bank_statement', name: 'Bank Statement or Voided Check', required: true }
      ],
      international: [
        { type: 'business_registration', name: 'Business Registration', required: true },
        { type: 'w8ben', name: 'W-8BEN or W-8BEN-E Form', required: true },
        { type: 'bank_letter', name: 'Bank Verification Letter', required: true },
        { type: 'tax_registration', name: 'Tax Registration Certificate', required: true }
      ]
    };

    // Dynamic form fields by category
    this.dynamicFields = {
      'IT Services': ['cybersecurity_certification', 'data_processing_agreement', 'soc2_report'],
      'Construction': ['contractors_license', 'bonding_certificate', 'safety_certification'],
      'Healthcare': ['hipaa_compliance', 'medical_license', 'malpractice_insurance'],
      'Financial Services': ['finra_registration', 'state_license', 'fidelity_bond'],
      'Manufacturing': ['quality_certification', 'environmental_permit', 'product_liability_insurance']
    };
  }

  /**
   * Create a new onboarding case from self-service portal
   */
  async createFromSelfService(vendorData, contactData, createdBy = null) {
    try {
      // Create vendor profile
      const vendorProfile = new VendorProfile({
        legalName: vendorData.legalName,
        dbaName: vendorData.dbaName,
        registrationNumber: vendorData.registrationNumber,
        businessType: vendorData.businessType,
        incorporationCountry: vendorData.country || 'US',
        addresses: vendorData.addresses || [],
        taxIds: vendorData.taxIds || [],
        primaryCategory: vendorData.primaryCategory,
        classifications: vendorData.classifications || [],
        status: 'pending',
        source: 'self_service',
        createdBy
      });

      await vendorProfile.save();

      // Create primary contact
      const contact = new Contact({
        vendorProfile: vendorProfile._id,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        title: contactData.title,
        role: 'primary',
        isPrimaryContact: true,
        status: 'pending_verification',
        createdBy
      });

      await contact.save();

      // Create onboarding case
      const onboardingCase = await this.createOnboardingCase(
        vendorProfile,
        'self_service',
        createdBy
      );

      // Link onboarding case to vendor profile
      vendorProfile.onboardingCase = onboardingCase._id;
      await vendorProfile.save();

      return {
        success: true,
        vendorProfile,
        contact,
        onboardingCase
      };
    } catch (error) {
      console.error('Self-service onboarding error:', error);
      throw error;
    }
  }

  /**
   * Create onboarding case via invite
   */
  async createFromInvite(inviteData, invitedBy) {
    try {
      // Generate invite token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create minimal vendor profile
      const vendorProfile = new VendorProfile({
        legalName: inviteData.vendorName || 'Pending',
        status: 'draft',
        source: 'self_service',
        primaryCategory: inviteData.category,
        createdBy: invitedBy
      });

      await vendorProfile.save();

      // Create pending contact
      const contact = new Contact({
        vendorProfile: vendorProfile._id,
        firstName: inviteData.contactFirstName || 'Pending',
        lastName: inviteData.contactLastName || 'Pending',
        email: inviteData.contactEmail,
        role: 'primary',
        isPrimaryContact: true,
        status: 'pending_verification',
        createdBy: invitedBy
      });

      await contact.save();

      // Create onboarding case with invite
      const onboardingCase = new OnboardingCase({
        vendorProfile: vendorProfile._id,
        type: 'new_vendor',
        source: 'invite',
        invitedBy,
        inviteToken,
        inviteExpiresAt,
        status: 'pending_submission',
        createdBy: invitedBy
      });

      // Set up required documents based on expected type
      onboardingCase.requiredDocuments = this.getRequiredDocuments(
        inviteData.businessType || 'corporation',
        inviteData.country || 'US',
        inviteData.category
      );

      // Set up tasks
      onboardingCase.tasks = this.generateTasks(inviteData.businessType, inviteData.riskLevel);

      // Set SLA
      this.setSLA(onboardingCase, inviteData.riskLevel || 'medium');

      await onboardingCase.save();

      // Add history entry
      onboardingCase.addHistory(
        'created',
        `Onboarding invite sent to ${inviteData.contactEmail}`,
        invitedBy,
        'user',
        { inviteToken, expiresAt: inviteExpiresAt }
      );

      await onboardingCase.save();

      return {
        success: true,
        vendorProfile,
        contact,
        onboardingCase,
        inviteToken,
        inviteUrl: `/onboarding/invite/${inviteToken}`
      };
    } catch (error) {
      console.error('Invite onboarding error:', error);
      throw error;
    }
  }

  /**
   * Process bulk upload from CSV
   */
  async processBulkUpload(vendors, uploadedBy) {
    const results = {
      success: [],
      failed: [],
      total: vendors.length
    };

    for (const vendorData of vendors) {
      try {
        const result = await this.createFromInvite({
          vendorName: vendorData.legal_name || vendorData.legalName,
          contactEmail: vendorData.contact_email || vendorData.email,
          contactFirstName: vendorData.contact_first_name || vendorData.firstName,
          contactLastName: vendorData.contact_last_name || vendorData.lastName,
          businessType: vendorData.business_type || vendorData.businessType || 'corporation',
          country: vendorData.country || 'US',
          category: vendorData.category || vendorData.primaryCategory
        }, uploadedBy);

        results.success.push({
          email: vendorData.contact_email || vendorData.email,
          caseNumber: result.onboardingCase.caseNumber
        });
      } catch (error) {
        results.failed.push({
          email: vendorData.contact_email || vendorData.email,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Accept invite and start onboarding
   */
  async acceptInvite(inviteToken, vendorData, contactData) {
    try {
      const onboardingCase = await OnboardingCase.findOne({
        inviteToken,
        status: 'pending_submission'
      }).populate('vendorProfile');

      if (!onboardingCase) {
        throw new Error('Invalid or expired invite token');
      }

      if (onboardingCase.inviteExpiresAt < new Date()) {
        onboardingCase.status = 'expired';
        await onboardingCase.save();
        throw new Error('Invite has expired');
      }

      // Update vendor profile
      const vendorProfile = await VendorProfile.findById(onboardingCase.vendorProfile._id);
      Object.assign(vendorProfile, {
        legalName: vendorData.legalName,
        dbaName: vendorData.dbaName,
        registrationNumber: vendorData.registrationNumber,
        businessType: vendorData.businessType,
        incorporationCountry: vendorData.country,
        addresses: vendorData.addresses,
        status: 'pending'
      });
      await vendorProfile.save();

      // Update contact
      const contact = await Contact.findOne({ vendorProfile: vendorProfile._id });
      Object.assign(contact, {
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        phone: contactData.phone,
        title: contactData.title
      });
      await contact.save();

      // Update case status
      onboardingCase.status = 'draft';
      onboardingCase.inviteToken = undefined; // Clear token after use
      
      // Update required documents based on actual business type
      onboardingCase.requiredDocuments = this.getRequiredDocuments(
        vendorData.businessType,
        vendorData.country,
        vendorProfile.primaryCategory
      );

      onboardingCase.addHistory(
        'submitted',
        'Vendor accepted invite and provided initial information',
        null,
        'vendor'
      );

      await onboardingCase.save();

      return {
        success: true,
        vendorProfile,
        contact,
        onboardingCase
      };
    } catch (error) {
      console.error('Accept invite error:', error);
      throw error;
    }
  }

  /**
   * Create onboarding case
   */
  async createOnboardingCase(vendorProfile, source, createdBy) {
    const businessType = vendorProfile.businessType || 'corporation';
    const country = vendorProfile.incorporationCountry || 'US';
    const category = vendorProfile.primaryCategory;

    const onboardingCase = new OnboardingCase({
      vendorProfile: vendorProfile._id,
      type: 'new_vendor',
      source,
      status: 'draft',
      requiredDocuments: this.getRequiredDocuments(businessType, country, category),
      tasks: this.generateTasks(businessType, 'medium'),
      createdBy
    });

    // Set initial SLA
    this.setSLA(onboardingCase, 'medium');

    await onboardingCase.save();

    // Add creation history
    onboardingCase.addHistory(
      'created',
      `Onboarding case created via ${source}`,
      createdBy,
      createdBy ? 'user' : 'system'
    );

    await onboardingCase.save();

    return onboardingCase;
  }

  /**
   * Get required documents based on vendor type
   */
  getRequiredDocuments(businessType, country, category) {
    let documents = [...(this.requiredDocuments[businessType] || this.requiredDocuments.corporation)];

    // Add international documents
    if (country !== 'US') {
      documents = documents.filter(d => d.type !== 'w9');
      documents.push(
        { type: 'w8ben', name: 'W-8BEN or W-8BEN-E Form', required: true }
      );
    }

    // Add category-specific documents
    const categoryFields = this.dynamicFields[category];
    if (categoryFields) {
      categoryFields.forEach(field => {
        documents.push({
          type: field,
          name: this.formatFieldName(field),
          required: false
        });
      });
    }

    return documents.map(doc => ({
      ...doc,
      uploaded: false,
      documentId: null
    }));
  }

  /**
   * Generate tasks for onboarding case
   */
  generateTasks(businessType, riskLevel) {
    const baseTasks = [
      {
        type: 'document_upload',
        title: 'Upload Required Documents',
        description: 'Vendor uploads all required documents',
        status: 'pending',
        priority: 'high',
        automatable: false,
        order: 1
      },
      {
        type: 'data_verification',
        title: 'Verify Business Information',
        description: 'Verify legal name, registration number, and addresses',
        status: 'pending',
        priority: 'high',
        automatable: true,
        automated: true,
        order: 2
      },
      {
        type: 'sanctions_check',
        title: 'Sanctions & PEP Screening',
        description: 'Run OFAC and watchlist screening',
        status: 'pending',
        priority: 'critical',
        automatable: true,
        automated: true,
        order: 3
      },
      {
        type: 'document_review',
        title: 'Document OCR & Validation',
        description: 'Extract and validate document data',
        status: 'pending',
        priority: 'high',
        automatable: true,
        automated: true,
        order: 4
      },
      {
        type: 'bank_verification',
        title: 'Bank Account Verification',
        description: 'Verify bank account details',
        status: 'pending',
        priority: 'high',
        automatable: true,
        order: 5
      }
    ];

    // Add identity verification for high risk
    if (riskLevel === 'high' || riskLevel === 'critical') {
      baseTasks.push({
        type: 'identity_verification',
        title: 'Identity Verification (KYC)',
        description: 'Verify identity of primary contact',
        status: 'pending',
        priority: 'high',
        automatable: false,
        order: 6
      });
    }

    // Add compliance review
    baseTasks.push({
      type: 'compliance_review',
      title: 'Compliance Review',
      description: 'Review compliance documentation and certifications',
      status: 'pending',
      priority: 'medium',
      automatable: false,
      assignedRole: 'compliance_officer',
      order: 7
    });

    // Add approval task
    baseTasks.push({
      type: 'approval',
      title: 'Final Approval',
      description: 'Approve or reject vendor onboarding',
      status: 'pending',
      priority: 'high',
      automatable: riskLevel === 'low',
      order: 8
    });

    return baseTasks;
  }

  /**
   * Set SLA dates for onboarding case
   */
  setSLA(onboardingCase, riskLevel) {
    const slaDays = this.slaSettings[riskLevel] || this.slaSettings.medium;
    const now = new Date();

    onboardingCase.sla = {
      targetCompletionDate: new Date(now.getTime() + slaDays * 24 * 60 * 60 * 1000),
      warningDate: new Date(now.getTime() + (slaDays - 1) * 24 * 60 * 60 * 1000),
      breachDate: new Date(now.getTime() + (slaDays + 1) * 24 * 60 * 60 * 1000),
      breached: false,
      totalPausedDuration: 0
    };
  }

  /**
   * Get dynamic form schema based on vendor type and category
   */
  getDynamicFormSchema(businessType, country, category) {
    const schema = {
      sections: [
        {
          id: 'basic_info',
          title: 'Basic Information',
          fields: [
            { name: 'legalName', type: 'text', label: 'Legal Name', required: true },
            { name: 'dbaName', type: 'text', label: 'DBA / Trade Name', required: false },
            { name: 'businessType', type: 'select', label: 'Business Type', required: true,
              options: ['corporation', 'llc', 'partnership', 'sole_proprietorship', 'nonprofit'] },
            { name: 'registrationNumber', type: 'text', label: 'Registration Number', required: true }
          ]
        },
        {
          id: 'address',
          title: 'Address Information',
          fields: [
            { name: 'street1', type: 'text', label: 'Street Address', required: true },
            { name: 'street2', type: 'text', label: 'Street Address Line 2', required: false },
            { name: 'city', type: 'text', label: 'City', required: true },
            { name: 'state', type: 'text', label: 'State/Province', required: true },
            { name: 'postalCode', type: 'text', label: 'Postal Code', required: true },
            { name: 'country', type: 'country', label: 'Country', required: true }
          ]
        },
        {
          id: 'tax_info',
          title: 'Tax Information',
          fields: country === 'US' ? [
            { name: 'einNumber', type: 'text', label: 'EIN/Tax ID', required: true, pattern: '^\\d{2}-\\d{7}$' },
            { name: 'taxExempt', type: 'checkbox', label: 'Tax Exempt', required: false }
          ] : [
            { name: 'taxId', type: 'text', label: 'Tax Identification Number', required: true },
            { name: 'vatNumber', type: 'text', label: 'VAT Number', required: false }
          ]
        },
        {
          id: 'banking',
          title: 'Banking Information',
          fields: [
            { name: 'bankName', type: 'text', label: 'Bank Name', required: true },
            { name: 'accountName', type: 'text', label: 'Account Name', required: true },
            { name: 'accountNumber', type: 'text', label: 'Account Number', required: true },
            { name: 'routingNumber', type: 'text', label: 'Routing Number', required: country === 'US' },
            { name: 'swiftCode', type: 'text', label: 'SWIFT/BIC Code', required: country !== 'US' }
          ]
        },
        {
          id: 'contact',
          title: 'Primary Contact',
          fields: [
            { name: 'contactFirstName', type: 'text', label: 'First Name', required: true },
            { name: 'contactLastName', type: 'text', label: 'Last Name', required: true },
            { name: 'contactEmail', type: 'email', label: 'Email', required: true },
            { name: 'contactPhone', type: 'phone', label: 'Phone', required: true },
            { name: 'contactTitle', type: 'text', label: 'Title/Position', required: false }
          ]
        }
      ],
      documents: this.getRequiredDocuments(businessType, country, category)
    };

    // Add category-specific section
    if (this.dynamicFields[category]) {
      schema.sections.push({
        id: 'category_specific',
        title: `${category} Requirements`,
        fields: this.dynamicFields[category].map(field => ({
          name: field,
          type: 'file',
          label: this.formatFieldName(field),
          required: false
        }))
      });
    }

    return schema;
  }

  /**
   * Format field name to display label
   */
  formatFieldName(fieldName) {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Submit onboarding case for review
   */
  async submitForReview(caseId, submittedBy = null) {
    const onboardingCase = await OnboardingCase.findById(caseId);
    
    if (!onboardingCase) {
      throw new Error('Onboarding case not found');
    }

    // Check required documents
    const missingDocs = onboardingCase.requiredDocuments.filter(d => d.required && !d.uploaded);
    if (missingDocs.length > 0) {
      throw new Error(`Missing required documents: ${missingDocs.map(d => d.name).join(', ')}`);
    }

    onboardingCase.status = 'submitted';
    onboardingCase.submittedAt = new Date();
    
    onboardingCase.addHistory(
      'submitted',
      'Onboarding submitted for review',
      submittedBy,
      submittedBy ? 'vendor' : 'system'
    );

    await onboardingCase.save();

    return onboardingCase;
  }
}

module.exports = new OnboardingIntake();
