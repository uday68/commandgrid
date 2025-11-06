import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Sidebar from "../Components/Sidebar";
import { FiFolder, FiCheckCircle, FiUsers, FiFileText, FiMessageSquare } from "react-icons/fi";
const Team = () => {
  const [teamData, setTeamData] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch teams from backend
  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken")
        const response = await axios.get("http://localhost:5000/api/project-manager/teams",{
          headers: {
            'Content-Type': 'application/json',
            Authorization : `Bearer ${token}`,
          }

        });
        console.log("Fetched Data:", response.data.data);

        if (response.data.success) {
          setTeamData(response.data.data); // Extract the data array
          setFilteredTeams(response.data.data);
        } else {
          console.error("Invalid API response structure");
          setError("Failed to load teams.");
        }
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load teams. Please try again later.");
      }
      setLoading(false);
    };
    fetchTeams();
  }, []);

  // Search filtering
  useEffect(() => {
    const filtered = teamData.filter((team) =>
      team.team_name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredTeams(filtered);
  }, [search, teamData]);
const sidebarLinks = [
    { path: "/projects", label: "Projects", icon: FiFolder },
    { path: "/tasks", label: "Tasks", icon: FiCheckCircle },
    { path: "/teams", label: "Teams", icon: FiUsers },
    { path: "/reports", label: "Reports", icon: FiFileText },
    { path: "#", label: "AI Assistant", icon: FiMessageSquare, onClick: () => setShowAIChat(true) },
  ];
  return (
    <div className="flex  h-screen">
      <Sidebar links={sidebarLinks}/>
    <div className="p-6 bg-gray-50 min-h-screen w-full">
      
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Teams</h1>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        {/* Number of Teams */}
        <p className="text-gray-700 mb-4 md:mb-0">
          Total Teams: <span className="font-bold">{teamData.length}</span>
        </p>

        {/* Create Team Button */}
        <Link
          to="/create-team"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition duration-300"
        >
          Create New Team
        </Link>
      </div>

      {/* Search Input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search for a team..."
        className="border p-2 rounded-md w-full mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Show Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Show Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Display Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <div
              key={team.team_id}
              className="bg-white shadow-lg rounded-xl p-6 flex flex-col gap-4 border border-gray-200 hover:shadow-xl transition-shadow duration-300"
            >
              {/* Team Name */}
              <h2 className="text-xl font-semibold text-gray-800">{team.name}</h2>

              {/* Project Details */}
              <div className="space-y-2">
                <p className="text-gray-600">
                  Project: <span className="font-medium">{team.project_name}</span>
                </p>
                <p className="text-gray-600 text-sm">
                  Description: {team.project_description || "No description available."}
                </p>
              </div>

              {/* Team Status */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-3 h-3 rounded-full ${
                    team.status === "Active" ? "bg-green-500" : "bg-gray-500"
                  }`}
                ></span>
                <p className="text-sm font-medium text-gray-600">
                  Status: {team.status}
                </p>
              </div>

              {/* Team Members */}
              <p className="text-sm text-gray-600">
                Members: <span className="font-medium">{team.total_members}</span>
              </p>

              {/* Progress Bar (Example) */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min(team.total_members * 10, 100)}%` }}
                ></div>
              </div>

              {/* View Team Button */}
              <Link
                to={`/team/${team.team_id}`}
                className="mt-4 inline-block bg-blue-500 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-600 transition duration-300 text-center"
              >
                View Team
              </Link>
            </div>
          ))
        ) : (
          <p className="text-gray-600 col-span-full text-center">No teams found.</p>
        )}
      </div>
    </div>
    </div>
  );
};

export default Team;