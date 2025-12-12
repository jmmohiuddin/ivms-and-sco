/**
 * INTELLIGENT LAYER - Unified Vendor Command Center
 * 
 * This layer provides AI/ML-powered analysis:
 * - OCR for document validation
 * - NLP for contract analysis
 * - ML models for fraud detection
 * - Vendor scoring and risk assessment
 */

const OCRProcessor = require('./OCRProcessor');
const NLPAnalyzer = require('./NLPAnalyzer');
const FraudDetector = require('./FraudDetector');
const VendorScorer = require('./VendorScorer');
const RiskAssessment = require('./RiskAssessment');
const AnomalyDetector = require('./AnomalyDetector');

module.exports = {
  OCRProcessor,
  NLPAnalyzer,
  FraudDetector,
  VendorScorer,
  RiskAssessment,
  AnomalyDetector
};
