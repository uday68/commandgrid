import React from 'react';
import { FaQuestionCircle, FaComment, FaEye, FaClock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const HelpRequest = ({ request }) => {
  const navigate = useNavigate();
  
  const handleOfferHelp = () => {
    // For now, just navigate to the request details page
    navigate(`/community/help-requests/${request.request_id}`);
  };
  
  const renderTags = () => {
    if (!request.tags || request.tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {request.tags.map((tag, index) => {
          // Handle dynamically generated className safely
          const bgColorClass = `bg-${tag.color || 'blue'}-100`;
          const textColorClass = `text-${tag.color || 'blue'}-800`;
          
          return (
            <span 
              key={tag.id || index} 
              className={`text-xs py-1 px-2 rounded-full ${bgColorClass} ${textColorClass}`}
            >
              {tag.name}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-6 border-l-4 border-yellow-500">
      <div className="flex justify-between items-start mb-4">
        <div className="flex">
          <img 
            className="h-10 w-10 rounded-full mr-3 object-cover" 
            src={request.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.author.name)}&background=random`} 
            alt="User" 
          />
          <div>
            <h3 className="font-medium">{request.author.name}</h3>
            <p className="text-gray-500 text-sm">{request.author.title} • {request.timeAgo}</p>
          </div>
        </div>
        <div className="flex">
          <span className="bg-yellow-100 text-yellow-800 text-xs py-1 px-2 rounded-full flex items-center">
            <FaQuestionCircle className="mr-1" /> Help Request
          </span>
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-3">{request.title}</h2>
      <p className="mb-4">{request.description}</p>
      
      {renderTags()}
      
      {request.deadline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center text-yellow-700">
            <FaClock className="mr-2" />
            <span className="font-medium">Needed by: {new Date(request.deadline).toLocaleDateString()}</span>
          </div>
        </div>
      )}
      
      <div className="flex justify-between">
        <div className="flex space-x-3">
          <button className="text-gray-500 hover:text-blue-500 flex items-center">
            <FaComment className="mr-1" />
            <span>{request.comment_count || 0} Comments</span>
          </button>
          <button className="text-gray-500 hover:text-blue-500 flex items-center">
            <FaEye className="mr-1" />
            <span>{request.view_count || 0} Views</span>
          </button>
        </div>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          onClick={handleOfferHelp}
        >
          Offer Help
        </button>
      </div>
    </div>
  );
};

export default HelpRequest;
