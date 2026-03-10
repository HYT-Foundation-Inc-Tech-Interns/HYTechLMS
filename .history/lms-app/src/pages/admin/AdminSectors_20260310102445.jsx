import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from './adminNav'
import { HiPlus, HiPencil, HiTrash, HiUsers } from 'react-icons/hi'

const SECTORS = [
  { id: 1,  name: 'Driving',               courses: 4,  enrolled: 120 },
  { id: 2,  name: 'Construction',           courses: 6,  enrolled: 85 },
  { id: 3,  name: 'Electrical',             courses: 5,  enrolled: 97 },
  { id: 4,  name: 'Health & Wellness',      courses: 3,  enrolled: 210 },
  { id: 5,  name: 'Heating & HVAC',         courses: 4,  enrolled: 60 },
  { id: 6,  name: 'ICT',                    courses: 8,  enrolled: 340 },
  { id: 7,  name: 'Social Services',        courses: 3,  enrolled: 75 },
  { id: 8,  name: 'Tourism & Hospitality',  courses: 5,  enrolled: 155 },
  { id: 9,  name: 'Human Resources',        courses: 4,  enrolled: 88 },
  { id: 10, name: 'Cybersecurity',          courses: 6,  enrolled: 200 },
]

const BG_GRADIENTS = [
  'linear-gradient(135deg,#0d4291,#1e5bb5)',
  'linear-gradient(135deg,#f97316,#fb923c)',
  'linear-gradient(135deg,#16a34a,#22c55e)',
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#0891b2,#06b6d4)',
  'linear-gradient(135deg,#dc2626,#ef4444)',
  'linear-gradient(135deg,#d97706,#f59e0b)',
  'linear-gradient(135deg,#0d4291,#7c3aed)',
  'linear-gradient(135deg,#16a34a,#0891b2)',
  'linear-gradient(135deg,#f97316,#dc2626)',
]

export default function AdminSectors() {
  return (
    <DashboardLayout
      navItems={adminNav}
      pageTitle="Sectors"
      pageSubtitle="View, edit, and delete sector details."
    >
      <div className="page-header">
        <span className="page-header__title">All Sectors</span>
        <button className="btn btn--primary"><HiPlus /> Add Sector</button>
      </div>

      <div className="sector-grid">
        {SECTORS.map((s, i) => (
          <div key={s.id} className="sector-card">
            <div className="sector-card__img-placeholder" style={{ background: BG_GRADIENTS[i % BG_GRADIENTS.length] }} />
            <div className="sector-card__body">
              <div className="sector-card__title">{s.name}</div>
              <div className="sector-card__meta">
                <HiUsers size={14} /> {s.enrolled} enrolled &nbsp;·&nbsp; {s.courses} courses
              </div>
            </div>
            <div className="sector-card__actions">
              <button className="btn btn--outline" style={{ flex: 1 }}>
                <HiPencil size={13} /> Edit
              </button>
              <button className="btn btn--danger" style={{ flex: 1 }}>
                <HiTrash size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
