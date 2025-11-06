import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { saveAs } from 'file-saver';
import TeamMembersSection from "./TeamMembersSection";
import {
  CheckIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  CheckBadgeIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/solid";

const TeamMemberDashboard = () => {
  // States
  const [fileLinks, setFileLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newFileLink, setNewFileLink] = useState("");
  const [taskData, setTeamData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [activeProject, setActiveProject] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [newTimeEntry, setNewTimeEntry] = useState({ hours: 0, description: "" });
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [newReport, setNewReport] = useState({
    title: '',
    description: '',
    file: null
  });
  const [reportType, setReportType] = useState('daily');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);

  const token = localStorage.getItem("authToken");
  const fetchReports = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/member/reports", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data.reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };
  const generateTimeReport = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/member/reports/time", {
        headers: { Authorization: `Bearer ${token}` },
        params: { type: reportType }
      });
      setGeneratedReport(response.data);
      setShowReportModal(true);
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };
  // Fetch Team Data
  const fetchTeamData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/member/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeamData(response.data.tasks);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setError("Error fetching tasks");
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/member/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error(error);
      setError("Failed to fetch notifications");
    }
  };

  // Fetch Active Project
  const fetchActiveProject = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/member/active-project", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveProject(response.data.project);
    } catch (error) {
      console.error("Error fetching active project:", error);
    }
  };

  // Fetch Team Members

  // Fetch Time Entries
  const fetchTimeEntries = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/member/time-entries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimeEntries(response.data.entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
    }
  };

  // Handle File Submission
  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!newFileLink) return;

    try {
      await axios.post(
        "http://localhost:5000/api/files",
        { link: newFileLink },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFileLinks((prev) => [
        ...prev,
        {
          id: Date.now(),
          link: newFileLink,
          submittedAt: new Date().toISOString(),
          status: "submitted",
        },
      ]);
      setNewFileLink("");
    } catch (error) {
      console.error("Error submitting file:", error);
      setError("Error submitting file");
    }
  };

  // Handle Time Submission
  const handleTimeSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:5000/api/member/time-entries",
        newTimeEntry,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTimeEntries();
      setNewTimeEntry({ hours: 0, description: "" });
    } catch (error) {
      console.error("Error submitting time entry:", error);
    }
  };

  // Initialize Socket.IO
  useEffect(() => {
    socketRef.current = io("http://localhost:5000");

    socketRef.current.on("receiveMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Handle Message Submission
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      room: activeProject?.id || "default",
      message: newMessage,
      sender: "Current User", // Replace with actual user name
    };

    socketRef.current.emit("sendMessage", messageData);
    setMessages((prev) => [...prev, { sender: "You", message: newMessage }]);
    setNewMessage("");
  };
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newReport.title);
    formData.append('description', newReport.description);
    formData.append('reportFile', newReport.file);

    try {
      await axios.post("http://localhost:5000/api/reports", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      fetchReports();
      setNewReport({ title: '', description: '', file: null });
    } catch (error) {
      console.error("Error submitting report:", error);
    }
  };
  useEffect(() => {
    fetchReports();
    // Fetch calendar events
    axios.get("http://localhost:5000/api/calendar-events", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(response => {
      setCalendarEvents(response.data.events);
    });
  }, []);
  const ReportToolsSection = () => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <DocumentChartBarIcon className="w-6 h-6 text-purple-500" />
        Report Tools
      </h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          onClick={generateTimeReport}
          className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <div className="flex flex-col items-center">
            <ClockIcon className="w-8 h-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium">Generate Time Report</span>
          </div>
        </button>

        <button 
          onClick={() => setShowReportModal(true)}
          className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          <div className="flex flex-col items-center">
            <ChartPieIcon className="w-8 h-8 text-green-500 mb-2" />
            <span className="text-sm font-medium">Task Analytics</span>
          </div>
        </button>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Report History</h3>
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                <span className="truncate">{report.title}</span>
              </div>
              <button 
                onClick={() => window.open(report.url, '_blank')}
                className="text-blue-500 hover:text-blue-600"
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  {showReportModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Generated Report</h3>
          <button 
            onClick={() => setShowReportModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        
        {generatedReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Date Range</label>
                <input
                  type="date"
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Summary</h4>
              <p>Total Hours: {generatedReport.totalHours}</p>
              <p>Tasks Completed: {generatedReport.completedTasks}</p>
              <p>Files Submitted: {generatedReport.submittedFiles}</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => saveAs(generatedReport.pdfUrl, 'report.pdf')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Download PDF
              </button>
              <button
                onClick={() => {
                  const csv = convertToCSV(generatedReport);

                  function convertToCSV(objArray) {
                    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
                    let str = `${Object.keys(array[0]).map(value => `"${value}"`).join(',')}` + '\r\n';

                    for (let i = 0; i < array.length; i++) {
                      let line = '';
                      for (let index in array[i]) {
                        if (line !== '') line += ',';
                        line += `"${array[i][index]}"`;
                      }
                      str += line + '\r\n';
                    }
                    return str;
                  }
                  const blob = new Blob([csv], { type: 'text/csv' });
                  saveAs(blob, 'report.csv');
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                Download CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )}
  const CalendarSection = () => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <CalendarDaysIcon className="w-6 h-6 text-red-500" />
        Team Calendar
      </h2>
      <div className="grid grid-cols-1 gap-2">
        {calendarEvents.map(event => (
          <div key={event.id} className="p-3 bg-red-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{event.title}</h4>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(event.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Fetch All Data on Mount
  useEffect(() => {
    fetchTeamData();
    fetchNotifications();
    fetchActiveProject();
  
    fetchTimeEntries();
  }, []);

  // Status Icons
  const getStatusIcon = (status) => {
    switch (status) {
      case "submitted":
        return <CheckIcon className="w-5 h-5 text-gray-400" />;
      case "viewed":
        return (
          <div className="flex">
            <CheckIcon className="w-5 h-5 text-gray-400" />
            <CheckIcon className="w-5 h-5 -ml-3 text-gray-400" />
          </div>
        );
      case "in-progress":
        return (
          <div className="flex">
            <CheckIcon className="w-5 h-5 text-blue-500" />
            <CheckIcon className="w-5 h-5 -ml-3 text-blue-500" />
          </div>
        );
      case "approved":
        return <CheckBadgeIcon className="w-5 h-5 text-green-500" />;
      default:
        return <CheckIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Team Member Dashboard</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Submission Section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ArrowUpTrayIcon className="w-6 h-6 text-blue-500" />
                  File Submission
                </h2>
                <form onSubmit={handleFileSubmit} className="flex gap-2 mb-4">
                  <input
                    type="url"
                    value={newFileLink}
                    onChange={(e) => setNewFileLink(e.target.value)}
                    placeholder="Paste file link (Google Drive, Dropbox, etc.)"
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                    Submit
                  </button>
                </form>

                {/* Submitted Files List */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Submitted Files</h3>
                  {fileLinks.length > 0 ? (
                    <div className="space-y-3">
                      {fileLinks.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                            <a
                              href={file.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline truncate max-w-[200px]"
                            >
                              {file.link}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {new Date(file.submittedAt).toLocaleDateString()}
                            </span>
                            {getStatusIcon(file.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No files submitted yet</p>
                  )}
                </div>
                <ReportToolsSection />
              </div>

              {/* Time Entry Section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Log Time</h2>
                <form onSubmit={handleTimeSubmit} className="flex gap-2 mb-4">
                  <input
                    type="number"
                    value={newTimeEntry.hours}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hours: e.target.value })}
                    placeholder="Hours"
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    value={newTimeEntry.description}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
                    placeholder="Description"
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Submit
                  </button>
                </form>
              </div>

              {/* Tasks Section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Tasks</h2>
                {taskData.length > 0 ? (
                  <div className="space-y-4">
                    {taskData.map((task) => (
                      <div
                        key={task.task_id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <p>{task.title}</p>
                        <p>{task.description}</p>
                        <p>{task.status}</p>
                        <p>Due Date: {new Date(task.due_date).toLocaleDateString()}</p>
                        <button>submit</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No tasks assigned</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
            <CalendarSection />
              {/* Notifications Section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Notifications</h2>
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notifications yet</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.notification_id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <p>{notification.message || "no notification"}</p>
                      <p>{new Date(notification.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Projects Section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Projects</h2>
                {activeProject ? (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{activeProject.name}</h3>
                    <p className="text-gray-600 mb-4">{activeProject.description}</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Project Progress</span>
                        <span className="text-sm font-medium text-gray-700">
                          {activeProject.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${activeProject.progress}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600">Start Date</p>
                          <p className="font-medium">
                            {new Date(activeProject.start_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">End Date</p>
                          <p className="font-medium">
                            {new Date(activeProject.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No active project</p>
                )}
              </div>
             
              {/* Chat Section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Team Chat</h2>
                <div className="h-64 overflow-y-auto mb-4 space-y-3">
                  {messages.map((msg, index) => (
                    <div key={index} className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">
                        {msg.sender}
                      </span>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        {msg.message}
                      </p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
          <TeamMembersSection></TeamMembersSection>
      </div>
    
    </div>
  );
};

export default TeamMemberDashboard;