import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUsers, FiFileText, FiShield, FiTrendingUp, FiAlertCircle,
  FiCheckCircle, FiClock, FiDollarSign, FiArrowUp, FiArrowDown,
  FiChevronRight, FiActivity
} from 'react-icons/fi';

const ModernDashboard = () => {
  const topMetrics = [
    {
      label: 'Active Vendors',
      value: '247',
      change: '+12',
      trend: 'up',
      icon: FiUsers,
      color: 'blue',
      link: '/vendors/onboarding'
    },
    {
      label: 'Pending Invoices',
      value: '24',
      change: '-8',
      trend: 'down',
      icon: FiFileText,
      color: 'purple',
      link: '/invoicing/queue'
    },
    {
      label: 'Compliance Rate',
      value: '98%',
      change: '+2%',
      trend: 'up',
      icon: FiShield,
      color: 'green',
      link: '/compliance'
    },
    {
      label: 'Monthly Spend',
      value: '$2.4M',
      change: '+18%',
      trend: 'up',
      icon: FiDollarSign,
      color: 'yellow',
      link: '/analytics'
    }
  ];

  const alerts = [
    {
      type: 'critical',
      title: '8 Critical Compliance Violations',
      description: '3 vendors require immediate action',
      action: 'Review now',
      link: '/compliance',
      icon: FiAlertCircle
    },
    {
      type: 'warning',
      title: '24 Documents Expiring Soon',
      description: 'Within next 30 days',
      action: 'View details',
      link: '/compliance',
      icon: FiClock
    },
    {
      type: 'info',
      title: '32 Invoices Ready for Auto-Approval',
      description: 'Reduce backlog by 48%',
      action: 'Approve now',
      link: '/invoicing/queue',
      icon: FiCheckCircle
    }
  ];

  const quickActions = [
    {
      title: 'Onboard New Vendor',
      description: 'AI-powered registration in 5 steps',
      icon: FiUsers,
      color: 'blue',
      link: '/vendors/onboarding'
    },
    {
      title: 'Process Invoices',
      description: '24 invoices awaiting review',
      icon: FiFileText,
      color: 'purple',
      link: '/invoicing/queue'
    },
    {
      title: 'Run Compliance Scan',
      description: 'Check all vendors for violations',
      icon: FiShield,
      color: 'green',
      link: '/compliance'
    },
    {
      title: 'View Predictions',
      description: 'Forecast spend & simulate scenarios',
      icon: FiTrendingUp,
      color: 'yellow',
      link: '/analytics'
    }
  ];

  const recentActivity = [
    { type: 'vendor', text: 'New vendor "Tech Solutions Inc" onboarded', time: '5 min ago' },
    { type: 'invoice', text: 'Invoice #INV-2024-1543 auto-approved ($4,250)', time: '12 min ago' },
    { type: 'compliance', text: 'Compliance scan completed - 2 violations found', time: '23 min ago' },
    { type: 'prediction', text: 'Q1 2025 spend forecast updated ($2.4M)', time: '1 hour ago' },
    { type: 'vendor', text: 'Vendor "Global Supplies Ltd" documents verified', time: '2 hours ago' }
  ];

  const upcomingTasks = [
    { task: 'Review exception invoices', count: 7, priority: 'high', dueIn: 'Today' },
    { task: 'Respond to vendor inquiries', count: 12, priority: 'medium', dueIn: 'Tomorrow' },
    { task: 'Complete remediation tasks', count: 8, priority: 'high', dueIn: '2 days' },
    { task: 'Renew expiring documents', count: 15, priority: 'medium', dueIn: '1 week' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, Mohiuddin</h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your vendor ecosystem</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {topMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? FiArrowUp : FiArrowDown;
          return (
            <Link
              key={index}
              to={metric.link}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  metric.color === 'green' ? 'bg-green-100' :
                  'bg-yellow-100'
                }`}>
                  <Icon className={`${
                    metric.color === 'blue' ? 'text-blue-600' :
                    metric.color === 'purple' ? 'text-purple-600' :
                    metric.color === 'green' ? 'text-green-600' :
                    'text-yellow-600'
                  }`} size={20} />
                </div>
                <div className="flex items-center space-x-1">
                  <TrendIcon
                    className={metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}
                    size={14}
                  />
                  <span className={`text-xs font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            </Link>
          );
        })}
      </div>

      {/* AI-Powered Alert */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiActivity className="text-white" size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">💡 AI Insight of the Day</h4>
            <p className="text-sm text-gray-700">
              If you approve the 32 pending invoices today, your backlog will drop by 48% and improve vendor relationships by 12%.
              <span className="text-purple-600 font-medium cursor-pointer hover:underline ml-1">Take action →</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Alerts & Quick Actions */}
        <div className="col-span-2 space-y-6">
          {/* Priority Alerts */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Priority Alerts</h3>
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const Icon = alert.icon;
                return (
                  <div
                    key={index}
                    className={`rounded-lg p-4 border-l-4 ${
                      alert.type === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Icon
                          className={
                            alert.type === 'critical' ? 'text-red-600' :
                            alert.type === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }
                          size={20}
                        />
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                        </div>
                      </div>
                      <Link
                        to={alert.link}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center space-x-1 whitespace-nowrap"
                      >
                        <span>{alert.action}</span>
                        <FiChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.link}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      action.color === 'blue' ? 'bg-blue-100' :
                      action.color === 'purple' ? 'bg-purple-100' :
                      action.color === 'green' ? 'bg-green-100' :
                      'bg-yellow-100'
                    }`}>
                      <Icon className={`${
                        action.color === 'blue' ? 'text-blue-600' :
                        action.color === 'purple' ? 'text-purple-600' :
                        action.color === 'green' ? 'text-green-600' :
                        'text-yellow-600'
                      }`} size={20} />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">{action.title}</h4>
                    <p className="text-xs text-gray-600">{action.description}</p>
                    <div className="mt-3 flex items-center text-blue-600 text-xs font-medium group-hover:translate-x-1 transition-transform">
                      <span>Get started</span>
                      <FiChevronRight size={14} className="ml-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.text}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Upcoming Tasks */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Tasks</h3>
            <div className="space-y-3">
              {upcomingTasks.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{task.task}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {task.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Due: {task.dueIn}</span>
                    <span className={`text-xs font-medium ${
                      task.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {task.priority === 'high' ? 'High' : 'Medium'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">API Status</span>
                <span className="flex items-center text-green-600 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">AI Processing</span>
                <span className="flex items-center text-green-600 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Database</span>
                <span className="flex items-center text-green-600 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Last Backup</span>
                <span className="text-xs text-gray-600">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
