import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiEdit2, FiTrash2, FiUsers, FiCalendar, FiClock, FiCheck, FiFlag } from 'react-icons/fi';
import ProjectModal from '../Components/Admin/ProjectModal';
import LoadingSpinner from '../Components/LoadingSpinner';
import ErrorMessage from '../Components/ErrorMessage';

// Define the API base URL - same as in api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['projects', 'common']);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [manager, setManager] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetchProjectData();
  }, [id]);
  
  // Load users for project edit modal
  useEffect(() => {
    if (showEditModal) {
      fetchUsers();
    }
  }, [showEditModal]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch project details
      const projectResponse = await axios.get(`${API_BASE_URL}/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (projectResponse.data) {
        setProject(projectResponse.data);
      }

      // Fetch project members
      const membersResponse = await axios.get(`${API_BASE_URL}/projects/${id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (membersResponse.data) {
        setMembers(membersResponse.data);
      }

      // Fetch project manager
      const managerResponse = await axios.get(`${API_BASE_URL}/projects/${id}/manager`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (managerResponse.data) {
        setManager(managerResponse.data);
      }

      // Fetch project tasks
      try {
        const tasksResponse = await axios.get(`${API_BASE_URL}/projects/${id}/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (tasksResponse.data) {
          setTasks(Array.isArray(tasksResponse.data) ? tasksResponse.data : []);
        }
      } catch (err) {
        console.warn('Could not load tasks:', err);
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError(t('projects.errors.loadFailed'));
      toast.error(t('projects.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };  const handleEditProject = () => {
    // Open edit modal for this project
    toast(t('projects.editNotice'));
    setShowEditModal(true);
  };
  
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };
  
  const handleProjectSubmit = async (projectData) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.put(`${API_BASE_URL}/projects/${id}`, projectData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(t('projects.updateSuccess'));
      // Refresh project data
      fetchProjectData();
    } catch (err) {
      console.error('Error updating project:', err);
      toast.error(t('projects.errors.updateFailed'));
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm(t('projects.confirmDelete'))) {
      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`${API_BASE_URL}/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success(t('projects.deleteSuccess'));
        navigate('/projects');
      } catch (err) {
        console.error('Error deleting project:', err);
        toast.error(t('projects.errors.deleteFailed'));
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      console.error('Date parsing error:', e);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage message={error || t('projects.errors.notFound')} />
        <button 
          onClick={() => navigate('/projects')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FiArrowLeft /> {t('common.backToProjects')}
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Back button and actions */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <FiArrowLeft /> {t('common.backToProjects')}
          </button>
        
        <div className="flex gap-2">
          <button 
            onClick={handleEditProject}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FiEdit2 /> {t('common.edit')}
          </button>
          <button 
            onClick={handleDeleteProject}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <FiTrash2 /> {t('common.delete')}
          </button>
        </div>
      </div>
      
      {/* Project details */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">{project.name}</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('projects.description')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {project.description || t('projects.noDescription')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FiCalendar /> {t('projects.startDate')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {formatDate(project.start_date)}
                </p>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FiCalendar /> {t('projects.endDate')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {formatDate(project.end_date)}
                </p>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FiFlag /> {t('projects.status')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  <span 
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      project.status === 'active' || project.status === 'Active' || project.status === 'on track' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                        : project.status === 'completed' || project.status === 'Completed' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' 
                          : project.status === 'on hold' || project.status === 'On Hold' 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                    }`}
                  >
                    {project.status || t('projects.statusUnknown')}
                  </span>
                </p>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FiClock /> {t('projects.createdAt')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {formatDate(project.created_at)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="md:w-1/3 lg:w-1/4">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <FiUsers /> {t('projects.team')}
            </h2>
            
            <div className="space-y-4">
              {manager && (
                <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
                  <h3 className="text-md font-medium text-slate-700 dark:text-slate-300">{t('projects.manager')}</h3>
                  <div className="flex items-center mt-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                      {manager.profile_picture ? (
                        <img src={manager.profile_picture} alt={manager.name} className="w-full h-full rounded-full" />
                      ) : (
                        <span className="text-blue-600 dark:text-blue-300 font-semibold">{manager.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{manager.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{manager.email}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {members.length > 0 ? (
                <div>
                  <h3 className="text-md font-medium text-slate-700 dark:text-slate-300">{t('projects.members')}</h3>
                  <ul className="mt-2 space-y-2">
                    {members.map((member) => (
                      <li key={member.user_id} className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-2">
                          {member.profile_picture ? (
                            <img src={member.profile_picture} alt={member.name} className="w-full h-full rounded-full" />
                          ) : (
                            <span className="text-gray-600 dark:text-gray-300 text-sm font-semibold">{member.name?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{member.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">{t('projects.noMembers')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tasks */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <FiCheck /> {t('projects.tasks')}
        </h2>
        
        {tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('tasks.title')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('tasks.status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('tasks.dueDate')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('tasks.assignedTo')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {tasks.map((task) => (
                  <tr key={task.task_id || task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">
                      {task.title || task.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          task.status === 'completed' || task.status === 'Completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                            : task.status === 'in progress' || task.status === 'In Progress' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(task.due_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {task.assigned_user || task.assigned_to || 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">{t('projects.noTasks')}</p>
        )}      </div>    </div>


      {/* Project Edit Modal */}
      {project && (
        <ProjectModal 
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          users={users}
          onSubmit={handleProjectSubmit}
          initialData={{
            name: project.name,
            description: project.description,
            manager_id: manager?.user_id || '',
            startDate: project.start_date ? new Date(project.start_date) : new Date(),
            endDate: project.end_date ? new Date(project.end_date) : new Date(),
            status: project.status || 'Active',
          }}
        />
      )}
    </>
  );
};

export default ProjectView;
