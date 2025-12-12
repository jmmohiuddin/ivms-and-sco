/**
 * Firebase Authentication Helper for Testing
 * Creates test users and generates ID tokens for authenticated API testing
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: 'intelligent-vms-and-scm'
    });
    console.log('✅ Firebase Admin initialized for testing');
  } catch (error) {
    if (error.code !== 'app/duplicate-app') {
      console.error('❌ Firebase Admin initialization error:', error.message);
      throw error;
    }
  }
}

/**
 * Create a test user in Firebase Auth
 * @param {Object} userData - User data {email, password, displayName, role}
 * @returns {Promise<Object>} - {uid, email, customToken}
 */
async function createTestUser(userData = {}) {
  const {
    email = `test-${Date.now()}@ivms-test.com`,
    password = 'Test123!@#',
    displayName = 'Test User',
    role = 'procurement_manager'
  } = userData;

  try {
    // Check if user exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`✅ User already exists: ${email}`);
    } catch (error) {
      // Create new user
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: true
      });
      console.log(`✅ Created new Firebase user: ${email}`);
    }

    // Set custom claims (role)
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    console.log(`✅ Set custom claims: role=${role}`);

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid, { role });

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role,
      customToken,
      password // Return for reference
    };
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  }
}

/**
 * Get ID token from custom token (requires Firebase Client SDK)
 * For testing, we'll use the custom token directly or create a service to exchange it
 * @param {string} customToken - Firebase custom token
 * @returns {Promise<string>} - ID token
 */
async function getIdTokenFromCustomToken(customToken) {
  // Note: This requires Firebase Client SDK
  // For backend testing, we can use custom token or implement token exchange
  // For now, return the custom token (backend can verify it)
  return customToken;
}

/**
 * Generate test tokens for different user roles
 * @returns {Promise<Object>} - Tokens for admin, manager, vendor, auditor
 */
async function generateTestTokens() {
  console.log('\n🔐 Generating Firebase test tokens...\n');

  const users = {
    admin: await createTestUser({
      email: 'admin@ivms-test.com',
      password: 'Admin123!@#',
      displayName: 'Admin User',
      role: 'admin'
    }),
    manager: await createTestUser({
      email: 'manager@ivms-test.com',
      password: 'Manager123!@#',
      displayName: 'Procurement Manager',
      role: 'procurement_manager'
    }),
    vendor: await createTestUser({
      email: 'vendor@ivms-test.com',
      password: 'Vendor123!@#',
      displayName: 'Vendor User',
      role: 'vendor'
    }),
    auditor: await createTestUser({
      email: 'auditor@ivms-test.com',
      password: 'Auditor123!@#',
      displayName: 'Compliance Auditor',
      role: 'compliance_officer'
    })
  };

  console.log('\n📋 Test User Credentials:\n');
  Object.entries(users).forEach(([key, user]) => {
    console.log(`${key.toUpperCase()}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  UID: ${user.uid}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Custom Token: ${user.customToken.substring(0, 50)}...`);
    console.log('');
  });

  return users;
}

/**
 * Delete test user
 * @param {string} uid - User UID
 */
async function deleteTestUser(uid) {
  try {
    await admin.auth().deleteUser(uid);
    console.log(`✅ Deleted test user: ${uid}`);
  } catch (error) {
    console.error('❌ Error deleting test user:', error.message);
  }
}

/**
 * Clean up all test users
 */
async function cleanupTestUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers();
    const testUsers = listUsersResult.users.filter(user => 
      user.email && user.email.includes('ivms-test.com')
    );

    for (const user of testUsers) {
      await deleteTestUser(user.uid);
    }

    console.log(`✅ Cleaned up ${testUsers.length} test users`);
  } catch (error) {
    console.error('❌ Error cleaning up test users:', error.message);
  }
}

/**
 * Verify a token is valid
 * @param {string} token - ID token or custom token
 * @returns {Promise<Object>} - Decoded token
 */
async function verifyToken(token) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'generate':
          await generateTestTokens();
          break;
        
        case 'cleanup':
          await cleanupTestUsers();
          break;
        
        case 'create':
          const email = process.argv[3];
          const role = process.argv[4] || 'procurement_manager';
          const user = await createTestUser({ email, role });
          console.log('User created:', user);
          break;
        
        default:
          console.log('Usage:');
          console.log('  node firebase-auth-helper.js generate    - Generate all test users');
          console.log('  node firebase-auth-helper.js cleanup     - Delete all test users');
          console.log('  node firebase-auth-helper.js create <email> <role> - Create specific user');
      }
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  createTestUser,
  getIdTokenFromCustomToken,
  generateTestTokens,
  deleteTestUser,
  cleanupTestUsers,
  verifyToken
};
