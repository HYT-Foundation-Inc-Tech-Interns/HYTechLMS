import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { trainerNav } from './trainerNav'
import { HiUpload, HiTrash, HiX, HiArchive } from 'react-icons/hi'

const INITIAL = [
  { id: 1, title: 'Barista NCII — Batch 14',             date: 'Jan 2026', students: 38, color: 'linear-gradient(135deg,#f97316,#fb923c)' },
  { id: 2, title: 'Food Safety Fundamentals — Batch 2',  date: 'Dec 2025', students: 22, color: 'linear-gradient(135deg,#16a34a,#22c55e)' },
  { id: 3, title: 'Intro to ICT — Batch 1',              date: 'Nov 2025', students: 30, color: 'linear-gradient(135deg,#0891b2,#06b6d4)' },
  { id: 4, title: 'Driving NC II — Batch 7',             date: 'Oct 2025', students: 28, color: 'linear-gradient(135deg,#d97706,#f59e0b)' },
]

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', borderRadius:12, padding:'28px 32px', width:420, maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontFamily:'var(--font-poppins)', fontWeight:700, fontSize:18, color:'var(--color-dark)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', cursor:'pointer', color:'#6b7280' }}><HiX size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function TrainerArchivedCourses() {
  const [courses, setCourses] = useState(INITIAL)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const handleRestore = (course) => {
    setCourses((prev) => prev.filter((c) => c.id !== course.id))
    alert(`"${course.title}" has been restored to your active courses.`)
  }

  const handleDelete = () => {
    setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <DashboardLayout
      navItems={trainerNav}
      pageTitle="Archived Courses"
      pageSubtitle="Restore or permanently delete archived course records."
    >
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span className="page-header__title">Archived Courses</span>
          <span className="badge badge--blue">{courses.length}</span>
        </div>
      </div>

      {courses.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 0', color:'var(--color-gray)' }}>
          <HiArchive size={48} style={{ marginBottom:12, opacity:0.3 }} />
          <p style={{ fontFamily:'var(--font-poppins)', fontSize:16 }}>No archived courses.</p>
        </div>
      ) : (
        <div className="sector-grid">
          {courses.map((c) => (
            <div key={c.id} className="sector-card">
              <div className="sector-card__img-placeholder" style={{ background: c.color }} />
              <div className="sector-card__body">
                <div className="sector-card__title">{c.title}</div>
                <div style={{ fontSize:13, color:'var(--color-gray)', marginTop:4 }}>
                  Archived: {c.date}
                </div>
                <div style={{ fontSize:13, color:'var(--color-gray)', marginTop:2 }}>
                  {c.students} students
                </div>
              </div>
              <div className="sector-card__actions">
                <button className="btn btn--outline" style={{ flex:1 }} onClick={() => handleRestore(c)}>
                  <HiUpload size={13} /> Restore
                </button>
                <button className="btn btn--danger" style={{ flex:1 }} onClick={() => setDeleteTarget(c)}>
                  <HiTrash size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <Modal title="Delete Course" onClose={() => setDeleteTarget(null)}>
          <p style={{ fontFamily:'var(--font-poppins)', fontSize:14, color:'#374151', marginBottom:24 }}>
            Are you sure you want to permanently delete <strong>{deleteTarget.title}</strong>? This cannot be undone.
          </p>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button className="btn btn--outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn--danger" onClick={handleDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}
