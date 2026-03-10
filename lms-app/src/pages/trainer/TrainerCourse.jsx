import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { trainerNav } from './trainerNav'

const COURSES = {
  'barista-ncii': {
    title: 'Barista NCII',
    batch: 'Dreamers Batch 16',
    code: '4a7b8c',
    color: 'linear-gradient(135deg,#f97316,#fb923c)',
    enrolled: 32,
  },
  electrical: {
    title: 'Basic Electrical Wiring',
    batch: 'Batch 5',
    code: '9x2m4p',
    color: 'linear-gradient(135deg,#7c3aed,#a855f7)',
    enrolled: 18,
  },
  'web-dev': {
    title: 'ICT Web Dev Fundamentals',
    batch: 'Batch 3',
    code: '3k8n1q',
    color: 'linear-gradient(135deg,#0891b2,#06b6d4)',
    enrolled: 40,
  },
}

const TABS = [
  { label: 'Stream',    path: 'stream'    },
  { label: 'Classwork', path: 'classwork' },
  { label: 'People',    path: 'people'    },
  { label: 'Grades',    path: 'grades'    },
]

export default function TrainerCourse() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const course = COURSES[courseId] || COURSES['barista-ncii']

  const activeTab = TABS.find(t => location.pathname.endsWith(t.path))?.path || 'stream'

  return (
    <DashboardLayout navItems={trainerNav} pageTitle={course.title} pageSubtitle={course.batch}>
      {/* Course Banner */}
      <div
        style={{
          background: course.color,
          borderRadius: 16,
          padding: '24px 32px',
          marginBottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-poppins)',
              fontWeight: 700,
              fontSize: 22,
              color: 'white',
            }}
          >
            {course.title}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            {course.batch}&nbsp;&nbsp;·&nbsp;&nbsp;{course.enrolled} students
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Class Code</div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 20,
              fontWeight: 700,
              color: 'white',
              letterSpacing: 2,
            }}
          >
            {course.code}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          marginBottom: 24,
          background: 'white',
        }}
      >
        {TABS.map(t => (
          <button
            key={t.path}
            onClick={() => navigate(`/trainer/courses/${courseId}/${t.path}`)}
            style={{
              padding: '14px 28px',
              fontFamily: 'var(--font-poppins)',
              fontSize: 15,
              fontWeight: activeTab === t.path ? 600 : 400,
              color: activeTab === t.path ? '#2264e5' : 'var(--color-gray)',
              borderBottom: activeTab === t.path ? '2px solid #2264e5' : '2px solid transparent',
              marginBottom: -2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Outlet context={{ course, courseId }} />
    </DashboardLayout>
  )
}
