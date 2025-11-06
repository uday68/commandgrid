import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TableContainer, Table, TableBody, TableRow, TableCell, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, FormControl, InputLabel, Select, 
  MenuItem, Checkbox, FormControlLabel, ListItemText, Input, Chip, Alert, Snackbar } from '@mui/material';
import { VpnKey, Add, Edit, Delete, Save, CheckCircle } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const RoleManager = ({ theme = 'light' }) => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [roleName, setRoleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setInitialLoading(true);
      const token = localStorage.getItem("authToken");
      const response = await axios.get("http://localhost:5000/api/admin/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(response.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setNotification({
        type: "error",
        message: "Failed to fetch roles"
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.get("http://localhost:5000/api/admin/permissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPermissions(response.data);
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions || []);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSaveRole = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const roleData = {
        name: roleName,
        permissions: selectedPermissions
      };

      let response;
      if (editingRole) {
        response = await axios.put(
          `http://localhost:5000/api/admin/roles/${editingRole.id}`,
          roleData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotification({
          type: "success",
          message: "Role updated successfully"
        });
      } else {
        response = await axios.post(
          "http://localhost:5000/api/admin/roles",
          roleData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotification({
          type: "success",
          message: "Role created successfully"
        });
      }

      // Update roles list
      fetchRoles();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving role:", error);
      setNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to save role"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(
        `http://localhost:5000/api/admin/roles/${roleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update roles list
      setRoles(roles.filter(role => role.id !== roleId));
      setNotification({
        type: "success",
        message: "Role deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      setNotification({
        type: "error",
        message: error.response?.data?.message || "Failed to delete role"
      });
    }
  };

  const handlePermissionChange = (event) => {
    setSelectedPermissions(event.target.value);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  const themeClasses = {
    light: {
      card: 'bg-white',
      text: 'text-gray-800',
      border: 'border-gray-200',
      button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white',
      buttonOutline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
      shadow: 'shadow-lg shadow-blue-500/10',
      highlight: 'bg-blue-50',
    },
    dark: {
      card: 'bg-gray-800',
      text: 'text-gray-100',
      border: 'border-gray-700',
      button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white',
      buttonOutline: 'border border-gray-600 text-gray-200 hover:bg-gray-700',
      shadow: 'shadow-lg shadow-blue-900/20',
      highlight: 'bg-gray-700',
    }
  }[theme];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`${themeClasses.card} ${themeClasses.shadow} rounded-xl border ${themeClasses.border} overflow-hidden`}
    >
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <motion.div variants={itemVariants}>
          <Typography variant="h5" component="h2" fontWeight={700} className="flex items-center">
            <VpnKey sx={{ mr: 1.5 }} /> {t('roles.manage')}
          </Typography>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAddDialog}
            sx={{ 
              borderRadius: 2,
              background: 'linear-gradient(to right, #2563eb, #4f46e5)',
              boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)',
              textTransform: 'none',
              px: 3,
              py: 1
            }}
          >
            {t('roles.addRole')}
          </Button>
        </motion.div>
      </Box>
      
      <Box sx={{ p: 3 }}>
        {initialLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : roles.length === 0 ? (
          <motion.div 
            variants={itemVariants}
            className="text-center py-6"
          >
            <Typography variant="body1" color="text.secondary">
              {t('roles.noRoles')}
            </Typography>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <TableContainer>
              <Table>
                <TableBody>
                  <AnimatePresence>
                    {roles.map((role) => (
                      <motion.tr
                        key={role.id}
                        component={TableRow}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body1" fontWeight={500}>
                              {role.name}
                            </Typography>
                            {role.is_system && (
                              <Chip
                                label={t('roles.systemRole')}
                                size="small"
                                color="info"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                          <Box sx={{ mt: 0.5 }}>
                            {role.permissions && role.permissions.map((permission) => (
                              <Chip
                                key={permission}
                                label={permission}
                                size="small"
                                variant="outlined"
                                sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="right" width={120}>
                          <IconButton 
                            onClick={() => handleOpenEditDialog(role)} 
                            size="small" 
                            sx={{ mr: 1, bgcolor: 'rgba(59, 130, 246, 0.1)' }}
                            disabled={role.is_system}
                          >
                            <Edit fontSize="small" color="primary" />
                          </IconButton>
                          <IconButton 
                            onClick={() => handleDeleteRole(role.id)}
                            size="small"
                            sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)' }}
                            disabled={role.is_system}
                          >
                            <Delete fontSize="small" color="error" />
                          </IconButton>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          </motion.div>
        )}
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        PaperProps={{ 
          sx: { 
            borderRadius: 3, 
            overflow: 'hidden',
            width: '100%',
            maxWidth: 500
          } 
        }}
      >
        <DialogTitle>
          {editingRole ? t('roles.editRole') : t('roles.createRole')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label={t('roles.roleName')}
              fullWidth
              variant="outlined"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <FormControl fullWidth sx={{ mb: 1 }}>
              <InputLabel id="permissions-label">{t('roles.permissions')}</InputLabel>
              <Select
                labelId="permissions-label"
                multiple
                value={selectedPermissions}
                onChange={handlePermissionChange}
                input={<Input />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {permissions.map((permission) => (
                  <MenuItem key={permission.id} value={permission.name}>
                    <Checkbox checked={selectedPermissions.indexOf(permission.name) > -1} />
                    <ListItemText primary={permission.name} secondary={permission.description} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} disabled={loading}>{t('common.cancel')}</Button>
          <Button
            onClick={handleSaveRole}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            disabled={loading || !roleName}
            sx={{ 
              borderRadius: 1,
              textTransform: 'none'
            }}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification !== null}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {notification && (
          <Alert 
            onClose={() => setNotification(null)} 
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </motion.div>
  );
};

export default RoleManager;