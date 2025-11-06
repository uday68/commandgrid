import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUser, FiLock, FiMail, FiPhone, FiGlobe, FiKey } from 'react-icons/fi';
import loginImage from '../assets/registe-image.png';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
    company: '',
    phone: '',
    timeZone: '',
    projectStyle: 'Agile',
    profilePicture: null,
    termsAccepted: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.termsAccepted) {
      setError('You must accept the terms and conditions');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formPayload = new FormData();
      formPayload.append('name', formData.fullName);
      formPayload.append('email', formData.email);
      formPayload.append('username', formData.username);
      formPayload.append('company', formData.company);
      formPayload.append('timeZone', formData.timeZone);
      formPayload.append('role', formData.role || 'Member'); // Default to 'Member' if not provided
      formPayload.append('agile', formData.projectStyle === 'Agile'); // Convert to boolean
      formPayload.append('password', formData.password);
      if (formData.profilePicture) {
        formPayload.append('profilePicture', formData.profilePicture);
      }

      const response = await axios.post('http://localhost:5000/api/register', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.message === 'User registered successfully') {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(response.data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen items-center justify-center bg-gray-100 w-full m-2">
      <div className="w-1/2 hidden md:flex items-center justify-center">
        <img src={loginImage} alt="Register" className="w-3/4 object-cover" />
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md hover:shadow-2xl border border-gray-300 transition duration-300">
        <h2 className="text-2xl font-bold text-center mb-4">Register</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="input-group">
            <FiUser className="input-icon" />
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>
          <div className="input-group">
            <FiMail className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>
          <div className="input-group">
            <FiUser className="input-icon" />
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>
          <div className="input-group">
            <FiGlobe className="input-icon" />
            <input
              type="text"
              name="company"
              placeholder="Company"
              value={formData.company}
              onChange={handleChange}
              className="input-field"
            />
          </div>
          <div className="input-group">
            <FiPhone className="input-icon" />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              className="input-field"
            />
          </div>
          <div className="input-group">
            <FiGlobe className="input-icon" />
            <select
              name="timeZone"
              value={formData.timeZone}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Select Time Zone</option>
              <option value="UTC-5">UTC-5</option>
              <option value="UTC+1">UTC+1</option>
            </select>
          </div>
          <div className="input-group">
            <FiUser className="input-icon" />
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Select Role</option>
              <option value="Member">Member</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Admin">Admin</option>
              <option value="Developer">Developer</option>
            </select>
          </div>
          <div className="input-group">
            <FiKey className="input-icon" />
            <select
              name="projectStyle"
              value={formData.projectStyle}
              onChange={handleChange}
              className="input-field"
            >
              <option value="Agile">Agile</option>
              <option value="Kanban">Kanban</option>
            </select>
          </div>
        </div>

        <div className="input-group mt-4">
          <FiLock className="input-icon" />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>
        <div className="input-group mt-4">
          <FiLock className="input-icon" />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
          <input
            type="file"
            name="profilePicture"
            onChange={handleChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={handleChange}
            className="mr-2"
            required
          />
          <span>
            I accept the{' '}
            <a href="/terms" className="text-blue-500 underline">
              Terms & Conditions
            </a>
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 mt-4 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-blue-300"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;