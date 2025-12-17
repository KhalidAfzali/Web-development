import React, { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { 
    FaTachometerAlt, 
    FaUsers, 
    FaBook, 
    FaCalendarAlt, 
    FaBuilding, 
    FaCog, 
    FaSignOutAlt,
    FaBars,
    FaTimes,
    FaChartLine,
    FaExclamationTriangle,
    FaCheckCircle,
    FaChevronRight,
    FaPlus,
    FaBell,
    FaSearch,
    FaUserCircle,
    FaUserClock,
    FaCalendarCheck,
    FaClock
} from "react-icons/fa";
import axios from 'axios';
import './AdminOverView.css';

const AdminOverView = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState({
        totalFaculty: 0,
        totalCourses: 0,
        scheduledClasses: 0,
        availableClassrooms: 0,
        pendingApprovals: 0,
        systemHealth: 0,
        activeUsers: 0,
        recentActivities: [],
        pendingItems: []
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            
            // Fetch all data from backend
            const [usersRes, doctorsRes, coursesRes, schedulesRes, classroomsRes, sectionsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/doctors', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/courses', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/schedules', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/classrooms', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/admin/sections', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => ({ data: { data: [] } })) // Fallback if admin routes not available
            ]);

            // Calculate real statistics from backend data
            const activeUsers = usersRes.data.data?.filter(user => user.isActive).length || 0;
            const totalFaculty = doctorsRes.data.data?.length || 0;
            const totalCourses = coursesRes.data.data?.length || 0;
            const scheduledClasses = schedulesRes.data.data?.length || 0;
            const availableClassrooms = classroomsRes.data.data?.filter(room => room.isAvailable).length || 0;
            const totalClassrooms = classroomsRes.data.data?.length || 0;
            
            // Calculate pending approvals (unassigned sections)
            const pendingSections = sectionsRes.data.data?.filter(section => 
                !section.assignedDoctor || section.assignedTAs?.length === 0
            ) || [];
            const pendingApprovals = pendingSections.length;

            // Calculate system health based on data completeness
            const totalSections = sectionsRes.data.data?.length || 0;
            const assignedSections = sectionsRes.data.data?.filter(section => 
                section.assignedDoctor
            ).length || 0;
            
            const systemHealth = totalSections > 0 
                ? Math.round((assignedSections / totalSections) * 100)
                : 100;

            // Generate recent activities from actual data
            const recentActivities = generateRecentActivities(
                usersRes.data.data || [],
                coursesRes.data.data || [],
                schedulesRes.data.data || []
            );

            // Generate pending items from actual data
            const pendingItems = generatePendingItems(
                pendingSections,
                doctorsRes.data.data || [],
                classroomsRes.data.data || []
            );

            setDashboardStats({
                totalFaculty,
                totalCourses,
                scheduledClasses,
                availableClassrooms,
                pendingApprovals,
                systemHealth,
                activeUsers,
                recentActivities,
                pendingItems,
                totalClassrooms
            });
            
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // Fallback to basic data if API fails
            setDashboardStats(prev => ({
                ...prev,
                systemHealth: 0,
                loading: false
            }));
        } finally {
            setLoading(false);
        }
    };

    const generateRecentActivities = (users, courses, schedules) => {
        const activities = [];
        
        // Get recent users (created in last 7 days)
        const recentUsers = users
            .filter(user => {
                const createdDate = new Date(user.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return createdDate > weekAgo;
            })
            .slice(0, 2);

        recentUsers.forEach(user => {
            activities.push({
                id: `user_${user._id}`,
                action: `New ${user.role === 'doctor' ? 'Professor' : 'User'} registered`,
                user: `${user.profile?.firstName} ${user.profile?.lastName}`,
                time: formatTimeAgo(new Date(user.createdAt)),
                type: "success"
            });
        });

        // Get recent courses
        const recentCourses = courses.slice(0, 2);
        recentCourses.forEach(course => {
            activities.push({
                id: `course_${course._id}`,
                action: `New course created: ${course.courseCode}`,
                user: "System",
                time: formatTimeAgo(new Date(course.createdAt)),
                type: "info"
            });
        });

        // Get recent schedules
        if (schedules.length > 0) {
            const recentSchedule = schedules[0];
            activities.push({
                id: `schedule_${recentSchedule._id}`,
                action: `Schedule generated for ${recentSchedule.semester?.name || 'semester'}`,
                user: "System",
                time: formatTimeAgo(new Date(recentSchedule.createdAt)),
                type: "success"
            });
        }

        return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 4);
    };

    const generatePendingItems = (pendingSections, doctors, classrooms) => {
        const items = [];
        
        // Unassigned sections
        const unassignedSections = pendingSections.filter(s => !s.assignedDoctor);
        if (unassignedSections.length > 0) {
            items.push({
                id: "unassigned_sections",
                title: "Unassigned Course Sections",
                count: unassignedSections.length,
                priority: "high",
                type: "faculty"
            });
        }

        // Available classrooms with low availability
        const lowAvailabilityClassrooms = classrooms.filter(room => {
            const availabilityPercentage = room.isAvailable ? 100 : 0;
            return availabilityPercentage < 50;
        });
        
        if (lowAvailabilityClassrooms.length > 0) {
            items.push({
                id: "low_availability",
                title: "Low Classroom Availability",
                count: lowAvailabilityClassrooms.length,
                priority: "medium",
                type: "classroom"
            });
        }

        // Doctors with high load (if we have maxCourses data)
        const highLoadDoctors = doctors.filter(doctor => {
            const currentLoad = doctor.assignedCourses?.length || 0;
            const maxLoad = doctor.maxCourses || 3;
            return currentLoad >= maxLoad;
        });
        
        if (highLoadDoctors.length > 0) {
            items.push({
                id: "high_load",
                title: "Professors at Max Load",
                count: highLoadDoctors.length,
                priority: "medium",
                type: "load"
            });
        }

        return items.slice(0, 3);
    };

    const formatTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${diffDays} days ago`;
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMobileMenu = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileOpen(false);
    };

    const toggleNotifications = () => {
        setNotificationsOpen(!notificationsOpen);
    };

    const quickStats = [
        {
            title: "Total Faculty",
            value: dashboardStats.totalFaculty,
            icon: <FaUsers />,
            color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            description: "Active professors",
            endpoint: "/admin/faculty"
        },
        {
            title: "Total Courses",
            value: dashboardStats.totalCourses,
            icon: <FaBook />,
            color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            description: "Active courses",
            endpoint: "/admin/courses"
        },
        {
            title: "Scheduled Classes",
            value: dashboardStats.scheduledClasses,
            icon: <FaCalendarCheck />,
            color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            description: "This semester",
            endpoint: "/admin/schedule"
        },
        {
            title: "Classroom Availability",
            value: `${dashboardStats.totalClassrooms > 0 
                ? Math.round((dashboardStats.availableClassrooms / dashboardStats.totalClassrooms) * 100) 
                : 0}%`,
            icon: <FaBuilding />,
            color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            description: `${dashboardStats.availableClassrooms}/${dashboardStats.totalClassrooms} available`,
            endpoint: "/admin/classrooms"
        }
    ];

    const getHealthMetrics = () => {
        const metrics = [];
        
        if (dashboardStats.systemHealth >= 80) {
            metrics.push({
                icon: <FaCheckCircle />,
                text: "System operational",
                type: "success"
            });
        } else if (dashboardStats.systemHealth >= 50) {
            metrics.push({
                icon: <FaExclamationTriangle />,
                text: "System requires attention",
                type: "warning"
            });
        } else {
            metrics.push({
                icon: <FaExclamationTriangle />,
                text: "System needs immediate action",
                type: "error"
            });
        }

        if (dashboardStats.pendingApprovals > 0) {
            metrics.push({
                icon: <FaUserClock />,
                text: `${dashboardStats.pendingApprovals} pending approvals`,
                type: "warning"
            });
        }

        metrics.push({
            icon: <FaUsers />,
            text: `${dashboardStats.activeUsers} active users`,
            type: "info"
        });

        return metrics;
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading dashboard data...</p>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            {/* Mobile Menu Button */}
            <button 
                className="hamburger-menu" 
                onClick={toggleMobileMenu}
                aria-label="Toggle menu"
            >
                {isMobileOpen ? <FaTimes /> : <FaBars />}
            </button>

            {/* Overlay */}
            <div 
                className={`overlay ${isMobileOpen ? 'active' : ''}`}
                onClick={closeMobileMenu}
            />

            {/* Sidebar */}
            <div className={`admin-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">CS</div>
                        <div className="logo-text">
                            <span className="logo-main">CS Scheduling</span>
                            <span className="logo-sub">Admin Panel</span>
                        </div>
                    </div>
                </div>
                
                <div className="sidebar-nav">
                    <NavLink to="/admin/dashboard" className="nav-link" onClick={closeMobileMenu}>
                        <div className="nav-icon-wrapper">
                            <FaTachometerAlt className="nav-icon" />
                        </div>
                        <span>Dashboard</span>
                        <FaChevronRight className="nav-chevron" />
                    </NavLink>
                    
                    <NavLink to="/admin/faculty" className="nav-link" onClick={closeMobileMenu}>
                        <div className="nav-icon-wrapper">
                            <FaUsers className="nav-icon" />
                        </div>
                        <span>Faculty Management</span>
                        <FaChevronRight className="nav-chevron" />
                    </NavLink>
                    
                    <NavLink to="/admin/courses" className="nav-link" onClick={closeMobileMenu}>
                        <div className="nav-icon-wrapper">
                            <FaBook className="nav-icon" />
                        </div>
                        <span>Course Catalog</span>
                        <FaChevronRight className="nav-chevron" />
                    </NavLink>
                    
                    <NavLink to="/admin/schedule" className="nav-link" onClick={closeMobileMenu}>
                        <div className="nav-icon-wrapper">
                            <FaCalendarAlt className="nav-icon" />
                        </div>
                        <span>Schedule Manager</span>
                        <FaChevronRight className="nav-chevron" />
                    </NavLink>
                    
                    <NavLink to="/admin/classrooms" className="nav-link" onClick={closeMobileMenu}>
                        <div className="nav-icon-wrapper">
                            <FaBuilding className="nav-icon" />
                        </div>
                        <span>Classrooms</span>
                        <FaChevronRight className="nav-chevron" />
                    </NavLink>
                   
                    
                    <NavLink to="/admin/settings" className="nav-link" onClick={closeMobileMenu}>
                        <div className="nav-icon-wrapper">
                            <FaCog className="nav-icon" />
                        </div>
                        <span>System Settings</span>
                        <FaChevronRight className="nav-chevron" />
                    </NavLink>
                </div>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <FaUserCircle className="user-avatar" />
                        <div className="user-details">
                            <span className="user-name">{user?.profile?.firstName || user?.username || "Admin User"}</span>
                            <span className="user-role">System Administrator</span>
                            <span className="user-department">Computer Science</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn">
                        <FaSignOutAlt className="logout-icon" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {/* Top Navigation Bar */}
                <header className="top-nav">
                    <div className="nav-left">
                        <h1 className="page-title">Dashboard Overview</h1>
                        <p className="page-subtitle">Real-time system metrics and analytics</p>
                    </div>
                    <div className="nav-right">
                        <div className="search-bar">
                            <FaSearch className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search faculty, courses, schedules..." 
                                className="search-input"
                            />
                        </div>
                        <div className="nav-actions">
                            <button 
                                className={`notification-btn ${notificationsOpen ? 'active' : ''}`}
                                onClick={toggleNotifications}
                            >
                                <FaBell />
                                {dashboardStats.pendingApprovals > 0 && (
                                    <span className="notification-badge">{dashboardStats.pendingApprovals}</span>
                                )}
                            </button>
                            <div className="user-menu">
                                <FaUserCircle className="user-avatar-sm" />
                                <span className="user-name-sm">
                                    {user?.profile?.firstName || "Admin"}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Dashboard Content */}
                <div className="admin-dashboard">
                    {/* Welcome Section */}
                    <div className="welcome-section">
                        <div className="welcome-content">
                            <h2>Welcome back, {user?.profile?.firstName || "Admin"}!</h2>
                            <p>Real-time overview of your Computer Science Department scheduling system.</p>
                            <div className="welcome-stats">
                                <div className="welcome-stat">
                                    <FaClock />
                                    <span>Last updated: Just now</span>
                                </div>
                                <div className="welcome-stat">
                                    <FaUserCircle />
                                    <span>Role: System Administrator</span>
                                </div>
                            </div>
                        </div>
                        <div className="welcome-actions">
                            <button 
                                className="quick-action-btn primary"
                                onClick={() => navigate('/admin/schedule?action=generate')}
                            >
                                <FaPlus />
                                <span>Generate Schedule</span>
                            </button>
                            <button 
                                className="quick-action-btn secondary"
                                onClick={() => fetchDashboardData()}
                            >
                                <FaChartLine />
                                <span>Refresh Data</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid">
                        {quickStats.map((stat, index) => (
                            <div 
                                key={index} 
                                className="stat-card"
                                onClick={() => stat.endpoint && navigate(stat.endpoint)}
                                style={{ cursor: stat.endpoint ? 'pointer' : 'default' }}
                            >
                                <div className="stat-background" style={{ background: stat.color }}></div>
                                <div className="stat-content">
                                    <div className="stat-icon-wrapper" style={{ background: stat.color }}>
                                        {stat.icon}
                                    </div>
                                    <div className="stat-text">
                                        <h3>{stat.value}</h3>
                                        <p>{stat.title}</p>
                                        <span className="stat-description">{stat.description}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dashboard Content Grid */}
                    <div className="dashboard-grid">
                        {/* Left Column */}
                        <div className="grid-column">
                            {/* System Health */}
                            <div className="dashboard-widget health-widget">
                                <div className="widget-header">
                                    <h3>System Health</h3>
                                    <FaChartLine className="widget-icon" />
                                </div>
                                <div className="health-content">
                                    <div className="health-score">
                                        <div className="score-circle">
                                            <div className="score-value">{dashboardStats.systemHealth}%</div>
                                            <div className="score-label">Health Score</div>
                                        </div>
                                    </div>
                                    <div className="health-metrics">
                                        {getHealthMetrics().map((metric, index) => (
                                            <div key={index} className={`metric-item ${metric.type}`}>
                                                {metric.icon}
                                                <span>{metric.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="dashboard-widget activity-widget">
                                <div className="widget-header">
                                    <h3>Recent Activity</h3>
                                    <button className="view-all-btn" onClick={() => navigate('/admin/activity')}>
                                        View All
                                    </button>
                                </div>
                                <div className="activity-list">
                                    {dashboardStats.recentActivities.length > 0 ? (
                                        dashboardStats.recentActivities.map(activity => (
                                            <div key={activity.id} className={`activity-item ${activity.type}`}>
                                                <div className="activity-content">
                                                    <p className="activity-action">{activity.action}</p>
                                                    <span className="activity-meta">{activity.user} • {activity.time}</span>
                                                </div>
                                                <div className={`activity-badge ${activity.type}`}></div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-activity">
                                            <FaClock />
                                            <p>No recent activity</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="grid-column">
                            {/* Quick Actions */}
                            <div className="dashboard-widget actions-widget">
                                <div className="widget-header">
                                    <h3>Quick Actions</h3>
                                </div>
                                <div className="actions-grid">
                                    <button 
                                        className="action-card" 
                                        onClick={() => navigate('/admin/faculty/add')}
                                    >
                                        <FaUsers className="action-icon" />
                                        <span>Add New Professor</span>
                                        <FaChevronRight className="action-arrow" />
                                    </button>
                                    <button 
                                        className="action-card" 
                                        onClick={() => navigate('/admin/courses?action=create')}
                                    >
                                        <FaBook className="action-icon" />
                                        <span>Create New Course</span>
                                        <FaChevronRight className="action-arrow" />
                                    </button>
                                    <button 
                                        className="action-card" 
                                        onClick={() => navigate('/admin/schedule?action=generate')}
                                    >
                                        <FaCalendarAlt className="action-icon" />
                                        <span>Generate Schedule</span>
                                        <FaChevronRight className="action-arrow" />
                                    </button>
                                    <button 
                                        className="action-card" 
                                        onClick={() => navigate('/admin/classrooms?action=add')}
                                    >
                                        <FaBuilding className="action-icon" />
                                        <span>Add Classroom</span>
                                        <FaChevronRight className="action-arrow" />
                                    </button>
                                </div>
                            </div>

                            {/* Pending Approvals */}
                            <div className="dashboard-widget approvals-widget">
                                <div className="widget-header">
                                    <h3>Pending Actions</h3>
                                    {dashboardStats.pendingApprovals > 0 && (
                                        <span className="pending-count">{dashboardStats.pendingApprovals}</span>
                                    )}
                                </div>
                                <div className="approvals-list">
                                    {dashboardStats.pendingItems.length > 0 ? (
                                        dashboardStats.pendingItems.map(item => (
                                            <div key={item.id} className={`approval-item ${item.priority}`}>
                                                <div className="approval-info">
                                                    <p className="approval-title">{item.title}</p>
                                                    <span className="approval-count">{item.count} items</span>
                                                </div>
                                                <button 
                                                    className="review-btn"
                                                    onClick={() => {
                                                        if (item.type === 'faculty') {
                                                            navigate('/admin/faculty?filter=unassigned');
                                                        } else if (item.type === 'classroom') {
                                                            navigate('/admin/classrooms?filter=low-availability');
                                                        } else {
                                                            navigate('/admin/faculty?filter=high-load');
                                                        }
                                                    }}
                                                >
                                                    Review
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-pending">
                                            <FaCheckCircle />
                                            <p>All tasks are completed</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverView;