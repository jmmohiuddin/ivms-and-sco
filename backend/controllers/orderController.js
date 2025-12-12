const Order = require('../models/Order');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const { status, vendor, priority, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (vendor) query.vendor = vendor;
    if (priority) query.priority = priority;

    const orders = await Order.find(query)
      .populate('vendor', 'name email')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('vendor', 'name email phone address')
      .populate('items.product', 'name sku price')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Admin/Manager
exports.createOrder = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;
    
    // Calculate total amount
    if (req.body.items && req.body.items.length > 0) {
      req.body.items = req.body.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice
      }));
      req.body.totalAmount = req.body.items.reduce((acc, item) => acc + item.totalPrice, 0);
    }

    const order = await Order.create(req.body);

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private/Admin/Manager
exports.updateOrder = async (req, res, next) => {
  try {
    // Recalculate totals if items are updated
    if (req.body.items && req.body.items.length > 0) {
      req.body.items = req.body.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice
      }));
      req.body.totalAmount = req.body.items.reduce((acc, item) => acc + item.totalPrice, 0);
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private/Admin/Manager
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.status = status;
    
    // Set actual delivery date when delivered
    if (status === 'delivered') {
      order.actualDelivery = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};
