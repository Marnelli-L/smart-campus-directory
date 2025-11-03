// Frontend Admin Component to View Feedback & Reports
// File: frontend/src/pages/Admin/FeedbackManagement.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';

const API_URL = 'http://localhost:5000/api';

function FeedbackManagement() {
  const [tab, setTab] = useState('feedback'); // 'feedback', 'reports', 'visitor'
  
  // Feedback state
  const [feedback, setFeedback] = useState([]);
  const [reports, setReports] = useState([]);
  const [visitors, setVisitors] = useState([]);
  
  // UI state
  const [_loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [stats, setStats] = useState({});

  // Fetch feedback
  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (search) params.append('search', search);
      
      const response = await fetch(`${API_URL}/feedback?${params}`);
      const data = await response.json();
      setFeedback(data.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterSeverity) params.append('severity', filterSeverity);
      if (search) params.append('search', search);
      
      const response = await fetch(`${API_URL}/reports?${params}`);
      const data = await response.json();
      setReports(data.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity, search]);

  // Fetch visitor feedback
  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await fetch(`${API_URL}/visitor-feedback?${params}`);
      const data = await response.json();
      setVisitors(data.data);
    } catch (error) {
      console.error('Error fetching visitor feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/feedback-stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (tab === 'feedback') fetchFeedback();
    else if (tab === 'reports') fetchReports();
    else if (tab === 'visitor') fetchVisitors();
  }, [tab, fetchFeedback, fetchReports, fetchVisitors]);

  // Update feedback status
  const handleUpdateFeedback = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/feedback/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchFeedback();
        setOpenDialog(false);
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  // Update report
  const handleUpdateReport = async (id, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (response.ok) {
        fetchReports();
        setOpenDialog(false);
      }
    } catch (error) {
      console.error('Error updating report:', error);
    }
  };

  // Delete feedback
  const handleDeleteFeedback = async (id) => {
    if (window.confirm('Delete this feedback?')) {
      try {
        await fetch(`${API_URL}/feedback/${id}`, { method: 'DELETE' });
        fetchFeedback();
      } catch (error) {
        console.error('Error deleting feedback:', error);
      }
    }
  };

  // Delete report
  const handleDeleteReport = async (id) => {
    if (window.confirm('Delete this report?')) {
      try {
        await fetch(`${API_URL}/reports/${id}`, { method: 'DELETE' });
        fetchReports();
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  // Delete visitor feedback
  const handleDeleteVisitor = async (id) => {
    if (window.confirm('Delete this visitor feedback?')) {
      try {
        await fetch(`${API_URL}/visitor-feedback/${id}`, { method: 'DELETE' });
        fetchVisitors();
      } catch (error) {
        console.error('Error deleting visitor feedback:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'New': 'error',
      'Read': 'info',
      'In Progress': 'warning',
      'Resolved': 'success',
      'Closed': 'default',
    };
    return colors[status] || 'default';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'Critical': 'error',
      'High': 'warning',
      'Medium': 'info',
      'Low': 'success',
    };
    return colors[severity] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#00695C', fontWeight: 'bold' }}>
        Feedback & Reports Management
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.feedback && stats.feedback.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.status}>
            <Card>
              <CardContent>
                <Typography color="textSecondary">{stat.status}</Typography>
                <Typography variant="h5">{stat.count}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant={tab === 'feedback' ? 'contained' : 'outlined'}
          onClick={() => setTab('feedback')}
          sx={{ background: tab === 'feedback' ? '#00695C' : 'transparent' }}
        >
          Feedback ({feedback.length})
        </Button>
        <Button
          variant={tab === 'reports' ? 'contained' : 'outlined'}
          onClick={() => setTab('reports')}
          sx={{ background: tab === 'reports' ? '#00695C' : 'transparent' }}
        >
          Reports ({reports.length})
        </Button>
        <Button
          variant={tab === 'visitor' ? 'contained' : 'outlined'}
          onClick={() => setTab('visitor')}
          sx={{ background: tab === 'visitor' ? '#00695C' : 'transparent' }}
        >
          Visitor Feedback ({visitors.length})
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 200 }}
        />
        
        {(tab === 'feedback' || tab === 'reports') && (
          <FormControl sx={{ width: 150 }} size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="New">New</MenuItem>
              <MenuItem value="Read">Read</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Resolved">Resolved</MenuItem>
            </Select>
          </FormControl>
        )}

        {tab === 'reports' && (
          <FormControl sx={{ width: 150 }} size="small">
            <InputLabel>Severity</InputLabel>
            <Select
              value={filterSeverity}
              label="Severity"
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </Select>
          </FormControl>
        )}

        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            if (tab === 'feedback') fetchFeedback();
            else if (tab === 'reports') fetchReports();
            else fetchVisitors();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* FEEDBACK TABLE */}
      {tab === 'feedback' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ background: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {feedback.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell sx={{ maxWidth: 250 }}>{item.message.substring(0, 50)}...</TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        setSelectedItem(item);
                        setOpenDialog(true);
                      }}
                    >
                      Update
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteFeedback(item.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* REPORTS TABLE */}
      {tab === 'reports' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ background: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.issue_type}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.severity}
                      color={getSeverityColor(item.severity)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{item.assigned_to || '-'}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        setSelectedItem(item);
                        setOpenDialog(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteReport(item.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* VISITOR FEEDBACK TABLE */}
      {tab === 'visitor' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ background: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Services</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Feedback</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visitors.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.contact}</TableCell>
                  <TableCell>{item.services_visited}</TableCell>
                  <TableCell>{item.rating}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{item.feedback?.substring(0, 50)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteVisitor(item.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* EDIT DIALOG */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {tab === 'feedback' ? 'Update Feedback' : 'Update Report'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {tab === 'feedback' && selectedItem && (
            <>
              <Typography><strong>From:</strong> {selectedItem.name}</Typography>
              <Typography><strong>Message:</strong> {selectedItem.message}</Typography>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedItem.status}
                  label="Status"
                  onChange={(e) => setSelectedItem({ ...selectedItem, status: e.target.value })}
                >
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="Read">Read</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          {tab === 'reports' && selectedItem && (
            <>
              <Typography><strong>Issue:</strong> {selectedItem.description}</Typography>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedItem.status}
                  label="Status"
                  onChange={(e) => setSelectedItem({ ...selectedItem, status: e.target.value })}
                >
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={selectedItem.severity}
                  label="Severity"
                  onChange={(e) => setSelectedItem({ ...selectedItem, severity: e.target.value })}
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Assign To"
                value={selectedItem.assigned_to || ''}
                onChange={(e) => setSelectedItem({ ...selectedItem, assigned_to: e.target.value })}
                fullWidth
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (tab === 'feedback') {
                handleUpdateFeedback(selectedItem.id, selectedItem.status);
              } else if (tab === 'reports') {
                handleUpdateReport(selectedItem.id, {
                  status: selectedItem.status,
                  severity: selectedItem.severity,
                  assigned_to: selectedItem.assigned_to
                });
              }
            }}
            variant="contained"
            sx={{ background: '#00695C' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FeedbackManagement;
