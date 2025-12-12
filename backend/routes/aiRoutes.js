const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/firebaseAuth');

/**
 * @route   POST /api/ai/extract
 * @desc    Extract data from document using AI
 * @access  Private
 */
router.post('/extract', protect, aiController.extractData);

/**
 * @route   POST /api/ai/analyze
 * @desc    Analyze text content using AI
 * @access  Private
 */
router.post('/analyze', protect, aiController.analyzeText);

/**
 * @route   POST /api/ai/predict-risk
 * @desc    Predict vendor risk using AI
 * @access  Private
 */
router.post('/predict-risk', protect, aiController.predictRisk);

/**
 * @route   POST /api/ai/classify
 * @desc    Classify document type using AI
 * @access  Private
 */
router.post('/classify', protect, aiController.classifyDocument);

/**
 * @route   POST /api/ai/test/predict-risk
 * @desc    Test vendor risk prediction (no auth required)
 * @access  Public - FOR TESTING ONLY
 */
router.post('/test/predict-risk', aiController.predictRisk);

/**
 * @route   POST /api/ai/test/extract
 * @desc    Test document extraction (no auth required)
 * @access  Public - FOR TESTING ONLY
 */
router.post('/test/extract', aiController.extractData);

module.exports = router;
