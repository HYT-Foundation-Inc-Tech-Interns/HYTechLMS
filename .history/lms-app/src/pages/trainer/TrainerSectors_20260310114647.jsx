import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { trainerNav } from './trainerNav'
import {
  HiHeart,
  HiDesktopComputer,
  HiHome,
  HiLightningBolt,
  HiStar,
  HiTruck,
  HiChevronRight,
} from 'react-icons/hi'

const SECTORS = [
  { slug: 'health',       name: 'Health & Wellness',    count: 3, icon: HiHeart,           color: '#16a34a' },
  { slug: 'ict',          name: 'ICT',                  count: 5, icon: HiDesktopComputer,  color: '#0d4291' },
  { slug: 'construction', name: 'Construction',         count: 4, icon: HiHome,             color: '#d97706' },
  { slug: 'electrical',   name: 'Electrical',           count: 3, icon: HiLightningBolt,    color: '#7c3aed' },
  { slug: 'tourism',      name: 'Tourism & Hospitality',count: 6, icon: HiStar,             color: '#f97316' },
  { slug: 'driving',      name: 'Driving',              count: 2, icon: HiTruck,            color: '#0891b2' },
]

export default function TrainerSectors() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const filtered = SECTORS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout
      navItems={trainerNav}
      pageTitle="Sectors"
      pageSubtitle="Browse available training sectors."
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-poppins)',
            fontWeight: 700,
            fontSize: 24,
            color: 'var(--color-dark)',
            margin: 0,
          }}
        >
          Training Sectors
        </h1>
        <input
          className="table-search"
          placeholder="Search sectors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      {/* Sector Rows */}
      <div>
        {filtered.map(sector => {
          const Icon = sector.icon
          return (
            <div
              key={sector.slug}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: '16px 20px',
                marginBottom: 12,
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* Icon Circle */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: sector.color + '26',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon style={{ fontSize: 24, color: sector.color }} />
              </div>

              {/* Name */}
              <div
                style={{
                  fontFamily: 'var(--font-poppins)',
                  fontWeight: 600,
                  fontSize: 16,
                  color: 'var(--color-dark)',
                }}
              >
                {sector.name}
              </div>

              {/* Count text */}
              <div style={{ fontSize: 13, color: 'var(--color-gray)', marginLeft: 4 }}>
                {sector.count} Trainings
              </div>

              {/* Right side */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge--blue">{sector.count} Trainings</span>
                <button
                  className="btn btn--outline"
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => navigate(`/trainer/sectors/${sector.slug}`)}
                >
                  View
                  <HiChevronRight style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              fontSize: 14,
              color: 'var(--color-gray)',
            }}
          >
            No sectors match your search.
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
