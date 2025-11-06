import React, { useState } from 'react';
import { FiX, FiSend } from 'react-icons/fi';

const NotificationModal = ({ onSend, onClose }) => {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message, priority);
      setMessage('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Send Notification</h2>
          <FiX className="cursor-pointer" onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter notification message..."
            className="w-full p-3 border rounded-lg mb-4 h-32"
            required
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
          >
            <option value="low">Low Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
          </select>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <FiSend className="mr-2" /> Send Notification
          </button>
        </form>
      </div>
    </div>
  );
};

export default NotificationModal;