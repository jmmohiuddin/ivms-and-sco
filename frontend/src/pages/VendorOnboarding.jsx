import { useState, useEffect } from 'react';
import { 
  UserPlus, Building2, FileText, Upload, CheckCircle, AlertTriangle, 
  Clock, Shield, ChevronRight, ChevronDown, Globe, Phone, Mail,
  Briefcase, DollarSign, Users, MapPin, Calendar, X, Plus
} from 'lucide-react';
import onboardingService from '../services/onboardingService';

// Step indicator component
const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex items-center justify-between mb-8">
    {steps.map((step, index) => (
      <div key={step.id} className="flex items-center">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
          ${index < currentStep ? 'bg-green-500 border-green-500 text-white' : 
            index === currentStep ? 'bg-blue-500 border-blue-500 text-white' : 
            'border-gray-300 text-gray-400'}`}>
          {index < currentStep ? <CheckCircle size={20} /> : index + 1}
        </div>
        <span className={`ml-2 text-sm font-medium 
          ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
          {step.title}
        </span>
        {index < steps.length - 1 && (
          <ChevronRight className="mx-4 text-gray-300" size={20} />
        )}
      </div>
    ))}
  </div>
);

// Dynamic form field component
const DynamicField = ({ field, value, onChange, errors, isSearching }) => {
  const baseClasses = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const errorClasses = errors[field.name] ? "border-red-500" : "border-gray-300";
  
  const renderField = () => {
    switch (field.type) {
      case 'select':
        return (
          <select 
            value={value || ''} 
            onChange={(e) => onChange(field.name, e.target.value)}
            className={`${baseClasses} ${errorClasses}`}
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={`${baseClasses} ${errorClasses}`}
            rows={4}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      
      case 'checkbox':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(field.name, e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded"
            />
            <span className="ml-2 text-gray-700">{field.checkboxLabel}</span>
          </label>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={`${baseClasses} ${errorClasses}`}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            required={field.required}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={`${baseClasses} ${errorClasses}`}
            required={field.required}
          />
        );
      
      default:
        return (
          <input
            type={field.type || 'text'}
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={`${baseClasses} ${errorClasses}`}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
        {field.name === 'legalName' && isSearching && (
          <span className="ml-2 text-xs text-blue-500 flex items-center">
            <Clock className="animate-spin mr-1" size={12} />
            Searching...
          </span>
        )}
      </label>
      {renderField()}
      {errors[field.name] && (
        <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>
      )}
      {field.helpText && (
        <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
      )}
      {field.name === 'legalName' && !isSearching && (
        <p className="mt-1 text-xs text-gray-500">💡 AI will search for company info as you type</p>
      )}
    </div>
  );
};

// Document upload component
const DocumentUploader = ({ documents, onUpload, onRemove, processingStatus }) => {
  const [dragActive, setDragActive] = useState(false);
  
  const documentTypes = [
    { type: 'business_registration', label: 'Business Registration', required: true, icon: Building2 },
    { type: 'tax_certificate', label: 'Tax Certificate', required: true, icon: FileText },
    { type: 'bank_statement', label: 'Bank Statement', required: false, icon: DollarSign },
    { type: 'insurance_certificate', label: 'Insurance Certificate', required: false, icon: Shield },
    { type: 'w9_w8', label: 'W-9 / W-8 Form', required: true, icon: FileText },
    { type: 'id_document', label: 'ID Document', required: true, icon: UserPlus }
  ];
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e, docType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(docType, e.dataTransfer.files[0]);
    }
  };
  
  const handleFileSelect = (e, docType) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(docType, e.target.files[0]);
    }
  };
  
  return (
    <div className="space-y-4">
      {documentTypes.map((docType) => {
        const uploadedDoc = documents.find(d => d.type === docType.type);
        const status = processingStatus[docType.type];
        const Icon = docType.icon;
        
        return (
          <div 
            key={docType.type}
            className={`border-2 border-dashed rounded-lg p-4 transition-colors
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${uploadedDoc ? 'bg-green-50 border-green-300' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(e) => handleDrop(e, docType.type)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${uploadedDoc ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Icon size={24} className={uploadedDoc ? 'text-green-600' : 'text-gray-500'} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {docType.label}
                    {docType.required && <span className="text-red-500 ml-1">*</span>}
                  </h4>
                  {uploadedDoc ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-600">{uploadedDoc.file?.name || uploadedDoc.filename}</span>
                      {status === 'processing' && (
                        <span className="text-xs text-blue-500 animate-pulse flex items-center">
                          <Clock size={12} className="mr-1 animate-spin" /> Extracting with AI...
                        </span>
                      )}
                      {status === 'verified' && (
                        <span className="text-xs text-green-500 flex items-center">
                          <CheckCircle size={12} className="mr-1" /> ✓ AI Extracted
                        </span>
                      )}
                      {status === 'uploaded' && (
                        <span className="text-xs text-yellow-500 flex items-center">
                          <CheckCircle size={12} className="mr-1" /> Uploaded
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="text-xs text-red-500 flex items-center">
                          <AlertTriangle size={12} className="mr-1" /> Error
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Drag & drop or click to upload</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {uploadedDoc ? (
                  <button
                    onClick={() => onRemove(docType.type)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={20} />
                  </button>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleFileSelect(e, docType.type)}
                    />
                    <span className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
                      Upload
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Risk display component
const RiskDisplay = ({ riskScore, loading }) => {
  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }
  
  if (!riskScore) return null;
  
  const getTierColor = (tier) => {
    switch (tier) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Shield className="mr-2 text-blue-500" size={20} />
        Risk Assessment
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-gray-900">{riskScore.overallScore}</div>
          <div className="text-sm text-gray-500">Overall Score</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(riskScore.riskTier)}`}>
            {riskScore.riskTier?.toUpperCase()}
          </span>
          <div className="text-sm text-gray-500 mt-2">Risk Tier</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-gray-900">{riskScore.confidenceScore}%</div>
          <div className="text-sm text-gray-500">Confidence</div>
        </div>
      </div>
      
      {riskScore.riskSignals && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Risk Signals</h4>
          {Object.entries(riskScore.riskSignals).map(([key, signal]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="capitalize">{key.replace('_', ' ')}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium
                ${signal.status === 'clear' ? 'bg-green-100 text-green-600' : 
                  signal.status === 'low_risk' ? 'bg-green-100 text-green-600' :
                  signal.score > 20 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {signal.status}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {riskScore.featureContributions && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Top Risk Factors</h4>
          <div className="space-y-2">
            {riskScore.featureContributions.slice(0, 5).map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{factor.description}</span>
                <span className={factor.direction === 'positive' ? 'text-red-500' : 'text-green-500'}>
                  {factor.direction === 'positive' ? '↑' : '↓'} {(factor.importance * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Vendor Onboarding Component
const VendorOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [documents, setDocuments] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});
  const [formConfig, setFormConfig] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const [documentProcessing, setDocumentProcessing] = useState({});
  
  const steps = [
    { id: 'type', title: 'Vendor Type' },
    { id: 'info', title: 'Business Info' },
    { id: 'documents', title: 'Documents' },
    { id: 'review', title: 'Review & Submit' }
  ];
  
  // Vendor type options
  const vendorTypes = [
    { value: 'supplier', label: 'Supplier', description: 'Provides goods or raw materials', icon: Building2 },
    { value: 'contractor', label: 'Contractor', description: 'Provides services or labor', icon: Users },
    { value: 'consultant', label: 'Consultant', description: 'Provides professional advice', icon: Briefcase },
    { value: 'distributor', label: 'Distributor', description: 'Distributes products', icon: Globe }
  ];
  
  // Default form fields
  const defaultFields = [
    { name: 'legalName', label: 'Legal Business Name', type: 'text', required: true },
    { name: 'dbaName', label: 'DBA (Doing Business As)', type: 'text', required: false },
    { name: 'registrationNumber', label: 'Registration/EIN Number', type: 'text', required: true },
    { name: 'country', label: 'Country', type: 'select', required: true, options: [
      { value: 'US', label: 'United States' },
      { value: 'CA', label: 'Canada' },
      { value: 'GB', label: 'United Kingdom' },
      { value: 'DE', label: 'Germany' },
      { value: 'FR', label: 'France' },
      { value: 'AU', label: 'Australia' },
      { value: 'JP', label: 'Japan' },
      { value: 'SG', label: 'Singapore' },
      { value: 'OTHER', label: 'Other' }
    ]},
    { name: 'address', label: 'Business Address', type: 'textarea', required: true },
    { name: 'yearsInBusiness', label: 'Years in Business', type: 'number', required: true, min: 0 },
    { name: 'annualRevenue', label: 'Annual Revenue (USD)', type: 'number', required: true, min: 0 },
    { name: 'employeeCount', label: 'Number of Employees', type: 'number', required: true, min: 1 },
    { name: 'industry', label: 'Industry', type: 'select', required: true, options: [
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'technology', label: 'Technology' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'financial', label: 'Financial Services' },
      { value: 'retail', label: 'Retail' },
      { value: 'logistics', label: 'Logistics' },
      { value: 'construction', label: 'Construction' },
      { value: 'professional_services', label: 'Professional Services' },
      { value: 'other', label: 'Other' }
    ]},
    { name: 'contactName', label: 'Primary Contact Name', type: 'text', required: true },
    { name: 'contactEmail', label: 'Primary Contact Email', type: 'email', required: true },
    { name: 'contactPhone', label: 'Primary Contact Phone', type: 'tel', required: true },
    { name: 'website', label: 'Website', type: 'url', required: false }
  ];
  
  // Load form config when vendor type changes
  useEffect(() => {
    if (formData.vendorType && formData.country) {
      loadFormConfig();
    }
  }, [formData.vendorType, formData.country]);
  
  const loadFormConfig = async () => {
    try {
      const config = await onboardingService.getFormConfig(
        formData.vendorType, 
        formData.country, 
        'standard'
      );
      setFormConfig(config.data);
    } catch (error) {
      console.error('Error loading form config:', error);
      // Use default fields if API fails
      setFormConfig({ fields: defaultFields });
    }
  };
  
  // Company search and autofill
  const handleCompanySearch = async (companyName) => {
    if (!companyName || companyName.length < 3) return;
    
    setCompanySearchLoading(true);
    try {
      const response = await fetch(`http://localhost:5002/llm/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Search and provide information about the company: "${companyName}". Return JSON with: {"legalName": "name", "website": "url", "country": "country code", "industry": "industry type", "description": "brief description"}`,
          system_prompt: 'You are a company information assistant. Return ONLY valid JSON.',
          temperature: 0.3
        })
      });
      
      const result = await response.json();
      if (result.success && result.response) {
        try {
          const jsonMatch = result.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            setFormData(prev => ({
              ...prev,
              ...(data.legalName && { legalName: data.legalName }),
              ...(data.website && { website: data.website }),
              ...(data.country && { country: data.country }),
              ...(data.industry && { industry: data.industry })
            }));
          }
        } catch (e) {
          console.log('Company data parsed from AI:', result.response);
        }
      }
    } catch (error) {
      console.error('Company search error:', error);
    }
    setCompanySearchLoading(false);
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Trigger company search when legal name is entered
    if (name === 'legalName' && value.length >= 3) {
      const timeoutId = setTimeout(() => handleCompanySearch(value), 800);
      return () => clearTimeout(timeoutId);
    }
  };
  
  const handleDocumentUpload = async (docType, file) => {
    // Add document to state
    setDocuments(prev => [...prev.filter(d => d.type !== docType), { type: docType, file, filename: file.name }]);
    setProcessingStatus(prev => ({ ...prev, [docType]: 'processing' }));
    setDocumentProcessing(prev => ({ ...prev, [docType]: true }));
    
    try {
      // Upload to backend
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('documentType', docType);
      
      const uploadResponse = await fetch('http://localhost:5001/api/documents/test/upload', {
        method: 'POST',
        body: uploadFormData
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (uploadResult.success) {
        // Extract data using AI
        const extractResponse = await fetch('http://localhost:5001/api/ai/test/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: uploadResult.data.id })
        });
        
        const extractResult = await extractResponse.json();
        
        if (extractResult.success && extractResult.data.extractedFields) {
          const extracted = extractResult.data.extractedFields;
          // Autofill form with extracted data
          setFormData(prev => ({
            ...prev,
            ...(extracted.vendorName && { legalName: extracted.vendorName }),
            ...(extracted.registrationNumber && { registrationNumber: extracted.registrationNumber }),
            ...(extracted.address && { address: extracted.address }),
            ...(extracted.taxId && { taxId: extracted.taxId }),
            ...(extracted.invoiceNumber && { referenceNumber: extracted.invoiceNumber })
          }));
          
          setProcessingStatus(prev => ({ ...prev, [docType]: 'verified' }));
          console.log('✅ Document extracted:', extracted);
        } else {
          setProcessingStatus(prev => ({ ...prev, [docType]: 'uploaded' }));
        }
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Document processing error:', error);
      setProcessingStatus(prev => ({ ...prev, [docType]: 'error' }));
    } finally {
      setDocumentProcessing(prev => ({ ...prev, [docType]: false }));
    }
  };
  
  const handleDocumentRemove = (docType) => {
    setDocuments(prev => prev.filter(d => d.type !== docType));
    setProcessingStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[docType];
      return newStatus;
    });
  };
  
  const validateStep = () => {
    const newErrors = {};
    
    if (currentStep === 0) {
      if (!formData.vendorType) {
        newErrors.vendorType = 'Please select a vendor type';
      }
    } else if (currentStep === 1) {
      const fields = formConfig?.fields || defaultFields;
      fields.forEach(field => {
        if (field.required && !formData[field.name]) {
          newErrors[field.name] = `${field.label} is required`;
        }
      });
    } else if (currentStep === 2) {
      // Check required documents
      const requiredDocs = ['business_registration', 'tax_certificate', 'w9_w8', 'id_document'];
      requiredDocs.forEach(docType => {
        if (!documents.find(d => d.type === docType)) {
          newErrors[docType] = `${docType.replace('_', ' ')} is required`;
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = async () => {
    if (!validateStep()) return;
    
    if (currentStep === 2) {
      // Calculate risk score before review
      setLoading(true);
      try {
        const result = await onboardingService.mlCalculateRisk({
          ...formData,
          documents: {
            uploadedCount: documents.length,
            averageConfidence: 0.85
          }
        });
        setRiskScore(result);
      } catch (error) {
        console.error('Risk calculation error:', error);
      }
      setLoading(false);
    }
    
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };
  
  const handleSubmit = async () => {
    if (!validateStep()) {
      setSubmitStatus({
        success: false,
        message: 'Please complete all required fields'
      });
      return;
    }
    
    setLoading(true);
    setSubmitStatus(null);
    
    try {
      // Submit to backend
      const response = await fetch('http://localhost:5001/api/onboarding/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorData: formData,
          documents: documents.map(d => ({ type: d.type, filename: d.filename }))
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSubmitStatus({
          success: true,
          message: 'Onboarding request submitted successfully!',
          caseNumber: result.data?.caseNumber || result.data?.case?.caseNumber
        });
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitStatus({
        success: false,
        message: error.message || 'Failed to submit onboarding request'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Render vendor type selection
  const renderVendorTypeStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-6">Select Vendor Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendorTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => handleFieldChange('vendorType', type.value)}
              className={`p-6 border-2 rounded-lg text-left transition-all
                ${formData.vendorType === type.value 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'}`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${formData.vendorType === type.value ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Icon size={24} className={formData.vendorType === type.value ? 'text-blue-600' : 'text-gray-500'} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{type.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {errors.vendorType && (
        <p className="mt-4 text-red-500">{errors.vendorType}</p>
      )}
    </div>
  );
  
  // Render business info form
  const renderBusinessInfoStep = () => {
    const fields = formConfig?.fields || defaultFields;
    
    return (
      <div>
        <h2 className="text-xl font-semibold mb-6">Business Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {fields.map((field) => (
            <DynamicField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={handleFieldChange}
              errors={errors}
              isSearching={companySearchLoading}
            />
          ))}
        </div>
      </div>
    );
  };
  
  // Render documents step
  const renderDocumentsStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-2">Upload Documents</h2>
      <p className="text-gray-500 mb-6">
        Upload required documents. Our AI will automatically extract and verify information.
      </p>
      <DocumentUploader
        documents={documents}
        onUpload={handleDocumentUpload}
        onRemove={handleDocumentRemove}
        processingStatus={processingStatus}
      />
      {Object.keys(errors).length > 0 && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <p className="text-red-600 font-medium">Missing required documents:</p>
          <ul className="mt-2 text-sm text-red-500">
            {Object.values(errors).map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
  
  // Render review step
  const renderReviewStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-6">Review & Submit</h2>
      
      {submitStatus ? (
        <div className={`p-6 rounded-lg ${submitStatus.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center space-x-3">
            {submitStatus.success ? (
              <CheckCircle className="text-green-500" size={24} />
            ) : (
              <AlertTriangle className="text-red-500" size={24} />
            )}
            <div>
              <h3 className={`font-semibold ${submitStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                {submitStatus.message}
              </h3>
              {submitStatus.caseNumber && (
                <p className="text-sm text-green-600 mt-1">
                  Case Number: {submitStatus.caseNumber}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Summary */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="mr-2 text-blue-500" size={20} />
              Business Summary
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Legal Name</dt>
                <dd className="font-medium">{formData.legalName || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Vendor Type</dt>
                <dd className="font-medium capitalize">{formData.vendorType || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Country</dt>
                <dd className="font-medium">{formData.country || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Industry</dt>
                <dd className="font-medium capitalize">{formData.industry?.replace('_', ' ') || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Years in Business</dt>
                <dd className="font-medium">{formData.yearsInBusiness || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Annual Revenue</dt>
                <dd className="font-medium">
                  {formData.annualRevenue ? `$${parseInt(formData.annualRevenue).toLocaleString()}` : '-'}
                </dd>
              </div>
            </dl>
          </div>
          
          {/* Documents Summary */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="mr-2 text-blue-500" size={20} />
              Documents ({documents.length})
            </h3>
            <ul className="space-y-2">
              {documents.map((doc, idx) => (
                <li key={idx} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                  <span className="capitalize">{doc.type.replace('_', ' ')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full
                    ${processingStatus[doc.type] === 'verified' ? 'bg-green-100 text-green-600' :
                      processingStatus[doc.type] === 'processing' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'}`}>
                    {processingStatus[doc.type] || 'uploaded'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Risk Assessment */}
          <div className="lg:col-span-2">
            <RiskDisplay riskScore={riskScore} loading={loading} />
          </div>
        </div>
      )}
    </div>
  );
  
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderVendorTypeStep();
      case 1: return renderBusinessInfoStep();
      case 2: return renderDocumentsStep();
      case 3: return renderReviewStep();
      default: return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <UserPlus className="text-blue-500" size={28} />
            <h1 className="text-2xl font-bold text-gray-900">Vendor Onboarding</h1>
          </div>
          <p className="text-gray-500">
            Register as a new vendor. Our AI-powered system will process your information securely.
          </p>
        </div>
        
        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>
        
        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {renderCurrentStep()}
        </div>
        
        {/* Navigation Buttons */}
        {!submitStatus?.success && (
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`px-6 py-2 rounded-lg font-medium
                ${currentStep === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Back
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Clock className="animate-spin" size={18} />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorOnboarding;
