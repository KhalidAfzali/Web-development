import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  InputNumber, 
  message, 
  Steps, 
  Alert,
  Row,
  Col,
  Spin,
  Modal,
  Typography
} from 'antd';
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  InfoCircleOutlined,
  HomeOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AddClassroomPage.css';

const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;
const { Title, Text } = Typography;

const AddClassroomPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    roomNumber: '',
    building: '',
    roomType: '',
    capacity: 30,
    facilities: [],
    description: '',
    isAvailable: true
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const buildingOptions = [
    'Computer Science Building',
    'Engineering Building',
    'Science Center',
    'Technology Hall',
    'Research Complex',
    'Main Campus Building'
  ];

  const facilityOptions = [
    'Projector',
    'Whiteboard',
    'Smart Board',
    'WiFi',
    'Computers',
    'Sound System',
    'Air Conditioning',
    'Wheelchair Access',
    'Video Conferencing',
    'Microphone',
    'Document Camera'
  ];

  // Handle form field changes
  const handleFieldChange = (changedValues, allValues) => {
    console.log('Form changed:', changedValues, 'All values:', allValues);
    setFormData(prev => ({
      ...prev,
      ...changedValues
    }));
  };

  // Initialize form with current data when step changes
  useEffect(() => {
    // Set form values from stored data
    form.setFieldsValue(formData);
  }, [currentStep, formData]);

  const onFinish = async () => {
    try {
      setSubmitting(true);
      console.log('Final form data before submission:', formData);
      
      // Validate all required fields
      const requiredFields = ['roomNumber', 'building', 'roomType', 'capacity'];
      const missingFields = requiredFields.filter(field => {
        const value = formData[field];
        return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
      });
      
      if (missingFields.length > 0) {
        message.error(`Missing required fields: ${missingFields.join(', ')}`);
        // Go back to first step with missing fields
        setCurrentStep(0);
        setSubmitting(false);
        return;
      }
      
      // Check authentication
      const token = localStorage.getItem('authToken');
      if (!token) {
        message.error('Authentication required. Please login again.');
        navigate('/login');
        return;
      }
      
      // Prepare data
      const classroomData = {
        roomNumber: formData.roomNumber.toString().trim(),
        building: formData.building.toString().trim(),
        capacity: Number(formData.capacity),
        roomType: formData.roomType.toString().trim(),
        facilities: Array.isArray(formData.facilities) ? formData.facilities : [],
        description: formData.description?.toString().trim() || '',
        isAvailable: formData.isAvailable !== false
      };
      
      console.log('Submitting to server:', classroomData);
      
      const response = await axios.post('http://localhost:5000/api/classrooms', classroomData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        message.success('Classroom added successfully!');
        
        Modal.success({
          title: 'Success!',
          content: (
            <div>
              <p>Classroom <strong>{classroomData.roomNumber}</strong> has been created.</p>
              <Alert
                message="Details"
                description={
                  <div>
                    <p><strong>Building:</strong> {classroomData.building}</p>
                    <p><strong>Type:</strong> {classroomData.roomType}</p>
                    <p><strong>Capacity:</strong> {classroomData.capacity} seats</p>
                    <p><strong>Facilities:</strong> {classroomData.facilities.join(', ') || 'None'}</p>
                  </div>
                }
                type="info"
                showIcon
              />
            </div>
          ),
          okText: 'View Classrooms',
          onOk: () => {
            navigate('/admin/classrooms');
          }
        });
      }
      
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        if (error.response.data.missingFields) {
          message.error(`Missing: ${error.response.data.missingFields.join(', ')}`);
        } else if (error.response.data.message) {
          message.error(error.response.data.message);
        }
      } else {
        message.error('Failed to add classroom. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    const currentStepFields = getStepFields(currentStep);
    form.validateFields(currentStepFields)
      .then(() => {
        // Update formData with current step values
        const values = form.getFieldsValue();
        setFormData(prev => ({ ...prev, ...values }));
        setCurrentStep(currentStep + 1);
      })
      .catch((errorInfo) => {
        console.log('Validation failed:', errorInfo);
        message.warning('Please fill in all required fields correctly');
      });
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const getStepFields = (step) => {
    switch(step) {
      case 0: return ['roomNumber', 'building', 'roomType'];
      case 1: return ['capacity', 'facilities'];
      case 2: return ['description', 'isAvailable'];
      default: return [];
    }
  };

  const steps = [
    {
      title: 'Basic Info',
      content: (
        <div className="form-step">
          <Alert
            message="Classroom Information"
            description="Enter the basic details of the classroom"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 20 }}
          />
          
          <Form.Item
            name="roomNumber"
            label="Room Number"
            rules={[
              { required: true, message: 'Please enter room number' },
              { min: 2, message: 'Room number must be at least 2 characters' },
              { max: 20, message: 'Room number cannot exceed 20 characters' },
              { 
                pattern: /^[A-Za-z0-9\-_.]+$/, 
                message: 'Only letters, numbers, hyphens, underscores, and dots allowed' 
              }
            ]}
            initialValue={formData.roomNumber}
          >
            <Input 
              placeholder="e.g., CS-201, LAB-101, A.101" 
              size="large"
              allowClear
              onChange={(e) => {
                setFormData(prev => ({ ...prev, roomNumber: e.target.value }));
              }}
            />
          </Form.Item>

          <Form.Item
            name="building"
            label="Building"
            rules={[
              { required: true, message: 'Please select building' }
            ]}
            initialValue={formData.building}
          >
            <Select 
              placeholder="Select building" 
              showSearch
              size="large"
              allowClear
              onChange={(value) => {
                setFormData(prev => ({ ...prev, building: value }));
              }}
            >
              {buildingOptions.map(building => (
                <Option key={building} value={building}>
                  {building}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="roomType"
            label="Room Type"
            rules={[{ required: true, message: 'Please select room type' }]}
            initialValue={formData.roomType}
          >
            <Select 
              placeholder="Select room type"
              size="large"
              allowClear
              onChange={(value) => {
                setFormData(prev => ({ ...prev, roomType: value }));
              }}
            >
              <Option value="Lecture Hall">Lecture Hall</Option>
              <Option value="Lab">Lab</Option>
              <Option value="Seminar Room">Seminar Room</Option>
              <Option value="Computer Lab">Computer Lab</Option>
              <Option value="Auditorium">Auditorium</Option>
              <Option value="Tutorial Room">Tutorial Room</Option>
            </Select>
          </Form.Item>
        </div>
      ),
    },
    {
      title: 'Capacity & Facilities',
      content: (
        <div className="form-step">
          <Alert
            message="Capacity & Facilities"
            description="Set the classroom capacity and available facilities"
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
          
          <Form.Item
            name="capacity"
            label="Capacity"
            rules={[
              { required: true, message: 'Please enter capacity' },
              { 
                type: 'number', 
                min: 1, 
                max: 1000, 
                message: 'Capacity must be between 1 and 1000' 
              }
            ]}
            initialValue={formData.capacity}
          >
            <InputNumber 
              placeholder="Number of seats" 
              style={{ width: '100%' }}
              min={1}
              max={1000}
              size="large"
              onChange={(value) => {
                setFormData(prev => ({ ...prev, capacity: value }));
              }}
            />
          </Form.Item>

          <Form.Item
            name="facilities"
            label="Facilities"
            initialValue={formData.facilities}
          >
            <Select
              mode="multiple"
              placeholder="Select available facilities"
              showSearch
              allowClear
              size="large"
              onChange={(value) => {
                setFormData(prev => ({ ...prev, facilities: value }));
              }}
            >
              {facilityOptions.map(facility => (
                <Option key={facility} value={facility}>
                  {facility}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      ),
    },
    {
      title: 'Review & Submit',
      content: (
        <div className="form-step">
          <Alert
            message="Review Information"
            description="Review all information before submitting"
            type="success"
            showIcon
            style={{ marginBottom: 20 }}
          />
          
          <Card 
            title="Classroom Details" 
            size="small"
            style={{ marginBottom: 20 }}
          >
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text strong>Room Number:</Text>
              </Col>
              <Col span={12}>
                <Text>{formData.roomNumber || <Text type="danger">Not specified</Text>}</Text>
              </Col>
              
              <Col span={12}>
                <Text strong>Building:</Text>
              </Col>
              <Col span={12}>
                <Text>{formData.building || <Text type="danger">Not specified</Text>}</Text>
              </Col>
              
              <Col span={12}>
                <Text strong>Room Type:</Text>
              </Col>
              <Col span={12}>
                <Text>{formData.roomType || <Text type="danger">Not specified</Text>}</Text>
              </Col>
              
              <Col span={12}>
                <Text strong>Capacity:</Text>
              </Col>
              <Col span={12}>
                <Text>{formData.capacity || 'Not specified'} seats</Text>
              </Col>
              
              <Col span={12}>
                <Text strong>Availability:</Text>
              </Col>
              <Col span={12}>
                <Text type={formData.isAvailable ? 'success' : 'warning'}>
                  {formData.isAvailable !== false ? 'Available' : 'Under Maintenance'}
                </Text>
              </Col>
              
              <Col span={12}>
                <Text strong>Facilities:</Text>
              </Col>
              <Col span={12}>
                <Text>
                  {Array.isArray(formData.facilities) && formData.facilities.length > 0 
                    ? formData.facilities.join(', ') 
                    : 'None specified'}
                </Text>
              </Col>
            </Row>
          </Card>
          
          <Form.Item
            name="description"
            label="Description (Optional)"
            initialValue={formData.description}
          >
            <TextArea 
              rows={3} 
              placeholder="Additional notes about the classroom"
              maxLength={500}
              showCount
              allowClear
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
              }}
            />
          </Form.Item>

          <Form.Item
            name="isAvailable"
            label="Availability"
            initialValue={formData.isAvailable}
          >
            <Select 
              size="large"
              onChange={(value) => {
                setFormData(prev => ({ ...prev, isAvailable: value }));
              }}
            >
              <Option value={true}>Available</Option>
              <Option value={false}>Under Maintenance</Option>
            </Select>
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <div className="add-classroom-page">
      <div className="page-header">
        <div className="header-left">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/admin/classrooms')}
            className="back-button"
            disabled={submitting}
          >
            Back to Classrooms
          </Button>
        </div>
        
        <div className="header-center">
          <Title level={2}>Add New Classroom</Title>
          <Text type="secondary">Step-by-step classroom creation</Text>
          {submitting && (
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} 
              style={{ marginLeft: 8 }}
            />
          )}
        </div>
        
        <div className="header-right">
          <Button 
            type="text" 
            icon={<HomeOutlined />}
            onClick={() => navigate('/admin/dashboard')}
            disabled={submitting}
          >
            Dashboard
          </Button>
        </div>
      </div>

      <Card className="form-card">
        <Steps current={currentStep} className="form-steps">
          {steps.map(item => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFieldChange}
          className="classroom-form"
          initialValues={formData}
        >
          <div className="step-content">
            {steps[currentStep].content}
          </div>

          <div className="form-actions">
            {currentStep > 0 && (
              <Button 
                onClick={prevStep} 
                style={{ marginRight: 8 }}
                size="large"
                disabled={submitting}
              >
                Previous
              </Button>
            )}
            
            {currentStep < steps.length - 1 && (
              <Button 
                type="primary" 
                onClick={nextStep}
                size="large"
                disabled={submitting}
              >
                Next
              </Button>
            )}
            
            {currentStep === steps.length - 1 && (
              <Button 
                type="primary" 
                onClick={onFinish}
                loading={submitting}
                icon={<CheckCircleOutlined />}
                size="large"
              >
                {submitting ? 'Adding Classroom...' : 'Add Classroom'}
              </Button>
            )}
          </div>
        </Form>
      </Card>

      <Card 
        title="Form Status" 
        className="status-card"
        style={{ marginTop: 24 }}
        extra={
          <Button 
            type="link" 
            onClick={() => {
              console.log('Current form data:', formData);
              console.log('Form values:', form.getFieldsValue());
              message.info('Form data logged to console');
            }}
          >
            Debug
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small">
              <Text strong>Current Step:</Text>
              <br />
              <Text>{currentStep + 1} of {steps.length}</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Text strong>Required Fields Filled:</Text>
              <br />
              <Text type={
                ['roomNumber', 'building', 'roomType', 'capacity']
                  .filter(field => formData[field]).length >= 4 
                  ? 'success' 
                  : 'warning'
              }>
                {['roomNumber', 'building', 'roomType', 'capacity']
                  .filter(field => {
                    const value = formData[field];
                    return value !== undefined && value !== null && value !== '' && value !== 0;
                  }).length} of 4
              </Text>
            </Card>
          </Col>
        </Row>
        
        <Alert
          message="Step Requirements"
          description={
            <div>
              <p><Text strong>Step 1:</Text> Room Number, Building, Room Type</p>
              <p><Text strong>Step 2:</Text> Capacity</p>
              <p><Text strong>Step 3:</Text> Review & Submit</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
};

export default AddClassroomPage;