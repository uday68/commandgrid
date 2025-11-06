import React, { useState, useEffect } from 'react';
import { 
  FaBell, FaCommentAlt, FaChevronDown, FaImage, FaCode, 
  FaPoll, FaPaperclip, FaTimes, FaDatabase, FaProjectDiagram 
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { 
  CommunityHeader, 
  CommunityPost, 
  HelpRequest,
  CreatePostModal,
  CreateHelpRequestModal,
  CommunitySidebar,
  UserStatus
} from '../Components/community';
import communityService from '../services/communityService';

const Community = () => {
  const { t } = useTranslation();

  // State for modals and interactive elements
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showHelpRequestModal, setShowHelpRequestModal] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Sample data for direct messages - would be replaced with real API in production
  const directMessages = [
    { id: 1, name: "Jason Torres", status: "online", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
    { id: 2, name: "Melissa Kim", status: "away", time: "32m", avatar: "https://randomuser.me/api/portraits/women/22.jpg" },
    { id: 3, name: "Raj Patel", status: "online", avatar: "https://randomuser.me/api/portraits/men/45.jpg" }
  ];

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [postsRes, helpRequestsRes, spacesRes] = await Promise.all([
          communityService.getPosts(),
          communityService.getHelpRequests(),
          communityService.getSpaces()
        ]);
        
        setPosts(postsRes.posts || []);
        setHelpRequests(helpRequestsRes.helpRequests || []);
        setSpaces(spacesRes.spaces || []);
        
      } catch (err) {
        console.error('Error fetching community data:', err);
        setError('Failed to load community data. Please try again later.');
        toast.error('Failed to load community data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handler functions
  const handleCreatePost = async (postData) => {
    try {
      setLoading(true);
      const result = await communityService.createPost({
        title: postData.title || postData.content.substring(0, 50),
        content: postData.content,
        tags: postData.tags
      });
      
      // Refresh posts after creating a new one
      const postsRes = await communityService.getPosts();
      setPosts(postsRes.posts || []);
      
      setShowCreatePostModal(false);
      toast.success('Post created successfully!');
    } catch (err) {
      console.error('Error creating post:', err);
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleHelpRequestSubmit = async (requestData) => {
    try {
      setLoading(true);
      await communityService.createHelpRequest({
        title: requestData.title,
        description: requestData.description,
        deadline: requestData.deadline,
        tags: requestData.skills,
        priority: requestData.priority || 'Medium'
      });
      
      // Refresh help requests after creating a new one
      const helpRequestsRes = await communityService.getHelpRequests();
      setHelpRequests(helpRequestsRes.helpRequests || []);
      
      setShowHelpRequestModal(false);
      toast.success('Help request submitted successfully!');
    } catch (err) {
      console.error('Error submitting help request:', err);
      toast.error('Failed to submit help request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans bg-gray-50 text-gray-800 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-blue-500">{t('common.appName')}</h1>
              </div>
              <nav className="ml-10 flex items-center space-x-8">
                <a href="#" className="text-gray-500 hover:text-gray-900">{t('nav.dashboard')}</a>
                <a href="#" className="text-gray-500 hover:text-gray-900">{t('nav.projects')}</a>
                <a href="#" className="text-gray-900 font-medium">{t('nav.community')}</a>
                <a href="#" className="text-gray-500 hover:text-gray-900">{t('nav.calendar')}</a>
                <a href="#" className="text-gray-500 hover:text-gray-900">{t('nav.reports')}</a>
              </nav>
            </div>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <button className="text-gray-400 hover:text-gray-500">
                  <FaBell className="text-xl" />
                  <span className="absolute -top-1 -right-1 text-xs w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center">3</span>
                </button>
              </div>
              <div className="relative">
                <button className="text-gray-400 hover:text-gray-500" onClick={() => setShowChatPanel(!showChatPanel)}>
                  <FaCommentAlt className="text-xl" />
                  <span className="absolute -top-1 -right-1 text-xs w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center z-10">5</span>
                </button>
              </div>
              <div className="flex items-center">
                <img className="h-8 w-8 rounded-full object-cover" src="https://randomuser.me/api/portraits/women/42.jpg" alt="User avatar" />
                <span className="ml-2 font-medium">Sarah Chen</span>
                <FaChevronDown className="ml-2 text-xs text-gray-400" />
                <Link to="/registration" className="text-blue-500 hover:text-blue-700 font-medium ml-4">
                  Register
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex">
          {/* Sidebar */}
          <CommunitySidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            spaces={spaces} 
            directMessages={directMessages} 
          />

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Community Hero Section */}
            <CommunityHeader 
              onCreatePost={() => setShowCreatePostModal(true)} 
              onAskHelp={() => setShowHelpRequestModal(true)}
              onStartProject={() => console.log("Start project clicked")}
            />

            {/* Community Content */}
            <div className="flex space-x-6">
              {/* Main Post Feed */}
              <div className="w-8/12">
                {/* Create Post Card */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <div className="flex items-center mb-4">
                    <img className="h-10 w-10 rounded-full mr-4" src="https://randomuser.me/api/portraits/women/42.jpg" alt="Your profile" />
                    <button 
                      onClick={() => setShowCreatePostModal(true)}
                      className="bg-gray-100 rounded-full px-4 py-2 flex-1 text-gray-500 cursor-pointer hover:bg-gray-200 text-left"
                    >
                      What's on your mind?
                    </button>
                  </div>
                  <div className="flex border-t pt-4">
                    <button className="flex-1 flex items-center justify-center text-gray-500 hover:text-blue-500">
                      <FaImage className="mr-2" /> Photo
                    </button>
                    <button className="flex-1 flex items-center justify-center text-gray-500 hover:text-blue-500">
                      <FaCode className="mr-2" /> Code
                    </button>
                    <button className="flex-1 flex items-center justify-center text-gray-500 hover:text-blue-500">
                      <FaPoll className="mr-2" /> Poll
                    </button>
                    <button className="flex-1 flex items-center justify-center text-gray-500 hover:text-blue-500">
                      <FaPaperclip className="mr-2" /> Attach
                    </button>
                  </div>
                </div>

                {/* Content based on active tab */}
                {activeTab === 'home' && (
                  <>
                    {loading ? (
                      <div className="text-center py-10">
                        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        <p className="mt-2 text-gray-500">Loading content...</p>
                      </div>
                    ) : (
                      <>
                        {posts.map(post => (
                          <CommunityPost key={post.id} post={post} />
                        ))}
                        
                        {helpRequests.map(request => (
                          <HelpRequest key={request.id} request={request} />
                        ))}
                      </>
                    )}
                  </>
                )}

                {activeTab === 'help' && (
                  <>
                    <div className="flex justify-between mb-4">
                      <h2 className="text-xl font-semibold">Help Requests</h2>
                      <button 
                        onClick={() => setShowHelpRequestModal(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                      >
                        New Help Request
                      </button>
                    </div>
                    
                    {helpRequests.map(request => (
                      <HelpRequest key={request.id} request={request} />
                    ))}
                  </>
                )}

                {(activeTab === 'spaces' || activeTab === 'offer' || activeTab === 'network' || activeTab === 'saved') && (
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
                    <p className="text-gray-500">
                      This feature is under development and will be available soon!
                    </p>
                  </div>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="w-4/12">
                {/* User Status */}
                <UserStatus />

                {/* Popular Help Requests */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-medium text-lg">Help Requests</h2>
                    <a href="#" className="text-sm text-blue-500 hover:underline">View All</a>
                  </div>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex justify-between mb-2">
                        <h3 className="font-medium">Database optimization help</h3>
                        <span className="bg-red-100 text-red-800 text-xs py-0.5 px-2 rounded-full">Urgent</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Need help optimizing PostgreSQL queries for a high-traffic application.</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Posted 4h ago</span>
                        <div className="flex items-center">
                          <img className="h-5 w-5 rounded-full mr-1" src="https://randomuser.me/api/portraits/men/55.jpg" alt="User" />
                          <span>David Wang</span>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex justify-between mb-2">
                        <h3 className="font-medium">CI/CD pipeline setup</h3>
                        <span className="bg-yellow-100 text-yellow-800 text-xs py-0.5 px-2 rounded-full">Medium</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Looking for someone to help set up a CI/CD pipeline with GitHub Actions.</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Posted 1d ago</span>
                        <div className="flex items-center">
                          <img className="h-5 w-5 rounded-full mr-1" src="https://randomuser.me/api/portraits/women/67.jpg" alt="User" />
                          <span>Emma Lewis</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trending Topics */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="font-medium text-lg mb-4">Trending Topics</h2>
                  <div className="space-y-3">
                    {spaces.map(space => (
                      <a key={space.id} href="#" className="block">
                        <span className="text-sm font-medium">{space.name}</span>
                        <p className="text-xs text-gray-500">{space.posts} posts this week</p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal 
        show={showCreatePostModal} 
        onClose={() => setShowCreatePostModal(false)} 
        onSubmit={handleCreatePost}
      />
      
      <CreateHelpRequestModal 
        show={showHelpRequestModal} 
        onClose={() => setShowHelpRequestModal(false)} 
        onSubmit={handleHelpRequestSubmit}
      />
    </div>
  );
};

export default Community;