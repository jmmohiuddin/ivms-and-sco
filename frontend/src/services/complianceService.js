/**
 * Compliance Service
 * Frontend API client for continuous compliance management
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const complianceApi = axios.create({
  baseURL: `${API_BASE_URL}/compliance`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
complianceApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =====================================================
// COMPLIANCE PROFILE APIs
// =====================================================

export const getProfiles = async (params = {}) => {
  const response = await complianceApi.get('/profiles', { params });
  return response.data;
};

export const getProfileByVendor = async (vendorId) => {
  const response = await complianceApi.get(`/profiles/${vendorId}`);
  return response.data;
};

export const createProfile = async (profileData) => {
  const response = await complianceApi.post('/profiles', profileData);
  return response.data;
};

export const updateProfile = async (vendorId, updates) => {
  const response = await complianceApi.put(`/profiles/${vendorId}`, updates);
  return response.data;
};

export const getProfileSummary = async (vendorId) => {
  const response = await complianceApi.get(`/profiles/${vendorId}/summary`);
  return response.data;
};

export const getRiskScore = async (vendorId) => {
  const response = await complianceApi.get(`/profiles/${vendorId}/risk`);
  return response.data;
};

export const recalculateRisk = async (vendorId) => {
  const response = await complianceApi.post(`/profiles/${vendorId}/risk/recalculate`);
  return response.data;
};

export const getRiskExplanation = async (vendorId) => {
  const response = await complianceApi.get(`/profiles/${vendorId}/risk/explanation`);
  return response.data;
};

export const getAttributes = async (vendorId) => {
  const response = await complianceApi.get(`/profiles/${vendorId}/attributes`);
  return response.data;
};

export const updateAttribute = async (vendorId, attributeName, data) => {
  const response = await complianceApi.put(`/profiles/${vendorId}/attributes/${attributeName}`, data);
  return response.data;
};

export const getSignalHistory = async (vendorId) => {
  const response = await complianceApi.get(`/profiles/${vendorId}/signals`);
  return response.data;
};

export const getEnforcementHistory = async (vendorId) => {
  const response = await complianceApi.get(`/profiles/${vendorId}/enforcements`);
  return response.data;
};

export const createSnapshot = async (vendorId, reason) => {
  const response = await complianceApi.post(`/profiles/${vendorId}/snapshot`, { reason });
  return response.data;
};

// =====================================================
// POLICY APIs
// =====================================================

export const getPolicies = async (params = {}) => {
  const response = await complianceApi.get('/policies', { params });
  return response.data;
};

export const getPolicyById = async (policyId) => {
  const response = await complianceApi.get(`/policies/${policyId}`);
  return response.data;
};

export const createPolicy = async (policyData) => {
  const response = await complianceApi.post('/policies', policyData);
  return response.data;
};

export const updatePolicy = async (policyId, updates) => {
  const response = await complianceApi.put(`/policies/${policyId}`, updates);
  return response.data;
};

export const deletePolicy = async (policyId) => {
  const response = await complianceApi.delete(`/policies/${policyId}`);
  return response.data;
};

export const testPolicy = async (policyId, vendorId) => {
  const response = await complianceApi.post(`/policies/${policyId}/test`, { vendorId });
  return response.data;
};

export const evaluatePolicies = async (vendorId) => {
  const response = await complianceApi.post(`/policies/evaluate/${vendorId}`);
  return response.data;
};

export const requestPolicyApproval = async (policyId, approvers) => {
  const response = await complianceApi.post(`/policies/${policyId}/approval/request`, { approvers });
  return response.data;
};

export const decidePolicyApproval = async (policyId, decision, comments) => {
  const response = await complianceApi.post(`/policies/${policyId}/approval/decision`, { decision, comments });
  return response.data;
};

export const getPolicyVersions = async (policyId) => {
  const response = await complianceApi.get(`/policies/${policyId}/versions`);
  return response.data;
};

export const clonePolicy = async (policyId) => {
  const response = await complianceApi.post(`/policies/${policyId}/clone`);
  return response.data;
};

// =====================================================
// EVENT APIs
// =====================================================

export const getEvents = async (params = {}) => {
  const response = await complianceApi.get('/events', { params });
  return response.data;
};

export const getEventById = async (eventId) => {
  const response = await complianceApi.get(`/events/${eventId}`);
  return response.data;
};

export const createEvent = async (eventData) => {
  const response = await complianceApi.post('/events', eventData);
  return response.data;
};

export const processEvents = async () => {
  const response = await complianceApi.post('/events/process');
  return response.data;
};

export const getEventStats = async () => {
  const response = await complianceApi.get('/events/stats');
  return response.data;
};

// =====================================================
// SIGNAL APIs
// =====================================================

export const ingestSignal = async (signalData) => {
  const response = await complianceApi.post('/signals', signalData);
  return response.data;
};

export const screenSanctions = async (vendorId, vendorData) => {
  const response = await complianceApi.post(`/signals/${vendorId}/sanctions`, vendorData);
  return response.data;
};

export const checkAdverseMedia = async (vendorId, vendorData) => {
  const response = await complianceApi.post(`/signals/${vendorId}/adverse-media`, vendorData);
  return response.data;
};

export const verifyDocument = async (vendorId, documentData, file) => {
  const formData = new FormData();
  if (file) {
    formData.append('document', file);
  }
  Object.keys(documentData).forEach(key => {
    formData.append(key, documentData[key]);
  });
  
  const response = await complianceApi.post(`/signals/${vendorId}/verify-document`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const checkExpiration = async (vendorId) => {
  const response = await complianceApi.post(`/signals/${vendorId}/check-expiration`);
  return response.data;
};

export const runBatchChecks = async (checkTypes) => {
  const response = await complianceApi.post('/signals/batch-check', { checkTypes });
  return response.data;
};

// =====================================================
// REMEDIATION CASE APIs
// =====================================================

export const getCases = async (params = {}) => {
  const response = await complianceApi.get('/cases', { params });
  return response.data;
};

export const getCaseByNumber = async (caseNumber) => {
  const response = await complianceApi.get(`/cases/${caseNumber}`);
  return response.data;
};

export const createCase = async (caseData) => {
  const response = await complianceApi.post('/cases', caseData);
  return response.data;
};

export const updateCaseStatus = async (caseNumber, status, reason) => {
  const response = await complianceApi.put(`/cases/${caseNumber}/status`, { status, reason });
  return response.data;
};

export const addCaseAction = async (caseNumber, actionData) => {
  const response = await complianceApi.post(`/cases/${caseNumber}/actions`, actionData);
  return response.data;
};

export const completeAction = async (caseNumber, actionId, completionData) => {
  const response = await complianceApi.put(`/cases/${caseNumber}/actions/${actionId}/complete`, completionData);
  return response.data;
};

export const escalateCase = async (caseNumber, reason) => {
  const response = await complianceApi.post(`/cases/${caseNumber}/escalate`, { reason });
  return response.data;
};

export const resolveCase = async (caseNumber, resolutionData) => {
  const response = await complianceApi.post(`/cases/${caseNumber}/resolve`, resolutionData);
  return response.data;
};

export const getCaseSLA = async (caseNumber) => {
  const response = await complianceApi.get(`/cases/${caseNumber}/sla`);
  return response.data;
};

export const notifyVendor = async (caseNumber, notificationData) => {
  const response = await complianceApi.post(`/cases/${caseNumber}/notify-vendor`, notificationData);
  return response.data;
};

export const recordVendorResponse = async (caseNumber, responseData) => {
  const response = await complianceApi.post(`/cases/${caseNumber}/vendor-response`, responseData);
  return response.data;
};

export const getCasesAtRisk = async () => {
  const response = await complianceApi.get('/cases/status/at-risk');
  return response.data;
};

export const getOverdueCases = async () => {
  const response = await complianceApi.get('/cases/status/overdue');
  return response.data;
};

export const autoEscalate = async () => {
  const response = await complianceApi.post('/cases/auto-escalate');
  return response.data;
};

// =====================================================
// VALIDATION APIs
// =====================================================

export const requestValidation = async (validationData) => {
  const response = await complianceApi.post('/validation/request', validationData);
  return response.data;
};

export const submitValidation = async (caseNumber, validationDecision) => {
  const response = await complianceApi.post(`/validation/${caseNumber}/submit`, validationDecision);
  return response.data;
};

export const getPendingValidations = async () => {
  const response = await complianceApi.get('/validation/pending');
  return response.data;
};

// =====================================================
// ENFORCEMENT APIs
// =====================================================

export const applyEnforcement = async (vendorId, enforcementData) => {
  const response = await complianceApi.post(`/enforcement/${vendorId}`, enforcementData);
  return response.data;
};

export const liftRestrictions = async (vendorId, restrictionTypes, reason) => {
  const response = await complianceApi.post(`/enforcement/${vendorId}/lift`, { restrictionTypes, reason });
  return response.data;
};

export const getRestrictions = async (vendorId) => {
  const response = await complianceApi.get(`/enforcement/${vendorId}/restrictions`);
  return response.data;
};

// =====================================================
// CONTRACT ANALYSIS APIs
// =====================================================

export const analyzeContract = async (contractText, vendorId, file) => {
  const formData = new FormData();
  if (file) {
    formData.append('contract', file);
  }
  if (contractText) {
    formData.append('contractText', contractText);
  }
  if (vendorId) {
    formData.append('vendorId', vendorId);
  }
  
  const response = await complianceApi.post('/contracts/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const extractObligations = async (contractText, file) => {
  const formData = new FormData();
  if (file) {
    formData.append('contract', file);
  }
  if (contractText) {
    formData.append('contractText', contractText);
  }
  
  const response = await complianceApi.post('/contracts/extract-obligations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// =====================================================
// AUDIT BUNDLE APIs
// =====================================================

export const getAuditBundles = async (params = {}) => {
  const response = await complianceApi.get('/audits', { params });
  return response.data;
};

export const getAuditBundleById = async (bundleId) => {
  const response = await complianceApi.get(`/audits/${bundleId}`);
  return response.data;
};

export const generateAuditBundle = async (vendorId, options = {}) => {
  const response = await complianceApi.post(`/audits/generate/${vendorId}`, options);
  return response.data;
};

export const exportAuditBundle = async (bundleId, format = 'pdf') => {
  const response = await complianceApi.get(`/audits/${bundleId}/export`, { params: { format } });
  return response.data;
};

export const sealAuditBundle = async (bundleId) => {
  const response = await complianceApi.post(`/audits/${bundleId}/seal`);
  return response.data;
};

export const verifyBundleIntegrity = async (bundleId) => {
  const response = await complianceApi.get(`/audits/${bundleId}/verify`);
  return response.data;
};

// =====================================================
// CONNECTOR APIs
// =====================================================

export const getConnectors = async (params = {}) => {
  const response = await complianceApi.get('/connectors', { params });
  return response.data;
};

export const getConnectorById = async (connectorId) => {
  const response = await complianceApi.get(`/connectors/${connectorId}`);
  return response.data;
};

export const createConnector = async (connectorData) => {
  const response = await complianceApi.post('/connectors', connectorData);
  return response.data;
};

export const updateConnector = async (connectorId, updates) => {
  const response = await complianceApi.put(`/connectors/${connectorId}`, updates);
  return response.data;
};

export const deleteConnector = async (connectorId) => {
  const response = await complianceApi.delete(`/connectors/${connectorId}`);
  return response.data;
};

export const testConnector = async (connectorId) => {
  const response = await complianceApi.post(`/connectors/${connectorId}/test`);
  return response.data;
};

export const getConnectorHealth = async (connectorId) => {
  const response = await complianceApi.get(`/connectors/${connectorId}/health`);
  return response.data;
};

export const getConnectorsHealthSummary = async () => {
  const response = await complianceApi.get('/connectors/health/summary');
  return response.data;
};

// =====================================================
// DASHBOARD & REPORTING APIs
// =====================================================

export const getDashboard = async () => {
  const response = await complianceApi.get('/dashboard');
  return response.data;
};

export const getWorkflowMetrics = async () => {
  const response = await complianceApi.get('/dashboard/workflows');
  return response.data;
};

export const getSLAMetrics = async (startDate, endDate) => {
  const response = await complianceApi.get('/dashboard/sla', { params: { startDate, endDate } });
  return response.data;
};

export const getComplianceTrends = async (days = 30) => {
  const response = await complianceApi.get('/dashboard/trends', { params: { days } });
  return response.data;
};

export const getRiskDistribution = async () => {
  const response = await complianceApi.get('/dashboard/risk-distribution');
  return response.data;
};

export const generateReport = async (options) => {
  const response = await complianceApi.post('/reports/generate', options);
  return response.data;
};

export const getReport = async (reportId) => {
  const response = await complianceApi.get(`/reports/${reportId}`);
  return response.data;
};

// =====================================================
// ANOMALY DETECTION APIs
// =====================================================

export const detectAnomalies = async (vendorId) => {
  const response = await complianceApi.get(`/anomalies/${vendorId}`);
  return response.data;
};

export const getSystemAnomalies = async () => {
  const response = await complianceApi.get('/anomalies');
  return response.data;
};

// =====================================================
// BATCH OPERATION APIs
// =====================================================

export const batchRiskCalculation = async () => {
  const response = await complianceApi.post('/batch/risk-calculation');
  return response.data;
};

export const batchPolicyEvaluation = async () => {
  const response = await complianceApi.post('/batch/policy-evaluation');
  return response.data;
};

export const processWorkflows = async () => {
  const response = await complianceApi.post('/batch/process-workflows');
  return response.data;
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export const getTierColor = (tier) => {
  const colors = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    critical: 'red'
  };
  return colors[tier] || 'gray';
};

export const getStatusColor = (status) => {
  const colors = {
    valid: 'green',
    expired: 'red',
    expiring: 'orange',
    pending: 'yellow',
    invalid: 'red',
    missing: 'gray'
  };
  return colors[status] || 'gray';
};

export const getSeverityColor = (severity) => {
  const colors = {
    low: 'blue',
    medium: 'yellow',
    high: 'orange',
    critical: 'red'
  };
  return colors[severity] || 'gray';
};

export const formatSLATime = (deadline) => {
  const now = new Date();
  const sla = new Date(deadline);
  const diff = sla - now;
  
  if (diff < 0) {
    return { text: 'Overdue', color: 'red', isOverdue: true };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return { text: `${days}d ${hours % 24}h`, color: days < 2 ? 'orange' : 'green', isOverdue: false };
  }
  
  return { text: `${hours}h`, color: hours < 24 ? 'orange' : 'green', isOverdue: false };
};

export default {
  // Profiles
  getProfiles,
  getProfileByVendor,
  createProfile,
  updateProfile,
  getProfileSummary,
  getRiskScore,
  recalculateRisk,
  getRiskExplanation,
  getAttributes,
  updateAttribute,
  getSignalHistory,
  getEnforcementHistory,
  createSnapshot,
  
  // Policies
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  testPolicy,
  evaluatePolicies,
  requestPolicyApproval,
  decidePolicyApproval,
  getPolicyVersions,
  clonePolicy,
  
  // Events
  getEvents,
  getEventById,
  createEvent,
  processEvents,
  getEventStats,
  
  // Signals
  ingestSignal,
  screenSanctions,
  checkAdverseMedia,
  verifyDocument,
  checkExpiration,
  runBatchChecks,
  
  // Cases
  getCases,
  getCaseByNumber,
  createCase,
  updateCaseStatus,
  addCaseAction,
  completeAction,
  escalateCase,
  resolveCase,
  getCaseSLA,
  notifyVendor,
  recordVendorResponse,
  getCasesAtRisk,
  getOverdueCases,
  autoEscalate,
  
  // Validation
  requestValidation,
  submitValidation,
  getPendingValidations,
  
  // Enforcement
  applyEnforcement,
  liftRestrictions,
  getRestrictions,
  
  // Contracts
  analyzeContract,
  extractObligations,
  
  // Audits
  getAuditBundles,
  getAuditBundleById,
  generateAuditBundle,
  exportAuditBundle,
  sealAuditBundle,
  verifyBundleIntegrity,
  
  // Connectors
  getConnectors,
  getConnectorById,
  createConnector,
  updateConnector,
  deleteConnector,
  testConnector,
  getConnectorHealth,
  getConnectorsHealthSummary,
  
  // Dashboard
  getDashboard,
  getWorkflowMetrics,
  getSLAMetrics,
  getComplianceTrends,
  getRiskDistribution,
  generateReport,
  getReport,
  
  // Anomalies
  detectAnomalies,
  getSystemAnomalies,
  
  // Batch
  batchRiskCalculation,
  batchPolicyEvaluation,
  processWorkflows,
  
  // Utils
  getTierColor,
  getStatusColor,
  getSeverityColor,
  formatSLATime
};
