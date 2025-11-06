import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CodeIcon from '@mui/icons-material/Code';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BuildIcon from '@mui/icons-material/Build';
import ExtensionIcon from '@mui/icons-material/Extension';

const integrationsList = [
  {
    id: 1,
    title: 'VSCode Integration',
    description: 'Seamless integration with VSCode for code editing and debugging.',
    price: '$9.99/month',
    icon: <CodeIcon fontSize="large" color="primary" />,
  },
  {
    id: 2,
    title: 'Slack Notifications',
    description: 'Get real-time Slack notifications for project updates.',
    price: 'Free',
    icon: <ExtensionIcon fontSize="large" color="secondary" />,
  },
  {
    id: 3,
    title: 'Data Visualization Module',
    description: 'Advanced charts and dashboards for project metrics.',
    price: '$19.99/month',
    icon: <AnalyticsIcon fontSize="large" color="success" />,
  },
  {
    id: 4,
    title: 'CRM Integration',
    description: 'Connect your CRM for seamless client management.',
    price: '$29.99/month',
    icon: <BuildIcon fontSize="large" color="error" />,
  },
  {
    id: 5,
    title: 'AI Assistant',
    description: 'Automated insights and predictions for projects.',
    price: '$39.99/month',
    icon: <ExtensionIcon fontSize="large" color="info" />,
  },
  // Add more integration items as needed...
];

const Marketplace = () => {
  const { t } = useTranslation(['marketplace', 'common']);
  const [searchTerm, setSearchTerm] = useState('');

  const translatedIntegrationsList = integrationsList.map(integration => ({
    ...integration,
    title: t(`marketplace.integrations.${integration.id}.title`, { defaultValue: integration.title }),
    description: t(`marketplace.integrations.${integration.id}.description`, { defaultValue: integration.description }),
  }));

  const filteredIntegrations = translatedIntegrationsList.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 4, background: '#f5f5f5', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom align="center">
        {t('marketplace.title')}
      </Typography>
      <Box sx={{ maxWidth: 400, mx: 'auto', mb: 4 }}>
        <TextField
          fullWidth
          placeholder={t('marketplace.searchPlaceholder')}
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <Grid container spacing={3}>
        {filteredIntegrations.map((integration) => (
          <Grid item xs={12} sm={6} md={4} key={integration.id}>
            <Card elevation={3} sx={{ borderRadius: 2 }}>
              <CardHeader
                avatar={integration.icon}
                title={
                  <Typography variant="h6" component="div">
                    {integration.title}
                  </Typography>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {integration.description}
                </Typography>
                <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }}>
                  {integration.price}
                </Typography>
              </CardContent>
              <CardActions>
                <Button variant="contained" color="primary" fullWidth>
                  {t('marketplace.learnMore')}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {t('marketplace.footerNote')}
        </Typography>
      </Box>
    </Box>
  );
};

export default Marketplace;
