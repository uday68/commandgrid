import React from 'react';
import { 
  FiFileText, 
  FiMessageSquare, 
  FiCheckSquare, 
  FiUser, 
  FiCalendar,
  FiClock,
  FiTag,
  FiEdit,
  FiTrash2
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, parseISO } from 'date-fns';

const RecentActivities = ({ activities }) => {
  const { t } = useTranslation(['activities', 'common']);
  const navigate = useNavigate();
  
  // If no activities, return a placeholder
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <FiClock className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 text-center">{t('activities.noActivities')}</p>
      </div>
    );
  }

  // Function to get the appropriate icon for each activity type
  const getActivityIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'task_created':
      case 'task_updated':
        return <FiFileText className="w-4 h-4" />;
      case 'comment_added':
        return <FiMessageSquare className="w-4 h-4" />;
      case 'task_completed':
        return <FiCheckSquare className="w-4 h-4" />;
      case 'member_joined':
      case 'member_left':
        return <FiUser className="w-4 h-4" />;
      case 'project_created':
      case 'project_updated':
        return <FiCalendar className="w-4 h-4" />;
      case 'tag_added':
        return <FiTag className="w-4 h-4" />;
      case 'edited':
        return <FiEdit className="w-4 h-4" />;
      case 'deleted':
        return <FiTrash2 className="w-4 h-4" />;
      default:
        return <FiClock className="w-4 h-4" />;
    }
  };

  // Function to get the appropriate background color for each activity type
  const getActivityColor = (type) => {
    switch(type?.toLowerCase()) {
      case 'task_created':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'comment_added':
        return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'task_completed':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'member_joined':
        return 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400';
      case 'member_left':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'project_created':
        return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400';
      case 'project_updated':
        return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'task_updated':
        return 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
      case 'edited':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'deleted':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  // Format the timestamp in a readable format
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return t('activities.unknownTime');
    
    try {
      const date = parseISO(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error('Date parsing error:', e);
      return timestamp;
    }
  };

  // Navigate to the related entity
  const handleNavigate = (activity) => {
    if (!activity) return;

    const { type, entity_id, entity_type } = activity;
    
    if (type?.includes('project') && entity_type === 'project') {
      navigate(`/projects/${entity_id}`);
    } else if (type?.includes('task') && entity_type === 'task') {
      navigate(`/tasks/${entity_id}`);
    } else if ((type?.includes('member') || type?.includes('user')) && entity_type === 'user') {
      navigate(`/team/members/${entity_id}`);
    }
  };

  return (
    <div className="space-y-5">
      {activities.map((activity) => (
        <div 
          key={activity.id || activity.activity_id} 
          className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
          onClick={() => handleNavigate(activity)}
        >
          {/* Activity Icon */}
          <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
            {getActivityIcon(activity.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Activity Content */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                <span className="font-semibold">{activity.user?.name || activity.actor_name || t('activities.someone')}</span> {activity.description || activity.content}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {formatTimeAgo(activity.timestamp || activity.created_at)}
              </span>
            </div>
            
            {/* Project Reference if available */}
            {(activity.project || activity.target_name) && (
              <div className="mt-1 flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {activity.project?.name || activity.target_name}
                </span>
              </div>
            )}
            
            {/* Optional Details */}
            {activity.details && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {activity.details}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivities;