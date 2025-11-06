import React from 'react';
import { FaPen, FaQuestion, FaRocket } from 'react-icons/fa';

const CommunityHeader = ({ onCreatePost, onAskHelp, onStartProject }) => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md p-8 text-white mb-6">
      <h1 className="text-2xl font-bold mb-2">Welcome to the NexaFlow Community</h1>
      <p className="mb-6">Connect with professionals, find collaborators, and get help on your projects.</p>
      <div className="flex space-x-4">
        <button 
          onClick={onCreatePost}
          className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md font-medium flex items-center"
        >
          <FaPen className="mr-2" /> Create Post
        </button>
        <button 
          onClick={onAskHelp}
          className="bg-blue-400 bg-opacity-30 hover:bg-opacity-50 px-4 py-2 rounded-md font-medium flex items-center"
        >
          <FaQuestion className="mr-2" /> Ask for Help
        </button>
        <button 
          onClick={onStartProject}
          className="bg-blue-400 bg-opacity-30 hover:bg-opacity-50 px-4 py-2 rounded-md font-medium flex items-center"
        >
          <FaRocket className="mr-2" /> Start a Project
        </button>
      </div>
    </div>
  );
};

export default CommunityHeader;
