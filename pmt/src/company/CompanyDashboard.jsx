import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  List, 
  Avatar, 
  Spin, 
  Alert, 
  Tabs 
} from 'antd';
import { 
  UserOutlined, 
  ProjectOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  TeamOutlined,
  FileOutlined
} from '@ant-design/icons';
import CompanyNavbar from './CompanyNavbar';

const { TabPane } = Tabs;

const CompanyDashboard = () => {
  const [companyData, setCompanyData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check for auth token
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }

    // Fetch company dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get company overview data
        const overviewResponse = await axios.get('/api/company/dashboard', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        // Get projects data
        const projectsResponse = await axios.get('/api/company/projects', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        // Get recent activity
        const activityResponse = await axios.get('/api/company/activity', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        // Get team members
        const teamResponse = await axios.get('/api/company/users', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        // Set all the data
        setCompanyData(overviewResponse.data);
        setProjects(projectsResponse.data.projects || []);
        setRecentActivity(activityResponse.data.activities || []);
        setTeamMembers(teamResponse.data.users || []);
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // Get company name from localStorage or use a default
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const companyName = user.companyName || 'Your Company';

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavbar companyName={companyName} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Dashboard Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">Company Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Overview of your company's activity and performance
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="px-4 sm:px-0">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} className="shadow-sm">
                <Statistic
                  title="Team Members"
                  value={companyData?.team_members || teamMembers.length}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} className="shadow-sm">
                <Statistic
                  title="Active Projects"
                  value={companyData?.active_projects || projects.filter(p => p.status === 'active').length}
                  prefix={<ProjectOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} className="shadow-sm">
                <Statistic
                  title="Completed Projects"
                  value={companyData?.completed_projects || projects.filter(p => p.status === 'completed').length}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} className="shadow-sm">
                <Statistic
                  title="Average Progress"
                  value={companyData?.avg_project_progress || 0}
                  suffix="%"
                />
                <Progress 
                  percent={companyData?.avg_project_progress || 0}
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </Card>
            </Col>
          </Row>
        </div>
        
        {/* Main content tabs */}
        <div className="mt-8 px-4 sm:px-0">
          <Card className="shadow-sm">
            <Tabs defaultActiveKey="1" className="dashboard-tabs">
              <TabPane tab="Recent Projects" key="1">
                <List
                  dataSource={projects.slice(0, 5)}
                  renderItem={project => (
                    <List.Item
                      key={project.project_id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/projects/${project.project_id}`)}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            icon={<ProjectOutlined />} 
                            style={{ backgroundColor: '#1890ff' }} 
                          />
                        }
                        title={project.name}
                        description={
                          <div>
                            <p className="text-gray-500">{project.description || 'No description'}</p>
                            <div className="mt-2">
                              <Progress 
                                percent={project.per_complete || 0} 
                                size="small"
                                status={project.status === 'completed' ? 'success' : 'active'} 
                              />
                            </div>
                          </div>
                        }
                      />
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          project.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : project.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                    </List.Item>
                  )}
                />
                {projects.length > 0 && (
                  <div className="text-right mt-4">
                    <button 
                      onClick={() => navigate('/company/projects')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View all projects →
                    </button>
                  </div>
                )}
                {projects.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileOutlined style={{ fontSize: '2rem' }} />
                    <p className="mt-2">No projects found</p>
                  </div>
                )}
              </TabPane>
              <TabPane tab="Team Members" key="2">
                <List
                  dataSource={teamMembers}
                  renderItem={member => (
                    <List.Item key={member.user_id}>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            src={member.profile_picture} 
                            icon={!member.profile_picture && <UserOutlined />}
                          />
                        }
                        title={member.name}
                        description={
                          <div>
                            <p className="text-gray-500">{member.role}</p>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
                <div className="text-right mt-4">
                  <button 
                    onClick={() => navigate('/company/team')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Manage team →
                  </button>
                </div>
              </TabPane>
              <TabPane tab="Recent Activity" key="3">
                <List
                  dataSource={recentActivity}
                  renderItem={activity => (
                    <List.Item key={activity.log_id}>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            src={activity.profile_picture} 
                            icon={!activity.profile_picture && <UserOutlined />}
                          />
                        }
                        title={activity.user_name}
                        description={
                          <div>
                            <p className="text-gray-500">{activity.action}</p>
                            <p className="text-xs text-gray-400">
                              <ClockCircleOutlined className="mr-1" />
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </TabPane>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CompanyDashboard;
