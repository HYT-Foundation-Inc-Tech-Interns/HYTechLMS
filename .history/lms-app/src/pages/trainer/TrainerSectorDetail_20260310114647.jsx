import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { trainerNav } from './trainerNav'
import { HiChevronLeft } from 'react-icons/hi'

const SECTOR_DATA = {
  health: {
    name: 'Health & Wellness',
    trainings: [
      { id: 1, title: 'Hilot (Wellness Massage)',  ncLevel: 'NC I',  tag: 'Popular', enrolled: 45  },
      { id: 2, title: 'Caregiving',                ncLevel: 'NC II', tag: 'Popular', enrolled: 120 },
      { id: 3, title: 'Health Care Services',      ncLevel: 'NC III',tag: 'New',     enrolled: 18  },
      { id: 4, title: 'Dialysis Technology',       ncLevel: 'NC III',tag: '',        enrolled: 12  },
    ],
  },
  ict: {
    name: 'ICT',
    trainings: [
      { id: 1, title: 'Web Development',              ncLevel: 'NC II',  tag: 'Popular', enrolled: 200 },
      { id: 2, title: 'Computer Systems Servicing',   ncLevel: 'NC II',  tag: 'Popular', enrolled: 180 },
      { id: 3, title: 'Contact Center Services',      ncLevel: 'NC II',  tag: '',        enrolled: 90  },
      { id: 4, title: 'Animation',                    ncLevel: 'NC III', tag: 'New',     enrolled: 35  },
      { id: 5, title: 'Cybersecurity',                ncLevel: 'NC III', tag: '',        enrolled: 28  },
    ],
  },
  construction: {
    name: 'Construction',
    trainings: [
      { id: 1, title: 'Masonry',                   ncLevel: 'NC II',  tag: 'Popular', enrolled: 75 },
      { id: 2, title: 'Carpentry',                 ncLevel: 'NC II',  tag: '',        enrolled: 60 },
      { id: 3, title: 'Plumbing',                  ncLevel: 'NC I',   tag: 'New',     enrolled: 40 },
      { id: 4, title: 'Welding',                   ncLevel: 'NC III', tag: '',        enrolled: 55 },
    ],
  },
  electrical: {
    name: 'Electrical',
    trainings: [
      { id: 1, title: 'Electrical Installation & Maintenance', ncLevel: 'NC II',  tag: 'Popular', enrolled: 95 },
      { id: 2, title: 'Solar Panel Installation',             ncLevel: 'NC II',  tag: 'New',     enrolled: 30 },
      { id: 3, title: 'Industrial Wiring',                    ncLevel: 'NC III', tag: '',        enrolled: 22 },
    ],
  },
  tourism: {
    name: 'Tourism & Hospitality',
    trainings: [
      { id: 1, title: 'Barista NCII',                     ncLevel: 'NC II',  tag: 'Popular', enrolled: 150 },
      { id: 2, title: 'Food & Beverage Services',         ncLevel: 'NC II',  tag: 'Popular', enrolled: 110 },
      { id: 3, title: 'Cookery',                          ncLevel: 'NC II',  tag: '',        enrolled: 85  },
      { id: 4, title: 'Housekeeping',                     ncLevel: 'NC I',   tag: '',        enrolled: 70  },
      { id: 5, title: 'Tour Guiding Services',            ncLevel: 'NC II',  tag: 'New',     enrolled: 25  },
      { id: 6, title: 'Bread & Pastry Production',        ncLevel: 'NC II',  tag: 'Popular', enrolled: 130 },
    ],
  },
  driving: {
    name: 'Driving',
    trainings: [
      { id: 1, title: 'Driving NC II',          ncLevel: 'NC II', tag: 'Popular', enrolled: 200 },
      { id: 2, title: 'Heavy Equipment Operation', ncLevel: 'NC II', tag: '',     enrolled: 45  },
    ],
  },
}

export default function TrainerSectorDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const sector = SECTOR_DATA[slug] || SECTOR_DATA['health']
  const filtered = sector.trainings.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout
      navItems={trainerNav}
      pageTitle={sector.name}
      pageSubtitle="Training Regulations"
    >
      {/* Back Link */}
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 14,
          color: 'var(--color-primary)',
          marginBottom: 16,
          padding: 0,
          fontFamily: 'var(--font-poppins)',
          fontWeight: 500,
        }}
        onClick={() => navigate('/trainer/sectors')}
      >
        <HiChevronLeft style={{ fontSize: 16 }} />
        Back to Sectors
      </button>

      {/* Heading */}
      <h2
        style={{
          fontFamily: 'var(--font-poppins)',
          fontWeight: 700,
          fontSize: 28,
          color: 'var(--color-dark)',
          margin: 0,
          marginBottom: 4,
        }}
      >
        {sector.name}
      </h2>
      <div style={{ fontSize: 14, color: 'var(--color-gray)', marginBottom: 20 }}>
        Training Regulations
      </div>

      {/* Search */}
      <input
        className="table-search"
        placeholder="Search trainings…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: 320, marginBottom: 20 }}
      />

      {/* Training List */}
      <div>
        {filtered.map((training, i) => (
          <div
            key={training.id}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 10,
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Rank */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(13,66,145,0.10)',
                color: 'var(--color-primary)',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: '36px',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>

            {/* Title */}
            <div
              style={{
                fontFamily: 'var(--font-poppins)',
                fontWeight: 600,
                fontSize: 15,
                color: 'var(--color-dark)',
                flex: 1,
                minWidth: 0,
              }}
            >
              {training.title}
            </div>

            {/* NC Level Badge */}
            <span className="badge badge--blue">{training.ncLevel}</span>

            {/* Popular / New Badge */}
            {training.tag === 'Popular' && (
              <span className="badge badge--green">Popular</span>
            )}
            {training.tag === 'New' && (
              <span className="badge badge--amber">New</span>
            )}

            {/* Enrolled */}
            <span style={{ fontSize: 12, color: 'var(--color-gray)', whiteSpace: 'nowrap' }}>
              {training.enrolled} enrolled
            </span>

            {/* View Button */}
            <button
              className="btn btn--outline"
              style={{ padding: '4px 12px', fontSize: 13 }}
            >
              View
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              fontSize: 14,
              color: 'var(--color-gray)',
            }}
          >
            No trainings match your search.
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
