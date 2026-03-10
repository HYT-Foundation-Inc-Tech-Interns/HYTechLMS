import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { HiSearch, HiPlus } from 'react-icons/hi'

const INITIAL_STUDENTS = [
  { id: 1, name: 'Ana Reyes',       initials: 'A', bg: '#16a34a' },
  { id: 2, name: 'Carlos Bautista', initials: 'C', bg: '#7c3aed' },
  { id: 3, name: 'Pedro Ramos',     initials: 'P', bg: '#f97316' },
]

export default function TrainerPeople() {
  const { course } = useOutletContext()
  const [search, setSearch]     = useState('')
  const [students, setStudents] = useState(INITIAL_STUDENTS)

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleRemove = id => {
    setStudents(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div>
      {/* Trainers Section */}
      <div
        style={{
          fontFamily: 'var(--font-poppins)',
          fontWeight: 600,
          fontSize: 24,
          color: 'var(--color-dark)',
          marginBottom: 16,
        }}
      >
        Trainers
      </div>

      {/* Trainer Row */}
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          padding: '0 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 0',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            M
          </div>
          <div
            style={{
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--color-dark)',
              flex: 1,
            }}
          >
            Maria Clara Garcia
          </div>
          <span className="badge badge--blue" style={{ marginLeft: 'auto' }}>
            Trainer
          </span>
        </div>
      </div>

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />

      {/* Students Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-poppins)',
            fontWeight: 600,
            fontSize: 24,
            color: 'var(--color-dark)',
          }}
        >
          Students
        </div>
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{ position: 'relative', width: 240 }}>
          <HiSearch
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-gray)',
              fontSize: 16,
              pointerEvents: 'none',
            }}
          />
          <input
            className="table-search"
            placeholder="Search students…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 34 }}
          />
        </div>
        <button
          className="btn btn--primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <HiPlus style={{ fontSize: 16 }} />
          Invite student
        </button>
      </div>

      {/* Students List */}
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          padding: '0 20px',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '32px 0',
              textAlign: 'center',
              fontSize: 14,
              color: 'var(--color-gray)',
            }}
          >
            {students.length === 0
              ? 'No students yet. Invite students to get started.'
              : 'No students match your search.'}
          </div>
        ) : (
          filtered.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 0',
                borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: s.bg,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 17,
                  flexShrink: 0,
                }}
              >
                {s.initials}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-poppins)',
                  fontWeight: 600,
                  fontSize: 15,
                  color: 'var(--color-dark)',
                  flex: 1,
                }}
              >
                {s.name}
              </div>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: 'var(--color-gray)',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '0 4px',
                  marginLeft: 'auto',
                }}
                title="Remove student"
                onClick={() => handleRemove(s.id)}
              >
                ⋮
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
