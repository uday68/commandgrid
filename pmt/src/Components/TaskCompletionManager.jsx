import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  AutoFixHigh as AutoIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import PropTypes from 'prop-types';



const TaskCompletionManager = ({ projectId, onTaskUpdate }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [estimateDialog, setEstimateDialog] = useState({ open: false, task: null, estimate: null });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        projectId 
          ? `/api/projects/${projectId}/tasks`
          : '/api/tasks/assigned',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setTasks(response.data.tasks || response.data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to fetch tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const updateTaskCompletion = async (taskId, completionPercentage) => {
    try {
      setSaving(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      const response = await axios.patch(
        `/api/task-management/${taskId}/completion`,
        { completion_percentage: completionPercentage },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.task_id === taskId 
          ? { ...task, completion_percentage: completionPercentage, status: response.data.task.status }
          : task
      ));
      
      setSuccess(`Task completion updated to ${completionPercentage}%`);
      if (onTaskUpdate) onTaskUpdate(response.data.task);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating task completion:', err);
      setError(err.response?.data?.error || 'Failed to update task completion');
    } finally {
      setSaving(false);
    }
  };

  const estimateCompletion = async (task) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `/api/task-management/${task.task_id}/estimate-completion`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setEstimateDialog({
        open: true,
        task,
        estimate: response.data
      });
    } catch (err) {
      console.error('Error estimating completion:', err);
      setError(err.response?.data?.error || 'Failed to estimate task completion');
    }
  };

  const applyEstimate = async () => {
    if (!estimateDialog.task || !estimateDialog.estimate) return;
    
    await updateTaskCompletion(
      estimateDialog.task.task_id,
      estimateDialog.estimate.estimated_completion
    );
    
    setEstimateDialog({ open: false, task: null, estimate: null });
  };

  const bulkUpdateCompletion = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const updates = Array.from(selectedTasks).map(taskId => {
        const task = tasks.find(t => t.task_id === taskId);
        return {
          task_id: taskId,
          completion_percentage: task.completion_percentage || 0
        };
      });
      
      const token = localStorage.getItem('authToken');
      const response = await axios.patch(
        '/api/task-management/bulk-completion',
        { tasks: updates },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSuccess(`Successfully updated ${response.data.updated_tasks.length} tasks`);
      setSelectedTasks(new Set());
      setBulkMode(false);
      await fetchTasks(); // Refresh the data
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error bulk updating tasks:', err);
      setError(err.response?.data?.error || 'Failed to bulk update tasks');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'primary';
      case 'Review': return 'secondary';
      case 'To Do': return 'default';
      default: return 'default';
    }
  };

  const getCompletionColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'primary';
    if (percentage >= 40) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2" fontWeight="bold">
          <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Task Completion Manager
        </Typography>
        
        <Box display="flex" gap={2}>
          <Button
            variant={bulkMode ? "contained" : "outlined"}
            onClick={() => setBulkMode(!bulkMode)}
            disabled={tasks.length === 0}
          >
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
          </Button>
          
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchTasks}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Bulk Actions */}
      {bulkMode && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Bulk Actions ({selectedTasks.size} selected)
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={bulkUpdateCompletion}
                disabled={selectedTasks.size === 0 || saving}
              >
                {saving ? 'Updating...' : 'Update Selected'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tasks Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {bulkMode && <TableCell padding="checkbox">Select</TableCell>}
              <TableCell>Task</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Completion %</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <motion.tr
                key={task.task_id}
                component={TableRow}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {bulkMode && (
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.task_id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedTasks);
                        if (e.target.checked) {
                          newSelected.add(task.task_id);
                        } else {
                          newSelected.delete(task.task_id);
                        }
                        setSelectedTasks(newSelected);
                      }}
                    />
                  </TableCell>
                )}
                
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {task.title}
                    </Typography>
                    {task.description && (
                      <Typography variant="caption" color="text.secondary">
                        {task.description.substring(0, 100)}
                        {task.description.length > 100 ? '...' : ''}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={task.status}
                    color={getStatusColor(task.status)}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {task.assignee_name || 'Unassigned'}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ width: 200 }}>
                    <Slider
                      value={task.completion_percentage || 0}
                      onChange={(e, value) => {
                        setTasks(prev => prev.map(t => 
                          t.task_id === task.task_id 
                            ? { ...t, completion_percentage: value }
                            : t
                        ));
                      }}
                      onChangeCommitted={(e, value) => {
                        if (!bulkMode) {
                          updateTaskCompletion(task.task_id, value);
                        }
                      }}
                      step={5}
                      min={0}
                      max={100}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value}%`}
                      color={getCompletionColor(task.completion_percentage || 0)}
                      disabled={saving}
                    />
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={task.completion_percentage || 0}
                      color={getCompletionColor(task.completion_percentage || 0)}
                      sx={{ width: 100, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">
                      {task.completion_percentage || 0}%
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Tooltip title="Auto-estimate completion">
                      <IconButton
                        size="small"
                        onClick={() => estimateCompletion(task)}
                        disabled={saving}
                      >
                        <AutoIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {task.completion_percentage === 100 && (
                      <Tooltip title="Completed">
                        <CheckCircleIcon color="success" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {tasks.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No tasks found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {projectId 
              ? 'This project has no tasks yet.'
              : 'You have no assigned tasks.'
            }
          </Typography>
        </Box>
      )}

      {/* Estimate Dialog */}
      <Dialog
        open={estimateDialog.open}
        onClose={() => setEstimateDialog({ open: false, task: null, estimate: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Auto-Estimated Completion
        </DialogTitle>
        <DialogContent>
          {estimateDialog.estimate && (
            <Box>
              <Typography variant="h4" color="primary" gutterBottom>
                {estimateDialog.estimate.estimated_completion}%
              </Typography>
              
              <Typography variant="body1" gutterBottom>
                <strong>Current:</strong> {estimateDialog.estimate.current_completion}%
              </Typography>
              
              <Typography variant="body1" gutterBottom>
                <strong>Recommendation:</strong> {estimateDialog.estimate.recommendation}
              </Typography>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Calculation Factors:
              </Typography>
              
              <ul>
                {estimateDialog.estimate.calculation_factors.map((factor, index) => (
                  <li key={index}>
                    <Typography variant="body2">{factor}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEstimateDialog({ open: false, task: null, estimate: null })}>
            Cancel
          </Button>
          <Button onClick={applyEstimate} variant="contained">
            Apply Estimate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>  );
};

TaskCompletionManager.propTypes = {
  projectId: PropTypes.string,
  onTaskUpdate: PropTypes.func
};

export default TaskCompletionManager;
