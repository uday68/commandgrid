export const NotificationsList = ({ notifications }) => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Notifications</h2>
      <div className="space-y-3">
        {notifications.map(notification => (
          <div 
            key={notification.notification_id} 
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>
              <div>
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );