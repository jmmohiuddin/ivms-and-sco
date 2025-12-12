const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow configured origin
    const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    if (origin === allowedOrigin) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/userRoutes'));
app.use('/api/vendors', require('./routes/vendorRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/supply-chain', require('./routes/supplyChainRoutes'));
app.use('/api/optimization', require('./routes/optimizationRoutes'));

// Three-Layer Architecture Routes (Unified Vendor Command Center)
app.use('/api/layers', require('./routes/layerRoutes'));

// AI-Driven Onboarding Routes
app.use('/api/onboarding', require('./routes/onboardingRoutes'));

// Automated Invoicing Routes
app.use('/api/invoices', require('./routes/invoiceRoutes'));

// Continuous Compliance Routes
app.use('/api/compliance', require('./routes/complianceRoutes'));

// Predictive Analytics Routes
app.use('/api/predictions', require('./routes/predictionRoutes'));

// Document management routes
app.use('/api/documents', require('./routes/documentRoutes'));

// AI/ML routes
app.use('/api/ai', require('./routes/aiRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({ 
    status: 'OK', 
    message: 'IVMS API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      status: dbStatusMap[dbStatus],
      connected: dbStatus === 1,
      name: mongoose.connection.name || 'N/A',
      host: mongoose.connection.host || 'N/A'
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;

// Initialize scheduled jobs (only in production or if enabled)
if (process.env.ENABLE_SCHEDULED_JOBS === 'true') {
  const ScheduledJobs = require('./jobs/scheduledJobs');
  ScheduledJobs.init();
}

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
