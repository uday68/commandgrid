import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  LinearProgress,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Flag as FlagIcon,
  Check as CheckIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const TaskManager = ({ projectId }) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: null,
    priority: 'medium',
    status: 'pending'
  });
  const [openSplitDialog, setOpenSplitDialog] = useState(false);
  const [subtasks, setSubtasks] = useState([]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    exit: {
      opacity: 0,
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const statusColors = {
    pending: {
      bg: 'rgba(241, 245, 249, 0.5)',
      color: '#64748b',
      border: '#cbd5e1'
    },
    in_progress: {
      bg: 'rgba(219, 234, 254, 0.5)',
      color: '#3b82f6',
      border: '#93c5fd'
    },
    review: {
      bg: 'rgba(254, 243, 199, 0.5)',
      color: '#f59e0b',
      border: '#fcd34d'
    },
    completed: {
      bg: 'rgba(220, 252, 231, 0.5)',
      color: '#10b981',
      border: '#86efac'
    },
    blocked: {
      bg: 'rgba(254, 226, 226, 0.5)',
      color: '#ef4444',
      border: '#fca5a5'
    }
  };

  const priorityColors = {
    low: { bg: 'rgba(219, 234, 254, 0.7)', color: '#3b82f6' },
    medium: { bg: 'rgba(254, 243, 199, 0.7)', color: '#f59e0b' },
    high: { bg: 'rgba(254, 226, 226, 0.7)', color: '#ef4444' },
    critical: { bg: 'rgba(254, 202, 202, 0.8)', color: '#dc2626' }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/projects/${projectId}/tasks`);
        setTasks(response.data.tasks || []);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchTasks();
    fetchUsers();
  }, [projectId]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? dayjs(task.due_date) : null,
      priority: task.priority || 'medium',
      status: task.status || 'pending'
    });
    setOpenTaskDialog(true);
  };

  const handleSaveTask = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      let response;

      if (selectedTask) {
        response = await axios.put(
          `http://localhost:5000/api/tasks/${selectedTask.task_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.task_id === selectedTask.task_id ? response.data.task : task
          )
        );
      } else {
        response = await axios.post(
          `http://localhost:5000/api/projects/${projectId}/tasks`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setTasks(prevTasks => [...prevTasks, response.data.task]);
      }

      setOpenTaskDialog(false);
      setSelectedTask(null);
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        due_date: null,
        priority: 'medium',
        status: 'pending'
      });
    } catch (err) {
      console.error('Failed to save task:', err);
      setError('Failed to save task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`http://localhost:5000/api/tasks/${selectedTask.task_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTasks(prevTasks =>
        prevTasks.filter(task => task.task_id !== selectedTask.task_id)
      );

      setOpenTaskDialog(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubtaskStatusToggle = async (subtaskId, newStatus) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.patch(
        `http://localhost:5000/api/subtasks/${subtaskId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.map(st =>
          st.subtask_id === subtaskId ? { ...st, status: newStatus } : st
        )
      }));

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.task_id === selectedTask.task_id
            ? {
                ...task,
                subtasks: task.subtasks?.map(st =>
                  st.subtask_id === subtaskId ? { ...st, status: newStatus } : st
                )
              }
            : task
        )
      );
    } catch (err) {
      console.error('Failed to update subtask status:', err);
      setError('Failed to update subtask status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubtask = (subtask) => {
    // Logic to edit a subtask
  };

  const handleDeleteSubtask = async (subtaskId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`http://localhost:5000/api/subtasks/${subtaskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSelectedTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.filter(st => st.subtask_id !== subtaskId)
      }));

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.task_id === selectedTask.task_id
            ? {
                ...task,
                subtasks: task.subtasks?.filter(st => st.subtask_id !== subtaskId)
              }
            : task
        )
      );
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      setError('Failed to delete subtask. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = () => {
    setSubtasks([
      ...subtasks,
      {
        title: '',
        description: '',
        assigned_to: '',
        due_date: null,
        status: 'pending'
      }
    ]);
  };

  const handleSubtaskChange = (index, field, value) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index][field] = value;
    setSubtasks(newSubtasks);
  };

  const handleSplitTask = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:5000/api/tasks/${selectedTask.task_id}/split`,
        { subtasks },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.task_id === selectedTask.task_id
            ? { ...task, subtasks: response.data.subtasks }
            : task
        )
      );

      setSelectedTask(prev => ({
        ...prev,
        subtasks: response.data.subtasks
      }));

      setSubtasks([]);
      setOpenSplitDialog(false);
    } catch (err) {
      console.error('Failed to split task:', err);
      setError('Failed to split task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Add your UI components here */}
    </Stack>
  );
};

TaskManager.propTypes = {
  projectId: PropTypes.number.isRequired
};

export default TaskManager;