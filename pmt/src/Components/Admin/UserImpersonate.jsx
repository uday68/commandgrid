import React, { useState } from 'react';
import { 
  Box, Typography, FormControl, Select, MenuItem, Button, 
  InputLabel, Alert, Snackbar 
} from '@mui/material';
import { FiUser, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';

const UserImpersonate = ({ users = [] }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:5000/api/admin/impersonate/${selectedUser}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Store the impersonation token
      localStorage.setItem('impersonateToken', response.data.token);
      localStorage.setItem('impersonatingUser', selectedUser);
      
      setNotification({
        severity: 'success',
        message: 'User impersonation started successfully. You will be redirected.'
      });
      
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error) {
      console.error('Failed to impersonate user:', error);
      setNotification({
        severity: 'error',
        message: error.response?.data?.message || 'Failed to impersonate user. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <FiUser style={{ marginRight: 8 }} />
        User Impersonation
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <FormControl fullWidth>
          <InputLabel id="impersonate-user-label">Select User</InputLabel>
          <Select
            labelId="impersonate-user-label"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            label="Select User"
            sx={{ borderRadius: 2 }}
            disabled={loading}
          >
            <MenuItem value="" key="none">None</MenuItem>
            {users.map((user) => (
              <MenuItem key={user.user_id} value={user.user_id}>
                {user.name} ({user.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleImpersonate}
          disabled={!selectedUser || loading}
          sx={{ 
            borderRadius: 2,
            minWidth: { xs: '100%', sm: 'auto' },
            py: 1
          }}
        >
          {loading ? 'Processing...' : 'Impersonate User'}
        </Button>
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        <FiAlertCircle style={{ verticalAlign: 'middle', marginRight: 4 }} />
        This feature allows administrators to temporarily access the system as another user for troubleshooting.
        All actions will be logged and audited.
      </Typography>
      
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.severity || "info"}
          sx={{ width: '100%' }}
          icon={notification?.severity === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserImpersonate;
