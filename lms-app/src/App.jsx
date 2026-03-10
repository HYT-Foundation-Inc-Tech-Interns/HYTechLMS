import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Auth
import LandingPage from './pages/auth/LandingPage'
import SignIn      from './pages/auth/SignIn'
import SignUp      from './pages/auth/SignUp'

// Admin
import AdminHome           from './pages/admin/AdminHome'
import AdminUserManagement from './pages/admin/AdminUserManagement'
import AdminSectors        from './pages/admin/AdminSectors'
import AdminSystemLogs     from './pages/admin/AdminSystemLogs'
import AdminSettings       from './pages/admin/AdminSettings'

// Student
import StudentHome            from './pages/student/StudentHome'
import StudentCertificates    from './pages/student/StudentCertificates'
import StudentArchivedCourses from './pages/student/StudentArchivedCourses'
import StudentTasks           from './pages/student/StudentTasks'
import StudentSettings        from './pages/student/StudentSettings'
import StudentCalendar        from './pages/student/StudentCalendar'

// Trainer
import TrainerHome            from './pages/trainer/TrainerHome'
import TrainerCourses         from './pages/trainer/TrainerCourses'
import TrainerCourse          from './pages/trainer/TrainerCourse'
import TrainerStream          from './pages/trainer/TrainerStream'
import TrainerClasswork       from './pages/trainer/TrainerClasswork'
import TrainerPeople          from './pages/trainer/TrainerPeople'
import TrainerGrades          from './pages/trainer/TrainerGrades'
import TrainerSectors         from './pages/trainer/TrainerSectors'
import TrainerSectorDetail    from './pages/trainer/TrainerSectorDetail'
import TrainerArchivedCourses from './pages/trainer/TrainerArchivedCourses'
import TrainerTasks           from './pages/trainer/TrainerTasks'
import TrainerSettings        from './pages/trainer/TrainerSettings'

/* ── Route guards ─────────────────────────────────────────────────── */
const HOME_BY_ROLE = { admin: '/admin', student: '/student', trainer: '/trainer' }

function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/signin" replace />
}

function GuestOnly({ children }) {
  const { user } = useAuth()
  if (!user) return children
  return <Navigate to={HOME_BY_ROLE[user.role] ?? '/'} replace />
}

/* ── Routes ───────────────────────────────────────────────────────── */
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<GuestOnly><SignIn /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />

      {/* Admin */}
      <Route path="/admin"          element={<RequireAuth><AdminHome /></RequireAuth>} />
      <Route path="/admin/users"    element={<RequireAuth><AdminUserManagement /></RequireAuth>} />
      <Route path="/admin/sectors"  element={<RequireAuth><AdminSectors /></RequireAuth>} />
      <Route path="/admin/logs"     element={<RequireAuth><AdminSystemLogs /></RequireAuth>} />
      <Route path="/admin/settings" element={<RequireAuth><AdminSettings /></RequireAuth>} />

      {/* Student */}
      <Route path="/student"              element={<RequireAuth><StudentHome /></RequireAuth>} />
      <Route path="/student/calendar"     element={<RequireAuth><StudentCalendar /></RequireAuth>} />
      <Route path="/student/tasks"        element={<RequireAuth><StudentTasks /></RequireAuth>} />
      <Route path="/student/certificates" element={<RequireAuth><StudentCertificates /></RequireAuth>} />
      <Route path="/student/archived"     element={<RequireAuth><StudentArchivedCourses /></RequireAuth>} />
      <Route path="/student/settings"     element={<RequireAuth><StudentSettings /></RequireAuth>} />

      {/* Trainer — top-level pages */}
      <Route path="/trainer"          element={<RequireAuth><TrainerHome /></RequireAuth>} />
      <Route path="/trainer/courses"  element={<RequireAuth><TrainerCourses /></RequireAuth>} />
      <Route path="/trainer/tasks"    element={<RequireAuth><TrainerTasks /></RequireAuth>} />
      <Route path="/trainer/sectors"  element={<RequireAuth><TrainerSectors /></RequireAuth>} />
      <Route path="/trainer/sectors/:slug" element={<RequireAuth><TrainerSectorDetail /></RequireAuth>} />
      <Route path="/trainer/archived" element={<RequireAuth><TrainerArchivedCourses /></RequireAuth>} />
      <Route path="/trainer/settings" element={<RequireAuth><TrainerSettings /></RequireAuth>} />

      {/* Trainer — nested course pages (TrainerCourse is the layout shell) */}
      <Route
        path="/trainer/courses/:courseId"
        element={<RequireAuth><TrainerCourse /></RequireAuth>}
      >
        <Route index element={<Navigate to="stream" replace />} />
        <Route path="stream"    element={<TrainerStream />} />
        <Route path="classwork" element={<TrainerClasswork />} />
        <Route path="people"    element={<TrainerPeople />} />
        <Route path="grades"    element={<TrainerGrades />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
