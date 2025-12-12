const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Get dashboard statistics
// @route   GET /api/supply-chain/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalVendors,
      activeVendors,
      totalProducts,
      lowStockProducts,
      totalOrders,
      pendingOrders
    ] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ status: 'active' }),
      Product.countDocuments(),
      Product.countDocuments({
        $expr: { $lte: ['$inventory.quantity', '$inventory.reorderPoint'] }
      }),
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['pending', 'processing'] } })
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('vendor', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get order value stats
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        vendors: {
          total: totalVendors,
          active: activeVendors
        },
        products: {
          total: totalProducts,
          lowStock: lowStockProducts
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          totalValue: orderStats[0]?.totalValue || 0,
          avgValue: orderStats[0]?.avgOrderValue || 0
        },
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get supply chain analytics
// @route   GET /api/supply-chain/analytics
// @access  Private/Admin/Manager
exports.getSupplyChainAnalytics = async (req, res, next) => {
  try {
    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totalAmount' } } }
    ]);

    // Orders by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const ordersByMonth = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          value: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top vendors by order value
    const topVendors = await Order.aggregate([
      { $group: { _id: '$vendor', totalValue: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      { $unwind: '$vendorInfo' },
      {
        $project: {
          vendorName: '$vendorInfo.name',
          totalValue: 1,
          orderCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        ordersByStatus,
        ordersByMonth,
        topVendors
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory forecast
// @route   GET /api/supply-chain/forecast
// @access  Private/Admin/Manager
exports.getInventoryForecast = async (req, res, next) => {
  try {
    // Get products that need reordering
    const reorderNeeded = await Product.find({
      $expr: { $lte: ['$inventory.quantity', '$inventory.reorderPoint'] }
    }).populate('vendor', 'name email leadTime');

    // Calculate suggested order quantities
    const forecastData = reorderNeeded.map(product => ({
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku
      },
      currentStock: product.inventory.quantity,
      reorderPoint: product.inventory.reorderPoint,
      suggestedOrderQty: product.inventory.maxStock - product.inventory.quantity,
      leadTime: product.leadTime,
      vendor: product.vendor,
      priority: product.inventory.quantity === 0 ? 'critical' : 
                product.inventory.quantity <= product.inventory.reorderPoint / 2 ? 'high' : 'medium'
    }));

    res.status(200).json({
      success: true,
      count: forecastData.length,
      data: forecastData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vendor performance metrics
// @route   GET /api/supply-chain/vendor-performance
// @access  Private/Admin/Manager
exports.getVendorPerformance = async (req, res, next) => {
  try {
    const vendorPerformance = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: '$vendor',
          totalOrders: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          avgDeliveryTime: {
            $avg: {
              $divide: [
                { $subtract: ['$actualDelivery', '$orderDate'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          },
          onTimeDeliveries: {
            $sum: {
              $cond: [{ $lte: ['$actualDelivery', '$expectedDelivery'] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      { $unwind: '$vendorInfo' },
      {
        $project: {
          vendorName: '$vendorInfo.name',
          rating: '$vendorInfo.rating',
          performanceScore: '$vendorInfo.performanceScore',
          totalOrders: 1,
          totalValue: 1,
          avgDeliveryTime: { $round: ['$avgDeliveryTime', 1] },
          onTimeRate: {
            $multiply: [
              { $divide: ['$onTimeDeliveries', '$totalOrders'] },
              100
            ]
          }
        }
      },
      { $sort: { performanceScore: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: vendorPerformance
    });
  } catch (error) {
    next(error);
  }
};
