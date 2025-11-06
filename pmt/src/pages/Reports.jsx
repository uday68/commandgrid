import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import Sidebar from '../Components/Sidebar';
import { FiActivity,FiFolder,FiCheckCircle,FiUsers,FiFileText,FiMessageSquare } from 'react-icons/fi';

const Report = () => {
  const [reports, setReports] = useState([]);
  const [adminReports, setAdminReports] = useState([]);
  const [viewMode, setViewMode] = useState('team'); // 'team' or 'admin'
  const [newReport, setNewReport] = useState({
    title: '',
    content: '',
    recipient: 'admin'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch reports from team members and admin reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [teamResponse, adminResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/reports/team',{
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') 
                }
          }),
          axios.get('http://localhost:5000/api/reports/admin',{
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') 
                }
          })
        ]);
         console.log(teamResponse.data)
        setReports(teamResponse.data);
        setAdminReports(adminResponse.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch reports');
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Submit report to admin
  const submitAdminReport = async (e) => {
    e.preventDefault();
    try {
        const response = await axios.post('http://localhost:5000/api/reports/admin', {
            ...newReport,
            date: new Date().toISOString()
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        setAdminReports([...adminReports, response.data]);
        setNewReport({ title: '', content: '', recipient: 'admin' });
    } catch (err) {
        setError('Failed to submit report');
    }
};


  // Update report status
  const updateReportStatus = async (reportId, status) => {
    try {
      await axios.patch(`/api/reports/${reportId}`, { status });
      setReports(reports.map(report => 
        report.id === reportId ? { ...report, status } : report
      ));
    } catch (err) {
      setError('Failed to update report status');
    }
  };
 const sidebarLinks = [
      { path: "/projects", label: "Projects", icon: FiFolder },
      { path: "/tasks", label: "Tasks", icon: FiCheckCircle },
      { path: "/teams", label: "Teams", icon: FiUsers },
      { path: "/reports", label: "Reports", icon: FiFileText },
      { path: "#", label: "AI Assistant", icon: FiMessageSquare, onClick: () => setShowAIChat(true) },
    ];
  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">{<Sidebar links={sidebarLinks}></Sidebar>}<p className="flex justify-center content-center">{error}</p></div>;

  return (
    <div className="flex h-screen"> 
   
    <div className="report-manager-container">
      <div className="view-mode-toggle">
        <button
          className={`toggle-btn ${viewMode === 'team' ? 'active' : ''}`}
          onClick={() => setViewMode('team')}
        >
          Team Reports ({reports.length})
        </button>
        <button
          className={`toggle-btn ${viewMode === 'admin' ? 'active' : ''}`}
          onClick={() => setViewMode('admin')}
        >
          Admin Reports ({adminReports.length})
        </button>
      </div>

      {viewMode === 'team' ? (
        <div className="team-reports">
          <h2>Team Member Reports</h2>
          <div className="reports-table">
            <div className="table-header">
              <span>Title</span>
              <span>Author</span>
              <span>Date</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {reports.map(report => (
              <div className="table-row" key={report.id}>
                <span>{report.title}</span>
                <span>{report.author.name}</span>
                <span>{format(new Date(report.date), 'MM/dd/yyyy')}</span>
                <span className={`status-badge ${report.status}`}>
                  {report.status}
                </span>
                <div className="actions">
                  <button 
                    className="view-btn"
                    onClick={() => window.open(report.attachment, '_blank')}
                  >
                    View Attachment
                  </button>
                  <select
                    value={report.status}
                    onChange={(e) => updateReportStatus(report.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="admin-reports">
          <h2>Reports to Admin</h2>
          <form onSubmit={submitAdminReport} className="report-form">
            <input
              type="text"
              placeholder="Report Title"
              value={newReport.title}
              onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Report Content"
              value={newReport.content}
              onChange={(e) => setNewReport({ ...newReport, content: e.target.value })}
              required
            />
            <button type="submit" className="submit-btn">
              Submit to Admin
            </button>
          </form>

          <div className="submitted-reports">
            {adminReports.map(report => (
              <div className="report-card" key={report.id}>
                <h3>{report.title}</h3>
                <p className="date">
                  {format(new Date(report.date), 'MMM dd, yyyy HH:mm')}
                </p>
                <p className="content">{report.content}</p>
                <div className="status">
                  Admin Feedback: {report.feedback || 'No feedback yet'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Report;