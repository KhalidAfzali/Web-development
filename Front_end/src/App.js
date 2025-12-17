import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "antd";
import "./App.css";

/* ===================== AUTH & CORE ===================== */
import PrivateRoute from "./utils/privateRoute";
import RoleBasedRoute from "./utils/RoleBasedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFoundPage from "./pages/NotFoundPage";

/* ===================== DASHBOARDS ===================== */
import AdminDashboard from "./components/Dashboard/AdminDashboard";
import ProfessorDashboard from "./components/Dashboard/ProfessorDashboard";

/* ===================== ADMIN PAGES ===================== */
import FacultyPage from "./components/Professors/FacultyPage";
import AddProfessorPage from "./components/Professors/AddProfessorPage";
import Courses from "./components/Courses/Courses";
import AssignCoursePage from "./components/Courses/AssignCoursePage";
import ClassroomsPage from "./components/Classrooms/ClassroomsPage";
import AddClassroomPage from "./components/Classrooms/AddClassroomPage";
import EditClassroomPage from "./components/Classrooms/EditClassroomPage";
import SectionManagementPage from "./components/Scheduling/SectionManagementPage";
import TimeSlotManagementPage from "./components/Scheduling/TimeSlotManagementPage";
import SemesterManagementPage from "./components/Semester/SemesterManagementPage";
import CreateScheduleWizard from "./components/Scheduling/CreateScheduleWizard";
import EditSchedulePage from "./components/Scheduling/EditeSchedulePage";
import EditProfessorPage from "./components/Professors/EditProfessorPage";
import ProfessorDetailsPage from "./components/Professors/ProfessorDetailsPage";
import About from "./Layout/About";
import HeadManagementPage from "./components/Dashboard/HeadManagementPage";

/* ===================== HEAD PAGES ===================== */
import HeadMeetingsPage from "./components/Head/HeadMeetingsPage";
import HeadMessagesPage from "./components/Head/HeadMessagesPage";

/* ===================== MESSAGES / NOTIFICATIONS ===================== */
import AdminSendMessagePage from "./components/Semester/AdminSendMessagePage";
import DoctorNotificationsPage from "./components/Semester/DoctorNotificationsPage";

/* ===================== SCHEDULING ===================== */
import SchedulePage from "./components/Scheduling/SchedulePage";
import GenerateSchedulePage from "./components/Scheduling/GenerateSchedulePage";

/* ===================== PROFESSOR PAGES ===================== */
import MyCoursesPage from "./components/Professors/MyCoursesPage";
import CourseMaterialsPage from "./components/Professors/CourseMaterialsPage";

/* ===================== NEW PAGES ===================== */
import DoctorProfilePage from "./components/Professors/DoctorProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HeadDoctorDetailsPage from "./components/Head/HeadDoctorDetailsPage";

const { Content } = Layout;

/* ===================== ROLE WRAPPERS ===================== */
const AdminOnly = ({ children }) => (
  <PrivateRoute>
    <RoleBasedRoute requiredRole={["admin"]}>{children}</RoleBasedRoute>
  </PrivateRoute>
);

const AdminOrHead = ({ children }) => (
  <PrivateRoute>
    <RoleBasedRoute requiredRole={["admin", "head"]}>{children}</RoleBasedRoute>
  </PrivateRoute>
);

const DoctorOnly = ({ children }) => (
  <PrivateRoute>
    <RoleBasedRoute requiredRole={["doctor", "head"]}>{children}</RoleBasedRoute>
  </PrivateRoute>
);

const HeadOnly = ({ children }) => (
  <PrivateRoute>
    <RoleBasedRoute requiredRole={["head"]}>{children}</RoleBasedRoute>
  </PrivateRoute>
);

/* ===================== HELPERS ===================== */
const RoleRedirect = () => {
  let role = localStorage.getItem("userRole");

  if (!role) {
    try {
      role = JSON.parse(localStorage.getItem("userData") || "{}")?.role;
    } catch {
      role = null;
    }
  }

  role = String(role || "").toLowerCase();

  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "head" || role === "doctor") return <Navigate to="/professor/dashboard" replace />;
  return <Navigate to="/unauthorized" replace />;
};

const AdminClassroomsRedirect = () => {
  let role = localStorage.getItem("userRole");

  if (!role) {
    try {
      role = JSON.parse(localStorage.getItem("userData") || "{}")?.role;
    } catch {
      role = null;
    }
  }

  role = String(role || "").toLowerCase();

  return role === "admin"
    ? <Navigate to="/admin/classrooms" replace />
    : <Navigate to="/unauthorized" replace />;
};

/* ===================== PLACEHOLDERS ===================== */
const SettingsPage = () => (
  <div style={{ padding: 50, textAlign: "center" }}>
    <h1>System Settings</h1>
    <p>Under development</p>
  </div>
);

const ActivityLogPage = () => (
  <div style={{ padding: 50, textAlign: "center" }}>
    <h1>Activity Log</h1>
    <p>Under development</p>
  </div>
);

