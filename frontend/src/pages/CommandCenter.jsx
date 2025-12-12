import { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import outputLayerService from '../services/outputLayerService';
import intelligentLayerService from '../services/intelligentLayerService';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CommandCenter = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  useEffect(() => {
    fetchCommandCenterData();
  }, [selectedTimeRange]);

  const fetchCommandCenterData = async () => {
    try {
      setLoading(true);
      const data = await outputLayerService.combined.getCommandCenterData();
      setDashboardData(data.dashboard);
      setAlerts(data.alerts || []);
      setKpis(data.kpis);
    } catch (error) {
      console.error('Error fetching command center data:', error);
      // Set demo data for development
      setDemoData();
    } finally {
      setLoading(false);
    }
  };

  const setDemoData = () => {
    setDashboardData({
      summary: {
        totalVendors: 156,
        activeContracts: 89,
        pendingInvoices: 34,
        complianceRate: 94.5,
        totalSpend: 2450000,
        savingsRealized: 185000
      },
      trends: {
        spend: [
          { month: 'Jan', amount: 380000 },
          { month: 'Feb', amount: 420000 },
          { month: 'Mar', amount: 395000 },
          { month: 'Apr', amount: 450000 },
          { month: 'May', amount: 410000 },
          { month: 'Jun', amount: 395000 }
        ],
        vendorPerformance: [
          { month: 'Jan', score: 82 },
          { month: 'Feb', score: 85 },
          { month: 'Mar', score: 83 },
          { month: 'Apr', score: 88 },
          { month: 'May', score: 91 },
          { month: 'Jun', score: 89 }
        ]
      },
      riskDistribution: [
        { name: 'Low Risk', value: 65, color: '#10B981' },
        { name: 'Medium Risk', value: 25, color: '#F59E0B' },
        { name: 'High Risk', value: 8, color: '#EF4444' },
        { name: 'Critical', value: 2, color: '#7F1D1D' }
      ],
      topVendors: [
        { name: 'Acme Corp', score: 95, spend: 450000 },
        { name: 'TechSupply Inc', score: 92, spend: 380000 },
        { name: 'Global Parts Ltd', score: 89, spend: 320000 },
        { name: 'Prime Logistics', score: 87, spend: 280000 },
        { name: 'QuickSource Co', score: 85, spend: 250000 }
      ]
    });

    setAlerts([
      {
        id: 1,
        type: 'fraud',
        severity: 'critical',
        title: 'Potential Duplicate Invoice Detected',
        description: 'Invoice #INV-2024-0156 appears to be a duplicate of #INV-2024-0142',
        timestamp: new Date().toISOString(),
        entityId: 'vendor-123',
        entityName: 'TechSupply Inc'
      },
      {
        id: 2,
        type: 'compliance',
        severity: 'high',
        title: 'Certificate Expiring Soon',
        description: 'ISO 9001 certificate for Global Parts Ltd expires in 15 days',
        timestamp: new Date().toISOString(),
        entityId: 'vendor-456',
        entityName: 'Global Parts Ltd'
      },
      {
        id: 3,
        type: 'performance',
        severity: 'medium',
        title: 'Delivery Performance Decline',
        description: 'On-time delivery rate dropped to 78% for Prime Logistics',
        timestamp: new Date().toISOString(),
        entityId: 'vendor-789',
        entityName: 'Prime Logistics'
      },
      {
        id: 4,
        type: 'financial',
        severity: 'low',
        title: 'Payment Due Soon',
        description: '5 invoices totaling $45,000 due within 7 days',
        timestamp: new Date().toISOString()
      }
    ]);

    setKpis({
      vendorScore: { value: 87, change: 2.5, trend: 'up' },
      complianceRate: { value: 94.5, change: 1.2, trend: 'up' },
      costSavings: { value: 185000, change: 15.3, trend: 'up' },
      riskScore: { value: 23, change: -5.2, trend: 'down' },
      invoiceAccuracy: { value: 98.2, change: 0.8, trend: 'up' },
      onTimeDelivery: { value: 92.4, change: -1.1, trend: 'down' }
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'fraud': return '🚨';
      case 'compliance': return '📋';
      case 'performance': return '📊';
      case 'financial': return '💰';
      default: return '⚠️';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const KPICard = ({ title, value, change, trend, format = 'number', suffix = '' }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {trend && (
          <span className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="mt-2">
        <span className="text-3xl font-bold text-gray-900">
          {format === 'currency' ? formatCurrency(value) : value.toLocaleString()}
          {suffix}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading Command Center...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Command Center</h1>
            <p className="text-gray-600 mt-1">Unified view of vendor operations, risk, and performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="12m">Last 12 Months</option>
            </select>
            <button
              onClick={fetchCommandCenterData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'alerts', label: 'Alerts', icon: '🔔' },
              { id: 'vendors', label: 'Vendors', icon: '🏢' },
              { id: 'risk', label: 'Risk', icon: '⚠️' },
              { id: 'analytics', label: 'Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.id === 'alerts' && alerts.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis && (
              <>
                <KPICard title="Vendor Score" value={kpis.vendorScore.value} change={kpis.vendorScore.change} trend={kpis.vendorScore.trend} suffix="%" />
                <KPICard title="Compliance Rate" value={kpis.complianceRate.value} change={kpis.complianceRate.change} trend={kpis.complianceRate.trend} suffix="%" />
                <KPICard title="Cost Savings" value={kpis.costSavings.value} change={kpis.costSavings.change} trend={kpis.costSavings.trend} format="currency" />
                <KPICard title="Risk Score" value={kpis.riskScore.value} change={kpis.riskScore.change} trend={kpis.riskScore.trend} />
                <KPICard title="Invoice Accuracy" value={kpis.invoiceAccuracy.value} change={kpis.invoiceAccuracy.change} trend={kpis.invoiceAccuracy.trend} suffix="%" />
                <KPICard title="On-Time Delivery" value={kpis.onTimeDelivery.value} change={kpis.onTimeDelivery.change} trend={kpis.onTimeDelivery.trend} suffix="%" />
              </>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spend Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Spend Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData?.trends?.spend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="amount" stroke="#3B82F6" fill="#93C5FD" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Vendor Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Performance Score</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData?.trends?.vendorPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis domain={[0, 100]} stroke="#6B7280" />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dashboardData?.riskDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(dashboardData?.riskDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Vendors */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h3>
              <div className="space-y-4">
                {(dashboardData?.topVendors || []).map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                        {index + 1}
                      </span>
                      <span className="ml-3 font-medium text-gray-900">{vendor.name}</span>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Score</p>
                        <p className="font-semibold text-green-600">{vendor.score}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Spend</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(vendor.spend)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Active Alerts ({alerts.length})</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">All</button>
              <button className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Critical</button>
              <button className="px-3 py-1 text-sm border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50">High</button>
              <button className="px-3 py-1 text-sm border border-yellow-300 text-yellow-600 rounded-lg hover:bg-yellow-50">Medium</button>
            </div>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border-l-4 ${getSeverityColor(alert.severity)} bg-white shadow-sm`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">{getAlertIcon(alert.type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      {alert.entityName && (
                        <p className="text-sm text-blue-600 mt-2">Related: {alert.entityName}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                      Acknowledge
                    </button>
                    <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendors Tab */}
      {activeTab === 'vendors' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Vendor Overview</h2>
            <input
              type="text"
              placeholder="Search vendors..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Compliance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(dashboardData?.topVendors || []).map((vendor, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-semibold">
                          {vendor.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vendor.score >= 90 ? 'bg-green-100 text-green-800' :
                        vendor.score >= 80 ? 'bg-blue-100 text-blue-800' :
                        vendor.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {vendor.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Low
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-green-600">✓ Compliant</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(vendor.spend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                      <button className="text-gray-600 hover:text-gray-900">Analyze</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk Tab */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <p className="text-4xl font-bold text-green-600">65</p>
              <p className="text-sm text-green-800 mt-2">Low Risk Vendors</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-4xl font-bold text-yellow-600">25</p>
              <p className="text-sm text-yellow-800 mt-2">Medium Risk Vendors</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
              <p className="text-4xl font-bold text-orange-600">8</p>
              <p className="text-sm text-orange-800 mt-2">High Risk Vendors</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-4xl font-bold text-red-600">2</p>
              <p className="text-sm text-red-800 mt-2">Critical Risk Vendors</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Factors</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { factor: 'Financial Stability', count: 12 },
                { factor: 'Compliance Issues', count: 8 },
                { factor: 'Delivery Performance', count: 15 },
                { factor: 'Quality Concerns', count: 6 },
                { factor: 'Contract Risks', count: 9 },
                { factor: 'Fraud Indicators', count: 3 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="factor" stroke="#6B7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spend Analytics</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={dashboardData?.trends?.spend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="amount" name="Total Spend" stroke="#3B82F6" fill="#93C5FD" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Performance Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData?.topVendors || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="#6B7280" />
                  <Tooltip />
                  <Bar dataKey="score" name="Performance Score" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-left hover:bg-blue-100 transition-colors">
                  <span className="text-2xl">📄</span>
                  <p className="font-medium text-blue-900 mt-2">Generate Report</p>
                  <p className="text-sm text-blue-600">Create audit-ready reports</p>
                </button>
                <button className="p-4 bg-green-50 border border-green-200 rounded-xl text-left hover:bg-green-100 transition-colors">
                  <span className="text-2xl">🔍</span>
                  <p className="font-medium text-green-900 mt-2">Run Analysis</p>
                  <p className="text-sm text-green-600">Analyze vendor data</p>
                </button>
                <button className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-left hover:bg-purple-100 transition-colors">
                  <span className="text-2xl">📤</span>
                  <p className="font-medium text-purple-900 mt-2">Export Data</p>
                  <p className="text-sm text-purple-600">Download CSV/PDF</p>
                </button>
                <button className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-left hover:bg-orange-100 transition-colors">
                  <span className="text-2xl">⚙️</span>
                  <p className="font-medium text-orange-900 mt-2">Configure Alerts</p>
                  <p className="text-sm text-orange-600">Set up notifications</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandCenter;
