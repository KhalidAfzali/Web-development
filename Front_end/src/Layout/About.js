import React from "react";
import "./About.css";

export default function About() {
  return (
    <div className="about-page">
      <div className="about-container">
        <h1>About CS Scheduling System</h1>

        <p className="about-intro">
          CS Scheduling System is designed to manage academic scheduling
          efficiently for a Computer Science department.
        </p>

        <section className="about-section">
          <h2>Purpose</h2>
          <p>
            The system helps administrators organize courses, classrooms,
            professors, sections, and time slots while reducing manual errors.
          </p>
        </section>

        <section className="about-section">
          <h2>Who Uses It</h2>
          <ul>
            <li>Department Administrators</li>
            <li>Professors and Instructors</li>
            <li>Teaching Assistants</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Key Benefits</h2>
          <ul>
            <li>Centralized academic data</li>
            <li>Automatic and manual scheduling</li>
            <li>Conflict detection and validation</li>
            <li>Clear schedules for faculty</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Technology</h2>
          <p>
            Built using modern web technologies including React, Node.js,
            Express, and MongoDB to ensure scalability and reliability.
          </p>
        </section>
      </div>
    </div>
  );
}
