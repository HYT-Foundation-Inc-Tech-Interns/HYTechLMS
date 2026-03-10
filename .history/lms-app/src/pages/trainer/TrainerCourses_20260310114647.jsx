import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { trainerNav } from './trainerNav'
import { HiPlus } from 'react-icons/hi'

const COURSES = [
  {
    id: 'barista-ncii',
    title: 'Barista NCII',
    batch: 'Batch 16',
    enrolled: 32,
    color: 'linear-gradient(135deg,#f97316,#fb923c)',
  },
  {
    id: 'electrical',
    title: 'Basic Electrical Wiring',
    batch: 'Batch 5',
    enrolled: 18,
    color: 'linear-gradient(135deg,#7c3aed,#a855f7)',
  },
  {
    id: 'web-dev',
    title: 'ICT Web Dev Fundamentals',
    batch: 'Batch 3',
    enrolled: 40,
    color: 'linear-gradient(135deg,#0891b2,#06b6d4)',
  },
]

export default function TrainerCourses() {
  const navigate = useNavigate()

  return (
    <DashboardLayout navItems={trainerNav} pageTitle="My Courses" pageSubtitle="Manage your active courses">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 className="page-header__title">My Courses</h1>
        <button className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HiPlus style={{ fontSize: 18 }} />
          Create Course
        </button>
      </div>

      {/* Course Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        {COURSES.map(course => (
          <div
            key={course.id}
            className="sector-card"
            style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}
          >
            <div
              className="sector-card__img-placeholder"
              style={{ background: course.color, height: 120 }}
            />
            <div className="sector-card__body" style={{ padding: 20 }}>
              <div
                className="sector-card__title"
                style={{
                  fontFamily: 'var(--font-poppins)',
                  fontWeight: 600,
                  fontSize: 16,
                  color: 'var(--color-dark)',
                  marginBottom: 6,
                }}
              >
                {course.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-gray)', marginBottom: 4 }}>{course.batch}</div>
              <div style={{ fontSize: 13, color: 'var(--color-gray)', marginBottom: 16 }}>
                {course.enrolled} students enrolled
              </div>
              <div className="sector-card__actions">
                <button
                  className="btn btn--primary"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/trainer/courses/${course.id}/stream`)}
                >
                  View Course
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
