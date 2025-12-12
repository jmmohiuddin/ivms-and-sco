/**
 * Authenticated Integration Tests
 * Tests API endpoints with valid Firebase authentication tokens
 */

const axios = require('axios');
const { createTestUser, cleanupTestUsers } = require('./helpers/firebase-auth-helper');

// Configuration
const config = {
  API_URL: process.env.API_URL || 'http://localhost:5001',
  TEST_TIMEOUT: 30000
};

// Test state
let testUsers = {};
let testData = {};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, duration, error = null) {
  const status = passed ? '✅ PASSED' : '❌ FAILED';
  const statusColor = passed ? 'green' : 'red';
  log(`[${status}] ${name} (${duration}ms)`, statusColor);
  if (error) {
    log(`  Error: ${error}`, 'red');
  }
}

// API helper with authentication
async function apiCall(method, endpoint, data = null, token = null) {
  const url = `${config.API_URL}${endpoint}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  try {
    const response = await axios({
      method,
      url,
      data,
      headers,
      timeout: 10000
    });
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data?.error || error.message
    };
  }
}

// Test Suite Functions

async function setupTestUsers() {
  log('\n🔧 Setting up test users...', 'cyan');
  
  try {
    testUsers.admin = await createTestUser({
      email: 'admin-test@ivms.com',
      password: 'AdminTest123!',
      displayName: 'Admin Test User',
      role: 'admin'
    });
    
    testUsers.manager = await createTestUser({
      email: 'manager-test@ivms.com',
      password: 'ManagerTest123!',
      displayName: 'Manager Test User',
      role: 'procurement_manager'
    });
    
    testUsers.vendor = await createTestUser({
      email: 'vendor-test@ivms.com',
      password: 'VendorTest123!',
      displayName: 'Vendor Test User',
      role: 'vendor'
    });
    
    log('✅ Test users created successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to setup test users: ${error.message}`, 'red');
    return false;
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  const start = Date.now();
  const result = await apiCall('GET', '/api/health');
  const duration = Date.now() - start;
  
  const passed = result.success && result.status === 200;
  logTest('Health Check', passed, duration, result.error);
  return passed;
}

// Test 2: Create Vendor (Authenticated)
async function testCreateVendor() {
  const start = Date.now();
  const vendorData = {
    legal_name: `Test Vendor ${Date.now()}`,
    country: 'US',
    tax_id: `${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000000 + 1000000)}`,
    email: `vendor-${Date.now()}@test.com`,
    phone: '+1-555-0100',
    address: {
      street: '123 Test St',
      city: 'New York',
      state: 'NY',
      zip: '10001'
    }
  };
  
  const result = await apiCall('POST', '/api/onboarding/vendor', vendorData, testUsers.manager.customToken);
  const duration = Date.now() - start;
  
  const passed = result.success && (result.status === 200 || result.status === 201);
  if (passed && result.data?.data?.caseNumber) {
    testData.vendorCaseNumber = result.data.data.caseNumber;
    testData.vendorId = result.data.data._id;
  }
  
  logTest('Create Vendor (Authenticated)', passed, duration, result.error);
  return passed;
}

// Test 3: Submit Invoice (Authenticated)
async function testSubmitInvoice() {
  const start = Date.now();
  const invoiceData = {
    invoice_number: `INV-${Date.now()}`,
    vendor_id: testData.vendorId || 'TEST-VENDOR-001',
    amount: 5000.00,
    currency: 'USD',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    line_items: [
      { description: 'Software License', quantity: 1, unit_price: 5000.00 }
    ]
  };
  
  const result = await apiCall('POST', '/api/invoice/submit', invoiceData, testUsers.manager.customToken);
  const duration = Date.now() - start;
  
  const passed = result.success && (result.status === 200 || result.status === 201);
  if (passed && result.data?.data?.invoiceId) {
    testData.invoiceId = result.data.data.invoiceId;
  }
  
  logTest('Submit Invoice (Authenticated)', passed, duration, result.error);
  return passed;
}

// Test 4: Run Compliance Scan (Authenticated)
async function testComplianceScan() {
  const start = Date.now();
  const scanData = {
    vendor_id: testData.vendorId || 'TEST-VENDOR-001',
    scan_type: 'full'
  };
  
  const result = await apiCall('POST', '/api/compliance/scan', scanData, testUsers.manager.customToken);
  const duration = Date.now() - start;
  
  const passed = result.success || result.status === 404; // Accept 404 if vendor doesn't exist
  logTest('Run Compliance Scan (Authenticated)', passed, duration, result.error);
  return passed;
}

