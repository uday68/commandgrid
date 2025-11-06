import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiMessageSquare, FiInfo } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

const TeamMemberCard = ({ member, showActions = true }) => {
  const { t } = useTranslation(['team', 'common']);
  const navigate = useNavigate();
  
  const { name, role, avatar, email, projects, capacity, user_id, profile_picture } = member;
  
  const getCapacityColor = (capacity) => {
    if (capacity >= 90) return 'text-red-500 dark:text-red-400';
    if (capacity >= 75) return 'text-amber-500 dark:text-amber-400';
    if (capacity >= 50) return 'text-blue-500 dark:text-blue-400';
    return 'text-emerald-500 dark:text-emerald-400';
  };

  const handleViewProfile = () => {
    if (user_id) {
      navigate(`/team/members/${user_id}`);
    } else {
      toast.error(t('team.errors.memberProfileNotFound'));
    }
  };

  const handleSendMessage = () => {
    if (user_id) {
      navigate(`/chat?userId=${user_id}`);
    } else {
      toast.error(t('team.errors.cannotMessageMember'));
    }
  };

  const handleSendEmail = () => {
    if (email) {
      window.location.href = `mailto:${email}`;
    } else {
      toast.error(t('team.errors.emailNotAvailable'));
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
      <div className="flex items-center gap-3">
        <img
          src={profile_picture || avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
          alt={name}
          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600"
          onClick={handleViewProfile}
          style={{ cursor: 'pointer' }}
        />
        <div>
          <h3 className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
            {name}
            {member.isOnline && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1.5"></span>
            )}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{role}</p>
        </div>
      </div>

      <div className="flex items-center">
        <div className="text-right mr-3">
          <div className="flex items-center justify-end gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <p className="text-xs text-slate-600 dark:text-slate-400">{projects || 0} {t('team.projects')}</p>
          </div>
          <p className={`text-xs font-medium ${getCapacityColor(capacity)}`}>{capacity || 0}% {t('team.capacity')}</p>
        </div>

        {showActions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            {email && (
              <button 
                onClick={handleSendEmail}
                className="p-1.5 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title={t('team.actions.sendEmail')}
              >
                <FiMail className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handleSendMessage}
              className="p-1.5 rounded-full text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              title={t('team.actions.sendMessage')}
            >
              <FiMessageSquare className="w-4 h-4" />
            </button>
            <button 
              onClick={handleViewProfile}
              className="p-1.5 rounded-full text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              title={t('team.actions.viewProfile')}
            >
              <FiInfo className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamMemberCard;