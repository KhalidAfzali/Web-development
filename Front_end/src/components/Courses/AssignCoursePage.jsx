// components/Courses/AssignCoursePage.jsx
import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, Table, Tag, message, Modal, Input } from 'antd';
import { ArrowLeftOutlined, UserOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './AssignCoursePage.css';

const { Option } = Select;

const AssignCoursePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchCourses();
    fetchProfessors();
  }, []);

  // Get course ID from URL if coming from course creation
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const courseId = queryParams.get('courseId');
    if (courseId) {
      setSelectedCourse(courseId);
      form.setFieldValue('courseId', courseId);
    }
  }, [location.search]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:5000/api/courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      message.error('Failed to fetch courses');
    }
  };

  const fetchProfessors = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:5000/api/doctors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setProfessors(response.data.data);
      }
    } catch (error) {
      message.error('Failed to fetch professors');
    }
  };
// Update the handleAssign function in AssignCoursePage.jsx
const handleAssign = async (values) => {
  try {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    
    const payload = {
      professorId: values.professorId,
      courseId: values.courseId,
      sectionNumber: values.sectionNumber || '001',
      type: values.type || 'Lecture',
      capacity: values.capacity || 30
    };

    // Use the correct endpoint
    const response = await axios.post('http://localhost:5000/api/sections/assign', payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.data.success) {
      message.success('Course assigned successfully!');
      form.resetFields();
      setSelectedCourse(null);
      setSelectedProfessor(null);
      setSections([]);
    }
  } catch (error) {
    message.error(error.response?.data?.message || 'Failed to assign course');
    console.error('Assignment error:', error);
  } finally {
    setLoading(false);
  }
};

// Update fetchCourseSections function
const fetchCourseSections = async (courseId) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`http://localhost:5000/api/sections?courseId=${courseId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.data.success) {
      setSections(response.data.data);
    }
  } catch (error) {
    // If no sections exist, that's okay
    console.log('No sections found for this course:', error.message);
    setSections([]);
  }
};

  const handleCourseSelect = (courseId) => {
    setSelectedCourse(courseId);
    fetchCourseSections(courseId);
  };

  const handleProfessorSelect = (professorId) => {
    setSelectedProfessor(professorId);
    const professor = professors.find(p => p._id === professorId);
    if (professor) {
      // Check if professor is at capacity
      const currentLoad = professor.assignedCourses?.length || 0;
      const maxLoad = professor.maxCourses || 3;
      
      if (currentLoad >= maxLoad) {
        Modal.warning({
          title: 'Professor at Maximum Load',
          content: `This professor is already assigned ${currentLoad} out of ${maxLoad} maximum courses.`,
        });
      }
    }
  };


  const professorColumns = [
    {
      title: 'Professor',
      dataIndex: 'user',
      key: 'user',
      render: (user) => (
        <div className="professor-info">
          <div className="professor-name">
            {user?.profile?.firstName} {user?.profile?.lastName}
          </div>
          <div className="professor-email">{user?.email}</div>
        </div>
      ),
    },
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
    },
    {
      title: 'Specialization',
      dataIndex: 'specialization',
      key: 'specialization',
      render: (specializations) => (
        <div>
          {specializations?.slice(0, 2).map((spec, index) => (
            <Tag key={index} color="blue" style={{ marginBottom: '2px' }}>
              {spec}
            </Tag>
          ))}
          {specializations?.length > 2 && (
            <Tag>+{specializations.length - 2} more</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Current Load',
      key: 'load',
      render: (_, record) => {
        const currentLoad = record.assignedCourses?.length || 0;
        const maxLoad = record.maxCourses || 3;
        const percentage = (currentLoad / maxLoad) * 100;
        
        return (
          <div className="load-info">
            <div className="load-text">
              {currentLoad} / {maxLoad} courses
            </div>
            <div className="load-bar">
              <div 
                className="load-progress"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: percentage >= 100 ? '#ff4d4f' : 
                                 percentage >= 80 ? '#faad14' : '#52c41a'
                }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="assign-course-page">
      <div className="page-header">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/admin/courses')}
          className="back-button"
        >
          Back to Courses
        </Button>
        <h1>Assign Course to Professor</h1>
        <p>Assign courses and sections to faculty members</p>
      </div>

      <div className="assign-content">
        <Card title="Assignment Form" className="assign-form-card">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAssign}
            className="assign-form"
          >
            <Form.Item
              name="courseId"
              label="Select Course"
              rules={[{ required: true, message: 'Please select a course' }]}
            >
              <Select
                placeholder="Search and select course"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                onChange={handleCourseSelect}
              >
                {courses.map(course => (
                  <Option key={course._id} value={course._id}>
                    {course.courseCode} - {course.courseName} ({course.credits} credits)
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedCourse && (
              <>
                <Form.Item
                  name="sectionId"
                  label="Select Section (Optional)"
                >
                  <Select
                    placeholder="Select existing section or leave blank to create new"
                    allowClear
                  >
                    {sections.map(section => (
                      <Option key={section._id} value={section._id}>
                        Section {section.sectionNumber} ({section.type}) - Capacity: {section.capacity}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="professorId"
                  label="Select Professor"
                  rules={[{ required: true, message: 'Please select a professor' }]}
                >
                  <Select
                    placeholder="Search and select professor"
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                    onChange={handleProfessorSelect}
                  >
                    {professors.map(professor => (
                      <Option key={professor._id} value={professor._id}>
                        {professor.user?.profile?.firstName} {professor.user?.profile?.lastName} - {professor.employeeId}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            )}

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                disabled={!selectedCourse || !selectedProfessor}
              >
                Assign Course
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Available Professors" className="professors-card">
          <Table
            columns={professorColumns}
            dataSource={professors}
            rowKey="_id"
            pagination={{ pageSize: 5 }}
            onRow={(record) => ({
              onClick: () => {
                setSelectedProfessor(record._id);
                form.setFieldValue('professorId', record._id);
              },
              className: selectedProfessor === record._id ? 'selected-row' : ''
            })}
          />
        </Card>
      </div>

      {selectedCourse && (
        <div className="course-info-section">
          <Card title="Course Information">
            <div className="course-details">
              {(() => {
                const course = courses.find(c => c._id === selectedCourse);
                if (!course) return null;
                
                return (
                  <>
                    <div className="course-header">
                      <h3>{course.courseCode} - {course.courseName}</h3>
                      <Tag color={course.isActive ? 'green' : 'red'}>
                        {course.isActive ? 'Active' : 'Inactive'}
                      </Tag>
                    </div>
                    <div className="course-meta">
                      <span><BookOutlined /> {course.credits} Credits</span>
                      <span>Level: {course.level}</span>
                      <span>Max Students: {course.maxStudents || 'Not set'}</span>
                    </div>
                    {course.description && (
                      <p className="course-description">{course.description}</p>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AssignCoursePage;