const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/firebaseAuth');
const multer = require('multer');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept common document types
    const allowedTypes = /pdf|doc|docx|xls|xlsx|csv|txt|png|jpg|jpeg|plain/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'));
    }
  }
});

/**
 * @route   POST /api/documents/upload
 * @desc    Upload document
 * @access  Private
 */
router.post('/upload', protect, upload.single('file'), documentController.uploadDocument);

/**
 * @route   POST /api/documents/test/upload
 * @desc    Upload document (test - no auth)
 * @access  Public - FOR TESTING ONLY
 */
router.post('/test/upload', upload.single('file'), documentController.uploadDocument);

/**
 * @route   GET /api/documents/test/list
 * @desc    Get all documents (test - no auth)
 * @access  Public - FOR TESTING ONLY
 */
router.get('/test/list', documentController.getDocuments);

/**
 * @route   GET /api/documents
 * @desc    Get all documents
 * @access  Private
 */
router.get('/', protect, documentController.getDocuments);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download document file
 * @access  Public - FOR TESTING
 */
router.get('/:id/download', documentController.downloadDocument);

/**
 * @route   GET /api/documents/:id/view
 * @desc    View document file in browser
 * @access  Public - FOR TESTING
 */
router.get('/:id/view', documentController.viewDocument);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document by ID
 * @access  Private
 */
router.get('/:id', protect, documentController.getDocumentById);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document
 * @access  Private
 */
router.delete('/:id', protect, documentController.deleteDocument);

module.exports = router;
