import { useState, useEffect } from 'react'
import { FaChartLine, FaBoxes, FaTruck, FaDollarSign, FaBell, FaSync } from 'react-icons/fa'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import api from '../services/api'
import { toast } from 'react-toastify'

const Analytics = () => {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [optimizationResult, setOptimizationResult] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [runningOptimization, setRunningOptimization] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [analyticsRes, alertsRes] = await Promise.all([
        api.get('/supply-chain/analytics'),
        api.get('/optimization/alerts').catch(() => ({ data: { data: [] } }))
      ])
      setAnalytics(analyticsRes.data.data)
      setAlerts(alertsRes.data.data || [])
    } catch (error) {
      toast.error('Failed to fetch analytics data')
    } finally {
      setLoading(false)
    }
  }

  const runOptimization = async (type) => {
    setRunningOptimization(true)
    try {
      const response = await api.post(`/optimization/${type}`)
      setOptimizationResult(response.data.data)
      toast.success('Optimization completed successfully!')
    } catch (error) {
      toast.error('Optimization failed')
    } finally {
      setRunningOptimization(false)
    }
  }

  const acknowledgeAlert = async (alertId) => {
    try {
      await api.patch(`/optimization/alerts/${alertId}/acknowledge`)
      setAlerts(alerts.map(a => a._id === alertId ? { ...a, status: 'acknowledged' } : a))
      toast.success('Alert acknowledged')
    } catch (error) {
      toast.error('Failed to acknowledge alert')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Supply Chain Analytics</h1>
          <p className="text-gray-600 mt-1">Insights, optimization, and intelligent recommendations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => runOptimization('full')}
            disabled={runningOptimization}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <FaSync className={runningOptimization ? 'animate-spin' : ''} />
            Run Full Optimization
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FaChartLine },
            { id: 'inventory', label: 'Inventory', icon: FaBoxes },
            { id: 'vendors', label: 'Vendors', icon: FaTruck },
            { id: 'costs', label: 'Cost Analysis', icon: FaDollarSign },
            { id: 'alerts', label: 'Alerts', icon: FaBell, badge: alerts.filter(a => a.status === 'active').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon />
              {tab.label}
              {tab.badge > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
      {activeTab === 'inventory' && <InventoryTab onOptimize={() => runOptimization('inventory')} result={optimizationResult} />}
      {activeTab === 'vendors' && <VendorsTab analytics={analytics} onOptimize={() => runOptimization('vendor-selection')} />}
      {activeTab === 'costs' && <CostsTab onOptimize={() => runOptimization('costs')} />}
      {activeTab === 'alerts' && <AlertsTab alerts={alerts} onAcknowledge={acknowledgeAlert} />}

      {/* Optimization Results Modal */}
      {optimizationResult && (
        <OptimizationResultsModal result={optimizationResult} onClose={() => setOptimizationResult(null)} />
      )}
    </div>
  )
}

