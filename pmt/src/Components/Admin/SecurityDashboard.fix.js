// Fix for the SecurityDashboard.jsx file

// 1. Update the fetchSecurityData function to handle paginated responses:

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
      // Extract the threats array from the response or use empty array if not found
      threats: threatsRes.data?.threats || [],
      // Extract the vulnerabilities array from the response or use empty array if not found
      vulnerabilities: vulnRes.data?.vulnerabilities || [],
      metrics: metricsRes.data || {},
      // Store the pagination data for potential use
      pagination: {
        threatsPagination: threatsRes.data?.pagination || {},
        vulnPagination: vulnRes.data?.pagination || {}
      }
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

// 2. Alternative approach: You could also modify the backend to return just the array
// but that would require updating all clients. Here's a simpler backend-only fix:

// In security.js, modify the threats endpoint response to return just the array:
res.json(result.rows);

// And do the same for the vulnerabilities endpoint.

// 3. If Legend is not defined error:
// Import Legend from recharts at the top of the file:
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, Area, AreaChart, Legend 
} from "recharts";
