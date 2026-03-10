import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from './adminNav'
import { HiPlus, HiSearch, HiPencil, HiTrash } from 'react-icons/hi'

const USERS = [
  { id: 1,  name: 'Maria Santos',    email: 'maria@hytech.edu',    role: 'Student', status: 'Active',   joined: 'Jan 5, 2026' },
  { id: 2,  name: 'Juan dela Cruz',  email: 'juan@hytech.edu',     role: 'Trainer', status: 'Active',   joined: 'Jan 8, 2026' },
  { id: 3,  name: 'Ana Reyes',       email: 'ana@hytech.edu',      role: 'Student', status: 'Pending',  joined: 'Feb 1, 2026' },
  { id: 4,  name: 'Carlos Bautista', email: 'carlos@hytech.edu',   role: 'Student', status: 'Active',   joined: 'Feb 10, 2026' },
  { id: 5,  name: 'Liza Villanueva', email: 'liza@hytech.edu',     role: 'Trainer', status: 'Inactive', joined: 'Feb 14, 2026' },
  { id: 6,  name: 'Pedro Ramos',     email: 'pedro@hytech.edu',    role: 'Student', status: 'Active',   joined: 'Feb 20, 2026' },
  { id: 7,  name: 'Rosa Macaraeg',   email: 'rosa@hytech.edu',     role: 'Student', status: 'Active',   joined: 'Mar 1, 2026' },
  { id: 8,  name: 'Danilo Cruz',     email: 'danilo@hytech.edu',   role: 'Admin',   status: 'Active',   joined: 'Mar 2, 2026' },
  { id: 9,  name: 'Elena Soriano',   email: 'elena@hytech.edu',    role: 'Student', status: 'Active',   joined: 'Mar 3, 2026' },
  { id: 10, name: 'Marco Flores',    email: 'marco@hytech.edu',    role: 'Trainer', status: 'Active',   joined: 'Mar 5, 2026' },
  { id: 11, name: 'Grace Aquino',    email: 'grace@hytech.edu',    role: 'Student', status: 'Pending',  joined: 'Mar 6, 2026' },
  { id: 12, name: 'Paolo Mendoza',   email: 'paolo@hytech.edu',    role: 'Student', status: 'Active',   joined: 'Mar 8, 2026' },
]

export default function AdminUserManagement() {
  const [search, setSearch] = useState('')

  const filtered = USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout
      navItems={adminNav}
      pageTitle="User Management"
      pageSubtitle="Your earned certifications and progress toward new ones."
    >
      <div className="data-table-wrap">
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiSearch style={{ color: '#9ca3af' }} />
            <input
              className="table-search"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--outline">Filter</button>
            <button className="btn btn--primary"><HiPlus /> Add User</button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Date Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td style={{ color: '#6b7280' }}>{u.email}</td>
                <td>
                  <span className={`badge badge--${
                    u.role === 'Admin' ? 'blue' :
                    u.role === 'Trainer' ? 'amber' : 'green'
                  }`}>{u.role}</span>
                </td>
                <td>
                  <span className={`badge badge--${
                    u.status === 'Active' ? 'green' :
                    u.status === 'Pending' ? 'amber' : 'red'
                  }`}>{u.status}</span>
                </td>
                <td style={{ color: '#6b7280' }}>{u.joined}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn--outline" style={{ padding: '4px 8px' }}>
                      <HiPencil size={14} />
                    </button>
                    <button className="btn btn--danger" style={{ padding: '4px 8px' }}>
                      <HiTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          {[1, 2, 3].map((n) => (
            <button key={n} className={`pagination__btn${n === 1 ? ' pagination__btn--active' : ''}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
