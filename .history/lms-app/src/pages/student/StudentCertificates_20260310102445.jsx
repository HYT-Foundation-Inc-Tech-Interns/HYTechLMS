import DashboardLayout from '../../components/layout/DashboardLayout'
import { studentNav } from './studentNav'
import { HiAcademicCap, HiDownload } from 'react-icons/hi'

const CERTS = [
  { title: 'Barista NCII',              issuer: 'TESDA',      date: 'Feb 28, 2026', color: '#0d4291' },
  { title: 'Food Safety Level 1',       issuer: 'HYTech LMS', date: 'Jan 15, 2026', color: '#16a34a' },
  { title: 'Customer Service NC II',    issuer: 'TESDA',      date: 'Dec 10, 2025', color: '#7c3aed' },
  { title: 'Basic Computer Operations', issuer: 'HYTech LMS', date: 'Nov 5, 2025',  color: '#0891b2' },
]

export default function StudentCertificates() {
  return (
    <DashboardLayout
      navItems={studentNav}
      pageTitle="Certificates"
      pageSubtitle="Your earned certifications and progress toward new ones."
    >
      <div className="page-header">
        <span className="page-header__title">My Certificates</span>
        <span style={{ fontSize: 13, color: 'var(--color-gray)' }}>{CERTS.length} earned</span>
      </div>

      <div className="cert-grid">
        {CERTS.map((c) => (
          <div key={c.title} className="cert-card">
            <div className="cert-card__banner" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}aa)` }}>
              <HiAcademicCap className="cert-card__icon" />
            </div>
            <div className="cert-card__body">
              <div className="cert-card__title">{c.title}</div>
              <div className="cert-card__date">{c.issuer} · Issued {c.date}</div>
            </div>
            <div className="cert-card__footer">
              <button className="btn btn--outline" style={{ width: '100%', justifyContent: 'center' }}>
                <HiDownload size={14} /> Download PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* In-progress section */}
      <div style={{ marginTop: 32 }}>
        <div className="page-header">
          <span className="page-header__title">In Progress</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { title: 'Electrical Installation NC II', progress: 40, color: '#7c3aed' },
            { title: 'Driving NC III',                progress: 90, color: '#16a34a' },
          ].map((c) => (
            <div key={c.title} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</span>
                <span style={{ fontSize: 13, color: c.color, fontWeight: 600 }}>{c.progress}%</span>
              </div>
              <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${c.progress}%`, background: c.color, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
