import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  message, 
  Space, 
  Popconfirm, 
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
  Empty,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  UserOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ClassroomsPage.css';

const { Option } = Select;
const { Search } = Input;

const ClassroomsPage = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    filterClassrooms();
  }, [classrooms, searchText, buildingFilter, roomTypeFilter]);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        message.error('Authentication required');
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/classrooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setClassrooms(response.data.data);
        message.success(`Loaded ${response.data.count} classrooms`);
      } else {
        message.error(response.data.message || 'Failed to load classrooms');
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      
      if (error.response?.status === 401) {
        message.error('Session expired. Please login again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        navigate('/login');
      } else if (error.response?.status === 403) {
        message.error('Permission denied. Admin access required.');
        navigate('/unauthorized');
      } else {
        message.error(error.response?.data?.message || 'Failed to fetch classrooms');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterClassrooms = () => {
    let filtered = [...classrooms];

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(classroom => 
        classroom.roomNumber?.toLowerCase().includes(searchLower) ||
        classroom.building?.toLowerCase().includes(searchLower) ||
        classroom.description?.toLowerCase().includes(searchLower) ||
        classroom.roomType?.toLowerCase().includes(searchLower)
      );
    }

    // Building filter
    if (buildingFilter !== 'all') {
      filtered = filtered.filter(classroom => classroom.building === buildingFilter);
    }

    // Room type filter
    if (roomTypeFilter !== 'all') {
      filtered = filtered.filter(classroom => classroom.roomType === roomTypeFilter);
    }

    setFilteredClassrooms(filtered);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.delete(`http://localhost:5000/api/classrooms/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        message.success('Classroom deleted successfully');
        fetchClassrooms(); // Refresh the list
      } else {
        message.error(response.data.message || 'Failed to delete classroom');
      }
    } catch (error) {
      console.error('Delete error:', error);
      message.error(error.response?.data?.message || 'Failed to delete classroom');
    }
  };

  const getBuildingOptions = () => {
    const buildings = [...new Set(classrooms.map(c => c.building).filter(Boolean))];
    return buildings.sort();
  };

  const getRoomTypeOptions = () => {
    const roomTypes = [...new Set(classrooms.map(c => c.roomType).filter(Boolean))];
    return roomTypes.sort();
  };

  const columns = [
    {
      title: 'Room Details',
      key: 'details',
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EnvironmentOutlined style={{ color: '#3b82f6' }} />
            <strong style={{ fontSize: '16px' }}>{record.roomNumber}</strong>
            <Badge 
              status={record.isAvailable ? "success" : "error"} 
              text={record.isAvailable ? 'Available' : 'Unavailable'}
            />
          </div>
          <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
            {record.building} • {record.roomType}
          </div>
        </div>
      ),
      sorter: (a, b) => a.roomNumber.localeCompare(b.roomNumber),
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (capacity) => (
        <div style={{ textAlign: 'center' }}>
          <UserOutlined style={{ marginRight: '8px', color: '#8b5cf6' }} />
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{capacity}</span>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>seats</div>
        </div>
      ),
      sorter: (a, b) => a.capacity - b.capacity,
      width: 100,
    },
    {
      title: 'Facilities',
      dataIndex: 'facilities',
      key: 'facilities',
      render: (facilities) => (
        <div style={{ maxWidth: '200px' }}>
          {facilities?.slice(0, 3).map((facility, index) => (
            <Tag 
              key={index} 
              color="blue" 
              style={{ 
                marginBottom: '4px', 
                fontSize: '11px',
                padding: '2px 6px'
              }}
            >
              {facility}
            </Tag>
          ))}
          {facilities?.length > 3 && (
            <Tooltip title={facilities.slice(3).join(', ')}>
              <Tag style={{ cursor: 'pointer' }}>+{facilities.length - 3} more</Tag>
            </Tooltip>
          )}
          {(!facilities || facilities.length === 0) && (
            <Tag color="default">None</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'roomType',
      key: 'roomType',
      render: (type) => {
        const colors = {
          'Lecture Hall': 'blue',
          'Lab': 'red',
          'Computer Lab': 'purple',
          'Auditorium': 'green',
          'Seminar Room': 'orange',
          'Tutorial Room': 'cyan'
        };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
      },
      filters: getRoomTypeOptions().map(type => ({ text: type, value: type })),
      onFilter: (value, record) => record.roomType === value,
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/classrooms/edit/${record._id}`)}
              size="small"
              ghost
            />
          </Tooltip>
          
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Classroom"
              description="Are you sure? This action cannot be undone."
              onConfirm={() => handleDelete(record._id)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okType="danger"
            >
              <Button 
                danger 
                icon={<DeleteOutlined />}
                size="small"
                ghost
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
      width: 100,
    },
  ];

  const stats = {
    total: classrooms.length,
    available: classrooms.filter(c => c.isAvailable).length,
    unavailable: classrooms.filter(c => !c.isAvailable).length,
    averageCapacity: classrooms.length > 0 
      ? Math.round(classrooms.reduce((sum, c) => sum + c.capacity, 0) / classrooms.length)
      : 0,
  };

  return (
    <div className="classrooms-page">
      <div className="page-header">
        <div>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => navigate('/admin')}
            size="large"
          >
            Dashboard
          </Button>
        </div>
        <div className="header-left">
          <h1>Classroom Management</h1>
          <p>View and manage all classrooms</p>
        </div>
        
        <div className="header-right">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/classrooms/add')}
            size="large"
          >
            Add Classroom
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchClassrooms}
            loading={loading}
            size="large"
          >
            Refresh
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Total Classrooms" 
              value={stats.total}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Available" 
              value={stats.available}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Unavailable" 
              value={stats.unavailable}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Avg. Capacity" 
              value={stats.averageCapacity}
              suffix="seats"
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Classrooms List" 
        extra={
          <Space>
            <Search
              placeholder="Search classrooms..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={value => setSearchText(value)}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            
            <Select
              placeholder="Filter by building"
              value={buildingFilter}
              onChange={setBuildingFilter}
              allowClear
              style={{ width: 200 }}
            >
              <Option value="all">All Buildings</Option>
              {getBuildingOptions().map(building => (
                <Option key={building} value={building}>{building}</Option>
              ))}
            </Select>
            
            <Select
              placeholder="Filter by type"
              value={roomTypeFilter}
              onChange={setRoomTypeFilter}
              allowClear
              style={{ width: 150 }}
            >
              <Option value="all">All Types</Option>
              {getRoomTypeOptions().map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} 
              tip="Loading classrooms..."
            />
          </div>
        ) : filteredClassrooms.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              classrooms.length === 0 
                ? "No classrooms found. Add your first classroom!"
                : "No classrooms match your filters"
            }
          >
            {classrooms.length === 0 && (
              <Button 
                type="primary" 
                onClick={() => navigate('/admin/classrooms/add')}
                icon={<PlusOutlined />}
              >
                Add First Classroom
              </Button>
            )}
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredClassrooms}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Showing ${total} classrooms`,
              showQuickJumper: true,
            }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>
    </div>
  );
};

export default ClassroomsPage;