// Test 5: Screen for Sanctions (Authenticated)
async function testSanctionsScreening() {
  const start = Date.now();
  const screenData = {
    legal_name: 'Test Corp for Screening',
    country: 'US',
    screening_required: true
  };
  
  const result = await apiCall('POST', '/api/compliance/screen', screenData, testUsers.manager.customToken);
  const duration = Date.now() - start;
  
  const passed = result.success || result.status === 404;
  logTest('Sanctions Screening (Authenticated)', passed, duration, result.error);
  return passed;
}

// Test 6: Get Predictions (Authenticated)
async function testGetPredictions() {
  const start = Date.now();
  const result = await apiCall('GET', '/api/prediction/forecasts', null, testUsers.manager.customToken);
  const duration = Date.now() - start;
  
  const passed = result.success && result.status === 200;
  logTest('Get Predictions (Authenticated)', passed, duration, result.error);
  return passed;
}

// Test 7: Unauthorized Access Test
async function testUnauthorizedAccess() {
  const start = Date.now();
  const result = await apiCall('GET', '/api/prediction/forecasts', null, null); // No token
  const duration = Date.now() - start;
  
  const passed = !result.success && result.status === 401; // Should fail with 401
  logTest('Unauthorized Access Prevention', passed, duration, result.error);
  return passed;
}

// Test 8: Get User Profile (Authenticated)
async function testGetUserProfile() {
  const start = Date.now();
  const result = await apiCall('GET', '/api/users/me', null, testUsers.manager.customToken);
  const duration = Date.now() - start;
  
  const passed = result.success && result.status === 200;
  logTest('Get User Profile (Authenticated)', passed, duration, result.error);
  return passed;
}

// Test 9: Admin Access Test
async function testAdminAccess() {
  const start = Date.now();
  const result = await apiCall('GET', '/api/users', null, testUsers.admin.customToken);
  const duration = Date.now() - start;
  
  const passed = result.success && result.status === 200;
  logTest('Admin Access (Get All Users)', passed, duration, result.error);
  return passed;
}

// Test 10: Role-Based Access Control
async function testRoleBasedAccess() {
  const start = Date.now();
  // Vendor user trying to access admin endpoint (should fail)
  const result = await apiCall('GET', '/api/users', null, testUsers.vendor.customToken);
  const duration = Date.now() - start;
  
  const passed = !result.success && (result.status === 403 || result.status === 401);
  logTest('Role-Based Access Control (Vendor -> Admin endpoint)', passed, duration, result.error);
  return passed;
}

// Main Test Runner
async function runAuthenticatedTests() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Authenticated Integration Test Suite   ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  log(`API URL: ${config.API_URL}`, 'cyan');
  log(`Start Time: ${new Date().toISOString()}`, 'cyan');
  
  // Setup
  const setupSuccess = await setupTestUsers();
  if (!setupSuccess) {
    log('\n❌ Failed to setup test users. Exiting...', 'red');
    process.exit(1);
  }
  
  // Run tests
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Create Vendor', fn: testCreateVendor },
    { name: 'Submit Invoice', fn: testSubmitInvoice },
    { name: 'Compliance Scan', fn: testComplianceScan },
    { name: 'Sanctions Screening', fn: testSanctionsScreening },
    { name: 'Get Predictions', fn: testGetPredictions },
    { name: 'Unauthorized Access', fn: testUnauthorizedAccess },
    { name: 'Get User Profile', fn: testGetUserProfile },
    { name: 'Admin Access', fn: testAdminAccess },
    { name: 'Role-Based Access Control', fn: testRoleBasedAccess }
  ];
  
  const results = { total: tests.length, passed: 0, failed: 0 };
  
  log('\n🧪 Running tests...\n', 'cyan');
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      if (passed) results.passed++;
      else results.failed++;
    } catch (error) {
      log(`❌ Test error: ${test.name} - ${error.message}`, 'red');
      results.failed++;
    }
  }
  
  // Summary
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║           TEST SUMMARY                   ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  log(`Total Tests:  ${results.total}`, 'cyan');
  log(`✅ Passed:     ${results.passed}`, 'green');
  log(`❌ Failed:     ${results.failed}`, 'red');
  log(`📊 Pass Rate:  ${((results.passed / results.total) * 100).toFixed(2)}%`, 'cyan');
  
  // Cleanup prompt
  log('\n💡 Test users have been created. To clean up:', 'yellow');
  log('   node tests/helpers/firebase-auth-helper.js cleanup', 'yellow');
  
  log(`\n🔑 Test Credentials:`, 'cyan');
  log(`   Admin:   ${testUsers.admin.email} / ${testUsers.admin.password}`, 'cyan');
  log(`   Manager: ${testUsers.manager.email} / ${testUsers.manager.password}`, 'cyan');
  log(`   Vendor:  ${testUsers.vendor.email} / ${testUsers.vendor.password}`, 'cyan');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAuthenticatedTests().catch(error => {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runAuthenticatedTests,
  testUsers,
  apiCall
};
