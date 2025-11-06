import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import loginImage from '../assets/logo-image.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  const handleSignin = async (e) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Please accept the terms & conditions');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/login', { email, password });
      if (response.data.authToken) {
        localStorage.setItem('authToken', response.data.authToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        if(response.data.user.role === 'Member') navigate('/team-member-dashboard');
        else if(response.data.user.role === 'Admin') navigate('/dashboard');
        else if(response.data.user.role === 'Project Manager') navigate('/projects');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl max-w-6xl w-full">
        {/* Left Side - Terms & Conditions */}
        <div className="md:w-1/2 p-8 bg-gradient-to-br from-blue-50 to-gray-50 rounded-l-2xl">
          <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Terms & Conditions</h2>
            <div className="flex-1 overflow-y-auto pr-4 mb-4 text-gray-600 text-sm">
              <p className="mb-4">1. By using our services, you agree to comply with all applicable laws and regulations.</p>
              <p className="mb-4">2. You are responsible for maintaining the confidentiality of your account credentials.</p>
              <p className="mb-4">3. We reserve the right to modify these terms at any time. Continued use constitutes acceptance.</p>
              <p className="mb-4">4. User-generated content must not violate intellectual property rights or contain harmful material.</p>
              <p className="mb-4">5. We may terminate accounts for violations of these terms at our sole discretion.</p>
            </div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">I agree to the terms & conditions</span>
            </label>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-1/2 p-8">
          <div className="flex flex-col items-center">
            <img 
              src={loginImage} 
              alt="Company Logo" 
              className="w-32 h-32 mb-8 rounded-full border-4 border-white shadow-lg"
            />
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Welcome Back</h2>
            
            <form onSubmit={handleSignin} className="w-full max-w-md">
              {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

              <div className="mb-6">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

              <div className="mb-6">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !acceptedTerms}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold 
                         hover:bg-blue-700 transition-all duration-300 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : 'Sign In'}
              </button>

              <p className="mt-6 text-center text-gray-600">
                New user?{' '}
                <a href="/register" className="text-blue-600 font-semibold hover:underline">
                  Create account
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;