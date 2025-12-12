import { useState } from 'react';
import { 
  FiCheck, FiUpload, FiAlertCircle, FiCheckCircle, FiClock,
  FiFileText, FiUser, FiDollarSign, FiShield, FiArrowRight
} from 'react-icons/fi';

const VendorOnboardingPortal = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    country: 'US',
    address: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    phone: '',
    bankAccount: '',
    routingNumber: ''
  });
  const [autoFilled, setAutoFilled] = useState(false);
  const [documents, setDocuments] = useState({});
  const [editingDoc, setEditingDoc] = useState(null);
  const [complianceDocs, setComplianceDocs] = useState({});
  const [editedData, setEditedData] = useState({});

  const steps = [
    { id: 1, title: 'Company Info', icon: FiUser, description: 'Tell us who you are' },
    { id: 2, title: 'Verify Identity', icon: FiFileText, description: 'Documents & verification' },
    { id: 3, title: 'Bank Details', icon: FiDollarSign, description: 'Payment information' },
    { id: 4, title: 'Compliance', icon: FiShield, description: 'Requirements & certifications' },
    { id: 5, title: 'Review', icon: FiCheckCircle, description: 'Final checks' }
  ];

  const handleCompanyNameChange = (value) => {
    setFormData({ ...formData, companyName: value });
    
    // Simulate AI auto-fill
    if (value.length > 3 && !autoFilled) {
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          taxId: '12-3456789',
          address: '123 Tech Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          email: value.toLowerCase().replace(/\s/g, '') + '@company.com',
          phone: '+1 (555) 123-4567'
        }));
        setAutoFilled(true);
      }, 1500);
    }
  };

  const handleFileUpload = async (docType, file) => {
    if (!file) return;
    
    console.log('Starting file upload:', docType, file.name);
    
    // Set initial uploading state
    setDocuments(prev => ({ 
      ...prev, 
      [docType]: { 
        file, 
        fileName: file.name,
        fileSize: file.size,
        status: 'uploading' 
      } 
    }));
    
    try {
      // Map frontend document types to backend enum values
      const docTypeMapping = {
        'registration': 'certificate',
        'tax': 'tax',
        'insurance': 'certificate'
      };
      
      const mappedType = docTypeMapping[docType] || 'other';
      console.log('Mapped document type:', docType, '->', mappedType);
      
      // Upload file to backend
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);
      formDataToUpload.append('documentType', mappedType);
      
      console.log('Uploading to backend...');
      const response = await fetch('http://localhost:5001/api/documents/test/upload', {
        method: 'POST',
        body: formDataToUpload
      });
      
      console.log('Upload response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        
        // Update with backend response and simulated extraction
        setDocuments(prev => ({
          ...prev,
          [docType]: {
            file,
            fileName: file.name,
            fileSize: file.size,
            status: 'verified',
            confidence: 0.94,
            documentId: data?.data?.id || data?.document?._id,
            extracted: {
              'Document Type': 'Business Registration',
              'Registration Number': 'REG-2024-12345',
              'Legal Name': formData.companyName || 'N/A',
              'Issue Date': '2024-01-15'
            }
          }
        }));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload failed:', errorData);
        throw new Error(errorData.message || 'Upload failed');
      }
    } catch (error) {
      console.error('File upload error:', error);
      setDocuments(prev => ({
        ...prev,
        [docType]: {
          file,
          fileName: file?.name || 'Unknown',
          fileSize: file?.size || 0,
          status: 'failed',
          error: error?.message || 'Upload failed. Please try again.'
        }
      }));
    }
  };

  const handleEditExtractedData = (docType) => {
    setEditingDoc(docType);
    setEditedData(documents[docType]?.extracted || {});
  };

  const handleSaveEditedData = (docType) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        extracted: editedData
      }
    }));
    setEditingDoc(null);
    setEditedData({});
  };

  const handleComplianceUpload = (reqTitle, file) => {
    setComplianceDocs(prev => ({
      ...prev,
      [reqTitle]: { file, status: 'uploading', name: file.name }
    }));
    
    // Simulate upload and verification
    setTimeout(() => {
      setComplianceDocs(prev => ({
        ...prev,
        [reqTitle]: {
          ...prev[reqTitle],
          status: 'verified',
          uploadedAt: new Date().toISOString()
        }
      }));
    }, 1500);
  };

  const handleSubmit = async () => {
    try {
      // Prepare vendor data from form
      const vendorData = {
        vendorType: 'supplier',
        legalName: formData.companyName,
        registrationNumber: formData.taxId,
        country: formData.country,
        address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        bankAccount: formData.bankAccount,
        routingNumber: formData.routingNumber,
        industry: 'general',
        yearsInBusiness: 1,
        annualRevenue: 100000,
        employeeCount: 10
      };

      // Prepare documents array
      const documentsArray = Object.entries(documents).map(([type, doc]) => ({
        type,
        fileName: doc.file?.name || 'document',
        extractedData: doc.extracted || {},
        status: doc.status
      }));

      const response = await fetch('http://localhost:5001/api/onboarding/vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendorData,
          documents: documentsArray
        })
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json();
      
      // Show success message
      alert(`✅ Application submitted successfully!\n\nCase Number: ${result.caseNumber || 'Pending'}\n\nYou will receive an email confirmation shortly.`);
      
      // Reset form
      setCurrentStep(1);
      setFormData({
        companyName: '',
        taxId: '',
        country: 'US',
        address: '',
        city: '',
        state: '',
        zip: '',
        email: '',
        phone: '',
        bankAccount: '',
        routingNumber: ''
      });
      setDocuments({});
      setComplianceDocs({});
      setAutoFilled(false);
      
    } catch (error) {
      console.error('Submission error:', error);
      alert('❌ Failed to submit application. Please try again.');
    }
  };

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {autoFilled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                <FiCheckCircle className="text-green-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-900 mb-1">
                    AI Auto-fill Complete
                  </h4>
                  <p className="text-sm text-green-700">
                    Based on your registration document, we prefilled:
                    <span className="font-medium"> Legal Name, Tax ID, Address, Registration Number</span>
                  </p>
                  <p className="text-xs text-green-600 mt-2">Review below and make any corrections →</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Legal Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID / EIN *
                  {autoFilled && <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>}
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="12-3456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="UK">United Kingdom</option>
                  <option value="DE">Germany</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                  {autoFilled && <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State/Province *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code *</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                  {autoFilled && <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                  {autoFilled && <span className="ml-2 text-xs text-green-600">✓ Auto-filled</span>}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Smart Document Processing</h4>
              <p className="text-sm text-blue-700">
                Upload your documents and our AI will automatically extract all required information. 
                You can review and edit anything before submission.
              </p>
            </div>

            {['registration', 'tax', 'insurance'].map((docType) => {
              const doc = documents[docType];
              const titles = {
                registration: 'Business Registration',
                tax: 'Tax Certificate',
                insurance: 'Insurance Certificate'
              };

              return (
                <div key={docType} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{titles[docType]}</h4>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG • Max 10MB</p>
                    </div>
                    {doc?.status === 'verified' && (
                      <span className="flex items-center text-xs font-medium text-green-600">
                        <FiCheckCircle className="mr-1" size={14} />
                        Verified ({Math.round(doc.confidence * 100)}%)
                      </span>
                    )}
                  </div>

                  {!doc ? (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                      <FiUpload size={32} className="text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-700">Upload {titles[docType]}</span>
                      <span className="text-xs text-gray-500 mt-1">or drag and drop</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(docType, e.target.files[0])}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </label>
                  ) : (doc.status === 'uploading' || doc.status === 'processing') ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-sm text-gray-600">
                        {doc.status === 'uploading' ? 'Uploading document...' : 'AI is extracting information...'}
                      </p>
                    </div>
                  ) : doc.status === 'failed' ? (
                    <div className="bg-red-50 rounded-lg p-8 text-center">
                      <p className="text-sm text-red-600 mb-2">{doc.error || 'Upload failed'}</p>
                      <label className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg cursor-pointer hover:bg-red-700">
                        <FiUpload size={16} className="mr-2" />
                        Try Again
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileUpload(docType, e.target.files[0])}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="bg-green-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{doc.fileName || doc.file?.name || 'Uploaded Document'}</span>
                        <span className="text-xs text-green-600">{Math.round(doc.confidence * 100)}% confidence</span>
                      </div>
                      {editingDoc === docType ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(editedData).map(([key, value]) => (
                              <div key={key} className="bg-white rounded p-2">
                                <label className="text-xs text-gray-500 block mb-1">{key}</label>
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => setEditedData({ ...editedData, [key]: e.target.value })}
                                  className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleSaveEditedData(docType)}
                              className="text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded font-medium"
                            >
                              Save Changes
                            </button>
                            <button 
                              onClick={() => setEditingDoc(null)}
                              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(doc.extracted).map(([key, value]) => (
                              <div key={key} className="bg-white rounded p-2">
                                <p className="text-xs text-gray-500">{key}</p>
                                <p className="text-sm font-medium text-gray-900">{value}</p>
                              </div>
                            ))}
                          </div>
                          <button 
                            onClick={() => handleEditExtractedData(docType)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Edit extracted data →
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
              <FiDollarSign className="text-blue-600 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Secure Payment Setup</h4>
                <p className="text-sm text-blue-700">
                  Your bank details are encrypted and stored securely. We'll verify your account instantly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  placeholder="••••••••1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Routing Number *
                </label>
                <input
                  type="text"
                  value={formData.routingNumber}
                  onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                  placeholder="123456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {formData.bankAccount && formData.routingNumber && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                <FiCheckCircle className="text-green-600" size={20} />
                <div>
                  <h4 className="text-sm font-medium text-green-900">Bank Account Verified</h4>
                  <p className="text-sm text-green-700">Chase Bank • Account ending in 1234</p>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">Required Compliance Documents</h4>
              <p className="text-sm text-yellow-700">
                Based on your location and industry, you need to provide:
              </p>
            </div>

            <div className="space-y-4">
              {[
                { title: 'ISO 9001 Certificate', required: true, expires: '2025-12-31' },
                { title: 'W-9 Form', required: true, expires: null },
                { title: 'Liability Insurance', required: true, expires: '2025-06-15' }
              ].map((req, index) => {
                const uploaded = complianceDocs[req.title];
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{req.title}</h4>
                          {req.required && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Required</span>
                          )}
                          {uploaded?.status === 'verified' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                              <FiCheckCircle size={12} className="mr-1" /> Verified
                            </span>
                          )}
                        </div>
                        {req.expires && (
                          <p className="text-xs text-gray-500 mt-1">Expires: {req.expires}</p>
                        )}
                        {uploaded && (
                          <p className="text-xs text-gray-600 mt-2 flex items-center">
                            <FiFileText size={12} className="mr-1" />
                            {uploaded.name}
                          </p>
                        )}
                      </div>
                      {uploaded?.status === 'uploading' ? (
                        <div className="flex items-center space-x-2 text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-xs">Uploading...</span>
                        </div>
                      ) : uploaded?.status === 'verified' ? (
                        <button
                          onClick={() => setComplianceDocs(prev => ({ ...prev, [req.title]: undefined }))}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      ) : (
                        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                          Upload
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => e.target.files[0] && handleComplianceUpload(req.title, e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <FiCheckCircle className="text-green-600 mx-auto mb-3" size={48} />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Ready to Submit!</h3>
              <p className="text-sm text-green-700">
                All required information has been provided and verified. Your application will be reviewed within 24-48 hours.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Application Summary</h4>
              <div className="space-y-3">
                {[
                  { label: 'Company Name', value: formData.companyName, status: 'complete' },
                  { label: 'Documents', value: '3 uploaded, all verified', status: 'complete' },
                  { label: 'Bank Details', value: 'Verified', status: 'complete' },
                  { label: 'Compliance', value: '3 certificates provided', status: 'complete' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <FiCheckCircle className="text-green-600" size={18} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.value}</p>
                      </div>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Complete</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Submit Application</span>
              <FiArrowRight size={18} />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Onboarding</h1>
          <p className="text-gray-600">Fast, simple, AI-powered registration</p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left: Progress Tracker */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Progress</h3>
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isComplete = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  
                  return (
                    <div key={step.id} className="relative">
                      {index < steps.length - 1 && (
                        <div className={`absolute left-4 top-10 w-0.5 h-8 ${
                          isComplete ? 'bg-green-500' : 'bg-gray-200'
                        }`}></div>
                      )}
                      <div className={`flex items-start space-x-3 ${isCurrent ? 'opacity-100' : 'opacity-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isComplete ? 'bg-green-500 text-white' :
                          isCurrent ? 'bg-blue-600 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {isComplete ? <FiCheck size={16} /> : <Icon size={16} />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-600'}`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-gray-500">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completion</span>
                  <span className="font-medium text-gray-900">{Math.round((currentStep / steps.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form Content */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{steps[currentStep - 1].title}</h2>
                <p className="text-gray-600">{steps[currentStep - 1].description}</p>
              </div>

              {renderStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FiClock size={16} />
                <span>Step {currentStep} of {steps.length}</span>
              </div>

              <button
                onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                disabled={currentStep === steps.length}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <span>{currentStep === steps.length ? 'Complete' : 'Continue'}</span>
                <FiArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorOnboardingPortal;
