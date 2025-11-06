import React, { useState, useEffect } from "react";
import { 
  FiBell, 
  FiCheckCircle, 
  FiTrash2, 
  FiAlertCircle, 
  FiInfo,
  FiRefreshCw,
  FiAlertTriangle
} from "react-icons/fi";
import axios from "axios";
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

// Define themes configuration
const themes = {
  light: {
    bg: "bg-gray-50",
    card: "bg-white",
    text: "text-gray-800",
    header: "bg-white",
    border: "border-gray-200",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    sidebar: "bg-white",
    activeTab: "bg-gradient-to-r from-blue-600 to-blue-800 text-white",
  },
  dark: {
    bg: "bg-gray-800",
    card: "bg-gray-700",
    text: "text-gray-100",
    header: "bg-gray-900",
    border: "border-gray-600",
    button: "bg-blue-500 hover:bg-blue-600 text-white",
    sidebar: "bg-gray-900",
    activeTab: "bg-gradient-to-r from-blue-500 to-blue-700 text-white",
  },
  blue: {
    bg: "bg-blue-50",
    card: "bg-white",
    text: "text-blue-900",
    header: "bg-blue-100",
    border: "border-blue-200",
    button: "bg-blue-700 hover:bg-blue-800 text-white",
    sidebar: "bg-white",
    activeTab: "bg-gradient-to-r from-blue-700 to-blue-900 text-white",
  },
};

const NotificationsCenter = ({ theme = "light", userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState({
    initial: true,
    read: false,
    delete: false,
    allRead: false
  });
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { t } = useTranslation();

  // Get the current theme
  const currentTheme = themes[theme] || themes.light;

  // Enhanced error handler
  const handleError = (error, action) => {
    setError({
      message: error?.response?.data?.message || `Error during ${action}. Please try again.`,
      action
    });
    console.error(`${action} Error:`, error);
  };

  // Fetch notifications with retry logic
  const fetchNotifications = async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    setError(null);
    
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await axios.get(
        "http://localhost:5000/api/admin/notifications",
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // 10 second timeout
        }
      );

      setNotifications(response.data);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchNotifications, 2000 * retryCount); // Exponential backoff
      } else {
        handleError(err, "Fetching notifications");
      }
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchNotifications();
    
    // Cleanup function
    return () => {
      // Here you would typically cancel any pending requests
      // For axios, this would require using cancel tokens
    };
  }, []);

  // Mark a single notification as read
  const markAsRead = async (id) => {
    setLoading(prev => ({ ...prev, read: true }));
    
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        `http://localhost:5000/api/admin/notifications/${id}/read`,
        {},
        { 
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status < 500 // Consider 404 as valid for deletion
        }
      );

      setNotifications(prev =>
        prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
      );
      toast.success("Notification marked as read");
    } catch (err) {
      handleError(err, "Marking as read");
    } finally {
      setLoading(prev => ({ ...prev, read: false }));
    }
  };

  // Delete a notification
  const deleteNotification = async (id) => {
    setLoading(prev => ({ ...prev, delete: true }));
    
    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(
        `http://localhost:5000/api/admin/notifications/${id}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status === 200 || status === 404
        }
      );

      setNotifications(prev => prev.filter(n => n.notification_id !== id));
      toast.success("Notification deleted");
    } catch (err) {
      handleError(err, "Deleting notification");
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    setLoading(prev => ({ ...prev, allRead: true }));
    
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        "http://localhost:5000/api/admin/notifications/mark-all-read",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      toast.success("All notifications marked as read");
    } catch (err) {
      handleError(err, "Marking all as read");
    } finally {
      setLoading(prev => ({ ...prev, allRead: false }));
    }
  };

  // Get appropriate icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert':
        return <FiAlertCircle className="text-yellow-500" />;
      case 'info':
        return <FiInfo className="text-blue-500" />;
      case 'error':
        return <FiAlertTriangle className="text-red-500" />;
      default:
        return <FiBell className="text-gray-500" />;
    }
  };

  // Handle retry when initial fetch fails
  const handleRetry = () => {
    setRetryCount(0);
    fetchNotifications();
  };

  // Loading state when initially fetching notifications
  if (loading.initial && notifications.length === 0) {
    return (
      <div className={`p-4 rounded-lg ${currentTheme.card} ${currentTheme.border} border`}>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin">
            <FiRefreshCw className="w-6 h-6 text-blue-500" />
          </div>
          <span className="ml-2">Loading notifications...</span>
        </div>
      </div>
    );
  }

  // Error state when initial fetch fails completely
  if (error && notifications.length === 0) {
    return (
      <div className={`p-4 rounded-lg ${currentTheme.card} ${currentTheme.border} border`}>
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <FiAlertTriangle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div className={`p-4 rounded-lg ${currentTheme.card} ${currentTheme.border} border`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiBell className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Admin Notifications</h2>
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {notifications.filter(n => !n.is_read).length} unread
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading.initial && (
            <div className="animate-spin">
              <FiRefreshCw className="w-4 h-4" />
            </div>
          )}
          <button
            onClick={markAllAsRead}
            className={`text-sm ${currentTheme.button.includes('text-white') ? 'text-white' : 'text-blue-600'} hover:text-blue-800`}
            disabled={notifications.every(n => n.is_read) || loading.allRead}
          >
            {loading.allRead ? 'Processing...' : 'Mark all as read'}
          </button>
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No notifications available
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.map(notification => (
            <div 
              key={notification.notification_id}
              className={`p-4 rounded-lg flex items-start gap-3 ${
                !notification.is_read ? "bg-blue-50 dark:bg-blue-900/20" : currentTheme.bg
              }`}
            >
              <div className="mt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
                {notification.metadata?.link && (
                  <a 
                    href={notification.metadata.link}
                    className="text-xs text-blue-500 hover:underline mt-1 block"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View details
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                {!notification.is_read && (
                  <button 
                    onClick={() => markAsRead(notification.notification_id)}
                    className="p-2 hover:bg-blue-100 rounded-full"
                    title="Mark as read"
                    disabled={loading.read}
                  >
                    {loading.read ? (
                      <div className="animate-spin">
                        <FiRefreshCw className="w-4 h-4" />
                      </div>
                    ) : (
                      <FiCheckCircle className="text-blue-500" />
                    )}
                  </button>
                )}
                <button 
                  className="p-2 hover:bg-red-100 rounded-full"
                  onClick={() => deleteNotification(notification.notification_id)}
                  title="Delete"
                  disabled={loading.delete}
                >
                  {loading.delete ? (
                    <div className="animate-spin">
                      <FiRefreshCw className="w-4 h-4" />
                    </div>
                  ) : (
                    <FiTrash2 className="text-red-500" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsCenter;