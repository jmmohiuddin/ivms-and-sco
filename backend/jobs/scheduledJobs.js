/**
 * Scheduled Jobs for Supply Chain Optimization
 * Run periodic tasks for forecasting, alerts, and optimization
 */

const cron = require('node-cron');
const DemandForecaster = require('../services/DemandForecaster');
const AlertService = require('../services/AlertService');
const SupplyChainOptimizer = require('../services/SupplyChainOptimizer');

class ScheduledJobs {
  
  /**
   * Initialize all scheduled jobs
   */
  static init() {
    console.log('Initializing scheduled jobs...');

    // Run alert checks every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Running hourly alert checks...');
      try {
        const alerts = await AlertService.runAlertChecks();
        console.log(`Alert check complete. ${alerts.length} new alerts generated.`);
      } catch (error) {
        console.error('Error running alert checks:', error);
      }
    });

    // Generate demand forecasts daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running daily demand forecast generation...');
      try {
        const forecasts = await DemandForecaster.generateAllForecasts('monthly', 3);
        console.log(`Forecast generation complete. ${forecasts.length} forecasts generated.`);
      } catch (error) {
        console.error('Error generating forecasts:', error);
      }
    });

    // Run inventory optimization weekly on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      console.log('Running weekly inventory optimization...');
      try {
        const result = await SupplyChainOptimizer.optimizeInventory();
        console.log(`Inventory optimization complete. ${result.recommendations.length} recommendations.`);
      } catch (error) {
        console.error('Error running inventory optimization:', error);
      }
    });

    // Clean up old alerts monthly
    cron.schedule('0 0 1 * *', async () => {
      console.log('Cleaning up old alerts...');
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const Alert = require('../models/Alert');
        const result = await Alert.deleteMany({
          status: { $in: ['resolved', 'dismissed'] },
          updatedAt: { $lt: thirtyDaysAgo }
        });
        console.log(`Cleaned up ${result.deletedCount} old alerts.`);
      } catch (error) {
        console.error('Error cleaning up alerts:', error);
      }
    });

    console.log('Scheduled jobs initialized.');
  }

  /**
   * Run a specific job manually
   */
  static async runJob(jobName) {
    switch (jobName) {
      case 'alerts':
        return AlertService.runAlertChecks();
      case 'forecasts':
        return DemandForecaster.generateAllForecasts('monthly', 3);
      case 'inventory':
        return SupplyChainOptimizer.optimizeInventory();
      case 'vendor':
        return SupplyChainOptimizer.optimizeVendorSelection();
      case 'costs':
        return SupplyChainOptimizer.optimizeCosts();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

module.exports = ScheduledJobs;
