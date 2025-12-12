/**
 * InvoiceIntake.js - Input Layer for Automated Invoicing
 * 
 * Handles all invoice intake channels:
 * - Portal submissions
 * - Email ingestion
 * - API/EDI integration
 * - Mobile capture
 * - Document scanning
 * 
 * Normalizes all inputs to canonical invoice schema
 */

const Invoice = require('../../models/Invoice');
const Vendor = require('../../models/Vendor');
const VendorProfile = require('../../models/VendorProfile');
const Tesseract = require('tesseract.js');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class InvoiceIntake {
  constructor() {
    this.supportedFormats = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'xml', 'json', 'edi'];
    this.requiredFields = ['invoiceNumber', 'vendorId', 'totalAmount', 'invoiceDate'];
  }

  /**
   * Main entry point for invoice submission
   */
  async submitInvoice(data, files, source = 'portal') {
    try {
      // Validate source
      const validSources = ['portal', 'email', 'api', 'edi', 'sftp', 'mobile', 'scan', 'manual'];
      if (!validSources.includes(source)) {
        throw new Error(`Invalid source: ${source}`);
      }

      // Process based on source
      let invoiceData;
      switch (source) {
        case 'portal':
        case 'manual':
          invoiceData = await this.processPortalSubmission(data, files);
          break;
        case 'email':
          invoiceData = await this.processEmailSubmission(data, files);
          break;
        case 'api':
        case 'edi':
          invoiceData = await this.processAPISubmission(data);
          break;
        case 'mobile':
          invoiceData = await this.processMobileSubmission(data, files);
          break;
        case 'scan':
          invoiceData = await this.processScanSubmission(files);
          break;
        default:
          invoiceData = await this.processPortalSubmission(data, files);
      }

      // Normalize to canonical schema
      const canonicalInvoice = await this.normalizeToCanonical(invoiceData, source);

      // Create invoice record
      const invoice = new Invoice(canonicalInvoice);
      
      // Set initial status
      invoice.status = 'submitted';
      invoice.receivedDate = new Date();
      
      // Add audit entry
      invoice.auditTrail.push({
        action: 'invoice_submitted',
        performedAt: new Date(),
        details: { source, fileCount: files?.length || 0 }
      });

      await invoice.save();

      return {
        success: true,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        extractionConfidence: invoice.overallExtractionConfidence,
        requiresReview: invoice.flags?.requiresManualReview || false
      };

    } catch (error) {
      console.error('Invoice submission error:', error);
      throw error;
    }
  }

  /**
   * Process portal/manual submission
   */
  async processPortalSubmission(data, files) {
    const invoiceData = { ...data };
    
    // Process uploaded files
    if (files && files.length > 0) {
      invoiceData.rawFiles = await this.processFiles(files);
      
      // Extract text from documents if needed
      if (!invoiceData.lineItems || invoiceData.lineItems.length === 0) {
        const extractedData = await this.extractFromDocuments(files);
        invoiceData.extractedFields = extractedData.fields;
        invoiceData.overallExtractionConfidence = extractedData.confidence;
        
        // Merge extracted data if not provided
        if (!invoiceData.invoiceNumber && extractedData.invoiceNumber) {
          invoiceData.invoiceNumber = extractedData.invoiceNumber;
        }
        if (!invoiceData.totalAmount && extractedData.totalAmount) {
          invoiceData.totalAmount = extractedData.totalAmount;
        }
      }
    }

    // Validate vendor
    if (invoiceData.vendorId || invoiceData.vendor) {
      const vendorInfo = await this.validateVendor(invoiceData.vendorId || invoiceData.vendor);
      invoiceData.vendorName = vendorInfo.name;
      invoiceData.vendorTaxId = vendorInfo.taxId;
    }

    return invoiceData;
  }

  /**
   * Process email submission
   */
  async processEmailSubmission(emailData, attachments) {
    const invoiceData = {
      source: 'email',
      sourceReference: emailData.messageId || emailData.subject
    };

    // Extract sender information to identify vendor
    if (emailData.from) {
      const vendor = await this.identifyVendorByEmail(emailData.from);
      if (vendor) {
        invoiceData.vendorId = vendor._id;
        invoiceData.vendorName = vendor.name;
      }
    }

    // Process attachments
    if (attachments && attachments.length > 0) {
      invoiceData.rawFiles = await this.processFiles(attachments);
      
      // Extract data from attachments
      const extractedData = await this.extractFromDocuments(attachments);
      invoiceData.extractedFields = extractedData.fields;
      invoiceData.overallExtractionConfidence = extractedData.confidence;
      
      // Populate fields from extraction
      Object.assign(invoiceData, this.mapExtractedToFields(extractedData));
    }

    // Parse email body for additional context
    if (emailData.body) {
      const bodyContext = this.parseEmailBody(emailData.body);
      if (bodyContext.poNumber) {
        invoiceData.purchaseOrderNumbers = [bodyContext.poNumber];
        invoiceData.hasPO = true;
      }
    }

    return invoiceData;
  }

  /**
   * Process API/EDI submission
   */
  async processAPISubmission(payload) {
    // API submissions should already be structured
    const invoiceData = { ...payload };
    
    // Validate required fields
    this.validateRequiredFields(invoiceData);

    // Validate and enhance vendor info
    if (invoiceData.vendorId) {
      const vendorInfo = await this.validateVendor(invoiceData.vendorId);
      invoiceData.vendorName = vendorInfo.name;
      invoiceData.vendorTaxId = vendorInfo.taxId;
    }

    // Parse line items if provided as string
    if (typeof invoiceData.lineItems === 'string') {
      invoiceData.items = JSON.parse(invoiceData.lineItems);
    }

    // Set high confidence for API submissions
    invoiceData.overallExtractionConfidence = 1.0;
    invoiceData.extractedFields = [];

    return invoiceData;
  }

  /**
   * Process mobile capture submission
   */
  async processMobileSubmission(data, files) {
    const invoiceData = { ...data };

    // Mobile images often need enhancement
    if (files && files.length > 0) {
      const processedFiles = await this.processFiles(files, { enhance: true });
      invoiceData.rawFiles = processedFiles;

      // Extract with mobile-optimized settings
      const extractedData = await this.extractFromDocuments(files, { mobile: true });
      invoiceData.extractedFields = extractedData.fields;
      invoiceData.overallExtractionConfidence = extractedData.confidence;

      Object.assign(invoiceData, this.mapExtractedToFields(extractedData));
    }

    // Flag for review if confidence is low
    if (invoiceData.overallExtractionConfidence < 0.8) {
      invoiceData.flags = invoiceData.flags || {};
      invoiceData.flags.requiresManualReview = true;
      invoiceData.flags.reviewReasons = ['Low extraction confidence from mobile capture'];
    }

    return invoiceData;
  }

  /**
   * Process scan submission
   */
  async processScanSubmission(files) {
    if (!files || files.length === 0) {
      throw new Error('No scanned documents provided');
    }

    const invoiceData = {
      source: 'scan'
    };

    // Process scanned files
    invoiceData.rawFiles = await this.processFiles(files, { deskew: true, enhance: true });

    // Check for multiple invoices in single document
    const splitResult = await this.detectAndSplitInvoices(files);
    if (splitResult.multiple) {
      // Return array of invoice data for batch processing
      return splitResult.invoices.map(inv => ({
        ...invoiceData,
        ...inv
      }));
    }

    // Extract data
    const extractedData = await this.extractFromDocuments(files);
    invoiceData.extractedFields = extractedData.fields;
    invoiceData.overallExtractionConfidence = extractedData.confidence;

    Object.assign(invoiceData, this.mapExtractedToFields(extractedData));

    return invoiceData;
  }

  /**
   * Process uploaded files
   */
  async processFiles(files, options = {}) {
    const processedFiles = [];

    for (const file of files) {
      const fileInfo = {
        fileName: file.originalname || file.filename,
        filePath: file.path,
        fileType: file.mimetype || this.getFileType(file.originalname),
        fileSize: file.size,
        uploadedAt: new Date(),
        ocrProcessed: false
      };

      // Generate document hash for duplicate detection
      if (file.path) {
        try {
          const fileBuffer = await fs.readFile(file.path);
          fileInfo.documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        } catch (err) {
          console.error('Error generating file hash:', err);
        }
      }

      // Count pages for PDFs
      if (fileInfo.fileType === 'application/pdf') {
        fileInfo.pageCount = await this.countPDFPages(file.path);
      }

      processedFiles.push(fileInfo);
    }

    return processedFiles;
  }

  /**
   * Extract data from documents using OCR
   */
  async extractFromDocuments(files, options = {}) {
    const extractedFields = [];
    let totalConfidence = 0;
    let fieldCount = 0;

    const extractionResult = {
      fields: [],
      invoiceNumber: null,
      invoiceDate: null,
      totalAmount: null,
      vendorName: null,
      lineItems: [],
      confidence: 0
    };

    for (const file of files) {
      try {
        // Use Tesseract for OCR
        const result = await Tesseract.recognize(
          file.path,
          'eng',
          {
            logger: m => {} // Suppress logging
          }
        );

        const text = result.data.text;
        const confidence = result.data.confidence / 100;

        // Extract structured fields
        const fields = this.extractFieldsFromText(text, confidence);
        extractedFields.push(...fields);

        // Update extraction result
        if (fields.find(f => f.fieldName === 'invoiceNumber')) {
          extractionResult.invoiceNumber = fields.find(f => f.fieldName === 'invoiceNumber').value;
        }
        if (fields.find(f => f.fieldName === 'invoiceDate')) {
          extractionResult.invoiceDate = fields.find(f => f.fieldName === 'invoiceDate').value;
        }
        if (fields.find(f => f.fieldName === 'totalAmount')) {
          extractionResult.totalAmount = fields.find(f => f.fieldName === 'totalAmount').value;
        }
        if (fields.find(f => f.fieldName === 'vendorName')) {
          extractionResult.vendorName = fields.find(f => f.fieldName === 'vendorName').value;
        }

        totalConfidence += confidence;
        fieldCount++;

      } catch (error) {
        console.error('OCR extraction error:', error);
      }
    }

    extractionResult.fields = extractedFields;
    extractionResult.confidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;

    return extractionResult;
  }

  /**
   * Extract structured fields from OCR text
   */
  extractFieldsFromText(text, baseConfidence) {
    const fields = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Invoice number patterns
    const invoicePatterns = [
      /invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i,
      /inv\s*#?\s*:?\s*([A-Z0-9-]+)/i,
      /invoice\s+number\s*:?\s*([A-Z0-9-]+)/i
    ];

    for (const pattern of invoicePatterns) {
      const match = text.match(pattern);
      if (match) {
        fields.push({
          fieldName: 'invoiceNumber',
          value: match[1].trim(),
          confidence: baseConfidence * 0.9,
          extractionMethod: 'ocr'
        });
        break;
      }
    }

    // Date patterns
    const datePatterns = [
      /(?:invoice\s+)?date\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      /(\w+\s+\d{1,2},?\s+\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateValue = this.parseDate(match[1]);
        if (dateValue) {
          fields.push({
            fieldName: 'invoiceDate',
            value: dateValue,
            confidence: baseConfidence * 0.85,
            extractionMethod: 'ocr'
          });
          break;
        }
      }
    }

    // Amount patterns
    const amountPatterns = [
      /total\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
      /amount\s+due\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
      /grand\s+total\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
      /balance\s+due\s*:?\s*\$?\s*([\d,]+\.?\d*)/i
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount)) {
          fields.push({
            fieldName: 'totalAmount',
            value: amount,
            confidence: baseConfidence * 0.85,
            extractionMethod: 'ocr'
          });
          break;
        }
      }
    }

    // Vendor name (usually at the top)
    if (lines.length > 0) {
      // First non-empty line often contains company name
      const potentialVendor = lines[0];
      if (potentialVendor.length > 2 && potentialVendor.length < 100) {
        fields.push({
          fieldName: 'vendorName',
          value: potentialVendor,
          confidence: baseConfidence * 0.6,
          extractionMethod: 'ocr'
        });
      }
    }

    // Tax amount
    const taxPattern = /tax\s*:?\s*\$?\s*([\d,]+\.?\d*)/i;
    const taxMatch = text.match(taxPattern);
    if (taxMatch) {
      const taxAmount = parseFloat(taxMatch[1].replace(/,/g, ''));
      if (!isNaN(taxAmount)) {
        fields.push({
          fieldName: 'taxAmount',
          value: taxAmount,
          confidence: baseConfidence * 0.8,
          extractionMethod: 'ocr'
        });
      }
    }

    // PO Number
    const poPattern = /(?:po|purchase\s+order)\s*#?\s*:?\s*([A-Z0-9-]+)/i;
    const poMatch = text.match(poPattern);
    if (poMatch) {
      fields.push({
        fieldName: 'purchaseOrderNumber',
        value: poMatch[1].trim(),
        confidence: baseConfidence * 0.85,
        extractionMethod: 'ocr'
      });
    }

    return fields;
  }

  /**
   * Parse date string to Date object
   */
  parseDate(dateStr) {
    try {
      // Try various date formats
      const formats = [
        /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/,
        /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize invoice data to canonical schema
   */
  async normalizeToCanonical(data, source) {
    const canonical = {
      source,
      receivedDate: new Date()
    };

    // Map core fields
    canonical.invoiceNumber = data.invoiceNumber || `INV-${Date.now()}`;
    canonical.invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
    
    // Calculate due date based on payment terms
    const paymentTermsDays = this.getPaymentTermsDays(data.paymentTerms);
    canonical.dueDate = data.dueDate ? new Date(data.dueDate) : 
      new Date(canonical.invoiceDate.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);

    // Vendor info
    canonical.vendor = data.vendorId || data.vendor;
    canonical.vendorId = data.vendorId;
    canonical.vendorName = data.vendorName;
    canonical.vendorTaxId = data.vendorTaxId;

    // Financial fields
    canonical.subtotal = parseFloat(data.subtotal) || 0;
    canonical.taxAmount = parseFloat(data.taxAmount) || 0;
    canonical.shippingAmount = parseFloat(data.shippingAmount) || 0;
    canonical.discountAmount = parseFloat(data.discountAmount) || 0;
    canonical.totalAmount = parseFloat(data.totalAmount) || 
      (canonical.subtotal + canonical.taxAmount + canonical.shippingAmount - canonical.discountAmount);
    canonical.currency = data.currency || 'USD';
    canonical.paymentTerms = data.paymentTerms || 'net30';
    canonical.paymentTermsDays = paymentTermsDays;

    // Line items
    if (data.items && Array.isArray(data.items)) {
      canonical.items = data.items.map((item, index) => ({
        lineNumber: index + 1,
        sku: item.sku,
        productId: item.productId || item.product,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitOfMeasure: item.unitOfMeasure || item.uom || 'EA',
        unitPrice: parseFloat(item.unitPrice) || 0,
        lineTotal: parseFloat(item.lineTotal) || parseFloat(item.amount) || 
          (parseFloat(item.quantity) * parseFloat(item.unitPrice)),
        lineTax: parseFloat(item.lineTax) || parseFloat(item.taxAmount) || 0,
        taxRate: parseFloat(item.taxRate) || 0,
        glCode: item.glCode,
        costCenter: item.costCenter,
        matchStatus: 'unmatched'
      }));
    } else if (data.lineItems && Array.isArray(data.lineItems)) {
      canonical.items = data.lineItems;
    }

    // PO information
    canonical.hasPO = data.hasPO || !!data.purchaseOrderNumbers?.length;
    canonical.purchaseOrderNumbers = data.purchaseOrderNumbers || [];
    canonical.order = data.order || data.orderId;

    // Extracted fields
    canonical.extractedFields = data.extractedFields || [];
    canonical.overallExtractionConfidence = data.overallExtractionConfidence || 0;

    // Files
    canonical.rawFiles = data.rawFiles || [];
    canonical.documentUrl = data.documentUrl;
    canonical.documentHash = data.documentHash;

    // Classification
    canonical.invoiceType = data.invoiceType || 'standard';
    canonical.category = data.category || this.classifyInvoice(canonical);

    // GL coding
    canonical.glAccount = data.glAccount;
    canonical.costCenter = data.costCenter;
    canonical.department = data.department;
    canonical.projectCode = data.projectCode;

    // Bank details
    if (data.bankDetails) {
      canonical.bankDetails = data.bankDetails;
    }

    // Initialize flags
    canonical.flags = {
      isDuplicate: false,
      isFraudSuspect: false,
      hasAnomaly: false,
      bankAccountChanged: false,
      requiresManualReview: data.flags?.requiresManualReview || false,
      reviewReasons: data.flags?.reviewReasons || [],
      isUrgent: data.isUrgent || false,
      isHighValue: canonical.totalAmount > 50000
    };

    // Notes
    canonical.notes = data.notes;
    canonical.vendorNotes = data.vendorNotes;

    return canonical;
  }

  /**
   * Get payment terms in days
   */
  getPaymentTermsDays(terms) {
    const termsMap = {
      'immediate': 0,
      'due_on_receipt': 0,
      'net15': 15,
      'net30': 30,
      'net45': 45,
      'net60': 60,
      'net90': 90,
      '2_10_net30': 30
    };
    return termsMap[terms] || 30;
  }

  /**
   * Classify invoice based on content
   */
  classifyInvoice(invoice) {
    // Simple classification logic
    if (invoice.isRecurring) return 'subscription';
    if (invoice.items && invoice.items.length > 0) {
      const hasProducts = invoice.items.some(i => i.sku || i.productId);
      const hasServices = invoice.items.some(i => 
        i.description?.toLowerCase().includes('service') ||
        i.description?.toLowerCase().includes('consulting')
      );
      if (hasProducts && hasServices) return 'mixed';
      if (hasProducts) return 'goods';
      if (hasServices) return 'services';
    }
    return 'other';
  }

  /**
   * Validate vendor exists
   */
  async validateVendor(vendorId) {
    let vendor = await VendorProfile.findById(vendorId);
    if (!vendor) {
      vendor = await Vendor.findById(vendorId);
    }
    
    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    return {
      id: vendor._id,
      name: vendor.legalName || vendor.businessName || vendor.name,
      taxId: vendor.taxId || vendor.taxIdentificationNumber
    };
  }

  /**
   * Identify vendor by email domain
   */
  async identifyVendorByEmail(email) {
    const domain = email.split('@')[1];
    if (!domain) return null;

    // Search for vendor by email domain
    let vendor = await VendorProfile.findOne({
      $or: [
        { 'contacts.email': { $regex: domain, $options: 'i' } },
        { website: { $regex: domain, $options: 'i' } }
      ]
    });

    if (!vendor) {
      vendor = await Vendor.findOne({
        $or: [
          { email: { $regex: domain, $options: 'i' } },
          { website: { $regex: domain, $options: 'i' } }
        ]
      });
    }

    return vendor;
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(data) {
    const missing = [];
    
    if (!data.invoiceNumber) missing.push('invoiceNumber');
    if (!data.vendorId && !data.vendor) missing.push('vendorId');
    if (!data.totalAmount) missing.push('totalAmount');
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Map extracted fields to invoice fields
   */
  mapExtractedToFields(extractedData) {
    const mapped = {};
    
    if (extractedData.invoiceNumber) mapped.invoiceNumber = extractedData.invoiceNumber;
    if (extractedData.invoiceDate) mapped.invoiceDate = extractedData.invoiceDate;
    if (extractedData.totalAmount) mapped.totalAmount = extractedData.totalAmount;
    if (extractedData.vendorName) mapped.vendorName = extractedData.vendorName;
    if (extractedData.lineItems) mapped.items = extractedData.lineItems;

    // Find PO number in fields
    const poField = extractedData.fields.find(f => f.fieldName === 'purchaseOrderNumber');
    if (poField) {
      mapped.purchaseOrderNumbers = [poField.value];
      mapped.hasPO = true;
    }

    // Find tax amount
    const taxField = extractedData.fields.find(f => f.fieldName === 'taxAmount');
    if (taxField) {
      mapped.taxAmount = taxField.value;
    }

    return mapped;
  }

  /**
   * Parse email body for context
   */
  parseEmailBody(body) {
    const context = {};
    
    // Look for PO reference
    const poMatch = body.match(/(?:po|purchase\s+order)\s*#?\s*:?\s*([A-Z0-9-]+)/i);
    if (poMatch) {
      context.poNumber = poMatch[1];
    }

    // Look for urgency indicators
    if (body.toLowerCase().includes('urgent') || body.toLowerCase().includes('rush')) {
      context.isUrgent = true;
    }

    return context;
  }

  /**
   * Detect and split multiple invoices in one document
   */
  async detectAndSplitInvoices(files) {
    // Placeholder for multi-invoice detection
    // In production, would use ML to detect invoice boundaries
    return {
      multiple: false,
      invoices: []
    };
  }

  /**
   * Get file type from filename
   */
  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mimeTypes = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'tiff': 'image/tiff',
      'xml': 'application/xml',
      'json': 'application/json'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Count pages in PDF
   */
  async countPDFPages(filePath) {
    // Placeholder - would use pdf-lib or similar
    return 1;
  }

  /**
   * Bulk upload invoices
   */
  async bulkUpload(invoices, files, source = 'api') {
    const results = [];

    for (let i = 0; i < invoices.length; i++) {
      try {
        const invoiceFiles = files?.[i] ? [files[i]] : [];
        const result = await this.submitInvoice(invoices[i], invoiceFiles, source);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ 
          success: false, 
          invoiceNumber: invoices[i].invoiceNumber,
          error: error.message 
        });
      }
    }

    return {
      total: invoices.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = new InvoiceIntake();
