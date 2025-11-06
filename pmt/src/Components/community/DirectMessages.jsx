import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../utils/api';

const DirectMessages = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        const data = await apiService.community.getUserConnections();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch connections:', err);
        setError('Could not load your connections');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, []);

  const handleUserClick = (userId) => {
    navigate(`/messages/${userId}`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center p-2">
              <div className="h-8 w-8 bg-gray-200 rounded-full mr-3"></div>
              <div className="w-3/4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-lg mb-4">Direct Messages</h2>
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

  // If no users, show empty state
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-lg mb-4">Direct Messages</h2>
        <p className="text-gray-500 text-sm py-2">No recent messages</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="font-medium text-lg mb-4">Direct Messages</h2>
      <ul className="space-y-2">
        {users.map(user => (
          <li key={user.id}>
            <button 
              className="w-full text-left flex items-center p-2 rounded-md hover:bg-gray-100"
              onClick={() => handleUserClick(user.id)}
            >
              <div className="relative mr-3">
                <img 
                  className="h-8 w-8 rounded-full object-cover" 
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                  alt={user.name} 
                />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${
                  user.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></span>
              </div>
              <div>
                <span className="font-medium text-sm">{user.name}</span>
                {user.time && (
                  <span className="text-xs text-gray-500 block">{user.time}</span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DirectMessages;
