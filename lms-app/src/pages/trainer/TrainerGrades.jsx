import { useOutletContext } from 'react-router-dom'
import { HiDownload } from 'react-icons/hi'

const STUDENTS = [
  { name: 'Ana Reyes',       lab: 95, quiz: 88, disc: 90, att: 100 },
  { name: 'Carlos Bautista', lab: 78, quiz: 82, disc: 75, att: 90  },
  { name: 'Pedro Ramos',     lab: 65, quiz: 70, disc: 68, att: 85  },
  { name: 'Rosa Macaraeg',   lab: 98, quiz: 96, disc: 92, att: 100 },
  { name: 'Elena Soriano',   lab: 55, quiz: 48, disc: 60, att: 80  },
  { name: 'Marco Flores',    lab: 82, quiz: 79, disc: 85, att: 95  },
]

function computeFinal(s) {
  return Math.round((s.lab * 0.3 + s.quiz * 0.4 + s.disc * 0.2 + s.att * 0.1) * 10) / 10
}

function gradeBadge(final) {
  if (final >= 80) return 'badge--green'
  if (final >= 70) return 'badge--amber'
  return 'badge--red'
}

const SUMMARY_PILLS = [
  { label: 'Class Average', value: '78%' },
  { label: 'Highest Score', value: '98%' },
  { label: 'Lowest Score',  value: '48%' },
]

export default function TrainerGrades() {
  const { course } = useOutletContext()

  return (
    <div>
      {/* Summary Pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {SUMMARY_PILLS.map(p => (
          <div
            key={p.label}
            style={{
              background: 'white',
              borderRadius: 8,
              padding: '10px 20px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 120,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-poppins)',
                fontWeight: 700,
                fontSize: 22,
                color: 'var(--color-dark)',
              }}
            >
              {p.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-gray)', marginTop: 2 }}>{p.label}</div>
          </div>
        ))}
      </div>

      {/* Grade Table */}
      <div className="data-table-wrap">
        {/* Toolbar */}
        <div
          className="table-toolbar"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
        >
          <span
            style={{
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: 17,
              color: 'var(--color-dark)',
            }}
          >
            Grade Overview
          </span>
          <button
            className="btn btn--outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <HiDownload style={{ fontSize: 16 }} />
            Export Grades
          </button>
        </div>

        {/* Table */}
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Student Name', 'Lab Report (30%)', 'Module Quiz (40%)', 'Discussion (20%)', 'Attendance (10%)', 'Final Grade'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '12px 14px',
                    textAlign: h === '#' ? 'center' : 'left',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-gray)',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: 'nowrap',
                    background: '#f9fafb',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STUDENTS.map((s, i) => {
              const final = computeFinal(s)
              const badge = gradeBadge(final)
              return (
                <tr
                  key={s.name}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 14, color: 'var(--color-gray)' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, color: 'var(--color-dark)', fontFamily: 'var(--font-poppins)' }}>
                    {s.name}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 14, color: 'var(--color-dark)' }}>{s.lab}</td>
                  <td style={{ padding: '12px 14px', fontSize: 14, color: 'var(--color-dark)' }}>{s.quiz}</td>
                  <td style={{ padding: '12px 14px', fontSize: 14, color: 'var(--color-dark)' }}>{s.disc}</td>
                  <td style={{ padding: '12px 14px', fontSize: 14, color: 'var(--color-dark)' }}>{s.att}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-dark)', marginRight: 8 }}>
                      {final}
                    </span>
                    <span className={`badge ${badge}`}>{final >= 80 ? 'Pass' : final >= 70 ? 'Conditional' : 'Fail'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
