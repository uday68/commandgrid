import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Grid,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';

const Tasks = () => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dueDate: '',
    assignee: '',
    status: '',
    priority: '',
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement task creation logic
    handleCloseDialog();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">{t('tasks.title')}</Typography>
        <Button variant="contained" onClick={handleOpenDialog}>
          {t('tasks.createTask')}
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {/* Task cards will be rendered here */}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('tasks.createTask')}</DialogTitle>
        <DialogContent>
          <Stack component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label={t('tasks.taskName')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('tasks.description')}
              name="description"
              multiline
              rows={4}
              value={formData.description}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('tasks.dueDate')}
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('tasks.assignee')}
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              select
              label={t('tasks.status')}
              name="status"
              value={formData.status}
              onChange={handleChange}
              sx={{ mb: 2 }}
            >
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="review">Review</MenuItem>
              <MenuItem value="done">Done</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label={t('tasks.priority')}
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              sx={{ mb: 2 }}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('profile.cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {t('profile.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Tasks;