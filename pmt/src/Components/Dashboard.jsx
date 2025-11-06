import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
} from '@mui/material';

const Dashboard = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            {t('dashboard.title')}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {t('dashboard.welcome')}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('dashboard.stats.projects')}
              </Typography>
              <Typography variant="h3">12</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('dashboard.stats.tasks')}
              </Typography>
              <Typography variant="h3">28</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t('dashboard.stats.team')}
              </Typography>
              <Typography variant="h3">8</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;