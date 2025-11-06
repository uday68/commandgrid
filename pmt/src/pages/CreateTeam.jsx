import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const CreateTeam = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const teamData = {
      name,
      
      project_id: projectId
    };
    onSubmit(teamData);
    setName('');
    setProjectId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl relative">
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          onClick={onClose}
        >
          <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Team</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="name" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Team Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

          

              <div>
                <label 
                  htmlFor="projectId" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Project ID
                </label>
                <input
                  id="projectId"
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Team
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTeam;