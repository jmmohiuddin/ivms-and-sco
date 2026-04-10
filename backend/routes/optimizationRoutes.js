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
router.post('/inventory', runInventoryOptimization); // Allow all authenticated users
router.post('/vendor-selection', runVendorOptimization); // Allow all authenticated users
router.post('/costs', runCostOptimization); // Allow all authenticated users
router.post('/full', runFullOptimization); // Allow all authenticated users

// Alerts - MUST come before /:id route
router.get('/alerts', getAlerts);
router.get('/alerts/stats', getAlertStats);
router.post('/alerts/check', authorize('admin'), runAlertChecks);
router.patch('/alerts/:id/acknowledge', acknowledgeAlert);
router.patch('/alerts/:id/resolve', resolveAlert);

// Demand forecasting
router.post('/forecast/:productId', generateProductForecast); // Allow all authenticated users
router.post('/forecast/all', authorize('admin'), generateAllForecasts);
router.get('/forecasts', getForecasts);

// Optimization history and results
router.get('/history', getOptimizationHistory); // Allow all authenticated users
router.get('/:id', getOptimizationResult);
router.post('/:id/apply', authorize('admin'), applyOptimization);
router.post('/:id/feedback', addOptimizationFeedback);

module.exports = router;
