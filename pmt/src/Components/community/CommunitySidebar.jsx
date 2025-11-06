import React from 'react';
import CommunityNav from './CommunityNav';
import CommunitySpaces from './CommunitySpaces';
import DirectMessages from './DirectMessages';
import UserStatus from './UserStatus';

const CommunitySidebar = ({ activeTab, setActiveTab, spaces, directMessages }) => {
  return (
    <div className="w-64 pr-8">
      <CommunityNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <CommunitySpaces spaces={spaces} />
      <DirectMessages users={directMessages} />
    </div>
  );
};

export default CommunitySidebar;
