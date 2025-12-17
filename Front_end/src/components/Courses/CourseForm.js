// src/components/courses/CourseForm.js
import React, { useState } from 'react';

const CourseForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    description: '',
    credits: 3,
    level: 'Undergraduate',
    maxStudents: '',
    learningOutcomes: [''],
    syllabus: '',
    isActive: true
  });

  const [errors, setErrors] = useState({});
 
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };



  const validateForm = () => {
    const newErrors = {};

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Filter out empty learning outcomes
      const submitData = {
        ...formData,
        department: 'Computer Science', // Always CS department
        learningOutcomes: formData.learningOutcomes.filter(outcome => outcome.trim() !== ''),
        maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : undefined
      };
      
      onSubmit(submitData);
    }
  };

  return (
    <div className="course-form-container">
      <h2>Create New Course</h2>
      
      <form onSubmit={handleSubmit} className="course-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="courseCode">Course Code *</label>
            <input
              type="text"
              id="courseCode"
              name="courseCode"
              value={formData.courseCode}
              onChange={handleChange}
              placeholder="e.g., CS101" 
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="credits">Credits *</label>
            <input
              type="number"
              id="credits"
              name="credits"
              value={formData.credits}
              onChange={handleChange}
              min="1"
              max="6"
              
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="courseName">Course Name *</label>
          <input
            type="text"
            id="courseName"
            name="courseName"
            value={formData.courseName}
            onChange={handleChange}
            placeholder="e.g., Introduction to Computer Science" 
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            placeholder="Course description..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="level">Level *</label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
            >
              <option value="Undergraduate">Undergraduate</option>
              <option value="Graduate">Graduate</option>
              <option value="PhD">PhD</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="maxStudents">Maximum Students</label>
            <input
              type="number"
              id="maxStudents"
              name="maxStudents"
              value={formData.maxStudents}
              onChange={handleChange}
              min="7"
              max="50"
              placeholder="Optional"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="syllabus">Syllabus</label>
          <textarea
            id="syllabus"
            name="syllabus"
            value={formData.syllabus}
            onChange={handleChange}
            rows="4"
            placeholder="Course syllabus details..."
          />
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
            />
            Active Course
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Create Course
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;