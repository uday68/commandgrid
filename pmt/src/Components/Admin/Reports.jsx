import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Box,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  InputAdornment
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { DatePickerProvider } from '../../utils/datePickerUtils';
import { formatDistanceToNow } from 'date-fns';
import axios from "axios";
import {
  FiFileText,
  FiEdit3,
  FiTrash2,
  FiSave,
  FiX,
  FiClock
} from "react-icons/fi";
import {
  Assessment,
  Description,
  Preview,
  SaveAlt,
  Schedule,
  Download,
  Visibility,
  Delete
} from "@mui/icons-material";

// Define your themes (using Tailwind CSS style classes)
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

const Reports = ({ theme = 'light' }) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateFeedback, setUpdateFeedback] = useState("");
  const [notification, setNotification] = useState(null);
  const [reportTypes, setReportTypes] = useState([]);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reportName, setReportName] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [reportFormat, setReportFormat] = useState("");
  const [recentReports, setRecentReports] = useState([]);

  // Enhanced animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  // Enhanced theme styles
  const styles = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-800',
      border: 'border-gray-200',
      card: 'bg-white hover:bg-gray-50',
      button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white',
      buttonOutline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
      shadow: 'shadow-lg shadow-blue-500/10',
      highlight: 'bg-blue-50',
    },
    dark: {
      bg: 'bg-gray-800',
      text: 'text-gray-100',
      border: 'border-gray-700',
      card: 'bg-gray-800 hover:bg-gray-700',
      button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white',
      buttonOutline: 'border border-gray-600 text-gray-200 hover:bg-gray-700',
      shadow: 'shadow-lg shadow-black/30',
      highlight: 'bg-gray-700',
    }
  }[theme];

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await axios.get("http://localhost:5000/api/admin/reports", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReports(res.data.reports || []);
      } catch (err) {
        console.error("Error fetching reports:", err);
        setNotification({
          type: "error",
          message: "Failed to fetch reports.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleOpenDialog = (report) => {
    setSelectedReport(report);
    setUpdateStatus(report.status);
    setUpdateFeedback(report.feedback || "");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReport(null);
  };

  const handleUpdateReport = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.put(
        `http://localhost:5000/api/admin/reports/${selectedReport.report_id}`,
        { status: updateStatus, feedback: updateFeedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports(
        reports.map((rep) =>
          rep.report_id === res.data.report.report_id ? res.data.report : rep
        )
      );
      setNotification({
        type: "success",
        message: "Report updated successfully",
      });
      handleCloseDialog();
    } catch (err) {
      console.error("Error updating report:", err);
      setNotification({
        type: "error",
        message: err.response?.data?.error || "Failed to update report",
      });
    }
  };

  const renderReportOptions = () => {
    // Placeholder for dynamic report options based on selected type
    return null;
  };

  const handlePreviewReport = () => {
    // Placeholder for preview report logic
  };

  const handleGenerateReport = () => {
    // Placeholder for generate report logic
  };

  const handleDownloadReport = (report) => {
    // Placeholder for download report logic
  };

  const handleViewReport = (report) => {
    // Placeholder for view report logic
  };

  const handleDeleteReport = (reportId) => {
    // Placeholder for delete report logic
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Paper 
        elevation={0} 
        className={`${styles.bg} ${styles.shadow} border ${styles.border} rounded-xl overflow-hidden`}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <motion.div variants={itemVariants}>
            <Typography 
              variant="h5" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Assessment sx={{ mr: 1.5 }} /> {t('reports.title')}
            </Typography>
          </motion.div>
        </Box>

        <Box sx={{ px: 3, py: 2 }}>
          <motion.div variants={itemVariants}>
            <Grid container spacing={3} alignItems="stretch">
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {t('reports.reportTypes')}
                </Typography>
                <Paper
                  elevation={0}
                  sx={{ p: 0, border: 1, borderColor: 'divider', borderRadius: 2 }}
                >
                  <List component="nav" sx={{ p: 0 }}>
                    {reportTypes.map((type) => (
                      <ListItem
                        key={type.id}
                        button
                        selected={selectedReportType === type.id}
                        onClick={() => setSelectedReportType(type.id)}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.2s ease',
                          px: 2,
                          py: 1.5,
                          '&.Mui-selected': {
                            backgroundColor: theme === 'light' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.2)',
                            borderLeft: '4px solid',
                            borderLeftColor: 'primary.main',
                          },
                          '&:last-child': {
                            borderBottom: 'none'
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <type.icon />
                        </ListItemIcon>
                        <ListItemText 
                          primary={type.label} 
                          secondary={type.description}
                          primaryTypographyProps={{ fontWeight: 500 }}
                          secondaryTypographyProps={{ 
                            variant: 'caption', 
                            sx: { mt: 0.5, opacity: 0.7 } 
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12} md={9}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {t('reports.configureReport')}
                </Typography>
                <Paper
                  elevation={0}
                  sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2, height: '100%' }}
                >
                  <Box sx={{ mb: 4 }}>
                    <Stack spacing={3}>
                      <TextField
                        label={t('reports.reportName')}
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        fullWidth
                        variant="outlined"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Description fontSize="small" />
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 }
                        }}
                      />

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <DatePickerProvider>
                            <DatePicker
                              label={t('reports.startDate')}
                              value={dateRange.startDate}
                              onChange={(newValue) => setDateRange({ ...dateRange, startDate: newValue })}
                              renderInput={(params) => 
                                <TextField 
                                  {...params} 
                                  fullWidth 
                                  InputProps={{
                                    ...params.InputProps,
                                    sx: { borderRadius: 2 }
                                  }}
                                />
                              }
                            />
                          </DatePickerProvider>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <DatePickerProvider>
                            <DatePicker
                              label={t('reports.endDate')}
                              value={dateRange.endDate}
                              onChange={(newValue) => setDateRange({ ...dateRange, endDate: newValue })}
                              renderInput={(params) => 
                                <TextField 
                                  {...params} 
                                  fullWidth 
                                  InputProps={{
                                    ...params.InputProps,
                                    sx: { borderRadius: 2 }
                                  }}
                                />
                              }
                            />
                          </DatePickerProvider>
                        </Grid>
                      </Grid>

                      <FormControl fullWidth>
                        <InputLabel>{t('reports.format')}</InputLabel>
                        <Select
                          value={reportFormat}
                          onChange={(e) => setReportFormat(e.target.value)}
                          label={t('reports.format')}
                          sx={{ borderRadius: 2 }}
                        >
                          <MenuItem value="pdf">PDF</MenuItem>
                          <MenuItem value="excel">Excel</MenuItem>
                          <MenuItem value="csv">CSV</MenuItem>
                          <MenuItem value="json">JSON</MenuItem>
                        </Select>
                      </FormControl>

                      {renderReportOptions()}
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      startIcon={<Preview />}
                      onClick={handlePreviewReport}
                      disabled={!reportName || loading}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      {t('reports.preview')}
                    </Button>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={loading ? <CircularProgress size={20} /> : <SaveAlt />}
                        onClick={handleGenerateReport}
                        disabled={!reportName || loading}
                        sx={{ 
                          borderRadius: 2, 
                          background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                          textTransform: 'none',
                          px: 3
                        }}
                      >
                        {t('reports.generate')}
                      </Button>
                      
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<Schedule />}
                        onClick={() => setScheduleModalOpen(true)}
                        disabled={!reportName || loading}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        {t('reports.schedule')}
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        </Box>

        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', mt: 3 }}>
          <motion.div variants={itemVariants}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              {t('reports.recentReports')}
            </Typography>

            <TableContainer sx={{ mt: 2 }}>
              <Table sx={{ minWidth: 650 }} size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('reports.name')}</TableCell>
                    <TableCell>{t('reports.type')}</TableCell>
                    <TableCell>{t('reports.generated')}</TableCell>
                    <TableCell>{t('reports.format')}</TableCell>
                    <TableCell align="right">{t('reports.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {recentReports.map((report) => (
                      <motion.tr
                        key={report.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        component={TableRow}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">
                          <Typography variant="body2" fontWeight={500}>
                            {report.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={report.type} 
                            size="small"
                            icon={getReportIcon(report.type)}
                            sx={{ borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(report.generatedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getFormatIcon(report.format)}
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {report.format.toUpperCase()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownloadReport(report)}
                            sx={{ mr: 1 }}
                          >
                            <Download fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewReport(report)}
                            sx={{ mr: 1 }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteReport(report.id)}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          </motion.div>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default Reports;
