/**
 * Vendor Compliance Portal
 * Self-service compliance view for vendors to manage their compliance status
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, IconButton, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, Alert, Tabs, Tab, Tooltip, Badge, Avatar,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  List, ListItem, ListItemText, ListItemIcon, Stepper, Step, StepLabel,
  CircularProgress, Collapse
} from '@mui/material';
import {
  Shield, CheckCircle, XCircle, Clock, Upload, FileText, AlertTriangle,
  Calendar, Download, Eye, RefreshCw, ChevronDown, ChevronUp,
  File, Image, Award, DollarSign, Building, Globe, Mail,
  Phone, MapPin, Briefcase, TrendingUp, TrendingDown, AlertCircle,
  Check, X, HelpCircle, ExternalLink, History, Star, Lock
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import complianceService from '../services/complianceService';

const TIER_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444'
};

const ATTRIBUTE_STATUS = {
  valid: { color: '#10B981', icon: CheckCircle, label: 'Valid' },
  expired: { color: '#EF4444', icon: XCircle, label: 'Expired' },
  expiring_soon: { color: '#F59E0B', icon: AlertTriangle, label: 'Expiring Soon' },
  pending: { color: '#3B82F6', icon: Clock, label: 'Pending Review' },
  missing: { color: '#9CA3AF', icon: HelpCircle, label: 'Missing' }
};

const VendorCompliancePortal = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [cases, setCases] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedSection, setExpandedSection] = useState('overview');
  const fileInputRef = useRef(null);

  // Mock vendor ID - would come from auth context
  const vendorId = 'current-vendor-id';

  // Fetch vendor compliance data
  const fetchVendorData = useCallback(async () => {
    try {
      setLoading(true);
      
      // In production, this would fetch the vendor's own profile
      const [profileRes, eventsRes, casesRes] = await Promise.all([
        complianceService.getProfiles({ limit: 1 }),
        complianceService.getEvents({ limit: 20 }),
        complianceService.getCases({ limit: 10 })
      ]);

      // Use first profile as demo
      setProfile(profileRes.data?.[0] || null);
      setEvents(eventsRes.data || []);
      setCases(casesRes.data?.filter(c => c.status !== 'closed') || []);
    } catch (error) {
      console.error('Failed to fetch vendor data:', error);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchVendorData();
  }, [fetchVendorData]);

  const handleUploadDocument = (attribute) => {
    setSelectedAttribute(attribute);
    setUploadDialogOpen(true);
  };

  const handleFileChange = (event) => {
    setUploadFile(event.target.files[0]);
  };

  const handleSubmitDocument = async () => {
    if (!uploadFile || !selectedAttribute) return;

    setUploading(true);
    try {
      // In production, would upload file and update attribute
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('attributeId', selectedAttribute._id);
      
      // await complianceService.uploadDocument(vendorId, formData);
      
      setUploadDialogOpen(false);
      setUploadFile(null);
      setSelectedAttribute(null);
      fetchVendorData();
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Compliance Score Gauge
  const ComplianceScoreGauge = () => {
    const score = profile?.compositeScore?.value || 0;
    const tier = profile?.tier || 'low';
    
    const data = [
      { name: 'Score', value: score, fill: TIER_COLORS[tier] }
    ];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom textAlign="center">
            Compliance Score
          </Typography>
          <Box sx={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                barSize={15}
                data={data}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  minAngle={15}
                  background
                  clockWise
                  dataKey="value"
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </Box>
          <Box textAlign="center" sx={{ mt: -8 }}>
            <Typography variant="h2" fontWeight="bold" sx={{ color: TIER_COLORS[tier] }}>
              {score}
            </Typography>
            <Chip
              label={`${tier.toUpperCase()} RISK`}
              sx={{
                bgcolor: `${TIER_COLORS[tier]}20`,
                color: TIER_COLORS[tier],
                fontWeight: 'bold'
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Compliance Summary Cards
  const ComplianceSummary = () => {
    const attributes = profile?.complianceAttributes || [];
    const validCount = attributes.filter(a => a.status === 'valid').length;
    const expiredCount = attributes.filter(a => a.status === 'expired').length;
    const pendingCount = attributes.filter(a => a.status === 'pending').length;
    const expiringCount = attributes.filter(a => a.status === 'expiring_soon').length;

    return (
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircle size={24} color="#10B981" />
              <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
                {validCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Valid Documents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <XCircle size={24} color="#EF4444" />
              <Typography variant="h4" fontWeight="bold" color="error" sx={{ mt: 1 }}>
                {expiredCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Expired
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <AlertTriangle size={24} color="#F59E0B" />
              <Typography variant="h4" fontWeight="bold" color="warning.main" sx={{ mt: 1 }}>
                {expiringCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Expiring Soon
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Clock size={24} color="#3B82F6" />
              <Typography variant="h4" fontWeight="bold" color="info.main" sx={{ mt: 1 }}>
                {pendingCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Pending Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Required Documents Section
  const RequiredDocuments = () => {
    const attributes = profile?.complianceAttributes || [];

    return (
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            onClick={() => toggleSection('documents')}
            sx={{ cursor: 'pointer' }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <FileText size={20} />
              <Typography variant="h6">Required Documents</Typography>
              <Chip label={attributes.length} size="small" />
            </Box>
            {expandedSection === 'documents' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Box>
          
          <Collapse in={expandedSection === 'documents'}>
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Document</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Last Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attributes.map((attr, index) => {
                    const statusConfig = ATTRIBUTE_STATUS[attr.status] || ATTRIBUTE_STATUS.missing;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <File size={16} color="#6B7280" />
                            <Typography variant="body2">{attr.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<StatusIcon size={14} />}
                            label={statusConfig.label}
                            size="small"
                            sx={{
                              bgcolor: `${statusConfig.color}20`,
                              color: statusConfig.color,
                              '& .MuiChip-icon': { color: statusConfig.color }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color={attr.status === 'expired' ? 'error' : 'textSecondary'}
                          >
                            {attr.expiryDate
                              ? new Date(attr.expiryDate).toLocaleDateString()
                              : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {attr.lastVerified
                              ? new Date(attr.lastVerified).toLocaleDateString()
                              : 'Never'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            {attr.documentRef && (
                              <Tooltip title="View Document">
                                <IconButton size="small">
                                  <Eye size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Upload New">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleUploadDocument(attr)}
                              >
                                <Upload size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  // Open Cases Section
  const OpenCases = () => (
    <Card>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          onClick={() => toggleSection('cases')}
          sx={{ cursor: 'pointer' }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <AlertCircle size={20} />
            <Typography variant="h6">Open Cases</Typography>
            {cases.length > 0 && (
              <Chip label={cases.length} size="small" color="warning" />
            )}
          </Box>
          {expandedSection === 'cases' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Box>

        <Collapse in={expandedSection === 'cases'}>
          {cases.length > 0 ? (
            <List sx={{ mt: 2 }}>
              {cases.map((c, index) => (
                <ListItem
                  key={c._id}
                  divider={index < cases.length - 1}
                  sx={{
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemIcon>
                    <AlertTriangle
                      size={20}
                      color={
                        c.severity === 'critical' ? '#EF4444' :
                        c.severity === 'high' ? '#F97316' :
                        c.severity === 'medium' ? '#F59E0B' : '#10B981'
                      }
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="medium">
                          {c.caseNumber}
                        </Typography>
                        <Chip
                          label={c.type?.replace(/_/g, ' ')}
                          size="small"
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="textSecondary">
                        {c.description?.substring(0, 100) || 'No description'}...
                      </Typography>
                    }
                  />
                  <Box textAlign="right">
                    <Typography
                      variant="caption"
                      sx={{
                        color: c.slaDeadline && new Date(c.slaDeadline) < new Date()
                          ? 'error.main'
                          : 'text.secondary'
                      }}
                    >
                      SLA: {c.slaDeadline
                        ? new Date(c.slaDeadline).toLocaleDateString()
                        : 'Not set'}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1, display: 'block' }}
                    >
                      Respond
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box textAlign="center" py={4}>
              <CheckCircle size={48} color="#10B981" />
              <Typography color="textSecondary" sx={{ mt: 1 }}>
                No open cases - Great job!
              </Typography>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );

  // Recent Activity Section
  const RecentActivity = () => (
    <Card>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          onClick={() => toggleSection('activity')}
          sx={{ cursor: 'pointer' }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <History size={20} />
            <Typography variant="h6">Recent Activity</Typography>
          </Box>
          {expandedSection === 'activity' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Box>

        <Collapse in={expandedSection === 'activity'}>
          <List dense sx={{ mt: 2 }}>
            {events.slice(0, 10).map((event, index) => (
              <ListItem key={event._id || index} divider={index < events.length - 1}>
                <ListItemIcon>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: event.severity === 'high' || event.severity === 'critical'
                        ? 'error.main'
                        : event.severity === 'medium'
                        ? 'warning.main'
                        : 'success.main'
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      {event.eventType?.replace(/_/g, ' ')}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="textSecondary">
                      {new Date(event.timestamp).toLocaleString()}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </CardContent>
    </Card>
  );

  // Compliance Tips Section
  const ComplianceTips = () => {
    const expiredDocs = (profile?.complianceAttributes || []).filter(a => a.status === 'expired');
    const expiringDocs = (profile?.complianceAttributes || []).filter(a => a.status === 'expiring_soon');

    const tips = [];
    
    if (expiredDocs.length > 0) {
      tips.push({
        severity: 'error',
        message: `${expiredDocs.length} document(s) have expired and need immediate attention.`,
        action: 'Upload Now'
      });
    }
    
    if (expiringDocs.length > 0) {
      tips.push({
        severity: 'warning',
        message: `${expiringDocs.length} document(s) will expire soon. Update them before the deadline.`,
        action: 'View Documents'
      });
    }
    
    if (cases.length > 0) {
      tips.push({
        severity: 'info',
        message: `You have ${cases.length} open compliance case(s) requiring your response.`,
        action: 'View Cases'
      });
    }

    if (tips.length === 0) {
      tips.push({
        severity: 'success',
        message: 'Your compliance profile is up to date. Keep up the good work!',
        action: null
      });
    }

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Box display="flex" alignItems="center" gap={1}>
              <Star size={20} color="#F59E0B" />
              Action Items
            </Box>
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {tips.map((tip, index) => (
              <Alert
                key={index}
                severity={tip.severity}
                action={
                  tip.action && (
                    <Button size="small" color="inherit">
                      {tip.action}
                    </Button>
                  )
                }
              >
                {tip.message}
              </Alert>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Upload Document Dialog
  const UploadDialog = () => (
    <Dialog
      open={uploadDialogOpen}
      onClose={() => setUploadDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Upload Document
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Document Type: {selectedAttribute?.name}
          </Typography>
          
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              hidden
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <Upload size={48} color="#9CA3AF" />
            <Typography sx={{ mt: 2 }}>
              {uploadFile ? uploadFile.name : 'Click to select or drag and drop'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              PDF, DOC, DOCX, JPG, PNG up to 10MB
            </Typography>
          </Box>

          {uploadFile && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <File size={16} />
              <Typography variant="body2">{uploadFile.name}</Typography>
              <Typography variant="caption" color="textSecondary">
                ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            Documents will be reviewed within 24-48 hours.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmitDocument}
          disabled={!uploadFile || uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : <Upload size={16} />}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading your compliance portal...
        </Typography>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Shield size={64} color="#9CA3AF" />
        <Typography variant="h5" sx={{ mt: 2 }}>
          No Compliance Profile Found
        </Typography>
        <Typography color="textSecondary">
          Please contact your account manager to set up your compliance profile.
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
            Vendor Compliance Portal
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage your compliance documentation and status
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
          >
            Export Report
          </Button>
          <Button
            variant="contained"
            startIcon={<Upload size={16} />}
            onClick={() => {
              setSelectedAttribute(null);
              setUploadDialogOpen(true);
            }}
          >
            Upload Document
          </Button>
        </Box>
      </Box>

      {/* Action Items */}
      <Box sx={{ mb: 3 }}>
        <ComplianceTips />
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={4}>
          <ComplianceScoreGauge />
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={8}>
          <ComplianceSummary />
        </Grid>

        {/* Full Width Sections */}
        <Grid item xs={12}>
          <RequiredDocuments />
        </Grid>

        <Grid item xs={12} md={6}>
          <OpenCases />
        </Grid>

        <Grid item xs={12} md={6}>
          <RecentActivity />
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <UploadDialog />
    </Box>
  );
};

export default VendorCompliancePortal;
