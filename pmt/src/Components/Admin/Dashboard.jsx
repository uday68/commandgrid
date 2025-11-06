import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  FiHome, FiUsers, FiFolder, FiActivity, FiBarChart, 
  FiFileText, FiShield, FiPlus, FiLogOut, 
  FiVideo, FiFilePlus, FiEdit, FiTrash2,
  FiSun, FiMoon, FiMenu, FiX, FiSettings,
  FiArrowLeft, FiCalendar, FiBell, FiGrid,
  FiClock, FiDollarSign, FiPieChart, FiSliders, FiFile, FiMessageSquare
} from "react-icons/fi";
import { MdPalette, MdBuild, MdOutlineWorkspaces } from "react-icons/md";
import { FaSlack, FaJira, FaTrello, FaCommentAlt } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";

import axios from "axios";
import { Transition } from '@headlessui/react';
import { Helmet } from 'react-helmet';
import SettingsPanel from "../Settings/SettingsPanel";

// Import Admin components
import AdminDashboard from "./AdminDashboard";
import ProjectManager from "./ProjectManager";
import UserManagement from "./UserManagement";
import SystemHealth from "./SystemMetrics";
import AuditConsole from "./AuditLogs";
import SecurityDashboard from "./SecurityDashboard";
import AdminToolsPanel from "./AdminToolsPanel";
import Reports from "./Reports";
import TaskBoard from "./TaskBoard";
import CalendarView from "./CalendarView";
import NotificationsCenter from "./NotificationsCenter";
import TimeTracker from "./TimeTracker";
import BudgetMonitor from "./BudgetMonitor";
import IntegrationPanel from "./IntegrationPanel";
import AnalyticsDashboard from "./AnalyticsDashboard";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminBreadcrumbs from './AdminBreadcrumbs';

// Other components
import CreateProjectModal from "./ProjectModal";
import DataVisualization from "../Data_visualization";
import DataVisualizationV2 from "../DataVisualizationV2";
import FileViewer from '../../pages/FileViewer';
import ChatRoom from '../ChatRoom';
import { Avatar, IconButton, Typography, CircularProgress } from "@mui/material";
import Profile from "../Profile";
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';

