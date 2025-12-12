/**
 * Policy Builder
 * Visual rule-based policy configuration for compliance automation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, IconButton, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, Alert, Tabs, Tab, Tooltip, Badge,
  TextField, Select, FormControl, InputLabel, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  List, ListItem, ListItemText, ListItemIcon, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, Slider, Autocomplete
} from '@mui/material';
import {
  Plus, Trash, Edit, Copy, Play, Pause, CheckCircle, XCircle,
  AlertTriangle, Settings, Save, RefreshCw, ChevronDown, Code,
  FileText, Shield, Eye, EyeOff, Zap, GitBranch, Filter,
  Search, MoreVertical, Check, X, HelpCircle, ArrowRight, Layers
} from 'lucide-react';
import complianceService from '../services/complianceService';

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'in', label: 'In List' },
  { value: 'not_in', label: 'Not In List' },
  { value: 'exists', label: 'Exists' },
  { value: 'is_expired', label: 'Is Expired' },
  { value: 'days_until_expiry', label: 'Days Until Expiry' }
];

const ACTION_TYPES = [
  { value: 'create_case', label: 'Create Remediation Case', icon: FileText },
  { value: 'send_alert', label: 'Send Alert', icon: AlertTriangle },
  { value: 'update_tier', label: 'Update Risk Tier', icon: Layers },
  { value: 'block_payments', label: 'Block Payments', icon: XCircle },
  { value: 'require_review', label: 'Require Human Review', icon: Eye },
  { value: 'webhook', label: 'Trigger Webhook', icon: Zap },
  { value: 'escalate', label: 'Escalate', icon: ArrowRight }
];

const FIELD_SOURCES = [
  { category: 'Risk Score', fields: ['compositeScore', 'riskTier', 'confidenceLevel'] },
  { category: 'Documents', fields: ['certifications', 'licenses', 'insurance', 'financialStatements'] },
  { category: 'Events', fields: ['sanctionsHit', 'adverseMedia', 'documentExpired', 'auditFailed'] },
  { category: 'Profile', fields: ['vendorCategory', 'contractValue', 'country', 'industry'] },
  { category: 'History', fields: ['previousViolations', 'resolutionTime', 'escalationCount'] }
];

const PolicyBuilder = () => {
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // New policy form state
  const [policyForm, setPolicyForm] = useState({
    name: '',
    description: '',
    category: 'compliance',
    priority: 50,
    conditions: [],
    actions: [],
    isActive: true,
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  // Fetch policies
  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await complianceService.getPolicies({
        ...(filterCategory !== 'all' && { category: filterCategory }),
        ...(searchQuery && { search: searchQuery })
      });
      setPolicies(response.data || []);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, searchQuery]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPolicies();
    setRefreshing(false);
  };

  const handleSelectPolicy = (policy) => {
    setSelectedPolicy(policy);
    setEditMode(false);
  };

  const handleCreatePolicy = () => {
    setPolicyForm({
      name: '',
      description: '',
      category: 'compliance',
      priority: 50,
      conditions: [],
      actions: [],
      isActive: true,
      effectiveFrom: new Date().toISOString().split('T')[0]
    });
    setCreateDialogOpen(true);
  };

  const handleSavePolicy = async () => {
    try {
      if (selectedPolicy && editMode) {
        await complianceService.updatePolicy(selectedPolicy._id, policyForm);
      } else {
        await complianceService.createPolicy(policyForm);
      }
      setCreateDialogOpen(false);
      setEditMode(false);
      fetchPolicies();
    } catch (error) {
      console.error('Failed to save policy:', error);
    }
  };

  const handleEditPolicy = () => {
    setPolicyForm({
      name: selectedPolicy.name,
      description: selectedPolicy.description,
      category: selectedPolicy.category,
      priority: selectedPolicy.priority,
      conditions: selectedPolicy.conditions || [],
      actions: selectedPolicy.actions || [],
      isActive: selectedPolicy.isActive,
      effectiveFrom: selectedPolicy.effectiveFrom?.split('T')[0]
    });
    setEditMode(true);
    setCreateDialogOpen(true);
  };

  const handleTogglePolicy = async (policy) => {
    try {
      if (policy.isActive) {
        await complianceService.deactivatePolicy(policy._id);
      } else {
        await complianceService.activatePolicy(policy._id);
      }
      fetchPolicies();
    } catch (error) {
      console.error('Failed to toggle policy:', error);
    }
  };

  const handleTestPolicy = async () => {
    if (!selectedPolicy) return;
    
    try {
      const response = await complianceService.testPolicy(selectedPolicy._id, {
        testData: {} // Would include test vendor data
      });
      setTestResults(response.data);
      setTestDialogOpen(true);
    } catch (error) {
      console.error('Failed to test policy:', error);
    }
  };

  // Add condition to form
  const addCondition = () => {
    setPolicyForm(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: '', operator: 'equals', value: '', logicalOperator: 'AND' }
      ]
    }));
  };

  // Update condition
  const updateCondition = (index, field, value) => {
    setPolicyForm(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      )
    }));
  };

  // Remove condition
  const removeCondition = (index) => {
    setPolicyForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  // Add action
  const addAction = () => {
    setPolicyForm(prev => ({
      ...prev,
      actions: [
        ...prev.actions,
        { type: 'create_case', config: {} }
      ]
    }));
  };

  // Update action
  const updateAction = (index, field, value) => {
    setPolicyForm(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      )
    }));
  };

  // Remove action
  const removeAction = (index) => {
    setPolicyForm(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  // Policy List Component
  const PolicyList = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Policy Rules</Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={handleCreatePolicy}
          >
            New Policy
          </Button>
        </Box>

        {/* Filters */}
        <Box display="flex" gap={2} mb={2}>
          <TextField
            size="small"
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search size={18} style={{ marginRight: 8, color: '#9CA3AF' }} />
            }}
            fullWidth
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="compliance">Compliance</MenuItem>
              <MenuItem value="risk">Risk</MenuItem>
              <MenuItem value="operational">Operational</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Policy Items */}
        <List dense>
          {policies.map((policy) => (
            <ListItem
              key={policy._id}
              button
              selected={selectedPolicy?._id === policy._id}
              onClick={() => handleSelectPolicy(policy)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                border: '1px solid',
                borderColor: selectedPolicy?._id === policy._id ? 'primary.main' : 'divider'
              }}
            >
              <ListItemIcon>
                {policy.isActive ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <XCircle size={20} color="#9CA3AF" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight="medium">
                      {policy.name}
                    </Typography>
                    <Chip
                      label={policy.category}
                      size="small"
                      sx={{ height: 18, fontSize: 10 }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="textSecondary" noWrap>
                    {policy.conditions?.length || 0} conditions • {policy.actions?.length || 0} actions
                  </Typography>
                }
              />
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={`P${policy.priority}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 10 }}
                />
                <Switch
                  size="small"
                  checked={policy.isActive}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePolicy(policy);
                  }}
                />
              </Box>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  // Policy Detail Panel
  const PolicyDetailPanel = () => {
    if (!selectedPolicy) {
      return (
        <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box textAlign="center" p={4}>
            <GitBranch size={48} color="#9CA3AF" />
            <Typography color="textSecondary" sx={{ mt: 2 }}>
              Select a policy to view details
            </Typography>
          </Box>
        </Card>
      );
    }

    return (
      <Card sx={{ height: '100%', overflow: 'auto' }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {selectedPolicy.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedPolicy.description}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <IconButton size="small" onClick={handleEditPolicy}>
                <Edit size={18} />
              </IconButton>
              <IconButton size="small" onClick={handleTestPolicy}>
                <Play size={18} />
              </IconButton>
            </Box>
          </Box>

          {/* Meta Info */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Typography variant="caption" color="textSecondary">
                Category
              </Typography>
              <Typography variant="body2">
                {selectedPolicy.category}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="textSecondary">
                Priority
              </Typography>
              <Typography variant="body2">
                {selectedPolicy.priority}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="textSecondary">
                Status
              </Typography>
              <Chip
                size="small"
                label={selectedPolicy.isActive ? 'Active' : 'Inactive'}
                color={selectedPolicy.isActive ? 'success' : 'default'}
              />
            </Grid>
          </Grid>

          {/* Conditions */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ChevronDown size={18} />}>
              <Typography variant="subtitle2">
                Conditions ({selectedPolicy.conditions?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {(selectedPolicy.conditions || []).map((condition, index) => (
                <Card key={index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {index > 0 && (
                      <Chip
                        label={condition.logicalOperator || 'AND'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    <Typography variant="body2" fontWeight="medium">
                      {condition.field}
                    </Typography>
                    <Chip label={condition.operator} size="small" />
                    <Typography variant="body2" color="primary">
                      {JSON.stringify(condition.value)}
                    </Typography>
                  </Box>
                </Card>
              ))}
              {(!selectedPolicy.conditions || selectedPolicy.conditions.length === 0) && (
                <Typography variant="body2" color="textSecondary">
                  No conditions defined
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Actions */}
          <Accordion defaultExpanded sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ChevronDown size={18} />}>
              <Typography variant="subtitle2">
                Actions ({selectedPolicy.actions?.length || 0})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {(selectedPolicy.actions || []).map((action, index) => {
                const actionType = ACTION_TYPES.find(a => a.value === action.type);
                const ActionIcon = actionType?.icon || Zap;
                
                return (
                  <Card key={index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <ActionIcon size={18} />
                      <Typography variant="body2" fontWeight="medium">
                        {actionType?.label || action.type}
                      </Typography>
                    </Box>
                    {action.config && Object.keys(action.config).length > 0 && (
                      <Box sx={{ mt: 1, pl: 4 }}>
                        <Typography variant="caption" color="textSecondary">
                          {JSON.stringify(action.config)}
                        </Typography>
                      </Box>
                    )}
                  </Card>
                );
              })}
              {(!selectedPolicy.actions || selectedPolicy.actions.length === 0) && (
                <Typography variant="body2" color="textSecondary">
                  No actions defined
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Stats */}
          {selectedPolicy.stats && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Execution Stats
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPolicy.stats.triggered || 0}</Typography>
                    <Typography variant="caption">Triggered</Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPolicy.stats.actionsExecuted || 0}</Typography>
                    <Typography variant="caption">Actions</Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">
                      {selectedPolicy.stats.lastTriggered 
                        ? new Date(selectedPolicy.stats.lastTriggered).toLocaleDateString() 
                        : 'Never'}
                    </Typography>
                    <Typography variant="caption">Last Run</Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Create/Edit Policy Dialog
  const PolicyFormDialog = () => (
    <Dialog
      open={createDialogOpen}
      onClose={() => setCreateDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {editMode ? 'Edit Policy' : 'Create New Policy'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Basic Info */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Policy Name"
              value={policyForm.name}
              onChange={(e) => setPolicyForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={policyForm.category}
                label="Category"
                onChange={(e) => setPolicyForm(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="compliance">Compliance</MenuItem>
                <MenuItem value="risk">Risk</MenuItem>
                <MenuItem value="operational">Operational</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="number"
              label="Priority"
              value={policyForm.priority}
              onChange={(e) => setPolicyForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              inputProps={{ min: 1, max: 100 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={policyForm.description}
              onChange={(e) => setPolicyForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </Grid>

          {/* Conditions */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">
                Conditions
              </Typography>
              <Button size="small" startIcon={<Plus size={16} />} onClick={addCondition}>
                Add Condition
              </Button>
            </Box>
          </Grid>
          
          {policyForm.conditions.map((condition, index) => (
            <Grid item xs={12} key={index}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  {index > 0 && (
                    <Grid item xs={12} sm={2}>
                      <FormControl fullWidth size="small">
                        <Select
                          value={condition.logicalOperator || 'AND'}
                          onChange={(e) => updateCondition(index, 'logicalOperator', e.target.value)}
                        >
                          <MenuItem value="AND">AND</MenuItem>
                          <MenuItem value="OR">OR</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={index > 0 ? 3 : 4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Field</InputLabel>
                      <Select
                        value={condition.field}
                        label="Field"
                        onChange={(e) => updateCondition(index, 'field', e.target.value)}
                      >
                        {FIELD_SOURCES.map(category => (
                          [
                            <MenuItem key={category.category} disabled sx={{ fontWeight: 'bold' }}>
                              {category.category}
                            </MenuItem>,
                            ...category.fields.map(field => (
                              <MenuItem key={field} value={field} sx={{ pl: 4 }}>
                                {field}
                              </MenuItem>
                            ))
                          ]
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={condition.operator}
                        label="Operator"
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      >
                        {CONDITION_OPERATORS.map(op => (
                          <MenuItem key={op.value} value={op.value}>
                            {op.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Value"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash size={16} />
                    </IconButton>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}

          {/* Actions */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">
                Actions
              </Typography>
              <Button size="small" startIcon={<Plus size={16} />} onClick={addAction}>
                Add Action
              </Button>
            </Box>
          </Grid>

          {policyForm.actions.map((action, index) => (
            <Grid item xs={12} key={index}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Action Type</InputLabel>
                      <Select
                        value={action.type}
                        label="Action Type"
                        onChange={(e) => updateAction(index, 'type', e.target.value)}
                      >
                        {ACTION_TYPES.map(actionType => (
                          <MenuItem key={actionType.value} value={actionType.value}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <actionType.icon size={16} />
                              {actionType.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Configuration (JSON)"
                      value={JSON.stringify(action.config || {})}
                      onChange={(e) => {
                        try {
                          updateAction(index, 'config', JSON.parse(e.target.value));
                        } catch {}
                      }}
                      placeholder='{"severity": "high"}'
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeAction(index)}
                    >
                      <Trash size={16} />
                    </IconButton>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}

          {/* Settings */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Settings
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Effective From"
              value={policyForm.effectiveFrom}
              onChange={(e) => setPolicyForm(prev => ({ ...prev, effectiveFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={policyForm.isActive}
                  onChange={(e) => setPolicyForm(prev => ({ ...prev, isActive: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSavePolicy}
          disabled={!policyForm.name}
          startIcon={<Save size={16} />}
        >
          {editMode ? 'Update Policy' : 'Create Policy'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Test Results Dialog
  const TestResultsDialog = () => (
    <Dialog
      open={testDialogOpen}
      onClose={() => setTestDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Policy Test Results</DialogTitle>
      <DialogContent>
        {testResults ? (
          <Box>
            <Alert
              severity={testResults.matched ? 'success' : 'info'}
              sx={{ mb: 2 }}
            >
              {testResults.matched
                ? 'Policy conditions matched!'
                : 'Policy conditions did not match'}
            </Alert>
            
            {testResults.evaluations && (
              <List dense>
                {testResults.evaluations.map((evaluation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {evaluation.passed ? (
                        <CheckCircle size={18} color="#10B981" />
                      ) : (
                        <XCircle size={18} color="#EF4444" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${evaluation.field} ${evaluation.operator} ${evaluation.value}`}
                      secondary={evaluation.passed ? 'Passed' : 'Failed'}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        ) : (
          <Typography color="textSecondary">
            No test results available
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  if (loading && policies.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading policy builder...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Policy Builder
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Configure compliance rules and automated actions
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} className={refreshing ? 'spin' : ''} />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleCreatePolicy}
          >
            New Policy
          </Button>
        </Box>
      </Box>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Total Policies
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {policies.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Active
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {policies.filter(p => p.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Inactive
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="text.secondary">
                {policies.filter(p => !p.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Categories
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {new Set(policies.map(p => p.category)).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <PolicyList />
        </Grid>
        <Grid item xs={12} md={7}>
          <PolicyDetailPanel />
        </Grid>
      </Grid>

      {/* Dialogs */}
      <PolicyFormDialog />
      <TestResultsDialog />

      {/* CSS */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </Box>
  );
};

export default PolicyBuilder;
