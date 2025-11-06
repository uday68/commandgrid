import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Avatar, 
  Tag, 
  Space,
  message,
  Popconfirm,
  Spin,
  Card,
  Tabs
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  PlusOutlined,
  TeamOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import CompanyNavbar from './CompanyNavbar';

const { Option } = Select;
const { TabPane } = Tabs;

const TeamManagement = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [teamForm] = Form.useForm();
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const navigate = useNavigate();

  // Fetch team members and teams
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch users/team members
        const usersResponse = await axios.get('/api/company/users', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        // Fetch teams
        const teamsResponse = await axios.get('/api/company/teams', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        setTeamMembers(usersResponse.data.users || []);
        setTeams(teamsResponse.data.teams || []);
      } catch (error) {
        console.error('Error fetching team data:', error);
        message.error('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Handle user edit/create modal
  const showUserModal = (user = null) => {
    if (user) {
      setEditingUserId(user.user_id);
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username
      });
    } else {
      setEditingUserId(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // Handle team edit/create modal
  const showTeamModal = (team = null) => {
    if (team) {
      setEditingTeamId(team.team_id);
      teamForm.setFieldsValue({
        name: team.name,
        project_id: team.project_id,
      });
    } else {
      setEditingTeamId(null);
      teamForm.resetFields();
    }
    setTeamModalVisible(true);
  };

  // Handle form submission for user
  const handleUserFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const authToken = localStorage.getItem('authToken');
      
      if (editingUserId) {
        // Update existing user
        await axios.put(`/api/company/users/${editingUserId}`, values, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        message.success('User updated successfully');
        
        // Update local state
        setTeamMembers(teamMembers.map(user => 
          user.user_id === editingUserId ? { ...user, ...values } : user
        ));
      } else {
        // Create new user
        const response = await axios.post('/api/company/users', values, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        message.success('User created successfully');
        
        // Add to local state
        setTeamMembers([...teamMembers, response.data.user]);
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving user:', error);
      message.error('Failed to save user');
    }
  };

  // Handle form submission for team
  const handleTeamFormSubmit = async () => {
    try {
      const values = await teamForm.validateFields();
      const authToken = localStorage.getItem('authToken');
      
      if (editingTeamId) {
        // Update existing team
        await axios.put(`/api/company/teams/${editingTeamId}`, values, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        message.success('Team updated successfully');
        
        // Update local state
        setTeams(teams.map(team => 
          team.team_id === editingTeamId ? { ...team, ...values } : team
        ));
      } else {
        // Create new team
        const response = await axios.post('/api/company/teams', values, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        message.success('Team created successfully');
        
        // Add to local state
        setTeams([...teams, response.data.team]);
      }
      
      setTeamModalVisible(false);
    } catch (error) {
      console.error('Error saving team:', error);
      message.error('Failed to save team');
    }
  };

  // Handle user deletion
  const handleUserDelete = async (userId) => {
    try {
      const authToken = localStorage.getItem('authToken');
      
      await axios.delete(`/api/company/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      message.success('User deleted successfully');
      
      // Update local state
      setTeamMembers(teamMembers.filter(user => user.user_id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error('Failed to delete user');
    }
  };

  // Handle team deletion
  const handleTeamDelete = async (teamId) => {
    try {
      const authToken = localStorage.getItem('authToken');
      
      await axios.delete(`/api/company/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      message.success('Team deleted successfully');
      
      // Update local state
      setTeams(teams.filter(team => team.team_id !== teamId));
    } catch (error) {
      console.error('Error deleting team:', error);
      message.error('Failed to delete team');
    }
  };

  // Columns for team members table
  const userColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center">
          <Avatar 
            icon={<UserOutlined />} 
            src={record.profile_picture}
            className="mr-2"
          />
          {text}
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={
          role === 'Admin' ? 'red' :
          role === 'Manager' ? 'blue' :
          role === 'Developer' ? 'green' :
          'default'
        }>
          {role}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status || 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            icon={<EditOutlined />}
            onClick={() => showUserModal(record)}
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this user?"
            onConfirm={() => handleUserDelete(record.user_id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Columns for teams table
  const teamColumns = [
    {
      title: 'Team Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <div className="flex items-center">
          <TeamOutlined className="mr-2" />
          {text}
        </div>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'member_count',
      key: 'member_count',
      render: (_, record) => {
        return record.member_count || '0';
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status || 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            icon={<EditOutlined />}
            onClick={() => showTeamModal(record)}
            size="small"
          />
          <Button 
            onClick={() => navigate(`/company/teams/${record.team_id}`)}
            size="small"
          >
            View Team
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this team?"
            onConfirm={() => handleTeamDelete(record.team_id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Get company name from localStorage or use a default
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const companyName = user.companyName || 'Your Company';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavbar companyName={companyName} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your company's teams and members
          </p>
        </div>
        
        {/* Main content */}
        <div className="px-4 sm:px-0">
          <Card className="shadow-sm">
            <Tabs defaultActiveKey="1">
              <TabPane
                tab={
                  <span>
                    <UserOutlined />
                    Team Members
                  </span>
                }
                key="1"
              >
                <div className="mb-4 flex justify-end">
                  <Button 
                    type="primary" 
                    icon={<UserAddOutlined />}
                    onClick={() => showUserModal()}
                  >
                    Add Member
                  </Button>
                </div>
                <Table 
                  columns={userColumns} 
                  dataSource={teamMembers} 
                  rowKey="user_id"
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
              <TabPane
                tab={
                  <span>
                    <TeamOutlined />
                    Teams
                  </span>
                }
                key="2"
              >
                <div className="mb-4 flex justify-end">
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => showTeamModal()}
                  >
                    Create Team
                  </Button>
                </div>
                <Table 
                  columns={teamColumns} 
                  dataSource={teams} 
                  rowKey="team_id"
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </div>
      </main>

      {/* User Modal */}
      <Modal
        title={editingUserId ? "Edit User" : "Add New User"}
        visible={modalVisible}
        onOk={handleUserFormSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingUserId ? "Save" : "Create"}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'Member' }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter the user name' }]}
          >
            <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Full Name" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter an email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input prefix={<MailOutlined className="site-form-item-icon" />} placeholder="Email" />
          </Form.Item>
          
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter a username' }]}
          >
            <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="Username" />
          </Form.Item>
          
          {!editingUserId && (
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter a password' }]}
            >
              <Input.Password placeholder="Password" />
            </Form.Item>
          )}
          
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select a role">
              <Option value="Member">Member</Option>
              <Option value="Developer">Developer</Option>
              <Option value="Designer">Designer</Option>
              <Option value="Manager">Manager</Option>
              <Option value="Admin">Admin</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Team Modal */}
      <Modal
        title={editingTeamId ? "Edit Team" : "Create New Team"}
        visible={teamModalVisible}
        onOk={handleTeamFormSubmit}
        onCancel={() => setTeamModalVisible(false)}
        okText={editingTeamId ? "Save" : "Create"}
        maskClosable={false}
      >
        <Form
          form={teamForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Team Name"
            rules={[{ required: true, message: 'Please enter a team name' }]}
          >
            <Input prefix={<TeamOutlined className="site-form-item-icon" />} placeholder="Team Name" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Team description" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamManagement;
