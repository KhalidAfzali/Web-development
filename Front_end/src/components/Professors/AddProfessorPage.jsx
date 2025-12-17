import React, { useState } from 'react';
import { Card, Form, Input, Button, Select, message, Row, Col, Divider, Steps, Alert } from 'antd';
import { UserOutlined, SolutionOutlined, BookOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './AddProfessorPage.css';

const { Option } = Select;

const AddProfessorPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState({});
  const navigate = useNavigate();

  const steps = [
    {
      title: 'Basic Information',
      icon: <UserOutlined />,
    },
    {
      title: 'Academic Details',
      icon: <BookOutlined />,
    },
    {
      title: 'Confirmation',
      icon: <CheckCircleOutlined />,
    },
  ];

  const onFinish = async (values) => {
    try {
      setLoading(true);
      console.log('All form values:', values);

      // Combine all form values
      const allValues = { ...formValues, ...values };
      console.log('Combined values for submission:', allValues);

      // Step 1: Create User Account
      const userResponse = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: allValues.username,
          email: allValues.email,
          password: allValues.password,
          role: 'doctor',
          profile: {
            firstName: allValues.firstName,
            lastName: allValues.lastName,
            phone: allValues.phone,
            department: 'Computer Science'
          },
          isActive: true
        }),
      });

      const userData = await userResponse.json();
      console.log('User creation response:', userData);

      if (!userResponse.ok || !userData.success) {
        const errorMessage = userData.message || userData.error || 'Failed to create user account';
        throw new Error(errorMessage);
      }

      // Step 2: Create Doctor Profile
      const doctorResponse = await fetch('http://localhost:5000/api/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: userData.data._id,
          employeeId: allValues.employeeId,
          specialization: allValues.specialization,
          office: {
            building: allValues.building,
            room: allValues.office
          },
          maxCourses: allValues.maxCourses,
          isAvailable: allValues.isAvailable
        }),
      });

      const doctorData = await doctorResponse.json();
      console.log('Doctor creation response:', doctorData);

      if (!doctorResponse.ok || !doctorData.success) {
        // If doctor creation fails, delete the user we just created
        await fetch(`http://localhost:5000/api/users/${userData.data._id}`, {
          method: 'DELETE',
        });
        
        const errorMessage = doctorData.message || doctorData.error || 'Failed to create professor profile';
        throw new Error(errorMessage);
      }

      message.success('Professor added successfully!');
      form.resetFields();
      setFormValues({});
      setCurrentStep(0);
      
      setTimeout(() => {
        navigate('/admin/faculty');
      }, 2000);

    } catch (error) {
      console.error('Error adding professor:', error);
      message.error(error.message || 'Failed to add professor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    // Get current form values
    form.validateFields()
      .then((values) => {
        // Save current step values
        setFormValues(prev => ({ ...prev, ...values }));
        console.log('Step values saved:', values);
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

  const specializationOptions = [
    'Algorithms',
    'Data Structures',
    'Database Systems',
    'Software Engineering',
    'Artificial Intelligence',
    'Machine Learning',
    'Computer Networks',
    'Web Development',
    'Mobile Development',
    'Cybersecurity',
    'Data Science',
    'Cloud Computing',
    'Operating Systems',
    'Computer Architecture',
    'Human-Computer Interaction'
  ];

  const buildingOptions = [
    'Computer Science Building',
    'Engineering Building',
    'Science Center',
    'Technology Hall',
    'Research Complex'
  ];

  // Get all current values for review step
  const getReviewData = () => {
    const currentValues = form.getFieldsValue();
    return { ...formValues, ...currentValues };
  };

  return (
    <div className="add-professor-page">
      <div className="page-header">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/admin/faculty')}
          className="back-button"
        >
          Back to Faculty
        </Button>
        <h1 style={{marginLeft:300}}>Add New Professor</h1>
        <p>Add a new faculty member to the Computer Science Department</p>
      </div>

      <Card className="form-card">
        <Steps current={currentStep} items={steps} className="form-steps" />
        
        <Divider />

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="professor-form"
          initialValues={{
            isAvailable: true,
            maxCourses: 3,
            building: 'Computer Science Building'
          }}
          scrollToFirstError
          preserve={false} // This ensures form values are managed properly
        >
          {/* Step 1: Basic Information */}
          {currentStep === 0 && (
            <div className="form-step">
              <h3>Basic Information</h3>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[
                      { required: true, message: 'Please enter first name' },
                      { min: 2, message: 'First name must be at least 2 characters' }
                    ]}
                  >
                    <Input placeholder="Enter first name" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                    rules={[
                      { required: true, message: 'Please enter last name' },
                      { min: 2, message: 'Last name must be at least 2 characters' }
                    ]}
                  >
                    <Input placeholder="Enter last name" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email Address"
                    rules={[
                      { required: true, message: 'Please enter email address' },
                      { type: 'email', message: 'Please enter a valid email address' }
                    ]}
                  >
                    <Input placeholder="professor@cs.edu" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[
                      { required: true, message: 'Please enter phone number' },
                      { pattern: /^\+?[\d\s-()]+$/, message: 'Please enter a valid phone number' }
                    ]}
                  >
                    <Input placeholder="+1234567890" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="username"
                    label="Username"
                    rules={[
                      { required: true, message: 'Please enter username' },
                      { min: 3, message: 'Username must be at least 3 characters' }
                    ]}
                  >
                    <Input placeholder="Enter username" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                      { required: true, message: 'Please enter password' },
                      { min: 6, message: 'Password must be at least 6 characters' }
                    ]}
                  >
                    <Input.Password placeholder="Enter password" size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}

          {/* Step 2: Academic Details */}
          {currentStep === 1 && (
            <div className="form-step">
              <h3>Academic Details</h3>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="employeeId"
                    label="Employee ID"
                    rules={[
                      { required: true, message: 'Please enter employee ID' },
                      { pattern: /^[A-Za-z0-9]+$/, message: 'Employee ID can only contain letters and numbers' }
                    ]}
                  >
                    <Input placeholder="CS001" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="maxCourses"
                    label="Maximum Courses"
                    rules={[{ required: true, message: 'Please select maximum courses' }]}
                  >
                    <Select size="large" placeholder="Select maximum courses">
                      <Option value={2}>2 Courses</Option>
                      <Option value={3}>3 Courses</Option>
                      <Option value={4}>4 Courses</Option>
                      <Option value={5}>5 Courses</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="specialization"
                label="Specializations"
                rules={[{ required: true, message: 'Please select at least one specialization' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select specializations"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {specializationOptions.map(spec => (
                    <Option key={spec} value={spec}>{spec}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="building"
                    label="Building"
                    rules={[{ required: true, message: 'Please select building' }]}
                  >
                    <Select size="large" placeholder="Select building">
                      {buildingOptions.map(building => (
                        <Option key={building} value={building}>{building}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="office"
                    label="Office Room"
                    rules={[{ required: true, message: 'Please enter office room' }]}
                  >
                    <Input placeholder="CS-101" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="isAvailable"
                label="Availability"
                rules={[{ required: true, message: 'Please select availability' }]}
              >
                <Select size="large" placeholder="Select availability">
                  <Option value={true}>Available for Teaching</Option>
                  <Option value={false}>Currently Unavailable</Option>
                </Select>
              </Form.Item>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 2 && (
            <div className="form-step">
              <h3>Confirmation</h3>
              <Alert
                message="Review Professor Information"
                description="Please review all the information below before submitting. You can go back to make changes if needed."
                type="info"
                showIcon
                style={{ marginBottom: 20 }}
              />
              
              <div className="review-section">
                <h4>Basic Information</h4>
                <Row gutter={16}>
                  <Col span={12}>
                    <p><strong>Name:</strong> {getReviewData().firstName} {getReviewData().lastName}</p>
                    <p><strong>Email:</strong> {getReviewData().email}</p>
                    <p><strong>Phone:</strong> {getReviewData().phone}</p>
                  </Col>
                  <Col span={12}>
                    <p><strong>Username:</strong> {getReviewData().username}</p>
                    <p><strong>Employee ID:</strong> {getReviewData().employeeId}</p>
                    <p><strong>Max Courses:</strong> {getReviewData().maxCourses}</p>
                  </Col>
                </Row>
                
                <h4>Academic Details</h4>
                <p><strong>Specializations:</strong> {Array.isArray(getReviewData().specialization) ? getReviewData().specialization.join(', ') : 'None selected'}</p>
                <p><strong>Office:</strong> {getReviewData().building} - {getReviewData().office}</p>
                <p><strong>Status:</strong> {getReviewData().isAvailable ? 'Available' : 'Unavailable'}</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="form-actions">
            {currentStep > 0 && (
              <Button onClick={prevStep} style={{ marginRight: 8 }}>
                Previous
              </Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={nextStep}>
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<CheckCircleOutlined />}
                disabled={loading}
              >
                {loading ? 'Adding Professor...' : 'Add Professor'}
              </Button>
            )}
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default AddProfessorPage;