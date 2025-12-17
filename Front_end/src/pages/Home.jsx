import React from "react";
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();

    const handleGetStarted = () => {
        navigate('/login');
    };

    const handleLearnMore = () => {
        // Scroll to features section or navigate to about page
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="home-page">
            {/* Navigation Header */}
            <header className="home-header">
                <div className="header-container">
                    <div className="logo">
                        <div className="logo-icon">
                            <i className="bi bi-cpu-fill"></i>
                        </div>
                        <div className="logo-text">
                            <span className="logo-main">CS Scheduling</span>
                            <span className="logo-sub">University System</span>
                        </div>
                    </div>
                    <nav className="nav-links">
                        <a href="#features">Features</a>
                        <a href="#about">About</a>
                        <a href="#contact">Contact</a>
                        <button className="login-btn" onClick={() => navigate('/login')}>
                            Sign In
                        </button>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-container">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <span>University Management Platform</span>
                        </div>
                        <h1 className="hero-title">
                            Streamline Your Computer Science 
                            <span className="gradient-text"> Department Operations</span>
                        </h1>
                        <p className="hero-description">
                            A comprehensive scheduling and management system designed for modern computer science departments. 
                            Manage faculty, courses, classrooms, and schedules with unparalleled efficiency.
                        </p>
                        <div className="hero-stats">
                            <div className="stat">
                                <div className="stat-number">500+</div>
                                <div className="stat-label">Faculty Members</div>
                            </div>
                            <div className="stat">
                                <div className="stat-number">200+</div>
                                <div className="stat-label">Courses Managed</div>
                            </div>
                            <div className="stat">
                                <div className="stat-number">99.9%</div>
                                <div className="stat-label">Uptime</div>
                            </div>
                        </div>
                        <div className="hero-actions">
                            <button className="btn btn-primary" onClick={handleGetStarted}>
                                <i className="bi bi-rocket"></i>
                                Get Started
                            </button>
                            <button className="btn btn-secondary" onClick={handleLearnMore}>
                                <i className="bi bi-play-circle"></i>
                                Watch Demo
                            </button>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="dashboard-preview">
                            <div className="preview-header">
                                <div className="preview-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                            <div className="preview-content">
                                <div className="preview-card"></div>
                                <div className="preview-card"></div>
                                <div className="preview-card"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Powerful Features</h2>
                        <p>Everything you need to manage your department efficiently</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="bi bi-people"></i>
                            </div>
                            <h3>Faculty Management</h3>
                            <p>Comprehensive faculty profiles with specialization tracking and availability management.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="bi bi-journal-bookmark"></i>
                            </div>
                            <h3>Course Scheduling</h3>
                            <p>Intelligent course scheduling with conflict detection and optimization algorithms.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="bi bi-building"></i>
                            </div>
                            <h3>Classroom Allocation</h3>
                            <p>Smart classroom assignment based on capacity, facilities, and proximity.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-content">
                        <h2>Ready to Transform Your Department?</h2>
                        <p>Join hundreds of universities using our platform to streamline their operations.</p>
                        <button className="btn btn-primary" onClick={handleGetStarted}>
                            Start Free Trial
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="home-footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-logo">
                            <i className="bi bi-cpu-fill"></i>
                            <span>CS Scheduling</span>
                        </div>
                        <p>&copy; 2024 CS Scheduling System. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;