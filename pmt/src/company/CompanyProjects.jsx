import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Table, 
  Button, 
  Tag, 
  Space, 
  Progress, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  message, 
  Popconfirm,
  Spin,
  Card,
  Badge,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import CompanyNavbar from './CompanyNavbar';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const CompanyProjects = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingProjectId, setEditingProjectId] = useState(null);
  const navigate = useNavigate();

  // Fetch projects data on component mount
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch projects
        const projectsResponse = await axios.get('/api/company/projects', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        // Fetch users for assignment
        const usersResponse = await axios.get('/api/company/users', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        setProjects(projectsResponse.data.projects || []);
        setUsers(usersResponse.data.users || []);
      } catch (error) {
        console.error('Error fetching projects data:', error);
        message.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Show modal for creating or editing a project
  const showProjectModal = (project = null) => {
    if (project) {
      // Edit mode - set form values from existing project
      setEditingProjectId(project.project_id);
      form.setFieldsValue({
        name: project.name,
        description: project.description,
        status: project.status,
        budget: project.budget,
        dateRange: project.start_date && project.end_date ? 
          [moment(project.start_date), moment(project.end_date)] : undefined,
        owner_id: project.owner_id
      });
    } else {
      // Create mode
      setEditingProjectId(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    try {
      // Validate form
      const values = await form.validateFields();
      const authToken = localStorage.getItem('authToken');
      
      // Transform form data to API format
      const projectData = {
        name: values.name,
        description: values.description,
        status: values.status,
        budget: values.budget,
        owner_id: values.owner_id,
        start_date: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: values.dateRange?.[1]?.format('YYYY-MM-DD')
      };
      
      if (editingProjectId) {
        // Update existing project
        await axios.put(`/api/company/projects/${editingProjectId}`, projectData, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        message.success('Project updated successfully');
        
        // Update local state
        setProjects(projects.map(project => 
          project.project_id === editingProjectId ? 
            { ...project, ...projectData } : project
        ));
      } else {
        // Create new project
        const response = await axios.post('/api/company/projects', projectData, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        message.success('Project created successfully');
        
        // Add to local state
        setProjects([...projects, response.data.project]);
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving project:', error);
      message.error('Failed to save project');
    }
  };

  // Handle project deletion
  const handleProjectDelete = async (projectId) => {
    try {
      const authToken = localStorage.getItem('authToken');
      await axios.delete(`/api/company/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      message.success('Project deleted successfully');
      
      // Update local state
      setProjects(projects.filter(project => project.project_id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      message.error('Failed to delete project');
    }
  };

  // Get project status color
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return 'green';
      case 'completed':
        return 'blue';
      case 'on hold':
        return 'orange';
      case 'cancelled':
        return 'red';
      default:
        return 'default';
    }
  };

  // Find owner name by ID
  const getOwnerName = (ownerId) => {
    const owner = users.find(user => user.user_id === ownerId);
    return owner ? owner.name : 'Unknown';
  };

  // Columns for projects table
  const columns = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <a onClick={(e) => {
          e.preventDefault();
          navigate(`/projects/${record.project_id}`);
        }}>
          {text}
        </a>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Completed', value: 'completed' },
        { text: 'On Hold', value: 'on hold' },
        { text: 'Cancelled', value: 'cancelled' }
      ],
      onFilter: (value, record) => record.status?.toLowerCase() === value,
      render: status => (
        <Tag color={getStatusColor(status)}>
          {status || 'Unknown'}
        </Tag>
      )
    },
    {
      title: 'Progress',
      dataIndex: 'per_complete',
      key: 'per_complete',
      sorter: (a, b) => a.per_complete - b.per_complete,
      render: (percent) => (
        <Progress 
          percent={percent || 0} 
          size="small"
          status={percent === 100 ? 'success' : 'active'}
        />
      )
    },
    {
      title: 'Timeline',
      key: 'timeline',
      render: (_, record) => {
        const startDate = record.start_date ? moment(record.start_date).format('MMM D, YYYY') : 'Not set';
        const endDate = record.end_date ? moment(record.end_date).format('MMM D, YYYY') : 'Not set';
        
        return (
          <Tooltip title={`${startDate} to ${endDate}`}>
            <span className="flex items-center">
              <CalendarOutlined className="mr-1" />
              {startDate} - {endDate}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      sorter: (a, b) => a.budget - b.budget,
      render: (budget) => (
        budget ? (
          <span className="flex items-center">
            <DollarOutlined className="mr-1" />
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(budget)}
          </span>
        ) : 'Not set'
      )
    },
    {
      title: 'Owner',
      dataIndex: 'owner_id',
      key: 'owner_id',
      render: (owner_id) => (
        <span>
          <Badge status="processing" />
          {getOwnerName(owner_id)}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/projects/${record.project_id}`)}
          />
          <Button 
            type="text"
            icon={<EditOutlined />}
            onClick={() => showProjectModal(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this project?"
            onConfirm={() => handleProjectDelete(record.project_id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              type="text"
              icon={<DeleteOutlined />} 
              danger
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
          <h1 className="text-2xl font-semibold text-gray-900">Company Projects</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage all your company's projects
          </p>
        </div>
        
        {/* Main content */}
        <div className="px-4 sm:px-0">
          <Card className="shadow-sm">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <span className="mr-2 text-gray-700">
                  <ClockCircleOutlined /> {projects.length} Projects
                </span>
                <span className="text-gray-700">
                  <TeamOutlined /> {users.length} Team Members
                </span>
              </div>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => showProjectModal()}
              >
                Create Project
              </Button>
            </div>
            
            <Table 
              columns={columns} 
              dataSource={projects} 
              rowKey="project_id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </div>
      </main>

      {/* Project Create/Edit Modal */}
      <Modal
        title={editingProjectId ? "Edit Project" : "Create New Project"}
        visible={modalVisible}
        onOk={handleFormSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingProjectId ? "Save" : "Create"}
        width={600}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'active' }}
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: 'Please enter the project name' }]}
          >
            <Input placeholder="Project Name" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea placeholder="Project Description" rows={4} />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select a status' }]}
          >
            <Select placeholder="Select status">
              <Option value="active">Active</Option>
              <Option value="completed">Completed</Option>
              <Option value="on hold">On Hold</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="owner_id"
            label="Project Owner"
            rules={[{ required: true, message: 'Please select a project owner' }]}
          >
            <Select placeholder="Select owner">
              {users.map(user => (
                <Option key={user.user_id} value={user.user_id}>
                  {user.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="dateRange"
            label="Timeline"
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="budget"
            label="Budget (USD)"
          >
            <Input
              type="number"
              min={0}
              step={100}
              prefix="$"
              placeholder="Project Budget"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyProjects;
