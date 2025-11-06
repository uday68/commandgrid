import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider } from '@mui/material';
import { languageService } from '../utils/languageService';

/**
 * TranslationDocs component provides information about the translation system
 * for developers working on the project
 */
const TranslationDocs = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const supportedLanguages = languageService.getSupportedLanguages();
  const stats = languageService.generateTranslationStats();
  
  // Get namespaces available in current language
  const namespaces = [
    'translation',
    'components',
    'pages',
    'errors',
    'features',
    'registration',
    'validation',
    'common',
    'chatRoom',
    'images',
    'admin'
  ];
  
  // Get available namespaces in current language
  const availableNamespaces = namespaces.filter(ns => {
    const bundle = i18n.getResourceBundle(currentLanguage, ns);
    return bundle && Object.keys(bundle).length > 0;
  });
  
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Translation Documentation</Typography>
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="h5" gutterBottom>Current Configuration</Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row">Current Language</TableCell>
              <TableCell>{languageService.getLanguageName(currentLanguage)} ({currentLanguage})</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Text Direction</TableCell>
              <TableCell>{languageService.getTextDirection(currentLanguage)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row">Available Namespaces</TableCell>
              <TableCell>{availableNamespaces.join(', ')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      <Typography variant="h5" gutterBottom>Supported Languages</Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Language Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell>Translation Coverage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {supportedLanguages.map(langCode => (
              <TableRow key={langCode} selected={langCode === currentLanguage}>
                <TableCell>{langCode}</TableCell>
                <TableCell>{languageService.getLanguageName(langCode)}</TableCell>
                <TableCell>{languageService.getTextDirection(langCode)}</TableCell>
                <TableCell>
                  {stats[langCode] ? `${stats[langCode].percentage}%` : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Typography variant="h5" gutterBottom>Usage Examples</Typography>
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Basic Usage</Typography>
        <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
          {`import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('my.translation.key')}</h1>;
}`}
        </Box>
        
        <Typography variant="h6" gutterBottom mt={2}>With Namespace</Typography>
        <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
          {`import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation(['common', 'components']);
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('button.save', { ns: 'common' })}</button>
    </div>
  );
}`}
        </Box>
        
        <Typography variant="h6" gutterBottom mt={2}>Using withTranslation HOC</Typography>
        <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
          {`import { withTranslation } from '../components/TranslationWrapper';

function MyComponent({ t }) {
  return <h1>{t('my.translation.key')}</h1>;
}

export default withTranslation(MyComponent, { namespace: 'myNamespace', titleKey: 'page.title' });`}
        </Box>
      </Paper>
      
      <Typography variant="h5" gutterBottom>Additional Resources</Typography>
      <Paper sx={{ p: 2 }}>
        <Typography paragraph>
          For more information on the internationalization system, please check the following resources:
        </Typography>
        <ul>
          <li><Typography>Project translation documentation in <code>/docs/translation-guide.md</code></Typography></li>
          <li><Typography>i18next documentation: <a href="https://www.i18next.com/" target="_blank" rel="noopener noreferrer">https://www.i18next.com/</a></Typography></li>
          <li><Typography>React i18next: <a href="https://react.i18next.com/" target="_blank" rel="noopener noreferrer">https://react.i18next.com/</a></Typography></li>
        </ul>
      </Paper>
    </Box>
  );
};

export default TranslationDocs;
