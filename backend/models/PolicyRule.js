/**
 * Policy Rule Model
 * Configurable compliance rules with conditions and enforcement actions
 */

const mongoose = require('mongoose');

// Condition Schema for policy rules
const conditionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true
    // e.g., 'complianceAttributes.ISO27001.status', 'tier', 'sanctionsStatus.status'
  },
  operator: {
    type: String,
    required: true,
    enum: [
      'equals', 'not_equals',
      'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal',
      'contains', 'not_contains',
      'in', 'not_in',
      'exists', 'not_exists',
      'before', 'after', 'within_days',
      'matches_regex'
    ]
  },
  value: mongoose.Schema.Types.Mixed, // Can be string, number, array, date
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'date', 'array'],
    default: 'string'
  }
}, { _id: false });

// Logical Group Schema for complex conditions
const logicalGroupSchema = new mongoose.Schema({
  operator: {
    type: String,
    enum: ['AND', 'OR', 'NOT'],
    default: 'AND'
  },
  conditions: [conditionSchema],
  groups: [{ type: mongoose.Schema.Types.Mixed }] // Nested groups
}, { _id: false });

const policyRuleSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
    // e.g., 'POL-SEC-001', 'POL-FIN-002'
  },
  category: {
    type: String,
    required: true,
    enum: [
      'security', 'financial', 'legal', 'regulatory', 'operational',
      'sanctions', 'privacy', 'esg', 'insurance', 'tax', 'kyc_aml', 'custom'
    ]
  },
  
  // Scope - Where this policy applies
  scope: {
    global: { type: Boolean, default: false }, // Applies to all vendors
    countries: [String], // ISO country codes
    regions: [String],
    vendorCategories: [String],
    vendorTiers: [{ type: String, enum: ['low', 'medium', 'high', 'critical'] }],
    contractValueMin: Number,
    contractValueMax: Number,
    contractTypes: [String],
    businessUnits: [String],
    projects: [String],
    specificVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    excludedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }]
  },
  
  // Conditions - The rule logic
  conditionLogic: {
    type: logicalGroupSchema,
    required: true
  },
  
  // Human-readable rule expression
  ruleExpression: String, // e.g., "ISO27001.valid OR SOC2.valid AND sanctions.clear"
  
  // Severity & Priority
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  priority: {
    type: Number,
    default: 50, // 1-100, higher = more important
    min: 1,
    max: 100
  },
  
  // Enforcement Configuration
  enforcement: {
    mode: {
      type: String,
      required: true,
      enum: ['monitor', 'alert_only', 'soft_enforce', 'hard_enforce'],
      default: 'alert_only'
    },
    actions: [{
      type: {
        type: String,
        enum: [
          'create_alert', 'create_case', 'send_notification',
          'hold_payments', 'block_orders', 'restrict_access',
          'require_approval', 'suspend_vendor', 'escalate',
          'update_tier', 'request_document', 'custom_webhook'
        ]
      },
      config: mongoose.Schema.Types.Mixed, // Action-specific configuration
      delay: Number, // Delay in hours before action
      requiresApproval: Boolean,
      approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }],
    gracePeriodDays: { type: Number, default: 0 },
    allowOverride: { type: Boolean, default: true },
    overrideApprovers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    autoRemediate: Boolean, // Attempt automatic remediation
    autoRemediateActions: [String]
  },
  
  // Alert Configuration
  alertConfig: {
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    recipientRoles: [String],
    channels: [{
      type: String,
      enum: ['email', 'sms', 'slack', 'teams', 'in_app', 'webhook']
    }],
    frequency: {
      type: String,
      enum: ['immediate', 'hourly', 'daily', 'weekly'],
      default: 'immediate'
    },
    suppressDuplicateHours: { type: Number, default: 24 }
  },
  
  // Compliance Mapping
  complianceMapping: {
    regulations: [String], // GDPR, SOX, HIPAA, etc.
    frameworks: [String], // NIST, ISO, CIS, etc.
    controls: [String], // Specific control IDs
    auditRequirements: [String]
  },
  
  // Status & Lifecycle
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'active', 'paused', 'deprecated', 'archived'],
    default: 'draft'
  },
  effectiveFrom: Date,
  effectiveUntil: Date,
  
  // Approval Workflow
  approvalWorkflow: {
    required: { type: Boolean, default: true },
    stages: [{
      stage: Number,
      role: String,
      approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      requiredApprovals: { type: Number, default: 1 },
      status: { type: String, enum: ['pending', 'approved', 'rejected'] },
      approvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      approvedAt: [Date],
      comments: [String]
    }],
    currentStage: { type: Number, default: 0 }
  },
  
  // Testing & Validation
  testResults: {
    lastTestedAt: Date,
    testedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sampleSize: Number,
    matchCount: Number,
    falsePositives: Number,
    notes: String
  },
  
  // Version Control
  version: { type: Number, default: 1 },
  previousVersions: [{
    version: Number,
    changedAt: Date,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changeReason: String,
    snapshot: mongoose.Schema.Types.Mixed
  }],
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [String],
  notes: String,
  externalRef: String // Reference to external GRC system
}, {
  timestamps: true
});

