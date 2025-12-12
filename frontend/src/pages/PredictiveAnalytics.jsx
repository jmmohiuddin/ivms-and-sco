import { useState } from 'react';
import { 
  FiTrendingUp, FiTrendingDown, FiDollarSign, FiAlertCircle,
  FiActivity, FiBarChart2, FiPieChart, FiSliders
} from 'react-icons/fi';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PredictiveAnalytics = () => {
  const [scenarioValues, setScenarioValues] = useState({
    deliveryDelay: 0,
    demandIncrease: 0,
    priceInflation: 0,
    budgetCut: 0
  });

  const spendForecastData = [
    { month: 'Jan', actual: 180000, predicted: 185000, lower: 175000, upper: 195000 },
    { month: 'Feb', actual: 195000, predicted: 198000, lower: 188000, upper: 208000 },
    { month: 'Mar', actual: 210000, predicted: 215000, lower: 205000, upper: 225000 },
    { month: 'Apr', actual: null, predicted: 230000, lower: 220000, upper: 240000 },
    { month: 'May', actual: null, predicted: 245000, lower: 235000, upper: 255000 },
    { month: 'Jun', actual: null, predicted: 260000, lower: 250000, upper: 270000 }
  ];

  const riskTrendData = [
    { week: 'W1', avgRisk: 65, vendors: 45 },
    { week: 'W2', avgRisk: 68, vendors: 47 },
    { week: 'W3', avgRisk: 62, vendors: 43 },
    { week: 'W4', avgRisk: 70, vendors: 48 }
  ];

  const cashflowData = [
    { month: 'Jan', inflow: 2800000, outflow: 2400000 },
    { month: 'Feb', inflow: 3200000, outflow: 2600000 },
    { month: 'Mar', inflow: 2900000, outflow: 2500000 },
    { month: 'Apr', inflow: 3100000, outflow: 2700000 }
  ];

  const workloadData = [
    { day: 'Mon', invoices: 45 },
    { day: 'Tue', invoices: 52 },
    { day: 'Wed', invoices: 48 },
    { day: 'Thu', invoices: 61 },
    { day: 'Fri', invoices: 38 },
    { day: 'Sat', invoices: 12 },
    { day: 'Sun', invoices: 8 }
  ];

  const topCards = [
    { 
      label: 'Q1 2025 Spend Forecast',
      value: '$2.4M',
      change: '+18%',
      confidence: '87%',
      icon: FiDollarSign,
      color: 'blue',
      trend: 'up'
    },
    {
      label: 'Avg Vendor Risk',
      value: '68',
      change: '+5',
      confidence: '92%',
      icon: FiAlertCircle,
      color: 'yellow',
      trend: 'up'
    },
    {
      label: 'Predicted Invoice Volume',
      value: '243',
      change: '+12%',
      confidence: '89%',
      icon: FiActivity,
      color: 'purple',
      trend: 'up'
    },
    {
      label: 'Contract Overage Risk',
      value: '14%',
      change: '-3%',
      confidence: '85%',
      icon: FiTrendingDown,
      color: 'green',
      trend: 'down'
    }
  ];

  const insights = [
    {
      type: 'opportunity',
      title: 'Early Payment Opportunity',
      description: 'If you approve these 32 invoices today, backlog drops by 48%',
      action: 'Review invoices',
      impact: 'High',
      confidence: 91
    },
    {
      type: 'risk',
      title: 'Delivery Delay Risk',
      description: 'Vendor X has 21% chance of delay — consider early replenishment',
      action: 'Contact vendor',
      impact: 'Medium',
      confidence: 78
    },
    {
      type: 'warning',
      title: 'Compliance Lapse Risk',
      description: 'Compliance lapse risk increasing for Vendor Y in next 30 days',
      action: 'Schedule review',
      impact: 'High',
      confidence: 85
    }
  ];

  const handleScenarioChange = (key, value) => {
    setScenarioValues({ ...scenarioValues, [key]: value });
  };

  const calculateScenarioImpact = () => {
    const baseSpend = 2400000;
    const delayImpact = scenarioValues.deliveryDelay * 5000;
    const demandImpact = (scenarioValues.demandIncrease / 100) * baseSpend;
    const inflationImpact = (scenarioValues.priceInflation / 100) * baseSpend;
    const budgetImpact = (scenarioValues.budgetCut / 100) * baseSpend;
    
    const totalImpact = delayImpact + demandImpact + inflationImpact - budgetImpact;
    const newSpend = baseSpend + totalImpact;
    
    return {
      newSpend: newSpend.toLocaleString(),
      change: ((totalImpact / baseSpend) * 100).toFixed(1),
      delayRisk: Math.min(100, scenarioValues.deliveryDelay * 8),
      overageRisk: Math.max(0, 14 + (totalImpact / baseSpend) * 20)
    };
  };

  const scenarioImpact = calculateScenarioImpact();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Predictive Analytics</h1>
        <p className="text-gray-600 mt-1">Foresight made visual - predict trends, simulate scenarios, stay ahead</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {topCards.map((card, index) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === 'up' ? FiTrendingUp : FiTrendingDown;
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  card.color === 'blue' ? 'bg-blue-100' :
                  card.color === 'yellow' ? 'bg-yellow-100' :
                  card.color === 'purple' ? 'bg-purple-100' :
                  'bg-green-100'
                }`}>
                  <Icon className={`${
                    card.color === 'blue' ? 'text-blue-600' :
                    card.color === 'yellow' ? 'text-yellow-600' :
                    card.color === 'purple' ? 'text-purple-600' :
                    'text-green-600'
                  }`} size={20} />
                </div>
                <div className="flex items-center space-x-1">
                  <TrendIcon 
                    className={card.change.startsWith('+') && card.trend === 'up' ? 'text-red-600' : 'text-green-600'} 
                    size={14} 
                  />
                  <span className={`text-xs font-medium ${
                    card.change.startsWith('+') && card.trend === 'up' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {card.change}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className="text-xs text-gray-500">{card.confidence} confidence</p>
            </div>
          );
        })}
      </div>

      {/* Inline Predictive Hints */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiActivity className="text-white" size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">💡 AI Insight</h4>
            <p className="text-sm text-gray-700">
              If you approve the 32 pending invoices today, your backlog will drop by 48% and improve vendor relationships by 12%.
              <span className="text-purple-600 font-medium cursor-pointer hover:underline ml-1">View details →</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="col-span-2 space-y-6">
          {/* Spend Forecast */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Spend Forecast</h3>
                <p className="text-sm text-gray-600">Next 6 months prediction with confidence bands</p>
              </div>
              <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Next 6 months</option>
                <option>Next quarter</option>
                <option>Next year</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={spendForecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Area type="monotone" dataKey="lower" stackId="1" stroke="none" fill="#dbeafe" />
                <Area type="monotone" dataKey="upper" stackId="1" stroke="none" fill="#dbeafe" />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-xs text-gray-600">Actual</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-xs text-gray-600">Predicted</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <span className="text-xs text-gray-600">Confidence Band</span>
              </div>
            </div>
          </div>

          {/* Cashflow Projection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cashflow Projection</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Bar dataKey="inflow" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="outflow" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Workload Prediction */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">AP Volume Prediction</h3>
                <p className="text-sm text-gray-600">Next 14 days invoice processing workload</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="invoices" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column - Scenario Simulator & Insights */}
        <div className="space-y-6">
          {/* Scenario Simulator */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FiSliders className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-gray-900">Scenario Simulator</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Adjust variables to see impact on spend & risk</p>

            {/* Sliders */}
            <div className="space-y-5 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Delivery Delay (days)</label>
                  <span className="text-xs font-bold text-gray-900">{scenarioValues.deliveryDelay}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={scenarioValues.deliveryDelay}
                  onChange={(e) => handleScenarioChange('deliveryDelay', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Demand Increase (%)</label>
                  <span className="text-xs font-bold text-gray-900">{scenarioValues.demandIncrease}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={scenarioValues.demandIncrease}
                  onChange={(e) => handleScenarioChange('demandIncrease', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Price Inflation (%)</label>
                  <span className="text-xs font-bold text-gray-900">{scenarioValues.priceInflation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={scenarioValues.priceInflation}
                  onChange={(e) => handleScenarioChange('priceInflation', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Budget Cut (%)</label>
                  <span className="text-xs font-bold text-gray-900">{scenarioValues.budgetCut}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={scenarioValues.budgetCut}
                  onChange={(e) => handleScenarioChange('budgetCut', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">Projected Spend Impact</p>
                <p className="text-2xl font-bold text-gray-900">${scenarioImpact.newSpend}</p>
                <p className={`text-sm font-medium ${
                  parseFloat(scenarioImpact.change) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {scenarioImpact.change > 0 ? '+' : ''}{scenarioImpact.change}% change
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Delay Risk</p>
                  <p className="text-lg font-bold text-yellow-600">{scenarioImpact.delayRisk}%</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Overage Risk</p>
                  <p className="text-lg font-bold text-red-600">{scenarioImpact.overageRisk.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Save Scenario
            </button>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">AI Insights</h3>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-4 border-l-4 ${
                    insight.type === 'opportunity' ? 'bg-green-50 border-green-500' :
                    insight.type === 'risk' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">{insight.title}</h4>
                    <span className="text-xs px-2 py-1 bg-white rounded-full font-medium text-gray-700">
                      {insight.confidence}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">{insight.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Impact: {insight.impact}</span>
                    <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                      {insight.action} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;
