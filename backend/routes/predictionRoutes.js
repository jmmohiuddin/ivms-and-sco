/**
 * Prediction Routes
 * REST API endpoints for predictive analytics
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/firebaseAuth');
const predictionController = require('../controllers/predictionController');

// Apply auth middleware to all routes
router.use(protect);

// ==================== DASHBOARD ====================

// GET /api/prediction/dashboard - Get predictive insights dashboard
router.get('/dashboard', predictionController.getDashboard);

// GET /api/prediction/alerts - Get active prediction alerts
router.get('/alerts', predictionController.getAlerts);

// ==================== SPEND FORECASTING ====================

// POST /api/prediction/forecast/spend - Generate spend forecast
router.post('/forecast/spend', authorize('admin', 'manager'), predictionController.generateSpendForecast);

// GET /api/prediction/forecast/spend - Get spend forecast
router.get('/forecast/spend', predictionController.getSpendForecast);

// GET /api/prediction/forecast/spend/:forecastId - Get specific forecast
router.get('/forecast/spend/:forecastId', predictionController.getSpendForecastById);

// GET /api/prediction/forecast/spend/vendor/:vendorId - Get vendor spend forecast
router.get('/forecast/spend/vendor/:vendorId', predictionController.getVendorSpendForecast);

// ==================== VENDOR RISK PREDICTION ====================

// POST /api/prediction/risk/vendor/:vendorId - Generate risk prediction
router.post('/risk/vendor/:vendorId', authorize('admin', 'manager'), predictionController.generateRiskPrediction);

// GET /api/prediction/risk/vendor/:vendorId - Get vendor risk
router.get('/risk/vendor/:vendorId', predictionController.getVendorRisk);

// GET /api/prediction/risk/vendors - Get all high-risk vendors
router.get('/risk/vendors', predictionController.getHighRiskVendors);

// GET /api/prediction/risk/vendors/:vendorId/trajectory - Get risk trajectory
router.get('/risk/vendors/:vendorId/trajectory', predictionController.getRiskTrajectory);

// ==================== INVOICE & CASHFLOW ====================

// GET /api/prediction/forecast/invoices - Get invoice volume forecast
router.get('/forecast/invoices', predictionController.getInvoiceForecast);

// GET /api/prediction/forecast/cashflow - Get cashflow projection
router.get('/forecast/cashflow', predictionController.getCashflowProjection);

// ==================== DEMAND FORECASTING ====================

// GET /api/prediction/forecast/demand - Get demand forecast
router.get('/forecast/demand', predictionController.getDemandForecast);

// GET /api/prediction/forecast/renewals - Get contract renewal predictions
router.get('/forecast/renewals', predictionController.getContractRenewals);

// ==================== WORKLOAD FORECASTING ====================

// POST /api/prediction/forecast/workload - Generate workload forecast
router.post('/forecast/workload', authorize('admin', 'manager'), predictionController.generateWorkloadForecast);

// GET /api/prediction/forecast/workload - Get workload forecast
router.get('/forecast/workload', predictionController.getWorkloadForecast);

// GET /api/prediction/forecast/workload/team/:team - Get team workload
router.get('/forecast/workload/team/:team', predictionController.getTeamWorkload);

// ==================== ANOMALY DETECTION ====================

// POST /api/prediction/anomalies/detect - Run anomaly detection
router.post('/anomalies/detect', authorize('admin', 'manager'), predictionController.detectAnomalies);

// GET /api/prediction/anomalies - Get anomaly alerts
router.get('/anomalies', predictionController.getAnomalies);

// GET /api/prediction/anomalies/:alertId - Get specific anomaly
router.get('/anomalies/:alertId', predictionController.getAnomalyById);

// PUT /api/prediction/anomalies/:alertId/assign - Assign anomaly
router.put('/anomalies/:alertId/assign', authorize('admin', 'manager'), predictionController.assignAnomaly);

// PUT /api/prediction/anomalies/:alertId/resolve - Resolve anomaly
router.put('/anomalies/:alertId/resolve', predictionController.resolveAnomaly);

// ==================== SCENARIO SIMULATION ====================

// POST /api/prediction/scenario - Create scenario
router.post('/scenario', predictionController.createScenario);

// GET /api/prediction/scenario - Get user scenarios
router.get('/scenario', predictionController.getScenarios);

// GET /api/prediction/scenario/templates - Get scenario templates
router.get('/scenario/templates', predictionController.getScenarioTemplates);

// GET /api/prediction/scenario/:scenarioId - Get specific scenario
router.get('/scenario/:scenarioId', predictionController.getScenarioById);

// PUT /api/prediction/scenario/:scenarioId - Update scenario
router.put('/scenario/:scenarioId', predictionController.updateScenario);

// POST /api/prediction/scenario/:scenarioId/run - Run simulation
router.post('/scenario/:scenarioId/run', predictionController.runScenario);

// POST /api/prediction/scenario/:scenarioId/clone - Clone scenario
router.post('/scenario/:scenarioId/clone', predictionController.cloneScenario);

// DELETE /api/prediction/scenario/:scenarioId - Delete scenario
router.delete('/scenario/:scenarioId', predictionController.deleteScenario);

// ==================== INLINE PREDICTIONS ====================

// POST /api/prediction/inline - Get inline prediction for workflow
router.post('/inline', predictionController.getInlinePrediction);

// ==================== EXPLANATIONS ====================

// GET /api/prediction/explain/:type/:predictionId - Get prediction explanation
router.get('/explain/:type/:predictionId', predictionController.explainPrediction);

// ==================== WEBHOOKS ====================

// POST /api/prediction/webhooks/register - Register webhook
router.post('/webhooks/register', authorize('admin'), predictionController.registerWebhook);

// DELETE /api/prediction/webhooks/:webhookId - Unregister webhook
router.delete('/webhooks/:webhookId', authorize('admin'), predictionController.unregisterWebhook);

// ==================== EXPORT ====================

// GET /api/prediction/export/:type/:predictionId - Export prediction
router.get('/export/:type/:predictionId', predictionController.exportPrediction);

module.exports = router;
