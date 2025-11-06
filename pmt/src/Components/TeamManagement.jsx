import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon
} from '@mui/icons-material';

const TeamManagement = ({ members = [], onInvite, onRemove, onEdit }) => {
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [notification, setNotification] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member',
    name: ''
  });

  const handleInviteSubmit = () => {
    if (!inviteForm.email) {
      setNotification({ type: 'error', message: 'Email is required' });
      return;
    }
    
    try {
      onInvite(inviteForm.email, inviteForm.role);
      setOpenInviteDialog(false);
      setInviteForm({ email: '', role: 'member', name: '' });
      setNotification({ type: 'success', message: 'Invitation sent successfully' });
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to send invitation' });
    }
  };

  const handleMemberEdit = () => {
    if (selectedMember && onEdit) {
      onEdit(selectedMember);
      setOpenEditDialog(false);
      setNotification({ type: 'success', message: 'Member updated successfully' });
    }
  };

  const handleMemberRemove = (memberId) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      onRemove(memberId);
      setNotification({ type: 'success', message: 'Member removed successfully' });
    }
  };

  return (
    <Box>
      {/* Header section with title and invite button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Team Members</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setOpenInviteDialog(true)}
        >
          Invite Member
        </Button>
      </Box>

      {/* Team members list */}
      {members.length === 0 ? (
        <Card sx={{ mb: 4, textAlign: 'center', py: 4 }}>
          <CardContent>
            <Typography color="text.secondary">
              No team members yet. Invite someone to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 4 }}>
          <List>
            {members.map((member, index) => (
              <React.Fragment key={member.id || index}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src={member.avatar}>
                      {member.name ? member.name.charAt(0) : <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={member.name || member.email} 
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2">{member.email}</Typography>
                        <Chip 
                          label={member.role || 'Member'} 
                          size="small" 
                          color={member.role === 'admin' ? 'primary' : 'default'}
                          sx={{ maxWidth: 'fit-content' }}
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {onEdit && (
                      <IconButton 
                        edge="end" 
                        aria-label="edit"
                        onClick={() => {
                          setSelectedMember(member);
                          setOpenEditDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleMemberRemove(member.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < members.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Card>
      )}

      {/* Team statistics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Team Size</Typography>
              <Typography variant="h4">{members.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Active Members</Typography>
              <Typography variant="h4">{members.filter(m => m.status === 'active').length || members.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Admins</Typography>
              <Typography variant="h4">{members.filter(m => m.role === 'admin').length || 1}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invite new member dialog */}
      <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)}>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Name (Optional)"
            fullWidth
            variant="outlined"
            value={inviteForm.name}
            onChange={(e) => setInviteForm({...inviteForm, name: e.target.value})}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={inviteForm.role}
              label="Role"
              onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
            >
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInviteDialog(false)}>Cancel</Button>
          <Button onClick={handleInviteSubmit} variant="contained">Invite</Button>
        </DialogActions>
      </Dialog>

      {/* Edit member dialog */}
      {selectedMember && (
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Name"
              fullWidth
              variant="outlined"
              value={selectedMember.name || ''}
              onChange={(e) => setSelectedMember({...selectedMember, name: e.target.value})}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedMember.role || 'member'}
                label="Role"
                onChange={(e) => setSelectedMember({...selectedMember, role: e.target.value})}
              >
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button onClick={handleMemberEdit} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Notification */}
      <Snackbar 
        open={!!notification} 
        autoHideDuration={6000} 
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {notification && (
          <Alert onClose={() => setNotification(null)} severity={notification.type} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default TeamManagement;
