import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChartBarIcon, 
  UserGroupIcon,
  ClockIcon,
  BellIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { FiFolder, FiCheckCircle, FiUsers, FiFileText, FiRefreshCw, FiBarChart2 } from 'react-icons/fi';
import ProjectProgressChart from '../Components/ProjectProgressChart';
import TeamMemberCard from '../Components/TeamMemberCard';
import DashboardMetricCard from '../Components/DashboardMetricCard';
import RecentActivities from '../Components/RecentActivities';
import ProjectCard from '../Components/ProjectCard';
import LoadingSpinner from '../Components/LoadingSpinner';
import ErrorMessage from '../Components/ErrorMessage';
import TaskCompletionManager from '../Components/TaskCompletionManager';
import { useProjects } from '../hooks/useApi';
import ProjectSubmissionModal from '../Components/ProjectSubmissionModal';

const ProjectManagerInterface = () => {
  const { t } = useTranslation(['projects', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get current tab from URL or default to dashboard
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/projects') && !path.includes('/dashboard')) return 'projects';
    if (path.includes('/teams')) return 'teams';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/reports')) return 'reports';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getCurrentTab());
  const [dashboardData, setDashboardData] = useState({
    projects: [],
    metrics: {},
    teamMembers: [],
    activities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedProjectForSubmission, setSelectedProjectForSubmission] = useState(null);
  // Use the projects hook for assigned projects only  
  const { loading: projectsLoading, error: projectsError, refetch: refetchProjects } = useProjects({
    onSuccess: (data) => {
      if (data && Array.isArray(data.projects)) {
        setDashboardData(prevState => ({ ...prevState, projects: data.projects }));
      }
    }
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Get company ID from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const companyId = userData.companyId || '';
      
      const baseApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/projectmanager';
      
      if (!companyId) {
        console.warn('Company ID not found in localStorage. Using fallback API endpoints.');
      }
      
      // Use Promise.all to make parallel requests
      const [metricsRes, teamMembersRes, activitiesRes] = await Promise.all([
        axios.get(`${baseApiUrl}/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { companyId }
        }),
        axios.get(`${baseApiUrl}/team/members`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { companyId }
        }),
        axios.get(`${baseApiUrl}/activities/recent`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { companyId }
        })
      ]);
      
      setDashboardData(prevState => ({
        ...prevState,
        metrics: metricsRes.data || {},
        teamMembers: teamMembersRes.data.members || [],
        activities: activitiesRes.data.activities || []
      }));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(t('errors.dataFetchFailed'));
      toast.error(t('errors.dataFetchFailed'));
    } finally {
      setLoading(false);      setRefreshing(false);
    }
  }, [t]);
  
  useEffect(() => {
    // Update document title based on active tab
    const titles = {
      dashboard: 'Project Manager Dashboard - PMT',
      projects: 'Assigned Projects - PMT',
      teams: 'Team Management - PMT',
      tasks: 'Task Management - PMT',
      reports: 'Reports - PMT'
    };
    document.title = titles[activeTab] || 'Project Manager - PMT';
    
    // Fetch data when component mounts or tab changes
    if (activeTab === 'dashboard' || activeTab === 'projects') {
      fetchDashboardData();
    }
  }, [activeTab, fetchDashboardData]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL without page reload
    const routes = {
      dashboard: '/projects', // Default route for dashboard
      projects: '/projects/list',
      teams: '/teams',
      tasks: '/tasks',
      reports: '/reports'
    };
    navigate(routes[tab] || '/projects');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'projects') {
      refetchProjects();
    }
    fetchDashboardData();
    toast.success(t('common.refreshed'));
  };

  const handleProjectSubmission = (project) => {
    setSelectedProjectForSubmission(project);
    setShowSubmissionModal(true);
  };

  const handleSubmissionComplete = async (submissionData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/projectmanager/submit-project`,
        {
          project_id: selectedProjectForSubmission.project_id,
          ...submissionData
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('Project submitted successfully!');
        setShowSubmissionModal(false);
        setSelectedProjectForSubmission(null);
        // Refresh the projects list
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error submitting project:', error);
      toast.error('Failed to submit project. Please try again.');
    }
  };

  // Sidebar navigation for Project Manager with proper role indication
  const sidebarLinks = [
    { 
      path: '/projects', 
      label: 'Dashboard', 
      icon: FiBarChart2,
      onClick: () => handleTabChange('dashboard'),
      isActive: activeTab === 'dashboard'
    },
    { 
      path: '/projects/list', 
      label: 'Projects', 
      icon: FiFolder,
      onClick: () => handleTabChange('projects'),
      isActive: activeTab === 'projects'
    },
    { 
      path: '/teams', 
      label: 'Teams', 
      icon: FiUsers,
      onClick: () => handleTabChange('teams'),
      isActive: activeTab === 'teams'
    },
    { 
      path: '/tasks', 
      label: 'Tasks', 
      icon: FiCheckCircle,
      onClick: () => handleTabChange('tasks'),
      isActive: activeTab === 'tasks'
    },
    { 
      path: '/reports', 
      label: 'Reports', 
      icon: FiFileText,
      onClick: () => handleTabChange('reports'),
      isActive: activeTab === 'reports'
    }
  ];

  if ((loading && !refreshing) || projectsLoading) return <LoadingSpinner />;
  if (error || projectsError) return <ErrorMessage message={error || projectsError} />;

  const renderDashboardContent = () => (
    <div className="max-w-7xl mx-auto">
      {/* Header with subordinate role indicator */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Project Manager Dashboard</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                Subordinate Role
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <UserGroupIcon className="w-4 h-4 mr-1" />
                Managed by Admin
              </div>
              <span className="text-slate-400">•</span>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Works on assigned projects only
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Hierarchy Level</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Admin</span>
              <ChartBarIcon className="w-3 h-3 text-slate-400" />
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Project Manager</span>
            </div>
          </div>
          <button 
            onClick={handleRefresh} 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50"
            disabled={refreshing}
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Access Notice */}
      <div className="mb-6">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
              Limited Access: You can only view and manage projects assigned by your Admin
            </p>
          </div>
        </div>
      </div>
        {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        <DashboardMetricCard
          title="Assigned Projects"
          value={dashboardData.projects.length}
          icon={<FiFolder className="w-6 h-6 text-orange-500" />}
          className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 dark:from-orange-900/20 dark:to-orange-900/30 dark:border-orange-800"
          trend={dashboardData.metrics.projectGrowth}
          subtitle="Admin-assigned only"
        />
        <DashboardMetricCard
          title="Completed Projects"
          value={dashboardData.projects.filter(p => p.status === 'completed').length}
          icon={<FiCheckCircle className="w-6 h-6 text-emerald-500" />}
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-900/30 dark:border-emerald-800"
          trend={dashboardData.metrics.completionRate}
          subtitle="Successfully delivered"
        />
        <DashboardMetricCard
          title="Team Members"
          value={dashboardData.teamMembers.length}
          icon={<FiUsers className="w-6 h-6 text-violet-500" />}
          className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 dark:from-violet-900/20 dark:to-violet-900/30 dark:border-violet-800"
          trend={dashboardData.metrics.teamGrowth}
          subtitle="Under supervision"
        />        <DashboardMetricCard
          title="Active Tasks"
          value={dashboardData.metrics.totalTasks || 0}
          icon={<FiFileText className="w-6 h-6 text-amber-500" />}
          className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-900/20 dark:to-amber-900/30 dark:border-amber-800"
          trend={dashboardData.metrics.taskCompletion}
          subtitle="In progress"
        />
        <DashboardMetricCard
          title="Submitted Projects"
          value={dashboardData.projects.filter(p => p.submission_status === 'submitted').length}
          icon={<CheckCircleIcon className="w-6 h-6 text-purple-500" />}
          className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-900/30 dark:border-purple-800"
          trend={dashboardData.metrics.submissionRate}
          subtitle="Awaiting review"
        />
      </div>

      {/* Project Progress Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Project Progress Overview</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Read-only View
          </span>
        </div>
        <ProjectProgressChart projects={dashboardData.projects} />
      </div>

      {/* Team Members and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Recent Activities</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs py-1 px-2 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full">
                  {dashboardData.activities.length} new
                </span>
                <span className="text-xs py-1 px-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full">
                  Limited View
                </span>
              </div>
            </div>
            <RecentActivities activities={dashboardData.activities} />
          </div>
        </div>
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Team Members</h2>
              <span className="text-xs py-1 px-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full">
                View Only
              </span>
            </div>
            <div className="space-y-4">
              {dashboardData.teamMembers.slice(0, 5).map((member,index) => (
                <div key={index} className="relative">
                  <TeamMemberCard member={member} />
                  {member.role === 'Admin' && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        Superior
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {dashboardData.teamMembers.length > 5 && (
                <button 
                  className="w-full py-2 mt-2 border border-orange-200 dark:border-orange-700 rounded-lg text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-600 transition-colors text-sm font-medium"
                  onClick={() => handleTabChange('teams')}
                >
                  View All Members
                </button>
              )}
            </div>
          </div>
        </div>
      </div>      {/* Quick Actions for Project Manager */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => handleTabChange('teams')}
            className="flex items-center gap-3 p-4 rounded-lg border border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20 transition-colors"
          >
            <UserPlusIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div className="text-left">
              <p className="font-medium text-slate-800 dark:text-slate-200">Create Team</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Organize project members</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleTabChange('tasks')}
            className="flex items-center gap-3 p-4 rounded-lg border border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20 transition-colors"
          >
            <DocumentPlusIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div className="text-left">
              <p className="font-medium text-slate-800 dark:text-slate-200">Create Task</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Assign work to team</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleTabChange('reports')}
            className="flex items-center gap-3 p-4 rounded-lg border border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20 transition-colors"
          >
            <FiFileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <div className="text-left">
              <p className="font-medium text-slate-800 dark:text-slate-200">View Reports</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Check team reports</p>
            </div>
          </button>

          <button 
            onClick={() => handleTabChange('projects')}
            className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20 transition-colors"
          >
            <CheckCircleIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <div className="text-left">
              <p className="font-medium text-slate-800 dark:text-slate-200">Submit Projects</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Complete & handover</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderProjectsContent = () => (
    <div className="max-w-7xl mx-auto">
      {/* Projects Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Your Assigned Projects</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Projects assigned to you by Admin • You cannot create new projects
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <ClockIcon className="w-4 h-4" />
          <span>Total: {dashboardData.projects.length} project(s)</span>
        </div>
      </div>
      
      {dashboardData.projects.length > 0 ? (        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardData.projects.map((project,index) => (
            <div key={index} className="relative">
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  Admin Assigned
                </span>
              </div>
              <ProjectCard 
                project={project}
                onClick={() => window.location.href = `/projects/${project.project_id}`}
                className="border-l-4 border-orange-400 hover:border-orange-500 transition-colors"
              />
                {/* Submit Project Button for Completed Projects */}
              {project.status === 'completed' && project.submission_status !== 'submitted' && (
                <div className="absolute bottom-3 right-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProjectSubmission(project);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                    title="Submit completed project with reports and files"
                  >
                    <DocumentPlusIcon className="w-4 h-4" />
                    Submit Project
                  </button>
                </div>
              )}
              
              {/* Already Submitted Status */}
              {project.submission_status === 'submitted' && (
                <div className="absolute bottom-3 right-3">
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-lg">
                    <CheckCircleIcon className="w-4 h-4" />
                    Submitted for Review
                  </span>
                </div>
              )}
              
              {/* In Progress Projects - Show Submit when ready */}
              {(project.status === 'active' || project.status === 'in-progress') && project.progress >= 95 && project.submission_status !== 'submitted' && (
                <div className="absolute bottom-3 right-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProjectSubmission(project);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                    title="Mark as complete and submit project"
                  >
                    <DocumentPlusIcon className="w-4 h-4" />
                    Complete & Submit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-sm p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
            <FiFolder className="w-8 h-8 text-orange-500 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No Projects Assigned</h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
            You don&apos;t have any projects assigned yet. Contact your Admin to get projects assigned to you.
          </p>
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-800 dark:text-orange-200 text-center">
              <strong>Note:</strong> As a Project Manager, you cannot create projects. Only Admins can create and assign projects.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'projects':
        return renderProjectsContent();
      case 'teams':
        return (
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">Team Management</h1>
            <p className="text-slate-600 dark:text-slate-400">Team management features will be implemented here.</p>
          </div>
        );      case 'tasks':
        return (
          <div className="max-w-7xl mx-auto p-6">
            <TaskCompletionManager 
              onTaskUpdate={(task) => {
                // Refresh metrics when a task is updated
                fetchDashboardData();
                toast.success(`Task "${task.title}" updated successfully`);
              }}
            />
          </div>
        );
      case 'reports':
        return (
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">Reports</h1>
            <p className="text-slate-600 dark:text-slate-400">Reports features will be implemented here.</p>
          </div>
        );
      default:
        return renderDashboardContent();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Custom Sidebar for Project Manager */}
      <div className="w-64 bg-white dark:bg-slate-800 shadow-lg border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Project Manager</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Subordinate to Admin</p>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1">
          {sidebarLinks.map((link, index) => (
            <button
              key={index}
              onClick={link.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                link.isActive 
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <link.icon className="w-5 h-5" />
              <span className="font-medium">{link.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <p>Role: Project Manager</p>
            <p>Permissions: Limited</p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {renderTabContent()}
      </div>

      {/* Project Submission Modal */}
      {showSubmissionModal && (
        <ProjectSubmissionModal 
          open={showSubmissionModal} 
          onClose={() => setShowSubmissionModal(false)}
          onSubmit={handleSubmissionComplete}
          project={selectedProjectForSubmission}
        />
      )}
    </div>
  );
};

export default ProjectManagerInterface;
