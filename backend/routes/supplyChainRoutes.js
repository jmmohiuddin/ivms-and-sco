const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSupplyChainAnalytics,
  getInventoryForecast,
  getVendorPerformance
} = require('../controllers/supplyChainController');
const { protect: auth, authorize } = require('../middleware/firebaseAuth');

router.use(auth); // Protect all routes

router.get('/dashboard', getDashboardStats);
router.get('/analytics', authorize('admin', 'manager'), getSupplyChainAnalytics);
router.get('/forecast', authorize('admin', 'manager'), getInventoryForecast);
router.get('/vendor-performance', authorize('admin', 'manager'), getVendorPerformance);

module.exports = router;
