import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  UserCircleIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

const TeamMembersSection = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('authToken');

  const getRoleBadge = (role) => {
    const roleStyles = {
      'Project Manager': 'bg-purple-100 text-purple-800',
      'Developer': 'bg-blue-100 text-blue-800',
      'Designer': 'bg-pink-100 text-pink-800',
      'Contributor': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleStyles[role] || roleStyles['Contributor']}`}>
        {role}
      </span>
    );
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/member/team', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(response.data.teams);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex overflow-scroll">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <UserGroupIcon className="w-6 h-6 text-blue-500" />
        Team Members
      </h2>

      {loading ? (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-4">{error}</div>
      ) : teams.length === 0 ? (
        <div className="text-center text-gray-500 py-4">No team members found</div>
      ) : (
        <div className="space-y-6">
          {teams.map((project) => (
            <div key={project.project_id} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardDocumentListIcon className="w-5 h-5 text-gray-400" />
                <h3 className="font-medium">{project.project_name}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.members.map((member) => (
                  <div 
                    key={member.user_id}
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
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{member.name}</h4>
                        {getRoleBadge(member.role)}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamMembersSection;