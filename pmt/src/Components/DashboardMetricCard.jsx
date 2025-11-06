import React from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const DashboardMetricCard = ({ icon, title, value, unit, trend, subtitle, className, onClick }) => {
  const { t } = useTranslation(['common']);
  
  const getTrendInfo = () => {
    if (trend === undefined || trend === null) return null;
    
    const isPositive = trend >= 0;
    const trendColor = isPositive 
      ? 'text-emerald-600 dark:text-emerald-400' 
      : 'text-red-600 dark:text-red-400';
    const TrendIcon = isPositive ? FiArrowUp : FiArrowDown;
    const bgColor = isPositive 
      ? 'bg-emerald-100 dark:bg-emerald-900/30' 
      : 'bg-red-100 dark:bg-red-900/30';
      
    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${trendColor} mt-1.5`}>
        <div className={`p-0.5 rounded-full ${bgColor}`}>
          <TrendIcon className="w-3 h-3" />
        </div>
        <span>{Math.abs(trend)}% {isPositive ? t('trends.increase') : t('trends.decrease')}</span>
      </div>
    );
  };

  return (
    <div 
      className={`p-6 rounded-xl shadow-sm transition-all ${className || 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'} ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
          )}
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white flex items-end gap-1">
            {value} 
            {unit && <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{unit}</span>}
          </p>
          {getTrendInfo()}
        </div>
        <div className="p-3 bg-white/80 dark:bg-slate-700/50 shadow-sm rounded-lg backdrop-blur-sm">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default DashboardMetricCard;