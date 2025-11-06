import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { 
  Stack, 
  Typography, 
  Paper, 
  Button, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  Snackbar,
  Alert
} from "@mui/material";
import { FiFileText, FiDownload, FiEdit3, FiCheckCircle } from "react-icons/fi";

const ReportFileView = () => {
  const { t } = useTranslation();
  const [openSummarize, setOpenSummarize] = useState(false);
  const [openPlagiarism, setOpenPlagiarism] = useState(false);
  const [summary, setSummary] = useState("");
  const [plagiarismResult, setPlagiarismResult] = useState("");
  const [notification, setNotification] = useState(null);

  // Dummy handlers – replace these with real API calls as needed
  const handleAddToZip = () => {
    // Call your API to add this report to a zip file
    setNotification({ type: "success", message: t('reports.addedToZip') });
  };

  const handleSummarizeReport = () => {
    // Dummy summary logic; in production, you'd call your summarization API
    setSummary(t('reports.dummySummary'));
    setOpenSummarize(true);
  };

  const handleCheckPlagiarism = () => {
    // Dummy plagiarism check; replace with a call to your plagiarism checking service
    setPlagiarismResult(t('reports.plagiarismResult'));
    setOpenPlagiarism(true);
  };

  return (
    <Stack p={3} className="bg-gray-50 font-sans">
      <Paper elevation={4} className="p-6 rounded-xl">
        <Typography variant="h4" className="mb-4 text-gray-800">
          {t('reports.fileView.title')}
        </Typography>
        <Typography variant="body1" className="mb-6 text-gray-700">
          {t('reports.fileView.description')}
        </Typography>

        {/* Action Buttons */}
        <Stack display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            color="primary"
            startIcon={<FiDownload />}
            onClick={handleAddToZip}
            className="shadow-md"
          >
            {t('reports.addToZip')}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<FiEdit3 />}
            onClick={handleSummarizeReport}
            className="shadow-md"
          >
            {t('reports.summarize')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<FiCheckCircle />}
            onClick={handleCheckPlagiarism}
            className="shadow-md"
          >
            {t('reports.checkPlagiarism')}
          </Button>
        </Stack>
      </Paper>

      {/* Summary Dialog */}
      <Dialog open={openSummarize} onClose={() => setOpenSummarize(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('reports.summaryTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">{summary}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSummarize(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Plagiarism Dialog */}
      <Dialog open={openPlagiarism} onClose={() => setOpenPlagiarism(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('reports.plagiarismTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">{plagiarismResult}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPlagiarism(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
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

export default ReportFileView;
