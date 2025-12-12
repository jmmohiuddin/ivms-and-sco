const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/documents', 'uploads/temp', 'uploads/bulk'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, '..', 'uploads');
    
    // Route-specific directories
    if (req.baseUrl.includes('onboarding')) {
      uploadPath = path.join(uploadPath, 'documents');
    } else if (req.baseUrl.includes('bulk')) {
      uploadPath = path.join(uploadPath, 'bulk');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  // Allowed mime types
  const allowedMimes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/tiff',
    'image/bmp',
    'image/webp',
    // CSV for bulk uploads
    'text/csv',
    'text/plain'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: PDF, Word, Excel, Images, CSV`), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Max 10 files per request
  }
});

// Export configured multer instance
module.exports = upload;

// Additional helper for multiple file uploads
module.exports.uploadMultiple = upload.array('documents', 10);

// Helper for invoice documents
module.exports.documents = upload.single('invoice');

// Helper for bulk uploads
module.exports.bulkUpload = upload.single('file');

// Helper for specific document types
module.exports.uploadDocuments = upload.fields([
  { name: 'business_registration', maxCount: 1 },
  { name: 'tax_certificate', maxCount: 1 },
  { name: 'bank_statement', maxCount: 1 },
  { name: 'insurance_certificate', maxCount: 1 },
  { name: 'contract', maxCount: 1 },
  { name: 'id_document', maxCount: 2 },
  { name: 'other', maxCount: 5 }
]);
