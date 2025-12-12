import { useState, useCallback, useEffect } from 'react';
import intelligentLayerService from '../services/intelligentLayerService';

const { ocr: ocrService, fraud: fraudService, nlp: nlpService } = intelligentLayerService;

const DocumentProcessor = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [documentType, setDocumentType] = useState('invoice');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Fetch uploaded documents
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const response = await fetch('http://localhost:5001/api/documents/test/list');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched documents:', data);
        setUploadedDocuments(data.data || data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const documentTypes = [
    { value: 'invoice', label: 'Invoice', icon: '🧾', description: 'Extract invoice data and detect fraud' },
    { value: 'certificate', label: 'Certificate', icon: '📜', description: 'Process compliance certificates' },
    { value: 'contract', label: 'Contract', icon: '📄', description: 'Analyze contract terms and risks' }
  ];

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setAnalysisResults(null);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setAnalysisResults(null);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const processDocument = async () => {
    if (!selectedFile) {
      setError('Please select a file to process');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setAnalysisResults(null);

    try {
      // First upload the file to backend
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);
      
      console.log('Uploading document to backend...');
      const uploadResponse = await fetch('http://localhost:5001/api/documents/test/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload document');
      }
      
      const uploadData = await uploadResponse.json();
      console.log('Document uploaded successfully:', uploadData);
      
      // Refresh the documents list
      fetchDocuments();
      
      // Try ML processing, but don't fail if it doesn't work
      let ocrResult = null;
      let mlProcessingFailed = false;

      try {
        switch (documentType) {
          case 'invoice':
            ocrResult = await ocrService.processInvoice(selectedFile);
            break;
          case 'certificate':
            ocrResult = await ocrService.processCertificate(selectedFile);
            break;
          case 'contract':
            ocrResult = await ocrService.processContract(selectedFile);
            break;
          default:
            throw new Error('Unknown document type');
        }
      } catch (mlError) {
        console.warn('ML processing not available, using basic info:', mlError);
        mlProcessingFailed = true;
      }

      // If ML processing worked, use that result
      if (ocrResult && ocrResult.success) {
        setResult(ocrResult);

        // Run additional analysis based on document type
        if (documentType === 'invoice' && ocrResult.data) {
          try {
            const fraudAnalysis = await fraudService.analyzeInvoice(ocrResult.data);
            setAnalysisResults({
              type: 'fraud',
              ...fraudAnalysis
            });
          } catch (e) {
            console.warn('Fraud analysis failed:', e);
          }
        }

        if (documentType === 'contract' && ocrResult.data?.extractedText) {
          try {
            const [riskAnalysis, sentimentAnalysis] = await Promise.all([
              nlpService.assessContractRisk(ocrResult.data.extractedText),
              nlpService.analyzeSentiment(ocrResult.data.extractedText)
            ]);
            setAnalysisResults({
              type: 'contract',
              risk: riskAnalysis,
              sentiment: sentimentAnalysis
            });
          } catch (e) {
            console.warn('Contract analysis failed:', e);
          }
        }
      } else if (mlProcessingFailed) {
        // Show basic document info if ML processing failed
        setResult({
          success: true,
          source: 'upload',
          data: {
            filename: uploadData.data?.filename || selectedFile.name,
            documentType: uploadData.data?.documentType || documentType,
            size: uploadData.data?.size || selectedFile.size,
            uploadedAt: uploadData.data?.uploadedAt || new Date().toISOString(),
            documentId: uploadData.data?.id,
            message: 'Document uploaded successfully. ML processing is currently unavailable.'
          }
        });
      }

    } catch (err) {
      console.error('Document processing error:', err);
      setError(err.message || 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  };

  const setDemoResult = () => {
    if (documentType === 'invoice') {
      setResult({
        success: true,
        data: {
          invoiceNumber: 'INV-2024-0156',
          vendorName: 'TechSupply Inc.',
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          totalAmount: 4500.00,
          taxAmount: 450.00,
          subtotal: 4050.00,
          items: [
            { description: 'IT Equipment', quantity: 5, unitPrice: 500, amount: 2500 },
            { description: 'Software License', quantity: 3, unitPrice: 350, amount: 1050 },
            { description: 'Support Services', quantity: 1, unitPrice: 500, amount: 500 }
          ],
          confidence: 0.92
        }
      });
      setAnalysisResults({
        type: 'fraud',
        success: true,
        anomaly_score: 0.15,
        risk_level: 'low',
        fraud_indicators: [],
        recommendations: [
          { priority: 'low', action: 'Standard processing recommended' }
        ]
      });
    } else if (documentType === 'certificate') {
      setResult({
        success: true,
        data: {
          certificateType: 'ISO 9001:2015',
          certificationBody: 'Bureau Veritas',
          issuedTo: 'TechSupply Inc.',
          issueDate: '2023-06-15',
          expiryDate: '2026-06-14',
          certificateNumber: 'CERT-2023-789456',
          scope: 'Quality Management System for IT Equipment Distribution',
          status: 'valid',
          confidence: 0.95
        }
      });
    } else if (documentType === 'contract') {
      setResult({
        success: true,
        data: {
          contractType: 'Master Service Agreement',
          parties: ['IVMS Corporation', 'TechSupply Inc.'],
          effectiveDate: '2024-01-01',
          terminationDate: '2026-12-31',
          totalValue: 500000,
          keyTerms: [
            'Payment terms: Net 30',
            'Delivery SLA: 5 business days',
            'Warranty: 12 months',
            'Auto-renewal: Yes, 1 year terms'
          ],
          extractedText: 'Sample contract text...',
          confidence: 0.88
        }
      });
      setAnalysisResults({
        type: 'contract',
        risk: {
          success: true,
          overall_risk_score: 0.35,
          risk_level: 'medium',
          risks: [
            { type: 'liability', severity: 'medium', description: 'Limited liability clause may need review' },
            { type: 'termination', severity: 'low', description: 'Standard termination provisions' }
          ]
        },
        sentiment: {
          success: true,
          polarity: 0.2,
          classification: 'neutral',
          confidence: 0.85
        }
      });
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const clearDocument = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setAnalysisResults(null);
    setError(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Document Processor</h1>
        <p className="text-gray-600 mt-1">AI-powered OCR and document analysis</p>
      </div>

      {/* Uploaded Documents List */}
      {uploadedDocuments.length > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Uploaded Documents ({uploadedDocuments.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedDocuments.map((doc) => (
              <div key={doc._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate" title={doc.filename}>
                      📄 {doc.filename}
                    </p>
                    <p className="text-xs text-gray-500 capitalize mt-1">{doc.documentType}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                    {doc.status}
                  </span>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1 mb-3">
                  <p className="flex items-center">
                    <span className="font-medium w-16">Size:</span>
                    <span>{(doc.size / 1024).toFixed(2)} KB</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium w-16">Uploaded:</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium w-16">Time:</span>
                    <span>{new Date(doc.createdAt).toLocaleTimeString()}</span>
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`http://localhost:5001/api/documents/${doc._id}/download`, '_blank')}
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={() => window.open(`http://localhost:5001/api/documents/${doc._id}/view`, '_blank')}
                    className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    👁️ View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-6">
          {/* Document Type Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {documentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setDocumentType(type.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    documentType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-3xl block mb-2">{type.icon}</span>
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
            
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                preview ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Document preview"
                    className="max-h-64 mx-auto rounded-lg shadow-md"
                  />
                  <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                  <button
                    onClick={clearDocument}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-4 text-gray-600">Drag and drop your document here, or</p>
                  <label className="mt-2 inline-block cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-800 font-medium">browse files</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="mt-2 text-xs text-gray-500">PNG, JPG, or PDF up to 10MB</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={processDocument}
              disabled={!selectedFile || processing}
              className={`w-full mt-6 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                !selectedFile || processing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Process Document
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Extracted Data */}
          {result && result.success && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {result.source === 'upload' ? 'Document Uploaded' : 'Extracted Data'}
                </h3>
                {result.data?.confidence && (
                  <span className="text-sm text-gray-500">
                    Confidence: {((result.data.confidence || 0) * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Basic upload info when ML is unavailable */}
              {result.source === 'upload' && result.data && (
                <div className="space-y-4">
                  {result.data.message && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">{result.data.message}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Filename</p>
                      <p className="font-semibold text-gray-900">{result.data.filename}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Document Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{result.data.documentType}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">File Size</p>
                      <p className="font-semibold text-gray-900">{(result.data.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Uploaded</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(result.data.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {result.data.documentId && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-xs text-green-700">Document ID</p>
                      <p className="font-mono text-sm text-green-900">{result.data.documentId}</p>
                    </div>
                  )}
                </div>
              )}

              {documentType === 'invoice' && result.data && result.source !== 'upload' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Invoice Number</p>
                      <p className="font-semibold text-gray-900">{result.data.invoiceNumber}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Vendor</p>
                      <p className="font-semibold text-gray-900">{result.data.vendorName}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Invoice Date</p>
                      <p className="font-semibold text-gray-900">{result.data.invoiceDate}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Due Date</p>
                      <p className="font-semibold text-gray-900">{result.data.dueDate}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Line Items</h4>
                    <div className="space-y-2">
                      {result.data.items?.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>{item.description}</span>
                          <span className="font-medium">${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${result.data.subtotal?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>${result.data.taxAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span>${result.data.totalAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {documentType === 'certificate' && result.data && result.source !== 'upload' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                    <span className="text-4xl">✓</span>
                    <p className="font-semibold text-green-800 mt-2">{result.data.status?.toUpperCase()}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Certificate Type</p>
                      <p className="font-semibold text-gray-900">{result.data.certificateType}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Certification Body</p>
                      <p className="font-semibold text-gray-900">{result.data.certificationBody}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Issued To</p>
                      <p className="font-semibold text-gray-900">{result.data.issuedTo}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Certificate Number</p>
                      <p className="font-semibold text-gray-900">{result.data.certificateNumber}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Issue Date</p>
                      <p className="font-semibold text-gray-900">{result.data.issueDate}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Expiry Date</p>
                      <p className="font-semibold text-gray-900">{result.data.expiryDate}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Scope</p>
                    <p className="text-gray-900">{result.data.scope}</p>
                  </div>
                </div>
              )}

              {documentType === 'contract' && result.data && result.source !== 'upload' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500">Contract Type</p>
                      <p className="font-semibold text-gray-900">{result.data.contractType}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Effective Date</p>
                      <p className="font-semibold text-gray-900">{result.data.effectiveDate}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Termination Date</p>
                      <p className="font-semibold text-gray-900">{result.data.terminationDate}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500">Total Contract Value</p>
                      <p className="font-semibold text-gray-900 text-xl">${result.data.totalValue?.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Parties</p>
                    {result.data.parties?.map((party, index) => (
                      <span key={index} className="inline-block mr-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {party}
                      </span>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">Key Terms</p>
                    <ul className="space-y-1">
                      {result.data.keyTerms?.map((term, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {term}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis Results */}
          {analysisResults && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {analysisResults.type === 'fraud' ? 'Fraud Analysis' : 'Contract Analysis'}
              </h3>

              {analysisResults.type === 'fraud' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm text-gray-500">Risk Level</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(analysisResults.risk_level)}`}>
                        {analysisResults.risk_level?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Anomaly Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {((analysisResults.anomaly_score || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {analysisResults.fraud_indicators?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Fraud Indicators</p>
                      <div className="space-y-2">
                        {analysisResults.fraud_indicators.map((indicator, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${getRiskColor(indicator.severity)}`}>
                            <p className="font-medium">{indicator.type}</p>
                            <p className="text-sm">{indicator.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResults.recommendations?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Recommendations</p>
                      <ul className="space-y-1">
                        {analysisResults.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start">
                            <span className={`mr-2 ${
                              rec.priority === 'critical' ? 'text-red-500' :
                              rec.priority === 'high' ? 'text-orange-500' :
                              rec.priority === 'medium' ? 'text-yellow-500' :
                              'text-blue-500'
                            }`}>•</span>
                            {rec.action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {analysisResults.type === 'contract' && (
                <div className="space-y-4">
                  {analysisResults.risk && (
                    <div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Contract Risk Level</p>
                          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(analysisResults.risk.risk_level)}`}>
                            {analysisResults.risk.risk_level?.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Risk Score</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {((analysisResults.risk.overall_risk_score || 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      {analysisResults.risk.risks?.length > 0 && (
                        <div className="space-y-2">
                          {analysisResults.risk.risks.map((risk, index) => (
                            <div key={index} className={`p-3 rounded-lg border ${getRiskColor(risk.severity)}`}>
                              <p className="font-medium capitalize">{risk.type}</p>
                              <p className="text-sm">{risk.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {analysisResults.sentiment && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Sentiment Analysis</p>
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">
                          {analysisResults.sentiment.classification === 'positive' ? '😊' :
                           analysisResults.sentiment.classification === 'negative' ? '😟' : '😐'}
                        </span>
                        <div>
                          <p className="font-medium capitalize">{analysisResults.sentiment.classification}</p>
                          <p className="text-sm text-gray-500">
                            Confidence: {((analysisResults.sentiment.confidence || 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No Results Placeholder */}
          {!result && !processing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Results Yet</h3>
              <p className="mt-2 text-gray-500">Upload a document and click "Process Document" to see the extracted data and analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentProcessor;
