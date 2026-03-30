import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/landing/LandingPage';
import SignUp from './components/auth/SignUp';
import SignIn from './components/auth/SignIn';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import PublicOnlyRoute from './components/auth/PublicOnlyRoute';

// Admin imports
import AdminDashboardLayout from './components/layout/AdminDashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import UserManagement from './components/users/UserManagement';
import Sectors from './components/sectors/Sectors';
import SystemLogs from './components/logs/SystemLogs';
import Settings from './components/settings/Settings';
import NotificationsPage from './components/shared/NotificationsPage';

// Trainer imports
import DashboardLayout from './components/layout/DashboardLayout';
import TrainerHome from './components/trainer/TrainerHome';
import Course from './components/trainer/Course';
import Tasks from './components/trainer/Tasks';
import TrainerSectors from './components/trainer/TrainerSectors';
import SectorDetail from './components/trainer/SectorDetail';
import ArchivedCourses from './components/trainer/ArchivedCourses';
import TrainerSettings from './components/trainer/TrainerSettings';

// Supervisor imports
import SupervisorDashboardLayout from './components/layout/SupervisorDashboardLayout';
import SupervisorHome from './components/supervisor/SupervisorHome';
import SupervisorTrainers from './components/supervisor/SupervisorTrainers';
import SupervisorStudents from './components/supervisor/SupervisorStudents';
import SupervisorCourses from './components/supervisor/SupervisorCourses';
import SupervisorReports from './components/supervisor/SupervisorReports';
import SupervisorSettings from './components/supervisor/SupervisorSettings';

// Student imports
import StudentDashboardLayout from './components/student/StudentDashboardLayout';
import StudentHome from './components/student/StudentHome';
import StudentCourse from './components/student/StudentCourse';
import StudentTasks from './components/student/StudentTasks';
import StudentCertificates from './components/student/StudentCertificates';
import StudentArchivedCourses from './components/student/StudentArchivedCourses';
import StudentSettings from './components/student/StudentSettings';
import StudentCalendar from './components/student/StudentCalendar';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing & Auth Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/signup"
          element={(
            <PublicOnlyRoute>
              <SignUp />
            </PublicOnlyRoute>
          )}
        />
        <Route
          path="/signin"
          element={(
            <PublicOnlyRoute>
              <SignIn />
            </PublicOnlyRoute>
          )}
        />

        {/* Admin Dashboard Routes */}
        <Route
          path="/admin"
          element={(
            <RoleProtectedRoute allowedRole="admin">
              <AdminDashboardLayout />
            </RoleProtectedRoute>
          )}
        >
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="sectors" element={<Sectors />} />
          <Route path="logs" element={<SystemLogs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<NotificationsPage role="admin" />} />
        </Route>

        {/* Trainer Dashboard Routes */}
        <Route
          path="/trainer"
          element={(
            <RoleProtectedRoute allowedRole="trainer">
              <DashboardLayout />
            </RoleProtectedRoute>
          )}
        >
          <Route index element={<TrainerHome />} />
          <Route path="courses/:courseId" element={<Course />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="sectors" element={<TrainerSectors />} />
          <Route path="sectors/:sectorId" element={<SectorDetail />} />
          <Route path="archived" element={<ArchivedCourses />} />
          <Route path="settings" element={<TrainerSettings />} />
          <Route path="notifications" element={<NotificationsPage role="trainer" />} />
        </Route>

        {/* Supervisor Dashboard Routes */}
        <Route
          path="/supervisor"
          element={(
            <RoleProtectedRoute allowedRole="supervisor">
              <SupervisorDashboardLayout />
            </RoleProtectedRoute>
          )}
        >
          <Route index element={<SupervisorHome />} />
          <Route path="trainers" element={<SupervisorTrainers />} />
          <Route path="students" element={<SupervisorStudents />} />
          <Route path="courses" element={<SupervisorCourses />} />
          <Route path="reports" element={<SupervisorReports />} />
          <Route path="settings" element={<SupervisorSettings />} />
          <Route path="notifications" element={<NotificationsPage role="supervisor" />} />
        </Route>

        {/* Student Dashboard Routes */}
        <Route
          path="/student"
          element={(
            <RoleProtectedRoute allowedRole="student">
              <StudentDashboardLayout />
            </RoleProtectedRoute>
          )}
        >
          <Route index element={<StudentHome />} />
          <Route path="calendar" element={<StudentCalendar />} />
          <Route path="courses/:courseId" element={<StudentCourse />} />
          <Route path="tasks" element={<StudentTasks />} />
          <Route path="certificates" element={<StudentCertificates />} />
          <Route path="archived" element={<StudentArchivedCourses />} />
          <Route path="settings" element={<StudentSettings />} />
          <Route path="notifications" element={<NotificationsPage role="student" />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
