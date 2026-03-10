import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { studentNav } from './studentNav'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const EVENTS = {
  '2026-03-03': [{ title: 'Barista Quiz Module 4',     color: 'blue' }],
  '2026-03-05': [{ title: 'Driving Practical',         color: 'green' }],
  '2026-03-09': [{ title: 'Electrical Assignment Due', color: 'amber' }],
  '2026-03-10': [{ title: 'Today – Web Dev Module',    color: 'blue' }],
  '2026-03-12': [{ title: 'Trainer Meeting',            color: 'purple' }],
  '2026-03-15': [{ title: 'Barista Quiz',               color: 'amber' }, { title: 'Assignment Deadline', color: 'red' }],
  '2026-03-18': [{ title: 'Practical Test',             color: 'green' }],
  '2026-03-20': [{ title: 'Safety Inspection',          color: 'purple' }],
  '2026-03-22': [{ title: 'Group Discussion',           color: 'blue' }],
  '2026-03-25': [{ title: 'Final Project Submission',   color: 'red' }],
  '2026-03-28': [{ title: 'Review Session',             color: 'blue' }],
  '2026-03-30': [{ title: 'Exam Prep Workshop',         color: 'purple' }],
}

function pad(n) { return String(n).padStart(2, '0') }

export default function StudentCalendar() {
  const today = new Date(2026, 2, 10)
  const [view, setView] = useState({ year: 2026, month: 2 })

  const firstDay = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const prev = () => setView((v) => {
    const d = new Date(v.year, v.month - 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const next = () => setView((v) => {
    const d = new Date(v.year, v.month + 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <DashboardLayout
      navItems={studentNav}
      pageTitle="Calendar"
    >
      <div className="calendar-wrap">
        <div className="calendar-header">
          <button className="btn btn--outline" style={{ padding: '6px 10px' }} onClick={prev}>
            <HiChevronLeft />
          </button>
          <span className="calendar-header__title">
            {MONTHS[view.month]} {view.year}
          </span>
          <button className="btn btn--outline" style={{ padding: '6px 10px' }} onClick={next}>
            <HiChevronRight />
          </button>
        </div>

        <div className="calendar-grid">
          {DAYS.map((d) => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          {cells.map((day, idx) => {
            if (!day) return <div key={`blank-${idx}`} className="calendar-cell" />
            const key = `${view.year}-${pad(view.month + 1)}-${pad(day)}`
            const events = EVENTS[key] || []
            const isToday = day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear()
            return (
              <div key={key} className={`calendar-cell${isToday ? ' calendar-cell--today' : ''}`}>
                <div className="calendar-cell__num">{day}</div>
                {events.map((e, ei) => (
                  <div key={ei} className={`calendar-event calendar-event--${e.color}`}>{e.title}</div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        {[
          { color: 'blue',   label: 'Quizzes & Modules' },
          { color: 'green',  label: 'Practicals' },
          { color: 'amber',  label: 'Assignments' },
          { color: 'purple', label: 'Meetings & Workshops' },
          { color: 'red',    label: 'Deadlines' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className={`calendar-event calendar-event--${item.color}`} style={{ margin: 0, minWidth: 12, height: 12, borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: 'var(--color-gray)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
