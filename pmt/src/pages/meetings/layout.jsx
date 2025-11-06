import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Typography,
  Menu,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import {
  CalendarMonth,
  VideoCall,
  Groups,
  Dashboard,
  Assignment,
  Notifications as NotificationsIcon,
  Delete,
  Link as LinkIcon,
  Send,
} from "@mui/icons-material";
import { apiClient, auth, db } from "./apiClient";
import MeetingScheduler from "./MeetingScheduler";
import { v4 as uuidv4 } from "uuid";
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// Loading component for better user feedback
const LoadingIndicator = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      bgcolor: 'background.paper'
    }}
  >
    <CircularProgress size={60} thickness={4} />
    <Typography variant="h6" sx={{ mt: 3 }}>
      Loading meetings data...
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Please wait while we retrieve your information
    </Typography>
  </Box>
);

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({
    activeMeetings: 0,
    teamMembers: 0,
    projectProgress: 0,
    meetingTrendText: "",
    teamMembersTrendText: "",
    progressTrendText: "",
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Function to synchronize authentication
  const syncAuth = async () => {
    try {
      // Check if we have a token in localStorage
      const authToken = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      if (!authToken) {
        console.warn("No auth token found in localStorage");
        return false;
      }

      // Try to get current session
      const { data: sessionData } = await auth.getSession();
      
      if (!sessionData?.session) {
        console.log("No session found, creating one");
        
        // Try to parse user data
        let parsedUserData = null;
        try {
          parsedUserData = userData ? JSON.parse(userData) : null;
        } catch (e) {
          console.error("Failed to parse user data:", e);
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Auth sync error:", error);
      return false;
    }
  };

  // Fetch user session
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Try to sync auth first
        await syncAuth();
        
        // Try to get user
        const { data } = await auth.getSession();
        
        if (data?.user) {
          // Get additional user data if needed
          const response = await db.fetch("users", "*", { user_id: data.user.id });
          const userData = response.data?.[0];
          setUser({ ...data.user, ...userData });
        } else {
          // If no user from API, try to use main app user from localStorage
          const mainAppUser = localStorage.getItem('user');
          if (mainAppUser) {
            try {
              const parsedUser = JSON.parse(mainAppUser);
              // Map the user data to match what the component expects
              setUser({
                id: parsedUser.id || parsedUser.user_id,
                user_id: parsedUser.id || parsedUser.user_id,
                email: parsedUser.email,
                name: parsedUser.name,
                profile_picture: parsedUser.profile_picture || parsedUser.profilePicture,
                role: parsedUser.role,
                company_id: parsedUser.companyId || parsedUser.company_id,
                project_id: parsedUser.projectId || parsedUser.project_id,
              });
            } catch (e) {
              console.error("Failed to parse main app user:", e);
              console.warn("No authenticated user found");
              // Optional: Redirect to login page
              // navigate('/login');
            }
          } else {
            console.warn("No authenticated user found");
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setNotification({
          type: "error",
          message: "Failed to authenticate. Please try logging in again.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();

    // Set up auth change listener
    window.addEventListener('storage', (event) => {
      if (event.key === 'authToken' || event.key === 'user') {
        fetchUser();
      }
    });

    return () => {
      window.removeEventListener('storage', () => {});
    };
  }, []);

  // Fetch meetings and stats
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Getting today's date and a date 7 days ago for comparison
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        
        const todayStr = today.toISOString().split("T")[0];
        const lastWeekStr = lastWeek.toISOString().split("T")[0];
        
        // Fetch meetings with participants using axios instead of db.fetch
        const meetingsResponse = await axios.get('/api/meetings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        setMeetings(meetingsResponse.data || []);

        // Fetch current stats
        const activeMeetingsResponse = await axios.get(`/api/meetings/count?date=gte.${todayStr}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        const activeMeetings = activeMeetingsResponse.data.count || 0;

        // Fetch meetings from last week for trend calculation
        const lastWeekMeetingsResponse = await axios.get(
          `/api/meetings/count?date=gte.${lastWeekStr}&date=lt.${todayStr}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          }
        );
        const lastWeekMeetings = lastWeekMeetingsResponse.data.count || 0;
          
        // Calculate meeting trend percentage
        const meetingTrend = lastWeekMeetings > 0 
          ? Math.round(((activeMeetings - lastWeekMeetings) / lastWeekMeetings) * 100)
          : 0;
        const meetingTrendText = `${meetingTrend >= 0 ? '+' : ''}${meetingTrend}% from last week`;

        // Fetch current team members using axios
        const teamMembersResponse = await axios.get('/api/team-members/count', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        const teamMembers = teamMembersResponse.data.count || 0;
          
        // Fetch team members from last month for trend
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        
        const recentMembersResponse = await axios.get(
          `/api/team-members?created_at=gte.${lastMonth.toISOString()}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          }
        );
        const recentMembers = recentMembersResponse.data || [];
          
        const newMembersCount = recentMembers.length || 0;
        const teamMembersTrendText = `${newMembersCount} new ${newMembersCount === 1 ? 'member' : 'members'} this month`;

        // Fetch project progress using axios
        let project = null;
        if (user.project_id) {
          const projectResponse = await axios.get(`/api/projects/${user.project_id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          project = projectResponse.data;
        }

        // Create appropriate progress trend text
        let progressTrendText = "No active project";
        if (project) {
          // Check if deadline is near
          const deadline = new Date(project.deadline);
          const daysToDeadline = Math.round((deadline - today) / (1000 * 60 * 60 * 24));
          
          if (daysToDeadline < 0) {
            progressTrendText = "Past deadline";
          } else if (daysToDeadline < 7) {
            progressTrendText = `${daysToDeadline} days remaining`;
          } else if (project.per_complete > 75) {
            progressTrendText = "On track for deadline";
          } else if (project.per_complete < 25) {
            progressTrendText = "Just started";
          } else {
            progressTrendText = "In progress";
          }
        }

        setStats({
          activeMeetings,
          teamMembers,
          projectProgress: project?.per_complete || 0,
          meetingTrendText,
          teamMembersTrendText,
          progressTrendText
        });

        // Fetch unread notifications using axios
        const notificationsResponse = await axios.get(
          `/api/notifications?user_id=${user.user_id}&is_read=false`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          }
        );
        setUnreadNotifications(notificationsResponse.data.length || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
        setNotification({
          type: "error",
          message: "Failed to load data",
        });
      }
    };

    fetchData();

    // Set up polling for updates every 30 seconds instead of realtime 
    const intervalId = setInterval(fetchData, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);

  const startImmediateMeeting = async () => {
    try {
      // Generate a unique channel name for the meeting
      const channelName = `meeting_${uuidv4()}`;
      
      // Get company ID - use it directly as UUID
      const companyIdValue = user.company_id;

      console.log("Creating meeting with company_id:", companyIdValue, "Type:", typeof companyIdValue);
      
      const meetingData = {
        title: "Immediate Meeting",
        meeting_date: new Date().toISOString().split("T")[0],
        meeting_time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        agenda: "Quick discussion",
        company_id: companyIdValue,
        created_by: user.user_id,
        created_user_role: user.role,
        meeting_context: 'company',
        channel_name: channelName
      };

      console.log("Creating meeting with data:", meetingData);
      
      // Use axios to create meeting
      const meetingResponse = await axios.post('/api/meetings', meetingData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!meetingResponse.data) {
        throw new Error("Failed to create meeting");
      }

      console.log("Meeting created successfully:", meetingResponse.data);
      
      const meeting = meetingResponse.data.meeting;

      // Add creator as participant using API
      const participantData = {
        participants: [user.user_id]
      };
      
      console.log("Adding participant:", participantData);
      
      await axios.post(`/api/meetings/${meeting.meeting_id}/participants`, participantData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      // Create notification using API
      await axios.post('/api/notifications', {
        user_id: user.user_id,
        message: `Immediate meeting started: ${meeting.title}`,
        is_read: false
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      // Navigate to the meeting room
      navigate(`/meeting/${meeting.meeting_id}`);
    } catch (error) {
      console.error("Error starting meeting:", error);
      setNotification({
        type: "error",
        message: "Failed to start immediate meeting: " + (error.message || "Unknown error"),
      });
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    try {
      // Use axios to delete meeting
      await axios.delete(`/api/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      // Update meetings list after deletion
      setMeetings(meetings.filter(meeting => meeting.meeting_id !== meetingId));
      
      setNotification({
        type: "success",
        message: "Meeting deleted successfully",
      });
      
      setAnchorEl(null);
    } catch (error) {
      console.error("Error deleting meeting:", error);
      setNotification({
        type: "error",
        message: "Failed to delete meeting",
      });
    }
  };

  const handleShareMeeting = (meeting) => {
    const meetingLink = `${window.location.origin}/meeting/${meeting.meeting_id}`;
    navigator.clipboard.writeText(meetingLink);
    setAnchorEl(null);

    // Create notifications for participants using API
    meeting.participants?.forEach(async (participant) => {
      try {
        await axios.post('/api/notifications', {
          user_id: participant.user.user_id,
          message: `Meeting invitation: ${meeting.title}`,
          is_read: false,
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    });

    setNotification({
      type: "success",
      message: "Meeting link copied to clipboard",
    });
  };

  const handleMenuOpen = (event, meeting) => {
    setAnchorEl(event.currentTarget);
    setSelectedMeeting(meeting);
  };

  const isMeetingCreator = (meeting) => {
    return meeting?.created_by === user?.user_id || user?.role === "Admin";
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!user) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Authentication Required
        </Typography>
        <Typography variant="body1" paragraph>
          Please log in to access the meetings feature.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/login')}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-gray-900">
        <div className="flex items-center space-x-8">
          <span className="text-2xl font-semibold text-white">{t('app.name')}</span>
          <nav className="flex space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white/10"
              style={{ color: "#CBD5E0" }}
            >
              <Dashboard />
              <span className="text-sm font-medium">{t('navigation.dashboard')}</span>
            </Link>
            <Link
              to="/meetings"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white/10"
              style={{ color: "#CBD5E0" }}
            >
              <VideoCall />
              <span className="text-sm font-medium">{t('navigation.meetings')}</span>
            </Link>
            <Link
              to="/teams"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white/10"
              style={{ color: "#CBD5E0" }}
            >
              <Groups />
              <span className="text-sm font-medium">Teams</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <Tooltip title="Start Immediate Meeting">
            <IconButton
              onClick={startImmediateMeeting}
              sx={{
                backgroundColor: "#3182CE",
                "&:hover": { backgroundColor: "#2B6CB0" },
              }}
            >
              <VideoCall sx={{ color: "white" }} />
            </IconButton>
          </Tooltip>

          <Badge badgeContent={unreadNotifications} color="error">
            <IconButton 
              sx={{ color: "white" }}
              onClick={() => navigate("/notifications")}
            >
              <NotificationsIcon />
            </IconButton>
          </Badge>

          <Avatar
            src={user.profile_picture}
            sx={{
              width: 40,
              height: 40,
              bgcolor: "#3182CE",
              "&:hover": { cursor: "pointer" },
            }}
            onClick={() => navigate("/profile")}
          >
            {user.name?.charAt(0)}
          </Avatar>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="p-6 w-80 bg-gray-50 border-r">
          <div className="space-y-6">
            <Button
              fullWidth
              variant="contained"
              startIcon={<CalendarMonth />}
              onClick={() => setShowMeetingScheduler(true)}
            >
              Schedule Meeting
            </Button>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="text-lg font-semibold mb-4">Upcoming Meetings</h4>
              <List dense>
                {meetings.map((meeting) => (
                  <ListItem
                    key={meeting.meeting_id}
                    className="hover:bg-gray-50 rounded-lg group"
                    secondaryAction={
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, meeting)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                        </IconButton>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate(`/meeting/${meeting.meeting_id}`)}
                        >
                          Join
                        </Button>
                      </div>
                    }
                  >
                    <ListItemText
                     primary={
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{meeting.title}</span>
                        {meeting.file_id && (
                          <LinkIcon fontSize="small" color="action" />
                        )}
                      </div>
                     }
                      secondary={
                        <>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(meeting.meeting_date).toLocaleDateString()}{" "}
                            • {meeting.meeting_time}
                          </Typography>
                          <div className="flex gap-1 mt-1">
                            {meeting.participants?.slice(0, 3).map((p) => (
                              <Chip
                                key={p.user.user_id}
                                label={p.user.name}
                                size="small"
                                avatar={<Avatar src={p.user.profile_picture} />}
                              />
                            ))}
                            {meeting.participants?.length > 3 && (
                              <Chip
                                label={`+${meeting.participants.length - 3}`}
                                size="small"
                              />
                            )}
                          </div>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">
                Dashboard Overview
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user.name}. Here's your daily summary.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Active Meetings"
                value={stats.activeMeetings}
                trend={stats.meetingTrendText}
                color="blue"
              />
              <StatCard
                title="Team Members"
                value={stats.teamMembers}
                trend={stats.teamMembersTrendText}
                color="green"
              />
              <StatCard
                title="Project Progress"
                value={`${stats.projectProgress}%`}
                trend={stats.progressTrendText}
                color="purple"
              />
            </div>

            {/* Render child components */}
            {children}
          </div>
        </main>
      </div>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedMeeting && isMeetingCreator(selectedMeeting) && (
          <MenuItem
            onClick={() => handleDeleteMeeting(selectedMeeting.meeting_id)}
          >
            <Delete fontSize="small" className="mr-2" /> Delete Meeting
          </MenuItem>
        )}
        <MenuItem onClick={() => handleShareMeeting(selectedMeeting)}>
          <Send fontSize="small" className="mr-2" /> Share Invitation
        </MenuItem>
     
      {selectedMeeting?.file_id && (
        <MenuItem
          onClick={() => {
            const fileUrl = `${apiClient.defaults.baseURL}/storage/public/meeting-files/${selectedMeeting.file_id}`;
            window.open(fileUrl, "_blank");
          }}
        >
          <LinkIcon fontSize="small" className="mr-2" /> View Attached File
        </MenuItem>
      )}
      </Menu>
      
      {/* Meeting Scheduler */}
      <MeetingScheduler
        open={showMeetingScheduler}
        onClose={() => setShowMeetingScheduler(false)}
        onSchedule={() => {
          setShowMeetingScheduler(false);
        }}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type}
          sx={{ width: "100%" }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

const StatCard = ({ title, value, trend, color }) => {
  const { t } = useTranslation(['meetings', 'common']);
  const colors = {
    blue: { bg: "#EBF8FF", text: "#3182CE" },
    green: { bg: "#F0FFF4", text: "#38A169" },
    purple: { bg: "#FAF5FF", text: "#805AD5" },
  };

  // Create mapping for translation keys
  const translationKeys = {
    "Active Meetings": "Active_Meetings",
    "Team Members": "Team_Members",
    "Project Progress": "Project_Progress"
  };
  
  // Use the mapping to get the correct key
  const key = translationKeys[title] || title.replace(/ /g, '_');

  return (
    <div
      className="p-5 rounded-xl"
      style={{ backgroundColor: colors[color].bg }}
    >
      <h3 className="text-sm font-medium text-gray-500 mb-2">{t(`meetings.stats.${key}`, { defaultValue: title })}</h3>
      <div className="flex items-baseline space-x-2">
        <span
          className="text-2xl font-semibold"
          style={{ color: colors[color].text }}
        >
          {value}
        </span>
        <span className="text-sm text-gray-500">{trend}</span>
      </div>
    </div>
  );
};

export default Layout;