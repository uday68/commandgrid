import React, { useState, useEffect, useMemo } from "react";
import { useTable, useGlobalFilter, usePagination } from "react-table";
import { 
  FiUsers, FiFolder, FiSettings, FiActivity, FiTool,
  FiBarChart, FiShield, FiEye, FiDatabase, FiTerminal, FiSearch 
} from "react-icons/fi";
import axios from "axios";
import { format } from "date-fns";
import AuditLogs from "../Components/Admin/AuditLogs";
import UserImpersonation from "../Components/Admin/UserImpersonation";
import SystemMetrics from "../Components/Admin/SystemMetrics";
import AdminToolsPanel from "../Components/Admin/AdminToolsPanel";
import ProjectManager from "../Components/Admin/ProjectManager";
import RoleEditor from "../Components/Admin/RoleEditor";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [metrics, setMetrics] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const [metricsRes, logsRes, usersRes, projectsRes] = await Promise.all([
          axios.get("/api/admin/metrics", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/api/admin/audit-logs", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/api/projects", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setMetrics(metricsRes.data);
        setAuditLogs(logsRes.data);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []); // Ensure users is an array
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      } catch (err) {
        console.error("Admin data fetch error:", err);
        setUsers([]); // Prevent undefined issues
        setProjects([]);
      }
    };

    fetchData();
  }, []);

  const adminTabs = [
    { id: "users", label: "User Management", icon: FiUsers },
    { id: "projects", label: "Project Oversight", icon: FiFolder },
    { id: "audit", label: "Audit Logs", icon: FiActivity },
    { id: "metrics", label: "System Metrics", icon: FiBarChart },
    { id: "tools", label: "Admin Tools", icon: FiTool },
    { id: "security", label: "Security Center", icon: FiShield }
  ];

  const handleUserUpdate = async (userId, updates) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(`/api/admin/users/${userId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.map((u) => (u.user_id === userId ? { ...u, ...updates } : u)));
    } catch (err) {
      console.error("User update error:", err);
    }
  };

  // Define table columns
  const columns = useMemo(
    () => [
      { Header: "Name", accessor: "name" },
      { Header: "Email", accessor: "email" },
      {
        Header: "Role",
        accessor: "role",
        Cell: ({ row }) => (
          <RoleEditor
            value={row.values.role}
            onChange={(newRole) => handleUserUpdate(row.original.user_id, { role: newRole })}
          />
        ),
      },
      {
        Header: "Last Active",
        accessor: "last_active",
        Cell: ({ value }) => (value ? format(new Date(value), "MMM dd, yyyy HH:mm") : "N/A"),
      },
    ],
    []
  );

  // Ensure data is always an array
  const data = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, setGlobalFilter } =
    useTable({ columns, data }, useGlobalFilter, usePagination);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Admin Navigation */}
          <nav className="w-64 space-y-1">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <tab.icon className="mr-3" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === "users" && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <FiUsers className="mr-2" /> User Management
                </h2>

                {/* Search Bar */}
                <div className="flex items-center bg-gray-100 p-2 rounded-lg w-64 mb-4">
                  <FiSearch className="mr-2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="bg-transparent outline-none w-full"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setGlobalFilter(e.target.value);
                    }}
                  />
                </div>

                {/* User Table */}
                <table {...getTableProps()} className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    {headerGroups.map((headerGroup, headerGroupIndex) => (
                      <tr {...headerGroup.getHeaderGroupProps()} key={headerGroupIndex}>
                        {headerGroup.headers.map((column, index) => (
                          <th {...column.getHeaderProps()} key={index} className="p-3 border border-gray-300 text-left">
                            {column.render("Header")}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody {...getTableBodyProps()}>
                    {rows.length > 0 ? (
                      rows.map((row) => {
                        prepareRow(row);
                        return (
                          <tr {...row.getRowProps()} key={row.id} className="hover:bg-gray-50">
                            {row.cells.map((cell) => (
                              <td {...cell.getCellProps()} key={cell.column.id} className="p-3 border border-gray-300">
                                {cell.render("Cell")}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="text-center p-4">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "projects" && <ProjectManager projects={projects} />}
            {activeTab === "audit" && <AuditLogs logs={auditLogs} />}
            {activeTab === "metrics" && <SystemMetrics metrics={metrics} />}
            {activeTab === "tools" && <AdminToolsPanel />}
            {activeTab === "security" && (
              <div className="space-y-6">
                <UserImpersonation />
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">
                    <FiDatabase className="mr-2" /> Database Administration
                  </h3>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;