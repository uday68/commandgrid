import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../utils/api';

const UserStatus = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('available');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        setLoading(true);
        const data = await apiService.community.getUserStatus();
        setUserData(data);
        setStatus(data.status || 'available');
      } catch (err) {
        console.error('Failed to fetch user status:', err);
        setError('Could not load your profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserStatus();
  }, []);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    
    try {
      await apiService.community.updateUserStatus(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleEditProfile = () => {
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
        <div className="flex mb-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 mr-4"></div>
          <div className="w-3/4">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-lg mb-3">Your Status</h2>
        <p className="text-red-500">{error || 'Failed to load profile data'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md text-sm font-medium mt-2"
        >
          Retry
        </button>
      </div>
    );
  }

  const statusColors = {
    'available': 'bg-green-400',
    'busy': 'bg-red-400',
    'away': 'bg-yellow-400'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="font-medium text-lg mb-3">Your Status</h2>
      <div className="flex mb-4">
        <img 
          className="h-16 w-16 rounded-full mr-4 object-cover" 
          src={userData.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`} 
          alt="Your profile" 
        />
        <div>
          <h3 className="font-medium">{userData.name}</h3>
          <p className="text-sm text-gray-500 mb-1">{userData.role}</p>
          <div className="flex items-center">
            <span className={`h-2.5 w-2.5 ${statusColors[status] || 'bg-gray-400'} rounded-full mr-2`}></span>
            <select 
              className="text-sm text-gray-500 bg-transparent border-none focus:ring-0 p-0"
              value={status}
              onChange={handleStatusChange}
            >
              <option value="available">Available for projects</option>
              <option value="busy">Busy</option>
              <option value="away">Away</option>
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3 text-sm">
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-semibold">{userData.connections || 0}</div>
          <div className="text-gray-500">Connections</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-semibold">{userData.posts || 0}</div>
          <div className="text-gray-500">Posts</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-semibold">{userData.helped || 0}</div>
          <div className="text-gray-500">Helped</div>
        </div>
      </div>
      <button 
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md text-sm font-medium"
        onClick={handleEditProfile}
      >
        Edit Profile
      </button>
    </div>
  );
};

export default UserStatus;
