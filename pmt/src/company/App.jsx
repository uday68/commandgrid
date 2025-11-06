import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import axios from 'axios';

// Import company components
import CompanyDashboard from './CompanyDashboard';
import CompanySettings from './CompanySettings';
import AdminManagement from './AdminManagement';
import CompanyProjects from './CompanyProjects';
import TeamManagement from './TeamManagement';

// Company authenticated route wrapper
const CompanyProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const verifyCompanyAccess = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Check if user has company role or permissions
        const response = await axios.get('/api/auth/verify-company-access', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.authorized) {
          setIsAuthorized(true);
        } else {
          // User doesn't have company access, redirect to appropriate page
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error verifying company access:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    
    verifyCompanyAccess();
  }, [navigate]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return isAuthorized ? children : null;
};

const CompanyApp = () => {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <CompanyProtectedRoute>
            <CompanyDashboard />
          </CompanyProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <CompanyProtectedRoute>
            <CompanyDashboard />
          </CompanyProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <CompanyProtectedRoute>
            <CompanySettings />
          </CompanyProtectedRoute>
        } 
      />
      <Route 
        path="/admins" 
        element={
          <CompanyProtectedRoute>
            <AdminManagement />
          </CompanyProtectedRoute>
        } 
      />
      <Route 
        path="/projects" 
        element={
          <CompanyProtectedRoute>
            <CompanyProjects />
          </CompanyProtectedRoute>
        } 
      />
      <Route 
        path="/teams" 
        element={
          <CompanyProtectedRoute>
            <TeamManagement />
          </CompanyProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/company/dashboard" replace />} />
    </Routes>
  );
};

export default CompanyApp;
