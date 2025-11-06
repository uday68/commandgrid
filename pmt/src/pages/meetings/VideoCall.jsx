import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { v4 as uuidv4 } from 'uuid';
import { useRealtimeConnection } from '../../utils/realtimeManager';
import { toast } from 'react-toastify';
import { apiClient, auth, db } from './apiClient';
import { Alert, Button, IconButton, TextField, Avatar, Box, Badge, Tooltip } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff, ScreenShare, StopScreenShare, Chat, People, Call, CallEnd } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import socketManager from '../../utils/socketManager';
import axios from 'axios';

const VideoCall = ({ userRole = 'participant', companyId }) => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // State management
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [muted, setMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [files, setFiles] = useState([]);
  const [reportContent, setReportContent] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initializingAgora, setInitializingAgora] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const clientRef = useRef();
  const messagesEndRef = useRef();
  const connectionStatus = useRealtimeConnection();
  const localVideoRef = useRef(null);

  // Initialize Agora and fetch data
  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        let userData = null;
        
        // Try to get user data from API
        try {
          const { data } = await auth.getSession();
          if (data?.user) {
            userData = data.user;
          } else {
            // Try fallback to local storage
            const token = localStorage.getItem('authToken');
            if (token) {
              const response = await axios.get('/api/user/profile', {
                headers: { Authorization: `Bearer ${token}` }
              });
              userData = response.data;
              setUsingFallback(true);
            }
          }
        } catch (authError) {
          console.warn("Auth error, trying fallback:", authError);
          
          // Fallback: Try to get user from local storage
          try {
            const token = localStorage.getItem('authToken');
            if (token) {
              const response = await axios.get('/api/user/profile', {
                headers: { Authorization: `Bearer ${token}` }
              });
              userData = response.data;
              setUsingFallback(true);
            }
          } catch (fallbackError) {
            console.error("Fallback auth also failed:", fallbackError);
            throw new Error('User authentication failed');
          }
        }
        
        if (!userData) {
          throw new Error('User not authenticated');
        }
        
        setUser(userData);

        // Fetch meeting data from API
        let meetingData = null;
        
        try {
          // Use axios instead of db.fetch for meeting data
          const response = await axios.get(`/api/meetings/${meetingId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
          });
          
          if (response.data) {
            meetingData = response.data;
          } else {
            throw new Error('Meeting data not found');
          }
        } catch (apiError) {
          console.warn("Meeting fetch error, trying fallback:", apiError);
          
          // Fallback: Get meeting data from backend API with different endpoint
          try {
            const response = await axios.get(`/api/meetings/${meetingId}/details`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            meetingData = response.data;
            
            // Format participants if needed
            if (response.data.participants) {
              meetingData.participants = response.data.participants.map(p => ({
                user: p
              }));
            } else {
              meetingData.participants = [];
            }
            
            setUsingFallback(true);
          } catch (fallbackError) {
            console.error("Fallback meeting fetch also failed:", fallbackError);
            throw new Error('Meeting not found or you do not have access');
          }
        }
        
        if (!meetingData) {
          throw new Error('Meeting data could not be retrieved');
        }
        
        setMeeting(meetingData);
        setParticipants(meetingData.participants?.map(p => p.user) || []);
        
        // Fetch existing messages
        await loadExistingMessages(meetingId);
        
        // Continue with Agora initialization
        await initializeAgora(userData, meetingData);
        
      } catch (err) {
        console.error("Error fetching meeting data:", err);
        setError(err.message || 'Failed to load meeting data');
        setLoading(false);
      }
    };
    
    fetchMeetingData();
    
    // Initialize socket connection for chat
    initSocketConnection();
    
    // Cleanup function
    return () => {
      // Destroy and close tracks when component unmounts
      localTracks.forEach(track => track?.close());
      clientRef.current?.leave();
      
      // Clean up socket listeners
      socketManager.disconnect();
    };
  }, [meetingId]);
  
  const initSocketConnection = () => {
    // Get token from local storage
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found for socket connection');
      return;
    }
    
    // Connect to socket server with authentication
    socketManager.connect({ token })
      .then(() => {
        setSocketConnected(true);
        console.log('Socket connection established');
        
        // Join meeting room
        socketManager.joinRoom({ roomId: `meeting_${meetingId}` }, 
          // Message handler
          (message) => {
            setMessages(prev => [...prev, message]);
            if (!chatOpen) {
              setUnreadMessages(count => count + 1);
            }
          },
          // Active users handler
          (users) => {
            console.log('Active users updated:', users);
            // You can update UI with active users here if needed
          }
        );
      })
      .catch(err => {
        console.error('Socket connection failed:', err);
        toast.error('Chat connection failed. Messages will not be real-time.');
      });
  };
  
  const loadExistingMessages = async (meetingId) => {
    try {
      let messagesData = [];
      
      // Get messages from API using axios
      try {
        const response = await axios.get(`/api/meetings/${meetingId}/messages`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        });
          
        if (response.data) {
          messagesData = response.data;
        } else {
          throw new Error('Messages not found');
        }
      } catch (apiError) {
        console.warn("Failed to load messages, trying fallback API:", apiError);
        
        // Fallback: Get messages from alternative backend API endpoint
        try {
          const response = await axios.get(`/api/meetings/${meetingId}/chat`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
          });
          messagesData = response.data;
        } catch (fallbackError) {
          console.error("Fallback messages fetch also failed:", fallbackError);
          // We'll continue with empty messages array - it's not critical to fail the entire component
          messagesData = [];
        }
      }
      
      setMessages(messagesData);
    } catch (err) {
      console.error("Error loading messages:", err);
      toast.error('Failed to load previous messages');
    }
  };
  
  const initializeAgora = async (userData, meetingData) => {
    setInitializingAgora(true);
    
    try {
      // Initialize Agora client
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      
      // Use meeting ID as channel name and generate a temporary App ID and token
      const channelName = meetingId;
      const appId = meetingData.agora_app_id || process.env.REACT_APP_AGORA_APP_ID || '1234567890abcdef1234567890abcdef';
      const uid = userData.user_id;
      
      // Try to get token from backend
      let token = null;
      try {
        // Try to fetch a proper token from backend
        const response = await axios.get(`/api/meetings/${meetingId}/token`);
        if (response.data && response.data.token) {
          token = response.data.token;
        }
      } catch (tokenError) {
        console.warn('Could not get Agora token from server, using token-free mode:', tokenError);
      }
      
      // Join the channel
      try {
        await clientRef.current.join(
          appId,
          channelName,
          token, // Will use null for token-free testing mode if token fetch failed
          uid
        );
        
        // Create and publish local tracks
        try {
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks({
            encoderConfig: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 }
            }
          }, {
            encoderConfig: "high"
          });
          
          await clientRef.current.publish([audioTrack, videoTrack]);
          
          setLocalTracks([audioTrack, videoTrack]);
          
          // Display local video
          if (localVideoRef.current) {
            videoTrack.play(localVideoRef.current);
          }
          
        } catch (mediaError) {
          console.error("Media device error:", mediaError);
          toast.error('Failed to access camera or microphone. Please check your device permissions.');
          
          // Continue with meeting without media devices
          setVideoDisabled(true);
          setMuted(true);
        }
        
        // Set up event listeners for remote users
        clientRef.current.on('user-published', async (user, mediaType) => {
          await clientRef.current.subscribe(user, mediaType);
          
          if (mediaType === 'video') {
            setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
            setTimeout(() => {
              // Add a slight delay to ensure DOM element exists
              user.videoTrack?.play(`remote-video-${user.uid}`);
            }, 200);
          }
          
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });
        
        clientRef.current.on('user-left', (user) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });
        
      } catch (joinError) {
        console.error("Error joining meeting:", joinError);
        throw new Error('Failed to join the meeting room. Please check your internet connection and try again.');
      }
      
      setLoading(false);
      setInitializingAgora(false);
    } catch (err) {
      console.error("Error initializing video call:", err);
      setError(err.message || 'Failed to initialize video call');
      setLoading(false);
      setInitializingAgora(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const messageData = {
        meeting_id: meetingId,
        sender_id: user.user_id,
        message: newMessage,
        sent_at: new Date().toISOString(),
        sender: {
          name: user.name,
          profile_picture: user.profile_picture
        }
      };
      
      // If socket is connected, send through Socket.IO 
      if (socketConnected) {
        socketManager.sendMessage({
          roomId: `meeting_${meetingId}`,
          message: messageData
        });
        
        // Optimistically add to messages list
        setMessages(prev => [...prev, messageData]);
      } else {
        // Fallback: Send through REST API using axios
        await axios.post(`/api/meetings/${meetingId}/messages`, {
          message: newMessage,
          sender_id: user.user_id,
          sent_at: new Date().toISOString()
        }, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Also add to local messages state to ensure UI updates
        setMessages(prev => [...prev, messageData]);
      }
        
      setNewMessage('');
    } catch (err) {
      toast.error('Failed to send message');
      console.error(err);
    }
  };
  
  const toggleMute = async () => {
    if (localTracks[0]) {
      localTracks[0].setEnabled(!muted);
      setMuted(!muted);
    }
  };
  
  const toggleVideo = async () => {
    if (localTracks[1]) {
      localTracks[1].setEnabled(!videoDisabled);
      setVideoDisabled(!videoDisabled);
    }
  };
  
  const startScreenSharing = async () => {
    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack();
      
      // Replace the camera track with screen track
      await clientRef.current.unpublish(localTracks[1]);
      await clientRef.current.publish(screenTrack);
      
      // Update localTracks
      const tracks = [...localTracks];
      if (tracks[1]) {
        tracks[1].close();
      }
      tracks[1] = screenTrack;
      setLocalTracks(tracks);
      setScreenSharing(true);
      
      // Listen for screen sharing stopped event
      screenTrack.on('track-ended', stopScreenSharing);
    } catch (err) {
      toast.error('Failed to start screen sharing');
      console.error(err);
    }
  };
  
  const stopScreenSharing = async () => {
    try {
      // Replace screen track with camera track again
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      
      await clientRef.current.unpublish(localTracks[1]);
      await clientRef.current.publish(videoTrack);
      
      // Update localTracks
      const tracks = [...localTracks];
      if (tracks[1]) {
        tracks[1].close();
      }
      tracks[1] = videoTrack;
      setLocalTracks(tracks);
      setScreenSharing(false);
    } catch (err) {
      toast.error('Failed to stop screen sharing');
      console.error(err);
    }
  };
  
  const leaveMeeting = () => {
    // Close tracks and leave channel
    localTracks.forEach(track => track?.close());
    clientRef.current?.leave();
    
    // Leave Socket.IO room if connected
    if (socketConnected) {
      socketManager.leaveRoom(`meeting_${meetingId}`);
    }
    
    // Redirect back to meetings page
    navigate('/meetings');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">
            {initializingAgora ? 'Connecting to meeting...' : 'Loading meeting data...'}
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
        <Alert severity="error" className="mb-4 max-w-lg">
          {error}
        </Alert>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/meetings')}
        >
          Return to Meetings
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Meeting header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl font-semibold">{meeting?.title || 'Meeting'}</h1>
          <p className="text-sm text-gray-300">
            {meeting?.participants?.length || 0} participants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge badgeContent={unreadMessages} color="error">
            <IconButton 
              color="inherit" 
              onClick={() => setChatOpen(!chatOpen)}
            >
              <Chat />
            </IconButton>
          </Badge>
          <IconButton 
            color="inherit"
            onClick={() => setShowAdminPanel(!showAdminPanel)}
          >
            <People />
          </IconButton>
        </div>
      </div>

      {/* Meeting content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main video area */}
        <div className="flex-1 p-4 bg-black relative">
          {/* Grid of videos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* Local video */}
            <div className="bg-gray-800 rounded-lg overflow-hidden relative">
              <div ref={localVideoRef} className="w-full h-full"></div>
              <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-60 px-2 py-1 rounded text-white text-sm">
                You {muted && '(muted)'}
              </div>
            </div>
            
            {/* Remote videos */}
            {remoteUsers.map(user => (
              <div key={user.uid} className="bg-gray-800 rounded-lg overflow-hidden relative">
                <div id={`remote-video-${user.uid}`} className="w-full h-full"></div>
                <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-60 px-2 py-1 rounded text-white text-sm">
                  {participants.find(p => p.user_id === user.uid)?.name || 'Participant'}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Chat panel (conditional) */}
        {chatOpen && (
          <div className="w-80 bg-white border-l border-gray-300 flex flex-col">
            <div className="p-3 border-b border-gray-200 font-medium">
              Chat
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {messages.map((message, index) => (
                <div key={message.id || index} className="mb-3">
                  <div className="flex items-center mb-1">
                    <Avatar 
                      src={participants.find(p => p.user_id === message.sender_id)?.profile_picture} 
                      sx={{ width: 24, height: 24, mr: 1 }}
                    >
                      {participants.find(p => p.user_id === message.sender_id)?.name?.charAt(0)}
                    </Avatar>
                    <span className="text-sm font-medium">
                      {participants.find(p => p.user_id === message.sender_id)?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {new Date(message.sent_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="pl-8 text-sm">{message.message}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-gray-200 flex">
              <TextField 
                size="small"
                fullWidth
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                sx={{ ml: 1 }}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 text-white p-4 flex justify-center items-center gap-4">
        <Tooltip title={muted ? "Unmute" : "Mute"}>
          <IconButton 
            onClick={toggleMute}
            color="inherit"
            className={`${muted ? 'bg-red-500/20' : 'bg-gray-700'} hover:bg-opacity-80`}
          >
            {muted ? <MicOff /> : <Mic />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title={videoDisabled ? "Start Video" : "Stop Video"}>
          <IconButton 
            onClick={toggleVideo}
            color="inherit"
            className={`${videoDisabled ? 'bg-red-500/20' : 'bg-gray-700'} hover:bg-opacity-80`}
          >
            {videoDisabled ? <VideocamOff /> : <Videocam />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title={screenSharing ? "Stop Sharing" : "Share Screen"}>
          <IconButton 
            onClick={screenSharing ? stopScreenSharing : startScreenSharing}
            color="inherit"
            className={`${screenSharing ? 'bg-green-500/20' : 'bg-gray-700'} hover:bg-opacity-80`}
          >
            {screenSharing ? <StopScreenShare /> : <ScreenShare />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title="End Call">
          <IconButton 
            onClick={leaveMeeting}
            className="bg-red-600 hover:bg-red-700"
            color="inherit"
          >
            <CallEnd />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};

export default VideoCall;