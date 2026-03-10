import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { studentNav } from './studentNav'

const ASSIGNED = [
  { id: 1, title: 'Quiz: Barista Module 4',           course: 'Barista NCII',            due: 'Mar 15, 2026', type: 'Quiz' },
  { id: 2, title: 'Assignment: Coffee Extraction Lab', course: 'Barista NCII',            due: 'Mar 17, 2026', type: 'Assignment' },
  { id: 3, title: 'Quiz: Wiring Diagrams',             course: 'Electrical Installation', due: 'Mar 18, 2026', type: 'Quiz' },
  { id: 4, title: 'Practical: Safety Inspection',      course: 'Electrical Installation', due: 'Mar 20, 2026', type: 'Practical' },
  { id: 5, title: 'Quiz: Traffic Signs NC III',         course: 'Driving NC III',          due: 'Mar 21, 2026', type: 'Quiz' },
]

const COMPLETED = [
  { id: 6, title: 'Quiz: Barista Module 1',            course: 'Barista NCII',            submitted: 'Feb 20, 2026', score: '92/100' },
  { id: 7, title: 'Quiz: Barista Module 2',            course: 'Barista NCII',            submitted: 'Mar 1, 2026',  score: '88/100' },
  { id: 8, title: 'Assignment: Introduction Report',   course: 'Driving NC III',          submitted: 'Feb 28, 2026', score: '95/100' },
  { id: 9, title: 'Quiz: HTML Basics',                  course: 'Web Development',         submitted: 'Feb 15, 2026', score: '78/100' },
]

const TYPE_BADGE = { Quiz: 'blue', Assignment: 'amber', Practical: 'green' }

export default function StudentTasks() {
  const [tab, setTab] = useState('assigned')

  return (
    <DashboardLayout
      navItems={studentNav}
      pageTitle="Tasks"
      pageSubtitle="Track your assignments, quizzes, and submissions."
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <span className="badge badge--amber" style={{ fontSize: 13, padding: '4px 14px' }}>
          {ASSIGNED.length} pending
        </span>
      </div>

      <div className="task-tabs">
        <button
          className={`task-tab${tab === 'assigned' ? ' task-tab--active' : ''}`}
          onClick={() => setTab('assigned')}
        >
          Assigned ({ASSIGNED.length})
        </button>
        <button
          className={`task-tab${tab === 'completed' ? ' task-tab--active' : ''}`}
          onClick={() => setTab('completed')}
        >
          Completed ({COMPLETED.length})
        </button>
      </div>

      {tab === 'assigned' ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Course</th>
                <th>Type</th>
                <th>Due Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {ASSIGNED.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td style={{ color: 'var(--color-gray)' }}>{t.course}</td>
                  <td><span className={`badge badge--${TYPE_BADGE[t.type] || 'blue'}`}>{t.type}</span></td>
                  <td style={{ color: 'var(--color-gray)', fontSize: 13 }}>{t.due}</td>
                  <td>
                    <button className="btn btn--accent" style={{ padding: '4px 14px', fontSize: 12 }}>
                      Start
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Course</th>
                <th>Submitted</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {COMPLETED.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td style={{ color: 'var(--color-gray)' }}>{t.course}</td>
                  <td style={{ color: 'var(--color-gray)', fontSize: 13 }}>{t.submitted}</td>
                  <td><span className="badge badge--green">{t.score}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
