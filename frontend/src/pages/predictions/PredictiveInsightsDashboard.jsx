import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Calendar,
  Users,
  Activity,
  Target,
  Zap,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Shield,
  AlertCircle,
  BarChart3,
  LineChart,
  Layers,
  Brain
} from 'lucide-react';
import {
  LineChart as RechartsLine,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts';
import predictionService from '../../services/predictionService';

const PredictiveInsightsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('6m');
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard data states
  const [dashboardData, setDashboardData] = useState(null);
  const [spendForecast, setSpendForecast] = useState(null);
  const [riskPredictions, setRiskPredictions] = useState([]);
  const [anomalyAlerts, setAnomalyAlerts] = useState([]);
  const [workloadForecast, setWorkloadForecast] = useState(null);
  const [demandForecast, setDemandForecast] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all dashboard data in parallel
      const [dashboard, spend, risks, anomalies, workload, demand] = await Promise.all([
        predictionService.getDashboard().catch(() => generateMockDashboard()),
        predictionService.getSpendForecasts({ periods: 12 }).catch(() => generateMockSpendForecast()),
        predictionService.getRiskPredictions().catch(() => generateMockRiskPredictions()),
        predictionService.getAnomalyAlerts({ status: 'open' }).catch(() => generateMockAnomalies()),
        predictionService.getWorkloadForecasts().catch(() => generateMockWorkload()),
        predictionService.getDemandForecasts().catch(() => generateMockDemand())
      ]);

      setDashboardData(dashboard);
      setSpendForecast(spend);
      setRiskPredictions(risks.predictions || risks);
      setAnomalyAlerts(anomalies.alerts || anomalies);
      setWorkloadForecast(workload);
      setDemandForecast(demand);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Load mock data on error
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setDashboardData(generateMockDashboard());
    setSpendForecast(generateMockSpendForecast());
    setRiskPredictions(generateMockRiskPredictions());
    setAnomalyAlerts(generateMockAnomalies());
    setWorkloadForecast(generateMockWorkload());
    setDemandForecast(generateMockDemand());
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Mock data generators
  const generateMockDashboard = () => ({
    keyMetrics: {
      projectedSpend: 1250000,
      spendTrend: 5.2,
      avgRiskScore: 0.32,
      riskTrend: -3.5,
      anomalyCount: 7,
      complianceScore: 0.94,
      forecastAccuracy: 0.89
    },
    alerts: {
      critical: 2,
      high: 5,
      medium: 12,
      low: 8
    }
  });

  const generateMockSpendForecast = () => ({
    predictions: [
      { period: '2024-01', predictedAmount: 95000, lowerBound: 88000, upperBound: 102000, actual: 93500 },
      { period: '2024-02', predictedAmount: 102000, lowerBound: 94000, upperBound: 110000, actual: 105000 },
      { period: '2024-03', predictedAmount: 98000, lowerBound: 91000, upperBound: 105000, actual: 97200 },
      { period: '2024-04', predictedAmount: 115000, lowerBound: 106000, upperBound: 124000, actual: 118000 },
      { period: '2024-05', predictedAmount: 108000, lowerBound: 100000, upperBound: 116000, actual: 106500 },
      { period: '2024-06', predictedAmount: 125000, lowerBound: 116000, upperBound: 134000 },
      { period: '2024-07', predictedAmount: 118000, lowerBound: 109000, upperBound: 127000 },
      { period: '2024-08', predictedAmount: 130000, lowerBound: 120000, upperBound: 140000 },
      { period: '2024-09', predictedAmount: 122000, lowerBound: 113000, upperBound: 131000 },
      { period: '2024-10', predictedAmount: 135000, lowerBound: 125000, upperBound: 145000 },
      { period: '2024-11', predictedAmount: 128000, lowerBound: 118000, upperBound: 138000 },
      { period: '2024-12', predictedAmount: 145000, lowerBound: 134000, upperBound: 156000 }
    ],
    budgetComparison: {
      budgetAmount: 1400000,
      projectedTotal: 1421000,
      variance: 21000,
      variancePercent: 1.5,
      willExceed: true,
      exceedDate: '2024-11'
    }
  });

  const generateMockRiskPredictions = () => [
    { vendorId: 'V001', vendorName: 'TechSupply Inc', overall: 0.72, delivery: 0.65, quality: 0.45, compliance: 0.82, trajectory: 'declining' },
    { vendorId: 'V002', vendorName: 'Global Parts Ltd', overall: 0.45, delivery: 0.35, quality: 0.52, compliance: 0.48, trajectory: 'stable' },
    { vendorId: 'V003', vendorName: 'FastShip Corp', overall: 0.28, delivery: 0.22, quality: 0.30, compliance: 0.32, trajectory: 'improving' },
    { vendorId: 'V004', vendorName: 'QualityFirst LLC', overall: 0.55, delivery: 0.48, quality: 0.68, compliance: 0.50, trajectory: 'declining' },
    { vendorId: 'V005', vendorName: 'ReliableVendor Co', overall: 0.18, delivery: 0.15, quality: 0.20, compliance: 0.18, trajectory: 'stable' }
  ];

  const generateMockAnomalies = () => [
    { alertId: 'AA-001', type: 'spend', entityType: 'invoice', riskLevel: 'high', fraudProbability: 0.75, financialImpact: 15000, createdAt: new Date().toISOString() },
    { alertId: 'AA-002', type: 'bank_details', entityType: 'vendor', riskLevel: 'critical', fraudProbability: 0.92, financialImpact: 45000, createdAt: new Date().toISOString() },
    { alertId: 'AA-003', type: 'duplicate', entityType: 'invoice', riskLevel: 'medium', fraudProbability: 0.55, financialImpact: 8500, createdAt: new Date().toISOString() },
    { alertId: 'AA-004', type: 'volume', entityType: 'transaction', riskLevel: 'low', fraudProbability: 0.25, financialImpact: 3200, createdAt: new Date().toISOString() },
    { alertId: 'AA-005', type: 'pricing', entityType: 'invoice', riskLevel: 'high', fraudProbability: 0.68, financialImpact: 22000, createdAt: new Date().toISOString() }
  ];

  const generateMockWorkload = () => ({
    teamForecasts: [
      { team: 'Accounts Payable', predictions: [
        { period: 'Week 1', predictedLoad: 85, capacity: 100 },
        { period: 'Week 2', predictedLoad: 92, capacity: 100 },
        { period: 'Week 3', predictedLoad: 78, capacity: 100 },
        { period: 'Week 4', predictedLoad: 105, capacity: 100 }
      ]},
      { team: 'Procurement', predictions: [
        { period: 'Week 1', predictedLoad: 72, capacity: 100 },
        { period: 'Week 2', predictedLoad: 68, capacity: 100 },
        { period: 'Week 3', predictedLoad: 88, capacity: 100 },
        { period: 'Week 4', predictedLoad: 75, capacity: 100 }
      ]},
      { team: 'Compliance', predictions: [
        { period: 'Week 1', predictedLoad: 55, capacity: 100 },
        { period: 'Week 2', predictedLoad: 62, capacity: 100 },
        { period: 'Week 3', predictedLoad: 95, capacity: 100 },
        { period: 'Week 4', predictedLoad: 48, capacity: 100 }
      ]}
    ],
    spikes: [
      { team: 'Accounts Payable', date: 'Week 4', magnitude: 1.05, reason: 'Month-end processing' },
      { team: 'Compliance', date: 'Week 3', magnitude: 0.95, reason: 'Quarterly audit preparation' }
    ]
  });

  const generateMockDemand = () => ({
    predictions: [
      { period: '2024-01', predictedDemand: 1200, lowerBound: 1100, upperBound: 1300 },
      { period: '2024-02', predictedDemand: 1350, lowerBound: 1240, upperBound: 1460 },
      { period: '2024-03', predictedDemand: 1280, lowerBound: 1175, upperBound: 1385 },
      { period: '2024-04', predictedDemand: 1420, lowerBound: 1305, upperBound: 1535 },
      { period: '2024-05', predictedDemand: 1380, lowerBound: 1265, upperBound: 1495 },
      { period: '2024-06', predictedDemand: 1550, lowerBound: 1420, upperBound: 1680 }
    ]
  });

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const RISK_COLORS = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#991b1b'
  };

  // Render functions
  const renderMetricCard = (title, value, trend, icon, color = 'blue') => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600'
    };

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    );
  };

  const renderSpendForecastChart = () => {
    if (!spendForecast?.predictions) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Spend Forecast</h3>
            <p className="text-sm text-gray-500">12-month projection with confidence intervals</p>
          </div>
          {spendForecast.budgetComparison?.willExceed && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              Budget breach predicted: {spendForecast.budgetComparison.exceedDate}
            </div>
          )}
        </div>
        
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={spendForecast.predictions}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.1}
              name="Upper Bound"
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
              name="Lower Bound"
            />
            <Line
              type="monotone"
              dataKey="predictedAmount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Predicted"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4 }}
              name="Actual"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {spendForecast.budgetComparison && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Annual Budget</p>
              <p className="text-lg font-semibold">${(spendForecast.budgetComparison.budgetAmount/1000).toFixed(0)}k</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Projected Total</p>
              <p className="text-lg font-semibold">${(spendForecast.budgetComparison.projectedTotal/1000).toFixed(0)}k</p>
            </div>
            <div className={`text-center p-3 rounded-lg ${spendForecast.budgetComparison.variance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-sm text-gray-500">Variance</p>
              <p className={`text-lg font-semibold ${spendForecast.budgetComparison.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {spendForecast.budgetComparison.variance > 0 ? '+' : ''}{spendForecast.budgetComparison.variancePercent.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-500">Forecast Accuracy</p>
              <p className="text-lg font-semibold text-blue-600">
                {(dashboardData?.keyMetrics?.forecastAccuracy * 100 || 89).toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVendorRiskHeatmap = () => {
    if (!riskPredictions?.length) return null;

    const riskDimensions = ['delivery', 'quality', 'compliance'];
    
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Vendor Risk Matrix</h3>
            <p className="text-sm text-gray-500">Multi-dimensional risk assessment</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendor</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Overall</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Delivery</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Quality</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Compliance</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Trajectory</th>
              </tr>
            </thead>
            <tbody>
              {riskPredictions.slice(0, 5).map((vendor) => (
                <tr key={vendor.vendorId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">{vendor.vendorName}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center justify-center w-12 h-8 rounded text-sm font-medium
                      ${vendor.overall >= 0.7 ? 'bg-red-100 text-red-700' : 
                        vendor.overall >= 0.4 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'}`}>
                      {(vendor.overall * 100).toFixed(0)}
                    </span>
                  </td>
                  {riskDimensions.map((dim) => (
                    <td key={dim} className="py-4 px-4 text-center">
                      <div 
                        className="w-full h-6 rounded overflow-hidden bg-gray-100"
                        title={`${(vendor[dim] * 100).toFixed(0)}%`}
                      >
                        <div 
                          className={`h-full transition-all ${
                            vendor[dim] >= 0.7 ? 'bg-red-500' : 
                            vendor[dim] >= 0.4 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${vendor[dim] * 100}%` }}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-sm
                      ${vendor.trajectory === 'declining' ? 'text-red-600' : 
                        vendor.trajectory === 'improving' ? 'text-green-600' : 
                        'text-gray-600'}`}>
                      {vendor.trajectory === 'declining' ? <TrendingDown className="w-4 h-4" /> : 
                       vendor.trajectory === 'improving' ? <TrendingUp className="w-4 h-4" /> : 
                       <Activity className="w-4 h-4" />}
                      {vendor.trajectory}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAnomalyAlerts = () => {
    if (!anomalyAlerts?.length) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Anomaly Alerts</h3>
            <p className="text-sm text-gray-500">Detected fraud and anomaly signals</p>
          </div>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            {anomalyAlerts.length} Active
          </span>
        </div>

        <div className="space-y-4">
          {anomalyAlerts.slice(0, 5).map((alert) => (
            <div 
              key={alert.alertId} 
              className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                alert.riskLevel === 'critical' ? 'bg-red-50 border-red-500' :
                alert.riskLevel === 'high' ? 'bg-orange-50 border-orange-500' :
                alert.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  alert.riskLevel === 'critical' ? 'bg-red-100' :
                  alert.riskLevel === 'high' ? 'bg-orange-100' :
                  alert.riskLevel === 'medium' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${
                    alert.riskLevel === 'critical' ? 'text-red-600' :
                    alert.riskLevel === 'high' ? 'text-orange-600' :
                    alert.riskLevel === 'medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {alert.type.replace('_', ' ')} Anomaly
                  </p>
                  <p className="text-sm text-gray-500">
                    {alert.entityType} • Fraud probability: {(alert.fraudProbability * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ${alert.financialImpact?.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Potential impact</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWorkloadForecast = () => {
    if (!workloadForecast?.teamForecasts) return null;

    const chartData = workloadForecast.teamForecasts[0]?.predictions.map((_, idx) => {
      const point = { period: workloadForecast.teamForecasts[0].predictions[idx].period };
      workloadForecast.teamForecasts.forEach((team) => {
        point[team.team] = team.predictions[idx]?.predictedLoad || 0;
      });
      return point;
    }) || [];

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Workload Forecast</h3>
            <p className="text-sm text-gray-500">Team capacity utilization predictions</p>
          </div>
          {workloadForecast.spikes?.length > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              {workloadForecast.spikes.length} Spikes Detected
            </span>
          )}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 120]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value}%`, '']} />
            <Legend />
            {workloadForecast.teamForecasts.map((team, idx) => (
              <Bar 
                key={team.team} 
                dataKey={team.team} 
                fill={COLORS[idx]} 
                radius={[4, 4, 0, 0]}
              />
            ))}
            {/* Capacity line */}
            <Line 
              type="monotone" 
              dataKey={() => 100} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              strokeWidth={2}
              name="Capacity"
            />
          </BarChart>
        </ResponsiveContainer>

        {workloadForecast.spikes?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Predicted Spikes</h4>
            <div className="flex flex-wrap gap-2">
              {workloadForecast.spikes.map((spike, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-lg text-sm"
                >
                  {spike.team}: {spike.date} ({spike.reason})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDemandForecast = () => {
    if (!demandForecast?.predictions) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Demand Forecast</h3>
            <p className="text-sm text-gray-500">Predicted demand with uncertainty bands</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={demandForecast.predictions}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.2}
              name="Upper Bound"
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="#8b5cf6"
              fill="#ffffff"
              fillOpacity={1}
              name="Lower Bound"
            />
            <Line
              type="monotone"
              dataKey="predictedDemand"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              name="Predicted Demand"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderAlertSummary = () => {
    if (!dashboardData?.alerts) return null;

    const alertData = [
      { name: 'Critical', value: dashboardData.alerts.critical, color: '#991b1b' },
      { name: 'High', value: dashboardData.alerts.high, color: '#ea580c' },
      { name: 'Medium', value: dashboardData.alerts.medium, color: '#ca8a04' },
      { name: 'Low', value: dashboardData.alerts.low, color: '#2563eb' }
    ];

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Summary</h3>
        
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={alertData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {alertData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {alertData.map((alert) => (
            <div key={alert.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: alert.color }} />
              <span className="text-sm text-gray-600">{alert.name}: {alert.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-gray-500">Loading predictive insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600" />
            Predictive Analytics Dashboard
          </h1>
          <p className="text-gray-500 mt-1">AI-powered forecasting and risk predictions</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="12m">12 Months</option>
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Projected Annual Spend',
          `$${((dashboardData?.keyMetrics?.projectedSpend || 0) / 1000000).toFixed(2)}M`,
          dashboardData?.keyMetrics?.spendTrend,
          <DollarSign className="w-6 h-6" />,
          'blue'
        )}
        {renderMetricCard(
          'Average Risk Score',
          `${((dashboardData?.keyMetrics?.avgRiskScore || 0) * 100).toFixed(0)}%`,
          dashboardData?.keyMetrics?.riskTrend,
          <Shield className="w-6 h-6" />,
          dashboardData?.keyMetrics?.avgRiskScore > 0.5 ? 'red' : 'green'
        )}
        {renderMetricCard(
          'Active Anomalies',
          dashboardData?.keyMetrics?.anomalyCount || 0,
          undefined,
          <AlertTriangle className="w-6 h-6" />,
          'yellow'
        )}
        {renderMetricCard(
          'Compliance Score',
          `${((dashboardData?.keyMetrics?.complianceScore || 0) * 100).toFixed(0)}%`,
          undefined,
          <Target className="w-6 h-6" />,
          dashboardData?.keyMetrics?.complianceScore > 0.9 ? 'green' : 'yellow'
        )}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {renderSpendForecastChart()}
        </div>
        <div>
          {renderAlertSummary()}
        </div>
      </div>

      {/* Risk & Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderVendorRiskHeatmap()}
        {renderAnomalyAlerts()}
      </div>

      {/* Workload & Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderWorkloadForecast()}
        {renderDemandForecast()}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <LineChart className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">New Forecast</span>
          </button>
          <button className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <Layers className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Run Scenario</span>
          </button>
          <button className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Review Alerts</span>
          </button>
          <button className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictiveInsightsDashboard;
