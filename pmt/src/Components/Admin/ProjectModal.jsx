import React, { useState } from 'react';
import PropTypes from 'prop-types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiX, FiUser, FiCalendar, FiDollarSign, FiTag, FiInfo } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const ProjectModal = ({ isOpen, onClose, users, onSubmit, theme = 'light', highContrast = false }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    budget: '',
    startDate: new Date(),
    endDate: new Date(),
    status: 'Planning',
    color: '#3B82F6',
    category: '',
    estimated_hours: '',
    priority: 'Medium'
  });
  const [errors, setErrors] = useState({});

  // Theme styles based on selected theme and contrast
  const getThemeStyles = () => {
    const baseStyles = {
      light: {
        bg: 'bg-white',
        text: 'text-gray-800',
        border: 'border-gray-300',
        button: {
          primary: 'bg-blue-600 hover:bg-blue-700 text-white',
          secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
        },
        input: 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
      },
      dark: {
        bg: 'bg-gray-800',
        text: 'text-gray-100',
        border: 'border-gray-700',
        button: {
          primary: 'bg-blue-600 hover:bg-blue-700 text-white',
          secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
        },
        input: 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
      },
      blue: {
        bg: 'bg-white',
        text: 'text-blue-900',
        border: 'border-blue-200',
        button: {
          primary: 'bg-blue-700 hover:bg-blue-800 text-white',
          secondary: 'bg-white hover:bg-blue-50 text-blue-700 border border-blue-300'
        },
        input: 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
      }
    };

    const styles = baseStyles[theme] || baseStyles.light;

    // Apply high contrast modifications if needed
    if (highContrast) {
      if (theme === 'dark') {
        styles.bg = 'bg-black';
        styles.text = 'text-white';
        styles.border = 'border-white';
        styles.button.primary = 'bg-white text-black hover:bg-gray-200';
        styles.button.secondary = 'bg-black text-white border border-white hover:bg-gray-900';
        styles.input = 'bg-black border-white text-white focus:ring-2 focus:ring-white';
      } else {
        styles.text = 'text-black';
        styles.border = 'border-black';
        styles.button.primary = 'bg-black text-white hover:bg-gray-800';
      }
    }

    return styles;
  };

  const themeStyles = getThemeStyles();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = t('project.errors.nameRequired');
    if (!formData.manager_id) newErrors.manager = t('project.errors.managerRequired');
    if (formData.startDate > formData.endDate) newErrors.dates = t('project.errors.invalidDateRange');
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    const projectData = {
      ...formData,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate.toISOString()
    };
    
    onSubmit(projectData);
    onClose();
  };

  // Colors for project categorization
  const projectColors = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#F59E0B', name: 'Yellow' },
    { value: '#EF4444', name: 'Red' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#EC4899', name: 'Pink' }
  ];

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={modalVariants}
        className={`${themeStyles.bg} ${themeStyles.text} rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden border ${themeStyles.border}`}
   >
        {/* Modal Header */}
        <div className={`flex justify-between items-center p-5 border-b ${themeStyles.border}`}>
          <h2 className="text-xl font-semibold">{t('project.modal.title')}</h2>
          <button 
            onClick={onClose} 
            className={`rounded-full p-2 hover:bg-opacity-10 hover:bg-gray-500 transition-colors`}
            aria-label="Close"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('project.fields.name')} *</label>
            <input
              type="text"
              className={`w-full p-2.5 border rounded-lg transition-all duration-200 ${errors.name ? 'border-red-500 ring-1 ring-red-500' : themeStyles.input}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('project.placeholders.name')}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1.5">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('project.fields.description')}</label>
            <textarea
              className={`w-full p-2.5 border rounded-lg transition-all duration-200 ${themeStyles.input}`}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              placeholder={t('project.placeholders.description')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('project.fields.manager')} *</label>
              <div className="relative">
                {users.length === 0 && (
                  <p className="text-red-500 text-sm mt-1.5">{t('project.errors.noUsers')}</p>
                )}
                <select
                  className={`w-full p-2.5 border rounded-lg appearance-none pr-10 transition-all duration-200 ${errors.manager ? 'border-red-500 ring-1 ring-red-500' : themeStyles.input}`}
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                >
                  <option value="">{t('project.fields.selectManager')}</option>
                  {users.map((user) => (
                    <option key={user.user_id || user._id || user.id} value={user.user_id || user._id || user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
                <FiUser className="absolute right-3 top-3 text-gray-400" />
                {errors.manager && <p className="text-red-500 text-sm mt-1.5">{errors.manager}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t('project.fields.status')}</label>
              <select
                className={`w-full p-2.5 border rounded-lg transition-all duration-200 ${themeStyles.input}`}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {['Planning', 'In Progress', 'On Hold', 'Completed'].map(status => (
                  <option key={status} value={status}>{t(`project.status.${status}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('project.fields.startDate')}</label>
              <div className="relative">
                <DatePicker
                  selected={formData.startDate}
                  onChange={(date) => setFormData({ ...formData, startDate: date })}
                  className={`w-full p-2.5 border rounded-lg transition-all duration-200 ${themeStyles.input}`}
                />
                <FiCalendar className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t('project.fields.endDate')}</label>
              <div className="relative">
                <DatePicker
                  selected={formData.endDate}
                  onChange={(date) => setFormData({ ...formData, endDate: date })}
                  className={`w-full p-2.5 border rounded-lg transition-all duration-200 ${themeStyles.input}`}
                />
                <FiCalendar className="absolute right-3 top-3 text-gray-400" />
              </div>
              {errors.dates && <p className="text-red-500 text-sm mt-1.5">{errors.dates}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('project.fields.budget')}</label>
              <div className="relative">
                <input
                  type="number"
                  className={`w-full p-2.5 border rounded-lg pl-8 transition-all duration-200 ${themeStyles.input}`}
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                />
                <FiDollarSign className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('project.fields.estimatedHours')}</label>
              <input
                type="number"
                className={`w-full p-2.5 border rounded-lg transition-all duration-200 ${themeStyles.input}`}
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="0"
                min="0"
                step="0.5"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('project.fields.priority')}</label>
              <select
                className={`w-full p-2.5 border rounded-lg transition-all duration-200 ${themeStyles.input}`}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">{t('project.priority.Low')}</option>
                <option value="Medium">{t('project.priority.Medium')}</option>
                <option value="High">{t('project.priority.High')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('project.fields.category')}</label>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full p-2.5 border rounded-lg pl-8 transition-all duration-200 ${themeStyles.input}`}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t('project.placeholders.category')}
                />
                <FiTag className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('project.fields.color')}</label>
            <div className="flex flex-wrap gap-2">
              {projectColors.map((color) => (
                <div 
                  key={color.value} 
                  className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  title={color.name}
                ></div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t mt-6 ${themeStyles.border}">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${themeStyles.button.secondary}`}
            >
              {t('project.actions.cancel')}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${themeStyles.button.primary}`}
            >
              {t('project.actions.create')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

ProjectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  users: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.string, // Changed from _id to user_id
      name: PropTypes.string,
      role: PropTypes.string,
    })
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  theme: PropTypes.string,
  highContrast: PropTypes.bool
};

export default ProjectModal;
