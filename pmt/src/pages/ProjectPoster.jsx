import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiCheckCircle, FiUsers, FiLayers, FiLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// API service for direct API calls
import apiService from '../utils/api';

// Define the API base URL - same as in api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectPoster = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState({
    projectsCompleted: 0,
    clientSatisfaction: 0,
    clientsWorldwide: 0,
    supportAvailability: '24/7'
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Trigger animation effect
    setVisible(true);
    
    // Fetch project statistics from the backend
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await axios.get(`${API_BASE_URL}/project-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data) {
            setStats({
              projectsCompleted: response.data.projectsCompleted || 500,
              clientSatisfaction: response.data.clientSatisfaction || 98,
              clientsWorldwide: response.data.clientsWorldwide || 200,
              supportAvailability: response.data.supportAvailability || '24/7'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching project stats:', err);
        // Fallback to default values if API call fails
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Animation classes based on visibility state
  const fadeInUp = visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10';
  const staggerDelay = (index) => `transition-all duration-700 ease-out delay-${index * 100}`;

  // Handle navigation to get started page or demo
  const handleGetStarted = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/projects');
    } else {
      navigate('/login');
    }
  };

  const handleWatchDemo = () => {
    toast.success(t('demoRequest.sent'));
    // In a real application, this would open a modal with a video or request demo form
  };

  return (
    <div
      className="relative w-full min-h-screen bg-cover bg-center bg-fixed overflow-hidden"
      style={{ backgroundImage: 'url("https://source.unsplash.com/featured/?technology,office")' }}
    >
      {/* Gradient Overlay with improved colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-slate-900/90"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4 py-16">
        <div className={`max-w-5xl mx-auto ${fadeInUp} transition-all duration-700`}>
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-medium text-sm mb-4 border border-blue-500/30">
            PMT - Enterprise Solution
          </span>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            AI-Powered Enterprise Project Management System
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-100/80 mb-10 max-w-3xl mx-auto leading-relaxed">
            Transforming project management with integrated AI insights, streamlined collaboration, and dynamic automation.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button 
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              onClick={handleGetStarted}
            >
              {t('common.getStarted')} <FiArrowRight />
            </button>
            <button 
              className="px-8 py-3 bg-transparent hover:bg-white/10 text-white border border-white/30 hover:border-white/50 rounded-lg font-medium transition-all duration-200"
              onClick={handleWatchDemo}
            >
              {t('common.watchDemo')}
            </button>
          </div>
        </div>

        {/* Feature Cards with improved styling and animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full px-4 mt-8">
          <div className={`p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300 ${fadeInUp} ${staggerDelay(1)}`}>
            <div className="rounded-full bg-blue-500/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
              <FiLayers className="text-blue-300 w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">
              {t('projectPoster.features.projectManagement.title', 'Project Management')}
            </h2>
            <p className="text-blue-100/70 text-sm leading-relaxed">
              {t('projectPoster.features.projectManagement.description', 'Plan, track, and manage projects efficiently with our intuitive tools designed for teams of all sizes.')}
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <a href="#" className="text-sm text-blue-300 flex items-center gap-1 hover:text-blue-200 transition-colors">
                {t('common.learnMore')} <FiArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className={`p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300 ${fadeInUp} ${staggerDelay(2)}`}>
            <div className="rounded-full bg-emerald-500/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
              <FiUsers className="text-emerald-300 w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">
              {t('projectPoster.features.teamManagement.title', 'Team Management')}
            </h2>
            <p className="text-blue-100/70 text-sm leading-relaxed">
              {t('projectPoster.features.teamManagement.description', 'Build and organize teams, assign roles, and foster collaboration with powerful communication tools.')}
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <a href="#" className="text-sm text-blue-300 flex items-center gap-1 hover:text-blue-200 transition-colors">
                {t('common.learnMore')} <FiArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className={`p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300 ${fadeInUp} ${staggerDelay(3)}`}>
            <div className="rounded-full bg-violet-500/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
              <FiCheckCircle className="text-violet-300 w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">
              {t('projectPoster.features.aiInsights.title', 'AI Insights')}
            </h2>
            <p className="text-blue-100/70 text-sm leading-relaxed">
              {t('projectPoster.features.aiInsights.description', 'Leverage intelligent analytics and predictive suggestions to optimize workflows and project outcomes.')}
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <a href="#" className="text-sm text-blue-300 flex items-center gap-1 hover:text-blue-200 transition-colors">
                {t('common.learnMore')} <FiArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className={`p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300 ${fadeInUp} ${staggerDelay(4)}`}>
            <div className="rounded-full bg-amber-500/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
              <FiLink className="text-amber-300 w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">
              {t('projectPoster.features.integrations.title', 'Integrations')}
            </h2>
            <p className="text-blue-100/70 text-sm leading-relaxed">
              {t('projectPoster.features.integrations.description', 'Connect with your favorite tools and platforms for a seamless workflow experience.')}
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <a href="#" className="text-sm text-blue-300 flex items-center gap-1 hover:text-blue-200 transition-colors">
                {t('common.learnMore')} <FiArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 mt-16 max-w-4xl w-full">
          <div className={`text-center ${fadeInUp} ${staggerDelay(5)}`}>
            <span className="block text-4xl md:text-5xl font-bold text-white">{stats.projectsCompleted}+</span>
            <span className="text-blue-200 text-sm">{t('stats.projectsCompleted', 'Projects Completed')}</span>
          </div>
          <div className={`text-center ${fadeInUp} ${staggerDelay(6)}`}>
            <span className="block text-4xl md:text-5xl font-bold text-white">{stats.clientSatisfaction}%</span>
            <span className="text-blue-200 text-sm">{t('stats.clientSatisfaction', 'Client Satisfaction')}</span>
          </div>
          <div className={`text-center ${fadeInUp} ${staggerDelay(7)}`}>
            <span className="block text-4xl md:text-5xl font-bold text-white">{stats.clientsWorldwide}+</span>
            <span className="text-blue-200 text-sm">{t('stats.clientsWorldwide', 'Clients Worldwide')}</span>
          </div>
          <div className={`text-center ${fadeInUp} ${staggerDelay(8)}`}>
            <span className="block text-4xl md:text-5xl font-bold text-white">{stats.supportAvailability}</span>
            <span className="text-blue-200 text-sm">{t('stats.supportAvailable', 'Support Available')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-sm text-blue-200/50">
          © {new Date().getFullYear()} Project Management Tool. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default ProjectPoster;
