import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Button, 
  TextField, 
  Typography, 
  Grid,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Snackbar, 
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Card,
  CardContent,
  Chip
} from "@mui/material";
import { supabase } from "./supabaseClient";
import { useTranslation } from "react-i18next";

const Reports = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [adminReports, setAdminReports] = useState([]);
  const [viewMode, setViewMode] = useState("team");
  const [newReport, setNewReport] = useState({
    title: "",
    content: "",
    recipient: "admin",
    recipient_id: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const [notification, setNotification] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [user, setUser] = useState(null);

  // Fetch user session and initial data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setUser(userData);
      }
    };

    fetchUser();
  }, []);

  // Fetch reports and admins
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [teamRes, adminRes] = await Promise.all([
          axios.get("/api/reports/team"),
          axios.get("/api/admin/reports"),
        ]);
        setReports(teamRes.data || []);
        setAdminReports(adminRes.data || []);
      } catch (err) {
        setError("Failed to fetch reports");
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAdmins = async () => {
      try {
        const { data: adminsData } = await supabase
          .from("admins")
          .select("admin_id, first_name, last_name, email")
          .order("created_at", { ascending: false });

        setAdmins(adminsData || []);
      } catch (err) {
        setError("Failed to fetch admins");
        console.error("Error fetching admins:", err);
      }
    };

    if (user) {
      fetchReports();
      fetchAdmins();
    }
  }, [user]);

  // Submit report to admin
  const submitAdminReport = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("reports")
        .insert([{
          title: newReport.title,
          content: newReport.content,
          author_id: user.user_id,
          status: "pending",
          recipient: newReport.recipient,
          recipient_id: newReport.recipient_id,
          description: newReport.content.substring(0, 500)
        }])
        .select();

      if (error) throw error;

      setAdminReports([...adminReports, data[0]]);
      setNewReport({ 
        title: "", 
        content: "", 
        recipient: "admin",
        recipient_id: null 
      });
      setNotification({
        type: "success",
        message: "Report submitted successfully"
      });
    } catch (err) {
      setError("Failed to submit report");
      setNotification({
        type: "error",
        message: "Failed to submit report"
      });
    }
  };

  // Update report status
  const updateReportStatus = async (reportId, status) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("report_id", reportId);

      if (error) throw error;

      setReports(reports.map(report =>
        report.report_id === reportId ? { ...report, status } : report
      ));
      setNotification({
        type: "success",
        message: "Report status updated"
      });
    } catch (err) {
      setError("Failed to update report status");
      setNotification({
        type: "error",
        message: "Failed to update status"
      });
    }
  };

  // AI Summarize a report
  const handleSummarizeReport = async (report) => {
    try {
      setSummarizing(true);
      // This would call your AI summarization endpoint
      // For now we'll just use the first 200 chars as a placeholder
      setSummary(report.content.substring(0, 200) + "... [AI Summary Placeholder]");
      setOpenSummaryDialog(true);
    } catch (err) {
      console.error("Error summarizing report:", err);
      setError("Failed to summarize report");
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box display="flex" gap={2} mb={3}>
          <Button 
            variant={viewMode === "team" ? "contained" : "outlined"}
            onClick={() => setViewMode("team")}
          >
            Team Reports ({reports.length})
          </Button>
          <Button 
            variant={viewMode === "admin" ? "contained" : "outlined"}
            onClick={() => setViewMode("admin")}
          >
            Admin Reports ({adminReports.length})
          </Button>
        </Box>

        {viewMode === "team" ? (
          <Box>
            <Typography variant="h5" gutterBottom>
              Team Member Reports
            </Typography>
            {reports.length === 0 ? (
              <Typography variant="body1" color="textSecondary">
                No team reports available
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {reports.map((report) => (
                  <Grid item xs={12} md={6} key={report.report_id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6">{report.title}</Typography>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(report.created_at).toLocaleDateString()}
                          </Typography>
                          <Chip 
                            label={report.status} 
                            size="small"
                            color={
                              report.status === "approved" ? "success" :
                              report.status === "reviewed" ? "info" : "default"
                            }
                          />
                        </Box>
                        <Typography variant="body2" paragraph>
                          {report.description?.substring(0, 150)}...
                        </Typography>
                        <Box display="flex" gap={1} mt={2}>
                          <Button
                            size="small"
                            onClick={() => window.open(report.attachment_url, "_blank")}
                            disabled={!report.attachment_url}
                          >
                            View Attachment
                          </Button>
                          <FormControl size="small" variant="outlined">
                            <Select
                              value={report.status}
                              onChange={(e) => updateReportStatus(report.report_id, e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="pending">Pending</MenuItem>
                              <MenuItem value="reviewed">Reviewed</MenuItem>
                              <MenuItem value="approved">Approved</MenuItem>
                            </Select>
                          </FormControl>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSummarizeReport(report)}
                            disabled={summarizing}
                          >
                            {summarizing ? t('reports.summarizing') : t('reports.aiSummarize')}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="h5" gutterBottom>
              {t('reports.adminReportsTitle')}
            </Typography>
            <Box component="form" onSubmit={submitAdminReport} mb={4} p={3} bgcolor="background.paper" borderRadius={1}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('reports.reportTitle')}
                    value={newReport.title}
                    onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('reports.reportContent')}
                    multiline
                    rows={4}
                    value={newReport.content}
                    onChange={(e) => setNewReport({...newReport, content: e.target.value})}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Recipient</InputLabel>
                    <Select
                      value={newReport.recipient_id || ""}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        recipient_id: e.target.value,
                        recipient: "admin"
                      })}
                      label="Recipient"
                      required
                    >
                      {admins.map((admin) => (
                        <MenuItem key={admin.admin_id} value={admin.admin_id}>
                          {admin.first_name} {admin.last_name} ({admin.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" color="primary">
                    Submit to Admin
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {adminReports.length === 0 ? (
              <Typography variant="body1" color="textSecondary">
                No admin reports available
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {adminReports.map((report) => (
                  <Grid item xs={12} key={report.report_id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6">{report.title}</Typography>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="caption" color="textSecondary">
                            {report.author?.name || "Unknown"} • {new Date(report.created_at).toLocaleDateString()}
                          </Typography>
                          <Chip 
                            label={report.status} 
                            size="small"
                            color={
                              report.status === "approved" ? "success" :
                              report.status === "reviewed" ? "info" : "default"
                            }
                          />
                        </Box>
                        <Typography variant="body1" paragraph>
                          {report.content}
                        </Typography>
                        {report.feedback && (
                          <Box mt={2} p={2} bgcolor="action.hover" borderRadius={1}>
                            <Typography variant="subtitle2">Admin Feedback:</Typography>
                            <Typography variant="body2">{report.feedback}</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Grid>

      {/* AI Summarization Dialog */}
      <Dialog open={openSummaryDialog} onClose={() => setOpenSummaryDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>Report Summary</DialogTitle>
        <DialogContent>
          <Typography variant="body1" whiteSpace="pre-wrap">
            {summary}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSummaryDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              navigator.clipboard.writeText(summary);
              setNotification({
                type: "success",
                message: "Summary copied to clipboard"
              });
              setOpenSummaryDialog(false);
            }}
          >
            Copy Summary
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.type}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default Reports;