import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
// Modern UI Layout
import ModernLayout from './components/Layout/ModernLayout'
// Authentication
import Login from './pages/Login'
import Register from './pages/Register'
// Modern UI Pages (Primary)
import ModernDashboard from './pages/ModernDashboard'
import VendorOnboardingPortal from './pages/VendorOnboardingPortal'
import InvoiceProcessingInbox from './pages/InvoiceProcessingInbox'
import ComplianceCenter from './pages/ComplianceCenter'
import PredictiveAnalytics from './pages/PredictiveAnalytics'
// Public Vendor Portals
import VendorOnboarding from './pages/VendorOnboarding'
import VendorInvoicePortal from './pages/VendorInvoicePortal'
import VendorCompliancePortal from './pages/VendorCompliancePortal'
// Legacy Components (for backward compatibility)
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Vendors from './pages/Vendors'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Analytics from './pages/Analytics'
import CommandCenter from './pages/CommandCenter'
import DocumentProcessor from './pages/DocumentProcessor'
import ReviewConsole from './pages/ReviewConsole'
import InvoiceManagement from './pages/InvoiceManagement'
import ExceptionConsole from './pages/ExceptionConsole'
import ComplianceDashboard from './pages/ComplianceDashboard'
import RemediationConsole from './pages/RemediationConsole'
import PolicyBuilder from './pages/PolicyBuilder'
import PredictiveInsightsDashboard from './pages/predictions/PredictiveInsightsDashboard'
import ScenarioSimulator from './pages/predictions/ScenarioSimulator'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  // Development mode - bypass authentication
  const isDevelopment = import.meta.env.MODE === 'development' || process.env.NODE_ENV === 'development'
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  // In development, allow access without authentication
  if (isDevelopment) {
    return children
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Public Vendor Portals */}
        <Route path="/vendor/onboarding" element={<VendorOnboarding />} />
        <Route path="/vendor/portal" element={<VendorInvoicePortal />} />
        <Route path="/vendor/compliance" element={<VendorCompliancePortal />} />
        
        {/* Protected Routes with Sidebar */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<ModernDashboard />} />
          
          {/* Command Center */}
          <Route path="command-center" element={<CommandCenter />} />
          
          {/* Review Console */}
          <Route path="review-console" element={<ReviewConsole />} />
          
          {/* Invoices */}
          <Route path="invoices" element={<InvoiceManagement />} />
          
          {/* Exceptions */}
          <Route path="exceptions" element={<ExceptionConsole />} />
          
          {/* Documents */}
          <Route path="documents" element={<DocumentProcessor />} />
          
          {/* Products */}
          <Route path="products" element={<Products />} />
          
          {/* Orders */}
          <Route path="orders" element={<Orders />} />
          
          {/* Analytics */}
          <Route path="analytics" element={<Analytics />} />
          
          {/* Vendors - show list by default */}
          <Route path="vendors" element={<Vendors />} />
          <Route path="vendors/onboarding" element={<VendorOnboardingPortal />} />
          <Route path="vendors/list" element={<Vendors />} />
          
          {/* Invoice Processing */}
          <Route path="invoicing">
            <Route index element={<Navigate to="/invoicing/queue" replace />} />
            <Route path="queue" element={<InvoiceProcessingInbox />} />
            <Route path="exceptions" element={<ExceptionConsole />} />
          </Route>
          
          {/* Compliance */}
          <Route path="compliance">
            <Route index element={<ComplianceCenter />} />
            <Route path="remediation" element={<RemediationConsole />} />
          </Route>
          
          {/* Policies */}
          <Route path="policies" element={<PolicyBuilder />} />
          
          {/* Predictions */}
          <Route path="predictions" element={<PredictiveInsightsDashboard />} />
          
          {/* Scenarios */}
          <Route path="scenarios" element={<ScenarioSimulator />} />
          
          {/* Settings & Profile */}
          <Route path="settings" element={<Dashboard />} />
        </Route>

        {/* Modern UI Routes (Alternative) */}
        <Route path="/modern" element={
          <ProtectedRoute>
            <ModernLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ModernDashboard />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="vendors/onboarding" element={<VendorOnboardingPortal />} />
          <Route path="invoicing/queue" element={<InvoiceProcessingInbox />} />
          <Route path="compliance" element={<ComplianceCenter />} />
          <Route path="analytics" element={<PredictiveAnalytics />} />
        </Route>

        {/* Legacy Routes (for backward compatibility) */}
        <Route path="/legacy" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="command-center" element={<CommandCenter />} />
          <Route path="documents" element={<DocumentProcessor />} />
          <Route path="review-console" element={<ReviewConsole />} />
          <Route path="invoices" element={<InvoiceManagement />} />
          <Route path="compliance-old" element={<ComplianceDashboard />} />
          <Route path="policies" element={<PolicyBuilder />} />
          <Route path="predictions" element={<PredictiveInsightsDashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="analytics-old" element={<Analytics />} />
        </Route>
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
