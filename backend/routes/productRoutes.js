const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts
} = require('../controllers/productController');
const { protect: auth, authorize } = require('../middleware/firebaseAuth');

router.use(auth); // Protect all routes

router.route('/')
  .get(getProducts)
  .post(authorize('admin', 'manager'), createProduct);

router.route('/low-stock')
  .get(getLowStockProducts);

router.route('/:id')
  .get(getProduct)
  .put(authorize('admin', 'manager'), updateProduct)
  .delete(authorize('admin'), deleteProduct);

module.exports = router;
