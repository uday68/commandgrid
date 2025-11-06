// Copy these fixes into your SecurityDashboard.jsx file

// 1. Fix the Legend import at the top of the file to ensure it's imported properly
// Replace the existing recharts import line with this:
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, Area, AreaChart, Legend 
} from "recharts";

// 2. Your fetchSecurityData function should look like this to handle the new backend response format:

const fetchSecurityData = async () => {
  try {
    setLoading(true);
    setRefreshing(true);
    const token = localStorage.getItem("authToken");
    const [auditsRes, threatsRes, vulnRes, metricsRes] = await Promise.all([
      axios.get("http://localhost:5000/api/security/audits", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("http://localhost:5000/api/security/threats", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("http://localhost:5000/api/security/vulnerabilities", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("http://localhost:5000/api/security/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    setSecurityData({
      audits: auditsRes.data || [],
      threats: threatsRes.data || [],  // Now the direct array from the backend
      vulnerabilities: vulnRes.data || [],  // Now the direct array from the backend
      metrics: metricsRes.data || {},
    });
    
    setNotification({
      type: "success",
      message: "Security data updated successfully",
    });
  } catch (err) {
    console.error("Security data fetch error:", err);
    setNotification({
      type: "error",
      message: "Failed to fetch security data.",
    });
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
