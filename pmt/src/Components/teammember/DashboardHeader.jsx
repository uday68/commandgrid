import { UserCircleIcon } from "@heroicons/react/24/outline";
import Profile from "../Profile";
import axios from "axios";
import { useEffect, useState, useCallback } from 'react';

export const DashboardHeader = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const token = localStorage.getItem('authToken');
  
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.profile) {
        setProfile(response.data.profile);
        setError(null);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setError('No authentication token found');
      setLoading(false);
    }
  }, [token, fetchProfile]);

  return (
    <header className="flex justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            NexaFlow
          </span> Team Member Dashboard
        </h1>
        {profile && (
          <p className="text-gray-600 mt-1">
            Welcome back, {profile.name || 'User'}!
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {error && (
          <div className="text-red-500 text-sm max-w-xs truncate" title={error}>
            Error loading profile
          </div>
        )}
        
        <button 
          className="p-3 hover:bg-gray-100 rounded-full transition-colors duration-200 relative group" 
          onClick={() => setShowProfile(true)}
          disabled={loading}
        >
          {profile?.profile_picture ? (
            <img 
              src={profile.profile_picture} 
              alt="Profile" 
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <UserCircleIcon className="w-8 h-8 text-gray-600 group-hover:text-blue-600 transition-colors" />
          )}
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </button>
        
        {showProfile && (
          <Profile 
            open={showProfile}
            onClose={() => setShowProfile(false)} 
          />
        )}
      </div>
    </header>
  );
};