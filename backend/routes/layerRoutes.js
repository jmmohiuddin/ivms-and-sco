/**
 * Three-Layer API Routes
 * 
 * Routes connecting Input Layer, Intelligent Layer, and Output Layer
 * for the Unified Vendor Command Center
 */

const express = require('express');
const router = express.Router();
const { protect: auth, optionalAuth } = require('../middleware/firebaseAuth');

// Input Layer
const {
  VendorDataCollector,
  InvoiceProcessor,
  ComplianceCollector,
  CertificationManager,
  PaymentTracker,
  ContractIngestion
} = require('../layers/input');

// Intelligent Layer
const {
  OCRProcessor,
  NLPAnalyzer,
  FraudDetector,
  VendorScorer
} = require('../layers/intelligent');

// Output Layer
const {
  DashboardGenerator,
  AlertEngine,
  ReportGenerator,
  AnalyticsEngine
} = require('../layers/output');

// ============================================
// INPUT LAYER ROUTES
// ============================================

// Vendor Data Collection
router.post('/input/vendors', auth, async (req, res) => {
  try {
    const vendor = await VendorDataCollector.createVendorProfile(req.body);
    res.status(201).json(vendor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/input/vendors/:vendorId', auth, async (req, res) => {
  try {
    const vendor = await VendorDataCollector.updateVendorData(req.params.vendorId, req.body);
    res.json(vendor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/input/vendors/:vendorId/comprehensive', auth, async (req, res) => {
  try {
    const data = await VendorDataCollector.getComprehensiveVendorView(req.params.vendorId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Invoice Processing
router.post('/input/invoices', auth, async (req, res) => {
  try {
    const invoice = await InvoiceProcessor.processInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/input/invoices/vendor/:vendorId', auth, async (req, res) => {
  try {
    const invoices = await InvoiceProcessor.getInvoicesByVendor(req.params.vendorId);
    res.json(invoices);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/input/invoices/:invoiceId/status', auth, async (req, res) => {
  try {
    const invoice = await InvoiceProcessor.updateInvoiceStatus(
      req.params.invoiceId, 
      req.body.status, 
      req.user.id
    );
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Compliance Collection
router.post('/input/compliance', auth, async (req, res) => {
  try {
    const compliance = await ComplianceCollector.addComplianceRequirement(req.body);
    res.status(201).json(compliance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/input/compliance/:complianceId/status', auth, async (req, res) => {
  try {
    const compliance = await ComplianceCollector.updateComplianceStatus(
      req.params.complianceId,
      req.body.status,
      req.body.evidence
    );
    res.json(compliance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/input/compliance/expiring', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const expiring = await ComplianceCollector.getExpiringCompliance(days);
    res.json(expiring);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Certification Management
router.post('/input/certifications', auth, async (req, res) => {
  try {
    const certification = await CertificationManager.addCertification(req.body);
    res.status(201).json(certification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/input/certifications/expiring', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const expiring = await CertificationManager.getExpiringCertifications(days);
    res.json(expiring);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Payment Tracking
router.post('/input/payments', auth, async (req, res) => {
  try {
    const payment = await PaymentTracker.recordPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/input/payments/vendor/:vendorId/summary', auth, async (req, res) => {
  try {
    const summary = await PaymentTracker.getPaymentSummary(req.params.vendorId);
    res.json(summary);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Contract Ingestion
router.post('/input/contracts', auth, async (req, res) => {
  try {
    const contract = await ContractIngestion.ingestContract(req.body);
    res.status(201).json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/input/contracts/expiring', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const expiring = await ContractIngestion.getExpiringContracts(days);
    res.json(expiring);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// INTELLIGENT LAYER ROUTES
// ============================================

// OCR Processing
router.post('/intelligent/ocr/invoice', auth, async (req, res) => {
  try {
    const { imagePath } = req.body;
    const result = await OCRProcessor.processInvoice(imagePath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/intelligent/ocr/certificate', auth, async (req, res) => {
  try {
    const { imagePath } = req.body;
    const result = await OCRProcessor.extractCertificateData(imagePath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/intelligent/ocr/contract', auth, async (req, res) => {
  try {
    const { imagePath } = req.body;
    const result = await OCRProcessor.extractContractData(imagePath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// NLP Analysis
router.post('/intelligent/nlp/contract/:contractId', auth, async (req, res) => {
  try {
    const analysis = await NLPAnalyzer.analyzeContract(req.params.contractId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/intelligent/nlp/compliance/:complianceId', auth, async (req, res) => {
  try {
    const analysis = await NLPAnalyzer.analyzeComplianceDocument(req.params.complianceId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/intelligent/nlp/compare-contracts', auth, async (req, res) => {
  try {
    const { contractId1, contractId2 } = req.body;
    const comparison = await NLPAnalyzer.compareContracts(contractId1, contractId2);
    res.json(comparison);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fraud Detection
router.post('/intelligent/fraud/invoice/:invoiceId', auth, async (req, res) => {
  try {
    const analysis = await FraudDetector.analyzeInvoice(req.params.invoiceId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/intelligent/fraud/batch', auth, async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    const results = await FraudDetector.batchAnalyzeInvoices(invoiceIds);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/intelligent/fraud/statistics', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await FraudDetector.getFraudStatistics(startDate, endDate);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/intelligent/fraud/monitor', auth, async (req, res) => {
  try {
    const alerts = await FraudDetector.monitorTransactions();
    res.json(alerts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Vendor Scoring
router.post('/intelligent/scoring/vendor/:vendorId', auth, async (req, res) => {
  try {
    const scoreCard = await VendorScorer.calculateVendorScore(req.params.vendorId);
    res.json(scoreCard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/intelligent/scoring/compare', auth, async (req, res) => {
  try {
    const { vendorIds } = req.body;
    const comparison = await VendorScorer.compareVendors(vendorIds);
    res.json(comparison);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/intelligent/scoring/batch', auth, async (req, res) => {
  try {
    const { vendorIds } = req.body;
    const results = await VendorScorer.batchScoreVendors(vendorIds);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/intelligent/scoring/trends/:vendorId', auth, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const trends = await VendorScorer.getScoreTrends(req.params.vendorId, months);
    res.json(trends);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// OUTPUT LAYER ROUTES
// ============================================

// Dashboard Generation
router.get('/output/dashboard/executive', auth, async (req, res) => {
  try {
    const dashboard = await DashboardGenerator.getExecutiveDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/dashboard/vendor/:vendorId', auth, async (req, res) => {
  try {
    const dashboard = await DashboardGenerator.getVendorDashboard(req.params.vendorId);
    res.json(dashboard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/dashboard/risk', auth, async (req, res) => {
  try {
    const dashboard = await DashboardGenerator.getRiskDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Alert Engine
router.get('/output/alerts', auth, async (req, res) => {
  try {
    const alerts = await AlertEngine.runAlertChecks();
    res.json(alerts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/alerts/summary', auth, async (req, res) => {
  try {
    await AlertEngine.runAlertChecks();
    const summary = AlertEngine.getAlertSummary();
    res.json(summary);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/alerts/vendor/:vendorId', auth, async (req, res) => {
  try {
    await AlertEngine.runAlertChecks();
    const alerts = AlertEngine.getVendorAlerts(req.params.vendorId);
    res.json(alerts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/output/alerts/:alertId/acknowledge', auth, async (req, res) => {
  try {
    const alert = AlertEngine.acknowledgeAlert(req.params.alertId, req.user.id);
    res.json(alert);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/output/alerts/:alertId', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const alert = AlertEngine.dismissAlert(req.params.alertId, reason);
    res.json(alert);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Report Generation
router.get('/output/reports/executive-summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await ReportGenerator.generateExecutiveSummary({ startDate, endDate });
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/reports/vendor/:vendorId', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await ReportGenerator.generateVendorReport(
      req.params.vendorId, 
      { startDate, endDate }
    );
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/reports/compliance', auth, async (req, res) => {
  try {
    const { startDate, endDate, vendorId, framework } = req.query;
    const report = await ReportGenerator.generateComplianceReport({
      startDate, endDate, vendorId, framework
    });
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/reports/financial', auth, async (req, res) => {
  try {
    const { startDate, endDate, vendorId } = req.query;
    const report = await ReportGenerator.generateFinancialReport({
      startDate, endDate, vendorId
    });
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/reports/risk', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await ReportGenerator.generateRiskReport({ startDate, endDate });
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Analytics Engine
router.get('/output/analytics/spend', auth, async (req, res) => {
  try {
    const { startDate, endDate, vendorId, groupBy } = req.query;
    const analytics = await AnalyticsEngine.getSpendAnalytics({
      startDate, endDate, vendorId, groupBy
    });
    res.json(analytics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/analytics/vendors', auth, async (req, res) => {
  try {
    const analytics = await AnalyticsEngine.getVendorAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/analytics/compliance', auth, async (req, res) => {
  try {
    const analytics = await AnalyticsEngine.getComplianceAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/analytics/risk', auth, async (req, res) => {
  try {
    const analytics = await AnalyticsEngine.getRiskAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/output/analytics/kpi', auth, async (req, res) => {
  try {
    const kpis = await AnalyticsEngine.getKPIDashboard();
    res.json(kpis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
