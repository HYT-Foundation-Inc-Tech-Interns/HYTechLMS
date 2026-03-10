import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from './adminNav'
import { HiPlus, HiSearch, HiPencil, HiTrash, HiX } from 'react-icons/hi'

const ALL_USERS = [
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

const PAGE_SIZE = 5

const EMPTY_FORM = { name: '', email: '', role: 'Student', status: 'Active' }

const roleBadge   = (r) => r === 'Admin' ? 'blue' : r === 'Trainer' ? 'amber' : 'green'
const statusBadge = (s) => s === 'Active' ? 'green' : s === 'Pending' ? 'amber' : 'red'

/* ── Inline modal ─────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12,
        padding: '28px 32px', width: 460, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700, fontSize: 18, color: 'var(--color-dark)' }}>
            {title}
          </span>
          <button onClick={onClose} style={{ background: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <HiX size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function UserForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-dark)', display: 'block', marginBottom: 4 }}>Full Name</label>
        <input className="settings-input" style={{ width: '100%' }} value={form.name}   onChange={(e) => set('name', e.target.value)}  placeholder="Full Name" />
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-dark)', display: 'block', marginBottom: 4 }}>Email Address</label>
        <input className="settings-input" style={{ width: '100%' }} value={form.email}  onChange={(e) => set('email', e.target.value)} placeholder="Email" type="email" />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-dark)', display: 'block', marginBottom: 4 }}>Role</label>
          <select className="settings-input" style={{ width: '100%' }} value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option>Student</option>
            <option>Trainer</option>
            <option>Admin</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-dark)', display: 'block', marginBottom: 4 }}>Status</label>
          <select className="settings-input" style={{ width: '100%' }} value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option>Active</option>
            <option>Pending</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button className="btn btn--outline" onClick={onCancel}>Cancel</button>
        <button className="btn btn--primary" onClick={() => onSave(form)}>Save</button>
      </div>
    </div>
  )
}

export default function AdminUserManagement() {
  const [users, setUsers]         = useState(ALL_USERS)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [addOpen, setAddOpen]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)   // user object
  const [deleteTarget, setDeleteTarget] = useState(null) // user object

  /* Filtering & pagination */
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  /* Handlers */
  const handleAdd = (form) => {
    const newUser = { ...form, id: Date.now(), joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    setUsers((prev) => [...prev, newUser])
    setAddOpen(false)
    setPage(Math.ceil((users.length + 1) / PAGE_SIZE))
  }

  const handleEdit = (form) => {
    setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? { ...u, ...form } : u)))
    setEditTarget(null)
  }

  const handleDelete = () => {
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    setDeleteTarget(null)
    if (pageRows.length === 1 && currentPage > 1) setPage(currentPage - 1)
  }

  const handleSearch = (val) => { setSearch(val); setPage(1) }

  return (
    <DashboardLayout
      navItems={adminNav}
      pageTitle="User Management"
      pageSubtitle="Manage system users, roles, and access."
    >
      <div className="data-table-wrap">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiSearch style={{ color: '#9ca3af' }} />
            <input
              className="table-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--outline">Filter</button>
            <button className="btn btn--primary" onClick={() => setAddOpen(true)}>
              <HiPlus /> Add User
            </button>
          </div>
        </div>

        {/* Table */}
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
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>
                  No users found.
                </td>
              </tr>
            ) : (
              pageRows.map((u) => (
                <tr key={u.id}>
                  <td style={{ color: '#9ca3af' }}>{u.id}</td>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ color: '#6b7280' }}>{u.email}</td>
                  <td><span className={`badge badge--${roleBadge(u.role)}`}>{u.role}</span></td>
                  <td><span className={`badge badge--${statusBadge(u.status)}`}>{u.status}</span></td>
                  <td style={{ color: '#6b7280' }}>{u.joined}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn--outline"
                        style={{ padding: '4px 8px' }}
                        onClick={() => setEditTarget(u)}
                        title="Edit user"
                      >
                        <HiPencil size={14} />
                      </button>
                      <button
                        className="btn btn--danger"
                        style={{ padding: '4px 8px' }}
                        onClick={() => setDeleteTarget(u)}
                        title="Delete user"
                      >
                        <HiTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination">
          <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 8 }}>
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
          </span>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`pagination__btn${n === currentPage ? ' pagination__btn--active' : ''}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {addOpen && (
        <Modal title="Add New User" onClose={() => setAddOpen(false)}>
          <UserForm initial={EMPTY_FORM} onSave={handleAdd} onCancel={() => setAddOpen(false)} />
        </Modal>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <Modal title={`Edit — ${editTarget.name}`} onClose={() => setEditTarget(null)}>
          <UserForm initial={editTarget} onSave={handleEdit} onCancel={() => setEditTarget(null)} />
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <p style={{ fontFamily: 'var(--font-poppins)', fontSize: 14, color: '#374151', marginBottom: 24 }}>
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn--outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn--danger" onClick={handleDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}
