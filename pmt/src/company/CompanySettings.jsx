import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Spin, 
  message, 
  Tabs,
  Divider,
  Select,
  Upload,
  Avatar,
  Row,
  Col,
  Switch
} from 'antd';
import { 
  SaveOutlined, 
  UploadOutlined,
  BuildOutlined,
  TeamOutlined,
  GlobalOutlined,
  BankOutlined,
  SettingOutlined,
  MailOutlined,
  SecurityScanOutlined,
  BellOutlined
} from '@ant-design/icons';
import CompanyNavbar from './CompanyNavbar';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const CompanySettings = () => {
  const [companyData, setCompanyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Industry options
  const industries = [
    'Technology',
    'Finance',
    'Healthcare',
    'Education',
    'Retail',
    'Manufacturing',
    'Entertainment',
    'Construction',
    'Hospitality',
    'Transportation',
    'Agriculture',
    'Energy',
    'Other'
  ];

  // Fetch company data
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }

    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        
        const companyId = localStorage.getItem('companyId');
        const response = await axios.get(`/api/company/${companyId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data) {
          setCompanyData(response.data);
          form.setFieldsValue({
            company_name: response.data.company_name,
            category: response.data.category,
            sector: response.data.sector,
            address: response.data.address,
            city: response.data.city,
            state: response.data.state,
            zipCode: response.data.zip_code,
            country: response.data.country,
            email: response.data.email,
            phone: response.data.phone,
            website: response.data.website
          });
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        message.error('Failed to load company data');
        
        // Set default values for form fields if API call fails
        form.setFieldsValue({
          company_name: 'Your Company',
          category: 'Technology',
          sector: 'Software',
          email: 'contact@yourcompany.com'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [form, navigate]);

  // Save company settings
  const handleSave = async (values) => {
    try {
      setSaving(true);
      const authToken = localStorage.getItem('authToken');
      const companyId = localStorage.getItem('companyId');
      
      // Format data for API
      const updatedData = {
        company_name: values.company_name,
        category: values.category,
        sector: values.sector,
        address: values.address,
        city: values.city,
        state: values.state,
        zip_code: values.zipCode,
        country: values.country,
        email: values.email,
        phone: values.phone,
        website: values.website
      };
      
      // Update company data
      await axios.put(`/api/company/${companyId}`, updatedData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      message.success('Company settings updated successfully');
      
      // Update local state
      setCompanyData({
        ...companyData,
        ...updatedData
      });
    } catch (error) {
      console.error('Error updating company settings:', error);
      message.error('Failed to update company settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (info) => {
    if (info.file.status === 'uploading') {
      return;
    }
    
    if (info.file.status === 'done') {
      message.success(`${info.file.name} file uploaded successfully`);
      
      // Update company data with new logo URL
      setCompanyData({
        ...companyData,
        logo: info.file.response.url
      });
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  };

  // Get company name from localStorage or use a default
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const companyName = user.companyName || companyData.company_name || 'Your Company';

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
          <h1 className="text-2xl font-semibold text-gray-900">Company Settings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your company information and preferences
          </p>
        </div>
        
        {/* Main content */}
        <div className="px-4 sm:px-0">
          <Card className="shadow-sm">
            <Tabs defaultActiveKey="1">
              <TabPane
                tab={
                  <span>
                    <BankOutlined />
                    Company Information
                  </span>
                }
                key="1"
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSave}
                >
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Company Logo</h3>
                    <div className="flex items-center">
                      <Avatar 
                        src={companyData.logo}
                        size={80}
                        icon={!companyData.logo && <BankOutlined />}
                        shape="square"
                        className="mr-4"
                      />
                      <Upload
                        name="logo"
                        action={`/api/company/${localStorage.getItem('companyId')}/logo`}
                        headers={{
                          Authorization: `Bearer ${localStorage.getItem('authToken')}`
                        }}
                        onChange={handleLogoUpload}
                        showUploadList={false}
                      >
                        <Button icon={<UploadOutlined />}>Upload Logo</Button>
                      </Upload>
                    </div>
                  </div>
                  
                  <Divider />
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        name="company_name"
                        label="Company Name"
                        rules={[{ required: true, message: 'Please enter the company name' }]}
                      >
                        <Input prefix={<BankOutlined />} placeholder="Company Name" />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        name="category"
                        label="Industry Category"
                      >
                        <Select placeholder="Select industry">
                          {industries.map(industry => (
                            <Option key={industry} value={industry}>{industry}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        name="sector"
                        label="Business Sector"
                      >
                        <Input placeholder="Business Sector" />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        name="website"
                        label="Website"
                      >
                        <Input prefix={<GlobalOutlined />} placeholder="https://example.com" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider />
                  
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        name="email"
                        label="Contact Email"
                        rules={[
                          { type: 'email', message: 'Please enter a valid email' }
                        ]}
                      >
                        <Input prefix={<MailOutlined />} placeholder="contact@example.com" />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        name="phone"
                        label="Contact Phone"
                      >
                        <Input placeholder="+1 123 456 7890" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Divider />
                  
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
                  
                  <Form.Item
                    name="address"
                    label="Street Address"
                  >
                    <Input placeholder="123 Main St" />
                  </Form.Item>
                  
                  <Row gutter={16}>
                    <Col span={24} md={8}>
                      <Form.Item
                        name="city"
                        label="City"
                      >
                        <Input placeholder="City" />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={8}>
                      <Form.Item
                        name="state"
                        label="State/Province"
                      >
                        <Input placeholder="State/Province" />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={8}>
                      <Form.Item
                        name="zipCode"
                        label="ZIP/Postal Code"
                      >
                        <Input placeholder="ZIP/Postal Code" />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item
                    name="country"
                    label="Country"
                  >
                    <Select placeholder="Select country" showSearch>
                      <Option value="US">United States</Option>
                      <Option value="CA">Canada</Option>
                      <Option value="GB">United Kingdom</Option>
                      <Option value="AU">Australia</Option>
                      <Option value="IN">India</Option>
                      <Option value="DE">Germany</Option>
                      <Option value="FR">France</Option>
                    </Select>
                  </Form.Item>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="primary" 
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={saving}
                    >
                      Save Changes
                    </Button>
                  </div>
                </Form>
              </TabPane>
              
              <TabPane
                tab={
                  <span>
                    <TeamOutlined />
                    Team Settings
                  </span>
                }
                key="2"
              >
                <Form layout="vertical">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Default Team Settings</h3>
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Default Project Methodology"
                        name="defaultMethodology"
                        initialValue="agile"
                      >
                        <Select>
                          <Option value="agile">Agile</Option>
                          <Option value="waterfall">Waterfall</Option>
                          <Option value="kanban">Kanban</Option>
                          <Option value="scrum">Scrum</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Default Task Assignment"
                        name="defaultAssignment"
                        initialValue="manual"
                      >
                        <Select>
                          <Option value="manual">Manual</Option>
                          <Option value="ai_recommended">AI Recommended</Option>
                          <Option value="round_robin">Round Robin</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Allow Team Leaders to Create Projects"
                        name="leaderCreateProjects"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Allow Team Members to Invite Others"
                        name="memberInviteOthers"
                        valuePropName="checked"
                        initialValue={false}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />}
                    >
                      Save Team Settings
                    </Button>
                  </div>
                </Form>
              </TabPane>
              
              <TabPane
                tab={
                  <span>
                    <SecurityScanOutlined />
                    Security
                  </span>
                }
                key="3"
              >
                <Form layout="vertical">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Require Two-Factor Authentication"
                        name="require2FA"
                        valuePropName="checked"
                        initialValue={false}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Password Reset Time (days)"
                        name="passwordResetDays"
                        initialValue={90}
                      >
                        <Select>
                          <Option value={30}>30 days</Option>
                          <Option value={60}>60 days</Option>
                          <Option value={90}>90 days</Option>
                          <Option value={180}>180 days</Option>
                          <Option value={365}>365 days</Option>
                          <Option value={0}>Never</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Minimum Password Length"
                        name="minPasswordLength"
                        initialValue={8}
                      >
                        <Select>
                          <Option value={8}>8 characters</Option>
                          <Option value={10}>10 characters</Option>
                          <Option value={12}>12 characters</Option>
                          <Option value={14}>14 characters</Option>
                          <Option value={16}>16 characters</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Session Timeout (minutes)"
                        name="sessionTimeout"
                        initialValue={60}
                      >
                        <Select>
                          <Option value={15}>15 minutes</Option>
                          <Option value={30}>30 minutes</Option>
                          <Option value={60}>60 minutes</Option>
                          <Option value={120}>120 minutes</Option>
                          <Option value={240}>4 hours</Option>
                          <Option value={480}>8 hours</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />}
                    >
                      Save Security Settings
                    </Button>
                  </div>
                </Form>
              </TabPane>
              
              <TabPane
                tab={
                  <span>
                    <BellOutlined />
                    Notifications
                  </span>
                }
                key="4"
              >
                <Form layout="vertical">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Company Notification Settings</h3>
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Send Daily Summary to Admins"
                        name="dailySummary"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Send Weekly Reports"
                        name="weeklyReports"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={16}>
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Notify on New Team Member"
                        name="notifyNewMember"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    
                    <Col span={24} md={12}>
                      <Form.Item
                        label="Notify on Task Overdue"
                        name="notifyTaskOverdue"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />}
                    >
                      Save Notification Settings
                    </Button>
                  </div>
                </Form>
              </TabPane>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CompanySettings;
