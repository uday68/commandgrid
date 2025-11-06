import React from 'react';
import { FaHome, FaUsers, FaQuestionCircle, FaHandsHelping, FaUserFriends, FaBookmark } from 'react-icons/fa';

const CommunityNav = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', icon: <FaHome />, label: 'Home' },
    { id: 'spaces', icon: <FaUsers />, label: 'Spaces' },
    { id: 'help', icon: <FaQuestionCircle />, label: 'Help Requests', badge: 8 },
    { id: 'offer', icon: <FaHandsHelping />, label: 'Offer Help' },
    { id: 'network', icon: <FaUserFriends />, label: 'My Network' },
    { id: 'saved', icon: <FaBookmark />, label: 'Saved Posts' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="font-medium text-lg mb-4">Community</h2>
      <ul className="space-y-2">
        {navItems.map(item => (
          <li key={item.id}>
            <button 
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left flex items-center p-2 rounded-md ${activeTab === item.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            >
              <span className="mr-3">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                  {item.badge}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CommunityNav;
