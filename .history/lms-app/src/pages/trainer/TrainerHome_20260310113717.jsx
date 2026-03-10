import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { trainerNav } from './trainerNav'
import {
  HiUsers,
  HiBookOpen,
  HiClipboardCheck,
  HiStar,
  HiClock,
} from 'react-icons/hi'

const STATS = [
  { label: 'Students Enrolled', value: 284, icon: HiUsers,         color: '#0d4291' },
  { label: 'Active Courses',    value: 12,  icon: HiBookOpen,       color: '#16a34a' },
  { label: 'Pending Reviews',   value: 5,   icon: HiClipboardCheck, color: '#f97316' },
  { label: 'Avg Score',         value: '87%', icon: HiStar,         color: '#7c3aed' },
]

const COURSES = [
  { name: 'Barista NCII',              batch: 'Batch 16', enrolled: 32, total: 40, progress: 78,  gradient: 'linear-gradient(135deg,#f97316,#fb923c)', progressColor: '#f97316' },
  { name: 'Basic Electrical Wiring',   batch: 'Batch 5',  enrolled: 18, total: 25, progress: 68,  gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', progressColor: '#7c3aed' },
  { name: 'ICT Web Dev Fundamentals',  batch: 'Batch 3',  enrolled: 40, total: 40, progress: 100, gradient: 'linear-gradient(135deg,#0891b2,#06b6d4)', progressColor: '#0891b2' },
]

const DEADLINES = [
  { title: 'Quiz — Barista Module 4',   due: 'Due Today',   color: '#ef4444' },
  { title: 'Assignment — Electrical Lab', due: 'Due Mar 12', color: '#f59e0b' },
  { title: 'Online Exam',               due: 'Due Mar 15',  color: '#0d4291' },
]

const ACTIVITY = [
  { initials: 'M', bg: '#0d4291', name: 'Maria S.',  action: 'submitted Assignment 2', time: '2h ago' },
  { initials: 'J', bg: '#16a34a', name: 'Juan D.',   action: 'asked a question',       time: '3h ago' },
  { initials: 'A', bg: '#f97316', name: 'Ana R.',    action: 'viewed Material 3',      time: '5h ago' },
  { initials: 'C', bg: '#7c3aed', name: 'Carlos B.', action: 'submitted Quiz 1',       time: 'Yesterday' },
  { initials: 'P', bg: '#0891b2', name: 'Pedro R.',  action: 'joined the course',      time: 'Yesterday' },
]

export default function TrainerHome() {
  const navigate = useNavigate()

  return (
    <DashboardLayout navItems={trainerNav} pageTitle="Dashboard" pageSubtitle="Welcome back, Trainer">
      {/* Hero Welcome Card */}
      <div
        style={{
          background: 'linear-gradient(135deg,#0d4291,#1e5bb5)',
          borderRadius: 16,
          padding: '32px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700, fontSize: 28, color: 'white', marginBottom: 6 }}>
            Good day, Trainer!
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            Here's your overview — Wednesday, March 10, 2026
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/trainer/courses')}
            style={{
              background: '#ff7700',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Create Course
          </button>
          <button
            style={{
              background: 'transparent',
              color: 'white',
              border: '1px solid white',
              borderRadius: 8,
              padding: '10px 20px',
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            New Announcement
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {STATS.map(s => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              style={{
                background: 'white',
                borderRadius: 16,
                boxShadow: 'var(--shadow-card)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: s.color + '1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon style={{ fontSize: 20, color: s.color }} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-poppins)',
                    fontWeight: 700,
                    fontSize: 28,
                    color: 'var(--color-dark)',
                    lineHeight: 1.1,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-gray)', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Two-Column */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left: Active Courses */}
        <div style={{ flex: 2 }}>
          <div
            style={{
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: 17,
              color: 'var(--color-dark)',
              marginBottom: 16,
            }}
          >
            My Active Courses
          </div>
          {COURSES.map(c => (
            <div
              key={c.name}
              style={{
                background: 'white',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                marginBottom: 16,
              }}
            >
              <div style={{ background: c.gradient, height: 100 }} />
              <div style={{ padding: '16px 20px' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-poppins)',
                    fontWeight: 600,
                    fontSize: 15,
                    color: 'var(--color-dark)',
                    marginBottom: 4,
                  }}
                >
                  {c.name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-gray)', marginBottom: 2 }}>{c.batch}</div>
                <div style={{ fontSize: 13, color: 'var(--color-gray)', marginBottom: 12 }}>
                  {c.enrolled}/{c.total} students
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: '#f3f4f6',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: 6,
                        width: `${c.progress}%`,
                        background: c.progressColor,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-gray)', minWidth: 36, textAlign: 'right' }}>
                    {c.progress}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Deadlines + Activity */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upcoming Deadlines */}
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-poppins)',
                fontWeight: 600,
                fontSize: 16,
                color: 'var(--color-dark)',
                marginBottom: 16,
              }}
            >
              Upcoming Deadlines
            </div>
            {DEADLINES.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < DEADLINES.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <HiClock style={{ fontSize: 16, color: d.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontFamily: 'var(--font-poppins)', color: 'var(--color-dark)' }}>
                    {d.title}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: d.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {d.due}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-poppins)',
                fontWeight: 600,
                fontSize: 16,
                color: 'var(--color-dark)',
                marginBottom: 16,
              }}
            >
              Recent Activity
            </div>
            {ACTIVITY.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: i < ACTIVITY.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: a.bg,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {a.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-dark)' }}>{a.name}</span>
                  {' '}
                  <span style={{ fontSize: 13, color: 'var(--color-gray)' }}>{a.action}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-gray)', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {a.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
