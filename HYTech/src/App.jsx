import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/landing/LandingPage';
import SignUp from './components/auth/SignUp';
import SignIn from './components/auth/SignIn';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import PublicOnlyRoute from './components/auth/PublicOnlyRoute';
import AuthenticatedRoute from './components/auth/AuthenticatedRoute';
import { migrateClassesCoursTemplateIdToCourseId } from './utils/firestoreService';

// Admin imports
import AdminDashboardLayout from './components/layout/AdminDashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import UserManagement from './components/users/UserManagement';
import Sectors from './components/sectors/Sectors';
import Classes from './components/admin/Classes';
import SystemLogs from './components/logs/SystemLogs';
import Settings from './components/settings/Settings';
import NotificationsPage from './components/shared/NotificationsPage';
import IdRequests from './components/shared/IdRequests';
import IncidentForms from './components/shared/IncidentForms';
import StudentRequestId from './components/student/StudentRequestId';

// Trainor imports
import DashboardLayout from './components/layout/DashboardLayout';
import TrainerHome from './components/trainer/TrainerHome';
import ClassDetail from './components/trainer/ClassDetail';
import Tasks from './components/trainer/Tasks';
import SectorDetail from './components/trainer/SectorDetail';
import ArchivedCourses from './components/trainer/ArchivedCourses';
import TrainerSettings from './components/trainer/TrainerSettings';

// Trainee imports
import StudentDashboardLayout from './components/student/StudentDashboardLayout';
import StudentHome from './components/student/StudentHome';
import StudentCourse from './components/student/StudentCourse';
import StudentTasks from './components/student/StudentTasks';
import StudentCertificates from './components/student/StudentCertificates';
import StudentArchivedCourses from './components/student/StudentArchivedCourses';
import StudentSettings from './components/student/StudentSettings';
import StudentCalendar from './components/student/StudentCalendar';

function App() {
  // Run one-time data migration on app load
  useEffect(() => {
    const runMigration = async () => {
      try {
        await migrateClassesCoursTemplateIdToCourseId();
      } catch (error) {
        console.error('Migration error (non-blocking):', error);
      }
    };
    runMigration();
  }, []);

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
          <Route path="classes" element={<Classes />} />
          <Route path="logs" element={<SystemLogs />} />
          <Route path="id-requests" element={<IdRequests />} />
          <Route path="incident-forms" element={<IncidentForms scope="all" canManage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<NotificationsPage role="admin" />} />
        </Route>

        {/* Trainor Dashboard Routes */}
        <Route
          path="/trainer"
          element={(
            <RoleProtectedRoute allowedRole="trainer">
              <DashboardLayout />
            </RoleProtectedRoute>
          )}
        >
          <Route index element={<TrainerHome />} />
          <Route path="incident-forms" element={<IncidentForms scope="all" canManage />} />
          <Route path=":className" element={<ClassDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="sectors/:sectorId" element={<SectorDetail />} />
          <Route path="archived" element={<ArchivedCourses />} />
          <Route path="settings" element={<TrainerSettings />} />
          <Route path="notifications" element={<NotificationsPage role="trainer" />} />
        </Route>

        {/* Trainee Dashboard Routes */}
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
          <Route path="request-id" element={<StudentRequestId />} />
          <Route path="incident-form" element={<IncidentForms scope="own" />} />
          <Route path=":classname" element={<StudentCourse />} />
          <Route path="tasks" element={<StudentTasks />} />
          {/* Certificates feature hidden for now — redirect to home instead of
              rendering the page. Restore <StudentCertificates /> to re-enable. */}
          <Route path="certificates" element={<Navigate to="/student" replace />} />
          <Route path="archived" element={<StudentArchivedCourses />} />
          <Route path="settings" element={<StudentSettings />} />
          <Route path="notifications" element={<NotificationsPage role="student" />} />
        </Route>

        {/* Class Detail Route - Accessible to all authenticated users */}
        <Route
          path="/class/:className"
          element={
            <AuthenticatedRoute>
              <ClassDetail />
            </AuthenticatedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
