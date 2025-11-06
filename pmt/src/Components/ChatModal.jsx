import { createPortal } from 'react-dom';
import ChatRoom from './ChatRoom';
import { useTranslation } from 'react-i18next';

const ChatModal = ({ isOpen, onClose, roomId = 'default', title }) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-5/6 flex flex-col"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">
            {title || t('chat.chatRoom')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>
        
        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          <ChatRoom roomId={roomId} />
        </div>
      </div>
    </div>
  );

  // Render in portal to ensure it's on top of everything
  return createPortal(modalContent, document.body);
};

export default ChatModal;
