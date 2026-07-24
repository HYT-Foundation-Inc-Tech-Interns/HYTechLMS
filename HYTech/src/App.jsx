import React from 'react';
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import PublicOnlyRoute from './components/auth/PublicOnlyRoute';
import AuthenticatedRoute from './components/auth/AuthenticatedRoute';

const LandingPage = lazy(() => import('./components/landing/LandingPage'));
const SignUp = lazy(() => import('./components/auth/SignUp'));
const SignIn = lazy(() => import('./components/auth/SignIn'));
const VerifyEmail = lazy(() => import('./components/auth/VerifyEmail'));
const AdminDashboardLayout = lazy(() => import('./components/layout/AdminDashboardLayout'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const UserManagement = lazy(() => import('./components/users/UserManagement'));
const Sectors = lazy(() => import('./components/sectors/Sectors'));
const Classes = lazy(() => import('./components/admin/Classes'));
const AdminStudentClassPreview = lazy(() => import('./components/admin/AdminStudentClassPreview'));
const SystemLogs = lazy(() => import('./components/logs/SystemLogs'));
const Settings = lazy(() => import('./components/settings/Settings'));
const NotificationsPage = lazy(() => import('./components/shared/NotificationsPage'));
const IdRequests = lazy(() => import('./components/shared/IdRequests'));
const IncidentForms = lazy(() => import('./components/shared/IncidentForms'));
const StudentRequestId = lazy(() => import('./components/student/StudentRequestId'));
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const TrainerHome = lazy(() => import('./components/trainer/TrainerHome'));
const ClassDetail = lazy(() => import('./components/trainer/ClassDetail'));
const Tasks = lazy(() => import('./components/trainer/Tasks'));
const SectorDetail = lazy(() => import('./components/trainer/SectorDetail'));
const ArchivedCourses = lazy(() => import('./components/trainer/ArchivedCourses'));
const TrainerSettings = lazy(() => import('./components/trainer/TrainerSettings'));
const StudentDashboardLayout = lazy(() => import('./components/student/StudentDashboardLayout'));
const StudentHome = lazy(() => import('./components/student/StudentHome'));
const StudentEnroll = lazy(() => import('./components/student/StudentEnroll'));
const StudentCourse = lazy(() => import('./components/student/StudentCourse'));
const StudentTasks = lazy(() => import('./components/student/StudentTasks'));
const StudentArchivedCourses = lazy(() => import('./components/student/StudentArchivedCourses'));
const StudentSettings = lazy(() => import('./components/student/StudentSettings'));
const StudentCalendar = lazy(() => import('./components/student/StudentCalendar'));

function App() {
  return (
    <Router>
      <Suspense
        fallback={(
          <div
            className="min-h-screen bg-gray-50"
            role="status"
            aria-label="Loading page"
          />
        )}
      >
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
        {/* Bare public route: the user arrives here signed in but unverified,
            so it must NOT be wrapped by PublicOnlyRoute (which would redirect
            them into a dashboard the verification gate immediately bounces). */}
        <Route path="/verify-email" element={<VerifyEmail />} />

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
          <Route path="classes/:classname/preview" element={<AdminStudentClassPreview />} />
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
          <Route path="enroll" element={<StudentEnroll />} />
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
      </Suspense>
    </Router>
  );
}

export default App;
