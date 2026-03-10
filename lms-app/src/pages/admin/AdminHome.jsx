import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from './adminNav'
import { HiTrendingUp, HiUsers, HiBookOpen, HiBell, HiPlus } from 'react-icons/hi'

const stats = [
  { label: 'Total Users',      value: '1,284' },
  { label: 'Active Courses',   value: '48' },
  { label: 'Sectors',          value: '10' },
  { label: 'Enrollments',      value: '3,540' },
  { label: 'Completions',      value: '892' },
  { label: 'Pending Approvals',value: '17' },
]

const announcements = [
  {
    type: 'orange',
    title: 'New Training Programs Available',
    text:  'Three new TESDA-aligned programs have been added. Review and publish them from the Sectors page.',
  },
  {
    type: 'blue',
    title: 'System Maintenance Scheduled',
    text:  'Scheduled downtime on Saturday 2:00 AM – 4:00 AM. Notify affected users in advance.',
  },
]

const recentUsers = [
  { name: 'Maria Santos',   role: 'Student', status: 'Active',   date: 'Mar 10, 2026' },
  { name: 'Juan dela Cruz', role: 'Trainer', status: 'Active',   date: 'Mar 9, 2026' },
  { name: 'Ana Reyes',      role: 'Student', status: 'Pending',  date: 'Mar 9, 2026' },
  { name: 'Carlos Bautista',role: 'Student', status: 'Active',   date: 'Mar 8, 2026' },
  { name: 'Liza Villanueva',role: 'Trainer', status: 'Inactive', date: 'Mar 7, 2026' },
]

export default function AdminHome() {
  return (
    <DashboardLayout navItems={adminNav} pageTitle={null}>
      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__label">{s.label}</span>
            <span className="stat-card__value">{s.value}</span>
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

      {/* Recent users */}
      <div className="card">
        <div className="page-header">
          <span className="page-header__title">Recent Users</span>
          <button className="btn btn--primary">
            <HiPlus /> Add User
          </button>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.name}>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`badge badge--${
                      u.status === 'Active' ? 'green' :
                      u.status === 'Pending' ? 'amber' : 'red'
                    }`}>{u.status}</span>
                  </td>
                  <td>{u.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
