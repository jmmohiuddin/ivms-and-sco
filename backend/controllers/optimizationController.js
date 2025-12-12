const SupplyChainOptimizer = require('../services/SupplyChainOptimizer');
const DemandForecaster = require('../services/DemandForecaster');
const AlertService = require('../services/AlertService');
const OptimizationResult = require('../models/OptimizationResult');
const DemandForecast = require('../models/DemandForecast');
const Alert = require('../models/Alert');

// @desc    Run inventory optimization
// @route   POST /api/optimization/inventory
// @access  Private/Admin/Manager
exports.runInventoryOptimization = async (req, res, next) => {
  try {
    const result = await SupplyChainOptimizer.optimizeInventory();
    
    // Save result
    const saved = await OptimizationResult.create({
      type: 'inventory_optimization',
      status: 'completed',
      parameters: req.body,
      results: result,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run vendor selection optimization
// @route   POST /api/optimization/vendor-selection
// @access  Private/Admin/Manager
exports.runVendorOptimization = async (req, res, next) => {
  try {
    const result = await SupplyChainOptimizer.optimizeVendorSelection(req.body);
    
    const saved = await OptimizationResult.create({
      type: 'vendor_selection',
      status: 'completed',
      parameters: req.body,
      results: result,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run cost optimization
// @route   POST /api/optimization/costs
// @access  Private/Admin/Manager
exports.runCostOptimization = async (req, res, next) => {
  try {
    const result = await SupplyChainOptimizer.optimizeCosts();
    
    const saved = await OptimizationResult.create({
      type: 'cost_reduction',
      status: 'completed',
      parameters: req.body,
      results: result,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run full optimization
// @route   POST /api/optimization/full
// @access  Private/Admin/Manager
exports.runFullOptimization = async (req, res, next) => {
  try {
    const result = await SupplyChainOptimizer.runFullOptimization(req.user.id);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get optimization history
// @route   GET /api/optimization/history
// @access  Private/Admin/Manager
exports.getOptimizationHistory = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;

    const results = await OptimizationResult.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await OptimizationResult.countDocuments(query);

    res.status(200).json({
      success: true,
      count: results.length,
      total,
      pages: Math.ceil(total / limit),
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single optimization result
// @route   GET /api/optimization/:id
// @access  Private
exports.getOptimizationResult = async (req, res, next) => {
  try {
    const result = await OptimizationResult.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('appliedBy', 'name');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Optimization result not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply optimization recommendations
// @route   POST /api/optimization/:id/apply
// @access  Private/Admin
exports.applyOptimization = async (req, res, next) => {
  try {
    const result = await OptimizationResult.findByIdAndUpdate(
      req.params.id,
      {
        status: 'applied',
        appliedAt: new Date(),
        appliedBy: req.user.id
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Optimization result not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Provide feedback on optimization
// @route   POST /api/optimization/:id/feedback
// @access  Private
exports.addOptimizationFeedback = async (req, res, next) => {
  try {
    const { rating, comments, actualImpact } = req.body;

    const result = await OptimizationResult.findByIdAndUpdate(
      req.params.id,
      {
        feedback: { rating, comments, actualImpact }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate demand forecast for a product
// @route   POST /api/optimization/forecast/:productId
// @access  Private/Admin/Manager
exports.generateProductForecast = async (req, res, next) => {
  try {
    const { periodsAhead = 3, period = 'monthly' } = req.body;
    
    const forecast = await DemandForecaster.forecastProductDemand(
      req.params.productId,
      periodsAhead,
      period
    );

    // Save forecast
    const saved = await DemandForecast.create({
      product: req.params.productId,
      forecastDate: new Date(),
      forecastPeriod: period,
      predictions: forecast.predictions,
      factors: forecast.factors,
      modelUsed: forecast.modelUsed,
      accuracy: forecast.accuracy,
      status: 'generated',
      generatedBy: 'manual'
    });

    res.status(200).json({
      success: true,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate forecasts for all products
// @route   POST /api/optimization/forecast/all
// @access  Private/Admin
exports.generateAllForecasts = async (req, res, next) => {
  try {
    const { period = 'monthly', periodsAhead = 3 } = req.body;
    
    const forecasts = await DemandForecaster.generateAllForecasts(period, periodsAhead);

    res.status(200).json({
      success: true,
      count: forecasts.length,
      data: forecasts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get demand forecasts
// @route   GET /api/optimization/forecasts
// @access  Private
exports.getForecasts = async (req, res, next) => {
  try {
    const { product, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (product) query.product = product;
    if (status) query.status = status;

    const forecasts = await DemandForecast.find(query)
      .populate('product', 'name sku')
      .sort({ forecastDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await DemandForecast.countDocuments(query);

    res.status(200).json({
      success: true,
      count: forecasts.length,
      total,
      data: forecasts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get alerts
// @route   GET /api/optimization/alerts
// @access  Private
exports.getAlerts = async (req, res, next) => {
  try {
    const { severity, type, limit = 50 } = req.query;
    const alerts = await AlertService.getAlerts({ severity, type, limit: parseInt(limit) });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run alert checks
// @route   POST /api/optimization/alerts/check
// @access  Private/Admin
exports.runAlertChecks = async (req, res, next) => {
  try {
    const alerts = await AlertService.runAlertChecks();

    res.status(200).json({
      success: true,
      message: 'Alert checks completed',
      newAlerts: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge alert
// @route   PATCH /api/optimization/alerts/:id/acknowledge
// @access  Private
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await AlertService.acknowledgeAlert(req.params.id, req.user.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve alert
// @route   PATCH /api/optimization/alerts/:id/resolve
// @access  Private
exports.resolveAlert = async (req, res, next) => {
  try {
    const alert = await AlertService.resolveAlert(req.params.id, req.user.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get alert statistics
// @route   GET /api/optimization/alerts/stats
// @access  Private
exports.getAlertStats = async (req, res, next) => {
  try {
    const stats = await AlertService.getAlertStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
