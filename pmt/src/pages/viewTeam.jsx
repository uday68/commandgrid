import React from "react";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { UserGroupIcon, UserCircleIcon, EnvelopeIcon, BriefcaseIcon } from "@heroicons/react/24/outline";

const ViewTeam = () => {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch(`http://localhost:5000/api/teams/${id}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch team');
        return response.json();
      })
      .then(data => setTeam(data))
      .catch(error => setError(error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [id]); // Added dependency array to prevent infinite re-renders

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 text-red-600 rounded-lg mx-4 my-6">
      Error: {error.message}
    </div>
  );

  if (!team) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Team Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <UserGroupIcon className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800">{team.name}</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <BriefcaseIcon className="w-5 h-5 text-gray-400" />
              <span>Team ID: {team.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-gray-400" />
              <span>Members: {team.totalmember}</span>
            </div>
            {team.description && (
              <p className="md:col-span-2 text-gray-600">
                {team.description}
              </p>
            )}
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <UserGroupIcon className="w-6 h-6 text-blue-500" />
            Team Members
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {team.members.map((member) => (
              <div 
                key={member.id}
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  {member.profile_picture ? (
                    <img 
                      src={member.profile_picture} 
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                  )}
                </div>

                <div className="ml-4 flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-medium text-gray-800">{member.name}</h3>
                    <span className="text-sm text-gray-500">#{member.id}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <EnvelopeIcon className="w-4 h-4" />
                    <a 
                      href={`mailto:${member.email}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {member.email}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTeam;