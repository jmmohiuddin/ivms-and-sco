/**
 * Supply Chain Optimization Service
 * Core algorithms for inventory, vendor, and cost optimization
 */

const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const SupplyChainMetrics = require('../models/SupplyChainMetrics');
const OptimizationResult = require('../models/OptimizationResult');

class SupplyChainOptimizer {
  
  /**
   * Calculate Economic Order Quantity (EOQ)
   * Optimal order quantity that minimizes total inventory costs
   */
  static calculateEOQ(annualDemand, orderingCost, holdingCostPerUnit) {
    return Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  }

  /**
   * Calculate Reorder Point
   * When to place new order considering lead time and safety stock
   */
  static calculateReorderPoint(averageDailyDemand, leadTimeDays, safetyStock) {
    return (averageDailyDemand * leadTimeDays) + safetyStock;
  }

  /**
   * Calculate Safety Stock using service level approach
   */
  static calculateSafetyStock(demandStdDev, leadTimeDays, serviceLevel = 0.95) {
    // Z-score for service level (95% = 1.65, 99% = 2.33)
    const zScores = { 0.90: 1.28, 0.95: 1.65, 0.99: 2.33 };
    const zScore = zScores[serviceLevel] || 1.65;
    return zScore * demandStdDev * Math.sqrt(leadTimeDays);
  }

