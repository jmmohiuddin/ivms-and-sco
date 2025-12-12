/**
 * Document Controller
 * Handles document upload, storage, and retrieval
 */

const Document = require('../models/Document');

/**
 * @desc    Upload document
 * @route   POST /api/documents/upload
 * @access  Private
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const { vendorId, invoiceId, documentType, description } = req.body;

    // Create document record
    const document = await Document.create({
      filename: originalname,
      mimetype,
      size,
      fileData: buffer, // Store file in MongoDB (for small files)
      uploadedBy: req.user?.id || null,
      vendorId,
      invoiceId,
      documentType: documentType || 'other',
      description,
      status: 'uploaded'
    });

    res.status(201).json({
      success: true,
      data: {
        id: document._id,
        filename: document.filename,
        mimetype: document.mimetype,
        size: document.size,
        documentType: document.documentType,
        uploadedAt: document.createdAt
      },
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all documents
 * @route   GET /api/documents
 * @access  Private
 */
exports.getDocuments = async (req, res, next) => {
  try {
    const { vendorId, invoiceId, documentType, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (vendorId) filter.vendorId = vendorId;
    if (invoiceId) filter.invoiceId = invoiceId;
    if (documentType) filter.documentType = documentType;

    const documents = await Document.find(filter)
      .select('-fileData') // Exclude file data from list
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    const total = await Document.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: documents.length,
      total,
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document by ID
 * @route   GET /api/documents/:id
 * @access  Private
 */
exports.getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Return file data for download
    res.set({
      'Content-Type': document.mimetype,
      'Content-Disposition': `attachment; filename="${document.filename}"`,
      'Content-Length': document.size
    });

    res.send(document.fileData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download document
 * @route   GET /api/documents/:id/download
 * @access  Public - FOR TESTING
 */
exports.downloadDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Return file data for download
    res.set({
      'Content-Type': document.mimetype,
      'Content-Disposition': `attachment; filename="${document.filename}"`,
      'Content-Length': document.size
    });

    res.send(document.fileData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    View document in browser
 * @route   GET /api/documents/:id/view
 * @access  Public - FOR TESTING
 */
exports.viewDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Return file data for inline viewing
    res.set({
      'Content-Type': document.mimetype,
      'Content-Disposition': `inline; filename="${document.filename}"`,
      'Content-Length': document.size
    });

    res.send(document.fileData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete document
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
