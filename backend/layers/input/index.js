/**
 * INPUT LAYER - Unified Vendor Command Center
 * 
 * This layer is responsible for gathering and centralizing all vendor-related data:
 * - Vendor profiles and contact information
 * - Invoices and payment records
 * - Compliance documents and certifications
 * - Contracts and agreements
 * - Performance metrics
 * 
 * Eliminates manual silos by providing unified data ingestion endpoints
 */

const VendorDataCollector = require('./VendorDataCollector');
const InvoiceProcessor = require('./InvoiceProcessor');
const ComplianceCollector = require('./ComplianceCollector');
const CertificationManager = require('./CertificationManager');
const PaymentTracker = require('./PaymentTracker');
const ContractIngestion = require('./ContractIngestion');

module.exports = {
  VendorDataCollector,
  InvoiceProcessor,
  ComplianceCollector,
  CertificationManager,
  PaymentTracker,
  ContractIngestion
};
