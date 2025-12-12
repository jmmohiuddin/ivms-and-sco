const express = require('express');
const router = express.Router();
const {
  runInventoryOptimization,
  runVendorOptimization,
  runCostOptimization,
  runFullOptimization,
  getOptimizationHistory,
  getOptimizationResult,
  applyOptimization,
  addOptimizationFeedback,
  generateProductForecast,
  generateAllForecasts,
  getForecasts,
  getAlerts,
  runAlertChecks,
  acknowledgeAlert,
  resolveAlert,
  getAlertStats
} = require('../controllers/optimizationController');
const { protect: auth, authorize } = require('../middleware/firebaseAuth');

router.use(auth); // Protect all routes

// Optimization routes
router.post('/inventory', authorize('admin', 'manager'), runInventoryOptimization);
router.post('/vendor-selection', authorize('admin', 'manager'), runVendorOptimization);
router.post('/costs', authorize('admin', 'manager'), runCostOptimization);
router.post('/full', authorize('admin', 'manager'), runFullOptimization);

// Optimization history and results
router.get('/history', authorize('admin', 'manager'), getOptimizationHistory);
router.get('/:id', getOptimizationResult);
router.post('/:id/apply', authorize('admin'), applyOptimization);
router.post('/:id/feedback', addOptimizationFeedback);

// Demand forecasting
router.post('/forecast/:productId', authorize('admin', 'manager'), generateProductForecast);
router.post('/forecast/all', authorize('admin'), generateAllForecasts);
router.get('/forecasts', getForecasts);

// Alerts
router.get('/alerts', getAlerts);
router.get('/alerts/stats', getAlertStats);
router.post('/alerts/check', authorize('admin'), runAlertChecks);
router.patch('/alerts/:id/acknowledge', acknowledgeAlert);
router.patch('/alerts/:id/resolve', resolveAlert);

module.exports = router;
