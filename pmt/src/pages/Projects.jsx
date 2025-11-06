import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarIcon, ChartBarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import  Sidebar from '../Components/Sidebar'
import { FiFolder,FiCheckCircle,FiUsers,FiFileText,FiMessageSquare } from 'react-icons/fi';

const ProjectManagerDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const sidebarLinks = [
    { path: "/projects", label: "Projects", icon: FiFolder },
    { path: "/tasks", label: "Tasks", icon: FiCheckCircle },
    { path: "/teams", label: "Teams", icon: FiUsers },
    { path: "/reports", label: "Reports", icon: FiFileText },
    { path: "#", label: "AI Assistant", icon: FiMessageSquare, onClick: () => setShowAIChat(true) },
  ];
  // Fetch projects for the logged-in project manager
  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:5000/api/project-manager/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(response.data.projects);
      console.log(response.data)
      setLoading(false);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to fetch projects');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex  h-screen">
      <Sidebar links={sidebarLinks}/>
  
    <div className="min-h-screen bg-gray-50 p-6 w-full">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Project Manager Dashboard</h1>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.project_id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-4">{project.name}</h2>
                <p className="text-gray-600 mb-4">{project.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">No projects found.</p>
        )}
      </div>
    </div>
    </div>
  );
};

export default ProjectManagerDashboard;