import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, FormControlLabel, Checkbox, IconButton, Alert } from '@mui/material';
import { SwapHoriz, CloudDownload, CloudUpload, Description, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

const ImportExport = ({ theme = 'light' }) => {
  const { t } = useTranslation();
  const [exportFormat, setExportFormat] = useState('');
  const [exportDataType, setExportDataType] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importOption, setImportOption] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setImportFile(acceptedFiles[0]);
    }
  });

  const handleExport = () => {
    setExportLoading(true);
    // Simulate export process
    setTimeout(() => {
      setExportLoading(false);
      setExportStatus({ type: 'success', message: t('importExport.exportSuccess') });
    }, 2000);
  };

  const handleImport = () => {
    setImportLoading(true);
    // Simulate import process
    setTimeout(() => {
      setImportLoading(false);
      setImportStatus({ type: 'success', message: t('importExport.importSuccess') });
    }, 2000);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  // Theme-based styling
  const styles = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-800',
      border: 'border-gray-200',
      shadow: 'shadow-lg shadow-blue-500/10',
      buttonPrimary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white',
      buttonSecondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
      highlight: 'bg-blue-50'
    },
    dark: {
      bg: 'bg-gray-800',
      text: 'text-gray-100',
      border: 'border-gray-700',
      shadow: 'shadow-lg shadow-black/30',
      buttonPrimary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white',
      buttonSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600',
      highlight: 'bg-gray-700'
    }
  }[theme];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`${styles.bg} ${styles.shadow} rounded-xl border ${styles.border}`}
    >
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <motion.div variants={itemVariants}>
          <Typography variant="h5" fontWeight={700} className="flex items-center">
            <SwapHoriz sx={{ mr: 1.5 }} /> {t('importExport.title')}
          </Typography>
        </motion.div>
      </Box>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={4}>
          {/* Export Section */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 3, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 3,
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: 4,
                    background: 'linear-gradient(to right, #2563eb, #4f46e5)'
                  }} 
                />
                
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t('importExport.exportData')}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {t('importExport.exportDescription')}
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>{t('importExport.exportFormat')}</InputLabel>
                  <Select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    label={t('importExport.exportFormat')}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="json">JSON</MenuItem>
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="excel">Excel</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>{t('importExport.dataType')}</InputLabel>
                  <Select
                    value={exportDataType}
                    onChange={(e) => setExportDataType(e.target.value)}
                    label={t('importExport.dataType')}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="all">{t('importExport.allData')}</MenuItem>
                    <MenuItem value="users">{t('importExport.usersOnly')}</MenuItem>
                    <MenuItem value="projects">{t('importExport.projectsOnly')}</MenuItem>
                    <MenuItem value="tasks">{t('importExport.tasksOnly')}</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeMetadata} 
                        onChange={(e) => setIncludeMetadata(e.target.checked)} 
                      />
                    }
                    label={t('importExport.includeMetadata')}
                  />
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="contained"
                      startIcon={<CloudDownload />}
                      onClick={handleExport}
                      disabled={exportLoading}
                      sx={{ 
                        borderRadius: 2, 
                        background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                        textTransform: 'none'
                      }}
                    >
                      {exportLoading ? (
                        <CircularProgress size={24} />
                      ) : (
                        t('importExport.export')
                      )}
                    </Button>
                  </motion.div>
                </Box>
              </Paper>
            </motion.div>
          </Grid>

          {/* Import Section */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 3, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 3,
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: 4,
                    background: 'linear-gradient(to right, #10b981, #059669)'
                  }} 
                />
                
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t('importExport.importData')}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {t('importExport.importDescription')}
                </Typography>
                
                <Box 
                  sx={{ 
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 4,
                    mb: 3,
                    textAlign: 'center',
                    bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: theme === 'dark' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.05)'
                    }
                  }}
                  {...getRootProps()}
                >
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <Typography color="primary">{t('importExport.dropFilesHere')}</Typography>
                  ) : (
                    <>
                      <CloudUpload sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" mb={1}>{t('importExport.dragAndDrop')}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('importExport.acceptedFormats')}
                      </Typography>
                    </>
                  )}
                </Box>
                
                {importFile && (
                  <Box sx={{ p: 2, mb: 2, bgcolor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Description sx={{ mr: 1 }} />
                        <Typography variant="body2">{importFile.name}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setImportFile(null)}>
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                )}
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>{t('importExport.importOptions')}</InputLabel>
                  <Select
                    value={importOption}
                    onChange={(e) => setImportOption(e.target.value)}
                    label={t('importExport.importOptions')}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="replace">{t('importExport.replaceAll')}</MenuItem>
                    <MenuItem value="merge">{t('importExport.mergeData')}</MenuItem>
                    <MenuItem value="skip">{t('importExport.skipExisting')}</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="contained"
                      startIcon={<CloudUpload />}
                      onClick={handleImport}
                      disabled={!importFile || importLoading}
                      sx={{ 
                        borderRadius: 2, 
                        background: 'linear-gradient(to right, #10b981, #059669)',
                        textTransform: 'none'
                      }}
                    >
                      {importLoading ? (
                        <CircularProgress size={24} />
                      ) : (
                        t('importExport.import')
                      )}
                    </Button>
                  </motion.div>
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        {/* Status Messages */}
        {(importStatus || exportStatus) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <Box sx={{ mt: 3 }}>
              {importStatus && (
                <Alert 
                  severity={importStatus.type} 
                  sx={{ mb: 2, borderRadius: 2 }}
                  onClose={() => setImportStatus(null)}
                >
                  {importStatus.message}
                </Alert>
              )}
              
              {exportStatus && (
                <Alert 
                  severity={exportStatus.type} 
                  sx={{ borderRadius: 2 }}
                  onClose={() => setExportStatus(null)}
                >
                  {exportStatus.message}
                </Alert>
              )}
            </Box>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
};

export default ImportExport;