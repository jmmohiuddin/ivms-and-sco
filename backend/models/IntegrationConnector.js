/**
 * Integration Connector Model
 * Manages external system integrations for compliance data
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption helper for sensitive credentials
const encrypt = (text, key) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text, key) => {
  if (!text) return null;
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32)), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

const integrationConnectorSchema = new mongoose.Schema({
  // Connector Identity
  connectorId: {
    type: String,
    required: true,
    unique: true,
    default: () => `CON-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  
  // Integration Type
  integrationType: {
    type: String,
    required: true,
    enum: [
      'sanctions_screening', 'adverse_media', 'credit_rating',
      'kyc_verification', 'document_verification', 'certificate_registry',
      'insurance_verification', 'business_registry', 'erp_system',
      'contract_management', 'banking_api', 'government_registry',
      'industry_database', 'news_feed', 'webhook_receiver', 'custom_api'
    ]
  },
  
  // Provider Details
  provider: {
    name: String, // e.g., "Dow Jones", "LexisNexis", "Dun & Bradstreet"
    category: String,
    website: String,
    supportEmail: String,
    contractRef: String
  },
  
  // Connection Configuration
  connection: {
    protocol: {
      type: String,
      enum: ['rest', 'soap', 'graphql', 'sftp', 'webhook', 'oauth2', 'custom'],
      default: 'rest'
    },
    baseUrl: {
      type: String,
      required: true
    },
    endpoints: [{
      name: String,
      path: String,
      method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      description: String,
      rateLimit: Number, // requests per minute
      timeout: Number // milliseconds
    }],
    version: String,
    sandbox: Boolean,
    sandboxUrl: String
  },
  
  // Authentication
  authentication: {
    method: {
      type: String,
      enum: ['api_key', 'basic', 'oauth2', 'certificate', 'hmac', 'jwt', 'custom'],
      required: true
    },
    // Encrypted credentials
    credentials: {
      apiKey: String,
      apiSecret: String,
      username: String,
      password: String,
      clientId: String,
      clientSecret: String,
      accessToken: String,
      refreshToken: String,
      tokenExpiry: Date,
      certificatePath: String,
      privateKeyPath: String
    },
    oauth2Config: {
      authorizationUrl: String,
      tokenUrl: String,
      scopes: [String],
      grantType: String
    },
    headerName: String, // e.g., "X-API-Key", "Authorization"
    headerPrefix: String // e.g., "Bearer", "Basic"
  },
  
  // Request Configuration
  requestConfig: {
    headers: mongoose.Schema.Types.Mixed,
    timeout: { type: Number, default: 30000 },
    retryAttempts: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 1000 },
    rateLimit: {
      requestsPerMinute: Number,
      requestsPerDay: Number,
      burstLimit: Number
    }
  },
  
  // Response Mapping
  responseMapping: {
    successPath: String, // JSONPath to success data
    errorPath: String,
    dataPath: String,
    paginationConfig: {
      type: String, // cursor, offset, page
      pageSizeParam: String,
      pageParam: String,
      totalPath: String,
      nextPagePath: String
    },
    fieldMappings: [{
      sourcePath: String,
      targetField: String,
      transform: String, // date, number, boolean, lowercase, etc.
      defaultValue: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Webhook Configuration (for inbound)
  webhookConfig: {
    enabled: Boolean,
    endpoint: String, // Our endpoint URL
    secret: String,
    signatureHeader: String,
    signatureAlgorithm: String,
    events: [String],
    retryPolicy: {
      maxRetries: Number,
      backoffMultiplier: Number
    }
  },
  
  // Scheduling
  scheduling: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['interval', 'cron', 'event_driven'] },
    cronExpression: String,
    intervalMinutes: Number,
    timezone: { type: String, default: 'UTC' },
    nextRunAt: Date,
    lastRunAt: Date
  },
  
  // Health & Status
  health: {
    status: {
      type: String,
      enum: ['healthy', 'degraded', 'unhealthy', 'unknown'],
      default: 'unknown'
    },
    lastHealthCheck: Date,
    consecutiveFailures: { type: Number, default: 0 },
    lastError: String,
    lastErrorAt: Date,
    uptime: Number, // percentage
    averageLatency: Number, // milliseconds
    
    // Circuit breaker
    circuitBreaker: {
      state: {
        type: String,
        enum: ['closed', 'open', 'half-open'],
        default: 'closed'
      },
      failureThreshold: { type: Number, default: 5 },
      resetTimeout: { type: Number, default: 60000 },
      openedAt: Date
    }
  },
  
  // Metrics
  metrics: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    totalDataPoints: { type: Number, default: 0 },
    averageResponseTime: Number,
    lastDayStats: {
      requests: Number,
      successes: Number,
      failures: Number,
      avgLatency: Number,
      recordedAt: Date
    },
    monthlyUsage: [{
      month: String, // YYYY-MM
      requests: Number,
      dataPoints: Number,
      cost: Number
    }]
  },
  
  // Cost & Billing
  billing: {
    model: {
      type: String,
      enum: ['per_request', 'per_record', 'subscription', 'tiered', 'free']
    },
    costPerRequest: Number,
    costPerRecord: Number,
    monthlyFee: Number,
    currency: { type: String, default: 'USD' },
    billingAccountRef: String,
    quotas: {
      daily: Number,
      monthly: Number,
      annual: Number
    },
    currentUsage: {
      daily: Number,
      monthly: Number,
      annual: Number,
      lastResetAt: Date
    }
  },
  
  // Data Coverage
  coverage: {
    countries: [String],
    dataTypes: [String],
    updateFrequency: String,
    historicalDepth: String,
    qualityScore: Number
  },
  
  // Sync History
  syncHistory: [{
    syncId: String,
    startedAt: Date,
    completedAt: Date,
    status: { type: String, enum: ['running', 'success', 'partial', 'failed'] },
    recordsFetched: Number,
    recordsProcessed: Number,
    recordsFailed: Number,
    errors: [String],
    duration: Number
  }],
  
  // Active Status
  isActive: { type: Boolean, default: true },
  deactivatedAt: Date,
  deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deactivationReason: String,
  
  // Environment
  environment: {
    type: String,
    enum: ['production', 'sandbox', 'development', 'test'],
    default: 'production'
  },
  
  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Tags & Notes
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Indexes
integrationConnectorSchema.index({ connectorId: 1 }, { unique: true });
integrationConnectorSchema.index({ integrationType: 1 });
integrationConnectorSchema.index({ isActive: 1 });
integrationConnectorSchema.index({ 'health.status': 1 });
integrationConnectorSchema.index({ 'scheduling.nextRunAt': 1 });

// Virtual for encryption key (should come from env)
integrationConnectorSchema.virtual('encryptionKey').get(function() {
  return process.env.CONNECTOR_ENCRYPTION_KEY || 'default-encryption-key-change-me';
});

// Methods
integrationConnectorSchema.methods.setCredential = function(field, value) {
  const key = this.encryptionKey;
  this.authentication.credentials[field] = encrypt(value, key);
};

integrationConnectorSchema.methods.getCredential = function(field) {
  const key = this.encryptionKey;
  return decrypt(this.authentication.credentials[field], key);
};

integrationConnectorSchema.methods.refreshOAuthToken = async function() {
  if (this.authentication.method !== 'oauth2') {
    throw new Error('Not an OAuth2 connector');
  }
  
  // Implementation would call OAuth2 token endpoint
  // This is a placeholder
  const tokenResponse = await this.callTokenEndpoint();
  
  this.setCredential('accessToken', tokenResponse.access_token);
  if (tokenResponse.refresh_token) {
    this.setCredential('refreshToken', tokenResponse.refresh_token);
  }
  this.authentication.credentials.tokenExpiry = new Date(Date.now() + tokenResponse.expires_in * 1000);
  
  return this.save();
};

integrationConnectorSchema.methods.checkHealth = async function() {
  const startTime = Date.now();
  
  try {
    // Attempt a simple connectivity check
    // Implementation would make actual HTTP request
    const latency = Date.now() - startTime;
    
    this.health.status = 'healthy';
    this.health.lastHealthCheck = new Date();
    this.health.consecutiveFailures = 0;
    this.health.averageLatency = 
      (this.health.averageLatency * 0.8) + (latency * 0.2);
    
    // Close circuit breaker if half-open
    if (this.health.circuitBreaker.state === 'half-open') {
      this.health.circuitBreaker.state = 'closed';
    }
  } catch (error) {
    this.health.consecutiveFailures++;
    this.health.lastError = error.message;
    this.health.lastErrorAt = new Date();
    
    if (this.health.consecutiveFailures >= this.health.circuitBreaker.failureThreshold) {
      this.health.status = 'unhealthy';
      this.health.circuitBreaker.state = 'open';
      this.health.circuitBreaker.openedAt = new Date();
    } else {
      this.health.status = 'degraded';
    }
  }
  
  return this.save();
};

integrationConnectorSchema.methods.recordRequest = function(success, latency = 0, dataPoints = 0) {
  this.metrics.totalRequests++;
  
  if (success) {
    this.metrics.successfulRequests++;
    this.metrics.totalDataPoints += dataPoints;
  } else {
    this.metrics.failedRequests++;
  }
  
  // Update average response time
  if (latency > 0) {
    const total = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (total + latency) / this.metrics.totalRequests;
  }
  
  // Update billing usage
  if (this.billing.model === 'per_request') {
    this.billing.currentUsage.daily++;
    this.billing.currentUsage.monthly++;
    this.billing.currentUsage.annual++;
  } else if (this.billing.model === 'per_record') {
    this.billing.currentUsage.daily += dataPoints;
    this.billing.currentUsage.monthly += dataPoints;
    this.billing.currentUsage.annual += dataPoints;
  }
  
  return this;
};

integrationConnectorSchema.methods.addSyncRecord = function(syncResult) {
  this.syncHistory.unshift({
    syncId: `SYNC-${Date.now()}`,
    startedAt: syncResult.startedAt,
    completedAt: syncResult.completedAt,
    status: syncResult.status,
    recordsFetched: syncResult.recordsFetched,
    recordsProcessed: syncResult.recordsProcessed,
    recordsFailed: syncResult.recordsFailed,
    errors: syncResult.errors,
    duration: syncResult.completedAt - syncResult.startedAt
  });
  
  // Keep only last 100 sync records
  if (this.syncHistory.length > 100) {
    this.syncHistory = this.syncHistory.slice(0, 100);
  }
  
  this.scheduling.lastRunAt = syncResult.completedAt;
  
  return this;
};

integrationConnectorSchema.methods.isQuotaExceeded = function(checkType = 'daily') {
  const quota = this.billing.quotas[checkType];
  const usage = this.billing.currentUsage[checkType];
  
  if (!quota) return false;
  return usage >= quota;
};

// Statics
integrationConnectorSchema.statics.getActiveByType = function(integrationType) {
  return this.find({
    integrationType,
    isActive: true,
    'health.status': { $ne: 'unhealthy' }
  }).sort({ 'health.averageLatency': 1 });
};

integrationConnectorSchema.statics.getScheduledConnectors = function() {
  return this.find({
    isActive: true,
    'scheduling.enabled': true,
    'scheduling.nextRunAt': { $lte: new Date() },
    'health.circuitBreaker.state': { $ne: 'open' }
  });
};

integrationConnectorSchema.statics.getHealthSummary = async function() {
  const connectors = await this.find({ isActive: true });
  
  return {
    total: connectors.length,
    healthy: connectors.filter(c => c.health.status === 'healthy').length,
    degraded: connectors.filter(c => c.health.status === 'degraded').length,
    unhealthy: connectors.filter(c => c.health.status === 'unhealthy').length,
    unknown: connectors.filter(c => c.health.status === 'unknown').length,
    circuitOpen: connectors.filter(c => c.health.circuitBreaker.state === 'open').length
  };
};

module.exports = mongoose.model('IntegrationConnector', integrationConnectorSchema);