  /**
   * Optimize inventory levels for all products
   */
  static async optimizeInventory() {
    const products = await Product.find({ isActive: true }).populate('vendor');
    const recommendations = [];

    for (const product of products) {
      const orderHistory = await Order.find({
        'items.product': product._id,
        status: 'delivered',
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
      });

      // Calculate demand metrics
      const totalDemand = orderHistory.reduce((sum, order) => {
        const item = order.items.find(i => i.product.toString() === product._id.toString());
        return sum + (item?.quantity || 0);
      }, 0);

      const annualDemand = totalDemand || 100; // Default if no history
      const orderingCost = 50; // Default ordering cost
      const holdingCostRate = 0.25; // 25% of unit cost per year
      const holdingCost = product.price * holdingCostRate;

      // Calculate optimal values
      const eoq = this.calculateEOQ(annualDemand, orderingCost, holdingCost);
      const dailyDemand = annualDemand / 365;
      const safetyStock = this.calculateSafetyStock(dailyDemand * 0.3, product.leadTime);
      const reorderPoint = this.calculateReorderPoint(dailyDemand, product.leadTime, safetyStock);

      // Generate recommendations
      if (product.inventory.quantity < reorderPoint) {
        recommendations.push({
          action: 'reorder',
          description: `Reorder ${product.name} - Current stock below reorder point`,
          priority: product.inventory.quantity === 0 ? 'critical' : 'high',
          expectedImpact: {
            metric: 'Stock Level',
            currentValue: product.inventory.quantity,
            projectedValue: Math.round(eoq),
            improvement: Math.round(eoq - product.inventory.quantity),
            unit: 'units'
          },
          affectedEntities: [{
            entityType: 'product',
            entityId: product._id,
            entityName: product.name
          }],
          implementationSteps: [
            `Place order for ${Math.round(eoq)} units`,
            `Update reorder point to ${Math.round(reorderPoint)}`,
            `Set safety stock to ${Math.round(safetyStock)}`
          ],
          estimatedSavings: orderingCost * 0.15,
          riskLevel: 'low'
        });
      }

      // Check for overstock
      if (product.inventory.quantity > product.inventory.maxStock * 1.2) {
        const excessStock = product.inventory.quantity - product.inventory.maxStock;
        recommendations.push({
          action: 'reduce_stock',
          description: `Reduce excess inventory for ${product.name}`,
          priority: 'medium',
          expectedImpact: {
            metric: 'Carrying Cost',
            currentValue: product.inventory.quantity * holdingCost,
            projectedValue: product.inventory.maxStock * holdingCost,
            improvement: excessStock * holdingCost,
            unit: 'USD'
          },
          affectedEntities: [{
            entityType: 'product',
            entityId: product._id,
            entityName: product.name
          }],
          implementationSteps: [
            'Consider promotional pricing',
            'Transfer to other locations',
            'Negotiate return with vendor'
          ],
          estimatedSavings: excessStock * holdingCost,
          riskLevel: 'low'
        });
      }
    }

    return {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        potentialSavings: recommendations.reduce((sum, r) => sum + (r.estimatedSavings || 0), 0),
        implementationComplexity: 'low',
        timeToImplement: '1-2 weeks'
      },
      metrics: {
        optimizationScore: 85,
        confidenceLevel: 80,
        dataPointsAnalyzed: products.length
      }
    };
  }

  /**
   * Vendor selection optimization using weighted scoring
   */
  static async optimizeVendorSelection(requirements = {}) {
    const vendors = await Vendor.find({ status: 'active' });
    const recommendations = [];

    // Default weights for vendor scoring
    const weights = {
      rating: requirements.ratingWeight || 0.25,
      performance: requirements.performanceWeight || 0.25,
      cost: requirements.costWeight || 0.20,
      reliability: requirements.reliabilityWeight || 0.15,
      quality: requirements.qualityWeight || 0.15
    };

    // Get metrics for each vendor
    const vendorScores = [];
    for (const vendor of vendors) {
      const metrics = await SupplyChainMetrics.findOne({ vendor: vendor._id })
        .sort({ date: -1 });

      const score = this.calculateVendorScore(vendor, metrics, weights);
      vendorScores.push({ vendor, metrics, score });
    }

    // Sort by score
    vendorScores.sort((a, b) => b.score - a.score);

    // Generate recommendations
    const topVendors = vendorScores.slice(0, 5);
    const bottomVendors = vendorScores.filter(v => v.score < 50);

    if (topVendors.length > 0) {
      recommendations.push({
        action: 'prioritize_vendors',
        description: 'Prioritize orders with top-performing vendors',
        priority: 'high',
        expectedImpact: {
          metric: 'Vendor Performance',
          currentValue: vendorScores.reduce((sum, v) => sum + v.score, 0) / vendorScores.length,
          projectedValue: topVendors.reduce((sum, v) => sum + v.score, 0) / topVendors.length,
          improvement: 15,
          unit: 'points'
        },
        affectedEntities: topVendors.map(v => ({
          entityType: 'vendor',
          entityId: v.vendor._id,
          entityName: v.vendor.name
        })),
        implementationSteps: [
          'Review vendor contracts',
          'Increase order allocation to top vendors',
          'Negotiate better terms with preferred vendors'
        ],
        estimatedSavings: 5000,
        riskLevel: 'low'
      });
    }

    if (bottomVendors.length > 0) {
      recommendations.push({
        action: 'review_vendors',
        description: 'Review and potentially replace underperforming vendors',
        priority: 'medium',
        expectedImpact: {
          metric: 'Risk Reduction',
          currentValue: bottomVendors.length,
          projectedValue: 0,
          improvement: bottomVendors.length,
          unit: 'vendors'
        },
        affectedEntities: bottomVendors.map(v => ({
          entityType: 'vendor',
          entityId: v.vendor._id,
          entityName: v.vendor.name
        })),
        implementationSteps: [
          'Schedule performance review meetings',
          'Set improvement targets',
          'Identify backup vendors'
        ],
        estimatedSavings: 2000,
        riskLevel: 'medium'
      });
    }

    return {
      recommendations,
      vendorRankings: vendorScores.map(v => ({
        vendorId: v.vendor._id,
        vendorName: v.vendor.name,
        score: v.score,
        category: v.vendor.category
      })),
      summary: {
        totalRecommendations: recommendations.length,
        potentialSavings: recommendations.reduce((sum, r) => sum + (r.estimatedSavings || 0), 0),
        implementationComplexity: 'medium',
        timeToImplement: '2-4 weeks'
      },
      metrics: {
        optimizationScore: 78,
        confidenceLevel: 75,
        dataPointsAnalyzed: vendors.length
      }
    };
  }

  /**
   * Calculate weighted vendor score
   */
  static calculateVendorScore(vendor, metrics, weights) {
    let score = 0;
    
    // Rating score (0-5 scaled to 0-100)
    score += (vendor.rating / 5) * 100 * weights.rating;
    
    // Performance score
    score += (vendor.performanceScore || 50) * weights.performance;
    
    // Metrics-based scores
    if (metrics) {
      score += (metrics.metrics.onTimeDeliveryRate || 50) * weights.reliability;
      score += (metrics.metrics.qualityScore || 50) * weights.quality;
      // Cost efficiency (inverse - lower is better)
      const costScore = 100 - Math.min(metrics.metrics.priceVariance || 0, 100);
      score += costScore * weights.cost;
    } else {
      // Default scores if no metrics
      score += 50 * (weights.reliability + weights.quality + weights.cost);
    }

    return Math.round(score);
  }

  /**
   * Cost reduction optimization
   */
  static async optimizeCosts() {
    const orders = await Order.find({
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    }).populate('vendor').populate('items.product');

    const recommendations = [];
    
    // Analyze order consolidation opportunities
    const vendorOrders = {};
    orders.forEach(order => {
      const vendorId = order.vendor?._id?.toString();
      if (vendorId) {
        if (!vendorOrders[vendorId]) {
          vendorOrders[vendorId] = {
            vendor: order.vendor,
            orders: [],
            totalValue: 0
          };
        }
        vendorOrders[vendorId].orders.push(order);
        vendorOrders[vendorId].totalValue += order.totalAmount;
      }
    });

    // Check for consolidation opportunities
    Object.values(vendorOrders).forEach(({ vendor, orders: vendorOrderList, totalValue }) => {
      if (vendorOrderList.length >= 5) {
        const avgOrderValue = totalValue / vendorOrderList.length;
        if (avgOrderValue < 1000) {
          recommendations.push({
            action: 'consolidate_orders',
            description: `Consolidate small orders from ${vendor.name}`,
            priority: 'medium',
            expectedImpact: {
              metric: 'Order Processing Cost',
              currentValue: vendorOrderList.length * 50,
              projectedValue: Math.ceil(vendorOrderList.length / 3) * 50,
              improvement: Math.floor(vendorOrderList.length * 0.66) * 50,
              unit: 'USD'
            },
            affectedEntities: [{
              entityType: 'vendor',
              entityId: vendor._id,
              entityName: vendor.name
            }],
            implementationSteps: [
              'Set minimum order value threshold',
              'Implement weekly order batching',
              'Negotiate volume discounts'
            ],
            estimatedSavings: Math.floor(vendorOrderList.length * 0.66) * 50,
            riskLevel: 'low'
          });
        }
      }
    });

    return {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        potentialSavings: recommendations.reduce((sum, r) => sum + (r.estimatedSavings || 0), 0),
        implementationComplexity: 'low',
        timeToImplement: '1-2 weeks'
      },
      metrics: {
        optimizationScore: 72,
        confidenceLevel: 85,
        dataPointsAnalyzed: orders.length
      }
    };
  }

  /**
   * Run comprehensive supply chain optimization
   */
  static async runFullOptimization(userId) {
    const results = await Promise.all([
      this.optimizeInventory(),
      this.optimizeVendorSelection(),
      this.optimizeCosts()
    ]);

    const allRecommendations = [
      ...results[0].recommendations,
      ...results[1].recommendations,
      ...results[2].recommendations
    ];

    const optimizationResult = await OptimizationResult.create({
      type: 'inventory_optimization',
      status: 'completed',
      parameters: { runType: 'full', timestamp: new Date() },
      results: {
        recommendations: allRecommendations,
        summary: {
          totalRecommendations: allRecommendations.length,
          potentialSavings: allRecommendations.reduce((sum, r) => sum + (r.estimatedSavings || 0), 0),
          implementationComplexity: 'medium',
          timeToImplement: '2-4 weeks'
        },
        metrics: {
          optimizationScore: Math.round((results[0].metrics.optimizationScore + 
            results[1].metrics.optimizationScore + 
            results[2].metrics.optimizationScore) / 3),
          confidenceLevel: 80,
          dataPointsAnalyzed: results.reduce((sum, r) => sum + r.metrics.dataPointsAnalyzed, 0)
        }
      },
      createdBy: userId
    });

    return optimizationResult;
  }
}

module.exports = SupplyChainOptimizer;