// Component with enhanced styling and navigation
const Dashboard = ({ activeItem = "dashboard", onNavigate }) => {
  const navigate = useNavigate();  const [activeTab, setActiveTab] = useState(activeItem);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [showEnhancedVisualizationDemo, setShowEnhancedVisualizationDemo] = useState(false);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [selectedFont, setSelectedFont] = useState('font-inter');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState(["dashboard"]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showAdditionalTool, setShowAdditionalTool] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState('base');
  const [highContrast, setHighContrast] = useState(false);
  const settingsPanelRef = useRef(null);
  const firstFocusableElementRef = useRef(null);
  const lastFocusableElementRef = useRef(null);
  const [error, setError] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);

  const FONT_OPTIONS = [
    { name: 'Inter', class: 'font-inter' },
    { name: 'Roboto', class: 'font-roboto' },
    { name: 'Open Sans', class: 'font-open-sans' },
    { name: 'Poppins', class: 'font-poppins' },
    { name: 'Montserrat', class: 'font-montserrat' },
  ];

  const FONT_SIZES = {
    small: 'text-sm',
    base: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl'
  };

  const themes = {
    light: {
      bg: highContrast ? 'bg-white' : 'bg-gray-50',
      card: highContrast ? 'bg-white' : 'bg-white',
      text: highContrast ? 'text-black' : 'text-gray-800',
      header: highContrast ? 'bg-white' : 'bg-white',
      border: highContrast ? 'border-black' : 'border-gray-200',
      button: highContrast ? 'bg-black text-white' : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white',
      sidebar: highContrast ? 'bg-white' : 'bg-white',
      activeTab: highContrast ? 'bg-black text-white' : 'bg-gradient-to-r from-blue-600 to-blue-800 text-white',
    },
    dark: {
      bg: highContrast ? 'bg-black' : 'bg-gray-900',
      card: highContrast ? 'bg-black' : 'bg-gray-800',
      text: highContrast ? 'text-white' : 'text-gray-100',
      header: highContrast ? 'bg-black' : 'bg-gray-800',
      border: highContrast ? 'border-white' : 'border-gray-700',
      button: highContrast ? 'bg-white text-black' : 'bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white',
      sidebar: highContrast ? 'bg-black' : 'bg-gray-800',
      activeTab: highContrast ? 'bg-white text-black' : 'bg-gradient-to-r from-blue-700 to-blue-900 text-white',
      buttonSecondary: highContrast ? 'bg-gray-700 text-white' : 'bg-gray-700/10 text-gray-700 dark:bg-white/10 dark:text-white hover:bg-gray-700/20 dark:hover:bg-white/20',
      highlight: highContrast ? 'bg-gray-800' : 'bg-blue-50 dark:bg-gray-700/50',
    },
    blue: {
      bg: highContrast ? 'bg-blue-900' : 'bg-blue-50',
      card: highContrast ? 'bg-blue-900' : 'bg-white',
      text: highContrast ? 'text-white' : 'text-blue-900',
      header: highContrast ? 'bg-blue-900' : 'bg-blue-100',
      border: highContrast ? 'border-white' : 'border-blue-200',
      button: highContrast ? 'bg-white text-blue-900' : 'bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white',
      sidebar: highContrast ? 'bg-blue-900' : 'bg-white',
      activeTab: highContrast ? 'bg-white text-blue-900' : 'bg-gradient-to-r from-blue-700 to-blue-900 text-white',
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboardTheme') || 'light';
    const savedFont = localStorage.getItem('dashboardFont') || 'font-inter';
    const savedFontSize = localStorage.getItem('dashboardFontSize') || 'base';
    const savedContrast = localStorage.getItem('highContrast') === 'true';

    setTheme(savedTheme);
    setSelectedFont(savedFont);
    setCurrentFontSize(savedFontSize);
    setHighContrast(savedContrast);

    const fetchData = async () => {
      const token = localStorage.getItem("authToken");
      try {
        const [projectsRes, usersRes] = await Promise.all([
          axios.get("http://localhost:5000/api/projects", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5000/api/users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setProjects(projectsRes.data.projects || []);
        setUsers(usersRes.data.users || []);
        setLiveMessage('Data loaded successfully');
      } catch (err) {
        console.error("Admin data fetch error:", err);
        setLiveMessage('Failed to load data');
      }
    };
    fetchData();

    const handleKeyPress = (e) => {
      if (e.key === 'Tab') {
        setKeyboardFocus(true);
        document.body.classList.add('keyboard-focus');
      }
    };

    const handleClick = () => {
      setKeyboardFocus(false);
      document.body.classList.remove('keyboard-focus');
    };

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    if (isSettingsOpen && settingsPanelRef.current) {
      const focusableElements = settingsPanelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        firstFocusableElementRef.current = focusableElements[0];
        lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];
        firstFocusableElementRef.current.focus();
      }
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    // Update activeTab when activeItem prop changes
    setActiveTab(activeItem);
    // Add to navigation history when changing tabs from props
    if (activeItem !== navigationHistory[navigationHistory.length - 1]) {
      setNavigationHistory(prev => [...prev, activeItem]);
    }
  }, [activeItem]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('dashboardTheme', newTheme);
    setLiveMessage(`Theme changed to ${newTheme}`);
  };

  const handleFontChange = (fontClass) => {
    setSelectedFont(fontClass);
    localStorage.setItem('dashboardFont', fontClass);
    setLiveMessage(`Font changed`);
  };

  const handleFontSizeChange = (size) => {
    setCurrentFontSize(size);
    localStorage.setItem('dashboardFontSize', size);
    document.documentElement.style.fontSize = {
      small: '14px',
      base: '16px',
      large: '18px',
      xlarge: '20px'
    }[size];
    setLiveMessage(`Font size changed to ${size}`);
  };

  const handleHighContrastChange = (enabled) => {
    setHighContrast(enabled);
    localStorage.setItem('highContrast', enabled);
    setLiveMessage(`High contrast mode ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
    setLiveMessage('Logged out successfully');
  };

  const handleTabChange = (tabId) => {
    setNavigationHistory(prev => [...prev, tabId]);
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);

    if (tabId === "community") {
      navigate('/community');
      return;
    }

    // Use React Router navigation to update the URL
    navigate(`/admin/${tabId}`);
    setLiveMessage(`Switched to ${tabId.replace(/-/g, ' ')} tab`);
  };

  const handleKeyNavigation = (e, tabId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabChange(tabId);
    }
  };

  const handleBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      setNavigationHistory(newHistory);
      setActiveTab(newHistory[newHistory.length - 1]);
      setLiveMessage('Navigated back');
    }
  };

  const handleProjectCreate = (projectData) => {
    axios.post("http://localhost:5000/api/projects", projectData, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
    })
    .then((res) => {
      setProjects((prev) => [...prev, res.data]);
      setLiveMessage(`Project "${res.data.name}" created successfully`);
    })
    .catch(err => {
      console.error(err);
      setLiveMessage("Failed to create project");
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSettingsOpen(false);
    }
    if (e.key === 'Tab' && isSettingsOpen) {
      if (e.shiftKey && document.activeElement === firstFocusableElementRef.current) {
        e.preventDefault();
        lastFocusableElementRef.current.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusableElementRef.current) {
        e.preventDefault();
        firstFocusableElementRef.current.focus();
      }
    }
  };

  const handleToggleProfile = () => {
    setShowProfile(prevState => !prevState);
  };

  // Define menu items for the sidebar
  const sidebarMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'projects', label: 'Projects', icon: FiFolder },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'tasks', label: 'Tasks', icon: FiActivity },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart },
    { id: 'reports', label: 'Reports', icon: FiFileText },
    { id: 'security', label: 'Security', icon: FiShield },
    { id: 'calendar', label: 'Calendar', icon: FiCalendar, badge: '3' },
    { id: 'notifications', label: 'Notifications', icon: FiBell, badge: `${unreadNotifications || 0}` },
    { id: 'tools', label: 'Tools', icon: FiSettings },
    { id: 'meetings', label: 'Meetings', icon: FiVideo },
    { id: 'integrations', label: 'Integrations', icon: FiGrid }
  ];

  const tabContentMap = {
    dashboard: () => <AdminDashboard theme={theme} onNavigate={handleTabChange} />,
    projects: () => (
      <section aria-labelledby="projects-heading" >
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 id="projects-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Project Management
            </h2>
            <button
              onClick={() => setShowProjectModal(true)}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 ${themes[theme].button} transition-all hover:scale-105`}
              aria-label="Create new project"
            >
              <FiPlus className="w-5 h-5" />
              <span className="font-semibold">New Project</span>
            </button>
          </div>
          <ProjectManager 
            projects={projects} 
            onUpdate={setProjects} 
            onDelete={(projectId) => {
              axios.delete(`http://localhost:5000/api/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
              })
              .then(() => {
                setProjects(prev => prev.filter(p => p.project_id !== projectId));
                setLiveMessage("Project deleted successfully");
              })
              .catch(err => {
                console.error(err);
                setLiveMessage("Failed to delete project");
              });
            }}
            onAssignManager={(project) => {
              setSelectedProject(project);
              setShowAssignManagerModal(true);
            }}
            theme={theme}
            highContrast={highContrast}
          />
        </div>
      </section>
    ),
    users: () => (
      <section aria-labelledby="users-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="users-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            User Management Dashboard
          </h2>
          <div className={`overflow-x-auto rounded-lg border ${themes[theme].border}`}>
            <UserManagement 
              users={users} 
              theme={theme} 
              highContrast={highContrast}
            />
          </div>
        </div>
      </section>
    ),
    analytics: () => (
      <section aria-labelledby="analytics-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="analytics-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            System Analytics
          </h2>
          <AnalyticsDashboard theme={theme} />
        </div>
      </section>
    ),
    security: () => (
      <section aria-labelledby="security-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="security-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Security Dashboard
          </h2>
          <SecurityDashboard theme={theme} />
        </div>
      </section>
    ),
    audit: () => (
      <section aria-labelledby="audit-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="audit-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Audit Console
          </h2>
          <AuditConsole theme={theme} />
        </div>
      </section>
    ),
    reports: () => (
      <section aria-labelledby="reports-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="reports-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Reports
          </h2>
          <Reports theme={theme} highContrast={highContrast} />
        </div>
      </section>
    ),
    tools: () => (
      <section aria-labelledby="tools-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <div className="flex justify-between items-center mb-6">
            <h2 id="tools-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Advanced Tools
            </h2>
            <button
              onClick={() => setShowVisualModal(true)}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 ${themes[theme].button} transition-all hover:scale-105`}
              aria-label="Create new visualization"
            >
              <FiFilePlus className="w-5 h-5" />
              <span className="font-semibold">New Visualization</span>
            </button>
          </div>
          <AdminToolsPanel theme={theme} />
        </div>
      </section>
    ),
    meetings: () => (
      <section aria-labelledby="meetings-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="meetings-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Video Meetings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button 
              className={`p-6 rounded-xl ${themes[theme].button} flex items-center gap-3 transition-all `}
              onClick={() => navigate('/meeting')}
              aria-label="Start new meeting"
            >
              <FiVideo className="w-6 h-6" />
              <span className="font-semibold">Start New Meeting</span>
            </button>
            <button 
              className={`p-6 rounded-xl border ${themes[theme].border} flex items-center gap-3 transition-all hover:scale-[1.02] hover:border-blue-300`}
              onClick={() => navigate('/meetings')}
              aria-label="Schedule meeting"
            >
              <FiPlus className="w-6 h-6" />
              <span className="font-semibold">Schedule Meeting</span>
            </button>
          </div>
          <div className={`p-6 rounded-xl border ${themes[theme].border}`}>
            <h3 className="text-lg font-semibold mb-4">Upcoming Meetings</h3>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className={`p-4 rounded-lg border ${themes[theme].border} hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Project Kickoff Meeting</h4>
                      <p className="text-sm opacity-75">Tomorrow, 10:00 AM</p>
                    </div>
                    <button 
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="Join meeting"
                    >
                      <FiVideo className="w-5 h-5 text-blue-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    ),
    calendar: () => (
      <section aria-labelledby="calendar-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="calendar-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Project Calendar
          </h2>
          <CalendarView projects={projects} theme={theme} highContrast={highContrast} />
        </div>
      </section>
    ),
    tasks: () => (
      <section aria-labelledby="tasks-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="tasks-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Task Management
          </h2>
          <TaskBoard projects={projects} users={users} theme={theme} highContrast={highContrast} />
        </div>
      </section>
    ),
    notifications: () => (
      <section aria-labelledby="notifications-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="notifications-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            System Notifications
          </h2>
          <NotificationsCenter 
            theme={theme} 
            highContrast={highContrast}
            onMarkAsRead={() => setUnreadNotifications(0)}
          />
        </div>
      </section>
    ),
    time: () => (
      <section aria-labelledby="time-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="time-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Time Tracking
          </h2>
          <TimeTracker projects={projects} theme={theme} highContrast={highContrast} />
        </div>
      </section>
    ),
    budget: () => (
      <section aria-labelledby="budget-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="budget-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Budget Monitoring
          </h2>
          <BudgetMonitor projects={projects} theme={theme} highContrast={highContrast} />
        </div>
      </section>
    ),
    integrations: () => (
      <section aria-labelledby="integrations-heading" className="w-full">
        <div className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
          <h2 id="integrations-heading" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
            Third-Party Integrations
          </h2>
          <IntegrationPanel theme={theme} />
        </div>
      </section>
    )
  };

  const renderFallbackContent = () => {
    return (
      <section className={`rounded-2xl shadow-xl p-6 ${themes[theme].card} backdrop-blur-lg bg-opacity-90`}>
        <div className="text-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className={`text-xl font-semibold mb-2 ${themes[theme].text}`}>Loading Content...</h3>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            The requested section is currently loading or unavailable.
          </p>
        </div>
      </section>
    );
  };

  return (
    <div 
      className={`min-h-screen w-[85%] mx-auto ${themes[theme].bg} ${themes[theme].text} ${selectedFont} ${FONT_SIZES[currentFontSize]} transition-all duration-200`}
      onKeyDown={handleKeyDown}
    >
      <Helmet>
        <title>Admin Dashboard - Project Management System</title>
        <meta name="description" content="Comprehensive administration dashboard for managing projects, users, and system settings" />
        <html className={theme} />
      </Helmet>

      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {liveMessage}
      </div>

      <header className={`md:hidden flex items-center justify-between p-4 backdrop-blur-lg bg-opacity-90 sticky top-0 z-50 ${themes[theme].header} shadow-sm`}>
        <button
          onClick={handleBack}
          className="p-2 mr-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Navigate back"
        >
          <FiArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex-1 text-center capitalize">
          {activeTab.replace(/-/g, ' ')}
        </h1>
        <div className="flex items-center space-x-2">
          {/* Add Data Visualization Button */}
          <button
            onClick={() => setShowVisualModal(true)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Open data visualization"
          >
            <FiPieChart size={20} />
          </button>

          {/* Add Chat Room Button */}
          <button
            onClick={() => setShowChatRoom(true)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Open chat room"
          >
            <FaCommentAlt size={20} />
          </button>

          {/* Add Meetings Button */}
          <button
            onClick={() => navigate('/meetings')}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Go to meetings"
          >
            <FiVideo size={20} />
          </button>

          {/* Add File Viewer Button */}
          <button
            onClick={() => setShowFileViewer(true)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Open file viewer"
          >
            <FiFile size={20} />
          </button>
          
          {/* Add Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Open settings"
          >
            <FiSettings size={20} />
          </button>
          
          {/* Add Profile Button */}
          <button
            onClick={handleToggleProfile}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle profile"
          >
            <PersonIcon style={{ fontSize: '20px' }} />
          </button>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </header>

      <main id="main-content" className="w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-4 md:pt-8">
        {/* Add a header with icons for desktop view */}
        <div className="hidden md:flex justify-between items-center mb-6">
          <AdminBreadcrumbs 
            path={`/admin/${activeTab}`} 
            theme={theme} 
            onNavigate={handleTabChange}
          />
          <div className="flex items-center space-x-3">            {/* Add Data Visualization Button */}
            <button
              onClick={() => setShowEnhancedVisualizationDemo(true)}
              className={`p-2 rounded-lg ${themes[theme].buttonSecondary || 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors flex items-center gap-2`}
              aria-label="Open enhanced data visualization demo"
            >
              <FiPieChart size={16} />
              <span className="hidden sm:inline">Visualize</span>
            </button>

            {/* Add Meeting Button */}
            <button
              onClick={() => navigate('/meetings')}
              className={`p-2 rounded-lg ${themes[theme].buttonSecondary || 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors flex items-center gap-2`}
              aria-label="Go to meetings"
            >
              <FiVideo size={16} />
              <span className="hidden sm:inline">Meetings</span>
            </button>

            <button
              onClick={() => setShowFileViewer(true)}
              className={`p-2 rounded-lg ${themes[theme].buttonSecondary || 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors flex items-center gap-2`}
              aria-label="Open file viewer"
            >
              <FiFile size={16} />
              <span className="hidden sm:inline">Files</span>
            </button>
            <button
              onClick={() => setShowChatRoom(true)}
              className={`p-2 rounded-lg ${themes[theme].buttonSecondary || 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors flex items-center gap-2`}
              aria-label="Open chat"
            >
              <FaCommentAlt size={16} />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-lg ${themes[theme].buttonSecondary || 'hover:bg-gray-200 dark:hover:bg-gray-700'} transition-colors flex items-center gap-2`}
              aria-label="Open settings"
            >
              <FiSettings size={16} />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={handleToggleProfile}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="View profile"
            >
              <Avatar sx={{ width: 36, height: 36 }}>
                <PersonIcon />
              </Avatar>
            </button>
          </div>
        </div>

        <div className="flex gap-8 flex-col md:flex-row">
          <nav 
            aria-label="Main navigation"
            className={`w-full md:w-64 space-y-2 ${isMobileMenuOpen ? "block" : "hidden md:block"}`}
          >
            <AdminSidebar
              activeItem={activeTab}
              onItemClick={handleTabChange}
              theme={theme}
              isMobile={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              onLogout={handleLogout}
              unreadNotifications={unreadNotifications}
              menuItems={sidebarMenuItems}
            />
          </nav>

          <div className="flex-1 space-y-6 w-full">
            <Suspense fallback={
              <div className="flex justify-center items-center h-64">
                <CircularProgress />
              </div>
            }>
              {tabContentMap[activeTab] ? tabContentMap[activeTab]() : renderFallbackContent()}
            </Suspense>
          </div>
        </div>
      </main>

      <DataVisualization
        isOpen={showVisualModal}
        onClose={() => setShowVisualModal(false)}
        theme={theme}
        highContrast={highContrast}
      />

      <CreateProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        users={users.filter((u) => ["Admin", "Project Manager"].includes(u.role))}
        onSubmit={handleProjectCreate}
        theme={theme}
        highContrast={highContrast}
      />

      {/* Add Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex justify-end w-[100%]">
          <div className="fixed inset-0 bg-black/30" onClick={handleToggleProfile} />
          <div className={`w-full max-w-[900px] ${themes[theme].card} h-full shadow-xl p-6 overflow-y-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Your Profile</h3>
              <button onClick={handleToggleProfile} aria-label="Close profile">
                <CloseIcon />
              </button>
            </div>
            <Profile />
          </div>
        </div>
      )}

      {/* Add Settings Panel */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setIsSettingsOpen(false)} />
          <div 
            ref={settingsPanelRef}
            className={`w-full max-w-sm ${themes[theme].card} h-full shadow-xl p-6 overflow-y-auto`}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Settings</h3>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close settings"
                ref={lastFocusableElementRef}
              >
                <CloseIcon />
              </button>
            </div>
            
            {/* Settings content */}
            <SettingsPanel
              theme={theme}
              selectedFont={selectedFont}
              currentFontSize={currentFontSize}
              highContrast={highContrast}
              onThemeChange={handleThemeChange}
              onFontChange={handleFontChange}

              onFontSizeChange={handleFontSizeChange}
              onHighContrastChange={handleHighContrastChange}
              />
          </div>

        </div>
        )}

      {/* Add FileViewer Modal */}
      {showFileViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowFileViewer(false)} />
          <div className={`w-full max-w-4xl ${themes[theme].card} h-[90%] shadow-xl rounded-lg overflow-hidden`}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold">File Viewer</h3>
              <button 
                onClick={() => setShowFileViewer(false)} 
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close file viewer"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="h-full p-4 overflow-auto">
              <FileViewer />
            </div>
          </div>
        </div>      )}      {/* Enhanced Data Visualization Demo */}
      <DataVisualizationV2
        isOpen={showEnhancedVisualizationDemo}
        onClose={() => setShowEnhancedVisualizationDemo(false)}
      />

      {/* Add ChatRoom Modal */}
      {showChatRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowChatRoom(false)} />
          <div className={`w-full max-w-4xl ${themes[theme].card} h-[90%] shadow-xl rounded-lg overflow-hidden`}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold">Chat Room</h3>
              <button 
                onClick={() => setShowChatRoom(false)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="h-full">
              <ChatRoom />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;