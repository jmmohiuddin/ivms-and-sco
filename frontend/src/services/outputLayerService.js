/**
 * Output Layer Service
 * Handles Dashboard, Alerts, Reports, and Analytics operations
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
 * Dashboard Operations
 */
export const dashboardService = {
  // Get executive dashboard
  getExecutiveDashboard: async () => {
    const response = await axios.post(
      `${API_URL}/layers/output/dashboard`,
      { action: 'generateExecutive', data: {} },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get vendor dashboard
  getVendorDashboard: async (vendorId = null) => {
    const response = await axios.post(
      `${API_URL}/layers/output/dashboard`,
      { action: 'generateVendor', data: { vendorId } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get risk dashboard
  getRiskDashboard: async () => {
    const response = await axios.post(
      `${API_URL}/layers/output/dashboard`,
      { action: 'generateRisk', data: {} },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get custom dashboard
  getCustomDashboard: async (widgets) => {
    const response = await axios.post(
      `${API_URL}/layers/output/dashboard`,
      { action: 'generateCustom', data: { widgets } },
      getAuthHeaders()
    );
    return response.data;
  }
};

/**
 * Alert Operations
 */
export const alertService = {
  // Get active alerts
  getActiveAlerts: async () => {
    const response = await axios.post(
      `${API_URL}/layers/output/alerts`,
      { action: 'getActive', data: {} },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get alerts by type
  getAlertsByType: async (type) => {
    const response = await axios.post(
      `${API_URL}/layers/output/alerts`,
      { action: 'getActive', data: { type } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get alerts by severity
  getAlertsBySeverity: async (severity) => {
    const response = await axios.post(
      `${API_URL}/layers/output/alerts`,
      { action: 'getActive', data: { severity } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Acknowledge alert
  acknowledgeAlert: async (alertId) => {
    const response = await axios.post(
      `${API_URL}/layers/output/alerts/${alertId}/acknowledge`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  // Resolve alert
  resolveAlert: async (alertId, resolution) => {
    const response = await axios.post(
      `${API_URL}/layers/output/alerts/${alertId}/resolve`,
      { resolution },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get alert statistics
  getAlertStatistics: async () => {
    const response = await axios.get(
      `${API_URL}/layers/output/alerts/statistics`,
      getAuthHeaders()
    );
    return response.data;
  }
};

/**
 * Report Operations
 */
export const reportService = {
  // Generate executive summary report
  generateExecutiveSummary: async (period = 'monthly') => {
    const response = await axios.post(
      `${API_URL}/layers/output/reports`,
      { 
        action: 'generate', 
        data: { reportType: 'executive_summary', period } 
      },
      getAuthHeaders()
    );
    return response.data;
  },

  // Generate vendor performance report
  generateVendorPerformance: async (vendorId = null, period = 'monthly') => {
    const response = await axios.post(
      `${API_URL}/layers/output/reports`,
      { 
        action: 'generate', 
        data: { reportType: 'vendor_performance', vendorId, period } 
      },
      getAuthHeaders()
    );
    return response.data;
  },

  // Generate compliance report
  generateComplianceReport: async () => {
    const response = await axios.post(
      `${API_URL}/layers/output/reports`,
      { 
        action: 'generate', 
        data: { reportType: 'compliance_status' } 
      },
      getAuthHeaders()
    );
    return response.data;
  },

  // Generate financial report
  generateFinancialReport: async (period = 'monthly') => {
    const response = await axios.post(
      `${API_URL}/layers/output/reports`,
      { 
        action: 'generate', 
        data: { reportType: 'financial_overview', period } 
      },
      getAuthHeaders()
    );
    return response.data;
  },

  // Generate audit report
  generateAuditReport: async () => {
    const response = await axios.post(
      `${API_URL}/layers/output/reports`,
      { 
        action: 'generateAuditReport', 
        data: {} 
      },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get saved reports
  getSavedReports: async () => {
    const response = await axios.get(
      `${API_URL}/layers/output/reports`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Export report
  exportReport: async (reportId, format = 'pdf') => {
    const response = await axios.get(
      `${API_URL}/layers/output/reports/${reportId}/export?format=${format}`,
      {
        ...getAuthHeaders(),
        responseType: format === 'pdf' ? 'blob' : 'json'
      }
    );
    return response.data;
  }
};

/**
 * Analytics Operations
 */
export const analyticsService = {
  // Get spend analytics
  getSpendAnalytics: async (period = 'monthly') => {
    const response = await axios.post(
      `${API_URL}/layers/output/analytics`,
      { action: 'generateSpendAnalytics', data: { period } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get KPI data
  getKPIData: async () => {
    const response = await axios.post(
      `${API_URL}/layers/output/analytics`,
      { action: 'getKPIData', data: {} },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get trend analysis
  getTrendAnalysis: async (metric, period = 30) => {
    const response = await axios.post(
      `${API_URL}/layers/output/analytics`,
      { action: 'analyzeTrends', data: { metric, period } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get vendor comparison
  getVendorComparison: async (vendorIds) => {
    const response = await axios.post(
      `${API_URL}/layers/output/analytics`,
      { action: 'compareVendors', data: { vendorIds } },
      getAuthHeaders()
    );
    return response.data;
  },

  // Get predictive insights
  getPredictiveInsights: async () => {
    const response = await axios.post(
      `${API_URL}/layers/output/analytics`,
      { action: 'predictiveForecast', data: {} },
      getAuthHeaders()
    );
    return response.data;
  }
};

/**
 * Combined Output Layer Service
 */
export const outputLayerService = {
  // Get complete command center data
  getCommandCenterData: async () => {
    const [executive, alerts, kpis] = await Promise.all([
      dashboardService.getExecutiveDashboard(),
      alertService.getActiveAlerts(),
      analyticsService.getKPIData()
    ]);

    return {
      dashboard: executive.data,
      alerts: alerts.data,
      kpis: kpis.data,
      generatedAt: new Date().toISOString()
    };
  },

  // Get comprehensive vendor overview
  getVendorOverview: async (vendorId) => {
    const [dashboard, performance, alerts] = await Promise.all([
      dashboardService.getVendorDashboard(vendorId),
      reportService.generateVendorPerformance(vendorId),
      alertService.getAlertsByType('vendor')
    ]);

    return {
      vendorId,
      dashboard: dashboard.data,
      performance: performance.data,
      alerts: alerts.data?.filter(a => a.entityId === vendorId) || [],
      generatedAt: new Date().toISOString()
    };
  },

  // Get risk center data
  getRiskCenterData: async () => {
    const [riskDashboard, alerts, compliance] = await Promise.all([
      dashboardService.getRiskDashboard(),
      alertService.getAlertsBySeverity('critical'),
      reportService.generateComplianceReport()
    ]);

    return {
      risk: riskDashboard.data,
      criticalAlerts: alerts.data,
      compliance: compliance.data,
      generatedAt: new Date().toISOString()
    };
  }
};

export default {
  dashboard: dashboardService,
  alerts: alertService,
  reports: reportService,
  analytics: analyticsService,
  combined: outputLayerService
};
