import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { FiMoreVertical, FiEdit2, FiTrash2, FiUsers, FiArrowRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

// API service for direct API calls
import apiService from '../utils/api';

// Define the API base URL - same as in api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectCard = ({ project, onClick, onDelete, onEdit, showActions = true }) => {
  const { t } = useTranslation(['projects', 'common']);
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch team members for the project if we have project members
    if (project.project_id && showActions) {
      fetchTeamMembers();
    }
  }, [project.project_id, showActions]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/projects/${project.project_id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setTeamMembers(response.data);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyles = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    
    switch(status.toLowerCase()) {
      case 'on track':
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'at risk':
      case 'delayed':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'behind schedule':
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'completed':
      case 'done':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'pending':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const getProgressBarColor = (progress) => {
    if (!progress && progress !== 0) return 'bg-blue-500';
    
    if (progress >= 100) return 'bg-emerald-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-amber-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setShowMenu(false);
    
    if (window.confirm(t('projects.confirmDelete'))) {
      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`${API_BASE_URL}/projects/${project.project_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success(t('projects.deleteSuccess'));
        if (onDelete) onDelete(project.project_id);
      } catch (err) {
        console.error('Error deleting project:', err);
        toast.error(t('errors.deleteProject'));
      }
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onEdit) onEdit(project);
  };
  const handleCardClick = () => {
    if (onClick) {
      onClick(project);
    } else {
      navigate(`/projects/${project.project_id}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (e) {
      console.error('Date parsing error:', e);
      return dateString;
    }
  };

  return (
    <div 
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:translate-y-[-2px] p-6 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Project Header */}
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{project.name}</h2>
        {showActions && (
          <div className="relative">
            <button 
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label={t('common.actions')}
            >
              <FiMoreVertical className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button 
                    className="flex items-center w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={handleEdit}
                    role="menuitem"
                  >
                    <FiEdit2 className="mr-2 w-4 h-4" />
                    {t('common.edit')}
                  </button>
                  <button 
                    className="flex items-center w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={handleDelete}
                    role="menuitem"
                  >
                    <FiTrash2 className="mr-2 w-4 h-4" />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles(project.status)}`}
        >
          {project.status || t('projects.status.notSet')}
        </span>
      </div>

      {/* Project Description */}
      {project.description && (
        <p className="text-slate-600 dark:text-slate-400 mb-5 text-sm line-clamp-2">{project.description}</p>
      )}

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{t('projects.progress')}</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">{project.progress || 0}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
          <div
            className={`${getProgressBarColor(project.progress)} rounded-full h-2.5 transition-all duration-500`}
            style={{ width: `${project.progress || 0}%` }}
          ></div>
        </div>

        {/* Project Dates */}
        <div className="flex flex-wrap items-center justify-between mt-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 mb-2 sm:mb-0">
            <CalendarIcon className="w-4 h-4" />
            <span>{t('projects.startDate')}: {formatDate(project.start_date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4" />
            <span>{t('projects.dueDate')}: {formatDate(project.end_date)}</span>
          </div>
        </div>

        {/* Team Members */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('projects.team')}</span>
            {teamMembers.length > 0 ? (
              <div className="flex -space-x-2">
                {teamMembers.slice(0, 4).map((member) => (
                  <img
                    key={member.user_id}
                    src={member.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.email)}&background=random`}
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                    alt={member.name}
                    title={member.name}
                  />
                ))}
                {teamMembers.length > 4 && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-center border-2 border-white dark:border-slate-800">
                    +{teamMembers.length - 4}
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            ) : (
              <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                <FiUsers className="w-3 h-3 mr-1" />
                <span className="text-xs">{t('projects.assignTeam')}</span>
              </div>
            )}
          </div>
        </div>

        {/* View Project Button */}
        <div className="mt-4">
          <button 
            className="w-full flex items-center justify-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            onClick={handleCardClick}
          >
            {t('projects.viewDetails')}
            <FiArrowRight className="ml-1 w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;