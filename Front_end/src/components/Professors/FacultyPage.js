// components/Professors/FacultyPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Tag, Avatar, Modal, message } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  UserOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import './FacultyPage.css';

const FacultyPage = () => {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:5000/api/doctors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setProfessors(response.data.data);
      }
    } catch (error) {
      message.error('Failed to fetch professors');
      console.error('Error fetching professors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id) => {
    navigate(`/admin/faculty/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/admin/faculty/edit/${id}`);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Delete Professor',
      content: 'Are you sure you want to delete this professor?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      async onOk() {
        try {
          const token = localStorage.getItem('authToken');
          const response = await axios.delete(`http://localhost:5000/api/doctors/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data.success) {
            message.success('Professor deleted successfully');
            fetchProfessors();
          }
        } catch (error) {
          message.error('Failed to delete professor');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Professor',
      dataIndex: 'user',
      key: 'user',
      render: (user) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />} 
            src={user?.profile?.avatar}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {user?.profile?.firstName} {user?.profile?.lastName}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {user?.email}
            </div>
          </div>
        </Space>
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
          {specializations?.map((spec, index) => (
            <Tag key={index} color="blue" style={{ marginBottom: '2px' }}>
              {spec}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Office',
      dataIndex: 'office',
      key: 'office',
      render: (office) => `${office?.building} ${office?.room}`,
    },
    {
      title: 'Max Courses',
      dataIndex: 'maxCourses',
      key: 'maxCourses',
    },
    {
      title: 'Status',
      dataIndex: 'isAvailable',
      key: 'isAvailable',
      render: (isAvailable) => (
        <Tag color={isAvailable ? 'green' : 'red'}>
          {isAvailable ? 'Available' : 'Unavailable'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleView(record._id)}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record._id)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record._id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="faculty-page">
      <div className="page-header">
        <div>
          <Button
          type="primary"
          
          onClick={() => navigate('/admin')}
        >
          Dashboard
        </Button>
        </div>
        <div>
          <h1>Faculty Management</h1>
          <p>Manage professors and their information</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/faculty/add')}
        >
          Add New Professor
        </Button>
      </div>

      <div className="faculty-content">
        <Table
          columns={columns}
          dataSource={professors}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} professors`,
          }}
        />
      </div>
    </div>
  );
};

export default FacultyPage;