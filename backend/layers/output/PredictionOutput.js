/**
 * Prediction Output Layer
 * Delivers predictions, dispatches alerts, and handles webhooks
 */

const SpendForecast = require('../../models/SpendForecast');
const RiskPrediction = require('../../models/RiskPrediction');
const WorkloadForecast = require('../../models/WorkloadForecast');
const AnomalyAlert = require('../../models/AnomalyAlert');
const PredictionScenario = require('../../models/PredictionScenario');
const axios = require('axios');

class PredictionOutput {
  constructor() {
    this.webhookRegistry = new Map();
  }

  /**
   * Get dashboard data for predictive insights
   */
  async getDashboardData(options = {}) {
    try {
      const [
        spendForecasts,
        riskPredictions,
        workloadForecasts,
        recentAnomalies,
        scenarios
      ] = await Promise.all([
        SpendForecast.find({ status: 'active' })
          .sort({ createdAt: -1 })
          .limit(5),
        RiskPrediction.find({ status: 'active' })
          .sort({ 'overallRisk.score': -1 })
          .limit(10)
          .populate('vendorId', 'name companyName'),
        WorkloadForecast.find({ status: 'active' })
          .sort({ createdAt: -1 })
          .limit(1),
        AnomalyAlert.find({ status: { $nin: ['resolved', 'dismissed'] } })
          .sort({ createdAt: -1 })
          .limit(10),
        PredictionScenario.find({ status: 'completed' })
          .sort({ createdAt: -1 })
          .limit(5)
      ]);

      // Calculate summary stats
      const summary = {
        spendForecast: this._summarizeSpendForecasts(spendForecasts),
        riskOverview: this._summarizeRiskPredictions(riskPredictions),
        workloadOutlook: workloadForecasts[0]?.getDashboardSummary() || null,
        anomalyCount: recentAnomalies.length,
        criticalAnomalies: recentAnomalies.filter(a => a.severity === 'critical').length
      };

      // Get alerts requiring attention
      const alerts = await this._getActiveAlerts();

      // Get upcoming risk events
      const upcomingRisks = this._getUpcomingRisks(riskPredictions);

      // Build risk heatmap data
      const riskHeatmap = this._buildRiskHeatmap(riskPredictions);

      // Get workload timeline
      const workloadTimeline = workloadForecasts[0]?.dailyBreakdown || [];

      return {
        summary,
        alerts,
        upcomingRisks,
        riskHeatmap,
        workloadTimeline,
        spendTrend: this._getSpendTrend(spendForecasts),
        topRiskVendors: riskPredictions.slice(0, 5).map(rp => rp.getSummary()),
        recentAnomalies: recentAnomalies.map(a => a.getSummary()),
        recentScenarios: scenarios.map(s => s.getSummary())
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get spend forecast with breakdown
   */
  async getSpendForecast(options = {}) {
    const {
      scopeType = 'organization',
      entityId = null,
      periodType = 'monthly'
    } = options;

    try {
      const query = {
        status: 'active',
        'scope.type': scopeType
      };

      if (entityId) query['scope.entityId'] = entityId;
      if (periodType) query['period.type'] = periodType;

      const forecast = await SpendForecast.findOne(query)
        .sort({ createdAt: -1 });

      if (!forecast) return null;

      return {
        forecast: forecast.getSummary(),
        prediction: forecast.prediction,
        breakdowns: forecast.breakdowns,
        seasonality: forecast.seasonality,
        budgetAlerts: forecast.budgetAlerts,
        historical: forecast.historical,
        featureContributions: forecast.featureContributions,
        model: forecast.model
      };
    } catch (error) {
      console.error('Error getting spend forecast:', error);
      throw error;
    }
  }

  /**
   * Get vendor risk prediction
   */
  async getVendorRisk(vendorId) {
    try {
      const prediction = await RiskPrediction.getActiveForVendor(vendorId);
      if (!prediction) return null;

      return {
        summary: prediction.getSummary(),
        overallRisk: prediction.overallRisk,
        riskFactors: prediction.riskFactors,
        predictions: prediction.predictions,
        trajectory: prediction.trajectory,
        peerComparison: prediction.peerComparison,
        externalSignals: prediction.externalSignals,
        recommendedActions: prediction.recommendedActions,
        trendAnalysis: prediction.getTrendAnalysis()
      };
    } catch (error) {
      console.error('Error getting vendor risk:', error);
      throw error;
    }
  }

  /**
   * Get invoice and cashflow projection
   */
  async getCashflowProjection(options = {}) {
    try {
      // This would integrate with the invoice forecasting
      const forecast = await SpendForecast.findOne({
        status: 'active',
        'scope.type': 'organization'
      }).sort({ createdAt: -1 });

      if (!forecast) return null;

      // Get pending invoices for near-term cash needs
      const Invoice = require('../../models/Invoice');
      const pendingInvoices = await Invoice.find({
        status: { $in: ['pending', 'approved'] },
        dueDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
      }).sort({ dueDate: 1 });

      // Group by week
      const weeklyOutflow = {};
      pendingInvoices.forEach(inv => {
        const weekStart = new Date(inv.dueDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyOutflow[weekKey]) {
          weeklyOutflow[weekKey] = { amount: 0, count: 0 };
        }
        weeklyOutflow[weekKey].amount += inv.totalAmount || 0;
        weeklyOutflow[weekKey].count++;
      });

      return {
        forecast: forecast.getSummary(),
        nearTermCashflow: Object.entries(weeklyOutflow).map(([week, data]) => ({
          week,
          outflow: data.amount,
          invoiceCount: data.count
        })),
        pendingTotal: pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
        pendingCount: pendingInvoices.length
      };
    } catch (error) {
      console.error('Error getting cashflow projection:', error);
      throw error;
    }
  }

  /**
   * Get workload forecast
   */
  async getWorkloadForecast(options = {}) {
    try {
      const forecast = await WorkloadForecast.findOne({
        status: 'active',
        'scope.type': options.scopeType || 'organization'
      }).sort({ createdAt: -1 });

      if (!forecast) return null;

      return {
        summary: forecast.getDashboardSummary(),
        teamWorkloads: forecast.teamWorkloads,
        dailyBreakdown: forecast.dailyBreakdown,
        slaProjections: forecast.slaProjections,
        recommendations: forecast.recommendations,
        teamsAtRisk: forecast.getTeamsAtRisk(),
        highVolumeDays: forecast.getHighVolumeDays()
      };
    } catch (error) {
      console.error('Error getting workload forecast:', error);
      throw error;
    }
  }

  /**
   * Get anomaly alerts
   */
  async getAnomalyAlerts(options = {}) {
    const {
      status = null,
      severity = null,
      entityType = null,
      limit = 50
    } = options;

    try {
      const query = {};
      
      if (status) query.status = status;
      if (severity) query.severity = severity;
      if (entityType) query['subject.entityType'] = entityType;

      const alerts = await AnomalyAlert.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('assignment.assignedTo', 'name email');

      return {
        alerts: alerts.map(a => a.getSummary()),
        total: await AnomalyAlert.countDocuments(query),
        bySeverity: {
          critical: await AnomalyAlert.countDocuments({ ...query, severity: 'critical' }),
          high: await AnomalyAlert.countDocuments({ ...query, severity: 'high' }),
          medium: await AnomalyAlert.countDocuments({ ...query, severity: 'medium' }),
          low: await AnomalyAlert.countDocuments({ ...query, severity: 'low' })
        }
      };
    } catch (error) {
      console.error('Error getting anomaly alerts:', error);
      throw error;
    }
  }

  /**
   * Dispatch prediction alert
   */
  async dispatchAlert(alertType, data) {
    try {
      const alert = {
        type: alertType,
        timestamp: new Date(),
        data
      };

      // Log alert
      console.log(`[PredictionAlert] ${alertType}:`, JSON.stringify(data));

      // Send webhooks
      await this._sendWebhooks(alertType, alert);

      // Store notification record (would integrate with notification system)
      // await this._storeNotification(alert);

      return { success: true, alert };
    } catch (error) {
      console.error('Error dispatching alert:', error);
      throw error;
    }
  }

  /**
   * Register webhook for prediction events
   */
  registerWebhook(eventType, webhookUrl, options = {}) {
    const webhookId = `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.webhookRegistry.set(webhookId, {
      eventType,
      url: webhookUrl,
      secret: options.secret,
      active: true,
      registeredAt: new Date()
    });

    return webhookId;
  }

  /**
   * Unregister webhook
   */
  unregisterWebhook(webhookId) {
    return this.webhookRegistry.delete(webhookId);
  }

  /**
   * Export prediction data
   */
  async exportPredictionData(predictionType, predictionId, format = 'json') {
    try {
      let prediction;

      switch (predictionType) {
        case 'spend':
          prediction = await SpendForecast.findById(predictionId);
          break;
        case 'risk':
          prediction = await RiskPrediction.findById(predictionId)
            .populate('vendorId', 'name companyName');
          break;
        case 'workload':
          prediction = await WorkloadForecast.findById(predictionId);
          break;
        case 'scenario':
          prediction = await PredictionScenario.findById(predictionId);
          break;
        default:
          throw new Error('Unknown prediction type');
      }

      if (!prediction) throw new Error('Prediction not found');

      if (format === 'csv') {
        return this._convertToCSV(predictionType, prediction);
      }

      return prediction.toObject();
    } catch (error) {
      console.error('Error exporting prediction:', error);
      throw error;
    }
  }

  // Helper methods
  _summarizeSpendForecasts(forecasts) {
    if (forecasts.length === 0) return null;

    const latest = forecasts[0];
    return {
      predictedAmount: latest.prediction.amount,
      confidenceRange: `${latest.prediction.confidenceInterval?.lower?.toFixed(0)} - ${latest.prediction.confidenceInterval?.upper?.toFixed(0)}`,
      trend: latest.getTrend(),
      alertCount: forecasts.reduce((sum, f) => sum + (f.budgetAlerts?.length || 0), 0)
    };
  }

  _summarizeRiskPredictions(predictions) {
    if (predictions.length === 0) return null;

    const byTier = {
      critical: predictions.filter(p => p.overallRisk.tier === 'critical').length,
      high: predictions.filter(p => p.overallRisk.tier === 'high').length,
      medium: predictions.filter(p => p.overallRisk.tier === 'medium').length,
      low: predictions.filter(p => p.overallRisk.tier === 'low').length
    };

    const avgScore = predictions.reduce((sum, p) => sum + p.overallRisk.score, 0) / predictions.length;

    return {
      totalVendors: predictions.length,
      byTier,
      averageScore: avgScore.toFixed(1),
      criticalVendors: predictions
        .filter(p => p.overallRisk.tier === 'critical')
        .map(p => ({
          vendorId: p.vendorId,
          vendorName: p.vendorName,
          score: p.overallRisk.score
        }))
    };
  }

  async _getActiveAlerts() {
    const [budgetAlerts, anomalyAlerts, riskAlerts] = await Promise.all([
      SpendForecast.getAlertForecasts('critical'),
      AnomalyAlert.getUnresolvedBySeverity('critical'),
      RiskPrediction.getHighRiskVendors(80)
    ]);

    return {
      budget: budgetAlerts.flatMap(f => f.budgetAlerts.filter(a => a.severity === 'critical')),
      anomaly: anomalyAlerts.slice(0, 5),
      risk: riskAlerts.slice(0, 5)
    };
  }

  _getUpcomingRisks(predictions) {
    const upcoming = [];

    predictions.forEach(pred => {
      pred.predictions
        .filter(p => p.probability > 0.5 && p.timeframe)
        .forEach(p => {
          upcoming.push({
            vendorId: pred.vendorId,
            vendorName: pred.vendorName,
            riskType: p.type,
            probability: p.probability,
            timeframe: p.timeframe,
            severity: p.severity
          });
        });
    });

    return upcoming
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);
  }

  _buildRiskHeatmap(predictions) {
    const categories = ['operational', 'financial', 'compliance', 'delivery', 'quality'];
    const heatmap = {};

    categories.forEach(category => {
      heatmap[category] = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };
    });

    predictions.forEach(pred => {
      pred.riskFactors.forEach(factor => {
        if (heatmap[factor.category]) {
          const tier = factor.score >= 80 ? 'critical' : 
                       factor.score >= 60 ? 'high' : 
                       factor.score >= 40 ? 'medium' : 'low';
          heatmap[factor.category][tier]++;
        }
      });
    });

    return heatmap;
  }

  _getSpendTrend(forecasts) {
    return forecasts.map(f => ({
      period: `${f.period.startDate.toISOString().split('T')[0]}`,
      predicted: f.prediction.amount,
      lower: f.prediction.confidenceInterval?.lower,
      upper: f.prediction.confidenceInterval?.upper
    }));
  }

  async _sendWebhooks(eventType, payload) {
    const webhooks = Array.from(this.webhookRegistry.values())
      .filter(wh => wh.active && wh.eventType === eventType);

    const results = await Promise.allSettled(
      webhooks.map(async wh => {
        try {
          await axios.post(wh.url, payload, {
            headers: {
              'Content-Type': 'application/json',
              ...(wh.secret && { 'X-Webhook-Secret': wh.secret })
            },
            timeout: 10000
          });
          return { success: true, url: wh.url };
        } catch (error) {
          return { success: false, url: wh.url, error: error.message };
        }
      })
    );

    return results;
  }

  _convertToCSV(type, data) {
    // Simplified CSV conversion
    const rows = [];
    
    if (type === 'spend' && data.breakdowns) {
      rows.push(['Dimension', 'Name', 'Amount', 'Percentage']);
      data.breakdowns.forEach(b => {
        rows.push([b.dimension, b.dimensionName, b.predictedAmount, b.percentageOfTotal]);
      });
    } else if (type === 'risk' && data.riskFactors) {
      rows.push(['Factor', 'Category', 'Score', 'Trend']);
      data.riskFactors.forEach(rf => {
        rows.push([rf.factor, rf.category, rf.score, rf.trend]);
      });
    }

    return rows.map(row => row.join(',')).join('\n');
  }
}

module.exports = new PredictionOutput();