// Overview Tab Component
const OverviewTab = ({ analytics }) => {
  const ordersByMonth = analytics?.ordersByMonth || []
  const topVendors = analytics?.topVendors || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Orders Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ordersByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Orders" />
            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} name="Value ($)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Vendors */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors by Value</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topVendors} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="vendorName" type="category" width={100} />
            <Tooltip />
            <Bar dataKey="totalValue" fill="#3B82F6" name="Total Value ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Orders by Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={analytics?.ordersByStatus || []}
              dataKey="count"
              nameKey="_id"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {(analytics?.ordersByStatus || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average Order Value</span>
            <span className="font-semibold text-gray-900">
              ${((analytics?.ordersByStatus || []).reduce((sum, s) => sum + s.value, 0) / 
                 Math.max(1, (analytics?.ordersByStatus || []).reduce((sum, s) => sum + s.count, 0))).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Active Vendors</span>
            <span className="font-semibold text-gray-900">{topVendors.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Order Value</span>
            <span className="font-semibold text-gray-900">
              ${(analytics?.ordersByStatus || []).reduce((sum, s) => sum + s.value, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inventory Tab Component
const InventoryTab = ({ onOptimize }) => {
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchForecast()
  }, [])

  const fetchForecast = async () => {
    try {
      const response = await api.get('/supply-chain/forecast')
      setForecast(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch forecast')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Inventory Optimization</h2>
        <button onClick={onOptimize} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Optimize Inventory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">EOQ Optimization</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">Economic Order Quantity</p>
          <p className="text-sm text-gray-600 mt-1">Minimize total inventory costs</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Safety Stock</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">Risk Buffer</p>
          <p className="text-sm text-gray-600 mt-1">Protect against demand variability</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Reorder Points</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">Automated Triggers</p>
          <p className="text-sm text-gray-600 mt-1">Optimal reorder timing</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Demand Forecast</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : forecast.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {forecast.slice(0, 10).map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.product?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.currentStock || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.reorderPoint || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.suggestedOrderQty || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.priority || 'medium'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No forecast data available</p>
        )}
      </div>
    </div>
  )
}

// Vendors Tab Component
const VendorsTab = ({ analytics, onOptimize }) => {
  const topVendors = analytics?.topVendors || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Vendor Performance</h2>
        <button onClick={onOptimize} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Optimize Vendor Selection
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Orders</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {topVendors.map((vendor, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{vendor.vendorName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{vendor.orderCount}</td>
                <td className="px-6 py-4 text-sm text-gray-600">${vendor.totalValue?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min(100, (vendor.totalValue / 10000) * 100)}%` }}></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Costs Tab Component
const CostsTab = ({ onOptimize }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Cost Analysis</h2>
        <button onClick={onOptimize} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          Find Cost Savings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Order Consolidation</h3>
          <p className="text-lg font-semibold text-gray-900 mt-2">Batch small orders</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Volume Discounts</h3>
          <p className="text-lg font-semibold text-gray-900 mt-2">Negotiate better rates</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Carrying Costs</h3>
          <p className="text-lg font-semibold text-gray-900 mt-2">Reduce excess stock</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Shipping Optimization</h3>
          <p className="text-lg font-semibold text-gray-900 mt-2">Optimize routes</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
        <p className="text-gray-500">Run cost optimization to see detailed analysis and savings opportunities.</p>
      </div>
    </div>
  )
}

// Alerts Tab Component
const AlertsTab = ({ alerts, onAcknowledge }) => {
  const activeAlerts = alerts.filter(a => a.status === 'active')
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged')

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Active Alerts ({activeAlerts.length})</h2>

      {activeAlerts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <FaBell className="mx-auto text-green-500 text-3xl mb-2" />
          <p className="text-green-800">No active alerts. Your supply chain is running smoothly!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeAlerts.map(alert => (
            <div key={alert._id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${
              alert.severity === 'critical' ? 'border-red-500' :
              alert.severity === 'warning' ? 'border-yellow-500' : 'border-blue-500'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{alert.message}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{alert.type}</span>
                  </div>
                </div>
                <button onClick={() => onAcknowledge(alert._id)} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  Acknowledge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {acknowledgedAlerts.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-gray-900 mt-8">Acknowledged ({acknowledgedAlerts.length})</h2>
          <div className="space-y-2 opacity-60">
            {acknowledgedAlerts.slice(0, 5).map(alert => (
              <div key={alert._id} className="bg-white rounded-lg shadow p-3">
                <p className="text-sm text-gray-600">{alert.title}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Optimization Results Modal
const OptimizationResultsModal = ({ result, onClose }) => {
  const recommendations = result?.results?.recommendations || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Optimization Results</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Recommendations</p>
              <p className="text-2xl font-bold text-blue-900">{recommendations.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Potential Savings</p>
              <p className="text-2xl font-bold text-green-900">${result?.results?.summary?.potentialSavings?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600">Optimization Score</p>
              <p className="text-2xl font-bold text-purple-900">{result?.results?.metrics?.optimizationScore || 0}%</p>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rec.priority}
                    </span>
                    <h4 className="font-medium text-gray-900 mt-2">{rec.action}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  </div>
                  {rec.estimatedSavings > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Est. Savings</p>
                      <p className="font-semibold text-green-600">${rec.estimatedSavings}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Apply Recommendations</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
