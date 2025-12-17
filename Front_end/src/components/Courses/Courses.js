// components/Courses/Courses.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CourseList from './CourseList';
import CourseForm from './CourseForm';
import CourseDetails from './CourseDetails';
import './Courses.css';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null); // ALWAYS object
  const [viewMode, setViewMode] = useState('list'); // 'list', 'details', 'form'
  const [isAdmin, setIsAdmin] = useState(false);
   const navigate = useNavigate();

  useEffect(() => {
    checkUserRole();
    fetchCourses();
  }, []);

  const checkUserRole = () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setIsAdmin(user.role === 'admin');
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const userDataRaw = localStorage.getItem('userData');
      const userData = userDataRaw ? JSON.parse(userDataRaw) : null;

      // Try doctor flow
      if (userData?._id) {
        try {
          const doctorResponse = await axios.get(
            `http://localhost:5000/api/doctors/user/${userData._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (doctorResponse.data.success) {
            const doctorId = doctorResponse.data.data._id;

            const scheduleResponse = await axios.get(
              `http://localhost:5000/api/schedules/professor/${doctorId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (scheduleResponse.data.success) {
              const uniqueCourses = [];
              const courseMap = new Map();

              scheduleResponse.data.data.forEach((schedule) => {
                if (schedule.course && !courseMap.has(schedule.course._id)) {
                  courseMap.set(schedule.course._id, true);
                  uniqueCourses.push(schedule.course);
                }
              });

              setCourses(uniqueCourses);
              setSelectedCourse(uniqueCourses[0] || null);
              return;
            }
          }
        } catch (e) {
          // doctor flow failed, continue to fallback
          console.log('Doctor flow failed, using fallback:', e.message);
        }
      }

      // Fallback: fetch all courses
      const allCoursesResponse = await axios.get('http://localhost:5000/api/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (allCoursesResponse.data.success) {
        const list = allCoursesResponse.data.data || [];
        setCourses(list);
        setSelectedCourse(list[0] || null);
      } else {
        setError('Failed to fetch courses');
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err.response?.data?.message || 'Error fetching courses');
    } finally {
      setLoading(false); // THIS is what was missing
    }
  };

  const handleCreateCourse = async (courseData) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('http://localhost:5000/api/courses', courseData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const newCourse = response.data.data;
        setCourses((prev) => [...prev, newCourse]);
        setViewMode('list');
        message.success('Course created successfully!');
      }
    } catch (err) {
      console.error('Error creating course:', err);
      message.error(err.response?.data?.message || 'Failed to create course');
    }
  };

  const handleViewDetails = (course) => {
    setSelectedCourse(course); // object
    setViewMode('details');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCourse(null);
  };

  const handleUpdateCourse = async (courseId, updatedData) => {
    const token = localStorage.getItem('authToken');
    const response = await axios.put(`http://localhost:5000/api/courses/${courseId}`, updatedData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.success) {
      const updated = response.data.data;

      setCourses((prev) => prev.map((c) => (c._id === courseId ? updated : c)));
      setSelectedCourse(updated);
      message.success('Course updated successfully!');
      return updated;
    }

    throw new Error('Update failed');
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.delete(`http://localhost:5000/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setCourses((prev) => prev.filter((c) => c._id !== courseId));
        if (selectedCourse?._id === courseId) setSelectedCourse(null);
        message.success('Course deleted successfully!');
        setViewMode('list');
      }
    } catch (err) {
      message.error('Failed to delete course');
    }
  };

  if (loading) return <div className="loading">Loading courses...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="courses-container">
      <div className="courses-header">
      
          
        
      </div>
      <div className="courses-header">
        <button className="btn btn-primary" onClick={() => navigate('/admin')}>
            Dashboard
          </button>
        <h1>Computer Science Courses</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setViewMode('form')}>
            Add New Course
          </button>
        )}
      </div>

      {viewMode === 'list' && (
        <CourseList courses={courses} onViewDetails={handleViewDetails} />
      )}

      {viewMode === 'details' && selectedCourse && (
        <CourseDetails
          course={selectedCourse}
          onBack={handleBackToList}
          onUpdateCourse={handleUpdateCourse}
          onDeleteCourse={handleDeleteCourse}
          isAdmin={isAdmin}
        />
      )}

      {viewMode === 'form' && (
        <CourseForm onSubmit={handleCreateCourse} onCancel={handleBackToList} />
      )}
    </div>
  );
};

export default Courses;
