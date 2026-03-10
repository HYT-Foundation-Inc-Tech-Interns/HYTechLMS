import DashboardLayout from '../../components/layout/DashboardLayout'
import { studentNav } from './studentNav'
import { HiBookOpen, HiClock, HiAcademicCap, HiClipboardCheck } from 'react-icons/hi'

const stats = [
  { label: 'Enrolled Courses',      value: '5',  icon: HiBookOpen },
  { label: 'Hours Completed',        value: '48', icon: HiClock },
  { label: 'Certificates Earned',    value: '2',  icon: HiAcademicCap },
  { label: 'Pending Tasks',          value: '7',  icon: HiClipboardCheck },
]

const courses = [
  { title: 'Barista NCII',              sector: 'Tourism & Hospitality', progress: 75, color: '#0d4291' },
  { title: 'Electrical Installation',   sector: 'Electrical',            progress: 40, color: '#7c3aed' },
  { title: 'Driving NC III',            sector: 'Driving',               progress: 90, color: '#16a34a' },
  { title: 'ICT - Web Development',     sector: 'ICT',                   progress: 20, color: '#0891b2' },
  { title: 'Health Care Services NCII', sector: 'Health & Wellness',     progress: 55, color: '#dc2626' },
]

const announcements = [
  { type: 'orange', title: 'Upcoming Quiz: Barista NCII Module 4', text: 'Scheduled for March 15, 2026. Review your notes and prepare accordingly.' },
  { type: 'blue',   title: 'New Material Uploaded',                 text: 'Your trainer has uploaded new study materials for Electrical Installation.' },
]

export default function StudentHome() {
  return (
    <DashboardLayout navItems={studentNav} pageTitle={null}>
      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(13,66,145,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={22} color="var(--color-primary)" />
            </div>
            <div>
              <div className="stat-card__value">{s.value}</div>
              <div className="stat-card__label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Announcements */}
      <div style={{ marginBottom: 24 }}>
        {announcements.map((a) => (
          <div key={a.title} className={`announcement-banner announcement-banner--${a.type}`}>
            <div className="announcement-banner__title">{a.title}</div>
            <div className="announcement-banner__text">{a.text}</div>
          </div>
        ))}
      </div>

      {/* Enrolled courses */}
      <div className="card">
        <div className="page-header">
          <span className="page-header__title">My Courses</span>
          <button className="btn btn--outline">View All</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {courses.map((c) => (
            <div key={c.title} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-gray)', marginBottom: 6 }}>{c.sector}</div>
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.progress}%`, background: c.color, borderRadius: 99 }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{c.progress}%</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
