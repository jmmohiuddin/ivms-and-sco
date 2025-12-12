/**
 * Remediation Console
 * Case queue management with SLA tracking, escalation workflows, and resolution tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, IconButton, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, Alert, Tabs, Tab, Tooltip, Badge, Avatar,
  TextField, Select, FormControl, InputLabel, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  List, ListItem, ListItemText, ListItemIcon, Stepper, Step, StepLabel,
  StepContent, TextareaAutosize, Accordion, AccordionSummary, AccordionDetails,
  Pagination
} from '@mui/material';
import {
  AlertTriangle, CheckCircle, XCircle, Clock, ArrowUpRight,
  MessageSquare, Paperclip, Send, User, Calendar, Filter,
  Search, MoreVertical, ChevronDown, FileText, AlertCircle,
  ArrowRight, Play, Pause, Check, X, RefreshCw, Upload,
  Eye, Edit, Trash, Flag, UserPlus, RotateCcw, TrendingUp
} from 'lucide-react';
import complianceService from '../services/complianceService';

const SEVERITY_COLORS = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#10B981'
};

const STATUS_CONFIG = {
  open: { color: '#F59E0B', label: 'Open', icon: AlertCircle },
  in_progress: { color: '#3B82F6', label: 'In Progress', icon: Play },
  pending_review: { color: '#8B5CF6', label: 'Pending Review', icon: Pause },
  vendor_response: { color: '#06B6D4', label: 'Awaiting Vendor', icon: User },
  escalated: { color: '#EF4444', label: 'Escalated', icon: ArrowUpRight },
  resolved: { color: '#10B981', label: 'Resolved', icon: Check },
  closed: { color: '#6B7280', label: 'Closed', icon: X }
};

const RemediationConsole = () => {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch cases
  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterSeverity !== 'all' && { severity: filterSeverity }),
        ...(searchQuery && { search: searchQuery })
      };
      
      const response = await complianceService.getCases(params);
      setCases(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterSeverity, searchQuery]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCases();
    setRefreshing(false);
  };

  const handleSelectCase = async (caseItem) => {
    try {
      const response = await complianceService.getCaseById(caseItem._id);
      setSelectedCase(response.data);
    } catch (error) {
      console.error('Failed to fetch case details:', error);
      setSelectedCase(caseItem);
    }
  };

  const handleAddAction = async () => {
    if (!selectedCase || !actionNote.trim()) return;
    
    try {
      await complianceService.addCaseAction(selectedCase._id, {
        action: 'note_added',
        performedBy: 'current_user', // Would come from auth context
        notes: actionNote
      });
      setActionNote('');
      setActionDialogOpen(false);
      handleSelectCase(selectedCase);
    } catch (error) {
      console.error('Failed to add action:', error);
    }
  };

  const handleEscalate = async () => {
    if (!selectedCase || !escalationReason.trim()) return;
    
    try {
      await complianceService.escalateCase(selectedCase._id, {
        reason: escalationReason,
        escalatedBy: 'current_user'
      });
      setEscalationReason('');
      setEscalateDialogOpen(false);
      handleSelectCase(selectedCase);
      fetchCases();
    } catch (error) {
      console.error('Failed to escalate case:', error);
    }
  };

  const handleResolve = async () => {
    if (!selectedCase || !resolutionNotes.trim()) return;
    
    try {
      await complianceService.resolveCase(selectedCase._id, {
        resolution: resolutionNotes,
        resolvedBy: 'current_user'
      });
      setResolutionNotes('');
      setResolveDialogOpen(false);
      handleSelectCase(selectedCase);
      fetchCases();
    } catch (error) {
      console.error('Failed to resolve case:', error);
    }
  };

  // Case Queue Summary
  const CaseQueueSummary = () => {
    const statusCounts = cases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const overdueCases = cases.filter(c => 
      c.slaDeadline && new Date(c.slaDeadline) < new Date()
    ).length;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Total Open
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {cases.filter(c => c.status !== 'resolved' && c.status !== 'closed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Escalated
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error">
                {statusCounts.escalated || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                SLA Breached
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {overdueCases}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Pending Review
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {statusCounts.pending_review || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Filters Component
  const FiltersBar = () => (
    <Box display="flex" gap={2} mb={3} flexWrap="wrap">
      <TextField
        size="small"
        placeholder="Search cases..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: <Search size={18} style={{ marginRight: 8, color: '#9CA3AF' }} />
        }}
        sx={{ minWidth: 250 }}
      />
      
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={filterStatus}
          label="Status"
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="open">Open</MenuItem>
          <MenuItem value="in_progress">In Progress</MenuItem>
          <MenuItem value="pending_review">Pending Review</MenuItem>
          <MenuItem value="escalated">Escalated</MenuItem>
          <MenuItem value="resolved">Resolved</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Severity</InputLabel>
        <Select
          value={filterSeverity}
          label="Severity"
          onChange={(e) => setFilterSeverity(e.target.value)}
        >
          <MenuItem value="all">All Severity</MenuItem>
          <MenuItem value="critical">Critical</MenuItem>
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="low">Low</MenuItem>
        </Select>
      </FormControl>

      <Button
        variant="outlined"
        startIcon={<RefreshCw size={16} className={refreshing ? 'spin' : ''} />}
        onClick={handleRefresh}
        disabled={refreshing}
      >
        Refresh
      </Button>
    </Box>
  );

  // Case List Component
  const CaseList = () => {
    const getSeverityChip = (severity) => (
      <Chip
        label={severity}
        size="small"
        sx={{
          bgcolor: `${SEVERITY_COLORS[severity]}20`,
          color: SEVERITY_COLORS[severity],
          fontWeight: 'medium'
        }}
      />
    );

    const getStatusChip = (status) => {
      const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
      const Icon = config.icon;
      return (
        <Chip
          icon={<Icon size={14} />}
          label={config.label}
          size="small"
          sx={{
            bgcolor: `${config.color}20`,
            color: config.color,
            '& .MuiChip-icon': { color: config.color }
          }}
        />
      );
    };

    const getSLAStatus = (deadline) => {
      if (!deadline) return null;
      const sla = complianceService.formatSLATime(deadline);
      return (
        <Typography
          variant="body2"
          sx={{
            color: sla.isOverdue ? 'error.main' : 
                   sla.isNear ? 'warning.main' : 'text.secondary'
          }}
        >
          {sla.text}
        </Typography>
      );
    };

    return (
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>Case #</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>SLA</TableCell>
                <TableCell>Assigned</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cases.map((c) => (
                <TableRow
                  key={c._id}
                  hover
                  selected={selectedCase?._id === c._id}
                  onClick={() => handleSelectCase(c)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {c.caseNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {c.vendorId?.name || c.vendorId?.companyName || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {c.type?.replace(/_/g, ' ')}
                    </Typography>
                  </TableCell>
                  <TableCell>{getSeverityChip(c.severity)}</TableCell>
                  <TableCell>{getStatusChip(c.status)}</TableCell>
                  <TableCell>{getSLAStatus(c.slaDeadline)}</TableCell>
                  <TableCell>
                    <Tooltip title={c.assignedTo?.name || 'Unassigned'}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                        {(c.assignedTo?.name || 'U')[0]}
                      </Avatar>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <MoreVertical size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box display="flex" justifyContent="center" py={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, p) => setPage(p)}
            color="primary"
            size="small"
          />
        </Box>
      </Card>
    );
  };

  // Case Detail Panel
  const CaseDetailPanel = () => {
    if (!selectedCase) {
      return (
        <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box textAlign="center" p={4}>
            <FileText size={48} color="#9CA3AF" />
            <Typography color="textSecondary" sx={{ mt: 2 }}>
              Select a case to view details
            </Typography>
          </Box>
        </Card>
      );
    }

    const config = STATUS_CONFIG[selectedCase.status] || STATUS_CONFIG.open;
    const StatusIcon = config.icon;

    return (
      <Card sx={{ height: '100%', overflow: 'auto' }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {selectedCase.caseNumber}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedCase.vendorId?.name || selectedCase.vendorId?.companyName}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip
                icon={<StatusIcon size={14} />}
                label={config.label}
                sx={{
                  bgcolor: `${config.color}20`,
                  color: config.color,
                  '& .MuiChip-icon': { color: config.color }
                }}
              />
              <Chip
                label={selectedCase.severity}
                sx={{
                  bgcolor: `${SEVERITY_COLORS[selectedCase.severity]}20`,
                  color: SEVERITY_COLORS[selectedCase.severity]
                }}
              />
            </Box>
          </Box>

          {/* Details */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Description
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {selectedCase.description || 'No description provided'}
            </Typography>
          </Box>

          {/* Trigger Event */}
          {selectedCase.triggerEvent && (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Trigger Event
              </Typography>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2">
                  {selectedCase.triggerEvent.eventType?.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {new Date(selectedCase.triggerEvent.timestamp).toLocaleString()}
                </Typography>
              </Card>
            </Box>
          )}

          {/* SLA Info */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              SLA Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Deadline
                </Typography>
                <Typography variant="body2">
                  {selectedCase.slaDeadline
                    ? new Date(selectedCase.slaDeadline).toLocaleString()
                    : 'Not set'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  Status
                </Typography>
                <Typography
                  variant="body2"
                  color={
                    selectedCase.slaDeadline && new Date(selectedCase.slaDeadline) < new Date()
                      ? 'error'
                      : 'success'
                  }
                >
                  {selectedCase.slaDeadline && new Date(selectedCase.slaDeadline) < new Date()
                    ? 'Breached'
                    : 'On Track'}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Actions Timeline */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Activity Timeline
            </Typography>
            <Stepper orientation="vertical" sx={{ mt: 1 }}>
              {(selectedCase.actions || []).slice(0, 5).map((action, index) => (
                <Step key={index} active>
                  <StepLabel
                    optional={
                      <Typography variant="caption">
                        {new Date(action.timestamp).toLocaleString()}
                      </Typography>
                    }
                  >
                    {action.action?.replace(/_/g, ' ')}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary">
                      {action.notes}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      by {action.performedBy?.name || 'System'}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Action Buttons */}
          <Divider sx={{ my: 2 }} />
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              size="small"
              startIcon={<MessageSquare size={16} />}
              onClick={() => setActionDialogOpen(true)}
            >
              Add Note
            </Button>
            {selectedCase.status !== 'escalated' && selectedCase.status !== 'resolved' && (
              <Button
                variant="outlined"
                size="small"
                color="warning"
                startIcon={<ArrowUpRight size={16} />}
                onClick={() => setEscalateDialogOpen(true)}
              >
                Escalate
              </Button>
            )}
            {selectedCase.status !== 'resolved' && selectedCase.status !== 'closed' && (
              <Button
                variant="contained"
                size="small"
                color="success"
                startIcon={<Check size={16} />}
                onClick={() => setResolveDialogOpen(true)}
              >
                Resolve
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Action Dialog
  const ActionDialog = () => (
    <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Add Note</DialogTitle>
      <DialogContent>
        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder="Enter your note..."
          value={actionNote}
          onChange={(e) => setActionNote(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={handleAddAction} disabled={!actionNote.trim()}>
          Add Note
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Escalate Dialog
  const EscalateDialog = () => (
    <Dialog open={escalateDialogOpen} onClose={() => setEscalateDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'warning.main' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <ArrowUpRight size={20} />
          Escalate Case
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Escalating will notify management and update SLA targets.
        </Alert>
        <TextField
          multiline
          rows={4}
          fullWidth
          label="Escalation Reason"
          placeholder="Explain why this case needs escalation..."
          value={escalationReason}
          onChange={(e) => setEscalationReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleEscalate}
          disabled={!escalationReason.trim()}
        >
          Escalate
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Resolve Dialog
  const ResolveDialog = () => (
    <Dialog open={resolveDialogOpen} onClose={() => setResolveDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'success.main' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Check size={20} />
          Resolve Case
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          multiline
          rows={4}
          fullWidth
          label="Resolution Notes"
          placeholder="Document how this case was resolved..."
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleResolve}
          disabled={!resolutionNotes.trim()}
        >
          Resolve
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading && cases.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading remediation console...
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
            Remediation Console
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage compliance cases and resolution workflows
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<TrendingUp size={16} />}>
            SLA Report
          </Button>
          <Button variant="contained" startIcon={<Flag size={16} />}>
            New Case
          </Button>
        </Box>
      </Box>

      {/* Summary */}
      <CaseQueueSummary />

      {/* Filters */}
      <FiltersBar />

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <CaseList />
        </Grid>
        <Grid item xs={12} lg={5}>
          <CaseDetailPanel />
        </Grid>
      </Grid>

      {/* Dialogs */}
      <ActionDialog />
      <EscalateDialog />
      <ResolveDialog />

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

export default RemediationConsole;
