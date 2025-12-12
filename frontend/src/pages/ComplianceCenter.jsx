import { useState } from 'react';
import { 
  FiAlertCircle, FiCheckCircle, FiClock, FiShield, FiFileText,
  FiTrendingUp, FiTrendingDown, FiUser, FiCalendar, FiActivity
} from 'react-icons/fi';

const ComplianceCenter = () => {
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap'); // heatmap, list

  const topCards = [
    { label: 'Critical Violations', value: 8, icon: FiAlertCircle, color: 'red', change: '+2' },
    { label: 'Expiring Soon', value: 24, icon: FiClock, color: 'yellow', change: '+5' },
    { label: 'Suspended Vendors', value: 2, icon: FiShield, color: 'red', change: '0' },
    { label: 'Compliance Rate', value: '98%', icon: FiCheckCircle, color: 'green', change: '+2%' }
  ];

  const vendors = [
    {
      id: 1,
      name: 'TechCorp Solutions',
      riskScore: 82,
      status: 'compliant',
      violations: [],
      expiringDocs: 2,
      lastScan: '2024-12-05',
      compliance: {
        'ISO 9001': { status: 'valid', expiry: '2025-06-15', daysLeft: 192 },
        'Insurance': { status: 'expiring', expiry: '2025-01-10', daysLeft: 35 },
        'W-9': { status: 'valid', expiry: null },
        'Sanctions': { status: 'clear', lastCheck: '2024-12-05' }
      }
    },
    {
      id: 2,
      name: 'Global Supplies Inc',
      riskScore: 45,
      status: 'expiring',
      violations: [],
      expiringDocs: 1,
      lastScan: '2024-12-04',
      compliance: {
        'ISO 9001': { status: 'expired', expiry: '2024-11-30', daysLeft: -5 },
        'Insurance': { status: 'valid', expiry: '2025-08-20', daysLeft: 257 },
        'W-9': { status: 'valid', expiry: null },
        'Sanctions': { status: 'clear', lastCheck: '2024-12-04' }
      }
    },
    {
      id: 3,
      name: 'AccuSoft Systems',
      riskScore: 28,
      status: 'critical',
      violations: ['Expired Insurance', 'Missing W-9'],
      expiringDocs: 0,
      lastScan: '2024-12-03',
      compliance: {
        'ISO 9001': { status: 'valid', expiry: '2025-03-15', daysLeft: 99 },
        'Insurance': { status: 'expired', expiry: '2024-10-01', daysLeft: -65 },
        'W-9': { status: 'missing', expiry: null },
        'Sanctions': { status: 'pending', lastCheck: '2024-12-03' }
      }
    }
  ];

  const complianceTypes = ['ISO 9001', 'Insurance', 'W-9', 'Sanctions'];

  const getStatusColor = (status) => {
    const colors = {
      valid: 'bg-green-500',
      expiring: 'bg-yellow-500',
      expired: 'bg-red-500',
      missing: 'bg-gray-400',
      clear: 'bg-green-500',
      pending: 'bg-yellow-500'
    };
    return colors[status] || 'bg-gray-300';
  };

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Center</h1>
          <p className="text-gray-600 mt-1">Monitor vendor compliance across all requirements</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                viewMode === 'heatmap'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Heatmap
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              List
            </button>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Run Scan
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {topCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  card.color === 'blue' ? 'bg-blue-100' :
                  card.color === 'red' ? 'bg-red-100' :
                  card.color === 'yellow' ? 'bg-yellow-100' :
                  'bg-green-100'
                }`}>
                  <Icon className={`${
                    card.color === 'blue' ? 'text-blue-600' :
                    card.color === 'red' ? 'text-red-600' :
                    card.color === 'yellow' ? 'text-yellow-600' :
                    'text-green-600'
                  }`} size={20} />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  card.change.startsWith('+') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {card.change}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {viewMode === 'heatmap' ? (
        /* Heatmap View */
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Compliance Heatmap</h2>
            <p className="text-sm text-gray-600">Hover over cells for details</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider pb-3 pr-4 sticky left-0 bg-white">
                    Vendor
                  </th>
                  {complianceTypes.map((type) => (
                    <th key={type} className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider pb-3 px-2">
                      {type}
                    </th>
                  ))}
                  <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider pb-3 pl-4">
                    Risk Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => setSelectedVendor(vendor)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-4 pr-4 sticky left-0 bg-white">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                        <p className="text-xs text-gray-500">Last scan: {vendor.lastScan}</p>
                      </div>
                    </td>
                    {complianceTypes.map((type) => {
                      const compliance = vendor.compliance[type];
                      return (
                        <td key={type} className="py-4 px-2">
                          <div className="relative group">
                            <div className={`w-12 h-12 rounded-lg ${getStatusColor(compliance.status)} mx-auto cursor-pointer transition-all hover:scale-110`}></div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                                <p className="font-medium">{type}</p>
                                <p className="capitalize">{compliance.status}</p>
                                {compliance.expiry && (
                                  <p className="text-gray-300">Expires: {compliance.expiry}</p>
                                )}
                                {compliance.daysLeft !== undefined && (
                                  <p className={compliance.daysLeft < 30 ? 'text-red-400' : 'text-green-400'}>
                                    {compliance.daysLeft > 0 ? `${compliance.daysLeft} days left` : `${Math.abs(compliance.daysLeft)} days overdue`}
                                  </p>
                                )}
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                                  <div className="border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-4 pl-4">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg font-bold px-3 py-1 rounded ${getRiskColor(vendor.riskScore)}`}>
                          {vendor.riskScore}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {vendor.riskScore >= 70 ? 'Low Risk' : vendor.riskScore >= 40 ? 'Medium' : 'High Risk'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-xs text-gray-600">Valid</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span className="text-xs text-gray-600">Expiring Soon</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-xs text-gray-600">Expired/Critical</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-gray-400"></div>
              <span className="text-xs text-gray-600">Missing</span>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              onClick={() => setSelectedVendor(vendor)}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{vendor.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <FiCalendar size={14} />
                      <span>Last scan: {vendor.lastScan}</span>
                    </span>
                    {vendor.expiringDocs > 0 && (
                      <span className="flex items-center space-x-1 text-yellow-600">
                        <FiClock size={14} />
                        <span>{vendor.expiringDocs} expiring</span>
                      </span>
                    )}
                    {vendor.violations.length > 0 && (
                      <span className="flex items-center space-x-1 text-red-600">
                        <FiAlertCircle size={14} />
                        <span>{vendor.violations.length} violations</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${getRiskColor(vendor.riskScore)}`}>
                    {vendor.riskScore}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Risk Score</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {Object.entries(vendor.compliance).map(([type, compliance]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-700">{type}</p>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(compliance.status)}`}></div>
                    </div>
                    <p className="text-xs text-gray-600 capitalize">{compliance.status}</p>
                    {compliance.daysLeft !== undefined && (
                      <p className={`text-xs mt-1 ${
                        compliance.daysLeft < 30 ? 'text-red-600 font-medium' : 'text-gray-500'
                      }`}>
                        {compliance.daysLeft > 0 ? `${compliance.daysLeft}d left` : `${Math.abs(compliance.daysLeft)}d overdue`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendor Detail Modal/Drawer */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedVendor.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">Compliance Profile</p>
                </div>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-gray-500 text-2xl">&times;</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Risk Overview */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Risk Overview</h3>
                  <div className={`text-3xl font-bold px-6 py-3 rounded-lg ${getRiskColor(selectedVendor.riskScore)}`}>
                    {selectedVendor.riskScore}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{selectedVendor.status}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Last Scan</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.lastScan}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Next Review</p>
                    <p className="text-sm font-medium text-gray-900">2024-12-20</p>
                  </div>
                </div>
              </div>

              {/* Compliance Attributes */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Compliance Attributes</h3>
                <div className="space-y-3">
                  {Object.entries(selectedVendor.compliance).map(([type, compliance]) => (
                    <div key={type} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(compliance.status)}`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{type}</p>
                            <p className="text-xs text-gray-500 capitalize">{compliance.status}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {compliance.expiry && (
                            <p className="text-sm text-gray-900">{compliance.expiry}</p>
                          )}
                          {compliance.daysLeft !== undefined && (
                            <p className={`text-xs ${
                              compliance.daysLeft < 30 ? 'text-red-600 font-medium' : 'text-gray-500'
                            }`}>
                              {compliance.daysLeft > 0 ? `${compliance.daysLeft} days remaining` : `${Math.abs(compliance.daysLeft)} days overdue`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remediation Tasks */}
              {selectedVendor.violations.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Remediation Required</h3>
                  <div className="space-y-3">
                    {selectedVendor.violations.map((violation, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            <FiAlertCircle className="text-red-600 mt-0.5" size={18} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{violation}</p>
                              <p className="text-xs text-gray-600 mt-1">Required action within 48 hours</p>
                            </div>
                          </div>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                            24h left
                          </span>
                        </div>
                        <button className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                          Upload Required Document
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Timeline</h3>
                <div className="space-y-3">
                  {[
                    { action: 'Sanctions scan completed', time: '2024-12-05', status: 'clear' },
                    { action: 'Insurance certificate verified', time: '2024-11-20', status: 'valid' },
                    { action: 'Compliance review completed', time: '2024-11-15', status: 'passed' },
                    { action: 'ISO 9001 uploaded', time: '2024-11-01', status: 'verified' }
                  ].map((log, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-500">{log.time} • {log.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceCenter;
