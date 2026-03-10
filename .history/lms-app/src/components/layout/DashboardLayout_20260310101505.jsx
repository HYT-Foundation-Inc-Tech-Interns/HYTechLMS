import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../../assets/images/logo.png'
import './DashboardLayout.css'

export default function DashboardLayout({ navItems, pageTitle, pageSubtitle, children }) {
  const navigate = useNavigate()

  return (
    <div className="dash">
      {/* ── Topbar ── */}
      <header className="dash__topbar">
        <div className="dash__topbar-left">
          <div className="dash__brand" onClick={() => navigate('/')}>
            <img src={logo} alt="HYTech logo" className="dash__logo" />
            <span className="dash__brand-name">HYTech</span>
          </div>

          {pageTitle && (
            <>
              <svg className="dash__chevron" width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M1 1l6 6-6 6" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="dash__page-info">
                <span className="dash__page-title">{pageTitle}</span>
                {pageSubtitle && <span className="dash__page-sub">{pageSubtitle}</span>}
              </div>
            </>
          )}
        </div>
        <div className="dash__topbar-right">
          <div className="dash__avatar">AU</div>
        </div>
      </header>

      <div className="dash__body">
        {/* ── Sidebar ── */}
        <aside className="dash__sidebar">
          <nav className="dash__nav">
            {navItems.map(({ icon: Icon, label, path }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `dash__nav-item${isActive ? ' dash__nav-item--active' : ''}`
                }
              >
                <span className="dash__nav-icon"><Icon size={24} /></span>
                <span className="dash__nav-label">{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="dash__main">
          {children}
        </main>
      </div>
    </div>
  )
}
