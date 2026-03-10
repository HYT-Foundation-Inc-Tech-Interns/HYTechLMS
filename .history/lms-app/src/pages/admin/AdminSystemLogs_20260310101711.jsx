import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from './adminNav'
import { HiSearch } from 'react-icons/hi'

const LOGS = [
  { id: 1,  user: 'admin@hytech.edu',   action: 'Created user account',          module: 'User Management', level: 'Info',    date: 'Mar 10, 2026 09:12' },
  { id: 2,  user: 'maria@hytech.edu',   action: 'Logged in',                      module: 'Auth',            level: 'Info',    date: 'Mar 10, 2026 08:55' },
  { id: 3,  user: 'juan@hytech.edu',    action: 'Uploaded course material',        module: 'Courses',         level: 'Info',    date: 'Mar 10, 2026 08:30' },
  { id: 4,  user: 'ana@hytech.edu',     action: 'Failed login attempt',            module: 'Auth',            level: 'Warning', date: 'Mar 9, 2026 22:14' },
  { id: 5,  user: 'admin@hytech.edu',   action: 'Deleted sector: Baking',          module: 'Sectors',         level: 'Warning', date: 'Mar 9, 2026 16:40' },
  { id: 6,  user: 'carlos@hytech.edu',  action: 'Submitted quiz: NCII Module 3',   module: 'Tasks',           level: 'Info',    date: 'Mar 9, 2026 14:22' },
  { id: 7,  user: 'liza@hytech.edu',    action: 'Updated course: Barista NCII',    module: 'Courses',         level: 'Info',    date: 'Mar 9, 2026 11:05' },
  { id: 8,  user: 'admin@hytech.edu',   action: 'System backup completed',         module: 'System',          level: 'Info',    date: 'Mar 9, 2026 02:00' },
  { id: 9,  user: 'marco@hytech.edu',   action: 'Exported grades report',          module: 'Reports',         level: 'Info',    date: 'Mar 8, 2026 17:48' },
  { id: 10, user: 'grace@hytech.edu',   action: 'Password reset requested',        module: 'Auth',            level: 'Warning', date: 'Mar 8, 2026 15:30' },
  { id: 11, user: 'admin@hytech.edu',   action: 'Settings updated: session timeout',module: 'Settings',        level: 'Info',    date: 'Mar 8, 2026 10:12' },
  { id: 12, user: 'danilo@hytech.edu',  action: 'Access control rule updated',     module: 'Settings',        level: 'Info',    date: 'Mar 7, 2026 09:00' },
  { id: 13, user: 'system',             action: 'Database error: connection timeout',module: 'System',         level: 'Error',   date: 'Mar 6, 2026 03:22' },
]

export default function AdminSystemLogs() {
  const [search, setSearch] = useState('')

  const filtered = LOGS.filter(
    (l) =>
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.module.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout
      navItems={adminNav}
      pageTitle="System Logs"
      pageSubtitle="Track all user activity and system events."
    >
      <div className="data-table-wrap">
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiSearch style={{ color: '#9ca3af' }} />
            <input
              className="table-search"
              placeholder="Search logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn--outline">Export</button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Level</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td style={{ color: '#374151', fontWeight: 500 }}>{l.user}</td>
                <td>{l.action}</td>
                <td><span className="badge badge--blue">{l.module}</span></td>
                <td>
                  <span className={`badge badge--${
                    l.level === 'Info'    ? 'green' :
                    l.level === 'Warning' ? 'amber' : 'red'
                  }`}>{l.level}</span>
                </td>
                <td style={{ color: '#6b7280', fontSize: 13 }}>{l.date}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className={`pagination__btn${n === 1 ? ' pagination__btn--active' : ''}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
