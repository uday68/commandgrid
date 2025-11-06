import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  FormControlLabel,
  Checkbox,
  Grid
} from '@mui/material';
import {
  DocumentIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import { FiFile, FiFileText, FiUpload, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ProjectSubmissionModal = ({ isOpen, onClose, project, onSubmit }) => {
  const { t } = useTranslation(['projects', 'common']);
  const [loading, setLoading] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    summaryReport: '',
    deliverables: [],
    completionNotes: '',
    nextSteps: '',
    includeFiles: true,
    includeReports: true
  });
  const [projectFiles, setProjectFiles] = useState([]);
  const [projectReports, setProjectReports] = useState([]);
  const [projectStats, setProjectStats] = useState({});

  useEffect(() => {
    if (isOpen && project) {
      fetchProjectData();
    }
  }, [isOpen, project]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const baseApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

      // Fetch project files, reports, and statistics
      const [filesRes, reportsRes, statsRes] = await Promise.all([
        axios.get(`${baseApiUrl}/projectmanager/projects/${project.project_id}/files`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseApiUrl}/projectmanager/subordinate-reports?project_id=${project.project_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${baseApiUrl}/projectmanager/projects/${project.project_id}/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setProjectFiles(filesRes.data.files || []);
      setProjectReports(reportsRes.data.reports || []);
      setProjectStats(statsRes.data.stats || {});
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!submissionData.summaryReport.trim()) {
      toast.error('Please provide a project summary');
      return;
    }

    const submissionPayload = {
      ...submissionData,
      projectFiles: submissionData.includeFiles ? projectFiles : [],
      projectReports: submissionData.includeReports ? projectReports : [],
      projectStats,
      submittedAt: new Date().toISOString()
    };

    onSubmit(submissionPayload);
  };

  const getProjectStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'active': 
      case 'in-progress': return 'warning';
      case 'on-hold': return 'error';
      default: return 'default';
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DocumentIcon className="w-6 h-6 text-blue-600" />
          <Typography variant="h6">Submit Project: {project.name}</Typography>
          <Chip 
            label={project.status} 
            color={getProjectStatusColor(project.status)}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ maxHeight: '70vh' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Typography>Loading project data...</Typography>
          </Box>
        ) : (
          <Box sx={{ space: 3 }}>
            {/* Project Overview */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                You are about to submit this project to Admin with all selected reports and files. 
                This action will mark the project as "submitted" and notify the Admin for review.
              </Typography>
            </Alert>

            {/* Project Statistics */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Project Statistics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="h5" color="primary">{projectStats.totalTasks || 0}</Typography>
                    <Typography variant="caption">Total Tasks</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="h5" color="success.main">{projectStats.completedTasks || 0}</Typography>
                    <Typography variant="caption">Completed</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="h5" color="info.main">{projectStats.teamMembers || 0}</Typography>
                    <Typography variant="caption">Team Members</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="h5" color="warning.main">{projectStats.daysActive || 0}</Typography>
                    <Typography variant="caption">Days Active</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Summary Report */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Project Summary Report *</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Provide a comprehensive summary of the project completion, key achievements, challenges faced, and overall outcomes..."
                value={submissionData.summaryReport}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, summaryReport: e.target.value }))}
                variant="outlined"
              />
            </Box>

            {/* Completion Notes */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Completion Notes</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Any additional notes about project completion, handover instructions, or important details..."
                value={submissionData.completionNotes}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, completionNotes: e.target.value }))}
                variant="outlined"
              />
            </Box>

            {/* Next Steps */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Recommended Next Steps</Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Suggest any follow-up actions, maintenance requirements, or future improvements..."
                value={submissionData.nextSteps}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, nextSteps: e.target.value }))}
                variant="outlined"
              />
            </Box>

            {/* Include Options */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Include in Submission</Typography>
              <Box sx={{ pl: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={submissionData.includeReports}
                      onChange={(e) => setSubmissionData(prev => ({ ...prev, includeReports: e.target.checked }))}
                    />
                  }
                  label={`Include all project reports (${projectReports.length} reports)`}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={submissionData.includeFiles}
                      onChange={(e) => setSubmissionData(prev => ({ ...prev, includeFiles: e.target.checked }))}
                    />
                  }
                  label={`Include all project files (${projectFiles.length} files)`}
                />
              </Box>
            </Box>

            {/* Reports List */}
            {submissionData.includeReports && projectReports.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FiFileText className="w-5 h-5" />
                  Reports to Include ({projectReports.length})
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                  {projectReports.slice(0, 5).map((report, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <FiFileText className="w-4 h-4" />
                      </ListItemIcon>
                      <ListItemText
                        primary={report.title}
                        secondary={`By ${report.author_name} • ${new Date(report.created_at).toLocaleDateString()}`}
                      />
                      <Chip label={report.status} size="small" />
                    </ListItem>
                  ))}
                  {projectReports.length > 5 && (
                    <ListItem>
                      <ListItemText
                        primary={`... and ${projectReports.length - 5} more reports`}
                        sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            {/* Files List */}
            {submissionData.includeFiles && projectFiles.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FiFile className="w-5 h-5" />
                  Files to Include ({projectFiles.length})
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                  {projectFiles.slice(0, 5).map((file, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <PaperClipIcon className="w-4 h-4" />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`${file.size || 'Unknown size'} • ${new Date(file.uploaded_at).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                  {projectFiles.length > 5 && (
                    <ListItem>
                      <ListItemText
                        primary={`... and ${projectFiles.length - 5} more files`}
                        sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Important:</strong> Once submitted, this project will be marked as "Under Review" and you will not be able to make further changes until Admin reviews your submission.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !submissionData.summaryReport.trim()}
          startIcon={<CheckCircleIcon className="w-4 h-4" />}
        >
          Submit Project to Admin
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectSubmissionModal;
