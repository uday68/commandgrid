import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Alert,
  Chip
} from '@mui/material';
import { Analytics, Assessment, CloudUpload } from '@mui/icons-material';
import DataVisualizationV2 from '../Components/DataVisualizationV2';

const DataVisualizationPage = () => {
  const { t } = useTranslation();
  const [showViz, setShowViz] = useState(false);
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom color="primary">
            🚀 AI-Powered Data Visualization
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Transform your data into interactive insights with AI assistance
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
            <Chip 
              icon={<Analytics />} 
              label="AI Analysis" 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              icon={<Assessment />} 
              label="Interactive Charts" 
              color="secondary" 
              variant="outlined"
            />
            <Chip 
              icon={<CloudUpload />} 
              label="CSV/Excel Support" 
              color="success" 
              variant="outlined"
            />
          </Box>
          
          <Button 
            variant="contained" 
            size="large" 
            startIcon={<Analytics />}
            onClick={() => setShowViz(true)}
            sx={{ mt: 2, px: 4, py: 2, fontSize: '1.1rem' }}
          >
            Launch Data Studio
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body1">
            <strong>🤖 AI Features Available:</strong>
            <br />
            • Real-time data analysis and insights
            <br />
            • Automatic visualization recommendations  
            <br />
            • Interactive chat assistant for data exploration
            <br />
            • Smart column detection and chart type suggestions
            <br />
            • Connected to OpenRouter AI for advanced analysis
          </Typography>
        </Alert>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            🎯 How to Use:
          </Typography>
          <Typography component="div" variant="body1">
            <ol style={{ paddingLeft: '20px' }}>
              <li>Click &quot;Launch Data Studio&quot; to open the visualization tool</li>
              <li>Upload your CSV or Excel file by dragging and dropping</li>
              <li>Choose your chart type (bar, line, pie, area, scatter)</li>
              <li>Configure X and Y axes from your data columns</li>
              <li>Use the AI chat to ask questions about your data</li>
              <li>Get automated insights and recommendations</li>
            </ol>
          </Typography>
        </Box>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'primary.50', borderRadius: 2, border: 1, borderColor: 'primary.200' }}>
          <Typography variant="h6" gutterBottom color="primary">
            🔧 Technical Features:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Built with React + Material-UI for modern interface
            <br />
            • Recharts for responsive, interactive visualizations
            <br />
            • FastAPI + OpenRouter AI backend for intelligent analysis
            <br />
            • WebSocket connection for real-time AI chat
            <br />
            • Support for CSV, XLS, XLSX file formats
            <br />
            • Automatic data cleaning and numeric column detection
          </Typography>
        </Box>
      </Paper>

      {/* Data Visualization Component */}
      <DataVisualizationV2 
        isOpen={showViz} 
        onClose={() => setShowViz(false)}
      />
    </Container>
  );
};

export default DataVisualizationPage;
