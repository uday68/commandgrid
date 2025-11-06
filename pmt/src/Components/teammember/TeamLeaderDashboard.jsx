import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Card, CardContent, Grid, 
  CircularProgress, Snackbar, Alert, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, IconButton 
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

export const TeamLeaderDashboard = ({ open, onClose }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Assume the auth token and team id are stored in localStorage
  const token = localStorage.getItem("authToken");
  const teamId = localStorage.getItem("teamId");

  useEffect(() => {
    if (!open) return; // Fetch data only when popup is opened

    const fetchData = async () => {
      try {
        const [membersRes, tasksRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/team-leader/team/${teamId}/members`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/team-leader/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setTeamMembers(membersRes.data.members || []);
        setTasks(tasksRes.data.tasks || []);
      } catch (error) {
        console.error("Error fetching team leader data:", error);
        setNotification({ type: "error", message: "Failed to load data." });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [open, teamId, token]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Team Leader Dashboard
        <IconButton onClick={onClose} style={{ position: "absolute", right: 10, top: 10 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Team Members Section */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Team Members</Typography>
                  {teamMembers.length === 0 ? (
                    <Typography>No team members found.</Typography>
                  ) : (
                    teamMembers.map((member) => (
                      <Box key={member.user_id} display="flex" alignItems="center" my={1}>
                        <Typography>
                          {member.name} ({member.email}) - {member.role}
                        </Typography>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Tasks Section */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Team Tasks</Typography>
                  {tasks.length === 0 ? (
                    <Typography>No tasks assigned.</Typography>
                  ) : (
                    tasks.map((task) => (
                      <Box key={task.task_id} my={1}>
                        <Typography variant="subtitle1">{task.title}</Typography>
                        <Typography variant="body2" color="textSecondary">{task.description}</Typography>
                        <Typography variant="caption">Status: {task.status}</Typography>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">Close</Button>
      </DialogActions>

      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        {notification && (
          <Alert onClose={() => setNotification(null)} severity={notification.type}>
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Dialog>
  );
};


