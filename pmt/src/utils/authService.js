/**
 * Authentication Service
 * Handles login, logout, token storage, and auth state
 */

// Token storage and retrieval
const saveToken = (token, refreshToken) => {
  localStorage.setItem('authToken', token);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

const getToken = () => {
  return localStorage.getItem('authToken');
};

const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

// User data storage and retrieval
const saveUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

const getUser = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

// Clear auth data on logout
const clearAuth = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Check if user is authenticated
const isAuthenticated = () => {
  return !!getToken();
};

// Check user role
const hasRole = (role) => {
  const user = getUser();
  return user && user.role === role;
};

// Parse JWT token (without validation)
const parseToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

// Check token expiration
const isTokenExpired = (token) => {
  const decoded = parseToken(token);
  if (!decoded) return true;
  
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};

// Handle registration completion
const handleRegistrationSuccess = (data) => {
  if (data.authToken) {
    saveToken(data.authToken, data.refreshToken);
  }
  
  if (data.user) {
    saveUser(data.user);
  }
  
  return isAuthenticated();
};

// Export authentication service functions
export default {
  saveToken,
  getToken,
  getRefreshToken,
  saveUser,
  getUser,
  clearAuth,
  isAuthenticated,
  hasRole,
  parseToken,
  isTokenExpired,
  handleRegistrationSuccess
};
