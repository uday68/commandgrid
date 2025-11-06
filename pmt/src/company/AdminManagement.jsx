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
  Divider
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined,
  DeleteOutlined, 
  EditOutlined, 
  PlusOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import CompanyNavbar from './CompanyNavbar';

const { Option } = Select;

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const navigate = useNavigate();

  // Fetch admin data
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }

    const fetchAdmins = async () => {
      try {
        setLoading(true);
        
        const companyId = localStorage.getItem('companyId');
        const response = await axios.get(`/api/company/${companyId}/admins`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        setAdmins(response.data.admins || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        message.error('Failed to load administrators');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [navigate]);

  // Handle edit/create modal
  const showModal = (admin = null) => {
    if (admin) {
      setEditingAdminId(admin.admin_id);
      form.setFieldsValue({
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email,
        role: admin.role || 'Admin'
      });
    } else {
      setEditingAdminId(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // Show reset password modal
  const showResetPasswordModal = (admin) => {
    setSelectedAdmin(admin);
    passwordForm.resetFields();
    setResetPasswordModalVisible(true);
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const authToken = localStorage.getItem('authToken');
      const companyId = localStorage.getItem('companyId');
      
      if (editingAdminId) {
        // Update existing admin
        await axios.put(`/api/company/${companyId}/admins/${editingAdminId}`, values, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        message.success('Administrator updated successfully');
        
        // Update local state
        setAdmins(admins.map(admin => 
          admin.admin_id === editingAdminId ? { ...admin, ...values } : admin
        ));
      } else {
        // Create new admin
        const response = await axios.post(`/api/company/${companyId}/admins`, values, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        message.success('Administrator created successfully');
        
        // Add to local state
        setAdmins([...admins, response.data.admin]);
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving admin:', error);
      message.error('Failed to save administrator');
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    try {
      const values = await passwordForm.validateFields();
      const authToken = localStorage.getItem('authToken');
      const companyId = localStorage.getItem('companyId');
      
      if (values.password !== values.confirmPassword) {
        message.error('Passwords do not match');
        return;
      }
      
      await axios.post(`/api/company/${companyId}/admins/${selectedAdmin.admin_id}/reset-password`, {
        password: values.password
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      message.success('Password reset successfully');
      setResetPasswordModalVisible(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      message.error('Failed to reset password');
    }
  };

  // Handle admin deletion
  const handleDelete = async (adminId) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const companyId = localStorage.getItem('companyId');
      
      await axios.delete(`/api/company/${companyId}/admins/${adminId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      message.success('Administrator deleted successfully');
      
      // Update local state
      setAdmins(admins.filter(admin => admin.admin_id !== adminId));
    } catch (error) {
      console.error('Error deleting admin:', error);
      message.error('Failed to delete administrator');
    }
  };

  // Columns for admin table
  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center">
          <Avatar 
            icon={<UserOutlined />} 
            className="mr-2"
            style={{ backgroundColor: '#1890ff' }}
          />
          {`${record.first_name} ${record.last_name}`}
        </div>
      ),
      sorter: (a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: role => (
        <Tag color={role === 'Super Admin' ? 'red' : role === 'Admin' ? 'blue' : 'green'}>
          {role}
        </Tag>
      ),
      filters: [
        { text: 'Super Admin', value: 'Super Admin' },
        { text: 'Admin', value: 'Admin' },
        { text: 'Limited Admin', value: 'Limited Admin' }
      ],
      onFilter: (value, record) => record.role === value
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status || 'Active'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
          />
          <Button 
            icon={<KeyOutlined />}
            onClick={() => showResetPasswordModal(record)}
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this admin?"
            onConfirm={() => handleDelete(record.admin_id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              danger
              size="small"
              disabled={record.role === 'Super Admin'}
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
          <h1 className="text-2xl font-semibold text-gray-900">Administrator Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your company's administrative users and permissions
          </p>
        </div>
        
        {/* Main content */}
        <div className="px-4 sm:px-0">
          <Card className="shadow-sm">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <SafetyCertificateOutlined className="text-blue-500 text-xl mr-2" />
                  <h2 className="text-lg font-medium">Company Administrators</h2>
                </div>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => showModal()}
                >
                  Add Administrator
                </Button>
              </div>
              
              <Divider className="my-3" />
              
              <p className="text-gray-500 mb-4">
                Administrators have access to company settings and can manage users, teams, and projects.
                Assign admin roles carefully as they have elevated permissions.
              </p>
            </div>
            
            <Table 
              columns={columns} 
              dataSource={admins} 
              rowKey="admin_id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </div>
      </main>

      {/* Admin Edit/Create Modal */}
      <Modal
        title={editingAdminId ? "Edit Administrator" : "Add Administrator"}
        visible={modalVisible}
        onOk={handleFormSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingAdminId ? "Save" : "Create"}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'Admin' }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: 'Please enter the first name' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="First Name" />
            </Form.Item>
            
            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter the last name' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Last Name" />
            </Form.Item>
          </div>
          
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter an email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>
          
          {!editingAdminId && (
            <Form.Item
              name="password"
              label="Initial Password"
              rules={[{ required: true, message: 'Please enter a password' }]}
            >
              <Input.Password 
                prefix={<LockOutlined />}
                placeholder="Password"
              />
            </Form.Item>
          )}
          
          <Form.Item
            name="role"
            label="Administrator Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select role">
              <Option value="Admin">Admin</Option>
              <Option value="Limited Admin">Limited Admin</Option>
              <Option value="Super Admin">Super Admin</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        title="Reset Administrator Password"
        visible={resetPasswordModalVisible}
        onOk={handlePasswordReset}
        onCancel={() => setResetPasswordModalVisible(false)}
        okText="Reset Password"
        maskClosable={false}
      >
        {selectedAdmin && (
          <div className="mb-4">
            <p>
              Reset password for: <strong>{selectedAdmin.first_name} {selectedAdmin.last_name}</strong>
            </p>
          </div>
        )}
        
        <Form
          form={passwordForm}
          layout="vertical"
        >
          <Form.Item
            name="password"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="New Password"
              iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            rules={[
              { required: true, message: 'Please confirm the new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm New Password"
              iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminManagement;
