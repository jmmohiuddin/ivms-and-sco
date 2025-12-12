import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaUsers, FaBoxes, FaShoppingCart, FaChartBar, FaRocket, FaFileAlt, FaShieldAlt, FaCog, FaUserPlus, FaClipboardCheck, FaFileInvoiceDollar, FaExclamationTriangle, FaBalanceScale, FaGavel, FaTasks, FaBrain, FaLayerGroup } from 'react-icons/fa'

const Sidebar = () => {
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', path: '/', icon: FaHome },
    { name: 'Command Center', path: '/command-center', icon: FaRocket, highlight: true },
    { name: 'Review Console', path: '/review-console', icon: FaClipboardCheck, badge: 'AI' },
    { name: 'Invoices', path: '/invoices', icon: FaFileInvoiceDollar },
    { name: 'Exceptions', path: '/exceptions', icon: FaExclamationTriangle },
    { name: 'Documents', path: '/documents', icon: FaFileAlt },
    { name: 'Vendors', path: '/vendors', icon: FaUsers },
    { name: 'Products', path: '/products', icon: FaBoxes },
    { name: 'Orders', path: '/orders', icon: FaShoppingCart },
    { name: 'Analytics', path: '/analytics', icon: FaChartBar },
  ]

  const complianceNavigation = [
    { name: 'Compliance', path: '/compliance', icon: FaShieldAlt, badge: 'NEW' },
    { name: 'Remediation', path: '/remediation', icon: FaTasks },
    { name: 'Policies', path: '/policies', icon: FaGavel },
  ]

  const predictionsNavigation = [
    { name: 'Predictions', path: '/predictions', icon: FaBrain, badge: 'AI' },
    { name: 'Scenarios', path: '/scenarios', icon: FaLayerGroup },
  ]

  return (
    <div className="bg-gray-900 text-white w-64 space-y-6 py-7 px-2 flex-shrink-0 flex flex-col">
      <div className="flex items-center space-x-2 px-4">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <span className="text-xl font-bold">I</span>
        </div>
        <span className="text-2xl font-extrabold">IVMS</span>
      </div>

      <nav className="space-y-2 flex-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 py-2.5 px-4 rounded transition duration-200 ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : item.highlight
                    ? 'text-yellow-400 hover:bg-yellow-900/20 hover:text-yellow-300 border border-yellow-600/30'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
              {item.highlight && !isActive && (
                <span className="ml-auto text-xs bg-yellow-600 text-yellow-100 px-1.5 py-0.5 rounded">NEW</span>
              )}
              {item.badge && !isActive && (
                <span className="ml-auto text-xs bg-purple-600 text-purple-100 px-1.5 py-0.5 rounded">{item.badge}</span>
              )}
            </Link>
          )
        })}

        {/* Compliance Section Divider */}
        <div className="pt-4 pb-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4">
            Compliance
          </div>
        </div>

        {/* Compliance Navigation */}
        {complianceNavigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 py-2.5 px-4 rounded transition duration-200 ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:bg-emerald-900/20 hover:text-emerald-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
              {item.badge && !isActive && (
                <span className="ml-auto text-xs bg-emerald-600 text-emerald-100 px-1.5 py-0.5 rounded">{item.badge}</span>
              )}
            </Link>
          )
        })}

        {/* Predictions Section Divider */}
        <div className="pt-4 pb-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4">
            Predictive Analytics
          </div>
        </div>

        {/* Predictions Navigation */}
        {predictionsNavigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 py-2.5 px-4 rounded transition duration-200 ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-400 hover:bg-purple-900/20 hover:text-purple-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
              {item.badge && !isActive && (
                <span className="ml-auto text-xs bg-purple-600 text-purple-100 px-1.5 py-0.5 rounded">{item.badge}</span>
              )}
            </Link>
          )
        })}
        
        {/* Portals Section Divider */}
        <div className="pt-4 pb-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4">
            External Portals
          </div>
        </div>
        
        {/* Onboarding Portal Link */}
        <a
          href="/onboarding"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-3 py-2.5 px-4 rounded transition duration-200 text-green-400 hover:bg-green-900/20 hover:text-green-300 border border-green-600/30 mt-4"
        >
          <FaUserPlus className="w-5 h-5" />
          <span className="font-medium">Onboarding Portal</span>
          <span className="ml-auto text-xs bg-green-600 text-green-100 px-1.5 py-0.5 rounded">↗</span>
        </a>
        
        {/* Vendor Invoice Portal Link */}
        <a
          href="/vendor-portal"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-3 py-2.5 px-4 rounded transition duration-200 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 border border-blue-600/30"
        >
          <FaFileInvoiceDollar className="w-5 h-5" />
          <span className="font-medium">Vendor Portal</span>
          <span className="ml-auto text-xs bg-blue-600 text-blue-100 px-1.5 py-0.5 rounded">↗</span>
        </a>
        
        {/* Vendor Compliance Portal Link */}
        <a
          href="/compliance-portal"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-3 py-2.5 px-4 rounded transition duration-200 text-cyan-400 hover:bg-cyan-900/20 hover:text-cyan-300 border border-cyan-600/30"
        >
          <FaBalanceScale className="w-5 h-5" />
          <span className="font-medium">Compliance Portal</span>
          <span className="ml-auto text-xs bg-cyan-600 text-cyan-100 px-1.5 py-0.5 rounded">↗</span>
        </a>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-700 pt-4 px-2">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <FaShieldAlt className="text-blue-400" />
            <span className="text-sm font-semibold text-blue-300">AI-Powered</span>
          </div>
          <p className="text-xs text-gray-400">
            OCR, NLP, Risk Scoring, Fraud Detection, Automated Invoicing, Continuous Compliance & Predictive Analytics.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
