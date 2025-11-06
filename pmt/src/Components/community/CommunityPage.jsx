import React, { useState, useEffect } from 'react';
import { FaPlus, FaQuestion } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// Component imports
import CommunityHeader from './CommunityHeader';
import CommunityPost from './CommunityPost';
import HelpRequest from './HelpRequest';
import CommunitySidebar from './CommunitySidebar';
import CreatePostModal from './CreatePostModal';
import CreateHelpRequestModal from './CreateHelpRequestModal';
import AIUserSearch from './AIUserSearch';
import UserStatus from './UserStatus';

// Service imports
import apiService from '../../utils/api';

const CommunityPage = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showCreateHelpModal, setShowCreateHelpModal] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchCommunityData();
  }, [activeTab]);

  const fetchCommunityData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch data based on active tab
      if (activeTab === 'home' || activeTab === 'spaces') {
        const postsData = await apiService.community.getPosts();
        setPosts(postsData);
      }
      
      if (activeTab === 'home' || activeTab === 'help') {
        const helpData = await apiService.community.getHelpRequests();
        setHelpRequests(helpData);
      }
      
      // Fetch spaces
      const spacesData = await apiService.community.getSpaces();
      setSpaces(spacesData);
      
      // Fetch direct messages
      const messagesData = await apiService.community.getUserConnections();
      setDirectMessages(messagesData);
      
    } catch (err) {
      console.error('Error fetching community data:', err);
      setError('Failed to load community data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      await apiService.community.createPost(postData);
      setShowCreatePostModal(false);
      fetchCommunityData();
    } catch (err) {
      console.error('Error creating post:', err);
    }
  };

  const handleCreateHelpRequest = async (requestData) => {
    try {
      await apiService.community.createHelpRequest(requestData);
      setShowCreateHelpModal(false);
      fetchCommunityData();
    } catch (err) {
      console.error('Error creating help request:', err);
    }
  };

  const handleUserSelect = (user) => {
    navigate(`/community/profile/${user.user_id}`);
  };

  return (
    <div className="container mx-auto p-4">
      <CommunityHeader 
        onCreatePost={() => setShowCreatePostModal(true)}
        onAskHelp={() => setShowCreateHelpModal(true)} 
        onStartProject={() => navigate('/projects/new')}
      />
      
      <div className="flex flex-col md:flex-row mt-6 space-y-4 md:space-y-0 md:space-x-4">
        <aside className="w-full md:w-64">
          <CommunitySidebar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            spaces={spaces} 
            directMessages={directMessages} 
          />
          <UserStatus />
        </aside>
        
        <main className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {activeTab === 'home' && 'Community Feed'}
              {activeTab === 'spaces' && 'Spaces'}
              {activeTab === 'help' && 'Help Requests'}
              {activeTab === 'offer' && 'Offer Help'}
              {activeTab === 'network' && 'My Network'}
              {activeTab === 'saved' && 'Saved Posts'}
            </h2>
            <div className="space-x-2">
              {activeTab === 'home' && (
                <button
                  onClick={() => setShowCreatePostModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
                >
                  <FaPlus className="mr-1" /> Post
                </button>
              )}
              {activeTab === 'help' && (
                <button
                  onClick={() => setShowCreateHelpModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center"
                >
                  <FaQuestion className="mr-1" /> Ask for Help
                </button>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-5 mb-6 animate-pulse">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-36 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
              <p>{error}</p>
              <button 
                className="text-red-500 hover:text-red-700 underline mt-2"
                onClick={fetchCommunityData}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <div className="space-y-6">
                  {posts.length > 0 ? (
                    posts.map(post => (
                      <CommunityPost key={post.post_id} post={post} />
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No posts yet. Be the first to share something!</p>
                  )}
                </div>
              )}
              
              {activeTab === 'help' && (
                <div className="space-y-6">
                  {helpRequests.length > 0 ? (
                    helpRequests.map(request => (
                      <HelpRequest key={request.request_id} request={request} />
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No help requests yet. Feel free to ask for help!</p>
                  )}
                </div>
              )}
              
              {activeTab === 'offer' && (
                <div>
                  <AIUserSearch onUserSelect={handleUserSelect} />
                  
                  {helpRequests.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Recent Help Requests</h3>
                      {helpRequests.slice(0, 3).map(request => (
                        <HelpRequest key={request.request_id} request={request} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'network' && (
                <p className="text-gray-500 text-center py-8">Network features coming soon!</p>
              )}
              
              {activeTab === 'saved' && (
                <p className="text-gray-500 text-center py-8">Saved posts feature coming soon!</p>
              )}
            </>
          )}
        </main>
      </div>
      
      <CreatePostModal 
        show={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onSubmit={handleCreatePost}
        spaces={spaces}
      />
      
      <CreateHelpRequestModal
        show={showCreateHelpModal}
        onClose={() => setShowCreateHelpModal(false)}
        onSubmit={handleCreateHelpRequest}
      />
    </div>
  );
};

export default CommunityPage;
