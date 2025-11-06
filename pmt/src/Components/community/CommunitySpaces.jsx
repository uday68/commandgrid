import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCode, FaDatabase, FaProjectDiagram, FaPlus } from 'react-icons/fa';
import apiService from '../../utils/api';

const CommunitySpaces = () => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Map for space icons - use the icon name from backend data
  const iconMap = {
    FaCode: <FaCode />,
    FaDatabase: <FaDatabase />,
    FaProjectDiagram: <FaProjectDiagram />,
    // Add more icons as needed
  };

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        setLoading(true);
        const data = await apiService.community.getSpaces();
        setSpaces(data);
      } catch (err) {
        console.error('Failed to fetch spaces:', err);
        setError('Could not load community spaces');
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, []);

  const handleSpaceClick = (spaceId) => {
    navigate(`/community/spaces/${spaceId}`);
  };

  const handleJoinSpaceClick = () => {
    navigate('/community/spaces/join');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center p-2">
              <div className="h-8 w-8 bg-gray-200 rounded-md mr-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-lg mb-4">My Spaces</h2>
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-blue-500 text-sm hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // If no spaces, show empty state
  if (spaces.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-lg mb-4">My Spaces</h2>
        <p className="text-gray-500 text-sm py-2">No spaces joined yet</p>
        <button className="mt-3 text-sm text-blue-500 flex items-center" onClick={handleJoinSpaceClick}>
          <FaPlus className="mr-1" /> Join New Space
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="font-medium text-lg mb-4">My Spaces</h2>
      <ul className="space-y-2">
        {spaces.slice(0, 3).map(space => (
          <li key={space.id}>
            <button 
              className="w-full text-left flex items-center p-2 rounded-md hover:bg-gray-100"
              onClick={() => handleSpaceClick(space.id)}
            >
              <span className={`w-8 h-8 rounded-md bg-${space.color}-100 text-${space.color}-700 flex items-center justify-center mr-3`}>
                {iconMap[space.icon] || <FaCode />}
              </span>
              <span>{space.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <button 
        className="mt-3 text-sm text-blue-500 flex items-center"
        onClick={handleJoinSpaceClick}
      >
        <FaPlus className="mr-1" /> Join New Space
      </button>
    </div>
  );
};

export default CommunitySpaces;
