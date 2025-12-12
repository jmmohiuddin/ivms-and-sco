import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, 
  BarChart2, PieChart, Activity, Calendar, Shield
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import onboardingService from '../services/onboardingService';

// Stat card component
const StatCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
  <div className="bg-white rounded-lg border p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    {change !== undefined && (
      <div className={`flex items-center mt-4 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        <TrendingUp size={16} className={`mr-1 ${change < 0 ? 'transform rotate-180' : ''}`} />
        <span>{Math.abs(change)}% {change >= 0 ? 'increase' : 'decrease'}</span>
        <span className="text-gray-400 ml-2">vs last month</span>
      </div>
    )}
  </div>
);

// SLA compliance meter
const SLAMeter = ({ compliance }) => {
  const getColor = (value) => {
    if (value >= 90) return '#22c55e';
    if (value >= 70) return '#eab308';
    return '#ef4444';
  };
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-semibold text-gray-900 mb-4">SLA Compliance</h3>
      <div className="relative w-32 h-32 mx-auto">
        <svg className="transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getColor(compliance)}
            strokeWidth="10"
            fill="none"
            strokeDasharray={`${compliance * 2.83} 283`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{compliance}%</span>
        </div>
      </div>
      <p className="text-center text-sm text-gray-500 mt-4">
        Target: 95%
      </p>
    </div>
  );
};

// Risk distribution chart
const RiskDistributionChart = ({ data }) => {
  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
  
  const chartData = [
    { name: 'Low', value: data.low || 0, color: COLORS[0] },
    { name: 'Medium', value: data.medium || 0, color: COLORS[1] },
    { name: 'High', value: data.high || 0, color: COLORS[2] },
    { name: 'Critical', value: data.critical || 0, color: COLORS[3] }
  ];
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Risk Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <RePieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Onboarding funnel chart
const OnboardingFunnel = ({ data }) => {
  const funnelData = [
    { stage: 'Submitted', value: data.submitted || 0, fill: '#3b82f6' },
    { stage: 'Processing', value: data.processing || 0, fill: '#8b5cf6' },
    { stage: 'In Review', value: data.in_review || 0, fill: '#f59e0b' },
    { stage: 'Approved', value: data.approved || 0, fill: '#22c55e' }
  ];
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Onboarding Funnel</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={funnelData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="stage" width={80} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {funnelData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Processing time trend
const ProcessingTimeTrend = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Average Processing Time (Days)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Area 
            type="monotone" 
            dataKey="avgDays" 
            stroke="#3b82f6" 
            fill="#3b82f6" 
            fillOpacity={0.2}
          />
          <Line 
            type="monotone" 
            dataKey="target" 
            stroke="#ef4444" 
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Auto-approval rate chart
const AutoApprovalChart = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Approval Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="autoApproved" name="Auto-Approved" fill="#22c55e" stackId="a" />
          <Bar dataKey="manualApproved" name="Manual Approved" fill="#3b82f6" stackId="a" />
          <Bar dataKey="rejected" name="Rejected" fill="#ef4444" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Recent activity feed
const RecentActivity = ({ activities }) => (
  <div className="bg-white rounded-lg border p-6">
    <h3 className="font-semibold text-gray-900 mb-4">Recent Onboarding Activity</h3>
    <div className="space-y-4 max-h-80 overflow-auto">
      {activities.map((activity, idx) => (
        <div key={idx} className="flex items-start space-x-3 pb-3 border-b last:border-0">
          <div className={`p-2 rounded-full ${
            activity.type === 'approved' ? 'bg-green-100' :
            activity.type === 'rejected' ? 'bg-red-100' :
            activity.type === 'submitted' ? 'bg-blue-100' :
            'bg-gray-100'
          }`}>
            {activity.type === 'approved' ? <CheckCircle size={16} className="text-green-600" /> :
             activity.type === 'rejected' ? <XCircle size={16} className="text-red-600" /> :
             activity.type === 'submitted' ? <Users size={16} className="text-blue-600" /> :
             <Clock size={16} className="text-gray-600" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{activity.vendorName}</p>
            <p className="text-xs text-gray-500">{activity.action}</p>
          </div>
          <span className="text-xs text-gray-400">{activity.time}</span>
        </div>
      ))}
    </div>
  </div>
);

// Main Dashboard Component
const OnboardingDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  
  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);
  
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await onboardingService.getAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Mock data for demo
      setAnalytics({
        summary: {
          totalCases: 156,
          completedCases: 98,
          rejectedCases: 12,
          pendingCases: 46,
          approvalRate: 89.1,
          autoApprovalRate: 34.5
        },
        timing: {
          averageOnboardingDays: 2.3,
          targetDays: 3
        },
        byStatus: {
          draft: 5,
          submitted: 15,
          processing: 8,
          in_review: 12,
          pending_approval: 6,
          approved: 98,
          rejected: 12
        },
        byRiskTier: {
          low: 78,
          medium: 45,
          high: 25,
          critical: 8
        }
      });
    }
    setLoading(false);
  };
  
  // Mock trend data
  const processingTimeTrend = [
    { month: 'Jan', avgDays: 3.5, target: 3 },
    { month: 'Feb', avgDays: 3.2, target: 3 },
    { month: 'Mar', avgDays: 2.8, target: 3 },
    { month: 'Apr', avgDays: 2.5, target: 3 },
    { month: 'May', avgDays: 2.3, target: 3 },
    { month: 'Jun', avgDays: 2.1, target: 3 }
  ];
  
  const approvalData = [
    { month: 'Jan', autoApproved: 8, manualApproved: 12, rejected: 3 },
    { month: 'Feb', autoApproved: 10, manualApproved: 14, rejected: 2 },
    { month: 'Mar', autoApproved: 12, manualApproved: 15, rejected: 2 },
    { month: 'Apr', autoApproved: 15, manualApproved: 13, rejected: 1 },
    { month: 'May', autoApproved: 18, manualApproved: 14, rejected: 2 },
    { month: 'Jun', autoApproved: 20, manualApproved: 12, rejected: 2 }
  ];
  
  const recentActivities = [
    { type: 'approved', vendorName: 'Acme Corp', action: 'Auto-approved (Low Risk)', time: '5 min ago' },
    { type: 'submitted', vendorName: 'TechGlobal LLC', action: 'New application submitted', time: '12 min ago' },
    { type: 'review', vendorName: 'Green Solutions', action: 'Moved to review queue', time: '25 min ago' },
    { type: 'rejected', vendorName: 'Suspicious Co', action: 'Rejected - Sanctions match', time: '1 hour ago' },
    { type: 'approved', vendorName: 'Quality Parts Inc', action: 'Manually approved', time: '2 hours ago' },
    { type: 'submitted', vendorName: 'Swift Logistics', action: 'New application submitted', time: '3 hours ago' }
  ];
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Onboarding Analytics</h2>
          <p className="text-sm text-gray-500">AI-driven vendor onboarding performance metrics</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Applications"
          value={analytics?.summary?.totalCases || 0}
          change={12}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Approved"
          value={analytics?.summary?.completedCases || 0}
          subtitle={`${analytics?.summary?.approvalRate || 0}% approval rate`}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Pending Review"
          value={analytics?.summary?.pendingCases || 0}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Avg. Processing Time"
          value={`${analytics?.timing?.averageOnboardingDays || 0} days`}
          subtitle={`Target: ${analytics?.timing?.targetDays || 3} days`}
          icon={Activity}
          color="bg-purple-500"
        />
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OnboardingFunnel data={analytics?.byStatus || {}} />
        <RiskDistributionChart data={analytics?.byRiskTier || {}} />
        <SLAMeter compliance={92} />
      </div>
      
      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProcessingTimeTrend data={processingTimeTrend} />
        <AutoApprovalChart data={approvalData} />
      </div>
      
      {/* Activity and Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <RecentActivity activities={recentActivities} />
        </div>
        <div className="space-y-6">
          {/* Auto-Approval Stats */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="mr-2 text-blue-500" size={20} />
              Auto-Approval Performance
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Auto-Approval Rate</span>
                  <span className="font-medium">{analytics?.summary?.autoApprovalRate || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${analytics?.summary?.autoApprovalRate || 0}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-green-600">
                    {Math.round((analytics?.summary?.completedCases || 0) * (analytics?.summary?.autoApprovalRate || 0) / 100)}
                  </span> vendors auto-approved this period
                </p>
              </div>
            </div>
          </div>
          
          {/* Risk Alert Summary */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-orange-500" size={20} />
              Risk Alerts
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Critical Risk Cases</span>
                <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium">
                  {analytics?.byRiskTier?.critical || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">High Risk Cases</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-medium">
                  {analytics?.byRiskTier?.high || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">SLA Breaches</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded text-xs font-medium">
                  3
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingDashboard;
