/**
 * Prediction Controller
 * HTTP handlers for predictive analytics endpoints
 */

const PredictionIntelligence = require('../layers/intelligent/PredictionIntelligence');
const PredictionOutput = require('../layers/output/PredictionOutput');
const SpendForecast = require('../models/SpendForecast');
const RiskPrediction = require('../models/RiskPrediction');
const WorkloadForecast = require('../models/WorkloadForecast');
const AnomalyAlert = require('../models/AnomalyAlert');
const PredictionScenario = require('../models/PredictionScenario');
const DemandForecast = require('../models/DemandForecast');

// ==================== DASHBOARD ====================

exports.getDashboard = async (req, res) => {
  try {
    const dashboardData = await PredictionOutput.getDashboardData();
    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const { type, severity, limit = 20 } = req.query;
    
    const alerts = [];
    
    // Get budget alerts
    if (!type || type === 'budget') {
      const budgetAlerts = await SpendForecast.getAlertForecasts(severity);
      budgetAlerts.forEach(f => {
        f.budgetAlerts.forEach(a => {
          alerts.push({
            type: 'budget',
            severity: a.severity,
            message: `Projected spend exceeds ${a.budgetName} by ${a.exceedPercentage?.toFixed(1)}%`,
            data: a
          });
        });
      });
    }
    
    // Get anomaly alerts
    if (!type || type === 'anomaly') {
      const anomalyAlerts = await AnomalyAlert.getUnresolvedBySeverity(severity);
      anomalyAlerts.slice(0, parseInt(limit)).forEach(a => {
        alerts.push({
          type: 'anomaly',
          severity: a.severity,
          message: a.description.summary,
          data: a.getSummary()
        });
      });
    }
    
    // Get risk alerts
    if (!type || type === 'risk') {
      const riskAlerts = await RiskPrediction.getHighRiskVendors(severity === 'critical' ? 80 : 70);
      riskAlerts.slice(0, parseInt(limit)).forEach(r => {
        alerts.push({
          type: 'risk',
          severity: r.overallRisk.tier,
          message: `${r.vendorName} has risk score of ${r.overallRisk.score}`,
          data: r.getSummary()
        });
      });
    }
    
    res.json({ success: true, data: alerts.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SPEND FORECASTING ====================

exports.generateSpendForecast = async (req, res) => {
  try {
    const { scopeType, entityId, entityName, periodType, horizonMonths, budgetAmount, budgetId, budgetName } = req.body;
    
    const forecast = await PredictionIntelligence.generateSpendForecast({
      scopeType,
      entityId,
      entityName,
      periodType,
      horizonMonths,
      budgetAmount,
      budgetId,
      budgetName,
      userId: req.user._id
    });
    
    res.status(201).json({ success: true, data: forecast });
  } catch (error) {
    console.error('Error generating spend forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSpendForecast = async (req, res) => {
  try {
    const { scopeType, entityId, periodType } = req.query;
    const forecast = await PredictionOutput.getSpendForecast({ scopeType, entityId, periodType });
    
    if (!forecast) {
      return res.status(404).json({ success: false, error: 'No forecast found' });
    }
    
    res.json({ success: true, data: forecast });
  } catch (error) {
    console.error('Error getting spend forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSpendForecastById = async (req, res) => {
  try {
    const forecast = await SpendForecast.findOne({ forecastId: req.params.forecastId });
    
    if (!forecast) {
      return res.status(404).json({ success: false, error: 'Forecast not found' });
    }
    
    res.json({ success: true, data: forecast });
  } catch (error) {
    console.error('Error getting forecast by ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getVendorSpendForecast = async (req, res) => {
  try {
    const forecast = await PredictionOutput.getSpendForecast({
      scopeType: 'vendor',
      entityId: req.params.vendorId
    });
    
    if (!forecast) {
      return res.status(404).json({ success: false, error: 'No vendor forecast found' });
    }
    
    res.json({ success: true, data: forecast });
  } catch (error) {
    console.error('Error getting vendor spend forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== VENDOR RISK PREDICTION ====================

exports.generateRiskPrediction = async (req, res) => {
  try {
    const prediction = await PredictionIntelligence.generateRiskPrediction(
      req.params.vendorId,
      { userId: req.user._id }
    );
    
    res.status(201).json({ success: true, data: prediction });
  } catch (error) {
    console.error('Error generating risk prediction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getVendorRisk = async (req, res) => {
  try {
    const risk = await PredictionOutput.getVendorRisk(req.params.vendorId);
    
    if (!risk) {
      return res.status(404).json({ success: false, error: 'No risk prediction found' });
    }
    
    res.json({ success: true, data: risk });
  } catch (error) {
    console.error('Error getting vendor risk:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getHighRiskVendors = async (req, res) => {
  try {
    const { threshold = 70, limit = 20 } = req.query;
    const vendors = await RiskPrediction.getHighRiskVendors(parseInt(threshold));
    
    res.json({
      success: true,
      data: vendors.slice(0, parseInt(limit)).map(v => v.getSummary())
    });
  } catch (error) {
    console.error('Error getting high risk vendors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRiskTrajectory = async (req, res) => {
  try {
    const prediction = await RiskPrediction.getActiveForVendor(req.params.vendorId);
    
    if (!prediction) {
      return res.status(404).json({ success: false, error: 'No prediction found' });
    }
    
    res.json({
      success: true,
      data: {
        trajectory: prediction.trajectory,
        trendAnalysis: prediction.getTrendAnalysis()
      }
    });
  } catch (error) {
    console.error('Error getting risk trajectory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== INVOICE & CASHFLOW ====================

exports.getInvoiceForecast = async (req, res) => {
  try {
    const forecast = await PredictionOutput.getCashflowProjection();
    res.json({ success: true, data: forecast });
  } catch (error) {
    console.error('Error getting invoice forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCashflowProjection = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const projection = await PredictionOutput.getCashflowProjection({ forecastDays: parseInt(days) });
    res.json({ success: true, data: projection });
  } catch (error) {
    console.error('Error getting cashflow projection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== DEMAND FORECASTING ====================

exports.getDemandForecast = async (req, res) => {
  try {
    const { scope, entityId, period } = req.query;
    
    const forecast = await DemandForecast.findOne({
      status: 'active',
      ...(scope && { 'scope.type': scope }),
      ...(entityId && { 'scope.entityId': entityId })
    }).sort({ createdAt: -1 });
    
    if (!forecast) {
      return res.status(404).json({ success: false, error: 'No demand forecast found' });
    }
    
    res.json({ success: true, data: forecast.getDashboardSummary() });
  } catch (error) {
    console.error('Error getting demand forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getContractRenewals = async (req, res) => {
  try {
    const { daysAhead = 90 } = req.query;
    
    const forecast = await DemandForecast.findOne({ status: 'active' })
      .sort({ createdAt: -1 });
    
    if (!forecast) {
      return res.json({ success: true, data: [] });
    }
    
    const renewals = forecast.getUpcomingRenewals(parseInt(daysAhead));
    res.json({ success: true, data: renewals });
  } catch (error) {
    console.error('Error getting contract renewals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== WORKLOAD FORECASTING ====================

exports.generateWorkloadForecast = async (req, res) => {
  try {
    const { scopeType, entityId, entityName, periodType, horizonWeeks } = req.body;
    
    const forecast = await PredictionIntelligence.generateWorkloadForecast({
      scopeType,
      entityId,
      entityName,
      periodType,
      horizonWeeks,
      userId: req.user._id
    });
    
    res.status(201).json({ success: true, data: forecast });
  } catch (error) {
    console.error('Error generating workload forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getWorkloadForecast = async (req, res) => {
  try {
    const forecast = await PredictionOutput.getWorkloadForecast(req.query);
    
    if (!forecast) {
      return res.status(404).json({ success: false, error: 'No workload forecast found' });
    }
    
    res.json({ success: true, data: forecast });
  } catch (error) {
    console.error('Error getting workload forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTeamWorkload = async (req, res) => {
  try {
    const forecast = await WorkloadForecast.findOne({ status: 'active' })
      .sort({ createdAt: -1 });
    
    if (!forecast) {
      return res.status(404).json({ success: false, error: 'No forecast found' });
    }
    
    const teamWorkload = forecast.teamWorkloads.find(tw => tw.team === req.params.team);
    
    if (!teamWorkload) {
      return res.status(404).json({ success: false, error: 'Team not found in forecast' });
    }
    
    res.json({ success: true, data: teamWorkload });
  } catch (error) {
    console.error('Error getting team workload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== ANOMALY DETECTION ====================

exports.detectAnomalies = async (req, res) => {
  try {
    const { entityType, entityId, sensitivity } = req.body;
    
    const result = await PredictionIntelligence.detectAnomalies(
      entityType,
      entityId,
      { sensitivity }
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAnomalies = async (req, res) => {
  try {
    const { status, severity, entityType, limit } = req.query;
    const result = await PredictionOutput.getAnomalyAlerts({
      status,
      severity,
      entityType,
      limit: parseInt(limit) || 50
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting anomalies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAnomalyById = async (req, res) => {
  try {
    const alert = await AnomalyAlert.findOne({ alertId: req.params.alertId })
      .populate('assignment.assignedTo', 'name email')
      .populate('resolution.resolvedBy', 'name email');
    
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Anomaly not found' });
    }
    
    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error getting anomaly:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.assignAnomaly = async (req, res) => {
  try {
    const { assignTo, priority, dueDate } = req.body;
    
    const alert = await AnomalyAlert.findOne({ alertId: req.params.alertId });
    
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Anomaly not found' });
    }
    
    await alert.assign(assignTo, priority, dueDate ? new Date(dueDate) : null);
    
    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error assigning anomaly:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.resolveAnomaly = async (req, res) => {
  try {
    const { outcome, notes, actionsTaken } = req.body;
    
    const alert = await AnomalyAlert.findOne({ alertId: req.params.alertId });
    
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Anomaly not found' });
    }
    
    await alert.resolve(req.user._id, outcome, notes, actionsTaken);
    
    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Error resolving anomaly:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== SCENARIO SIMULATION ====================

exports.createScenario = async (req, res) => {
  try {
    const scenario = new PredictionScenario({
      ...req.body,
      createdBy: req.user._id
    });
    
    await scenario.save();
    res.status(201).json({ success: true, data: scenario });
  } catch (error) {
    console.error('Error creating scenario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getScenarios = async (req, res) => {
  try {
    const { status, category, limit = 20 } = req.query;
    
    const query = { createdBy: req.user._id };
    if (status) query.status = status;
    if (category) query.category = category;
    
    const scenarios = await PredictionScenario.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({ success: true, data: scenarios.map(s => s.getSummary()) });
  } catch (error) {
    console.error('Error getting scenarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getScenarioTemplates = async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await PredictionScenario.getTemplates(category);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getScenarioById = async (req, res) => {
  try {
    const scenario = await PredictionScenario.findOne({
      scenarioId: req.params.scenarioId
    });
    
    if (!scenario) {
      return res.status(404).json({ success: false, error: 'Scenario not found' });
    }
    
    res.json({ success: true, data: scenario });
  } catch (error) {
    console.error('Error getting scenario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateScenario = async (req, res) => {
  try {
    const scenario = await PredictionScenario.findOneAndUpdate(
      { scenarioId: req.params.scenarioId, createdBy: req.user._id },
      { ...req.body, lastModifiedBy: req.user._id },
      { new: true }
    );
    
    if (!scenario) {
      return res.status(404).json({ success: false, error: 'Scenario not found' });
    }
    
    res.json({ success: true, data: scenario });
  } catch (error) {
    console.error('Error updating scenario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.runScenario = async (req, res) => {
  try {
    const scenario = await PredictionScenario.findOne({ scenarioId: req.params.scenarioId });
    
    if (!scenario) {
      return res.status(404).json({ success: false, error: 'Scenario not found' });
    }
    
    const result = await PredictionIntelligence.runScenarioSimulation(scenario._id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error running scenario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.cloneScenario = async (req, res) => {
  try {
    const { name } = req.body;
    
    const scenario = await PredictionScenario.findOne({ scenarioId: req.params.scenarioId });
    
    if (!scenario) {
      return res.status(404).json({ success: false, error: 'Scenario not found' });
    }
    
    const cloned = await scenario.clone(name, req.user._id);
    res.status(201).json({ success: true, data: cloned });
  } catch (error) {
    console.error('Error cloning scenario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteScenario = async (req, res) => {
  try {
    const result = await PredictionScenario.findOneAndDelete({
      scenarioId: req.params.scenarioId,
      createdBy: req.user._id
    });
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Scenario not found' });
    }
    
    res.json({ success: true, message: 'Scenario deleted' });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== INLINE PREDICTIONS ====================

exports.getInlinePrediction = async (req, res) => {
  try {
    const { type, entityId, entityType } = req.body;
    
    const prediction = await PredictionIntelligence.getInlinePrediction({
      type,
      entityId,
      entityType
    });
    
    res.json({ success: true, data: prediction });
  } catch (error) {
    console.error('Error getting inline prediction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== EXPLANATIONS ====================

exports.explainPrediction = async (req, res) => {
  try {
    const { type, predictionId } = req.params;
    
    const explanation = await PredictionIntelligence.explainPrediction(type, predictionId);
    res.json({ success: true, data: explanation });
  } catch (error) {
    console.error('Error explaining prediction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== WEBHOOKS ====================

exports.registerWebhook = async (req, res) => {
  try {
    const { eventType, url, secret } = req.body;
    
    const webhookId = PredictionOutput.registerWebhook(eventType, url, { secret });
    res.status(201).json({ success: true, data: { webhookId } });
  } catch (error) {
    console.error('Error registering webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.unregisterWebhook = async (req, res) => {
  try {
    const success = PredictionOutput.unregisterWebhook(req.params.webhookId);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    
    res.json({ success: true, message: 'Webhook unregistered' });
  } catch (error) {
    console.error('Error unregistering webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==================== EXPORT ====================

exports.exportPrediction = async (req, res) => {
  try {
    const { type, predictionId } = req.params;
    const { format = 'json' } = req.query;
    
    const data = await PredictionOutput.exportPredictionData(type, predictionId, format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-${predictionId}.csv`);
      return res.send(data);
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error exporting prediction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
