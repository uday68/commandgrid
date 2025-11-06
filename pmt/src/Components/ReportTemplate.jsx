import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, PieChart, Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { saveAs } from 'file-saver';

const ReportTemplate = ({ isOpen,onClose, role, companyId, userId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: 'last30',
    projectId: null,
    teamId: null
  });

  // Enhanced endpoint mapping with filters
  const getEndpointByRole = () => {
    const baseEndpoint = `/api/reports/${role.toLowerCase().replace(' ', '-')}`;
    const params = new URLSearchParams({
      companyId,
      userId,
      ...filters
    });
    return `${baseEndpoint}?${params}`;
  };

  // Advanced data fetching with error handling
  const fetchReportData = async () => {
    try {
      const endpoint = getEndpointByRole();
      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReportData(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  // PDF Report Generation
  const generatePDFReport = () => {
    axios.post('/api/reports/generate-pdf', reportData, {
      responseType: 'blob'
    }).then(res => {
      saveAs(res.data, `${role}_Report_${new Date().toISOString()}.pdf`);
    });
  };

  // Enhanced loading and error states
  if (loading) return (
    <div className="skeleton-loader space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  );

  if (error) return (
    <div className="error-message bg-red-100 p-4 rounded">
      <h3 className="text-red-600 font-bold">Error Loading Report</h3>
      <p className="text-red-800">{error}</p>
      <button onClick={fetchReportData} className="mt-2 bg-red-600 text-white px-4 py-2 rounded">
        Retry
      </button>
    </div>
  );

  return (
    <div className="advanced-report-template p-6 bg-white shadow-lg rounded-lg">
      <div className="report-header flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">{role} Dashboard</h2>
        <div className="report-actions space-x-4">
          <button onClick={generatePDFReport} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Export PDF
          </button>
          <select 
            onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Admin-Specific Insights */}
      {role === 'Admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-xl font-semibold mb-4">Company Security Status</h3>
            <PieChart width={300} height={200}>
              <Pie
                data={reportData.securityStatus}
                cx={150}
                cy={100}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {reportData.securityStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
            <div className="mt-4 space-y-2">
              <p>Active Threats: {reportData.activeThreats}</p>
              <p>Audit Actions: {reportData.auditActions}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-xl font-semibold mb-4">Financial Overview</h3>
            <BarChart width={300} height={200} data={reportData.financials}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4F46E5" />
            </BarChart>
            <p className="mt-4">Total Budget: ${reportData.totalBudget}</p>
            <p>Utilization Rate: {reportData.budgetUtilization}%</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-xl font-semibold mb-4">User Activity</h3>
            <div className="space-y-2">
              <p>Active Users: {reportData.activeUsers}</p>
              <p>Pending Invites: {reportData.pendingInvites}</p>
              <div className="mt-4">
                <h4 className="font-semibold">Recent Logins</h4>
                <ul className="list-disc pl-5">
                  {reportData.recentLogins.map(login => (
                    <li key={login.timestamp}>{login.user} - {login.time}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Manager View */}
      {role === 'Project Manager' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-semibold mb-4">Project Health</h3>
              <div className="space-y-4">
                <div className="progress-bar bg-gray-200 rounded h-4">
                  <div 
                    className="bg-green-500 h-4 rounded" 
                    style={{width: `${reportData.projectHealth.completion}%`}}
                  ></div>
                </div>
                <p>Tasks Completed: {reportData.projectHealth.completedTasks}/{reportData.projectHealth.totalTasks}</p>
                <p>Milestones Reached: {reportData.projectHealth.milestonesCompleted}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-semibold mb-4">Team Performance</h3>
              <ul className="space-y-3">
                {reportData.teamPerformance.map(team => (
                  <li key={team.id} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span>{team.name}</span>
                      <span className="font-semibold">{team.completion}%</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {team.members} members | {team.openTasks} open tasks
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-xl font-semibold mb-4">Risk Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportData.riskAnalysis.map(risk => (
                <div key={risk.id} className="p-3 rounded border">
                  <h4 className="font-semibold">{risk.category}</h4>
                  <p className="text-sm">{risk.description}</p>
                  <div className="mt-2 text-right">
                    <span className={`badge ${risk.severity === 'High' ? 'bg-red-500' : 'bg-yellow-500'} text-white px-2 py-1 rounded`}>
                      {risk.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Table for All Roles */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Detailed Metrics</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {reportData.metrics.headers.map(header => (
                <th key={header} className="p-3 text-left border">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.metrics.rows.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="p-3 border">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportTemplate;