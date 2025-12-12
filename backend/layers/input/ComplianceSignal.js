/**
 * Compliance Signal Layer (Input Layer)
 * Multi-source signal ingestion for continuous compliance monitoring
 */

const VendorComplianceProfile = require('../../models/VendorComplianceProfile');
const ComplianceEvent = require('../../models/ComplianceEvent');
const IntegrationConnector = require('../../models/IntegrationConnector');
const axios = require('axios');

class ComplianceSignalLayer {
  constructor() {
    this.ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
  }

  // =====================================================
  // SIGNAL INGESTION
  // =====================================================

  /**
   * Process incoming compliance signal from any source
   */
  async processSignal(signalData) {
    try {
      // Validate signal structure
      const validatedSignal = this.validateSignal(signalData);
      
      // Create compliance event
      const event = new ComplianceEvent({
        source: validatedSignal.source,
        eventType: validatedSignal.eventType,
        vendorId: validatedSignal.vendorId,
        attributeAffected: validatedSignal.attributeAffected,
        changeType: validatedSignal.changeType,
        previousValue: validatedSignal.previousValue,
        newValue: validatedSignal.newValue,
        rawPayload: validatedSignal.rawPayload,
        confidence: validatedSignal.confidence,
        provenance: validatedSignal.provenance
      });
      
      await event.save();
      
      // Process the event through ML for enrichment
      const enrichedEvent = await this.enrichSignal(event);
      
      // Trigger immediate processing if high severity
      if (this.isHighPrioritySignal(enrichedEvent)) {
        await this.triggerImmediateProcessing(enrichedEvent);
      }
      
      return enrichedEvent;
    } catch (error) {
      console.error('Signal processing error:', error);
      throw error;
    }
  }

