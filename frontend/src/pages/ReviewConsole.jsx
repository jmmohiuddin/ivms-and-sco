import { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, XCircle, AlertTriangle, Clock, Shield, FileText,
  ChevronDown, ChevronUp, Eye, MessageSquare, Flag, Download, Filter,
  Search, RefreshCw, Building2, Globe, DollarSign, Calendar, User,
  ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, History
} from 'lucide-react';
import onboardingService from '../services/onboardingService';

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    draft: { color: 'bg-gray-100 text-gray-600', label: 'Draft' },
    submitted: { color: 'bg-blue-100 text-blue-600', label: 'Submitted' },
    processing: { color: 'bg-purple-100 text-purple-600', label: 'Processing' },
    in_review: { color: 'bg-yellow-100 text-yellow-600', label: 'In Review' },
    pending_approval: { color: 'bg-orange-100 text-orange-600', label: 'Pending Approval' },
    pending_info: { color: 'bg-cyan-100 text-cyan-600', label: 'Awaiting Info' },
    approved: { color: 'bg-green-100 text-green-600', label: 'Approved' },
    rejected: { color: 'bg-red-100 text-red-600', label: 'Rejected' },
    escalated: { color: 'bg-red-100 text-red-600', label: 'Escalated' }
  };
  
  const config = statusConfig[status] || statusConfig.draft;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// Risk tier badge
