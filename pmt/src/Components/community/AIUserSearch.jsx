import React, { useState } from 'react';
import { FaSearch, FaSpinner, FaUserCircle } from 'react-icons/fa';
import apiService from '../../utils/api';

const AIUserSearch = ({ onUserSelect }) => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const searchResults = await apiService.community.searchUsers(query);
      setResults(searchResults);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
      <h2 className="font-medium text-lg mb-3">Find Teammates with AI</h2>
      <p className="text-gray-500 text-sm mb-3">
        Describe the skills, experience, or project background you're looking for
      </p>
      
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 'React developer who has worked on e-commerce projects'"
            className="flex-grow border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-lg focus:outline-none ${
              searching ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            disabled={searching || !query.trim()}
          >
            {searching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
          </button>
        </div>
      </form>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {results.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Search Results</h3>
          {results.map((user) => (
            <div 
              key={user.user_id}
              className="border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition"
              onClick={() => onUserSelect && onUserSelect(user)}
            >
              <div className="flex items-start">
                <div className="h-12 w-12 rounded-full mr-3 overflow-hidden">
                  {user.profile_picture ? (
                    <img 
                      src={user.profile_picture} 
                      alt={user.name} 
                      className="h-12 w-12 object-cover"
                    />
                  ) : (
                    <FaUserCircle className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{user.name}</h4>
                  <p className="text-sm text-gray-500">{user.role}</p>
                  
                  {user.skills && user.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.skills.slice(0, 3).map((skill, i) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                      {user.skills.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          +{user.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {user.projects && user.projects.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Recent projects:</p>
                  {user.projects.slice(0, 2).map((project) => (
                    <p key={project.project_id} className="text-sm truncate text-gray-700">
                      • {project.name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !searching && query.length > 0 && (
          <p className="text-gray-500 text-center py-4">No results found</p>
        )
      )}
      
      {!searching && !query && (
        <div className="text-center py-4 border border-dashed rounded-lg">
          <p className="text-gray-500">
            Try searching for skills, roles, or project experience
          </p>
          <div className="mt-2 space-x-1">
            <button 
              onClick={() => setQuery("React developer with ecommerce experience")}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-200"
            >
              React developer
            </button>
            <button 
              onClick={() => setQuery("Backend developer who knows Python")}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-200"
            >
              Python backend
            </button>
            <button 
              onClick={() => setQuery("UI/UX designer with mobile app experience")}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-200"
            >
              UI/UX designer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIUserSearch;
