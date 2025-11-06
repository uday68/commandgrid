import { useState } from 'react';
import { FiUserCheck } from 'react-icons/fi';
import axios from 'axios';

const UserImpersonation = () => {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImpersonate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/admin/impersonate', { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.setItem('authToken', response.data.token);
      window.location.reload();
    } catch (err) {
      alert('Impersonation failed: ' + err.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <FiUserCheck className="text-2xl mr-2" />
        <h3 className="text-xl font-semibold">User Impersonation</h3>
      </div>
      <div className="flex gap-4">
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter User ID"
          className="p-2 border rounded-lg flex-1"
        />
        <button
          onClick={handleImpersonate}
          disabled={loading}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Starting Session...' : 'Impersonate'}
        </button>
      </div>
    </div>
  );
};
export default UserImpersonation