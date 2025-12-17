import React, { useEffect, useMemo, useState } from "react";
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
  FaClock,
} from "react-icons/fa";
import axios from "axios";
import { message } from "antd";
import "./AdminOverView.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

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
    totalClassrooms: 0,
    pendingApprovals: 0,
    systemHealth: 0,
    activeUsers: 0,
    recentActivities: [],
    pendingItems: [],
  });

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, []);

  // Guard: must be logged in + admin
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (!user) return; // wait for auth context to hydrate
    if (user.role !== "admin") {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line
  }, []);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    navigate("/login", { replace: true });
  };

  const toggleMobileMenu = () => setIsMobileOpen((v) => !v);
  const closeMobileMenu = () => setIsMobileOpen(false);
  const toggleNotifications = () => setNotificationsOpen((v) => !v);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const generateRecentActivities = (users, courses, schedules) => {
    const activities = [];

    const addActivity = (item) => {
      activities.push(item);
    };

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentUsers = (users || [])
      .filter((u) => new Date(u.createdAt || Date.now()) > weekAgo)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 2);

    recentUsers.forEach((u) => {
      const created = new Date(u.createdAt || Date.now());
      addActivity({
        id: `user_${u._id}`,
        action: `New ${u.role === "doctor" ? "Professor" : "User"} registered`,
        user: `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim() || u.username || "User",
        time: formatTimeAgo(created),
        ts: created.getTime(),
        type: "success",
      });
    });

    const recentCourses = (courses || [])
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 2);

    recentCourses.forEach((c) => {
      const created = new Date(c.createdAt || Date.now());
      addActivity({
        id: `course_${c._id}`,
        action: `New course created: ${c.courseCode || "Course"}`,
        user: "System",
        time: formatTimeAgo(created),
        ts: created.getTime(),
        type: "info",
      });
    });

    if ((schedules || []).length > 0) {
      const s = schedules
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

      const created = new Date(s.createdAt || Date.now());
      addActivity({
        id: `schedule_${s._id}`,
        action: `Schedule updated`,
        user: "System",
        time: formatTimeAgo(created),
        ts: created.getTime(),
        type: "success",
      });
    }

    return activities.sort((a, b) => b.ts - a.ts).slice(0, 4);
  };

  const generatePendingItems = (pendingSections, doctors, classrooms) => {
    const items = [];

    const unassignedSections = (pendingSections || []).filter((s) => !s.assignedDoctor);
    if (unassignedSections.length > 0) {
      items.push({
        id: "unassigned_sections",
        title: "Unassigned Course Sections",
        count: unassignedSections.length,
        priority: "high",
        type: "faculty",
      });
    }

    const lowAvailabilityClassrooms = (classrooms || []).filter((room) => room.isAvailable === false);
    if (lowAvailabilityClassrooms.length > 0) {
      items.push({
        id: "low_availability",
        title: "Unavailable Classrooms",
        count: lowAvailabilityClassrooms.length,
        priority: "medium",
        type: "classroom",
      });
    }

    const highLoadDoctors = (doctors || []).filter((doc) => {
      const currentLoad = doc.assignedCourses?.length || 0;
      const maxLoad = doc.maxCourses || 3;
      return currentLoad >= maxLoad;
    });

    if (highLoadDoctors.length > 0) {
      items.push({
        id: "high_load",
        title: "Professors at Max Load",
        count: highLoadDoctors.length,
        priority: "medium",
        type: "load",
      });
    }

    return items.slice(0, 3);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      // IMPORTANT FIX:
      // sections route is /api/sections (not /api/admin/sections)
      const [usersRes, doctorsRes, coursesRes, schedulesRes, classroomsRes, sectionsRes] =
        await Promise.all([
          api.get("/api/users"),
          api.get("/api/doctors"),
          api.get("/api/courses"),
          api.get("/api/schedules"),
          api.get("/api/classrooms"),
          api.get("/api/sections").catch(() => ({ data: { data: [] } })),
        ]);

      const users = usersRes.data?.data || [];
      const doctors = doctorsRes.data?.data || [];
      const courses = coursesRes.data?.data || [];
      const schedules = schedulesRes.data?.data || [];
      const classrooms = classroomsRes.data?.data || [];
      const sections = sectionsRes.data?.data || [];

      const activeUsers = users.filter((u) => u.isActive).length;
      const totalFaculty = doctors.length;
      const totalCourses = courses.length;
      const scheduledClasses = schedules.length;

      const availableClassrooms = classrooms.filter((r) => r.isAvailable).length;
      const totalClassrooms = classrooms.length;

      const pendingSections = sections.filter(
        (s) => !s.assignedDoctor || (Array.isArray(s.assignedTAs) && s.assignedTAs.length === 0)
      );
      const pendingApprovals = pendingSections.length;

      const totalSections = sections.length;
      const assignedSections = sections.filter((s) => s.assignedDoctor).length;
      const systemHealth = totalSections > 0 ? Math.round((assignedSections / totalSections) * 100) : 100;

      const recentActivities = generateRecentActivities(users, courses, schedules);
      const pendingItems = generatePendingItems(pendingSections, doctors, classrooms);

      setDashboardStats({
        totalFaculty,
        totalCourses,
        scheduledClasses,
        availableClassrooms,
        totalClassrooms,
        pendingApprovals,
        systemHealth,
        activeUsers,
        recentActivities,
        pendingItems,
      });

      setNotificationsOpen(false);
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        message.error("Session expired. Please login again.");
        handleLogout();
        return;
      }

      console.error("Error fetching dashboard data:", error);
      message.error("Failed to load dashboard data");
      setDashboardStats((prev) => ({ ...prev, systemHealth: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    {
      title: "Total Faculty",
      value: dashboardStats.totalFaculty,
      icon: <FaUsers />,
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      description: "Active professors",
      endpoint: "/admin/faculty",
    },
    {
      title: "Total Courses",
      value: dashboardStats.totalCourses,
      icon: <FaBook />,
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      description: "Active courses",
      endpoint: "/admin/courses",
    },
    {
      title: "Scheduled Classes",
      value: dashboardStats.scheduledClasses,
      icon: <FaCalendarCheck />,
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      description: "This semester",
      endpoint: "/admin/schedule",
    },
    {
      title: "Classroom Availability",
      value: `${dashboardStats.totalClassrooms > 0
        ? Math.round((dashboardStats.availableClassrooms / dashboardStats.totalClassrooms) * 100)
        : 0
        }%`,
      icon: <FaBuilding />,
      color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      description: `${dashboardStats.availableClassrooms}/${dashboardStats.totalClassrooms} available`,
      endpoint: "/admin/classrooms",
    },
  ];

  const getHealthMetrics = () => {
    const metrics = [];

    if (dashboardStats.systemHealth >= 80) {
      metrics.push({ icon: <FaCheckCircle />, text: "System operational", type: "success" });
    } else if (dashboardStats.systemHealth >= 50) {
      metrics.push({ icon: <FaExclamationTriangle />, text: "System requires attention", type: "warning" });
    } else {
      metrics.push({ icon: <FaExclamationTriangle />, text: "System needs immediate action", type: "error" });
    }

    if (dashboardStats.pendingApprovals > 0) {
      metrics.push({
        icon: <FaUserClock />,
        text: `${dashboardStats.pendingApprovals} pending actions`,
        type: "warning",
      });
    }

    metrics.push({ icon: <FaUsers />, text: `${dashboardStats.activeUsers} active users`, type: "info" });

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
      <button className="hamburger-menu" onClick={toggleMobileMenu} aria-label="Toggle menu">
        {isMobileOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Overlay */}
      <div className={`overlay ${isMobileOpen ? "active" : ""}`} onClick={closeMobileMenu} />

      {/* Sidebar */}
      <div className={`admin-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
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
          <NavLink to="/admin/messages" className="nav-link" onClick={closeMobileMenu}>
            <div className="nav-icon-wrapper">
              <FaBuilding className="nav-icon" />
            </div>
            <span>Message</span>
            <FaChevronRight className="nav-chevron" />
          </NavLink>
          <NavLink to="/admin/head" className="nav-link" onClick={closeMobileMenu}>
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
              <span className="user-name">
                {user?.profile?.firstName || user?.username || "Admin User"}
              </span>
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
              <div style={{ position: "relative" }}>
                <button
                  className={`notification-btn ${notificationsOpen ? "active" : ""}`}
                  onClick={toggleNotifications}
                  aria-label="Notifications"
                >
                  <FaBell />
                  {dashboardStats.pendingApprovals > 0 && (
                    <span className="notification-badge">{dashboardStats.pendingApprovals}</span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 42,
                      width: 320,
                      background: "#fff",
                      borderRadius: 12,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                      padding: 12,
                      zIndex: 50,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>Pending</b>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        style={{ border: "none", background: "transparent", cursor: "pointer" }}
                        aria-label="Close"
                      >
                        <FaTimes />
                      </button>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      {dashboardStats.pendingItems.length > 0 ? (
                        dashboardStats.pendingItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 8px",
                              borderRadius: 10,
                              background: "#f7f7fb",
                              marginBottom: 8,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                              <div style={{ fontSize: 12, color: "#666" }}>{item.count} items</div>
                            </div>
                            <button
                              className="view-all-btn"
                              onClick={() => {
                                setNotificationsOpen(false);
                                if (item.type === "faculty") navigate("/admin/faculty?filter=unassigned");
                                else if (item.type === "classroom") navigate("/admin/classrooms?filter=unavailable");
                                else navigate("/admin/faculty?filter=high-load");
                              }}
                            >
                              Review
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: 14, color: "#666", display: "flex", gap: 8, alignItems: "center" }}>
                          <FaCheckCircle /> All clear
                        </div>
                      )}
                    </div>

                    <button
                      className="quick-action-btn secondary"
                      style={{ width: "100%" }}
                      onClick={() => fetchDashboardData()}
                    >
                      <FaChartLine />
                      <span>Refresh</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="user-menu">
                <FaUserCircle className="user-avatar-sm" />
                <span className="user-name-sm">{user?.profile?.firstName || "Admin"}</span>
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
                onClick={() => navigate("/admin/schedule?action=generate")}
              >
                <FaPlus />
                <span>Generate Schedule</span>
              </button>
              <button className="quick-action-btn secondary" onClick={() => fetchDashboardData()}>
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
                style={{ cursor: stat.endpoint ? "pointer" : "default" }}
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
                  <button className="view-all-btn" onClick={() => navigate("/admin/activity")}>
                    View All
                  </button>
                </div>

                <div className="activity-list">
                  {dashboardStats.recentActivities.length > 0 ? (
                    dashboardStats.recentActivities.map((activity) => (
                      <div key={activity.id} className={`activity-item ${activity.type}`}>
                        <div className="activity-content">
                          <p className="activity-action">{activity.action}</p>
                          <span className="activity-meta">
                            {activity.user} • {activity.time}
                          </span>
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
                  <button className="action-card" onClick={() => navigate("/admin/faculty/add")}>
                    <FaUsers className="action-icon" />
                    <span>Add New Professor</span>
                    <FaChevronRight className="action-arrow" />
                  </button>

                  <button className="action-card" onClick={() => navigate("/admin/courses?action=create")}>
                    <FaBook className="action-icon" />
                    <span>Create New Course</span>
                    <FaChevronRight className="action-arrow" />
                  </button>

                  <button className="action-card" onClick={() => navigate("/admin/schedule?action=generate")}>
                    <FaCalendarAlt className="action-icon" />
                    <span>Generate Schedule</span>
                    <FaChevronRight className="action-arrow" />
                  </button>

                  <button className="action-card" onClick={() => navigate("/admin/classrooms?action=add")}>
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
                    dashboardStats.pendingItems.map((item) => (
                      <div key={item.id} className={`approval-item ${item.priority}`}>
                        <div className="approval-info">
                          <p className="approval-title">{item.title}</p>
                          <span className="approval-count">{item.count} items</span>
                        </div>
                        <button
                          className="review-btn"
                          onClick={() => {
                            if (item.type === "faculty") navigate("/admin/faculty?filter=unassigned");
                            else if (item.type === "classroom") navigate("/admin/classrooms?filter=unavailable");
                            else navigate("/admin/faculty?filter=high-load");
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
          {/* end grid */}
        </div>
      </div>
    </div>
  );
};

export default AdminOverView;
