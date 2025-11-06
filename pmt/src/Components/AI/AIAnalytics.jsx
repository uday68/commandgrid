import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Tabs, Tab, Grid, Card, CardContent, Avatar, List, ListItem, ListItemAvatar, ListItemText, Divider, Tooltip, IconButton, CircularProgress, Chip, Button
} from '@mui/material';
import { 
  BubbleChart as BubbleChartIcon, 
  Refresh as RefreshIcon, 
  Download as DownloadIcon, 
  Assessment as AssessmentIcon, 
  Insights as InsightsIcon, 
  Lightbulb as LightbulbIcon, 
  QuestionAnswer as QuestionAnswerIcon, 
  TrackChanges as TrackChangesIcon, 
  CheckCircle as CheckCircleIcon, 
  Close as CloseIcon 
} from '@mui/icons-material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';

const AIAnalytics = ({ theme = 'light' }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockData = {
          usageStats: {
            total: 543,
            lastWeek: 87,
            aiResponsesUsed: 324,
            avgResponseTime: 1.3,
            topCategories: [
              { name: 'Project Planning', value: 35 },
              { name: 'Task Analysis', value: 25 },
              { name: 'Timeline Estimation', value: 20 },
              { name: 'Resource Allocation', value: 15 },
              { name: 'Risk Assessment', value: 5 }
            ],
            weeklyUsage: [
              { day: 'Mon', queries: 15 },
              { day: 'Tue', queries: 21 },
              { day: 'Wed', queries: 18 },
              { day: 'Thu', queries: 25 },
              { day: 'Fri', queries: 22 },
              { day: 'Sat', queries: 8 },
              { day: 'Sun', queries: 5 }
            ]
          },
          insightMetrics: {
            insightsGenerated: 87,
            insightsImplemented: 42,
            averageSavings: "4.5 hours",
            topInsights: [
              { text: "Meeting reduction opportunity", impact: "High", category: "Productivity" },
              { text: "Task allocation imbalance", impact: "Medium", category: "Team Management" },
              { text: "Potential resource bottleneck", impact: "High", category: "Resource Planning" },
              { text: "Documentation improvements", impact: "Low", category: "Knowledge Management" }
            ],
            impactBreakdown: [
              { name: "High", value: 35 },
              { name: "Medium", value: 45 },
              { name: "Low", value: 20 }
            ]
          },
          suggestionsMetrics: {
            suggested: 156,
            accepted: 94,
            rejected: 62,
            categories: [
              { name: "Process Improvements", accepted: 28, rejected: 14 },
              { name: "Resource Allocation", accepted: 32, rejected: 18 },
              { name: "Time Management", accepted: 22, rejected: 12 },
              { name: "Documentation", accepted: 12, rejected: 18 }
            ],
            topSuggestions: [
              { text: "Implement daily stand-ups", accepted: true },
              { text: "Use task templates for repetitive work", accepted: true },
              { text: "Adjust resource allocation on Project X", accepted: false },
              { text: "Consider revising sprint duration", accepted: true }
            ]
          }
        };
        
        try {
          setData(mockData);
        } catch (apiError) {
          console.error("Failed to fetch API data:", apiError);
          setData(mockData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Failed to load AI analytics data:", error);
        setError(t('ai.analytics.loadError'));
        setLoading(false);
      }
    };
    
    fetchData();
  }, [t, retryCount]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    setRetryCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 4
      }}>
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }} variant="h6" color="text.secondary">
          {t('ai.analytics.loading')}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 4
      }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ mt: 2 }}
        >
          {t('common.retry')}
        </Button>
      </Box>
    );
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        backgroundColor: theme === 'dark' ? 'background.paper' : '#fff',
        borderRadius: 2,
        height: '100%',
        overflow: 'auto'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BubbleChartIcon 
            sx={{ 
              fontSize: 28, 
              mr: 1.5, 
              color: 'primary.main' 
            }} 
          />
          <Typography variant="h5" fontWeight="medium">
            {t('ai.analytics.title')}
          </Typography>
        </Box>
        
        <Box>
          <Tooltip title={t('common.refresh')}>
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.download')}>
            <IconButton>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ px: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minWidth: 120,
              py: 2
            }
          }}
        >
          <Tab 
            icon={<AssessmentIcon fontSize="small" />} 
            label={t('ai.analytics.tabs.usage')} 
            iconPosition="start"
          />
          <Tab 
            icon={<InsightsIcon fontSize="small" />} 
            label={t('ai.analytics.tabs.insights')} 
            iconPosition="start"
          />
          <Tab 
            icon={<LightbulbIcon fontSize="small" />} 
            label={t('ai.analytics.tabs.suggestions')} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Content Area */}
      <Box sx={{ p: 3 }}>
        {/* Usage Tab */}
        {activeTab === 0 && (
          <Box>
            <UsageStatsSection data={data?.usageStats} />
          </Box>
        )}

        {/* Insights Tab */}
        {activeTab === 1 && (
          <Box>
            <InsightsSection data={data?.insightMetrics} />
          </Box>
        )}

        {/* Suggestions Tab */}
        {activeTab === 2 && (
          <Box>
            <SuggestionsSection data={data?.suggestionsMetrics} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// Usage Stats Section Component
const UsageStatsSection = ({ data }) => {
  const { t } = useTranslation();

  if (!data) return null;

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard 
            title={t('ai.analytics.totalQueries')}
            value={data.total}
            icon={<QuestionAnswerIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard 
            title={t('ai.analytics.lastWeekQueries')}
            value={data.lastWeek}
            icon={<TrackChangesIcon />}
            color="#8b5cf6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard 
            title={t('ai.analytics.responsesUsed')}
            value={data.aiResponsesUsed}
            icon={<LightbulbIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard 
            title={t('ai.analytics.avgResponseTime')}
            value={`${data.avgResponseTime}s`}
            icon={<BubbleChartIcon />}
            color="#f59e0b"
          />
        </Grid>
      </Grid>

      {/* Weekly Usage Chart */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('ai.analytics.weeklyUsage')}
          </Typography>
          <Box sx={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={data.weeklyUsage}>
                <XAxis dataKey="day" />
                <YAxis />
                <RechartsTooltip formatter={(value) => [`${value} queries`, 'Usage']} />
                <Bar dataKey="queries" fill="#3b82f6">
                  {data.weeklyUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`rgba(59, 130, 246, ${0.5 + (entry.queries / 30) * 0.5})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Categories Pie Chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('ai.analytics.topCategories')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data.topCategories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={[
                          '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'
                        ][index % 5]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value, name) => [`${value} queries`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('ai.analytics.categoriesDescription')}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {data.topCategories.map((category, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%',
                        mr: 1,
                        backgroundColor: [
                          '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'
                        ][index % 5]
                      }} 
                    />
                    <Typography variant="body2">
                      {category.name}: <strong>{category.value}</strong> queries
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

// Insights Section Component
const InsightsSection = ({ data }) => {
  const { t } = useTranslation();

  if (!data) return null;

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <StatsCard 
            title={t('ai.analytics.insightsGenerated')}
            value={data.insightsGenerated}
            icon={<InsightsIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard 
            title={t('ai.analytics.insightsImplemented')}
            value={data.insightsImplemented}
            icon={<CheckCircleIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard 
            title={t('ai.analytics.averageSavings')}
            value={data.averageSavings}
            icon={<AssessmentIcon />}
            color="#8b5cf6"
          />
        </Grid>
      </Grid>

      {/* Top Insights */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('ai.analytics.topInsights')}
          </Typography>
          
          <List sx={{ bgcolor: 'background.paper' }}>
            {data.topInsights.map((insight, index) => (
              <React.Fragment key={index}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getImpactColor(insight.impact) }}>
                      <InsightsIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1">
                          {insight.text}
                        </Typography>
                        <Chip 
                          label={insight.impact} 
                          size="small" 
                          sx={{ 
                            bgcolor: getImpactColor(insight.impact),
                            color: 'white'
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {t('ai.analytics.category')}: {insight.category}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < data.topInsights.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Impact Breakdown */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('ai.analytics.impactBreakdown')}
          </Typography>
          <Box sx={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.impactBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.impactBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={getImpactColor(entry.name)} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value, name) => [`${value} insights`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// Suggestions Section Component
const SuggestionsSection = ({ data }) => {
  const { t } = useTranslation();

  if (!data) return null;

  const acceptanceRate = Math.round((data.accepted / data.suggested) * 100);

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <StatsCard 
            title={t('ai.analytics.suggested')}
            value={data.suggested}
            icon={<LightbulbIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard 
            title={t('ai.analytics.accepted')}
            value={data.accepted}
            icon={<CheckCircleIcon />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard 
            title={t('ai.analytics.acceptanceRate')}
            value={`${acceptanceRate}%`}
            icon={<AssessmentIcon />}
            color="#8b5cf6"
          />
        </Grid>
      </Grid>

      {/* Suggestion Categories */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('ai.analytics.suggestionsByCategory')}
          </Typography>
          <Box sx={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart 
                data={data.categories}
                layout="vertical"
                margin={{ left: 150 }}
              >
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="accepted" name={t('ai.analytics.accepted')} stackId="a" fill="#10b981" />
                <Bar dataKey="rejected" name={t('ai.analytics.rejected')} stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Top Suggestions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('ai.analytics.topSuggestions')}
          </Typography>
          
          <List sx={{ bgcolor: 'background.paper' }}>
            {data.topSuggestions.map((suggestion, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: suggestion.accepted ? '#10b981' : '#ef4444' }}>
                      {suggestion.accepted ? <CheckCircleIcon /> : <CloseIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={suggestion.text}
                    secondary={suggestion.accepted ? 
                      t('ai.analytics.suggestionAccepted') : 
                      t('ai.analytics.suggestionRejected')
                    }
                  />
                </ListItem>
                {index < data.topSuggestions.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color }) => (
  <Card
    sx={{
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      borderRadius: 2,
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)'
      }
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          {title}
        </Typography>
        <Avatar 
          sx={{ 
            bgcolor: `${color}15`, 
            color: color,
            width: 32,
            height: 32
          }}
        >
          {icon}
        </Avatar>
      </Box>
      <Typography variant="h4" fontWeight="medium">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

// Helper function to get color based on impact level
const getImpactColor = (impact) => {
  switch (impact?.toLowerCase()) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#3b82f6';
    default: return '#6b7280';
  }
};

export default AIAnalytics;