// Indexes
policyRuleSchema.index({ code: 1 }, { unique: true });
policyRuleSchema.index({ status: 1 });
policyRuleSchema.index({ category: 1 });
policyRuleSchema.index({ severity: 1 });
policyRuleSchema.index({ 'scope.countries': 1 });
policyRuleSchema.index({ 'scope.vendorCategories': 1 });

// Methods
policyRuleSchema.methods.isApplicableToVendor = function(vendor) {
  const scope = this.scope;
  
  // Global applies to all
  if (scope.global) return true;
  
  // Check exclusions first
  if (scope.excludedVendors?.includes(vendor._id)) return false;
  
  // Check specific vendors
  if (scope.specificVendors?.length > 0) {
    return scope.specificVendors.includes(vendor._id);
  }
  
  // Check country
  if (scope.countries?.length > 0 && !scope.countries.includes(vendor.country)) {
    return false;
  }
  
  // Check category
  if (scope.vendorCategories?.length > 0 && !scope.vendorCategories.includes(vendor.category)) {
    return false;
  }
  
  // Check tier
  if (scope.vendorTiers?.length > 0 && !scope.vendorTiers.includes(vendor.tier)) {
    return false;
  }
  
  // Check contract value
  if (scope.contractValueMin && vendor.totalContractValue < scope.contractValueMin) {
    return false;
  }
  if (scope.contractValueMax && vendor.totalContractValue > scope.contractValueMax) {
    return false;
  }
  
  return true;
};

policyRuleSchema.methods.evaluateCondition = function(condition, data) {
  const fieldValue = this.getNestedValue(data, condition.field);
  const targetValue = condition.value;
  
  switch (condition.operator) {
    case 'equals':
      return fieldValue === targetValue;
    case 'not_equals':
      return fieldValue !== targetValue;
    case 'greater_than':
      return fieldValue > targetValue;
    case 'less_than':
      return fieldValue < targetValue;
    case 'greater_or_equal':
      return fieldValue >= targetValue;
    case 'less_or_equal':
      return fieldValue <= targetValue;
    case 'contains':
      return String(fieldValue).includes(targetValue);
    case 'not_contains':
      return !String(fieldValue).includes(targetValue);
    case 'in':
      return Array.isArray(targetValue) && targetValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(targetValue) && !targetValue.includes(fieldValue);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;
    case 'within_days':
      if (!fieldValue) return false;
      const daysAhead = new Date();
      daysAhead.setDate(daysAhead.getDate() + targetValue);
      return new Date(fieldValue) <= daysAhead;
    default:
      return false;
  }
};

policyRuleSchema.methods.getNestedValue = function(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

policyRuleSchema.methods.evaluate = function(complianceProfile) {
  const evaluateGroup = (group, data) => {
    // Evaluate all conditions in this group
    const conditionResults = group.conditions.map(cond => 
      this.evaluateCondition(cond, data)
    );
    
    // Evaluate nested groups
    const groupResults = (group.groups || []).map(g => 
      evaluateGroup(g, data)
    );
    
    const allResults = [...conditionResults, ...groupResults];
    
    switch (group.operator) {
      case 'AND':
        return allResults.every(r => r);
      case 'OR':
        return allResults.some(r => r);
      case 'NOT':
        return !allResults[0];
      default:
        return false;
    }
  };
  
  return {
    passed: !evaluateGroup(this.conditionLogic, complianceProfile), // Rule triggers when condition is TRUE (violation)
    policyId: this._id,
    policyCode: this.code,
    severity: this.severity,
    enforcement: this.enforcement
  };
};

// Statics
policyRuleSchema.statics.getActivePolicies = function() {
  return this.find({ 
    status: 'active',
    $or: [
      { effectiveFrom: { $lte: new Date() } },
      { effectiveFrom: null }
    ],
    $or: [
      { effectiveUntil: { $gte: new Date() } },
      { effectiveUntil: null }
    ]
  }).sort({ priority: -1 });
};

policyRuleSchema.statics.getPoliciesByCategory = function(category) {
  return this.find({ category, status: 'active' });
};

module.exports = mongoose.model('PolicyRule', policyRuleSchema);
