import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import {
  FaTachometerAlt,
  FaBook,
  FaCalendarAlt,
  FaUsers,
  FaBell,
  FaSearch,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChevronRight,
  FaClock,
  FaGraduationCap,
  FaBuilding,
  FaExclamationTriangle,
  FaCheckCircle,
  FaIdBadge,
  FaKey,
  FaPaperPlane,
  FaFileUpload,
} from "react-icons/fa";
import "./ProfessorDashboard.css";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const ProfessorDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [professorData, setProfessorData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotifs, setLatestNotifs] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Head-only messaging
  const isHead = String(user?.role || "").toLowerCase() === "head";
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [allDoctors, setAllDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [headTitle, setHeadTitle] = useState("");
  const [headMessage, setHeadMessage] = useState("");
  const [headFile, setHeadFile] = useState(null);
  const [sendingHeadMsg, setSendingHeadMsg] = useState(false);

  const firstName = user?.profile?.firstName;
  const lastName = user?.profile?.lastName;
  const fullName = `${firstName || ""} ${lastName || ""}`.trim() || user?.username || "User";

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, []);

  useEffect(() => {
    fetchProfessorData();
    // eslint-disable-next-line
  }, []);

  // Poll unread count
  useEffect(() => {
    let t;
    const loadUnread = async () => {
      try {
        const res = await api.get("/api/doctor/messages/unread-count");
        setUnreadCount(res.data?.data?.unreadCount || 0);
      } catch {
        // ignore
      }
    };
    loadUnread();
    t = setInterval(loadUnread, 20000);
    return () => clearInterval(t);
  }, [api]);

  // Head: load doctors list
  useEffect(() => {
    if (!isHead) return;

    const loadDoctors = async () => {
      try {
        setDoctorsLoading(true);
        const res = await api.get("/api/admin/messages/doctors");
        setAllDoctors(res.data?.data || []);
      } catch (e) {
        console.error("Failed to load doctors", e);
        setAllDoctors([]);
      } finally {
        setDoctorsLoading(false);
      }
    };

    loadDoctors();
  }, [api, isHead]);

  const fetchProfessorData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token || !user?._id) {
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      const doctorResponse = await axios.get(`${API_BASE}/api/doctors/user/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (doctorResponse.data?.success) {
        const doctor = doctorResponse.data.data;
        setProfessorData(doctor);

        const scheduleResponse = await axios.get(`${API_BASE}/api/schedules/professor/${doctor._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (scheduleResponse.data?.success) {
          const schedules = scheduleResponse.data.data || [];
          setSchedule(schedules);

          const courseMap = new Map();
          const uniqueCourses = [];
          schedules.forEach((s) => {
            if (s.course && !courseMap.has(String(s.course._id))) {
              courseMap.set(String(s.course._id), true);
              uniqueCourses.push(s.course);
            }
          });

          setCourses(uniqueCourses);
          extractUpcomingClasses(schedules);
        }
      }
    } catch (error) {
      console.error("Error fetching professor data:", error);
      setProfessorData({
        office: { building: "CS Building", room: "CS-101" },
        specialization: ["Computer Science"],
      });
      setCourses([]);
      setSchedule([]);
      setUpcomingClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const extractUpcomingClasses = (schedules) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];

    const allClasses = schedules.flatMap((sched) =>
      (sched.scheduleSlots || []).map((slot) => ({
        ...slot,
        courseCode: sched.course?.courseCode,
        courseName: sched.course?.courseName,
        classroom: sched.classroom?.roomNumber,
        building: sched.classroom?.building,
        type: slot.type,
      }))
    );

    setUpcomingClasses(allClasses.filter((cls) => cls.day === today));
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const toggleMobileMenu = () => setIsMobileOpen((v) => !v);
  const closeMobileMenu = () => setIsMobileOpen(false);

  const toggleNotifications = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (!next) return;

    try {
      setLoadingNotifs(true);
      const res = await api.get("/api/doctor/messages");
      const all = res.data?.data || [];
      setLatestNotifs(all.slice(0, 5));
    } catch {
      setLatestNotifs([]);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const openNotification = (id) => {
    setNotifOpen(false);
    navigate(`/professor/notifications?open=${id}`);
  };

  const sendHeadMessage = async () => {
    const body = String(headMessage || "").trim();
    const title = String(headTitle || "").trim() || "Head Announcement";

    if (!body && !headFile) return;

    // if not sendToAll, must select at least 1 doctor
    if (!sendToAll && selectedDoctors.length === 0) return;

    try {
      setSendingHeadMsg(true);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("body", body);

      if (sendToAll) {
        formData.append("sendToAll", "true");
      } else {
        selectedDoctors.forEach((id) => formData.append("receivers[]", id));
      }

      if (headFile) formData.append("file", headFile);

      await api.post("/api/admin/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setHeadTitle("");
      setHeadMessage("");
      setHeadFile(null);
      setSelectedDoctors([]);
      setSendToAll(false);
      alert("Message sent");
    } catch (e) {
      console.error(e);
      alert("Failed to send message");
    } finally {
      setSendingHeadMsg(false);
    }
  };

  const dashboardStats = {
    totalCourses: courses.length,
    totalStudents: courses.reduce((sum, course) => sum + (course.currentEnrollment || 0), 0),
    weeklyHours: schedule.reduce((sum, sched) => sum + (sched.scheduleSlots?.length || 0) * 2, 0),
    pendingTasks: 3,
  };

  const quickStats = [
    {
      title: "Assigned Courses",
      value: dashboardStats.totalCourses,
      icon: <FaBook />,
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      description: "This semester",
    },
    {
      title: "Total Students",
      value: dashboardStats.totalStudents,
      icon: <FaUsers />,
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      description: "Across all courses",
    },
    {
      title: "Weekly Hours",
      value: `${dashboardStats.weeklyHours}h`,
      icon: <FaClock />,
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      description: "Teaching load",
    },
    {
      title: "Pending Tasks",
      value: dashboardStats.pendingTasks,
      icon: <FaExclamationTriangle />,
      color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      description: "Require attention",
    },
  ];

  const recentActivities = [
    { id: 1, action: "Grade submissions uploaded", course: "CS201", time: "2 hours ago", type: "success" },
    { id: 2, action: "Office hours updated", course: "All Courses", time: "1 day ago", type: "info" },
    { id: 3, action: "Course materials added", course: "CS101", time: "2 days ago", type: "success" },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="professor-layout">
      <button className="hamburger-menu" onClick={toggleMobileMenu} aria-label="Toggle menu">
        {isMobileOpen ? <FaTimes /> : <FaBars />}
      </button>

      <div className={`overlay ${isMobileOpen ? "active" : ""}`} onClick={closeMobileMenu} />

      {/* Sidebar */}
      <div className={`professor-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">CS</div>
            <div className="logo-text">
              <span className="logo-main">Faculty Portal</span>
              <span className="logo-sub">{isHead ? "Head Dashboard" : "Professor Dashboard"}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-navp">
          <NavLink to="/professor/dashboard" className="nav-link" onClick={closeMobileMenu}>
            <div className="nav-icon-wrapper">
              <FaTachometerAlt className="nav-icon" />
            </div>
            <span>Dashboard</span>
            <FaChevronRight className="nav-chevron" />
          </NavLink>

          {isHead && (
            <NavLink to="/head/messages" className="nav-link" onClick={closeMobileMenu}>
              <div className="nav-icon-wrapper">
                <FaPaperPlane className="nav-icon" />
              </div>
              <span>Head Messages</span>
              <FaChevronRight className="nav-chevron" />
            </NavLink>
          )}

          <NavLink to="/professor/courses" className="nav-link" onClick={closeMobileMenu}>
            <div className="nav-icon-wrapper">
              <FaBook className="nav-icon" />
            </div>
            <span>My Courses</span>
            <FaChevronRight className="nav-chevron" />
          </NavLink>

          <NavLink to="/professor/schedule" className="nav-link" onClick={closeMobileMenu}>
            <div className="nav-icon-wrapper">
              <FaCalendarAlt className="nav-icon" />
            </div>
            <span>Teaching Schedule</span>
            <FaChevronRight className="nav-chevron" />
          </NavLink>

          <NavLink to="/professor/students" className="nav-link" onClick={closeMobileMenu}>
            <div className="nav-icon-wrapper">
              <FaUsers className="nav-icon" />
            </div>
            <span>Students</span>
            <FaChevronRight className="nav-chevron" />
          </NavLink>

          <NavLink to="/professor/profile" className="nav-link" onClick={closeMobileMenu}>
            <div className="nav-icon-wrapper">
              <FaIdBadge className="nav-icon" />
            </div>
            <span>My Profile</span>
            <FaChevronRight className="nav-chevron" />
          </NavLink>

          <NavLink to="/professor/change-password" className="nav-link" onClick={closeMobileMenu}>
            <div className="nav-icon-wrapper">
              <FaKey className="nav-icon" />
            </div>
            <span>Change Password</span>
            <FaChevronRight className="nav-chevron" />
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <FaUserCircle className="user-avatar" />
            <div className="user-details">
              <span className="user-name">{isHead ? `Head: ${fullName}` : `Dr. ${fullName}`}</span>
              <span className="user-role">{isHead ? "Head of Department" : "Professor"}</span>
              <span className="user-department">{user?.profile?.department || "Computer Science"}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-contentp">
        <header className="top-nav">
          <div className="nav-left">
            <h1 className="page-title">{isHead ? "Head Dashboard" : "Professor Dashboard"}</h1>
            <p className="page-subtitle">Welcome back, {isHead ? "Head" : "Dr."} {lastName || fullName}</p>
          </div>

          <div className="nav-right">
            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input type="text" placeholder="Search courses, students..." className="search-input" />
            </div>

            <div className="nav-actions">
              {/* Notifications dropdown */}
              <div style={{ position: "relative" }}>
                <button className="notification-btn" onClick={toggleNotifications} aria-label="Notifications">
                  <FaBell />
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </button>

                {notifOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 44,
                      width: 340,
                      background: "#fff",
                      borderRadius: 12,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                      padding: 12,
                      zIndex: 50,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>Notifications</b>
                      <button
                        onClick={() => setNotifOpen(false)}
                        style={{ border: "none", background: "transparent", cursor: "pointer" }}
                        aria-label="Close"
                      >
                        <FaTimes />
                      </button>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      {loadingNotifs ? (
                        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
                      ) : latestNotifs.length > 0 ? (
                        latestNotifs.map((m) => (
                          <div
                            key={m._id}
                            onClick={() => openNotification(m._id)}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              padding: "10px 10px",
                              borderRadius: 10,
                              background: m.isRead ? "#f7f7fb" : "rgba(24,144,255,0.08)",
                              marginBottom: 8,
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 13,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {m.title}
                              </div>
                              <span style={{ fontSize: 12, color: "#888" }}>
                                {new Date(m.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: "#666" }}>
                              {String(m.body || "").slice(0, 70)}
                              {String(m.body || "").length > 70 ? "..." : ""}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: 12, color: "#666" }}>No notifications</div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/professor/notifications");
                      }}
                      style={{
                        width: "100%",
                        border: "1px solid #ddd",
                        borderRadius: 10,
                        padding: "10px 12px",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>

              <div className="user-menu">
                <FaUserCircle className="user-avatar-sm" />
                <span className="user-name-sm">{isHead ? `Head ${lastName || ""}` : `Dr. ${lastName || ""}`}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="professor-dashboard">
          <div className="welcome-section">
            <div className="welcome-content">
              <h2>Welcome, {isHead ? "Head" : "Dr."} {lastName || fullName}!</h2>
              <p>Here's your teaching overview for today.</p>
              <div className="professor-info">
                <span className="info-item">
                  <FaBuilding />
                  Office: {professorData?.office?.building || "—"} {professorData?.office?.room || "—"}
                </span>
                <span className="info-item">
                  <FaUsers />
                  Specializations: {(professorData?.specialization || []).join(", ") || "—"}
                </span>
              </div>
            </div>

            <div className="welcome-actions">
              {isHead && (
                <button className="quick-action-btn primary" onClick={() => navigate("/head/messages")}>
                  <FaPaperPlane />
                  <span>Head Messages</span>
                </button>
              )}

              <button className="quick-action-btn primary" onClick={() => navigate("/professor/schedule")}>
                <FaCalendarAlt />
                <span>View Schedule</span>
              </button>

              <button className="quick-action-btn secondary" onClick={() => navigate("/professor/courses")}>
                <FaBook />
                <span>Manage Courses</span>
              </button>
            </div>
          </div>

          <div className="stats-grid">
            {quickStats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-background" style={{ background: stat.color }}></div>
                <div className="stat-content">
                  <div className="stat-icon-wrapper">{stat.icon}</div>
                  <div className="stat-text">
                    <h3>{stat.value}</h3>
                    <p>{stat.title}</p>
                    <span className="stat-description">{stat.description}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

     

          <div className="dashboard-grid">
            <div className="grid-column">
              <div className="dashboard-widget classes-widget">
                <div className="widget-header">
                  <h3>Today's Classes</h3>
                  <button className="view-all-btn" onClick={() => navigate("/professor/schedule")}>
                    View Full Schedule
                  </button>
                </div>

                <div className="classes-list">
                  {upcomingClasses.length > 0 ? (
                    upcomingClasses.map((classItem, index) => (
                      <div key={index} className="class-item">
                        <div className="class-time">
                          <span className="time">{classItem.startTime}</span>
                          <span className="duration">- {classItem.endTime}</span>
                        </div>
                        <div className="class-details">
                          <h4 className="course-name">{classItem.courseName}</h4>
                          <p className="course-code">{classItem.courseCode}</p>
                          <div className="class-meta">
                            <span className="classroom">
                              <FaBuilding />
                              {classItem.classroom}
                            </span>
                            <span className="type">{classItem.type}</span>
                          </div>
                        </div>
                        <button className="join-btn">Prepare</button>
                      </div>
                    ))
                  ) : (
                    <div className="no-classes">
                      <FaCheckCircle />
                      <p>No classes scheduled for today</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="dashboard-widget courses-widget">
                <div className="widget-header">
                  <h3>My Courses ({courses.length})</h3>
                  <button className="view-all-btn" onClick={() => navigate("/professor/courses")}>
                    View All
                  </button>
                </div>

                <div className="courses-list">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <div key={course._id} className="course-item">
                        <div className="course-info">
                          <h4 className="course-name">{course.courseName}</h4>
                          <p className="course-code">{course.courseCode}</p>
                          <div className="course-meta">
                            <span className="students">{course.currentEnrollment || 0} students</span>
                            <span className="credits">{course.credits} credits</span>
                          </div>
                        </div>
                        <div className="course-actions">
                          <button className="action-btn outline" onClick={() => navigate("/professor/materials")}>
                            Materials
                          </button>
                          <button className="action-btn primary">Grades</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-courses">
                      <FaBook />
                      <p>No courses assigned for this semester</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid-column">
              <div className="dashboard-widget actions-widget">
                <div className="widget-header">
                  <h3>Quick Actions</h3>
                </div>

                <div className="actions-grid">
                  {isHead && (
                    <button className="action-card" onClick={() => navigate("/head/messages")}>
                      <FaPaperPlane className="action-icon" />
                      <span>Head Messages</span>
                      <FaChevronRight className="action-arrow" />
                    </button>
                  )}

                  <button className="action-card" onClick={() => navigate("/professor/materials")}>
                    <FaGraduationCap className="action-icon" />
                    <span>Upload Materials</span>
                    <FaChevronRight className="action-arrow" />
                  </button>
                  <button className="action-card" onClick={() => navigate("/professor/schedule")}>
                    <FaCalendarAlt className="action-icon" />
                    <span>Update Schedule</span>
                    <FaChevronRight className="action-arrow" />
                  </button>

                  <button className="action-card">
                    <FaUsers className="action-icon" />
                    <span>Student Roster</span>
                    <FaChevronRight className="action-arrow" />
                  </button>

                  <button className="action-card">
                    <FaBook className="action-icon" />
                    <span>Grade Center</span>
                    <FaChevronRight className="action-arrow" />
                  </button>
                </div>
              </div>

              <div className="dashboard-widget activity-widget">
                <div className="widget-header">
                  <h3>Recent Activity</h3>
                </div>
                <div className="activity-list">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className={`activity-item ${activity.type}`}>
                      <div className="activity-content">
                        <p className="activity-action">{activity.action}</p>
                        <span className="activity-meta">
                          {activity.course} • {activity.time}
                        </span>
                      </div>
                    </div>
                  ))}
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

export default ProfessorDashboard;
