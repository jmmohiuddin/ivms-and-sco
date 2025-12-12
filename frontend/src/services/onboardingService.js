/**
 * Onboarding Service
 * API communication for AI-Driven Vendor Onboarding
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:5001';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/onboarding`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ML Service axios instance
const mlApi = axios.create({
  baseURL: ML_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const onboardingService = {
  // ============================================
  // INTAKE API
  // ============================================
  
  /**
   * Create onboarding from self-service portal
   */
  createFromPortal: async (vendorData, documents = []) => {
    const response = await api.post('/portal', { vendorData, documents });
    return response.data;
  },

  /**
   * Create onboarding from invite
   */
  createFromInvite: async (inviteToken, vendorData) => {
    const response = await api.post('/invite', { inviteToken, vendorData });
    return response.data;
  },

  /**
   * Bulk upload vendors via CSV
   */
  bulkUpload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Get dynamic form configuration
   */
  getFormConfig: async (vendorType, country, riskProfile) => {
    const response = await api.get('/form-config', {
      params: { vendorType, country, riskProfile }
    });
    return response.data;
  },

  /**
   * Send vendor invitation
   */
  sendInvite: async (email, vendorName, vendorType, message) => {
    const response = await api.post('/invite/send', { email, vendorName, vendorType, message });
    return response.data;
  },

  // ============================================
  // CASE MANAGEMENT API
  // ============================================

  /**
   * Get all onboarding cases
   */
  getCases: async (filters = {}) => {
    const response = await api.get('/cases', { params: filters });
    return response.data;
  },

  /**
   * Get single case by ID
   */
  getCase: async (caseId) => {
    const response = await api.get(`/cases/${caseId}`);
    return response.data;
  },

  /**
   * Update case
   */
  updateCase: async (caseId, updates) => {
    const response = await api.put(`/cases/${caseId}`, updates);
    return response.data;
  },

  /**
   * Submit case for review
   */
  submitCase: async (caseId) => {
    const response = await api.post(`/cases/${caseId}/submit`);
    return response.data;
  },

  /**
   * Assign case to reviewer
   */
  assignCase: async (caseId, assigneeId, notes) => {
    const response = await api.post(`/cases/${caseId}/assign`, { assigneeId, notes });
    return response.data;
  },

  /**
   * Get case timeline
   */
  getCaseTimeline: async (caseId) => {
    const response = await api.get(`/cases/${caseId}/timeline`);
    return response.data;
  },

  /**
   * Add message to case
   */
  addMessage: async (caseId, message) => {
    const response = await api.post(`/cases/${caseId}/message`, { message });
    return response.data;
  },

  // ============================================
  // DOCUMENT API
  // ============================================

  /**
   * Upload document to case
   */
  uploadDocument: async (caseId, file, documentType, documentCategory) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    formData.append('documentCategory', documentCategory);
    
    const response = await api.post(`/cases/${caseId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Get documents for case
   */
  getCaseDocuments: async (caseId) => {
    const response = await api.get(`/cases/${caseId}/documents`);
    return response.data;
  },

  /**
   * Get single document
   */
  getDocument: async (documentId) => {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  },

  /**
   * Process document (OCR + extraction)
   */
  processDocument: async (documentId) => {
    const response = await api.post(`/documents/${documentId}/process`);
    return response.data;
  },

  /**
   * Verify document manually
   */
  verifyDocument: async (documentId, status, notes) => {
    const response = await api.post(`/documents/${documentId}/verify`, { status, notes });
    return response.data;
  },

  /**
   * Update extracted data
   */
  updateExtractedData: async (documentId, fieldUpdates) => {
    const response = await api.put(`/documents/${documentId}/extracted-data`, { fieldUpdates });
    return response.data;
  },

  // ============================================
  // AI/ML PROCESSING API
  // ============================================

  /**
   * Process case (full AI pipeline)
   */
  processCase: async (caseId) => {
    const response = await api.post(`/cases/${caseId}/process`);
    return response.data;
  },

  /**
   * Analyze contract
   */
  analyzeContract: async (caseId, documentId) => {
    const response = await api.post(`/cases/${caseId}/analyze-contract`, { documentId });
    return response.data;
  },

  /**
   * Run sanctions check
   */
  runSanctionsCheck: async (caseId) => {
    const response = await api.post(`/cases/${caseId}/sanctions-check`);
    return response.data;
  },

  /**
   * Get risk score
   */
  getRiskScore: async (caseId) => {
    const response = await api.get(`/cases/${caseId}/risk`);
    return response.data;
  },

  /**
   * Calculate risk score
   */
  calculateRiskScore: async (caseId) => {
    const response = await api.post(`/cases/${caseId}/risk/calculate`);
    return response.data;
  },

  /**
   * Run fraud check
   */
  runFraudCheck: async (caseId) => {
    const response = await api.post(`/cases/${caseId}/fraud-check`);
    return response.data;
  },

  // ============================================
  // APPROVAL API
  // ============================================

  /**
   * Approve case
   */
  approveCase: async (caseId, reason, conditions = []) => {
    const response = await api.post(`/cases/${caseId}/approve`, { reason, conditions });
    return response.data;
  },

  /**
   * Reject case
   */
  rejectCase: async (caseId, reason) => {
    const response = await api.post(`/cases/${caseId}/reject`, { reason });
    return response.data;
  },

  /**
   * Request additional information
   */
  requestInfo: async (caseId, requestedItems, message) => {
    const response = await api.post(`/cases/${caseId}/request-info`, { requestedItems, message });
    return response.data;
  },

  /**
   * Escalate case
   */
  escalateCase: async (caseId, reason, escalateTo) => {
    const response = await api.post(`/cases/${caseId}/escalate`, { reason, escalateTo });
    return response.data;
  },

  /**
   * Get case approvals
   */
  getCaseApprovals: async (caseId) => {
    const response = await api.get(`/cases/${caseId}/approvals`);
    return response.data;
  },

  // ============================================
  // EVIDENCE & AUDIT API
  // ============================================

  /**
   * Generate evidence bundle
   */
  generateEvidenceBundle: async (caseId) => {
    const response = await api.post(`/cases/${caseId}/evidence-bundle`);
    return response.data;
  },

  /**
   * Get evidence bundle
   */
  getEvidenceBundle: async (bundleId) => {
    const response = await api.get(`/evidence/${bundleId}`);
    return response.data;
  },

  /**
   * Export evidence bundle
   */
  exportEvidenceBundle: async (bundleId, format = 'pdf') => {
    const response = await api.get(`/evidence/${bundleId}/export`, { params: { format } });
    return response.data;
  },

  /**
   * Get audit trail
   */
  getAuditTrail: async (caseId) => {
    const response = await api.get(`/cases/${caseId}/audit-trail`);
    return response.data;
  },

  // ============================================
  // QUEUE API
  // ============================================

  /**
   * Get review queue
   */
  getReviewQueue: async (filters = {}) => {
    const response = await api.get('/queue', { params: filters });
    return response.data;
  },

  /**
   * Get my queue
   */
  getMyQueue: async (filters = {}) => {
    const response = await api.get('/my-queue', { params: filters });
    return response.data;
  },

  /**
   * Claim case from queue
   */
  claimCase: async (caseId) => {
    const response = await api.post(`/queue/claim/${caseId}`);
    return response.data;
  },

  // ============================================
  // ANALYTICS API
  // ============================================

  /**
   * Get onboarding analytics
   */
  getAnalytics: async (startDate, endDate) => {
    const response = await api.get('/analytics', { params: { startDate, endDate } });
    return response.data;
  },

  /**
   * Get SLA report
   */
  getSLAReport: async () => {
    const response = await api.get('/sla-report');
    return response.data;
  },

  /**
   * Get vendor status (public facing)
   */
  getVendorStatus: async (vendorId) => {
    const response = await api.get(`/vendor-status/${vendorId}`);
    return response.data;
  },

  // ============================================
  // ML SERVICE DIRECT API (for real-time processing)
  // ============================================

  /**
   * Calculate risk score via ML service
   */
  mlCalculateRisk: async (vendorData) => {
    const response = await mlApi.post('/onboarding/risk-score', { vendorData });
    return response.data;
  },

  /**
   * Verify document via ML service
   */
  mlVerifyDocument: async (documentData) => {
    const response = await mlApi.post('/onboarding/verify-document', { documentData });
    return response.data;
  },

  /**
   * Run sanctions check via ML service
   */
  mlSanctionsCheck: async (entityData) => {
    const response = await mlApi.post('/onboarding/sanctions-check', { entityData });
    return response.data;
  },

  /**
   * Process document via ML service
   */
  mlProcessDocument: async (imageBase64, documentType, vendorData = {}) => {
    const response = await mlApi.post('/onboarding/process-document', {
      image_base64: imageBase64,
      documentType,
      vendorData
    });
    return response.data;
  },

  /**
   * Full assessment via ML service
   */
  mlFullAssessment: async (vendorData, documents, entityData) => {
    const response = await mlApi.post('/onboarding/full-assessment', {
      vendorData,
      documents,
      entityData
    });
    return response.data;
  }
};

export default onboardingService;
