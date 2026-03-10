import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { HiLogout, HiChevronDown } from 'react-icons/hi'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/images/logo.png'
import './DashboardLayout.css'

export default function DashboardLayout({ navItems, pageTitle, pageSubtitle, children }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const initials = user?.initials ?? user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? 'AU'

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
          {/* Avatar + dropdown */}
          <div className="dash__user-menu" ref={menuRef}>
            <button
              className="dash__user-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
            >
              <div className="dash__avatar">{initials}</div>
              {user && (
                <span className="dash__user-name">{user.name}</span>
              )}
              <HiChevronDown
                size={14}
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  transition: 'transform 0.2s',
                  transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {menuOpen && (
              <div className="dash__dropdown">
                {user && (
                  <div className="dash__dropdown-header">
                    <span className="dash__dropdown-name">{user.name}</span>
                    <span className="dash__dropdown-email">{user.email}</span>
                    <span className="dash__dropdown-role">{user.role}</span>
                  </div>
                )}
                <button className="dash__dropdown-item dash__dropdown-item--danger" onClick={handleLogout}>
                  <HiLogout size={15} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
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
                end={path.split('/').length === 2}
                className={({ isActive }) =>
                  `dash__nav-item${isActive ? ' dash__nav-item--active' : ''}`
                }
              >
                <span className="dash__nav-icon"><Icon size={22} /></span>
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
