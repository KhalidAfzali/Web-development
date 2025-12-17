// src/components/courses/CourseList.js
import React from 'react';

const CourseList = ({ courses, onViewDetails }) => {
  if (courses.length === 0) {
    return (
      <div className="no-courses">
        <p>No courses found. Create the first course!</p>
      </div>
    );
  }

  return (
    <div className="course-list">
      <div className="course-grid">
        {courses.map((course) => (
          <div key={course._id} className="course-card">
            <div className="course-header">
              <h3 className="course-code">{course.courseCode}</h3>
              <span className={`status-badge ${course.isActive ? 'active' : 'inactive'}`}>
                {course.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <h4 className="course-name">{course.courseName}</h4>

            <div className="course-info">
              <div className="info-item">
                <span className="label">Credits:</span>
                <span className="value">{course.credits}</span>
              </div>
              <div className="info-item">
                <span className="label">Level:</span>
                <span className="value">{course.level}</span>
              </div>
              <div className="info-item">
                <span className="label">Enrollment:</span>
                <span className="value">
                  {course.currentEnrollment} / {course.maxStudents || 'N/A'}
                </span>
              </div>
            </div>

            {course.description && (
              <p className="course-description">
                {course.description.length > 100
                  ? `${course.description.substring(0, 100)}...`
                  : course.description
                }
              </p>
            )}

            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => onViewDetails(course)}
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseList;