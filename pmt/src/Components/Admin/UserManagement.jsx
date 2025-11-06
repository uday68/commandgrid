import React, { useState, useEffect } from 'react';
import { 
  Stack, Typography, Box, Button, TextField, InputAdornment, CircularProgress,
  Grid, Card, CardContent, CardActions, Avatar, Chip, FormControlLabel, Checkbox,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Snackbar, Alert, Tooltip, IconButton,
  Grow, Fade
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, FiSearch, FiPlus, FiEdit3, FiTrash2, FiSend, 
  FiX, FiCheck, FiUserCheck, FiEye, FiEyeOff, FiMail, FiUser, FiAlertCircle 
} from 'react-icons/fi';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import UserImpersonate from './UserImpersonate';

const UserManagement = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'Member',
    requiresPasswordUpdate: true
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
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

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get("http://localhost:5000/api/users", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.users || []);
        setFilteredUsers(response.data.users || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setNotification({
          severity: 'error',
          message: 'Failed to load users. Please try again later.'
        });
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleOpenEditDialog = (user) => {
    setSelectedUser({...user});
    setOpenEditDialog(true);
  };

  const handleCreateUser = async () => {
    if (newUser.password !== confirmPassword) {
      setNotification({
        severity: 'error',
        message: 'Passwords do not match'
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('http://localhost:5000/api/users', {
        ...newUser
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const createdUser = response.data.user;
      setUsers(prevUsers => [...prevUsers, createdUser]);
      
      if (sendWelcomeEmail && createdUser.user_id) {
        await handleSendWelcomeEmail(createdUser.user_id, false);
      }

      setOpenNewDialog(false);
      setNewUser({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'Member',
        requiresPasswordUpdate: true
      });
      setConfirmPassword('');
      setSendWelcomeEmail(true);
      setNotification({
        severity: 'success',
        message: 'User created successfully!'
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      setNotification({
        severity: 'error',
        message: error.response?.data?.message || 'Failed to create user. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(`http://localhost:5000/api/users/${selectedUser.user_id}`, selectedUser, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.user_id === selectedUser.user_id ? response.data.user : user
        )
      );
      setOpenEditDialog(false);
      setSelectedUser(null);
      setNotification({
        severity: 'success',
        message: 'User updated successfully!'
      });
    } catch (error) {
      console.error('Failed to update user:', error);
      setNotification({
        severity: 'error',
        message: error.response?.data?.message || 'Failed to update user. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (confirmDelete === userId) {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`http://localhost:5000/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUsers(prevUsers => prevUsers.filter(user => user.user_id !== userId));
        setNotification({
          severity: 'success',
          message: 'User deleted successfully!'
        });
      } catch (error) {
        console.error('Failed to delete user:', error);
        setNotification({
          severity: 'error',
          message: error.response?.data?.message || 'Failed to delete user. Please try again.'
        });
      } finally {
        setLoading(false);
      }
      setConfirmDelete(null);
    } else {
      setConfirmDelete(userId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleSendWelcomeEmail = async (userId, showNotification = true) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`http://localhost:5000/api/users/${userId}/welcome-email`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (showNotification) {
        setNotification({
          severity: 'success',
          message: 'Welcome email sent successfully!'
        });
      }
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      setNotification({
        severity: 'error',
        message: error.response?.data?.message || 'Failed to send welcome email. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack p={3} spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<FiPlus />}
          onClick={() => setOpenNewDialog(true)}
        >
          Add New User
        </Button>
      </Stack>

      {loadingUsers ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : filteredUsers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FiUsers size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6">No users found</Typography>
          <Typography color="textSecondary" sx={{ mt: 1 }}>
            {searchTerm ? 'Try adjusting your search filters' : 'Add users to get started'}
          </Typography>
        </Paper>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Grid container spacing={3}>
            <AnimatePresence>
              {filteredUsers.map((user) => (
                <Grid item xs={12} sm={6} md={4} key={user.user_id}>
                  <motion.div variants={itemVariants}>
                    <Card 
                      sx={{ 
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar 
                            src={user.profile_picture} 
                            sx={{ width: 56, height: 56, mr: 2 }}
                          >
                            {user.name ? user.name.charAt(0) : <FiUser />}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight="medium">
                              {user.name}
                            </Typography>
                            <Typography color="textSecondary" variant="body2">
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ mt: 2 }}>
                          <Chip
                            label={user.role || 'User'}
                            size="small"
                            color={
                              user.role === 'Admin' ? 'primary' :
                              user.role === 'Manager' ? 'secondary' : 'default'
                            }
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Username:</strong> {user.username}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Status:</strong> {user.active ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>
                      </CardContent>
                      
                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button 
                          size="small" 
                          startIcon={<FiEdit3 />}
                          onClick={() => handleOpenEditDialog(user)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          startIcon={<FiTrash2 />}
                          onClick={() => handleDeleteUser(user.user_id)}
                        >
                          Delete
                        </Button>
                      </CardActions>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>
        </motion.div>
      )}

      <Dialog 
        open={openNewDialog} 
        onClose={() => !loading && setOpenNewDialog(false)} 
        fullWidth 
        maxWidth="sm"
        TransitionComponent={Grow}
        TransitionProps={{ timeout: 400 }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Name"
              fullWidth
              margin="normal"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
            />
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            />
            <TextField
              label="Username"
              fullWidth
              margin="normal"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              margin="normal"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Member">Member</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={sendWelcomeEmail}
                  onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                />
              }
              label="Send Welcome Email"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateUser}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <FiCheck />}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openEditDialog} 
        onClose={() => !loading && setOpenEditDialog(false)} 
        fullWidth 
        maxWidth="sm"
        TransitionComponent={Grow}
        TransitionProps={{ timeout: 400 }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={selectedUser?.name || ''}
            onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
          />
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            value={selectedUser?.email || ''}
            onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
          />
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={selectedUser?.username || ''}
            onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedUser?.role || ''}
              onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
            >
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Manager">Manager</MenuItem>
              <MenuItem value="Member">Member</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateUser}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <FiCheck />}
          >
            Update User
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={Fade}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.severity || 'info'} 
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <Stack mt={4}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <UserImpersonate users={users} />
        </motion.div>
      </Stack>
    </Stack>
  );
};

export default UserManagement;