import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Typography,
  Grid,
  Card,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  FiServer,
  FiDatabase,
  FiUsers,
  FiActivity,
  FiShield,
  FiAlertTriangle,
  FiLock,
  FiClock,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

// Define theme options
const themes = {
  light: {
    bg: "bg-gray-50",
    card: "bg-white",
    text: "text-gray-800",
    header: "bg-white",
    border: "border-gray-200",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  dark: {
    bg: "bg-gray-900",
    card: "bg-gray-800",
    text: "text-blue-100",
    header: "bg-gray-800",
    border: "border-gray-700",
    button: "bg-blue-500 hover:bg-blue-600 text-white",
  },
  blue: {
    bg: "bg-blue-50",
    card: "bg-white",
    text: "text-blue-900",
    header: "bg-blue-100",
    border: "border-blue-200",
    button: "bg-blue-700 hover:bg-blue-800 text-white",
  },
};

const SystemMetrics = ({ theme = "light", font = "font-sans" }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Determine current theme styles
  const currentTheme = themes[theme];

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await axios.get("http://localhost:5000/api/security/metrics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMetrics(res.data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        setNotification({
          type: "error",
          message: t("Failed to fetch metrics."),
        });
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading)
    return (
      <Stack className={`${currentTheme.bg} ${currentTheme.text} ${font}`} p={3}>
        <LinearProgress />
      </Stack>
    );

  if (!metrics)
    return (
      <Stack className={`${currentTheme.bg} ${currentTheme.text} ${font}`} p={3}>
        <Typography>{t("No metrics available")}</Typography>
      </Stack>
    );

  // Prepare chart data (for demonstration, using total budget as an example)
  const chartData = [
    { name: t("Budget"), value: Number(metrics.total_budget) || 0 },
  ];

  return (
    <Stack className={`${currentTheme.bg} ${currentTheme.text} ${font}`} p={3}>
      {/* Header */}
      <Stack mb={3}>
        <Typography variant="h4" display="flex" alignItems="center">
          <FiServer style={{ marginRight: 8 }} />
          {t("System Metrics")}
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {t("View system performance and resource usage")}
        </Typography>
      </Stack>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card className={`${currentTheme.card} p-3`}>
            <Stack className="flex items-center">
              <FiUsers style={{ fontSize: 32, marginRight: 12, color: "#2563eb" }} />
              <Stack>
                <Typography variant="subtitle2">{t("Total Users")}</Typography>
                <Typography variant="h5">{metrics.total_users || 0}</Typography>
              </Stack>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className={`${currentTheme.card} p-3`}>
            <Stack className="flex items-center">
              <FiDatabase style={{ fontSize: 32, marginRight: 12, color: "#16a34a" }} />
              <Stack>
                <Typography variant="subtitle2">{t("Total Projects")}</Typography>
                <Typography variant="h5">{metrics.total_projects || 0}</Typography>
              </Stack>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className={`${currentTheme.card} p-3`}>
            <Stack className="flex items-center">
              <FiActivity style={{ fontSize: 32, marginRight: 12, color: "#9333ea" }} />
              <Stack>
                <Typography variant="subtitle2">{t("Total Tasks")}</Typography>
                <Typography variant="h5">{metrics.total_tasks || 0}</Typography>
              </Stack>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className={`${currentTheme.card} p-3`}>
            <Stack className="flex items-center">
              <FiClock style={{ fontSize: 32, marginRight: 12, color: "#f59e0b" }} />
              <Stack>
                <Typography variant="subtitle2">{t("Avg Response Time")}</Typography>
                <Typography variant="h5">
                  {metrics.avg_response_time ? `${metrics.avg_response_time}m` : t("N/A")}
                </Typography>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Budget Chart */}
      <Stack mb={4}>
        <Typography variant="h6" gutterBottom>
          {t("Budget Overview")}
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value}`} />
            <Legend />
            <Bar dataKey="value" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </Stack>

      {/* Role Distribution Table */}
      {metrics.role_distribution && (
        <Stack mb={4}>
          <Typography variant="h6" gutterBottom>
            {t("Role Distribution")}
          </Typography>
          <TableContainer component={Paper} className={`${currentTheme.card}`}>
            <Table>
              <TableHead className={currentTheme.header}>
                <TableRow>
                  <TableCell>{t("Role")}</TableCell>
                  <TableCell align="right">{t("Count")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.role_distribution.map((item, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell>{item.role}</TableCell>
                    <TableCell align="right">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {notification && (
          <Alert onClose={() => setNotification(null)} severity={notification.type}>
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Stack>
  );
};

export default SystemMetrics;
