/**
 * Alert Service
 * Monitors supply chain metrics and generates alerts
 */

const Alert = require('../models/Alert');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');

class AlertService {
  
  /**
   * Check all alert conditions and generate alerts
   */
  static async runAlertChecks() {
    const alerts = [];

    // Run all checks in parallel
    const [
      lowStockAlerts,
      vendorPerformanceAlerts,
      deliveryDelayAlerts,
      contractExpiryAlerts
    ] = await Promise.all([
      this.checkLowStock(),
      this.checkVendorPerformance(),
      this.checkDeliveryDelays(),
      this.checkContractExpiry()
    ]);

    alerts.push(...lowStockAlerts, ...vendorPerformanceAlerts, ...deliveryDelayAlerts, ...contractExpiryAlerts);

    // Save new alerts
    for (const alertData of alerts) {
      // Check if similar alert already exists and is active
      const existingAlert = await Alert.findOne({
        type: alertData.type,
        'entity.id': alertData.entity.id,
        status: 'active'
      });

      if (!existingAlert) {
        await Alert.create(alertData);
      }
    }

    return alerts;
  }

  /**
   * Check for low stock and stockout risks
   */
  static async checkLowStock() {
    const alerts = [];
    const products = await Product.find({ isActive: true }).populate('vendor');

    for (const product of products) {
      // Critical: Out of stock
      if (product.inventory.quantity === 0) {
        alerts.push({
          type: 'stockout_risk',
          severity: 'critical',
          title: `Stockout: ${product.name}`,
          message: `${product.name} (SKU: ${product.sku}) is out of stock. Immediate reorder required.`,
          entity: {
            type: 'product',
            id: product._id,
            name: product.name
          },
          data: {
            currentStock: 0,
            reorderPoint: product.inventory.reorderPoint,
            vendor: product.vendor?.name,
            leadTime: product.leadTime
          },
          suggestedActions: [
            { action: 'urgent_reorder', description: `Place urgent order with ${product.vendor?.name || 'vendor'}` },
            { action: 'find_alternative', description: 'Find alternative supplier for faster delivery' }
          ],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      }
      // Warning: Below reorder point
      else if (product.inventory.quantity <= product.inventory.reorderPoint) {
        alerts.push({
          type: 'low_stock',
          severity: 'warning',
          title: `Low Stock: ${product.name}`,
          message: `${product.name} stock (${product.inventory.quantity}) is at or below reorder point (${product.inventory.reorderPoint}).`,
          entity: {
            type: 'product',
            id: product._id,
            name: product.name
          },
          data: {
            currentStock: product.inventory.quantity,
            reorderPoint: product.inventory.reorderPoint,
            minStock: product.inventory.minStock,
            vendor: product.vendor?.name,
            leadTime: product.leadTime
          },
          suggestedActions: [
            { action: 'reorder', description: 'Place standard reorder' },
            { action: 'review_forecast', description: 'Review demand forecast for accuracy' }
          ],
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        });
      }
    }

    return alerts;
  }

  /**
   * Check vendor performance issues
   */
  static async checkVendorPerformance() {
    const alerts = [];
    const vendors = await Vendor.find({ status: 'active' });

    for (const vendor of vendors) {
      // Low performance score
      if (vendor.performanceScore < 40) {
        alerts.push({
          type: 'vendor_performance',
          severity: 'warning',
          title: `Poor Performance: ${vendor.name}`,
          message: `${vendor.name} has a performance score of ${vendor.performanceScore}%, which is below acceptable threshold.`,
          entity: {
            type: 'vendor',
            id: vendor._id,
            name: vendor.name
          },
          data: {
            performanceScore: vendor.performanceScore,
            rating: vendor.rating,
            category: vendor.category
          },
          suggestedActions: [
            { action: 'schedule_review', description: 'Schedule vendor performance review meeting' },
            { action: 'find_backup', description: 'Identify backup vendors in same category' },
            { action: 'set_improvement_plan', description: 'Create performance improvement plan' }
          ],
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }

      // Low rating
      if (vendor.rating < 2) {
        alerts.push({
          type: 'vendor_performance',
          severity: 'critical',
          title: `Critical Rating: ${vendor.name}`,
          message: `${vendor.name} has a rating of ${vendor.rating}/5, indicating serious quality issues.`,
          entity: {
            type: 'vendor',
            id: vendor._id,
            name: vendor.name
          },
          data: {
            rating: vendor.rating,
            performanceScore: vendor.performanceScore
          },
          suggestedActions: [
            { action: 'immediate_review', description: 'Conduct immediate vendor assessment' },
            { action: 'reduce_orders', description: 'Reduce order volume from this vendor' },
            { action: 'consider_termination', description: 'Consider contract termination' }
          ],
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        });
      }
    }

    return alerts;
  }

  /**
   * Check for delivery delays
   */
  static async checkDeliveryDelays() {
    const alerts = [];
    
    // Find orders that are past expected delivery but not delivered
    const overdueOrders = await Order.find({
      status: { $in: ['pending', 'confirmed', 'processing', 'shipped'] },
      expectedDelivery: { $lt: new Date() }
    }).populate('vendor');

    for (const order of overdueOrders) {
      const daysOverdue = Math.ceil((Date.now() - order.expectedDelivery) / (1000 * 60 * 60 * 24));
      
      alerts.push({
        type: 'delivery_delay',
        severity: daysOverdue > 7 ? 'critical' : 'warning',
        title: `Delivery Delay: Order ${order.orderNumber}`,
        message: `Order ${order.orderNumber} from ${order.vendor?.name || 'Unknown'} is ${daysOverdue} day(s) overdue.`,
        entity: {
          type: 'order',
          id: order._id,
          name: order.orderNumber
        },
        data: {
          orderNumber: order.orderNumber,
          vendor: order.vendor?.name,
          expectedDelivery: order.expectedDelivery,
          daysOverdue,
          status: order.status,
          totalAmount: order.totalAmount
        },
        suggestedActions: [
          { action: 'contact_vendor', description: 'Contact vendor for delivery update' },
          { action: 'expedite', description: 'Request expedited shipping' },
          { action: 'find_alternative', description: 'Source from alternative vendor if critical' }
        ],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    return alerts;
  }

  /**
   * Check for expiring contracts
   */
  static async checkContractExpiry() {
    const alerts = [];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const vendorsWithExpiringContracts = await Vendor.find({
      'contractDetails.endDate': { 
        $lte: thirtyDaysFromNow,
        $gte: new Date()
      },
      status: 'active'
    });

    for (const vendor of vendorsWithExpiringContracts) {
      const daysUntilExpiry = Math.ceil(
        (vendor.contractDetails.endDate - Date.now()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        type: 'contract_expiry',
        severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
        title: `Contract Expiring: ${vendor.name}`,
        message: `Contract with ${vendor.name} expires in ${daysUntilExpiry} day(s).`,
        entity: {
          type: 'vendor',
          id: vendor._id,
          name: vendor.name
        },
        data: {
          contractEndDate: vendor.contractDetails.endDate,
          daysUntilExpiry,
          paymentTerms: vendor.contractDetails.paymentTerms
        },
        suggestedActions: [
          { action: 'renew_contract', description: 'Initiate contract renewal negotiations' },
          { action: 'review_terms', description: 'Review and update contract terms' },
          { action: 'find_alternatives', description: 'Evaluate alternative vendors' }
        ],
        expiresAt: vendor.contractDetails.endDate
      });
    }

    return alerts;
  }

  /**
   * Get active alerts with filtering
   */
  static async getAlerts(filters = {}) {
    const query = { status: 'active' };
    
    if (filters.severity) query.severity = filters.severity;
    if (filters.type) query.type = filters.type;

    return Alert.find(query)
      .sort({ severity: -1, createdAt: -1 })
      .limit(filters.limit || 50);
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId, userId) {
    return Alert.findByIdAndUpdate(alertId, {
      status: 'acknowledged',
      acknowledgedBy: userId,
      acknowledgedAt: new Date()
    }, { new: true });
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId, userId) {
    return Alert.findByIdAndUpdate(alertId, {
      status: 'resolved',
      resolvedBy: userId,
      resolvedAt: new Date()
    }, { new: true });
  }

  /**
   * Dismiss an alert
   */
  static async dismissAlert(alertId) {
    return Alert.findByIdAndUpdate(alertId, {
      status: 'dismissed'
    }, { new: true });
  }

  /**
   * Get alert statistics
   */
  static async getAlertStats() {
    const stats = await Alert.aggregate([
      {
        $group: {
          _id: { status: '$status', severity: '$severity' },
          count: { $sum: 1 }
        }
      }
    ]);

    const byType = await Alert.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    return { statusSeverityBreakdown: stats, byType };
  }
}

module.exports = AlertService;
