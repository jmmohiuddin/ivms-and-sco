/**
 * Output Layer
 * 
 * Produces dashboards, predictive alerts, and audit-ready reports:
 * - Dashboard data aggregation
 * - Predictive alert generation
 * - Audit report generation
 * - Real-time visibility into performance and risk
 */

const DashboardGenerator = require('./DashboardGenerator');
const AlertEngine = require('./AlertEngine');
const ReportGenerator = require('./ReportGenerator');
const AnalyticsEngine = require('./AnalyticsEngine');

module.exports = {
  DashboardGenerator,
  AlertEngine,
  ReportGenerator,
  AnalyticsEngine
};
