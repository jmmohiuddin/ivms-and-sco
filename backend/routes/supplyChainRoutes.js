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
router.get('/analytics', getSupplyChainAnalytics); // Allow all authenticated users
router.get('/forecast', getInventoryForecast); // Allow all authenticated users
router.get('/vendor-performance', getVendorPerformance); // Allow all authenticated users

module.exports = router;
