/**
 * OCR Processor
 * 
 * Handles document validation using OCR:
 * - Invoice processing
 * - Certificate validation
 * - Contract document extraction
 * - Compliance document parsing
 */

const axios = require('axios');
const Invoice = require('../../models/Invoice');
const Certification = require('../../models/Certification');
const Contract = require('../../models/Contract');

class OCRProcessor {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
  }

  /**
   * Process invoice document with OCR
   */
  async processInvoice(invoiceId, documentUrl) {
    try {
      // Call ML service for OCR
      const ocrResult = await this.callOCRService(documentUrl, 'invoice');
      
      // Extract and validate invoice fields
      const extractedData = this.extractInvoiceFields(ocrResult);
      
      // Validate extracted data
      const validationResult = await this.validateInvoiceData(invoiceId, extractedData);
      
      // Update invoice with OCR data
      await Invoice.findByIdAndUpdate(invoiceId, {
        ocrProcessed: true,
        ocrData: {
          rawText: ocrResult.rawText,
          extractedFields: extractedData,
          confidence: ocrResult.confidence,
          processedAt: new Date()
        },
        validationStatus: validationResult.isValid ? 'validated' : 'manual-review',
        $push: {
          statusHistory: {
            status: 'ocr-processed',
            notes: `OCR processing completed. Confidence: ${ocrResult.confidence}%`,
            timestamp: new Date()
          }
        }
      });

      return {
        success: true,
        extractedData,
        validation: validationResult,
        confidence: ocrResult.confidence
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process certification document with OCR
   */
  async processCertification(certificationId, documentUrl) {
    try {
      const ocrResult = await this.callOCRService(documentUrl, 'certification');
      const extractedData = this.extractCertificationFields(ocrResult);
      
      // Verify certification details
      const verificationResult = this.verifyCertificationData(extractedData);
      
      await Certification.findByIdAndUpdate(certificationId, {
        ocrProcessed: true,
        ocrData: {
          rawText: ocrResult.rawText,
          extractedFields: extractedData,
          confidence: ocrResult.confidence,
          processedAt: new Date()
        },
        verified: verificationResult.confidence > 85,
        verificationMethod: 'automated',
        verificationNotes: `Automated OCR verification. Confidence: ${verificationResult.confidence}%`
      });

      return {
        success: true,
        extractedData,
        verification: verificationResult
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process contract document with OCR
   */
  async processContract(contractId, documentUrl) {
    try {
      const ocrResult = await this.callOCRService(documentUrl, 'contract');
      const extractedData = this.extractContractFields(ocrResult);
      
      await Contract.findByIdAndUpdate(contractId, {
        $set: {
          'nlpAnalysis.processed': true,
          'nlpAnalysis.processedAt': new Date(),
          'nlpAnalysis.summary': extractedData.summary
        }
      });

      return {
        success: true,
        extractedData,
        confidence: ocrResult.confidence
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Call ML service for OCR processing
   */
  async callOCRService(documentUrl, documentType) {
    try {
      const response = await axios.post(`${this.mlServiceUrl}/ocr/process`, {
        documentUrl,
        documentType
      }, {
        timeout: 60000 // 60 second timeout for large documents
      });

      return response.data;
    } catch (error) {
      // Fallback to mock OCR for development
      console.log('ML service unavailable, using mock OCR');
      return this.mockOCRProcess(documentType);
    }
  }

  /**
   * Mock OCR process for development
   */
  mockOCRProcess(documentType) {
    const mockData = {
      invoice: {
        rawText: 'INVOICE #INV-2024-001\nDate: 2024-01-15\nDue: 2024-02-15\nAmount: $5,000.00\nVendor: Sample Corp',
        confidence: 92,
        extractedFields: {
          invoiceNumber: 'INV-2024-001',
          date: '2024-01-15',
          dueDate: '2024-02-15',
          amount: 5000.00,
          vendorName: 'Sample Corp'
        }
      },
      certification: {
        rawText: 'CERTIFICATE ISO 9001:2015\nIssued to: Sample Corp\nValid from: 2024-01-01\nExpires: 2027-01-01',
        confidence: 95,
        extractedFields: {
          certificationType: 'ISO 9001:2015',
          issuedTo: 'Sample Corp',
          validFrom: '2024-01-01',
          expiryDate: '2027-01-01'
        }
      },
      contract: {
        rawText: 'SERVICE AGREEMENT\nEffective Date: January 1, 2024\nTerm: 12 months\nValue: $100,000',
        confidence: 88,
        extractedFields: {
          title: 'Service Agreement',
          effectiveDate: '2024-01-01',
          term: '12 months',
          value: 100000
        }
      }
    };

    return mockData[documentType] || mockData.invoice;
  }

  /**
   * Extract invoice fields from OCR result
   */
  extractInvoiceFields(ocrResult) {
    const fields = ocrResult.extractedFields || {};
    
    return {
      invoiceNumber: fields.invoiceNumber || this.extractPattern(ocrResult.rawText, /INV[-\s]?\d+/i),
      date: fields.date || this.extractDate(ocrResult.rawText),
      dueDate: fields.dueDate || this.extractDueDate(ocrResult.rawText),
      amount: fields.amount || this.extractAmount(ocrResult.rawText),
      vendorName: fields.vendorName || this.extractVendorName(ocrResult.rawText),
      lineItems: this.extractLineItems(ocrResult.rawText),
      taxAmount: this.extractTax(ocrResult.rawText),
      currency: this.extractCurrency(ocrResult.rawText) || 'USD'
    };
  }

  /**
   * Extract certification fields from OCR result
   */
  extractCertificationFields(ocrResult) {
    const fields = ocrResult.extractedFields || {};
    
    return {
      certificationNumber: fields.certificationNumber || this.extractPattern(ocrResult.rawText, /CERT[-\s]?\d+/i),
      certificationType: fields.certificationType || this.extractCertificationType(ocrResult.rawText),
      issuedTo: fields.issuedTo,
      issuingAuthority: this.extractIssuingAuthority(ocrResult.rawText),
      issueDate: fields.validFrom || this.extractDate(ocrResult.rawText),
      expiryDate: fields.expiryDate || this.extractExpiryDate(ocrResult.rawText),
      scope: this.extractScope(ocrResult.rawText)
    };
  }

  /**
   * Extract contract fields from OCR result
   */
  extractContractFields(ocrResult) {
    const fields = ocrResult.extractedFields || {};
    
    return {
      title: fields.title || this.extractContractTitle(ocrResult.rawText),
      contractType: this.detectContractType(ocrResult.rawText),
      parties: this.extractParties(ocrResult.rawText),
      effectiveDate: fields.effectiveDate || this.extractDate(ocrResult.rawText),
      term: fields.term,
      value: fields.value || this.extractAmount(ocrResult.rawText),
      keyTerms: this.extractKeyTerms(ocrResult.rawText),
      summary: this.generateContractSummary(ocrResult.rawText)
    };
  }

  /**
   * Validate extracted invoice data
   */
  async validateInvoiceData(invoiceId, extractedData) {
    const invoice = await Invoice.findById(invoiceId).populate('vendor');
    const discrepancies = [];
    let confidence = 100;

    // Validate amount
    if (extractedData.amount && Math.abs(extractedData.amount - invoice.totalAmount) > 0.01) {
      discrepancies.push({
        field: 'amount',
        expected: invoice.totalAmount,
        extracted: extractedData.amount
      });
      confidence -= 30;
    }

    // Validate invoice number
    if (extractedData.invoiceNumber && extractedData.invoiceNumber !== invoice.invoiceNumber) {
      discrepancies.push({
        field: 'invoiceNumber',
        expected: invoice.invoiceNumber,
        extracted: extractedData.invoiceNumber
      });
      confidence -= 20;
    }

    // Validate vendor name
    if (extractedData.vendorName && invoice.vendor) {
      const vendorNameMatch = this.fuzzyMatch(extractedData.vendorName, invoice.vendor.name);
      if (vendorNameMatch < 0.8) {
        discrepancies.push({
          field: 'vendorName',
          expected: invoice.vendor.name,
          extracted: extractedData.vendorName,
          matchScore: vendorNameMatch
        });
        confidence -= 15;
      }
    }

    return {
      isValid: discrepancies.length === 0,
      confidence: Math.max(0, confidence),
      discrepancies
    };
  }

  /**
   * Verify certification data
   */
  verifyCertificationData(extractedData) {
    let confidence = 90;
    const issues = [];

    // Check expiry date
    if (extractedData.expiryDate) {
      const expiryDate = new Date(extractedData.expiryDate);
      if (expiryDate < new Date()) {
        issues.push('Certificate appears to be expired');
        confidence -= 40;
      }
    } else {
      issues.push('Could not extract expiry date');
      confidence -= 20;
    }

    // Check certification type
    if (!extractedData.certificationType) {
      issues.push('Could not identify certification type');
      confidence -= 15;
    }

    return {
      confidence: Math.max(0, confidence),
      issues,
      isValid: confidence >= 70
    };
  }

  // Utility extraction methods
  extractPattern(text, pattern) {
    const match = text.match(pattern);
    return match ? match[0] : null;
  }

  extractDate(text) {
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/,
      /\d{2}\/\d{2}\/\d{4}/,
      /\w+ \d{1,2}, \d{4}/
    ];
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  extractDueDate(text) {
    const dueMatch = text.match(/due[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i);
    return dueMatch ? dueMatch[1] : null;
  }

  extractAmount(text) {
    const amountMatch = text.match(/\$[\d,]+\.?\d*/);
    if (amountMatch) {
      return parseFloat(amountMatch[0].replace(/[$,]/g, ''));
    }
    return null;
  }

  extractVendorName(text) {
    const vendorMatch = text.match(/vendor[:\s]+([^\n]+)/i) ||
                        text.match(/from[:\s]+([^\n]+)/i);
    return vendorMatch ? vendorMatch[1].trim() : null;
  }

  extractCurrency(text) {
    if (text.includes('$') || text.toLowerCase().includes('usd')) return 'USD';
    if (text.includes('€') || text.toLowerCase().includes('eur')) return 'EUR';
    if (text.includes('£') || text.toLowerCase().includes('gbp')) return 'GBP';
    return 'USD';
  }

  extractTax(text) {
    const taxMatch = text.match(/tax[:\s]+\$?([\d,]+\.?\d*)/i);
    return taxMatch ? parseFloat(taxMatch[1].replace(/,/g, '')) : 0;
  }

  extractLineItems(text) {
    // Simple line item extraction
    const lines = text.split('\n');
    const items = [];
    for (const line of lines) {
      const itemMatch = line.match(/(.+)\s+(\d+)\s+\$?([\d,]+\.?\d*)/);
      if (itemMatch) {
        items.push({
          description: itemMatch[1].trim(),
          quantity: parseInt(itemMatch[2]),
          amount: parseFloat(itemMatch[3].replace(/,/g, ''))
        });
      }
    }
    return items;
  }

  extractCertificationType(text) {
    const types = ['ISO 9001', 'ISO 27001', 'ISO 14001', 'SOC 2', 'SOC 1', 'PCI DSS', 'HIPAA', 'GDPR'];
    for (const type of types) {
      if (text.toUpperCase().includes(type.toUpperCase())) {
        return type;
      }
    }
    return null;
  }

  extractIssuingAuthority(text) {
    const authorityMatch = text.match(/issued by[:\s]+([^\n]+)/i) ||
                           text.match(/certifying body[:\s]+([^\n]+)/i);
    return authorityMatch ? authorityMatch[1].trim() : null;
  }

  extractExpiryDate(text) {
    const expiryMatch = text.match(/expir[esy]+[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i) ||
                        text.match(/valid until[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i);
    return expiryMatch ? expiryMatch[1] : null;
  }

  extractScope(text) {
    const scopeMatch = text.match(/scope[:\s]+([^\n]+)/i);
    return scopeMatch ? scopeMatch[1].trim() : null;
  }

  extractContractTitle(text) {
    const lines = text.split('\n');
    for (const line of lines.slice(0, 5)) {
      if (line.toUpperCase().includes('AGREEMENT') || 
          line.toUpperCase().includes('CONTRACT')) {
        return line.trim();
      }
    }
    return null;
  }

  detectContractType(text) {
    const textUpper = text.toUpperCase();
    if (textUpper.includes('SERVICE AGREEMENT') || textUpper.includes('MSA')) return 'master-service-agreement';
    if (textUpper.includes('PURCHASE')) return 'purchase-agreement';
    if (textUpper.includes('SLA') || textUpper.includes('SERVICE LEVEL')) return 'service-level-agreement';
    if (textUpper.includes('NDA') || textUpper.includes('NON-DISCLOSURE')) return 'non-disclosure-agreement';
    if (textUpper.includes('LICENSE')) return 'licensing';
    return 'other';
  }

  extractParties(text) {
    const parties = [];
    const partyMatches = text.match(/between[:\s]+([^\n]+)/i);
    if (partyMatches) {
      const partyText = partyMatches[1];
      const individualParties = partyText.split(/\s+and\s+/i);
      parties.push(...individualParties.map(p => p.trim()));
    }
    return parties;
  }

  extractKeyTerms(text) {
    const terms = [];
    const termPatterns = [
      /payment terms?[:\s]+([^\n]+)/i,
      /termination[:\s]+([^\n]+)/i,
      /liability[:\s]+([^\n]+)/i,
      /confidential[ity]*[:\s]+([^\n]+)/i
    ];

    for (const pattern of termPatterns) {
      const match = text.match(pattern);
      if (match) {
        terms.push({
          term: pattern.source.split('[')[0].replace(/[\\\/]/g, ''),
          content: match[1].trim()
        });
      }
    }
    return terms;
  }

  generateContractSummary(text) {
    // Simple summary - first 500 characters cleaned
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.substring(0, 500) + (cleaned.length > 500 ? '...' : '');
  }

  fuzzyMatch(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Simple Levenshtein-based similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    return matches / longer.length;
  }

  /**
   * Batch process documents
   */
  async batchProcessDocuments(documents) {
    const results = {
      processed: [],
      failed: []
    };

    for (const doc of documents) {
      try {
        let result;
        switch (doc.type) {
          case 'invoice':
            result = await this.processInvoice(doc.id, doc.documentUrl);
            break;
          case 'certification':
            result = await this.processCertification(doc.id, doc.documentUrl);
            break;
          case 'contract':
            result = await this.processContract(doc.id, doc.documentUrl);
            break;
          default:
            throw new Error(`Unknown document type: ${doc.type}`);
        }
        results.processed.push({ id: doc.id, type: doc.type, result });
      } catch (error) {
        results.failed.push({ id: doc.id, type: doc.type, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new OCRProcessor();
