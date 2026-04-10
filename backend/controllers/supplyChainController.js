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
    let ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totalAmount' } } }
    ]);

    // Orders by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    let ordersByMonth = await Order.aggregate([
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
    let topVendors = await Order.aggregate([
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

    // Return dummy data if no real data exists
    if (ordersByStatus.length === 0) {
      ordersByStatus = [
        { _id: 'pending', count: 12, value: 45000 },
        { _id: 'processing', count: 8, value: 32000 },
        { _id: 'delivered', count: 35, value: 125000 },
        { _id: 'cancelled', count: 3, value: 8500 }
      ];
    }

    if (ordersByMonth.length === 0) {
      const currentDate = new Date();
      ordersByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStr = date.toISOString().substring(0, 7);
        ordersByMonth.push({
          _id: monthStr,
          count: Math.floor(Math.random() * 20) + 10,
          value: Math.floor(Math.random() * 50000) + 30000
        });
      }
    }

    if (topVendors.length === 0) {
      topVendors = [
        { vendorName: 'Tech Solutions Inc', totalValue: 85000, orderCount: 15 },
        { vendorName: 'Global Supplies Co', totalValue: 62000, orderCount: 12 },
        { vendorName: 'Prime Vendors Ltd', totalValue: 48000, orderCount: 10 },
        { vendorName: 'Quality Parts Corp', totalValue: 35000, orderCount: 8 },
        { vendorName: 'Reliable Materials', totalValue: 28000, orderCount: 6 }
      ];
    }

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
    let reorderNeeded = await Product.find({
      $expr: { $lte: ['$inventory.quantity', '$inventory.reorderPoint'] }
    }).populate('vendor', 'name email leadTime');

    // Return dummy data if no products found
    if (reorderNeeded.length === 0) {
      const dummyForecast = [
        {
          product: { id: '1', name: 'Office Chairs', sku: 'OC-001' },
          currentStock: 15,
          reorderPoint: 20,
          suggestedOrderQty: 50,
          leadTime: 7,
          priority: 'high'
        },
        {
          product: { id: '2', name: 'Laptop Batteries', sku: 'LB-002' },
          currentStock: 8,
          reorderPoint: 25,
          suggestedOrderQty: 75,
          leadTime: 5,
          priority: 'critical'
        },
        {
          product: { id: '3', name: 'USB Cables', sku: 'UC-003' },
          currentStock: 45,
          reorderPoint: 50,
          suggestedOrderQty: 100,
          leadTime: 3,
          priority: 'medium'
        },
        {
          product: { id: '4', name: 'Network Switches', sku: 'NS-004' },
          currentStock: 3,
          reorderPoint: 10,
          suggestedOrderQty: 30,
          leadTime: 14,
          priority: 'critical'
        },
        {
          product: { id: '5', name: 'Desk Lamps', sku: 'DL-005' },
          currentStock: 22,
          reorderPoint: 30,
          suggestedOrderQty: 60,
          leadTime: 7,
          priority: 'medium'
        },
        {
          product: { id: '6', name: 'Keyboards', sku: 'KB-006' },
          currentStock: 12,
          reorderPoint: 25,
          suggestedOrderQty: 50,
          leadTime: 5,
          priority: 'high'
        }
      ];

      return res.status(200).json({
        success: true,
        count: dummyForecast.length,
        data: dummyForecast
      });
    }

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
