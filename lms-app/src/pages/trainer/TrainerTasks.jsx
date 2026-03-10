import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { trainerNav } from './trainerNav'
import { HiPlus, HiSearch, HiPencil, HiTrash, HiX } from 'react-icons/hi'

const ALL_TASKS = [
  { id:1,  name:'Prepare Barista Module 5 Quiz',     course:'Barista NCII',      due:'Mar 12, 2026', status:'Pending',   tab:'assigned' },
  { id:2,  name:'Grade Lab Reports Batch 16',         course:'Barista NCII',      due:'Mar 10, 2026', status:'Overdue',   tab:'assigned' },
  { id:3,  name:'Upload Electrical Wiring Materials', course:'Basic Electrical',   due:'Mar 14, 2026', status:'Pending',   tab:'assigned' },
  { id:4,  name:'Review Student Portfolios',          course:'Barista NCII',      due:'Mar 15, 2026', status:'In Review', tab:'assigned' },
  { id:5,  name:'Post Grades for Module 4',           course:'ICT Web Dev',       due:'Mar 13, 2026', status:'Pending',   tab:'assigned' },
  { id:6,  name:'Schedule Practical Exam',            course:'Basic Electrical',   due:'Mar 18, 2026', status:'Pending',   tab:'assigned' },
  { id:7,  name:'Respond to Student Questions',       course:'Barista NCII',      due:'Mar 11, 2026', status:'Overdue',   tab:'assigned' },
  { id:8,  name:'Update Course Materials',            course:'ICT Web Dev',       due:'Mar 20, 2026', status:'In Review', tab:'assigned' },
  { id:9,  name:'Create Module 4 Study Guide',        course:'Barista NCII',      due:'Mar 5, 2026',  status:'Completed', tab:'completed' },
  { id:10, name:'Post Announcement — Mid-term',       course:'All Courses',       due:'Mar 4, 2026',  status:'Completed', tab:'completed' },
  { id:11, name:'Grade Module 3 Quizzes',             course:'ICT Web Dev',       due:'Mar 3, 2026',  status:'Completed', tab:'completed' },
  { id:12, name:'Upload Lab Report Template',         course:'Basic Electrical',   due:'Mar 2, 2026',  status:'Completed', tab:'completed' },
  { id:13, name:'Orientation Meeting Notes',          course:'Barista NCII',      due:'Mar 1, 2026',  status:'Completed', tab:'completed' },
]

const PAGE_SIZE = 5
const COURSES = ['Barista NCII', 'Basic Electrical', 'ICT Web Dev', 'All Courses']

const statusBadge = (s) =>
  s === 'Pending'   ? 'badge--amber' :
  s === 'In Review' ? 'badge--blue'  :
  s === 'Overdue'   ? 'badge--red'   : 'badge--green'

const EMPTY_FORM = { name:'', course:'Barista NCII', due:'', desc:'' }

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', borderRadius:12, padding:'28px 32px', width:480, maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontFamily:'var(--font-poppins)', fontWeight:700, fontSize:18, color:'var(--color-dark)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', cursor:'pointer', color:'#6b7280' }}><HiX size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function TrainerTasks() {
  const [tasks, setTasks]           = useState(ALL_TASKS)
  const [tab, setTab]               = useState('assigned')
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [modalOpen, setModalOpen]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const filtered = tasks.filter(
    (t) => t.tab === tab &&
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
       t.course.toLowerCase().includes(search.toLowerCase()))
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, totalPages)
  const rows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  const handleSearch = (v) => { setSearch(v); setPage(1) }
  const handleTab = (t) => { setTab(t); setSearch(''); setPage(1) }

  const handleCreate = () => {
    if (!form.name.trim()) return
    const newTask = {
      id: Date.now(),
      name: form.name,
      course: form.course,
      due: form.due || 'No due date',
      status: 'Pending',
      tab: 'assigned',
    }
    setTasks((prev) => [newTask, ...prev])
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setTab('assigned')
    setPage(1)
  }

  const handleDelete = () => {
    setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <DashboardLayout
      navItems={trainerNav}
      pageTitle="Tasks"
      pageSubtitle="Manage your class tasks and deadlines."
    >
      {/* Tab bar */}
      <div className="task-tabs">
        <button className={`task-tab${tab === 'assigned' ? ' task-tab--active' : ''}`} onClick={() => handleTab('assigned')}>
          Assigned ({tasks.filter(t => t.tab === 'assigned').length})
        </button>
        <button className={`task-tab${tab === 'completed' ? ' task-tab--active' : ''}`} onClick={() => handleTab('completed')}>
          Completed ({tasks.filter(t => t.tab === 'completed').length})
        </button>
      </div>

      <div className="data-table-wrap">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <HiSearch style={{ color:'#9ca3af' }} />
            <input
              className="table-search"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {tab === 'assigned' && (
            <button className="btn btn--primary" onClick={() => setModalOpen(true)}>
              <HiPlus /> Create Task
            </button>
          )}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Task Name</th>
              <th>Course</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:'center', color:'#9ca3af', padding:'32px 0' }}>No tasks found.</td></tr>
            ) : (
              rows.map((t, i) => (
                <tr key={t.id}>
                  <td style={{ color:'#9ca3af' }}>{(curPage - 1) * PAGE_SIZE + i + 1}</td>
                  <td style={{ fontWeight:500 }}>{t.name}</td>
                  <td style={{ color:'#6b7280' }}>{t.course}</td>
                  <td style={{ color: t.status === 'Overdue' ? '#dc2626' : '#6b7280' }}>{t.due}</td>
                  <td><span className={`badge ${statusBadge(t.status)}`}>{t.status}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn--outline" style={{ padding:'4px 8px' }} title="Edit"><HiPencil size={14} /></button>
                      <button className="btn btn--danger"  style={{ padding:'4px 8px' }} title="Delete" onClick={() => setDeleteTarget(t)}><HiTrash size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="pagination">
          <span style={{ fontSize:12, color:'#9ca3af', marginRight:8 }}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`pagination__btn${n === curPage ? ' pagination__btn--active' : ''}`} onClick={() => setPage(n)}>{n}</button>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <Modal title="Create Task" onClose={() => { setModalOpen(false); setForm(EMPTY_FORM) }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--color-dark)', display:'block', marginBottom:4 }}>Task Name</label>
              <input className="settings-input" style={{ width:'100%' }} placeholder="Task name" value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--color-dark)', display:'block', marginBottom:4 }}>Course</label>
              <select className="settings-input" style={{ width:'100%' }} value={form.course} onChange={(e) => setField('course', e.target.value)}>
                {COURSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--color-dark)', display:'block', marginBottom:4 }}>Due Date</label>
              <input className="settings-input" style={{ width:'100%' }} type="date" value={form.due} onChange={(e) => setField('due', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:500, color:'var(--color-dark)', display:'block', marginBottom:4 }}>Description (optional)</label>
              <textarea className="settings-input" style={{ width:'100%', height:80, padding:'8px 14px', resize:'vertical' }} placeholder="Task description…" value={form.desc} onChange={(e) => setField('desc', e.target.value)} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:4 }}>
              <button className="btn btn--outline" onClick={() => { setModalOpen(false); setForm(EMPTY_FORM) }}>Cancel</button>
              <button className="btn btn--primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <Modal title="Delete Task" onClose={() => setDeleteTarget(null)}>
          <p style={{ fontFamily:'var(--font-poppins)', fontSize:14, color:'#374151', marginBottom:24 }}>
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
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
