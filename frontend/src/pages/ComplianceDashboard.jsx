/**
 * Compliance Dashboard
 * Real-time continuous compliance monitoring with KPIs, trends, and risk heatmaps
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, IconButton, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, Alert, Tabs, Tab, Tooltip, Badge, Avatar,
  Menu, MenuItem, TextField, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction
} from '@mui/material';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp,
  TrendingDown, Activity, FileText, Users, RefreshCw, Filter,
  Download, Eye, Settings, Bell, ChevronRight, BarChart2,
  PieChart, Calendar, ArrowRight, ExternalLink, AlertCircle, Info
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsePie, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, LineChart, Line, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import complianceService from '../services/complianceService';

const COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
  primary: '#3B82F6',
  secondary: '#6366F1'
};

const ComplianceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [cases, setCases] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboard, trendData, casesData, profilesData, eventsData] = await Promise.all([
        complianceService.getDashboard(),
        complianceService.getComplianceTrends(30),
        complianceService.getCases({ limit: 10 }),
        complianceService.getProfiles({ limit: 20 }),
        complianceService.getEvents({ limit: 15 })
      ]);

      setDashboardData(dashboard.data);
      setTrends(trendData.data || []);
      setCases(casesData.data || []);
      setProfiles(profilesData.data || []);
      setEvents(eventsData.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleViewVendor = (profile) => {
    setSelectedVendor(profile);
    setVendorDialogOpen(true);
  };

  // Summary Stats Component
  const SummaryStats = () => {
    const stats = dashboardData?.workflows || {};
    const tierData = dashboardData?.vendorsByTier || {};

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Open Cases
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {stats.openCases || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {stats.atRiskCount || 0} at risk
                  </Typography>
                </Box>
                <Shield size={48} color="rgba(255,255,255,0.3)" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    SLA Compliance
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {stats.slaCompliance || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Target: 95%
                  </Typography>
                </Box>
                <CheckCircle size={48} color="rgba(255,255,255,0.3)" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    High Risk Vendors
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {(tierData.high || 0) + (tierData.critical || 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Require attention
                  </Typography>
                </Box>
                <AlertTriangle size={48} color="rgba(255,255,255,0.3)" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Avg Resolution Time
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {stats.averageResolutionTime || 0}h
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Resolved: {stats.resolvedLast30Days || 0}
                  </Typography>
                </Box>
                <Clock size={48} color="rgba(255,255,255,0.3)" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Risk Distribution Chart
  const RiskDistributionChart = () => {
    const tierData = dashboardData?.vendorsByTier || {};
    const data = [
      { name: 'Low Risk', value: tierData.low || 0, color: COLORS.low },
      { name: 'Medium Risk', value: tierData.medium || 0, color: COLORS.medium },
      { name: 'High Risk', value: tierData.high || 0, color: COLORS.high },
      { name: 'Critical', value: tierData.critical || 0, color: COLORS.critical }
    ];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Vendor Risk Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsePie>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </RechartsePie>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // Compliance Trends Chart
  const ComplianceTrendsChart = () => {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Compliance Events Trend</Typography>
            <Chip label="Last 30 Days" size="small" />
          </Box>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis />
              <RechartsTooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke={COLORS.primary}
                fill={COLORS.primary}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // SLA Performance Chart
  const SLAPerformanceChart = () => {
    const bySeverity = dashboardData?.workflows?.bySeverity || {};
    const data = Object.entries(bySeverity).map(([severity, stats]) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      compliance: stats.slaCompliance || 0,
      total: stats.total || 0
    }));

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SLA Performance by Severity
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="severity" type="category" width={80} />
              <RechartsTooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="compliance" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // Active Cases Table
  const ActiveCasesTable = () => {
    const getSeverityChip = (severity) => {
      const colors = {
        critical: 'error',
        high: 'warning',
        medium: 'info',
        low: 'success'
      };
      return <Chip label={severity} color={colors[severity] || 'default'} size="small" />;
    };

    const getStatusChip = (status) => {
      const colors = {
        open: 'warning',
        in_progress: 'info',
        pending_review: 'secondary',
        resolved: 'success',
        escalated: 'error'
      };
      return <Chip label={status.replace('_', ' ')} color={colors[status] || 'default'} size="small" variant="outlined" />;
    };

    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Active Remediation Cases</Typography>
            <Button size="small" endIcon={<ArrowRight size={16} />}>
              View All
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Case #</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>SLA</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.slice(0, 5).map((c) => {
                  const slaInfo = complianceService.formatSLATime(c.slaDeadline);
                  return (
                    <TableRow key={c.caseNumber} hover>
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
                      <TableCell>{c.type?.replace('_', ' ')}</TableCell>
                      <TableCell>{getSeverityChip(c.severity)}</TableCell>
                      <TableCell>{getStatusChip(c.status)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ color: slaInfo.isOverdue ? 'error.main' : 'text.secondary' }}
                        >
                          {slaInfo.text}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Eye size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  // Top Risks Component
  const TopRisks = () => {
    const risks = dashboardData?.topRisks || [];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Top Risk Factors
          </Typography>
          <List dense>
            {risks.slice(0, 5).map((risk, index) => (
              <ListItem key={index} divider={index < risks.length - 1}>
                <ListItemIcon>
                  <AlertTriangle size={20} color={COLORS.high} />
                </ListItemIcon>
                <ListItemText
                  primary={risk.risk?.replace('_', ' ')}
                  secondary={`${risk.vendorCount} vendors affected`}
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={risk.vendorCount}
                    size="small"
                    color="warning"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  // Recent Events Component
  const RecentEvents = () => {
    const getEventIcon = (type) => {
      const icons = {
        sanctions_hit: <AlertCircle color={COLORS.critical} size={20} />,
        document_expired: <XCircle color={COLORS.high} size={20} />,
        document_verified: <CheckCircle color={COLORS.low} size={20} />,
        adverse_media_alert: <AlertTriangle color={COLORS.medium} size={20} />,
        default: <Info color={COLORS.primary} size={20} />
      };
      return icons[type] || icons.default;
    };

    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Recent Events</Typography>
            <IconButton size="small" onClick={handleRefresh}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </IconButton>
          </Box>
          <List dense>
            {events.slice(0, 8).map((event, index) => (
              <ListItem key={event._id || index} divider={index < events.length - 1}>
                <ListItemIcon>
                  {getEventIcon(event.eventType)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" noWrap>
                      {event.eventType?.replace(/_/g, ' ')}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="textSecondary">
                      {event.vendorId?.name || 'Unknown'} • {new Date(event.timestamp).toLocaleString()}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  // High Risk Vendors Component
  const HighRiskVendors = () => {
    const highRiskProfiles = profiles.filter(p => 
      p.tier === 'high' || p.tier === 'critical'
    );

    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">High Risk Vendors</Typography>
            <Chip label={highRiskProfiles.length} color="error" size="small" />
          </Box>
          <List dense>
            {highRiskProfiles.slice(0, 5).map((profile, index) => (
              <ListItem
                key={profile._id}
                divider={index < highRiskProfiles.length - 1}
                button
                onClick={() => handleViewVendor(profile)}
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: profile.tier === 'critical' ? COLORS.critical : COLORS.high,
                      fontSize: 14
                    }}
                  >
                    {(profile.vendorId?.name || 'V')[0]}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={profile.vendorId?.name || profile.vendorId?.companyName}
                  secondary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption">
                        Score: {profile.compositeScore?.value || 'N/A'}
                      </Typography>
                      <Chip
                        label={profile.tier}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 10,
                          bgcolor: profile.tier === 'critical' ? COLORS.critical : COLORS.high,
                          color: 'white'
                        }}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton size="small" onClick={() => handleViewVendor(profile)}>
                    <ChevronRight size={16} />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  // Vendor Detail Dialog
  const VendorDetailDialog = () => {
    if (!selectedVendor) return null;

    return (
      <Dialog
        open={vendorDialogOpen}
        onClose={() => setVendorDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: COLORS[selectedVendor.tier] }}>
              {(selectedVendor.vendorId?.name || 'V')[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedVendor.vendorId?.name || selectedVendor.vendorId?.companyName}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Compliance Profile
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary">
                    Composite Score
                  </Typography>
                  <Typography variant="h3" sx={{ color: COLORS[selectedVendor.tier] }}>
                    {selectedVendor.compositeScore?.value || 'N/A'}
                  </Typography>
                  <Chip
                    label={`${selectedVendor.tier?.toUpperCase()} RISK`}
                    sx={{
                      bgcolor: COLORS[selectedVendor.tier],
                      color: 'white',
                      mt: 1
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="subtitle2" gutterBottom>
                Compliance Attributes
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {(selectedVendor.complianceAttributes || []).slice(0, 8).map((attr, idx) => (
                  <Chip
                    key={idx}
                    label={attr.name}
                    size="small"
                    color={attr.status === 'valid' ? 'success' : 
                           attr.status === 'expired' ? 'error' : 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVendorDialogOpen(false)}>Close</Button>
          <Button variant="contained" endIcon={<ExternalLink size={16} />}>
            View Full Profile
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading compliance dashboard...
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
            Continuous Compliance
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Real-time compliance monitoring and risk management
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
            variant="outlined"
            startIcon={<Download size={16} />}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<Settings size={16} />}
          >
            Configure
          </Button>
        </Box>
      </Box>

      {/* Summary Stats */}
      <SummaryStats />

      {/* Main Content Grid */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <ComplianceTrendsChart />
            </Grid>
            <Grid item xs={12}>
              <ActiveCasesTable />
            </Grid>
          </Grid>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <RiskDistributionChart />
            </Grid>
            <Grid item xs={12}>
              <HighRiskVendors />
            </Grid>
          </Grid>
        </Grid>

        {/* Bottom Row */}
        <Grid item xs={12} md={4}>
          <SLAPerformanceChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <TopRisks />
        </Grid>
        <Grid item xs={12} md={4}>
          <RecentEvents />
        </Grid>
      </Grid>

      {/* Vendor Detail Dialog */}
      <VendorDetailDialog />

      {/* CSS for spinning animation */}
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

export default ComplianceDashboard;
