import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  FiHome, FiUsers, FiFileText, FiShield, FiTrendingUp, 
  FiSearch, FiSettings, FiHelpCircle, FiMenu, FiX,
  FiChevronRight, FiBell, FiMessageSquare
} from 'react-icons/fi';
import AIAssistant from '../AI/AIAssistant';

const ModernLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: FiHome },
    { path: '/vendors', label: 'Vendors', icon: FiUsers },
    { path: '/invoicing/queue', label: 'Invoicing', icon: FiFileText },
    { path: '/compliance', label: 'Compliance', icon: FiShield },
    { path: '/analytics', label: 'Analytics', icon: FiTrendingUp }
  ];

  const getContextualSidebar = () => {
    const path = location.pathname;
    
    if (path.includes('/vendors')) {
      return [
        { label: 'All Vendors', path: '/vendors' },
        { label: 'Onboarding', path: '/vendors/onboarding', count: 12 },
        { label: 'Documents', path: '/vendors/documents', count: 8 },
        { label: 'Risk Assessment', path: '/vendors/risk', count: 3 },
        { label: 'Tasks', path: '/vendors/tasks', count: 15 }
      ];
    } else if (path.includes('/invoicing')) {
      return [
        { label: 'Processing Queue', path: '/invoicing/queue', count: 24 },
        { label: 'Exceptions', path: '/invoicing/exceptions', count: 7 },
        { label: 'Approved', path: '/invoicing/approved' },
        { label: 'Pending Payment', path: '/invoicing/payments' },
        { label: 'Recurring Invoices', path: '/invoicing/recurring' }
      ];
    } else if (path.includes('/compliance')) {
      return [
        { label: 'Overview', path: '/compliance' },
        { label: 'Critical Issues', path: '/compliance/violations', count: 8 },
        { label: 'Remediation', path: '/compliance/remediation', count: 12 },
        { label: 'Policies', path: '/compliance/policies' },
        { label: 'Audit Logs', path: '/compliance/audit' }
      ];
    } else if (path.includes('/analytics')) {
      return [
        { label: 'Dashboard', path: '/analytics' },
        { label: 'Scenario Simulator', path: '/analytics/scenarios' },
        { label: 'Spend Forecasts', path: '/analytics/forecasts' },
        { label: 'Risk Trends', path: '/analytics/trends' },
        { label: 'Custom Reports', path: '/analytics/reports' }
      ];
    }
    
    return [];
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center px-6 shadow-sm">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">iV</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg">iVMS</span>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex items-center space-x-1 ml-12">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-sm ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Global Search */}
          <div className="relative w-96">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors, invoices, POs, contracts..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiBell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* AI Assistant Toggle */}
          <button
            onClick={() => setAiOpen(!aiOpen)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
              aiOpen
                ? 'bg-purple-50 text-purple-600'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <FiMessageSquare size={18} />
            <span className="text-sm font-medium">AI Assistant</span>
          </button>

          {/* Help */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiHelpCircle size={20} className="text-gray-600" />
          </button>

          {/* Profile */}
          <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">JD</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">John Doe</div>
              <div className="text-xs text-gray-500">Procurement</div>
            </div>
            <FiSettings size={18} className="text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
        </div>
      </div>

      {/* Left Contextual Sidebar */}
      {sidebarOpen && (
        <div className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 z-40 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {location.pathname === '/' ? 'Dashboard' : 
               location.pathname.split('/')[1]?.replace('-', ' ') || 'Navigation'}
            </h3>
            <nav className="space-y-1">
              {getContextualSidebar().map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.count && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                        }`}>
                          {item.count}
                        </span>
                      )}
                      <FiChevronRight
                        size={16}
                        className={`${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                      />
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 min-h-screen bg-gray-50 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        } ${aiOpen ? 'mr-96' : 'mr-0'} mt-16 overflow-y-auto`}
      >
        <Outlet />
      </div>

      {/* Right AI Assistant Pane */}
      {aiOpen && (
        <div className="fixed right-0 top-16 bottom-0 w-96 bg-white border-l border-gray-200 z-40 overflow-y-auto">
          <AIAssistant onClose={() => setAiOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default ModernLayout;
