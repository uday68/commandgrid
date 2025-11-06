import { useState } from 'react';
import ChatRoom from './ChatRoom';
import { useTranslation } from 'react-i18next';

const FloatingChatButton = ({ roomId = 'default', position = 'bottom-right' }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation();

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadCount(0); // Reset unread count when opening
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={handleToggleChat}
        className={`fixed ${positionClasses[position]} bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group relative`}
        style={{ zIndex: 9997 }}
        aria-label="Open chat"
      >
        <svg 
          className="w-6 h-6" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-1.45-.26-2.82-.71-4.07-1.33L3 20l1.4-3.93c-.62-1.25-1.07-2.62-1.33-4.07.01-4.41 3.59-8 8-8s8 3.59 8 8-3.58 8-8 8z"/>
        </svg>
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        
        {/* Online Indicator */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {t('chat.openChat') || 'Open Chat'}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </button>

      {/* Chat Room Modal */}
      {isChatOpen && (
        <ChatRoom
          roomId={roomId}
          isModal={true}
          onClose={() => setIsChatOpen(false)}
          onNewMessage={() => {
            if (!isChatOpen) {
              setUnreadCount(prev => prev + 1);
            }
          }}
        />
      )}
    </>
  );
};

export default FloatingChatButton;