/* ===================== APP ===================== */
export default function App() {
  return (
    <Router>
      <Layout>
        <Content style={{ minHeight: "100vh" }}>
          <Routes>
            {/* ===== PUBLIC ===== */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            {/* ===== ADMIN ===== */}
            <Route path="/admin" element={<AdminOnly><Navigate to="/admin/dashboard" replace /></AdminOnly>} />
            <Route path="/admin/dashboard" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
            <Route path="/admin/head" element={<AdminOnly><HeadManagementPage /></AdminOnly>} />

            <Route path="/admin/faculty" element={<AdminOnly><FacultyPage /></AdminOnly>} />
            <Route path="/admin/faculty/add" element={<AdminOnly><AddProfessorPage /></AdminOnly>} />
            <Route path="/admin/faculty/:id" element={<AdminOnly><ProfessorDetailsPage /></AdminOnly>} />
            <Route path="/admin/faculty/edit/:id" element={<AdminOnly><EditProfessorPage /></AdminOnly>} />

            <Route path="/admin/courses" element={<AdminOnly><Courses /></AdminOnly>} />
            <Route path="/admin/courses/assign" element={<AdminOnly><AssignCoursePage /></AdminOnly>} />

            <Route path="/admin/classrooms" element={<AdminOnly><ClassroomsPage /></AdminOnly>} />
            <Route path="/admin/classrooms/add" element={<AdminOnly><AddClassroomPage /></AdminOnly>} />
            <Route path="/admin/classrooms/edit/:id" element={<AdminOnly><EditClassroomPage /></AdminOnly>} />

            <Route path="/admin/semesters" element={<AdminOnly><SemesterManagementPage /></AdminOnly>} />
            <Route path="/admin/sections" element={<AdminOnly><SectionManagementPage /></AdminOnly>} />
            <Route path="/admin/timeslots" element={<AdminOnly><TimeSlotManagementPage /></AdminOnly>} />

            <Route path="/admin/schedule" element={<AdminOnly><GenerateSchedulePage /></AdminOnly>} />
            <Route path="/admin/schedule/create" element={<AdminOnly><CreateScheduleWizard /></AdminOnly>} />
            <Route path="/admin/schedule/edit/:id" element={<AdminOnly><EditSchedulePage /></AdminOnly>} />
            <Route path="/admin/schedule/view" element={<AdminOnly><SchedulePage isAdmin /></AdminOnly>} />

            <Route path="/admin/settings" element={<AdminOnly><SettingsPage /></AdminOnly>} />
            <Route path="/admin/activity" element={<AdminOnly><ActivityLogPage /></AdminOnly>} />

            {/* admin + head can send messages (your existing page) */}
            <Route path="/admin/messages" element={<AdminOrHead><AdminSendMessagePage /></AdminOrHead>} />

            {/* ===== HEAD ONLY PAGES ===== */}
            <Route path="/head/messages" element={<HeadOnly><HeadMessagesPage /></HeadOnly>} />
            <Route path="/head/messages" element={<DoctorOnly><HeadMessagesPage /></DoctorOnly>} />
            <Route
              path="/head/doctors/:doctorId"
              element={
                <DoctorOnly>
                  <HeadDoctorDetailsPage />
                </DoctorOnly>
              }
            />


            {/* meetings you currently placed under /admin, keep it if you want */}
            <Route path="/admin/meetings" element={<AdminOrHead><HeadMeetingsPage /></AdminOrHead>} />

            {/* ===== PROFESSOR (doctor + head) ===== */}
            <Route path="/professor" element={<DoctorOnly><Navigate to="/professor/dashboard" replace /></DoctorOnly>} />
            <Route path="/professor/dashboard" element={<DoctorOnly><ProfessorDashboard /></DoctorOnly>} />
            <Route path="/professor/courses" element={<DoctorOnly><MyCoursesPage /></DoctorOnly>} />
            <Route path="/professor/schedule" element={<DoctorOnly><SchedulePage /></DoctorOnly>} />
            <Route path="/professor/materials" element={<DoctorOnly><CourseMaterialsPage /></DoctorOnly>} />
            <Route path="/professor/profile" element={<DoctorOnly><DoctorProfilePage /></DoctorOnly>} />
            <Route path="/professor/change-password" element={<DoctorOnly><ChangePasswordPage /></DoctorOnly>} />
            <Route path="/professor/notifications" element={<DoctorOnly><DoctorNotificationsPage /></DoctorOnly>} />

            {/* ===== COMMON ===== */}
            <Route path="/courses" element={<PrivateRoute><Courses /></PrivateRoute>} />
            <Route path="/schedule" element={<PrivateRoute><RoleRedirect /></PrivateRoute>} />
            <Route path="/classrooms" element={<PrivateRoute><AdminClassroomsRedirect /></PrivateRoute>} />

            {/* ===== 404 ===== */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}
