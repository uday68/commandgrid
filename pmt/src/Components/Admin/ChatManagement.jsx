import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, Stack, Alert, Snackbar
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  People as PeopleIcon
} from '@mui/icons-material';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ChatManagement = () => {
  const { t } = useTranslation();
  const [chatRooms, setChatRooms] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openNewRoom, setOpenNewRoom] = useState(false);
  const [openAddUsers, setOpenAddUsers] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [notification, setNotification] = useState(null);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    description: '',
    type: 'project', // 'project', 'team', or 'general'
    projectId: '',
    teamId: '',
    isPrivate: false
  });
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const [roomsRes, projectsRes, teamsRes, usersRes] = await Promise.all([
          axios.get(`${API}/api/chat/rooms`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/api/projects`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/api/teams`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setChatRooms(roomsRes.data.rooms || []);
        setProjects(projectsRes.data.projects || []);
        setTeams(teamsRes.data.data || []);
        setUsers(usersRes.data.users || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setNotification({
          message: t('errors.dataFetchFailed'),
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [t]);

  // Create new chat room
  const handleCreateRoom = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Validate based on type
      if (newRoomData.type === 'project' && !newRoomData.projectId) {
        return setNotification({
          message: t('admin.chat.selectProject'),
          severity: 'warning'
        });
      }
      
      if (newRoomData.type === 'team' && !newRoomData.teamId) {
        return setNotification({
          message: t('admin.chat.selectTeam'),
          severity: 'warning'
        });
      }
      
      const response = await axios.post(
        `${API}/api/admin/chat-rooms`,
        newRoomData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setChatRooms(prev => [...prev, response.data.room]);
      setOpenNewRoom(false);
      setNewRoomData({
        name: '',
        description: '',
        type: 'project',
        projectId: '',
        teamId: '',
        isPrivate: false
      });
      
      setNotification({
        message: t('admin.chat.roomCreated'),
        severity: 'success'
      });
    } catch (error) {
      console.error("Error creating chat room:", error);
      setNotification({
        message: error?.response?.data?.message || t('errors.operationFailed'),
        severity: 'error'
      });
    }
  };

  // Add users to chat room
  const handleAddUsers = async () => {
    try {
      if (!selectedRoom || selectedUsers.length === 0) return;
      
      const token = localStorage.getItem('authToken');
      await axios.post(
        `${API}/api/admin/chat-rooms/${selectedRoom.room_id}/users`,
        { userIds: selectedUsers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the local state
      setChatRooms(prev => 
        prev.map(room => 
          room.room_id === selectedRoom.room_id
            ? { 
                ...room, 
                members: [...room.members, ...selectedUsers.map(id => {
                  const user = users.find(u => u.user_id === id);
                  return {
                    user_id: id,
                    name: user?.name || 'Unknown',
                    role: user?.role || 'Member'
                  };
                })]
              }
            : room
        )
      );
      
      setOpenAddUsers(false);
      setSelectedUsers([]);
      
      setNotification({
        message: t('admin.chat.usersAdded'),
        severity: 'success'
      });
    } catch (error) {
      console.error("Error adding users to chat room:", error);
      setNotification({
        message: error?.response?.data?.message || t('errors.operationFailed'),
        severity: 'error'
      });
    }
  };

  // Remove user from chat room
  const handleRemoveUser = async (roomId, userId) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(
        `${API}/api/admin/chat-rooms/${roomId}/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the local state
      setChatRooms(prev => 
        prev.map(room => 
          room.room_id === roomId
            ? { 
                ...room, 
                members: room.members.filter(member => member.user_id !== userId)
              }
            : room
        )
      );
      
      setNotification({
        message: t('admin.chat.userRemoved'),
        severity: 'success'
      });
    } catch (error) {
      console.error("Error removing user from chat room:", error);
      setNotification({
        message: t('errors.operationFailed'),
        severity: 'error'
      });
    }
  };

  // Delete chat room
  const handleDeleteRoom = async (roomId) => {
    // Confirm deletion
    if (!window.confirm(t('admin.chat.confirmDeleteRoom'))) return;
    
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(
        `${API}/api/admin/chat-rooms/${roomId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the local state
      setChatRooms(prev => prev.filter(room => room.room_id !== roomId));
      
      setNotification({
        message: t('admin.chat.roomDeleted'),
        severity: 'success'
      });
    } catch (error) {
      console.error("Error deleting chat room:", error);
      setNotification({
        message: t('errors.operationFailed'),
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          {t('admin.chat.management')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenNewRoom(true)}
        >
          {t('admin.chat.createRoom')}
        </Button>
      </Box>

      {loading ? (
        <Typography>{t('common.loading')}</Typography>
      ) : chatRooms.length === 0 ? (
        <Alert severity="info">{t('admin.chat.noRooms')}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.chat.name')}</TableCell>
                <TableCell>{t('admin.chat.type')}</TableCell>
                <TableCell>{t('admin.chat.project')}</TableCell>
                <TableCell>{t('admin.chat.team')}</TableCell>
                <TableCell>{t('admin.chat.members')}</TableCell>
                <TableCell>{t('admin.chat.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatRooms.map((room) => (
                <TableRow key={room.room_id}>
                  <TableCell>{room.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={room.type} 
                      color={
                        room.type === 'project' ? 'primary' : 
                        room.type === 'team' ? 'secondary' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {room.project_id ? 
                      projects.find(p => p.project_id === room.project_id)?.name || 
                      room.project_id : 
                      '-'
                    }
                  </TableCell>
                  <TableCell>
                    {room.team_id ? 
                      teams.find(t => t.team_id === room.team_id)?.name || 
                      room.team_id : 
                      '-'
                    }
                  </TableCell>
                  <TableCell>
                    {room.members?.length || 0}
                    {room.members?.slice(0, 3).map(member => (
                      <Chip 
                        key={member.user_id}
                        label={member.name}
                        size="small"
                        onDelete={() => handleRemoveUser(room.room_id, member.user_id)}
                        sx={{ mr: 0.5, mt: 0.5 }}
                      />
                    ))}
                    {room.members?.length > 3 && (
                      <Chip
                        label={`+${room.members.length - 3}`}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      color="primary"
                      onClick={() => {
                        setSelectedRoom(room);
                        setOpenAddUsers(true);
                      }}
                      title={t('admin.chat.addMembers')}
                    >
                      <PeopleIcon />
                    </IconButton>
                    <IconButton 
                      color="error"
                      onClick={() => handleDeleteRoom(room.room_id)}
                      title={t('admin.chat.deleteRoom')}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* New Room Dialog */}
      <Dialog 
        open={openNewRoom} 
        onClose={() => setOpenNewRoom(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('admin.chat.createNewRoom')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('admin.chat.roomName')}
            value={newRoomData.name}
            onChange={(e) => setNewRoomData(prev => ({ ...prev, name: e.target.value }))}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={t('admin.chat.description')}
            value={newRoomData.description}
            onChange={(e) => setNewRoomData(prev => ({ ...prev, description: e.target.value }))}
            margin="normal"
            multiline
            rows={2}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('admin.chat.roomType')}</InputLabel>
            <Select
              value={newRoomData.type}
              onChange={(e) => setNewRoomData(prev => ({ 
                ...prev, 
                type: e.target.value,
                // Reset these when type changes
                projectId: e.target.value === 'project' ? prev.projectId : '',
                teamId: e.target.value === 'team' ? prev.teamId : ''
              }))}
              label={t('admin.chat.roomType')}
            >
              <MenuItem value="project">{t('admin.chat.projectRoom')}</MenuItem>
              <MenuItem value="team">{t('admin.chat.teamRoom')}</MenuItem>
              <MenuItem value="general">{t('admin.chat.generalRoom')}</MenuItem>
            </Select>
          </FormControl>
          
          {newRoomData.type === 'project' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('admin.chat.selectProject')}</InputLabel>
              <Select
                value={newRoomData.projectId}
                onChange={(e) => setNewRoomData(prev => ({ ...prev, projectId: e.target.value }))}
                label={t('admin.chat.selectProject')}
              >
                {projects.map(project => (
                  <MenuItem key={project.project_id} value={project.project_id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {newRoomData.type === 'team' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('admin.chat.selectTeam')}</InputLabel>
              <Select
                value={newRoomData.teamId}
                onChange={(e) => setNewRoomData(prev => ({ ...prev, teamId: e.target.value }))}
                label={t('admin.chat.selectTeam')}
              >
                {teams.map(team => (
                  <MenuItem key={team.team_id} value={team.team_id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewRoom(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreateRoom} variant="contained">
            {t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Users Dialog */}
      <Dialog 
        open={openAddUsers} 
        onClose={() => setOpenAddUsers(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('admin.chat.addUsersTo', { room: selectedRoom?.name })}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('admin.chat.selectUsers')}</InputLabel>
            <Select
              multiple
              value={selectedUsers}
              onChange={(e) => setSelectedUsers(e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((userId) => {
                    const user = users.find(u => u.user_id === userId);
                    return (
                      <Chip key={userId} label={user?.name || userId} />
                    );
                  })}
                </Box>
              )}
            >
              {users
                .filter(user => {
                  // Don't show users who are already members
                  return !selectedRoom?.members?.some(member => 
                    member.user_id === user.user_id
                  );
                })
                .map(user => (
                  <MenuItem key={user.user_id} value={user.user_id}>
                    {user.name} ({user.role})
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddUsers(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleAddUsers} 
            variant="contained"
            disabled={selectedUsers.length === 0}
          >
            {t('common.add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChatManagement;
