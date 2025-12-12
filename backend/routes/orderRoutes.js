const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect: auth, authorize } = require('../middleware/firebaseAuth');

router.use(auth); // Protect all routes

router.route('/')
  .get(getOrders)
  .post(authorize('admin', 'manager'), createOrder);

router.route('/:id')
  .get(getOrder)
  .put(authorize('admin', 'manager'), updateOrder)
  .delete(authorize('admin'), deleteOrder);

router.route('/:id/status')
  .patch(authorize('admin', 'manager'), updateOrderStatus);

module.exports = router;
