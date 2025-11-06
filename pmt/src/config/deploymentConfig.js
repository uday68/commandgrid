/**
 * Deployment configuration
 * Values are set based on the environment
 */

const env = process.env.NODE_ENV || 'development';

const configs = {
  development: {
    apiUrl: 'http://localhost:5000/api',
    socketUrl: 'http://localhost:5000',
    logLevel: 'debug',
    enableAnimation: true,
    apiTimeout: 15000, // 15 seconds
  },
  test: {
    apiUrl: 'http://localhost:5000/api',
    socketUrl: 'http://localhost:5000',
    logLevel: 'info',
    enableAnimation: false,
    apiTimeout: 5000, // 5 seconds
  },
  production: {
    apiUrl: process.env.REACT_APP_API_URL || '/api',
    socketUrl: process.env.REACT_APP_SOCKET_URL || window.location.origin,
    logLevel: 'error',
    enableAnimation: true,
    apiTimeout: 30000, // 30 seconds
  },
};

// Export the config based on current environment
export default {
  ...configs[env],
  environment: env,
  isDevelopment: env === 'development',
  isTest: env === 'test',
  isProduction: env === 'production',
};
