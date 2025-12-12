const admin = require('firebase-admin');

// Initialize Firebase Admin with your project credentials
// For production, use service account JSON file
// For development, it will use Application Default Credentials

let firebaseApp;

try {
  // Initialize with minimal config (uses project ID from client config)
  firebaseApp = admin.initializeApp({
    projectId: 'intelligent-vms-and-scm'
  });
  
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('❌ Firebase Admin initialization error:', error.message);
  } else {
    firebaseApp = admin.app();
  }
}

const auth = admin.auth();

module.exports = {
  admin,
  auth,
  firebaseApp
};