  /**
   * Validate incoming signal structure
   */
  validateSignal(signalData) {
    const requiredFields = ['source', 'eventType'];
    for (const field of requiredFields) {
      if (!signalData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    const validEventTypes = [
      'document_expiring', 'document_expired', 'document_uploaded',
      'document_verified', 'document_rejected', 'sanctions_hit',
      'sanctions_clear', 'adverse_media_alert', 'certificate_invalid',
      'certificate_verified', 'insurance_lapsed', 'insurance_renewed',
      'credit_rating_change', 'ownership_change', 'registration_update',
      'compliance_attestation', 'audit_finding', 'contract_violation',
      'payment_issue', 'quality_issue', 'delivery_issue', 'custom'
    ];
    
    if (!validEventTypes.includes(signalData.eventType)) {
      signalData.eventType = 'custom';
    }
    
    return {
      ...signalData,
      confidence: signalData.confidence || 0.5,
      provenance: signalData.provenance || {
        system: 'manual_entry',
        timestamp: new Date()
      }
    };
  }

  /**
   * Enrich signal with ML-derived insights
   */
  async enrichSignal(event) {
    try {
      const response = await axios.post(
        `${this.ML_SERVICE_URL}/compliance/enrich-signal`,
        {
          eventType: event.eventType,
          source: event.source,
          rawPayload: event.rawPayload,
          vendorId: event.vendorId?.toString()
        },
        { timeout: 10000 }
      );
      
      if (response.data.success) {
        event.confidence = response.data.confidence;
        event.enrichedData = response.data.enrichedData;
        event.suggestedActions = response.data.suggestedActions;
        await event.save();
      }
      
      return event;
    } catch (error) {
      console.error('Signal enrichment failed:', error.message);
      return event; // Return original event if enrichment fails
    }
  }

  /**
   * Check if signal requires immediate processing
   */
  isHighPrioritySignal(event) {
    const highPriorityTypes = [
      'sanctions_hit', 'certificate_invalid', 'insurance_lapsed',
      'adverse_media_alert', 'contract_violation'
    ];
    return highPriorityTypes.includes(event.eventType);
  }

  /**
   * Trigger immediate processing for high-priority signals
   */
  async triggerImmediateProcessing(event) {
    await event.process();
    return event;
  }

  // =====================================================
  // SANCTIONS SCREENING
  // =====================================================

  /**
   * Screen vendor against sanctions databases
   */
  async screenSanctions(vendorId, vendorData) {
    try {
      // Get active sanctions connectors
      const connectors = await IntegrationConnector.getActiveByType('sanctions_screening');
      
      const results = [];
      for (const connector of connectors) {
        try {
          const result = await this.callSanctionsAPI(connector, vendorData);
          results.push({
            provider: connector.provider.name,
            ...result
          });
          
          // Create event for each hit
          if (result.hits && result.hits.length > 0) {
            await this.processSignal({
              source: connector.provider.name,
              eventType: 'sanctions_hit',
              vendorId,
              attributeAffected: 'sanctionsStatus',
              newValue: { hits: result.hits, severity: result.severity },
              confidence: result.confidence,
              rawPayload: result,
              provenance: {
                system: connector.connectorId,
                timestamp: new Date(),
                apiVersion: connector.connection.version
              }
            });
          }
        } catch (error) {
          console.error(`Sanctions check failed for ${connector.name}:`, error.message);
        }
      }
      
      // Aggregate results
      const aggregated = this.aggregateSanctionsResults(results);
      
      // Update vendor compliance profile
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      if (profile) {
        profile.sanctionsStatus = {
          status: aggregated.hasHits ? 'flagged' : 'clear',
          lastCheckAt: new Date(),
          screeningProvider: results.map(r => r.provider).join(', '),
          matches: aggregated.hits,
          riskLevel: aggregated.severity
        };
        await profile.save();
      }
      
      return aggregated;
    } catch (error) {
      console.error('Sanctions screening error:', error);
      throw error;
    }
  }

  /**
   * Call sanctions API through connector
   */
  async callSanctionsAPI(connector, vendorData) {
    // Implementation would make actual API call
    // This is a simulation for development
    const response = await axios.post(
      `${this.ML_SERVICE_URL}/compliance/sanctions-check`,
      {
        vendorName: vendorData.name,
        country: vendorData.country,
        registrationNumber: vendorData.registrationNumber,
        aliases: vendorData.aliases || [],
        officers: vendorData.officers || []
      },
      { timeout: 30000 }
    );
    
    connector.recordRequest(true, response.data.latency || 0);
    await connector.save();
    
    return response.data;
  }

  /**
   * Aggregate results from multiple sanctions providers
   */
  aggregateSanctionsResults(results) {
    const allHits = results.flatMap(r => r.hits || []);
    const hasHits = allHits.length > 0;
    
    // Determine overall severity
    const severities = ['low', 'medium', 'high', 'critical'];
    const maxSeverity = results.reduce((max, r) => {
      const idx = severities.indexOf(r.severity);
      return idx > severities.indexOf(max) ? r.severity : max;
    }, 'low');
    
    // Calculate aggregated confidence
    const avgConfidence = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length
      : 0;
    
    return {
      hasHits,
      hitCount: allHits.length,
      hits: allHits,
      severity: hasHits ? maxSeverity : 'none',
      confidence: avgConfidence,
      providers: results.map(r => r.provider),
      checkedAt: new Date()
    };
  }

  // =====================================================
  // ADVERSE MEDIA MONITORING
  // =====================================================

  /**
   * Check vendor for adverse media mentions
   */
  async checkAdverseMedia(vendorId, vendorData) {
    try {
      const connectors = await IntegrationConnector.getActiveByType('adverse_media');
      
      const results = [];
      for (const connector of connectors) {
        try {
          const result = await this.callAdverseMediaAPI(connector, vendorData);
          results.push({
            provider: connector.provider.name,
            ...result
          });
          
          // Create events for significant alerts
          if (result.alerts && result.alerts.some(a => a.severity === 'high' || a.severity === 'critical')) {
            await this.processSignal({
              source: connector.provider.name,
              eventType: 'adverse_media_alert',
              vendorId,
              attributeAffected: 'adverseMediaStatus',
              newValue: { alerts: result.alerts.filter(a => ['high', 'critical'].includes(a.severity)) },
              confidence: result.confidence,
              rawPayload: result,
              provenance: {
                system: connector.connectorId,
                timestamp: new Date()
              }
            });
          }
        } catch (error) {
          console.error(`Adverse media check failed for ${connector.name}:`, error.message);
        }
      }
      
      // Aggregate and update profile
      const aggregated = this.aggregateAdverseMediaResults(results);
      
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      if (profile) {
        profile.adverseMediaStatus = {
          status: aggregated.hasAlerts ? 'flagged' : 'clear',
          lastCheckAt: new Date(),
          provider: results.map(r => r.provider).join(', '),
          alerts: aggregated.alerts,
          categories: aggregated.categories,
          overallSentiment: aggregated.sentiment
        };
        await profile.save();
      }
      
      return aggregated;
    } catch (error) {
      console.error('Adverse media check error:', error);
      throw error;
    }
  }

  /**
   * Call adverse media API
   */
  async callAdverseMediaAPI(connector, vendorData) {
    const response = await axios.post(
      `${this.ML_SERVICE_URL}/compliance/adverse-media`,
      {
        vendorName: vendorData.name,
        country: vendorData.country,
        industry: vendorData.industry,
        keywords: vendorData.keywords || [],
        timeRange: '90d'
      },
      { timeout: 30000 }
    );
    
    connector.recordRequest(true, response.data.latency || 0);
    await connector.save();
    
    return response.data;
  }

  /**
   * Aggregate adverse media results
   */
  aggregateAdverseMediaResults(results) {
    const allAlerts = results.flatMap(r => r.alerts || []);
    const categories = [...new Set(allAlerts.flatMap(a => a.categories || []))];
    
    return {
      hasAlerts: allAlerts.length > 0,
      alertCount: allAlerts.length,
      alerts: allAlerts,
      categories,
      sentiment: this.calculateOverallSentiment(allAlerts),
      providers: results.map(r => r.provider),
      checkedAt: new Date()
    };
  }

  calculateOverallSentiment(alerts) {
    if (alerts.length === 0) return 'neutral';
    const sentiments = { negative: 0, neutral: 0, positive: 0 };
    alerts.forEach(a => {
      sentiments[a.sentiment || 'neutral']++;
    });
    return Object.entries(sentiments).sort((a, b) => b[1] - a[1])[0][0];
  }

  // =====================================================
  // CERTIFICATE & DOCUMENT VERIFICATION
  // =====================================================

  /**
   * Verify document/certificate authenticity
   */
  async verifyDocument(vendorId, documentData) {
    try {
      const response = await axios.post(
        `${this.ML_SERVICE_URL}/compliance/verify-document`,
        {
          documentType: documentData.type,
          documentNumber: documentData.number,
          issuingAuthority: documentData.issuingAuthority,
          issueDate: documentData.issueDate,
          expiryDate: documentData.expiryDate,
          country: documentData.country,
          extractedData: documentData.extractedData
        },
        { timeout: 30000 }
      );
      
      const verificationResult = response.data;
      
      // Create event based on verification result
      await this.processSignal({
        source: 'document_verification_service',
        eventType: verificationResult.isValid ? 'document_verified' : 'document_rejected',
        vendorId,
        attributeAffected: documentData.attributeName || documentData.type,
        newValue: {
          verified: verificationResult.isValid,
          confidence: verificationResult.confidence,
          issues: verificationResult.issues
        },
        confidence: verificationResult.confidence,
        rawPayload: verificationResult,
        provenance: {
          system: 'internal_verification',
          timestamp: new Date()
        }
      });
      
      return verificationResult;
    } catch (error) {
      console.error('Document verification error:', error);
      throw error;
    }
  }

  /**
   * Check certificate expiration dates
   */
  async checkCertificateExpiration(vendorId) {
    try {
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      if (!profile) {
        throw new Error('Vendor compliance profile not found');
      }
      
      const expiringCerts = [];
      const expiredCerts = [];
      const now = new Date();
      const warningDays = 30;
      
      for (const attr of profile.complianceAttributes) {
        if (attr.expiryDate) {
          const daysToExpiry = Math.ceil((attr.expiryDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry < 0) {
            expiredCerts.push({ ...attr.toObject(), daysExpired: Math.abs(daysToExpiry) });
            
            await this.processSignal({
              source: 'expiration_monitor',
              eventType: 'document_expired',
              vendorId,
              attributeAffected: attr.name,
              previousValue: { status: attr.status },
              newValue: { status: 'expired', daysExpired: Math.abs(daysToExpiry) },
              confidence: 1.0,
              provenance: { system: 'internal_monitor', timestamp: new Date() }
            });
            
          } else if (daysToExpiry <= warningDays) {
            expiringCerts.push({ ...attr.toObject(), daysToExpiry });
            
            await this.processSignal({
              source: 'expiration_monitor',
              eventType: 'document_expiring',
              vendorId,
              attributeAffected: attr.name,
              newValue: { daysToExpiry },
              confidence: 1.0,
              provenance: { system: 'internal_monitor', timestamp: new Date() }
            });
          }
        }
      }
      
      return { expiringCerts, expiredCerts };
    } catch (error) {
      console.error('Certificate expiration check error:', error);
      throw error;
    }
  }

  // =====================================================
  // KYC VERIFICATION
  // =====================================================

  /**
   * Verify KYC information
   */
  async verifyKYC(vendorId, kycData) {
    try {
      const connectors = await IntegrationConnector.getActiveByType('kyc_verification');
      
      const results = [];
      for (const connector of connectors) {
        try {
          const result = await this.callKYCAPI(connector, kycData);
          results.push({
            provider: connector.provider.name,
            ...result
          });
        } catch (error) {
          console.error(`KYC verification failed for ${connector.name}:`, error.message);
        }
      }
      
      const aggregated = this.aggregateKYCResults(results);
      
      // Update compliance profile
      const profile = await VendorComplianceProfile.findOne({ vendorId });
      if (profile) {
        profile.kycStatus = {
          verified: aggregated.verified,
          verifiedAt: new Date(),
          provider: results.map(r => r.provider).join(', '),
          details: aggregated.details,
          riskLevel: aggregated.riskLevel
        };
        await profile.save();
      }
      
      return aggregated;
    } catch (error) {
      console.error('KYC verification error:', error);
      throw error;
    }
  }

  async callKYCAPI(connector, kycData) {
    const response = await axios.post(
      `${this.ML_SERVICE_URL}/compliance/kyc-verify`,
      kycData,
      { timeout: 30000 }
    );
    
    connector.recordRequest(true, response.data.latency || 0);
    await connector.save();
    
    return response.data;
  }

  aggregateKYCResults(results) {
    const verified = results.every(r => r.verified);
    const riskLevels = ['low', 'medium', 'high'];
    const maxRisk = results.reduce((max, r) => {
      const idx = riskLevels.indexOf(r.riskLevel);
      return idx > riskLevels.indexOf(max) ? r.riskLevel : max;
    }, 'low');
    
    return {
      verified,
      riskLevel: maxRisk,
      details: results.map(r => ({ provider: r.provider, checks: r.checks })),
      providers: results.map(r => r.provider),
      checkedAt: new Date()
    };
  }

  // =====================================================
  // WEBHOOK HANDLING
  // =====================================================

  /**
   * Process incoming webhook from external systems
   */
  async processWebhook(connectorId, payload, signature) {
    try {
      const connector = await IntegrationConnector.findOne({ connectorId });
      if (!connector || !connector.isActive) {
        throw new Error('Invalid or inactive connector');
      }
      
      // Verify webhook signature
      if (connector.webhookConfig.secret) {
        const isValid = this.verifyWebhookSignature(
          payload,
          signature,
          connector.webhookConfig.secret,
          connector.webhookConfig.signatureAlgorithm
        );
        
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }
      
      // Map webhook payload to compliance event
      const mappedEvent = this.mapWebhookPayload(connector, payload);
      
      // Process as signal
      const event = await this.processSignal(mappedEvent);
      
      connector.recordRequest(true, 0, 1);
      await connector.save();
      
      return event;
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret, algorithm = 'sha256') {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  }

  /**
   * Map webhook payload to event structure
   */
  mapWebhookPayload(connector, payload) {
    const mapping = connector.responseMapping;
    
    return {
      source: connector.provider.name,
      eventType: this.extractField(payload, mapping.fieldMappings, 'eventType') || 'custom',
      vendorId: this.extractField(payload, mapping.fieldMappings, 'vendorId'),
      attributeAffected: this.extractField(payload, mapping.fieldMappings, 'attributeAffected'),
      newValue: this.extractField(payload, mapping.fieldMappings, 'newValue') || payload,
      rawPayload: payload,
      provenance: {
        system: connector.connectorId,
        timestamp: new Date(),
        webhookId: payload.webhookId || payload.id
      }
    };
  }

  extractField(payload, mappings, targetField) {
    const mapping = mappings?.find(m => m.targetField === targetField);
    if (!mapping) return null;
    
    const value = this.getNestedValue(payload, mapping.sourcePath);
    return this.transformValue(value, mapping.transform);
  }

  getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  transformValue(value, transform) {
    if (!transform || !value) return value;
    switch (transform) {
      case 'lowercase': return String(value).toLowerCase();
      case 'uppercase': return String(value).toUpperCase();
      case 'date': return new Date(value);
      case 'number': return Number(value);
      case 'boolean': return Boolean(value);
      default: return value;
    }
  }

  // =====================================================
  // BATCH PROCESSING
  // =====================================================

  /**
   * Run batch compliance checks for all vendors
   */
  async runBatchChecks(checkTypes = ['sanctions', 'adverse_media', 'expiration']) {
    try {
      const profiles = await VendorComplianceProfile.find({ isActive: true })
        .populate('vendorId');
      
      const results = {
        totalVendors: profiles.length,
        checksRun: 0,
        alerts: [],
        errors: []
      };
      
      for (const profile of profiles) {
        try {
          if (checkTypes.includes('sanctions')) {
            const sanctionsResult = await this.screenSanctions(
              profile.vendorId._id,
              profile.vendorId
            );
            if (sanctionsResult.hasHits) {
              results.alerts.push({
                vendorId: profile.vendorId._id,
                type: 'sanctions',
                details: sanctionsResult
              });
            }
            results.checksRun++;
          }
          
          if (checkTypes.includes('adverse_media')) {
            const mediaResult = await this.checkAdverseMedia(
              profile.vendorId._id,
              profile.vendorId
            );
            if (mediaResult.hasAlerts) {
              results.alerts.push({
                vendorId: profile.vendorId._id,
                type: 'adverse_media',
                details: mediaResult
              });
            }
            results.checksRun++;
          }
          
          if (checkTypes.includes('expiration')) {
            const expirationResult = await this.checkCertificateExpiration(
              profile.vendorId._id
            );
            if (expirationResult.expiredCerts.length > 0 || expirationResult.expiringCerts.length > 0) {
              results.alerts.push({
                vendorId: profile.vendorId._id,
                type: 'expiration',
                details: expirationResult
              });
            }
            results.checksRun++;
          }
        } catch (error) {
          results.errors.push({
            vendorId: profile.vendorId._id,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Batch checks error:', error);
      throw error;
    }
  }

  // =====================================================
  // EVENT STREAM
  // =====================================================

  /**
   * Get recent compliance events
   */
  async getRecentEvents(vendorId = null, limit = 100) {
    const query = vendorId ? { vendorId } : {};
    return ComplianceEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('vendorId', 'name companyName');
  }

  /**
   * Get unprocessed events
   */
  async getUnprocessedEvents(limit = 50) {
    return ComplianceEvent.find({ processingStatus: 'pending' })
      .sort({ timestamp: 1 })
      .limit(limit);
  }
}

module.exports = new ComplianceSignalLayer();
