import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControlLabel,
  Avatar,
  Typography,
  CircularProgress,
  Divider,
} from "@mui/material";
import axios from "axios";
import { styled } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.spacing(3),
    width: '600px',
    background: theme.palette.background.paper,
  },
}));

const UserList = styled(List)({
  maxHeight: '400px',
  overflow: 'auto',
  padding: 0,
});

const UserListItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(2),
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const AddTeamMember = ({ teamId, companyId, isOpen, onClose, onMemberAdded }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState({});
  const [managers, setManagers] = useState({});
  const [availabilities, setAvailabilities] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const token = localStorage.getItem("authToken");
          const response = await axios.get(
            `http://localhost:5000/api/users?company_id=${companyId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Validate UUID format for users
        console.log(response.data.users)
          setUsers(response.data.users);
        } catch (err) {
          setError("Failed to fetch users: " + err.message);
        }
      };
      fetchUsers();
    }
  }, [isOpen, companyId]);

  const handleUserToggle = (userId) => {
   
    
    setSelectedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
    
    if (!selectedUsers[userId]) {
      setAvailabilities(prev => ({ ...prev, [userId]: true }));
    } else {
      setAvailabilities(prev => {
        const newAvail = { ...prev };
        delete newAvail[userId];
        return newAvail;
      });
      setManagers(prev => {
        const newManagers = { ...prev };
        delete newManagers[userId];
        return newManagers;
      });
    }
  };

  const handleManagerToggle = (userId) => {
     
    setManagers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleAvailabilityToggle = (userId) => {
     
    setAvailabilities(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("authToken");
      const members = Object.keys(selectedUsers)
       
        .map(userId => ({
          user_id: userId,
          is_manager: !!managers[userId],
          available: !!availabilities[userId]
        }));

      if (members.length === 0) {
        throw new Error("No valid members selected");
      }

      const response = await axios.post(
        `http://localhost:5000/api/project-manager/team/${teamId}/add-members`,
        { members },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update user skills if needed
      await Promise.all(members.map(async member => {
        if (member.is_manager) {
          await axios.post(
            `http://localhost:5000/api/user-skills`,
            {
              user_id: member.user_id,
              skill_name: 'Team Management',
              experience_level: 'Intermediate'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }));

      onMemberAdded(response);
      onClose();
      setSelectedUsers({});
      setManagers({});
      setAvailabilities({});
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  return (
    <StyledDialog open={isOpen} onClose={onClose}>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">{t('team.manageMembers')}</Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {t('team.selectMembers')}
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <UserList>
          {users.map((user) => (
            <div key={user.user_id}>
              <UserListItem>
                <Avatar sx={{ mr: 2 }}>{user.name.charAt(0)}</Avatar>
                <ListItemText
                  primary={user.name}
                  secondary={user.email}
                />
                <ListItemSecondaryAction>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!selectedUsers[user.user_id]}
                        onChange={() => handleUserToggle(user.user_id)}
                        color="primary"
                      />
                    }
                    label={t('team.member')}
                    labelPlacement="top"
                    sx={{ mr: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!managers[user.user_id]}
                        onChange={() => handleManagerToggle(user.user_id)}
                        color="secondary"
                        disabled={!selectedUsers[user.user_id]}
                      />
                    }
                    label={t('team.manager')}
                    labelPlacement="top"
                    sx={{ mr: 2 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!availabilities[user.user_id]}
                        onChange={() => handleAvailabilityToggle(user.user_id)}
                        color="default"
                      />
                    }
                    label={t('team.available')}
                    labelPlacement="top"
                  />
                </ListItemSecondaryAction>
              </UserListItem>
              <Divider />
            </div>
          ))}
        </UserList>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 20 }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || Object.keys(selectedUsers).length === 0}
        >
          {loading ? <CircularProgress size={24} /> : t('common.saveChanges')}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default AddTeamMember;