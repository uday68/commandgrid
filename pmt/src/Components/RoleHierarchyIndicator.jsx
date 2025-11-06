import React from 'react';
import { FiShield, FiUser, FiInfo, FiAlertCircle } from 'react-icons/fi';

const RoleHierarchyIndicator = ({ role = 'Project Manager', theme = 'light' }) => {
  const roleConfig = {
    'Project Manager': {
      color: 'blue',
      hierarchy: 'Subordinate to Admin',
      permissions: [
        'Manage assigned projects',
        'Track project progress',
        'Manage team members',
        'Create project reports'
      ],
      restrictions: [
        'Cannot create new projects',
        'Cannot delete projects',
        'Cannot access company overview',
        'Limited to assigned scope'
      ]
    }
  };

  const config = roleConfig[role];
  if (!config) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <FiShield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              {role} Role
            </h3>
            <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
              {config.hierarchy}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <FiUser className="w-3 h-3 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">Permissions</span>
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                {config.permissions.map((permission, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-2">
                <FiAlertCircle className="w-3 h-3 text-amber-600" />
                <span className="font-medium text-amber-700 dark:text-amber-400">Restrictions</span>
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                {config.restrictions.map((restriction, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                    {restriction}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <FiInfo className="w-3 h-3" />
              <span>Contact your Admin for project creation, deletion, or company-wide access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleHierarchyIndicator;
