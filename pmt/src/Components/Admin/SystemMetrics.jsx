import { useState, useEffect } from "react";
import { FiServer, FiDatabase, FiUsers, FiActivity } from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import axios from "axios";

const SystemMetrics = () => {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    storage: 0,
    network: 0,
    activeUsers: 0,
    requests: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/metrics");
        setMetrics(response.data || {}); // Axios already returns parsed JSON
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Auto-refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const performanceData = [
    { id: 1, name: "CPU", usage: metrics.cpu ?? 0 },
    { id: 2, name: "Memory", usage: metrics.memory ?? 0 },
    { id: 3, name: "Storage", usage: metrics.storage ?? 0 },
    { id: 4, name: "Network", usage: metrics.network ?? 0 }, 
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <FiActivity className="mr-2" /> System Health Monitor
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <FiServer className="text-3xl mb-2 text-blue-600" />
          <h3 className="font-semibold">CPU Usage</h3>
          <p className="text-2xl">{metrics.cpu ?? 0}%</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <FiDatabase className="text-3xl mb-2 text-green-600" />
          <h3 className="font-semibold">Memory Usage</h3>
          <p className="text-2xl">{metrics.memory ?? 0}%</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <FiUsers className="text-3xl mb-2 text-purple-600" />
          <h3 className="font-semibold">Active Users</h3>
          <p className="text-2xl">{metrics.activeUsers ?? 0}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <FiActivity className="text-3xl mb-2 text-orange-600" />
          <h3 className="font-semibold">API Requests</h3>
          <p className="text-2xl">{metrics.requests ?? 0}/min</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="usage" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SystemMetrics;
