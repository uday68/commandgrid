import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import Sidebar from '../Components/Sidebar';
import { 
  PlusIcon,
  TrashIcon,
  UserCircleIcon,
  CalendarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { FiFolder, FiCheckCircle, FiUsers, FiFileText, FiMessageSquare } from 'react-icons/fi';

const API_BASE_URL = "http://localhost:5000";

const Task = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    assigned_to: '',
    status: 'Pending',
    priority: 'Medium',
    due_date: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getAuthToken = () => localStorage.getItem('authToken');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        const [projectsRes, usersRes, tasksRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/projects`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/api/project-manager/tasks`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setProjects(projectsRes.data.projects);
        setUsers(() => {
          return usersRes.data.users
              .filter(user => user.role === 'Member')
              .map(user => {
                  return {
                      ...user // or any other modifications you want to make
                  };
              });
      });
      
        setTasks(tasksRes.data.tasks);
        console.log(projectsRes.data.projects);
        setUsers(usersRes.data.users);
        setTasks(tasksRes.data.tasks)
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const res = await axios.post(`${API_BASE_URL}/api/tasks`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTasks([...tasks, res.data.task]);
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        project_id: '',
        assigned_to: '',
        status: 'Pending',
        priority: 'Medium',
        due_date: ''
      });
    } catch (err) {
      setError('Failed to create task');
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const token = getAuthToken();
      const res = await axios.put(
        `${API_BASE_URL}/api/tasks/${taskId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTasks(tasks.map(task => 
        task.task_id === taskId ? res.data.task : task
      ));
    } catch (err) {
      setError('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const token = getAuthToken();
      await axios.delete(`${API_BASE_URL}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(tasks.filter(task => task.task_id !== taskId));
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  const getProjectName = (projectId) => {
    return projects.find(p => p.project_id === projectId)?.name || 'No Project';
  };

  const getUserName = (userId) => {
    return users.find(u => u.user_id === userId)?.name || 'Unassigned';
  };

  if (loading) return (
    <div className="flex justify-center p-8">
      <ArrowPathIcon className="h-12 w-12 animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
  );
  const sidebarLinks = [
    { path: "/projects", label: "Projects", icon: FiFolder },
    { path: "/tasks", label: "Tasks", icon: FiCheckCircle },
    { path: "/teams", label: "Teams", icon: FiUsers },
    { path: "/reports", label: "Reports", icon: FiFileText },
    { path: "#", label: "AI Assistant", icon: FiMessageSquare, onClick: () => setShowAIChat(true) },
  ];

  return (
    <div className='flex'>
    <Sidebar links={sidebarLinks}/>
    <div className="max-w-7xl mx-auto px-4 py-8 flex-1 p-6 overflow-y-auto">
    
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(task => (
          <div key={task.task_id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{task.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {getProjectName(task.project_id)}
                </p>
              </div>
              <button
                onClick={() => handleDeleteTask(task.task_id)}
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">{task.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}
                onClick={() => handleUpdateStatus(task.task_id, task.status === 'Completed' ? 'Pending' : 'Completed')}
              >
                {task.status}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                task.priority === 'High' ? 'bg-red-100 text-red-800' :
                task.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }`}>
                {task.priority} Priority
              </span>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <UserCircleIcon className="h-5 w-5" />
                <span>{getUserName(task.assigned_to)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon className="h-5 w-5" />
                <span>
                  {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No due date'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project</label>
                  <select
                    value={formData.project_id}
                    onChange={e => setFormData({...formData, project_id: e.target.value})}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full p-2 border rounded-md"
                    rows="3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Assignee</label>
                    <select
                      value={formData.assigned_to}
                      onChange={e => setFormData({...formData, assigned_to: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Unassigned</option>
                      {users.map(user => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={e => setFormData({...formData, due_date: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Task;