/**
 * Invoice Management Page (AP Console)
 * Comprehensive dashboard for accounts payable teams
 */

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  FileCheck,
  Send,
  MoreVertical
} from 'lucide-react';
import invoiceService from '../services/invoiceService';

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    vendor: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchMetrics();
  }, [filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getInvoices(filters);
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const data = await invoiceService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const handleUpload = async (file) => {
    try {
      const result = await invoiceService.uploadInvoiceFile(file);
      alert('Invoice uploaded successfully!');
      setShowUploadModal(false);
      fetchInvoices();
    } catch (error) {
      alert('Failed to upload invoice: ' + error.message);
    }
  };

  const handleProcess = async (invoiceId) => {
    try {
      await invoiceService.processInvoice(invoiceId);
      alert('Invoice processing started!');
      fetchInvoices();
    } catch (error) {
      alert('Failed to process invoice: ' + error.message);
    }
  };

  const handleApprove = async (invoiceId) => {
    try {
      await invoiceService.approveInvoice(invoiceId, {
        approver: 'Current User',
        comments: 'Approved'
      });
      alert('Invoice approved!');
      fetchInvoices();
    } catch (error) {
      alert('Failed to approve invoice: ' + error.message);
    }
  };

  const handleReject = async (invoiceId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await invoiceService.rejectInvoice(invoiceId, {
        rejector: 'Current User',
        reason
      });
      alert('Invoice rejected!');
      fetchInvoices();
    } catch (error) {
      alert('Failed to reject invoice: ' + error.message);
    }
  };

  const handleViewDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      matched: 'bg-green-100 text-green-800',
      exception: 'bg-red-100 text-red-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-gray-100 text-gray-800',
      paid: 'bg-purple-100 text-purple-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.toUpperCase()}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Management</h1>
        <p className="text-gray-600">Automated invoice processing and approval console</p>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm">Total Invoices</div>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.summary?.totalInvoices || 0}</div>
            <div className="text-sm text-gray-500 mt-2">
              {formatCurrency(metrics.summary?.totalAmount || 0)} total value
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm">Pending Approval</div>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.summary?.pendingApproval || 0}</div>
            <div className="text-sm text-gray-500 mt-2">
              Awaiting review
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm">Exceptions</div>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{metrics.summary?.exceptionsCount || 0}</div>
            <div className="text-sm text-gray-500 mt-2">
              Require attention
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm">Auto-Approval Rate</div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {Math.round(metrics.summary?.autoApprovalRate || 0)}%
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Straight-through processing
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="matched">Matched</option>
            <option value="exception">Exception</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>

          {/* Action Buttons */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Upload className="w-5 h-5" />
            Upload Invoice
          </button>

          <button
            onClick={fetchInvoices}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>

          <button
            onClick={() => invoiceService.exportToCSV(filters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invoice.vendorName || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{invoice.vendorId || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.matchingData?.matchScore ? (
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                invoice.matchingData.matchScore >= 90
                                  ? 'bg-green-500'
                                  : invoice.matchingData.matchScore >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${invoice.matchingData.matchScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round(invoice.matchingData.matchScore)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(invoice)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        
                        {invoice.status === 'pending' && (
                          <button
                            onClick={() => handleProcess(invoice._id)}
                            className="text-green-600 hover:text-green-800"
                            title="Process"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        )}
                        
                        {(invoice.status === 'matched' || invoice.status === 'processing') && (
                          <>
                            <button
                              onClick={() => handleApprove(invoice._id)}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleReject(invoice._id)}
                              className="text-red-600 hover:text-red-800"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInvoice(null);
          }}
          onRefresh={fetchInvoices}
        />
      )}
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({ onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleSubmit = () => {
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Upload Invoice</h2>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Drag and drop your invoice here, or
          </p>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="file-upload"
            accept="image/*,.pdf"
          />
          <label
            htmlFor="file-upload"
            className="text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            browse files
          </label>
          {file && (
            <div className="mt-4 text-sm text-gray-700">
              Selected: {file.name}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};

// Invoice Detail Modal Component
const InvoiceDetailModal = ({ invoice, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [matchResults, setMatchResults] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);

  useEffect(() => {
    if (activeTab === 'matching') {
      fetchMatchResults();
    } else if (activeTab === 'audit') {
      fetchAuditTrail();
    }
  }, [activeTab]);

  const fetchMatchResults = async () => {
    try {
      const data = await invoiceService.getMatchResults(invoice._id);
      setMatchResults(data);
    } catch (error) {
      console.error('Failed to fetch match results:', error);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      const data = await invoiceService.getAuditTrail(invoice._id);
      setAuditTrail(data);
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Invoice Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {invoice.invoiceNumber} • {invoice.vendorName}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-6">
            {['details', 'lineItems', 'matching', 'audit'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <div className="text-lg font-semibold">{invoice.invoiceNumber}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Number
                  </label>
                  <div className="text-lg font-semibold">{invoice.poNumber || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {invoice.status?.toUpperCase()}
                  </div>
                </div>
              </div>

              {invoice.extractionData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">OCR Extraction</h3>
                  <div className="text-sm text-gray-600">
                    Confidence: {Math.round(invoice.extractionData.confidence * 100)}%
                  </div>
                </div>
              )}

              {invoice.fraudDetection && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-red-800">Fraud Detection</h3>
                  <div className="text-sm">
                    Risk Score: {invoice.fraudDetection.score}/100
                  </div>
                  {invoice.fraudDetection.flags?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {invoice.fraudDetection.flags.map((flag, idx) => (
                        <li key={idx} className="text-sm text-red-700">• {flag}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'lineItems' && (
            <div>
              <h3 className="font-semibold mb-4">Line Items</h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit Price</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems?.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 text-sm">{item.description}</td>
                      <td className="px-4 py-3 text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'matching' && (
            <div>
              <h3 className="font-semibold mb-4">Matching Results</h3>
              {matchResults ? (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="font-semibold">Match Score: {matchResults.matchScore}%</div>
                    <div className="text-sm text-gray-600">
                      Status: {matchResults.status}
                    </div>
                  </div>
                  {matchResults.discrepancies?.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Discrepancies</h4>
                      <ul className="space-y-1">
                        {matchResults.discrepancies.map((disc, idx) => (
                          <li key={idx} className="text-sm">• {disc.type}: {disc.detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">Loading...</div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <h3 className="font-semibold mb-4">Audit Trail</h3>
              <div className="space-y-3">
                {auditTrail.map((entry, idx) => (
                  <div key={idx} className="border-l-2 border-blue-500 pl-4 py-2">
                    <div className="font-medium">{entry.action}</div>
                    <div className="text-sm text-gray-600">
                      {entry.actor} • {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    {entry.details && (
                      <div className="text-sm text-gray-500 mt-1">{entry.details}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => {
                invoiceService.getEvidenceBundle(invoice._id);
                alert('Evidence bundle downloaded!');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download Evidence Bundle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagement;
