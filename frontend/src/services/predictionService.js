/**
 * Prediction Service
 * Frontend API client for predictive analytics endpoints
 */

import api from './api';

const predictionService = {
  // ============================================================
  // SPEND FORECASTING
  // ============================================================

  /**
   * Get spend forecasts
   */
  getSpendForecasts: async (params = {}) => {
    const response = await api.get('/predictions/spend/forecasts', { params });
    return response.data;
  },

  /**
   * Generate new spend forecast
   */
  generateSpendForecast: async (forecastData) => {
    const response = await api.post('/predictions/spend/forecasts', forecastData);
    return response.data;
  },

  /**
   * Detect budget breach
   */
  detectBudgetBreach: async (params) => {
    const response = await api.post('/predictions/spend/budget-breach', params);
    return response.data;
  },

  /**
   * Get spend forecasts by dimension
   */
  getSpendByDimension: async (dimension, id) => {
    const response = await api.get(`/predictions/spend/by-${dimension}/${id}`);
    return response.data;
  },

  // ============================================================
  // RISK PREDICTION
  // ============================================================

  /**
   * Get all risk predictions
   */
  getRiskPredictions: async (params = {}) => {
    const response = await api.get('/predictions/risk', { params });
    return response.data;
  },

  /**
   * Generate risk prediction for a vendor
   */
  generateRiskPrediction: async (vendorData) => {
    const response = await api.post('/predictions/risk', vendorData);
    return response.data;
  },

  /**
   * Get risk prediction by vendor
   */
  getVendorRisk: async (vendorId) => {
    const response = await api.get(`/predictions/risk/vendor/${vendorId}`);
    return response.data;
  },

  /**
   * Get risk trajectory for a vendor
   */
  getRiskTrajectory: async (vendorId) => {
    const response = await api.get(`/predictions/risk/trajectory/${vendorId}`);
    return response.data;
  },

  /**
   * Batch predict vendor risks
   */
  batchPredictRisk: async (vendors) => {
    const response = await api.post('/predictions/risk/batch', { vendors });
    return response.data;
  },

  // ============================================================
  // INVOICE & CASHFLOW FORECASTING
  // ============================================================

  /**
   * Get invoice forecasts
   */
  getInvoiceForecasts: async (params = {}) => {
    const response = await api.get('/predictions/invoice/forecasts', { params });
    return response.data;
  },

  /**
   * Get cashflow forecasts
   */
  getCashflowForecasts: async (params = {}) => {
    const response = await api.get('/predictions/invoice/cashflow', { params });
    return response.data;
  },

  /**
   * Get payment strategy recommendations
   */
  getPaymentStrategy: async () => {
    const response = await api.get('/predictions/invoice/payment-strategy');
    return response.data;
  },

  // ============================================================
  // DEMAND FORECASTING
  // ============================================================

  /**
   * Get demand forecasts
   */
  getDemandForecasts: async (params = {}) => {
    const response = await api.get('/predictions/demand/forecasts', { params });
    return response.data;
  },

  /**
   * Generate demand forecast
   */
  generateDemandForecast: async (productData) => {
    const response = await api.post('/predictions/demand/forecasts', productData);
    return response.data;
  },

  /**
   * Get inventory recommendations
   */
  getInventoryRecommendations: async () => {
    const response = await api.get('/predictions/demand/inventory');
    return response.data;
  },

  /**
   * Get contract renewal predictions
   */
  getContractRenewals: async () => {
    const response = await api.get('/predictions/demand/contract-renewals');
    return response.data;
  },

  // ============================================================
  // WORKLOAD FORECASTING
  // ============================================================

  /**
   * Get workload forecasts
   */
  getWorkloadForecasts: async (params = {}) => {
    const response = await api.get('/predictions/workload/forecasts', { params });
    return response.data;
  },

  /**
   * Generate workload forecast
   */
  generateWorkloadForecast: async (teamData) => {
    const response = await api.post('/predictions/workload/forecasts', teamData);
    return response.data;
  },

  /**
   * Get workload spikes
   */
  getWorkloadSpikes: async () => {
    const response = await api.get('/predictions/workload/spikes');
    return response.data;
  },

  /**
   * Get workload recommendations
   */
  getWorkloadRecommendations: async () => {
    const response = await api.get('/predictions/workload/recommendations');
    return response.data;
  },

  // ============================================================
  // ANOMALY DETECTION
  // ============================================================

  /**
   * Get anomaly alerts
   */
  getAnomalyAlerts: async (params = {}) => {
    const response = await api.get('/predictions/anomalies', { params });
    return response.data;
  },

  /**
   * Run anomaly detection
   */
  detectAnomalies: async (data) => {
    const response = await api.post('/predictions/anomalies/detect', data);
    return response.data;
  },

  /**
   * Investigate an alert
   */
  investigateAlert: async (alertId, notes) => {
    const response = await api.post(`/predictions/anomalies/${alertId}/investigate`, { notes });
    return response.data;
  },

  /**
   * Resolve an alert
   */
  resolveAlert: async (alertId, resolution) => {
    const response = await api.post(`/predictions/anomalies/${alertId}/resolve`, resolution);
    return response.data;
  },

  /**
   * Get fraud score for an entity
   */
  getFraudScore: async (entityType, entityId) => {
    const response = await api.get(`/predictions/anomalies/fraud-score/${entityType}/${entityId}`);
    return response.data;
  },

  // ============================================================
  // COMPLIANCE PREDICTION
  // ============================================================

  /**
   * Get compliance predictions
   */
  getCompliancePredictions: async (params = {}) => {
    const response = await api.get('/predictions/compliance', { params });
    return response.data;
  },

  /**
   * Get lapse risk for vendors
   */
  getLapseRisk: async () => {
    const response = await api.get('/predictions/compliance/lapse-risk');
    return response.data;
  },

  // ============================================================
  // SCENARIO SIMULATION
  // ============================================================

  /**
   * Get all scenarios
   */
  getScenarios: async (params = {}) => {
    const response = await api.get('/predictions/scenarios', { params });
    return response.data;
  },

  /**
   * Get scenario by ID
   */
  getScenario: async (scenarioId) => {
    const response = await api.get(`/predictions/scenarios/${scenarioId}`);
    return response.data;
  },

  /**
   * Create new scenario
   */
  createScenario: async (scenarioData) => {
    const response = await api.post('/predictions/scenarios', scenarioData);
    return response.data;
  },

  /**
   * Update scenario
   */
  updateScenario: async (scenarioId, updates) => {
    const response = await api.put(`/predictions/scenarios/${scenarioId}`, updates);
    return response.data;
  },

  /**
   * Delete scenario
   */
  deleteScenario: async (scenarioId) => {
    const response = await api.delete(`/predictions/scenarios/${scenarioId}`);
    return response.data;
  },

  /**
   * Run scenario simulation
   */
  runScenario: async (scenarioId) => {
    const response = await api.post(`/predictions/scenarios/${scenarioId}/run`);
    return response.data;
  },

  /**
   * Compare multiple scenarios
   */
  compareScenarios: async (scenarioIds) => {
    const response = await api.post('/predictions/scenarios/compare', { scenarioIds });
    return response.data;
  },

  // ============================================================
  // DASHBOARD & ANALYTICS
  // ============================================================

  /**
   * Get prediction dashboard data
   */
  getDashboard: async () => {
    const response = await api.get('/predictions/dashboard');
    return response.data;
  },

  /**
   * Get vendor risk summary
   */
  getVendorRiskSummary: async () => {
    const response = await api.get('/predictions/dashboard/vendor-risks');
    return response.data;
  },

  /**
   * Get spend projections
   */
  getSpendProjections: async () => {
    const response = await api.get('/predictions/dashboard/spend-projections');
    return response.data;
  },

  // ============================================================
  // WEBHOOKS
  // ============================================================

  /**
   * Register webhook for alerts
   */
  registerWebhook: async (webhookConfig) => {
    const response = await api.post('/predictions/webhooks', webhookConfig);
    return response.data;
  },

  /**
   * Unregister webhook
   */
  unregisterWebhook: async (webhookId) => {
    const response = await api.delete(`/predictions/webhooks/${webhookId}`);
    return response.data;
  },

  // ============================================================
  // ML SERVICE ENDPOINTS (Direct calls)
  // ============================================================

  /**
   * Call ML service for spend forecast
   */
  mlForecastSpend: async (params) => {
    const response = await api.post('/predictions/ml/spend-forecast', params);
    return response.data;
  },

  /**
   * Call ML service for risk prediction
   */
  mlPredictRisk: async (vendorData) => {
    const response = await api.post('/predictions/ml/risk-predict', vendorData);
    return response.data;
  },

  /**
   * Call ML service for anomaly detection
   */
  mlDetectAnomalies: async (data) => {
    const response = await api.post('/predictions/ml/detect-anomalies', data);
    return response.data;
  },

  /**
   * Call ML service for demand forecast
   */
  mlForecastDemand: async (productData) => {
    const response = await api.post('/predictions/ml/demand-forecast', productData);
    return response.data;
  },

  /**
   * Call ML service for workload forecast
   */
  mlForecastWorkload: async (teamData) => {
    const response = await api.post('/predictions/ml/workload-forecast', teamData);
    return response.data;
  },

  /**
   * Call ML service for scenario simulation
   */
  mlRunScenario: async (scenarioConfig) => {
    const response = await api.post('/predictions/ml/run-scenario', scenarioConfig);
    return response.data;
  }
};

export default predictionService;
