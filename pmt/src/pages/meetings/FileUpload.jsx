import React, { useState, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import ReactPlayer from 'react-player';
import { marked } from 'marked';
import Prism from 'prismjs';
import { 
  CircularProgress,
  IconButton,
  Typography,
  Button,
  Paper,
  Grid,
  LinearProgress,
  Chip
} from '@mui/material';
import { Close, CloudUpload, InsertDriveFile } from '@mui/icons-material';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';

const FilePreview = ({ file: propFile, onClose, onUpload }) => {
  const [file, setFile] = useState(propFile);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const onDrop = useCallback(async (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    try {
      setUploadProgress(0);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem("authToken")}`
         },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      const uploadedFile = response.data;
      setFile(uploadedFile);
      onUpload?.(uploadedFile);
      analyzeContent(uploadedFile);
    } catch (err) {
      setError('File upload failed. Please try again.');
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: !!file
  });

  const analyzeContent = async (file) => {
    if (!file.type.startsWith('text/')) return;

    try {
      const response = await axios.get(file.url);
      const content = response.data;

      // Regex pattern analysis
      const patterns = {
        emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
        phoneNumbers: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        urls: /https?:\/\/[^\s]+/gi
      };

      const results = {};
      Object.entries(patterns).forEach(([key, regex]) => {
        const matches = content.match(regex);
        if (matches) results[key] = [...new Set(matches)];
      });

      setAnalysisResults(results);
    } catch (err) {
      console.error('Content analysis failed:', err);
    }
  };

  const renderPreview = () => {
    if (!file) return null;

    const { url, type, name } = file;
    const extension = name.split('.').pop().toLowerCase();

    // File type handling
    switch (true) {
      case type.startsWith('image/'):
        return <img src={url} alt="Preview" className="preview-media" />;
      
      case type.startsWith('video/'):
        return <ReactPlayer url={url} controls width="100%" height="100%" />;
      
      case type.startsWith('audio/'):
        return <audio controls src={url} className="preview-media" />;
      
      case type === 'application/pdf':
      
        return (
          <div className="pdf-preview">
            <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
              <Page pageNumber={pageNumber} />
            </Document>
            <div className="pdf-controls">
              <Button 
                variant="outlined" 
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
              >
                Previous
              </Button>
              <Typography variant="body2">
                Page {pageNumber} of {numPages}
              </Typography>
              <Button 
                variant="outlined" 
                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                disabled={pageNumber >= numPages}
              >
                Next
              </Button>
            </div>
          </div>
        );

      case type.startsWith('text/') || ['md', 'js', 'py', 'html', 'css', 'json'].includes(extension):
        return (
          <pre className="code-preview">
            <code dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(
                extension === 'md' 
                  ? marked.parse(textContent) 
                  : Prism.highlight(textContent, Prism.languages[extension] || Prism.languages.plaintext)
              )
            }} />
          </pre>
        );

      case [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint'
      ].includes(type):
        return (
          <iframe
            title="office-preview"
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
            width="100%"
            height="600px"
            frameBorder="0"
          />
        );

      default:
        return (
          <div className="unsupported-preview">
            <InsertDriveFile fontSize="large" />
            <Typography variant="body1">
              Preview not available for this file type
            </Typography>
            <Button 
              variant="contained" 
              href={url} 
              download
              startIcon={<CloudUpload />}
            >
              Download File
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="file-preview-container">
      <div className="preview-header" style={{ width: '90%', margin: '0 auto' }}>
        <Typography variant="h6">
          {file ? file.name : t('fileUpload.title')}
        </Typography>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </div>

      {!file ? (
        <div 
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
          style={{ width: '90%', margin: '0 auto' }}
        >
          <input {...getInputProps()} />
          {uploadProgress > 0 ? (
            <div className="upload-progress">
              <CircularProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2">
                {uploadProgress}% Uploaded
              </Typography>
            </div>
          ) : (
            <>
              <CloudUpload fontSize="large" />
              <Typography variant="body1">
                {isDragActive ? 'Drop file here' : 'Drag & drop file or click to upload'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supported formats: images, documents, audio, video
              </Typography>
            </>
          )}
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </div>
      ) : (
        <Grid container spacing={2} style={{ width: '90%', margin: '0 auto' }}>
          <Grid item xs={8}>
            <Paper elevation={2} className="preview-content">
              {renderPreview()}
            </Paper>
          </Grid>

          <Grid item xs={4}>
            <Paper elevation={2} className="file-info">
              <Typography variant="subtitle1" gutterBottom>
                File Details
              </Typography>
              <div className="file-meta">
                <Typography variant="body2">
                  Type: {file.type}
                </Typography>
                <Typography variant="body2">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </div>

              {analysisResults && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('fileUpload.contentAnalysis')}
                  </Typography>
                  {Object.entries(analysisResults).map(([type, matches]) => (
                    <div key={type} className="analysis-section">
                      <Typography variant="overline">
                        {t(`fileUpload.analysisTypes.${type}`, { defaultValue: type.charAt(0).toUpperCase() + type.slice(1) })}
                      </Typography>
                      <div className="analysis-chips">
                        {matches.map((match, i) => (
                          <Chip
                            key={i}
                            label={match}
                            variant="outlined"
                            size="small"
                            className="analysis-chip"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </div>
  );
};

export default FilePreview;