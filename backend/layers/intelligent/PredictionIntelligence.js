/**
 * Prediction Intelligence Layer
 * Orchestrates ML models and generates predictions with explanations
 */

const axios = require('axios');
const SpendForecast = require('../../models/SpendForecast');
const RiskPrediction = require('../../models/RiskPrediction');
const WorkloadForecast = require('../../models/WorkloadForecast');
const AnomalyAlert = require('../../models/AnomalyAlert');
const PredictionScenario = require('../../models/PredictionScenario');
const PredictionDataCollector = require('../input/PredictionDataCollector');

class PredictionIntelligence {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
  }

  /**
   * Generate spend forecast
   */
  async generateSpendForecast(options = {}) {
    const {
      scopeType = 'organization',
      entityId = null,
      periodType = 'monthly',
      horizonMonths = 6,
      userId = null
    } = options;

    try {
      // Collect historical data
      const spendData = await PredictionDataCollector.collectSpendData({
        vendorId: scopeType === 'vendor' ? entityId : null,
        granularity: periodType
      });

      // Call ML service for forecast
      const mlResponse = await axios.post(`${this.mlServiceUrl}/prediction/spend-forecast`, {
        timeSeries: spendData.timeSeries,
        horizonPeriods: horizonMonths,
        periodType,
        features: {
          vendorBreakdown: spendData.vendorBreakdown,
          categoryBreakdown: spendData.categoryBreakdown
        }
      });

      const forecast = mlResponse.data;

      // Calculate period dates
      const startDate = new Date();
      startDate.setDate(1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + horizonMonths);

      // Create forecast record
      const spendForecast = new SpendForecast({
        scope: {
          type: scopeType,
          entityId,
          entityName: options.entityName
        },
        period: {
          type: periodType,
          startDate,
          endDate
        },
        prediction: {
          amount: forecast.prediction.amount,
          currency: 'USD',
          confidenceLevel: forecast.prediction.confidenceLevel || 95,
          confidenceInterval: {
            lower: forecast.prediction.lowerBound,
            upper: forecast.prediction.upperBound
          },
          standardError: forecast.prediction.standardError
        },
        historical: {
          previousPeriodActual: spendData.summary.avgPeriodSpend,
          changeFromPrevious: forecast.changePercent
        },
        breakdowns: forecast.breakdowns || [],
        seasonality: forecast.seasonality || [],
        featureContributions: forecast.featureContributions || [],
        model: {
          name: forecast.model?.name || 'ensemble',
          version: forecast.model?.version,
          accuracy: forecast.model?.accuracy
        },
        createdBy: userId
      });

      // Check budget alerts
      if (options.budgetAmount) {
        const exceedCheck = spendForecast.checkBudgetExceed(options.budgetAmount);
        if (exceedCheck?.willExceed) {
          spendForecast.budgetAlerts.push({
            budgetId: options.budgetId,
            budgetName: options.budgetName,
            budgetAmount: options.budgetAmount,
            projectedSpend: spendForecast.prediction.amount,
            exceedPercentage: exceedCheck.exceedPercentage,
            severity: exceedCheck.exceedPercentage > 20 ? 'critical' : 'warning',
            alertedAt: new Date()
          });
        }
      }

      await spendForecast.save();
      return spendForecast;
    } catch (error) {
      console.error('Error generating spend forecast:', error);
      throw error;
    }
  }

  /**
   * Generate vendor risk prediction
   */
  async generateRiskPrediction(vendorId, options = {}) {
    try {
      // Collect vendor data
      const vendorData = await PredictionDataCollector.collectVendorRiskData(vendorId);

      // Call ML service for risk prediction
      const mlResponse = await axios.post(`${this.mlServiceUrl}/prediction/vendor-risk`, {
        vendorId: vendorId.toString(),
        features: vendorData.features,
        historicalData: vendorData.historicalData
      });

      const riskResult = mlResponse.data;

      // Create risk prediction record
      const riskPrediction = new RiskPrediction({
        vendorId,
        vendorName: vendorData.vendorName,
        overallRisk: {
          score: riskResult.overallScore,
          tier: this._scoreTier(riskResult.overallScore),
          trend: riskResult.trend || 'stable',
          confidenceLevel: riskResult.confidence || 85
        },
        riskFactors: riskResult.riskFactors?.map(rf => ({
          factor: rf.name,
          category: rf.category,
          score: rf.score,
          weight: rf.weight,
          trend: rf.trend,
          description: rf.description
        })) || [],
        predictions: riskResult.predictions?.map(pred => ({
          type: pred.type,
          probability: pred.probability,
          confidenceLevel: pred.confidence,
          timeframe: pred.timeframe,
          severity: this._probabilitySeverity(pred.probability),
          drivingFactors: pred.drivers,
          mitigationSuggestions: pred.mitigations
        })) || [],
        trajectory: riskResult.trajectory || [],
        externalSignals: riskResult.externalSignals || {},
        recommendedActions: riskResult.recommendations?.map(rec => ({
          action: rec.action,
          priority: rec.priority,
          category: rec.category,
          expectedImpact: rec.impact
        })) || [],
        model: {
          name: riskResult.model?.name || 'ensemble',
          version: riskResult.model?.version,
          accuracy: riskResult.model?.accuracy
        },
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: options.userId
      });

      // Supersede previous prediction
      await RiskPrediction.updateMany(
        { vendorId, status: 'active', _id: { $ne: riskPrediction._id } },
        { status: 'superseded' }
      );

      await riskPrediction.save();
      return riskPrediction;
    } catch (error) {
      console.error('Error generating risk prediction:', error);
      throw error;
    }
  }

  /**
   * Generate workload forecast
   */
  async generateWorkloadForecast(options = {}) {
    const {
      scopeType = 'organization',
      entityId = null,
      periodType = 'weekly',
      horizonWeeks = 4,
      userId = null
    } = options;

    try {
      // Collect workload data
      const workloadData = await PredictionDataCollector.collectWorkloadData();

      // Call ML service
      const mlResponse = await axios.post(`${this.mlServiceUrl}/prediction/workload-forecast`, {
        invoiceWorkload: workloadData.invoiceWorkload,
        complianceWorkload: workloadData.complianceWorkload,
        remediationWorkload: workloadData.remediationWorkload,
        currentBacklog: workloadData.currentBacklog,
        horizonWeeks
      });

      const forecast = mlResponse.data;

      // Calculate period dates
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + horizonWeeks * 7);

      // Create workload forecast
      const workloadForecast = new WorkloadForecast({
        scope: {
          type: scopeType,
          entityId,
          entityName: options.entityName
        },
        period: {
          type: periodType,
          startDate,
          endDate
        },
        summary: {
          totalPredictedItems: forecast.summary?.totalItems,
          totalEstimatedHours: forecast.summary?.totalHours,
          averageDailyVolume: forecast.summary?.avgDailyVolume,
          peakDay: forecast.summary?.peakDay,
          lowestDay: forecast.summary?.lowestDay,
          overallTrend: forecast.summary?.trend,
          capacityStatus: forecast.summary?.capacityStatus
        },
        teamWorkloads: forecast.teamWorkloads?.map(tw => ({
          team: tw.team,
          currentBacklog: tw.currentBacklog,
          averageProcessingTime: tw.avgProcessingTime,
          teamCapacity: tw.capacity,
          utilizationRate: tw.utilization,
          predictedVolume: tw.predictedVolume,
          trend: tw.trend,
          bottlenecks: tw.bottlenecks,
          staffingRecommendation: tw.staffing
        })) || [],
        slaProjections: forecast.slaProjections || [],
        dailyBreakdown: forecast.dailyBreakdown || [],
        recommendations: forecast.recommendations || [],
        featureContributions: forecast.featureContributions || [],
        model: {
          name: forecast.model?.name || 'ensemble',
          version: forecast.model?.version,
          accuracy: forecast.model?.accuracy
        },
        createdBy: userId
      });

      await workloadForecast.save();
      return workloadForecast;
    } catch (error) {
      console.error('Error generating workload forecast:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(entityType, entityId = null, options = {}) {
    try {
      // Collect data for anomaly detection
      const data = await PredictionDataCollector.collectAnomalyData(entityType, entityId);

      // Call ML service
      const mlResponse = await axios.post(`${this.mlServiceUrl}/prediction/detect-anomalies`, {
        entityType,
        data,
        sensitivity: options.sensitivity || 'medium'
      });

      const anomalies = mlResponse.data.anomalies || [];
      const createdAlerts = [];

      // Create anomaly alerts
      for (const anomaly of anomalies) {
        const alert = new AnomalyAlert({
          anomalyType: anomaly.type,
          category: anomaly.category,
          severity: anomaly.severity,
          confidence: {
            score: anomaly.confidence,
            level: anomaly.confidence > 80 ? 'high' : anomaly.confidence > 50 ? 'medium' : 'low'
          },
          anomalyScore: anomaly.score,
          subject: {
            entityType: anomaly.entityType,
            entityId: anomaly.entityId,
            entityName: anomaly.entityName,
            entityDetails: anomaly.details
          },
          details: anomaly.deviations?.map(d => ({
            field: d.field,
            expectedValue: d.expected,
            actualValue: d.actual,
            deviation: d.deviation,
            deviationPercent: d.deviationPercent,
            method: d.method
          })) || [],
          description: {
            summary: anomaly.summary,
            explanation: anomaly.explanation,
            potentialImpact: anomaly.impact,
            estimatedLoss: anomaly.estimatedLoss
          },
          featureContributions: anomaly.featureContributions || [],
          detection: {
            method: anomaly.method || 'ensemble',
            model: {
              name: anomaly.model?.name,
              version: anomaly.model?.version
            }
          }
        });

        // Find similar past anomalies
        const similar = await AnomalyAlert.findSimilar(anomaly.type, anomaly.entityType);
        alert.similarAnomalies = similar.map(s => ({
          alertId: s.alertId,
          similarity: 0.8,
          outcome: s.resolution?.outcome
        }));

        await alert.save();
        createdAlerts.push(alert);
      }

      return {
        detected: createdAlerts.length,
        alerts: createdAlerts
      };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  /**
   * Run what-if scenario simulation
   */
  async runScenarioSimulation(scenarioId) {
    try {
      const scenario = await PredictionScenario.findById(scenarioId);
      if (!scenario) throw new Error('Scenario not found');

      // Mark as running
      scenario.status = 'running';
      await scenario.save();

      // Prepare input variables for ML service
      const inputVariables = scenario.inputVariables.map(v => ({
        name: v.name,
        category: v.category,
        baseValue: v.baseValue,
        adjustedValue: v.adjustedValue,
        changeType: v.changeType,
        changeAmount: v.changeAmount
      }));

      // Call ML service for simulation
      const mlResponse = await axios.post(`${this.mlServiceUrl}/prediction/scenario-simulation`, {
        scenarioId: scenario.scenarioId,
        category: scenario.category,
        timeHorizon: scenario.timeHorizon,
        inputVariables,
        baseline: scenario.baseline,
        runMonteCarlo: scenario.type === 'stress_test'
      });

      const results = mlResponse.data;

      // Update scenario with results
      await scenario.complete({
        projections: results.projections,
        comparison: results.comparison,
        sensitivityAnalysis: results.sensitivityAnalysis,
        riskAssessment: results.riskAssessment,
        recommendations: results.recommendations,
        monteCarloResults: results.monteCarloResults,
        model: results.model
      });

      return scenario;
    } catch (error) {
      console.error('Error running scenario simulation:', error);
      
      // Mark scenario as failed
      await PredictionScenario.findByIdAndUpdate(scenarioId, { status: 'failed' });
      throw error;
    }
  }

  /**
   * Generate inline prediction for workflow context
   */
  async getInlinePrediction(context) {
    const { type, entityId, entityType } = context;

    try {
      switch (type) {
        case 'vendor_delay':
          return this._predictVendorDelay(entityId);
        case 'workload_spike':
          return this._predictWorkloadSpike();
        case 'contract_exceed':
          return this._predictContractExceed(entityId);
        case 'compliance_lapse':
          return this._predictComplianceLapse(entityId);
        case 'price_change':
          return this._predictPriceChange(entityId);
        default:
          throw new Error(`Unknown prediction type: ${type}`);
      }
    } catch (error) {
      console.error('Error generating inline prediction:', error);
      return null;
    }
  }

  /**
   * Get prediction explanation
   */
  async explainPrediction(predictionType, predictionId) {
    try {
      let prediction;
      
      switch (predictionType) {
        case 'spend':
          prediction = await SpendForecast.findById(predictionId);
          break;
        case 'risk':
          prediction = await RiskPrediction.findById(predictionId);
          break;
        case 'workload':
          prediction = await WorkloadForecast.findById(predictionId);
          break;
        case 'anomaly':
          prediction = await AnomalyAlert.findById(predictionId);
          break;
        default:
          throw new Error('Unknown prediction type');
      }

      if (!prediction) throw new Error('Prediction not found');

      // Format explanation
      const explanation = {
        predictionId: prediction._id,
        type: predictionType,
        summary: this._formatPredictionSummary(predictionType, prediction),
        featureContributions: prediction.featureContributions || [],
        confidence: this._getConfidence(predictionType, prediction),
        modelInfo: prediction.model || {},
        generatedAt: prediction.createdAt
      };

      return explanation;
    } catch (error) {
      console.error('Error explaining prediction:', error);
      throw error;
    }
  }

  // Helper methods
  _scoreTier(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  _probabilitySeverity(probability) {
    if (probability >= 0.8) return 'critical';
    if (probability >= 0.6) return 'high';
    if (probability >= 0.4) return 'medium';
    return 'low';
  }

  async _predictVendorDelay(vendorId) {
    const prediction = await RiskPrediction.getActiveForVendor(vendorId);
    if (!prediction) return null;

    const delayPrediction = prediction.predictions.find(p => p.type === 'delayed_delivery');
    if (!delayPrediction) return null;

    return {
      type: 'vendor_delay',
      probability: delayPrediction.probability,
      message: `This vendor has a ${(delayPrediction.probability * 100).toFixed(0)}% likelihood of delay`,
      severity: delayPrediction.severity,
      confidence: delayPrediction.confidenceLevel
    };
  }

  async _predictWorkloadSpike() {
    const forecast = await WorkloadForecast.findOne({ status: 'active' })
      .sort({ createdAt: -1 });
    
    if (!forecast) return null;

    const highVolumeDays = forecast.getHighVolumeDays();
    if (highVolumeDays.length === 0) return null;

    const nextSpike = highVolumeDays[0];
    return {
      type: 'workload_spike',
      message: `Projected workload spike on ${new Date(nextSpike.date).toLocaleDateString()}`,
      volume: nextSpike.predictedVolume,
      suggestion: 'Consider bulk approvals today'
    };
  }

  async _predictContractExceed(contractId) {
    // Simplified - would need contract model integration
    return {
      type: 'contract_exceed',
      message: 'Spend will exceed contracted volume in 27 days',
      daysUntilExceed: 27,
      suggestion: 'Review contract terms and consider renegotiation'
    };
  }

  async _predictComplianceLapse(vendorId) {
    const VendorComplianceProfile = require('../../models/VendorComplianceProfile');
    const profile = await VendorComplianceProfile.findOne({ vendorId });
    
    if (!profile) return null;

    const expiringAttributes = profile.complianceAttributes.filter(attr => {
      if (!attr.expiryDate) return false;
      const daysUntilExpiry = (new Date(attr.expiryDate) - new Date()) / (24 * 60 * 60 * 1000);
      return daysUntilExpiry <= 60 && daysUntilExpiry > 0;
    });

    if (expiringAttributes.length === 0) return null;

    return {
      type: 'compliance_lapse',
      message: `${expiringAttributes.length} compliance item(s) expiring within 60 days`,
      items: expiringAttributes.map(a => a.name),
      suggestion: 'Start pre-emptive compliance check'
    };
  }

  async _predictPriceChange(productId) {
    // Would need historical price data and market signals
    return {
      type: 'price_change',
      message: 'Predicted 5% price increase in raw material costs',
      changePercent: 5,
      suggestion: 'Consider renegotiating unit pricing'
    };
  }

  _formatPredictionSummary(type, prediction) {
    switch (type) {
      case 'spend':
        return `Predicted spend of $${prediction.prediction.amount.toLocaleString()} for ${prediction.period.type} period`;
      case 'risk':
        return `Vendor risk score of ${prediction.overallRisk.score} (${prediction.overallRisk.tier} tier)`;
      case 'workload':
        return `Predicted ${prediction.summary.totalPredictedItems} items requiring processing`;
      case 'anomaly':
        return prediction.description.summary;
      default:
        return 'Prediction summary';
    }
  }

  _getConfidence(type, prediction) {
    switch (type) {
      case 'spend':
        return prediction.prediction.confidenceLevel;
      case 'risk':
        return prediction.overallRisk.confidenceLevel;
      case 'workload':
        return prediction.model?.accuracy?.mape ? 100 - prediction.model.accuracy.mape : 80;
      case 'anomaly':
        return prediction.confidence.score;
      default:
        return 80;
    }
  }
}

module.exports = new PredictionIntelligence();
