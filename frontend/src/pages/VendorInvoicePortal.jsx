/**
 * Vendor Invoice Portal
 * Self-service portal for vendors to submit and track invoices
 */

import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Eye,
  Download,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Package
} from 'lucide-react';
import invoiceService from '../services/invoiceService';

const VendorInvoicePortal = () => {
  const [activeTab, setActiveTab] = useState('submit');
  const [myInvoices, setMyInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  useEffect(() => {
    if (activeTab === 'track') {
      fetchMyInvoices();
    }
  }, [activeTab]);

  const fetchMyInvoices = async () => {
    try {
      setLoading(true);
      // Filter by current vendor
      const data = await invoiceService.getInvoices({ vendor: 'currentVendorId' });
      setMyInvoices(data.invoices || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Invoice Portal</h1>
              <p className="text-gray-600">Submit and track your invoices in real-time</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Vendor ID</div>
              <div className="text-lg font-semibold text-gray-900">VEND-12345</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
              activeTab === 'submit'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              Submit Invoice
            </div>
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
              activeTab === 'track'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" />
              Track Invoices
            </div>
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
              activeTab === 'guidelines'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              Guidelines
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'submit' && <SubmitInvoiceTab onUploadProgress={setUploadProgress} />}
        {activeTab === 'track' && (
          <TrackInvoicesTab invoices={myInvoices} loading={loading} onRefresh={fetchMyInvoices} />
        )}
        {activeTab === 'guidelines' && <GuidelinesTab />}
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Uploading Invoice...</span>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Submit Invoice Tab Component
const SubmitInvoiceTab = ({ onUploadProgress }) => {
  const [submitMethod, setSubmitMethod] = useState('upload');
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    poNumber: '',
    invoiceDate: '',
    dueDate: '',
    totalAmount: '',
    taxAmount: '',
    notes: ''
  });
  const [file, setFile] = useState(null);
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: '', unitPrice: '', total: '' }
  ]);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '', unitPrice: '', total: '' }]);
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    
    // Auto-calculate total
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].unitPrice) || 0;
      updated[index].total = (qty * price).toFixed(2);
    }
    
    setLineItems(updated);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      onUploadProgress(10);
      
      if (submitMethod === 'upload' && file) {
        // File upload method
        await invoiceService.uploadInvoiceFile(file, formData);
      } else {
        // Manual entry method
        const invoiceData = {
          ...formData,
          lineItems: lineItems.filter(item => item.description),
          submissionMethod: 'vendor_portal'
        };
        await invoiceService.submitInvoice(invoiceData);
      }
      
      onUploadProgress(100);
      alert('Invoice submitted successfully!');
      
      // Reset form
      setFormData({
        invoiceNumber: '',
        poNumber: '',
        invoiceDate: '',
        dueDate: '',
        totalAmount: '',
        taxAmount: '',
        notes: ''
      });
      setFile(null);
      setLineItems([{ description: '', quantity: '', unitPrice: '', total: '' }]);
      
      setTimeout(() => onUploadProgress(null), 2000);
    } catch (error) {
      onUploadProgress(null);
      alert('Failed to submit invoice: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Submission Method Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How would you like to submit your invoice?
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSubmitMethod('upload')}
            className={`p-6 border-2 rounded-lg transition ${
              submitMethod === 'upload'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="font-medium">Upload File</div>
            <div className="text-sm text-gray-500">PDF, Image, or Document</div>
          </button>
          <button
            onClick={() => setSubmitMethod('manual')}
            className={`p-6 border-2 rounded-lg transition ${
              submitMethod === 'manual'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="font-medium">Manual Entry</div>
            <div className="text-sm text-gray-500">Enter details manually</div>
          </button>
        </div>
      </div>

      {/* File Upload Section */}
      {submitMethod === 'upload' && (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center mb-8 transition ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-700 mb-2">
            Drag and drop your invoice here
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse
          </p>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="file-input"
            accept="image/*,.pdf"
          />
          <label
            htmlFor="file-input"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Browse Files
          </label>
          {file && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <span className="font-medium">{file.name}</span>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice Details Form */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Number *
          </label>
          <input
            type="text"
            value={formData.invoiceNumber}
            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
            placeholder="INV-2025-001"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PO Number
          </label>
          <input
            type="text"
            value={formData.poNumber}
            onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
            placeholder="PO-2025-001"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Date *
          </label>
          <input
            type="date"
            value={formData.invoiceDate}
            onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Due Date *
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Amount *
          </label>
          <input
            type="number"
            value={formData.totalAmount}
            onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
            placeholder="0.00"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax Amount
          </label>
          <input
            type="number"
            value={formData.taxAmount}
            onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
            placeholder="0.00"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Line Items (for manual entry) */}
      {submitMethod === 'manual' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Line Items</h3>
            <button
              onClick={addLineItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>
          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-end">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Item description"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                    placeholder="Price"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.total}
                    readOnly
                    placeholder="Total"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  {lineItems.length > 1 && (
                    <button
                      onClick={() => removeLineItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          placeholder="Any additional information or special instructions..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          onClick={handleSubmit}
          disabled={!formData.invoiceNumber || !formData.totalAmount}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          <div className="flex items-center justify-center gap-2">
            <Send className="w-5 h-5" />
            Submit Invoice
          </div>
        </button>
      </div>
    </div>
  );
};

// Track Invoices Tab Component
const TrackInvoicesTab = ({ invoices, loading, onRefresh }) => {
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      matched: 'bg-green-100 text-green-800',
      approved: 'bg-emerald-100 text-emerald-800',
      paid: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800',
      exception: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'approved':
      case 'paid':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      case 'exception':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My Invoices</h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Download className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No invoices submitted yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice._id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold">{invoice.invoiceNumber}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Amount</div>
                      <div className="font-semibold text-lg">
                        ${invoice.totalAmount?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Invoice Date</div>
                      <div className="font-medium">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Due Date</div>
                      <div className="font-medium">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  {invoice.approvalData && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600 mb-2">Processing Timeline</div>
                      <div className="flex items-center gap-2">
                        {['submitted', 'processing', 'approved', 'paid'].map((stage, idx) => (
                          <React.Fragment key={stage}>
                            <div
                              className={`flex items-center gap-2 ${
                                invoice.status === stage ? 'text-blue-600' : 'text-gray-400'
                              }`}
                            >
                              {getStatusIcon(stage)}
                              <span className="text-xs capitalize">{stage}</span>
                            </div>
                            {idx < 3 && <div className="flex-1 h-0.5 bg-gray-300" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Guidelines Tab Component
const GuidelinesTab = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6">Invoice Submission Guidelines</h2>

      <div className="space-y-6">
        {/* Required Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Required Information
          </h3>
          <ul className="space-y-2 text-gray-700 ml-7">
            <li>• Invoice number (unique identifier)</li>
            <li>• Purchase Order (PO) number (if applicable)</li>
            <li>• Invoice date</li>
            <li>• Due date for payment</li>
            <li>• Itemized list of goods/services</li>
            <li>• Quantities and unit prices</li>
            <li>• Total amount including taxes</li>
            <li>• Your company's tax ID</li>
          </ul>
        </div>

        {/* File Format */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Accepted File Formats
          </h3>
          <ul className="space-y-2 text-gray-700 ml-7">
            <li>• PDF documents (preferred)</li>
            <li>• JPEG/PNG images</li>
            <li>• Maximum file size: 10MB</li>
          </ul>
        </div>

        {/* Best Practices */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Best Practices
          </h3>
          <ul className="space-y-2 text-gray-700 ml-7">
            <li>• Ensure all text is clear and legible</li>
            <li>• Include PO number for faster processing</li>
            <li>• Submit invoices promptly after delivery</li>
            <li>• Double-check all calculations</li>
            <li>• Keep a copy for your records</li>
          </ul>
        </div>

        {/* Processing Time */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Expected Processing Time</h3>
          <p className="text-blue-800 text-sm">
            Most invoices are processed within 24-48 hours. Invoices with PO numbers and complete
            information may be approved automatically within hours.
          </p>
        </div>

        {/* Support */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-700 text-sm mb-3">
            If you have questions or need assistance, please contact our AP team:
          </p>
          <div className="space-y-1 text-sm">
            <div>📧 Email: ap@company.com</div>
            <div>📞 Phone: (555) 123-4567</div>
            <div>🕐 Hours: Mon-Fri, 9AM-5PM EST</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorInvoicePortal;
