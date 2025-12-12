const express = require('express');
const router = express.Router();
const {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorStats
} = require('../controllers/vendorController');
const { protect: auth, authorize } = require('../middleware/firebaseAuth');

// Test endpoint without auth (for demo purposes)
router.get('/test/list', getVendors);

router.use(auth); // Protect all routes

router.route('/')
  .get(getVendors)
  .post(authorize('admin', 'manager'), createVendor);

router.route('/stats')
  .get(authorize('admin', 'manager'), getVendorStats);

router.route('/:id')
  .get(getVendor)
  .put(authorize('admin', 'manager'), updateVendor)
  .delete(authorize('admin'), deleteVendor);

module.exports = router;
