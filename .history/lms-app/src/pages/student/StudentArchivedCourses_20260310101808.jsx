import DashboardLayout from '../../components/layout/DashboardLayout'
import { studentNav } from './studentNav'
import { HiUsers } from 'react-icons/hi'

const ARCHIVED = [
  { title: 'Basic Barista Course',        sector: 'Tourism & Hospitality', completedOn: 'Jan 10, 2026', color: '#0d4291' },
  { title: 'Food Safety Fundamentals',    sector: 'Health & Wellness',     completedOn: 'Dec 5, 2025',  color: '#16a34a' },
  { title: 'Customer Service NC I',       sector: 'Tourism & Hospitality', completedOn: 'Nov 20, 2025', color: '#f97316' },
  { title: 'Basic Electrical Wiring',     sector: 'Electrical',            completedOn: 'Oct 15, 2025', color: '#7c3aed' },
  { title: 'Intro to Web Dev',            sector: 'ICT',                   completedOn: 'Sep 30, 2025', color: '#0891b2' },
  { title: 'HVAC Fundamentals',           sector: 'Heating & HVAC',        completedOn: 'Aug 12, 2025', color: '#d97706' },
]

const BG = [
  'linear-gradient(135deg,#0d4291,#1e5bb5)',
  'linear-gradient(135deg,#16a34a,#22c55e)',
  'linear-gradient(135deg,#f97316,#fb923c)',
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#0891b2,#06b6d4)',
  'linear-gradient(135deg,#d97706,#f59e0b)',
]

export default function StudentArchivedCourses() {
  return (
    <DashboardLayout
      navItems={studentNav}
      pageTitle="Archived Courses"
      pageSubtitle="Your completed and archived course records."
    >
      <div className="page-header">
        <span className="page-header__title">Archived Courses</span>
        <span style={{ fontSize: 13, color: 'var(--color-gray)' }}>{ARCHIVED.length} courses</span>
      </div>

      <div className="sector-grid">
        {ARCHIVED.map((c, i) => (
          <div key={c.title} className="sector-card">
            <div className="sector-card__img-placeholder" style={{ background: BG[i % BG.length] }} />
            <div className="sector-card__body">
              <div className="sector-card__title">{c.title}</div>
              <div className="sector-card__meta">
                {c.sector}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-gray)' }}>
                Completed: {c.completedOn}
              </div>
            </div>
            <div className="sector-card__actions">
              <button className="btn btn--outline" style={{ flex: 1 }}>View Details</button>
              <button className="btn btn--primary" style={{ flex: 1 }}>Certificate</button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
