import { useState } from 'react';
import { 
  FiFilter, FiSearch, FiCheckCircle, FiAlertCircle, FiClock,
  FiDollarSign, FiFileText, FiMoreVertical, FiX, FiCheck,
  FiExternalLink, FiEdit, FiRefreshCw, FiAlertTriangle
} from 'react-icons/fi';

const InvoiceProcessingInbox = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { id: 'all', label: 'All Invoices', count: 156 },
    { id: 'exceptions', label: 'Exceptions Only', count: 24, color: 'red' },
    { id: 'auto-approved', label: 'Auto-Approved', count: 89, color: 'green' },
    { id: 'high-value', label: 'High Value', count: 18, color: 'purple' },
    { id: 'near-due', label: 'Near Due', count: 31, color: 'yellow' },
    { id: 'pending', label: 'Pending Review', count: 14, color: 'blue' }
  ];

  const invoices = [
    {
      id: 1,
      vendor: 'TechCorp Solutions',
      invoiceNumber: 'INV-2024-001',
      amount: 12500.00,
      currency: 'USD',
      dueDate: '2024-12-15',
      status: 'exception',
      matchScore: 92,
      aiComment: 'Amount exceeds PO by 8% - possible quantity mismatch',
      poNumber: 'PO-982',
      submittedDate: '2024-12-01',
      priority: 'high'
    },
    {
      id: 2,
      vendor: 'Global Supplies Inc',
      invoiceNumber: 'INV-2024-002',
      amount: 3200.50,
      currency: 'USD',
      dueDate: '2024-12-20',
      status: 'matched',
      matchScore: 98,
      aiComment: 'Perfect match with PO #1024',
      poNumber: 'PO-1024',
      submittedDate: '2024-12-02',
      priority: 'normal'
    },
    {
      id: 3,
      vendor: 'AccuSoft Systems',
      invoiceNumber: 'INV-2024-003',
      amount: 8900.00,
      currency: 'USD',
      dueDate: '2024-12-10',
      status: 'exception',
      matchScore: 76,
      aiComment: 'Likely duplicate - similar to INV-2024-998',
      poNumber: null,
      submittedDate: '2024-12-03',
      priority: 'high'
    },
    {
      id: 4,
      vendor: 'Office Essentials Ltd',
      invoiceNumber: 'INV-2024-004',
      amount: 450.75,
      currency: 'USD',
      dueDate: '2024-12-18',
      status: 'approved',
      matchScore: 100,
      aiComment: 'Auto-approved',
      poNumber: 'PO-1089',
      submittedDate: '2024-12-04',
      priority: 'low'
    }
  ];

  const getStatusColor = (status) => {
    const colors = {
      exception: 'bg-red-100 text-red-700 border-red-200',
      matched: 'bg-blue-100 text-blue-700 border-blue-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getMatchScoreColor = (score) => {
    if (score >= 95) return 'text-green-600 bg-green-50';
    if (score >= 85) return 'text-blue-600 bg-blue-50';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Invoice Processing</h1>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Bulk Approve (24)
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <FiRefreshCw size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                selectedFilter === filter.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-sm font-medium">{filter.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedFilter === filter.id
                  ? 'bg-white bg-opacity-20'
                  : 'bg-white'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices by vendor, number, amount, or PO..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Invoice List */}
        <div className="flex-1 overflow-y-auto bg-white">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              onClick={() => setSelectedInvoice(invoice)}
              className={`border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedInvoice?.id === invoice.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{invoice.vendor}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(invoice.status)}`}>
                      {invoice.status === 'exception' ? 'Exception' :
                       invoice.status === 'matched' ? 'Matched' :
                       invoice.status === 'approved' ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <FiFileText size={12} />
                      <span>{invoice.invoiceNumber}</span>
                    </span>
                    {invoice.poNumber && (
                      <span>PO: {invoice.poNumber}</span>
                    )}
                    <span className="flex items-center space-x-1">
                      <FiClock size={12} />
                      <span>Due {invoice.dueDate}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    ${invoice.amount.toLocaleString()}
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded ${getMatchScoreColor(invoice.matchScore)}`}>
                    {invoice.matchScore}% match
                  </div>
                </div>
              </div>

              {/* AI Comment */}
              <div className="flex items-start space-x-2 mt-2 p-2 bg-gray-50 rounded-lg">
                {invoice.status === 'exception' ? (
                  <FiAlertTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" size={14} />
                ) : (
                  <FiCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={14} />
                )}
                <p className="text-xs text-gray-700 flex-1">{invoice.aiComment}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice Details Drawer */}
        {selectedInvoice && (
          <div className="w-2/5 border-l border-gray-200 bg-white overflow-y-auto">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedInvoice.invoiceNumber}</h2>
                  <p className="text-sm text-gray-600">{selectedInvoice.vendor}</p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
                  <FiCheck size={16} />
                  <span>Approve</span>
                </button>
                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2">
                  <FiX size={16} />
                  <span>Reject</span>
                </button>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <FiMoreVertical size={18} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Invoice Preview & Details */}
            <div className="p-4 space-y-4">
              {/* PDF Preview Placeholder */}
              <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                <FiFileText size={48} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">Invoice Document</p>
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2 mx-auto">
                  <FiExternalLink size={14} />
                  <span>View Full Document</span>
                </button>
              </div>

              {/* Match Analysis */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">AI Match Analysis</h3>
                  <span className={`text-sm font-bold px-3 py-1 rounded ${getMatchScoreColor(selectedInvoice.matchScore)}`}>
                    {selectedInvoice.matchScore}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Vendor Match</span>
                    <span className="text-green-600 font-medium flex items-center space-x-1">
                      <FiCheckCircle size={14} />
                      <span>100%</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Amount Match</span>
                    <span className="text-yellow-600 font-medium flex items-center space-x-1">
                      <FiAlertCircle size={14} />
                      <span>92%</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Item Match</span>
                    <span className="text-green-600 font-medium flex items-center space-x-1">
                      <FiCheckCircle size={14} />
                      <span>98%</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Extracted Fields */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Extracted Fields</h3>
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1">
                    <FiEdit size={12} />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { label: 'Invoice Number', value: selectedInvoice.invoiceNumber },
                    { label: 'Invoice Date', value: selectedInvoice.submittedDate },
                    { label: 'Due Date', value: selectedInvoice.dueDate },
                    { label: 'Amount', value: `$${selectedInvoice.amount.toLocaleString()}` },
                    { label: 'Currency', value: selectedInvoice.currency },
                    { label: 'PO Number', value: selectedInvoice.poNumber || 'Not found' },
                    { label: 'Tax', value: '$0.00' },
                    { label: 'Payment Terms', value: 'Net 30' }
                  ].map((field, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{field.label}</span>
                      <span className="text-sm font-medium text-gray-900">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exception Resolution */}
              {selectedInvoice.status === 'exception' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <FiAlertTriangle className="text-yellow-600 mt-0.5" size={18} />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Exception Detected</h4>
                      <p className="text-sm text-gray-700">{selectedInvoice.aiComment}</p>
                    </div>
                  </div>
                  
                  {selectedInvoice.matchScore < 95 && (
                    <div className="bg-white rounded-lg p-3 mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-700">AI Suggestions:</p>
                      <div className="space-y-2">
                        <button className="w-full text-left bg-blue-50 border border-blue-200 rounded-lg p-2 hover:bg-blue-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-900">Apply PO #985 instead</span>
                            <FiExternalLink size={14} className="text-blue-600" />
                          </div>
                          <p className="text-xs text-gray-600 mt-1">95% similarity match</p>
                        </button>
                        <button className="w-full text-left bg-blue-50 border border-blue-200 rounded-lg p-2 hover:bg-blue-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-900">Contact vendor for clarification</span>
                            <FiExternalLink size={14} className="text-blue-600" />
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Request updated invoice</p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Line Items */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {[
                    { description: 'Software License - Premium', qty: 10, price: 1200.00 },
                    { description: 'Support & Maintenance', qty: 1, price: 500.00 }
                  ].map((item, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Qty: {item.qty} × ${item.price.toLocaleString()}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          ${(item.qty * item.price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Activity Log</h3>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { action: 'Invoice received', time: '2 hours ago', user: 'System' },
                    { action: 'AI processing completed', time: '2 hours ago', user: 'AI Agent' },
                    { action: 'Exception flagged', time: '1 hour ago', user: 'AI Agent' },
                    { action: 'Assigned for review', time: '30 min ago', user: 'System' }
                  ].map((log, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-500">{log.time} • {log.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceProcessingInbox;
