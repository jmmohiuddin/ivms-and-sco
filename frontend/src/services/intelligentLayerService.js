/**
 * Intelligent Layer Service
 * Handles OCR, NLP, Fraud Detection, and Vendor Scoring operations
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5001';

// Get auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

/**
 * OCR Operations
 */
export const ocrService = {
  // Process invoice document
  processInvoice: async (imageFile) => {
    const formData = new FormData();
    formData.append('document', imageFile);
    formData.append('type', 'invoice');
    
    const response = await axios.post(
      `${API_URL}/layers/intelligent/ocr`,
      formData,
      {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  // Process certificate document
  processCertificate: async (imageFile, certificateType = 'general') => {
    const formData = new FormData();
    formData.append('document', imageFile);
    formData.append('type', 'certificate');
    formData.append('certificateType', certificateType);
    
    const response = await axios.post(
      `${API_URL}/layers/intelligent/ocr`,
      formData,
      {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  // Process contract document
  processContract: async (imageFile) => {
    const formData = new FormData();
    formData.append('document', imageFile);
    formData.append('type', 'contract');
    
    const response = await axios.post(
      `${API_URL}/layers/intelligent/ocr`,
      formData,
      {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  // Validate document quality
  validateDocument: async (imageFile) => {
    const formData = new FormData();
    formData.append('document', imageFile);
    
    const response = await axios.post(
      `${API_URL}/layers/intelligent/ocr/validate`,
      formData,
      {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }
};

/**
 * NLP Operations
 */
export const nlpService = {
  // Analyze contract text
  analyzeContract: async (contractId) => {
    const response = await axios.post(
      `${API_URL}/layers/intelligent/nlp`,
      { action: 'analyzeContract', data: { contractId } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Extract key clauses from contract
  extractClauses: async (text) => {
    const response = await axios.post(
      `${ML_API_URL}/nlp/extract-clauses`,
      { text },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  // Assess contract risk
  assessContractRisk: async (text) => {
    const response = await axios.post(
      `${ML_API_URL}/nlp/assess-risk`,
      { text },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  // Analyze sentiment
  analyzeSentiment: async (text) => {
    const response = await axios.post(
      `${ML_API_URL}/nlp/sentiment`,
      { text },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  }
};

/**
 * Fraud Detection Operations
 */
export const fraudService = {
  // Analyze single invoice for fraud
  analyzeInvoice: async (invoiceData, historicalData = [], vendorData = null) => {
    const response = await axios.post(
      `${API_URL}/layers/intelligent/fraud`,
      {
        action: 'analyzeInvoice',
        data: { invoiceData, historicalData, vendorData }
      },
      getAuthHeaders()
    );
    return response.data;
  },

  // Batch analyze invoices
  batchAnalyze: async (invoices, historicalData = []) => {
    const response = await axios.post(
      `${ML_API_URL}/fraud/batch-analyze`,
      { invoices, historical_data: historicalData },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  // Get fraud statistics
  getStatistics: async (historicalData = []) => {
    const response = await axios.post(
      `${ML_API_URL}/fraud/statistics`,
      { historical_data: historicalData },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  // Train fraud detection model
  trainModel: async (historicalData) => {
    const response = await axios.post(
      `${ML_API_URL}/fraud/train`,
      { historical_data: historicalData },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  }
};

/**
 * Vendor Scoring Operations
 */
export const vendorScoringService = {
  // Calculate vendor score
  calculateScore: async (vendorId) => {
    const response = await axios.post(
      `${API_URL}/layers/intelligent/vendor-score`,
      { action: 'calculateScore', data: { vendorId } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get vendor performance trends
  getPerformanceTrends: async (vendorId, period = 30) => {
    const response = await axios.post(
      `${API_URL}/layers/intelligent/vendor-score`,
      { action: 'calculateScore', data: { vendorId, includeTrends: true, period } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Compare vendors
  compareVendors: async (vendorIds) => {
    const scores = await Promise.all(
      vendorIds.map(id => vendorScoringService.calculateScore(id))
    );
    return scores;
  }
};

/**
 * Risk Assessment Operations
 */
export const riskAssessmentService = {
  // Assess vendor risk
  assessVendorRisk: async (vendorId) => {
    const response = await axios.post(
      `${API_URL}/layers/intelligent/risk`,
      { action: 'assessVendor', data: { vendorId } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get portfolio risk overview
  getPortfolioRisk: async () => {
    const response = await axios.post(
      `${API_URL}/layers/intelligent/risk`,
      { action: 'assessPortfolio', data: {} },
      getAuthHeaders()
    );
    return response.data;
  }
};

/**
 * Anomaly Detection Operations
 */
export const anomalyService = {
  // Detect anomalies in data
  detectAnomalies: async (dataType, timeSeries, sensitivity = 'medium') => {
    const response = await axios.post(
      `${ML_API_URL}/detect/anomalies`,
      {
        data_type: dataType,
        time_series: timeSeries,
        sensitivity
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  // Get anomaly summary
  getAnomalySummary: async () => {
    const response = await axios.get(
      `${API_URL}/layers/intelligent/anomaly/summary`,
      getAuthHeaders()
    );
    return response.data;
  }
};

/**
 * Combined Intelligent Layer Operations
 */
export const intelligentLayerService = {
  // Full vendor analysis (combined)
  analyzeVendorFully: async (vendorId) => {
    const [score, risk] = await Promise.all([
      vendorScoringService.calculateScore(vendorId),
      riskAssessmentService.assessVendorRisk(vendorId)
    ]);
    
    return {
      vendorId,
      score: score.data,
      risk: risk.data,
      analyzedAt: new Date().toISOString()
    };
  },

  // Process document with full analysis
  processDocumentWithAnalysis: async (file, type) => {
    let ocrResult;
    
    switch (type) {
      case 'invoice':
        ocrResult = await ocrService.processInvoice(file);
        break;
      case 'certificate':
        ocrResult = await ocrService.processCertificate(file);
        break;
      case 'contract':
        ocrResult = await ocrService.processContract(file);
        break;
      default:
        throw new Error('Unknown document type');
    }
    
    // If contract, also analyze with NLP
    if (type === 'contract' && ocrResult.data?.extractedText) {
      const nlpAnalysis = await nlpService.analyzeContract(ocrResult.data.extractedText);
      return {
        ...ocrResult,
        nlpAnalysis
      };
    }
    
    // If invoice, also check for fraud
    if (type === 'invoice' && ocrResult.data) {
      const fraudAnalysis = await fraudService.analyzeInvoice(ocrResult.data);
      return {
        ...ocrResult,
        fraudAnalysis
      };
    }
    
    return ocrResult;
  }
};

export default {
  ocr: ocrService,
  nlp: nlpService,
  fraud: fraudService,
  vendorScoring: vendorScoringService,
  riskAssessment: riskAssessmentService,
  anomaly: anomalyService,
  combined: intelligentLayerService
};
