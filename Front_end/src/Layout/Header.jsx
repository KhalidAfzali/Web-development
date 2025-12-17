import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';

function Header() {
    const location = useLocation();
    const navigate = useNavigate();

    const isActiveLink = (path) => {
        return location.pathname === path ? 'nav-link active' : 'nav-link';
    };

    const handleLogin = () => {
        navigate('/login');
    };

    return (
        <header className="main-header">
            <div className="header-container1">
                <div className="header-content">
                    {/* Logo Section */}
                    <div className="logo-section">
                        <Link to="/home" className="logo">
                            <div className="logo-icon">
                                <i className="bi bi-cpu-fill"></i>
                            </div>
                            <div className="logo-text">
                                <span className="logo-primary">CS Scheduling</span>
                                <span className="logo-secondary">University System</span>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Section */}
                    <nav className="navigation-section">
                        <div className="nav-links">
                            <Link to="/home" className={isActiveLink('/home')}>
                                <i className="bi bi-house"></i>
                                Home
                            </Link>
                            <a href="#features" className="nav-link">
                                <i className="bi bi-stars"></i>
                                Features
                            </a>
                            <Link to="/about" className={isActiveLink("/about")}>
                                <i className="bi bi-info-circle"></i>
                                About
                            </Link>

                            <a href="#contact" className="nav-link">
                                <i className="bi bi-telephone"></i>
                                Contact
                            </a>
                        </div>
                    </nav>

                    {/* User Section */}
                    <div className="user-section">
                        <button className="login-button" onClick={handleLogin}>
                            <i className="bi bi-box-arrow-in-right"></i>
                            <span>Sign In</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;