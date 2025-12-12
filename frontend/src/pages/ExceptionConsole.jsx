/**
 * Exception Console Page
 * Exception queue management with resolution workflows
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  TrendingUp,
  RefreshCw,
  MessageSquare,
  Send,
  Eye,
  ArrowRight
} from 'lucide-react';
import invoiceService from '../services/invoiceService';

const ExceptionConsole = () => {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEx, setSelectedEx] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'pending',
    type: '',
    severity: '',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    avgResolutionTime: 0
  });

  useEffect(() => {
    fetchExceptions();
  }, [filters]);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getExceptions(filters);
      setExceptions(data.exceptions || []);
      calculateStats(data.exceptions || []);
    } catch (error) {
      console.error('Failed to fetch exceptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (exceptionList) => {
    const total = exceptionList.length;
    const pending = exceptionList.filter(e => e.status === 'pending').length;
    const resolved = exceptionList.filter(e => e.status === 'resolved').length;
    
    setStats({
      total,
      pending,
      resolved,
      avgResolutionTime: 0 // Calculate from data
    });
  };

  const handleResolve = async (exceptionId, resolution) => {
    try {
      await invoiceService.resolveException(exceptionId, resolution);
      alert('Exception resolved successfully!');
      setShowResolveModal(false);
      setSelectedEx(null);
      fetchExceptions();
    } catch (error) {
      alert('Failed to resolve exception: ' + error.message);
    }
  };

  const getSeverityBadge = (severity) => {
    const severityColors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${severityColors[severity] || 'bg-gray-100 text-gray-800'}`}>
        {severity?.toUpperCase()}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeLabels = {
      matching_failure: 'Matching Failure',
      tax_mismatch: 'Tax Mismatch',
      duplicate_suspected: 'Duplicate Suspected',
      fraud_alert: 'Fraud Alert',
      missing_po: 'Missing PO',
      price_variance: 'Price Variance',
      quantity_variance: 'Quantity Variance'
    };

    return (
      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
        {typeLabels[type] || type}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent') {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    } else if (priority === 'high') {
      return <TrendingUp className="w-5 h-5 text-orange-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exception Console</h1>
        <p className="text-gray-600">Manage and resolve invoice processing exceptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600 text-sm">Total Exceptions</div>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600 text-sm">Pending</div>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600 text-sm">Resolved</div>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600 text-sm">Avg Resolution Time</div>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.avgResolutionTime}h</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search exceptions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="matching_failure">Matching Failure</option>
            <option value="tax_mismatch">Tax Mismatch</option>
            <option value="duplicate_suspected">Duplicate</option>
            <option value="fraud_alert">Fraud Alert</option>
            <option value="price_variance">Price Variance</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchExceptions}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Exceptions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : exceptions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-gray-600">No exceptions found</p>
            <p className="text-sm text-gray-500 mt-2">All invoices are processing smoothly!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {exceptions.map((exception) => (
              <div
                key={exception._id}
                className="p-6 hover:bg-gray-50 transition cursor-pointer"
                onClick={() => {
                  setSelectedEx(exception);
                  setShowResolveModal(true);
                }}
              >
                <div className="flex items-start justify-between">
                  {/* Left Side */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Priority Icon */}
                    <div className="mt-1">
                      {getPriorityIcon(exception.priority)}
                    </div>

                    {/* Exception Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getTypeBadge(exception.type)}
                        {getSeverityBadge(exception.severity)}
                        {exception.slaDeadline && (
                          <span className="text-xs text-gray-500">
                            SLA: {formatDate(exception.slaDeadline)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {exception.invoiceId?.invoiceNumber || 'Invoice Exception'}
                      </h3>

                      <p className="text-gray-600 mb-2">
                        {exception.description || 'No description available'}
                      </p>

                      {/* Invoice Details */}
                      {exception.invoiceId && (
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {exception.invoiceId.invoiceNumber}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {exception.invoiceId.vendorName}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${exception.invoiceId.totalAmount?.toLocaleString()}
                          </div>
                        </div>
                      )}

                      {/* Suggested Actions */}
                      {exception.suggestedActions && exception.suggestedActions.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3">
                          <div className="text-sm font-medium text-blue-900 mb-1">
                            Suggested Actions:
                          </div>
                          <ul className="space-y-1">
                            {exception.suggestedActions.map((action, idx) => (
                              <li key={idx} className="text-sm text-blue-700">
                                • {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Assignment */}
                      {exception.assignedTo && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          Assigned to: {exception.assignedTo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side - Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-gray-500">
                      {formatDate(exception.createdAt)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEx(exception);
                        setShowResolveModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Resolve
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && selectedEx && (
        <ResolveExceptionModal
          exception={selectedEx}
          onClose={() => {
            setShowResolveModal(false);
            setSelectedEx(null);
          }}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
};

// Resolve Exception Modal Component
const ResolveExceptionModal = ({ exception, onClose, onResolve }) => {
  const [resolution, setResolution] = useState({
    action: '',
    notes: '',
    resolvedBy: 'Current User'
  });

  const handleSubmit = () => {
    if (!resolution.action) {
      alert('Please select an action');
      return;
    }
    if (!resolution.notes) {
      alert('Please provide resolution notes');
      return;
    }
    onResolve(exception._id, resolution);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Resolve Exception</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Exception Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <div>
                <div className="font-semibold text-lg">
                  {exception.type?.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">
                  Severity: {exception.severity?.toUpperCase()}
                </div>
              </div>
            </div>

            <p className="text-gray-700 mb-3">{exception.description}</p>

            {/* Invoice Info */}
            {exception.invoiceId && (
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="text-sm text-gray-600">Invoice Number</div>
                  <div className="font-medium">{exception.invoiceId.invoiceNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Vendor</div>
                  <div className="font-medium">{exception.invoiceId.vendorName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Amount</div>
                  <div className="font-medium">{formatCurrency(exception.invoiceId.totalAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="font-medium">{exception.invoiceId.status}</div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Actions */}
          {exception.suggestedActions && exception.suggestedActions.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="font-semibold text-blue-900 mb-2">Suggested Actions:</div>
              <ul className="space-y-2">
                {exception.suggestedActions.map((action, idx) => (
                  <li key={idx} className="text-sm text-blue-700">
                    • {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resolution Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Action *
              </label>
              <select
                value={resolution.action}
                onChange={(e) => setResolution({ ...resolution, action: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select action...</option>
                <option value="approve_override">Approve with Override</option>
                <option value="reject_invoice">Reject Invoice</option>
                <option value="request_clarification">Request Clarification from Vendor</option>
                <option value="manual_matching">Perform Manual Matching</option>
                <option value="update_master_data">Update Master Data</option>
                <option value="escalate">Escalate to Manager</option>
                <option value="create_adjustment">Create Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes *
              </label>
              <textarea
                value={resolution.notes}
                onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
                rows={4}
                placeholder="Provide detailed notes about how this exception was resolved..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick Actions based on Exception Type */}
            {exception.type === 'price_variance' && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="font-medium text-yellow-900 mb-2">Price Variance Details:</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-yellow-700">Invoice Price</div>
                    <div className="font-semibold">$X.XX</div>
                  </div>
                  <div>
                    <div className="text-yellow-700">PO Price</div>
                    <div className="font-semibold">$X.XX</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Resolve Exception
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import missing component
const DollarSign = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default ExceptionConsole;