const RiskBadge = ({ tier }) => {
  const tierConfig = {
    low: { color: 'bg-green-100 text-green-600', icon: Shield },
    medium: { color: 'bg-yellow-100 text-yellow-600', icon: AlertTriangle },
    high: { color: 'bg-orange-100 text-orange-600', icon: AlertTriangle },
    critical: { color: 'bg-red-100 text-red-600', icon: XCircle }
  };
  
  const config = tierConfig[tier] || tierConfig.low;
  const Icon = config.icon;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${config.color}`}>
      <Icon size={12} />
      <span className="capitalize">{tier}</span>
    </span>
  );
};

// Queue item card
const QueueItem = ({ item, onSelect, isSelected }) => (
  <div 
    onClick={() => onSelect(item)}
    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md
      ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className="font-medium text-gray-900">{item.vendorName || 'Unknown Vendor'}</h3>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-sm text-gray-500 mb-2">Case: {item.caseNumber}</p>
        <div className="flex items-center space-x-4 text-xs text-gray-400">
          <span className="flex items-center">
            <Building2 size={12} className="mr-1" />
            {item.category || 'General'}
          </span>
          <span className="flex items-center">
            <Clock size={12} className="mr-1" />
            {item.daysInStatus || 0} days
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end space-y-2">
        <RiskBadge tier={item.riskTier || 'low'} />
        {item.slaStatus === 'breached' && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">SLA Breached</span>
        )}
        {item.slaStatus === 'warning' && (
          <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded">SLA Warning</span>
        )}
      </div>
    </div>
    <div className="mt-3 flex items-center justify-between">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all" 
          style={{ width: `${item.progress || 0}%` }}
        />
      </div>
      <span className="ml-2 text-xs text-gray-500">{item.progress || 0}%</span>
    </div>
  </div>
);

// Case detail panel
const CaseDetailPanel = ({ caseData, onAction, loading }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [approvalReason, setApprovalReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  
  if (!caseData) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Eye size={48} className="mx-auto mb-4" />
          <p>Select a case to view details</p>
        </div>
      </div>
    );
  }
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'risk', label: 'Risk Analysis', icon: Shield },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'comments', label: 'Comments', icon: MessageSquare }
  ];
  
  const handleApprove = () => {
    onAction('approve', { reason: approvalReason });
    setShowApprovalModal(false);
    setApprovalReason('');
  };
  
  const handleReject = () => {
    onAction('reject', { reason: rejectionReason });
    setShowRejectionModal(false);
    setRejectionReason('');
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {caseData.vendorProfile?.legalName || 'Vendor Details'}
            </h2>
            <p className="text-sm text-gray-500">Case: {caseData.caseNumber}</p>
          </div>
          <div className="flex items-center space-x-2">
            <StatusBadge status={caseData.status} />
            <RiskBadge tier={caseData.riskTier} />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mt-4">
          <button
            onClick={() => setShowApprovalModal(true)}
            disabled={loading || caseData.status === 'approved'}
            className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center space-x-2 
              hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ThumbsUp size={16} />
            <span>Approve</span>
          </button>
          <button
            onClick={() => setShowRejectionModal(true)}
            disabled={loading || caseData.status === 'rejected'}
            className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center space-x-2 
              hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ThumbsDown size={16} />
            <span>Reject</span>
          </button>
          <button
            onClick={() => onAction('requestInfo')}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg flex items-center space-x-2 
              hover:bg-yellow-600 disabled:opacity-50"
          >
            <MessageCircle size={16} />
            <span>Request Info</span>
          </button>
          <button
            onClick={() => onAction('escalate')}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg flex items-center space-x-2 
              hover:bg-gray-600 disabled:opacity-50"
          >
            <Flag size={16} />
            <span>Escalate</span>
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b bg-gray-50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 flex items-center space-x-2 text-sm font-medium border-b-2 
                ${activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Vendor Info */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Vendor Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Legal Name</label>
                  <p className="font-medium">{caseData.vendorProfile?.legalName || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">DBA</label>
                  <p className="font-medium">{caseData.vendorProfile?.dbaName || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Registration Number</label>
                  <p className="font-medium">{caseData.vendorProfile?.registrationNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Country</label>
                  <p className="font-medium">{caseData.vendorProfile?.country || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Industry</label>
                  <p className="font-medium capitalize">
                    {caseData.vendorProfile?.classifications?.industry?.replace('_', ' ') || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <p className="font-medium capitalize">{caseData.vendorProfile?.status || '-'}</p>
                </div>
              </div>
            </div>
            
            {/* Verification Results */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Verification Results</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span>Sanctions Check</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium
                    ${caseData.verificationResults?.sanctions?.status === 'clear' 
                      ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {caseData.verificationResults?.sanctions?.status || 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span>Identity Verification</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium
                    ${caseData.verificationResults?.identity?.status === 'verified' 
                      ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {caseData.verificationResults?.identity?.status || 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span>Business Verification</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium
                    ${caseData.verificationResults?.business?.status === 'verified' 
                      ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {caseData.verificationResults?.business?.status || 'Pending'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Contacts */}
            {caseData.contacts?.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Contacts</h3>
                <div className="space-y-3">
                  {caseData.contacts.map((contact, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{contact.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {caseData.documents?.length > 0 ? (
              caseData.documents.map((doc, idx) => (
                <div key={idx} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded">
                        <FileText size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium capitalize">{doc.documentType?.replace('_', ' ')}</h4>
                        <p className="text-sm text-gray-500">{doc.originalFileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium
                        ${doc.verificationStatus === 'verified' ? 'bg-green-100 text-green-600' :
                          doc.verificationStatus === 'failed' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'}`}>
                        {doc.verificationStatus || 'Pending'}
                      </span>
                      <button className="p-1 text-gray-400 hover:text-blue-500">
                        <Eye size={16} />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-blue-500">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Extracted Fields */}
                  {doc.extractedFields?.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Extracted Data</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {doc.extractedFields.slice(0, 6).map((field, fidx) => (
                          <div key={fidx} className="flex justify-between">
                            <span className="text-gray-500">{field.fieldName}:</span>
                            <span className="font-medium">{field.extractedValue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FileText size={48} className="mx-auto mb-4" />
                <p>No documents uploaded</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'risk' && (
          <div className="space-y-4">
            {caseData.riskScores?.length > 0 ? (
              <div className="bg-white border rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-3xl font-bold">
                      {caseData.riskScores[0]?.overallScore || 0}
                    </div>
                    <div className="text-sm text-gray-500">Risk Score</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <RiskBadge tier={caseData.riskTier} />
                    <div className="text-sm text-gray-500 mt-2">Risk Tier</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-3xl font-bold">
                      {caseData.riskScores[0]?.confidenceScore || 0}%
                    </div>
                    <div className="text-sm text-gray-500">Confidence</div>
                  </div>
                </div>
                
                {/* Risk Signals */}
                <h4 className="font-medium text-gray-700 mb-3">Risk Signals</h4>
                <div className="space-y-2">
                  {caseData.riskScores[0]?.signals && 
                    Object.entries(caseData.riskScores[0].signals).map(([key, signal]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="capitalize">{key.replace('_', ' ')}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{signal.score}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium
                            ${signal.status === 'clear' ? 'bg-green-100 text-green-600' :
                              signal.score > 20 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {signal.status}
                          </span>
                        </div>
                      </div>
                    ))
                  }
                </div>
                
                {/* Feature Contributions */}
                {caseData.riskScores[0]?.featureContributions && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">Key Risk Factors</h4>
                    <div className="space-y-2">
                      {caseData.riskScores[0].featureContributions.slice(0, 5).map((factor, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>{factor.description}</span>
                          <span className={factor.direction === 'positive' ? 'text-red-500' : 'text-green-500'}>
                            {factor.direction === 'positive' ? '↑' : '↓'} {(factor.importance * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Shield size={48} className="mx-auto mb-4" />
                <p>Risk assessment not available</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            {caseData.history?.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                {caseData.history.map((event, idx) => (
                  <div key={idx} className="relative pl-10 pb-6">
                    <div className={`absolute left-2 w-4 h-4 rounded-full border-2 
                      ${event.action === 'approved' ? 'bg-green-500 border-green-500' :
                        event.action === 'rejected' ? 'bg-red-500 border-red-500' :
                        'bg-white border-blue-500'}`}>
                    </div>
                    <div className="bg-white border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{event.action?.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{event.description}</p>
                      {event.performedByType && (
                        <p className="text-xs text-gray-400 mt-1">
                          By: {event.performedByType}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <History size={48} className="mx-auto mb-4" />
                <p>No timeline events</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {caseData.vendorMessages?.length > 0 ? (
              caseData.vendorMessages.map((msg, idx) => (
                <div key={idx} className={`p-4 rounded-lg ${
                  msg.sentByType === 'vendor' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{msg.sentByType}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-4" />
                <p>No comments yet</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Approve Vendor</h3>
            <textarea
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="Add approval notes (optional)..."
              className="w-full p-3 border rounded-lg mb-4"
              rows={4}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Vendor</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide reason for rejection (required)..."
              className="w-full p-3 border rounded-lg mb-4"
              rows={4}
              required
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Review Console Component
const ReviewConsole = () => {
  const [queue, setQueue] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    riskTier: '',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  
  // Load queue on mount
  useEffect(() => {
    loadQueue();
    loadStats();
  }, [filters]);
  
  // Load case details when selection changes
  useEffect(() => {
    if (selectedCase) {
      loadCaseDetails(selectedCase.caseId);
    }
  }, [selectedCase]);
  
  const loadQueue = async () => {
    setLoading(true);
    try {
      const response = await onboardingService.getReviewQueue({
        status: filters.status || undefined,
        riskTier: filters.riskTier || undefined
      });
      setQueue(response.data || []);
    } catch (error) {
      console.error('Error loading queue:', error);
      // Mock data for demo
      setQueue([
        {
          caseId: '1',
          caseNumber: 'ONB-2024-001',
          vendorName: 'Acme Corp',
          category: 'Supplier',
          riskTier: 'medium',
          status: 'in_review',
          progress: 75,
          daysInStatus: 2,
          slaStatus: 'normal'
        },
        {
          caseId: '2',
          caseNumber: 'ONB-2024-002',
          vendorName: 'TechGlobal LLC',
          category: 'Contractor',
          riskTier: 'high',
          status: 'pending_approval',
          progress: 90,
          daysInStatus: 5,
          slaStatus: 'warning'
        },
        {
          caseId: '3',
          caseNumber: 'ONB-2024-003',
          vendorName: 'Green Solutions Inc',
          category: 'Supplier',
          riskTier: 'low',
          status: 'submitted',
          progress: 40,
          daysInStatus: 1,
          slaStatus: 'normal'
        }
      ]);
    }
    setLoading(false);
  };
  
  const loadStats = async () => {
    try {
      const response = await onboardingService.getAnalytics();
      if (response.data?.summary) {
        setStats({
          total: response.data.summary.totalCases,
          pending: response.data.summary.pendingCases,
          approved: response.data.summary.completedCases,
          rejected: response.data.summary.rejectedCases
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({ total: 15, pending: 8, approved: 5, rejected: 2 });
    }
  };
  
  const loadCaseDetails = async (caseId) => {
    setLoading(true);
    try {
      const response = await onboardingService.getCase(caseId);
      setCaseDetails(response.data);
    } catch (error) {
      console.error('Error loading case details:', error);
      // Mock data
      setCaseDetails({
        caseNumber: 'ONB-2024-001',
        status: 'in_review',
        riskTier: 'medium',
        vendorProfile: {
          legalName: 'Acme Corp',
          dbaName: 'Acme',
          registrationNumber: '123456789',
          country: 'US',
          classifications: { industry: 'manufacturing' },
          status: 'pending'
        },
        verificationResults: {
          sanctions: { status: 'clear' },
          identity: { status: 'verified' },
          business: { status: 'pending' }
        },
        documents: [
          { documentType: 'business_registration', originalFileName: 'reg.pdf', verificationStatus: 'verified' },
          { documentType: 'tax_certificate', originalFileName: 'tax.pdf', verificationStatus: 'pending' }
        ],
        riskScores: [{
          overallScore: 35,
          confidenceScore: 85,
          signals: {
            sanctions: { status: 'clear', score: 0 },
            financial: { status: 'medium', score: 15 },
            compliance: { status: 'clear', score: 5 }
          },
          featureContributions: [
            { description: 'Years in business: 3', direction: 'negative', importance: 0.15 },
            { description: 'Document completion: 80%', direction: 'negative', importance: 0.12 }
          ]
        }],
        history: [
          { action: 'created', description: 'Case created', timestamp: new Date(), performedByType: 'vendor' },
          { action: 'submitted', description: 'Case submitted for review', timestamp: new Date(), performedByType: 'vendor' }
        ],
        contacts: [
          { name: 'John Doe', email: 'john@acme.com', role: 'primary' }
        ]
      });
    }
    setLoading(false);
  };
  
  const handleCaseAction = async (action, data) => {
    if (!caseDetails) return;
    
    setLoading(true);
    try {
      switch (action) {
        case 'approve':
          await onboardingService.approveCase(caseDetails._id || selectedCase.caseId, data.reason);
          break;
        case 'reject':
          await onboardingService.rejectCase(caseDetails._id || selectedCase.caseId, data.reason);
          break;
        case 'requestInfo':
          await onboardingService.requestInfo(caseDetails._id || selectedCase.caseId, [], 'Additional information required');
          break;
        case 'escalate':
          await onboardingService.escalateCase(caseDetails._id || selectedCase.caseId, 'Requires senior review', null);
          break;
      }
      
      // Reload queue and details
      loadQueue();
      loadCaseDetails(selectedCase.caseId);
    } catch (error) {
      console.error('Action error:', error);
    }
    setLoading(false);
  };
  
  const filteredQueue = queue.filter(item => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return item.vendorName?.toLowerCase().includes(searchLower) ||
             item.caseNumber?.toLowerCase().includes(searchLower);
    }
    return true;
  });
  
  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="text-blue-500" size={28} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Review Console</h1>
              <p className="text-sm text-gray-500">Human-in-the-loop onboarding review</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Stats */}
            <div className="flex items-center space-x-6 px-4 py-2 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-500">{stats.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-500">{stats.approved}</div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-500">{stats.rejected}</div>
                <div className="text-xs text-gray-500">Rejected</div>
              </div>
            </div>
            
            <button
              onClick={loadQueue}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Queue Panel */}
        <div className="w-96 bg-white border-r flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search vendors..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex space-x-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="in_review">In Review</option>
                <option value="pending_approval">Pending Approval</option>
              </select>
              <select
                value={filters.riskTier}
                onChange={(e) => setFilters(prev => ({ ...prev, riskTier: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Risk</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          {/* Queue List */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {filteredQueue.length > 0 ? (
              filteredQueue.map((item) => (
                <QueueItem
                  key={item.caseId}
                  item={item}
                  onSelect={setSelectedCase}
                  isSelected={selectedCase?.caseId === item.caseId}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users size={48} className="mx-auto mb-4" />
                <p>No cases in queue</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Detail Panel */}
        <div className="flex-1 bg-gray-50">
          <CaseDetailPanel 
            caseData={caseDetails} 
            onAction={handleCaseAction}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default ReviewConsole;
