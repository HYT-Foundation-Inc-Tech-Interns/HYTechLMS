import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './SignIn.css'
import authBg from '../../assets/images/auth-bg.png'
import logo   from '../../assets/images/logo.png'

export default function SignIn() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm]       = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setError('')
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = login(form.email, form.password)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Redirect based on role
    if (result.user.role === 'admin') {
      navigate('/admin', { replace: true })
    } else if (result.user.role === 'student') {
      navigate('/student', { replace: true })
    } else if (result.user.role === 'trainer') {
      navigate('/trainer', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="auth-layout">
      {/* Left panel */}
      <div className="auth-layout__left">
        <img src={authBg} alt="background" className="auth-layout__bg" />
        <div className="auth-layout__left-overlay" />
        <div className="auth-layout__left-content">
          <img src={logo} alt="HYTech logo" className="auth-layout__logo" />
          <div className="auth-layout__welcome">
            <h1 className="auth-layout__welcome-title">
              <span className="auth-layout__welcome-to">Welcome to</span>
              <span className="auth-layout__brand">HYT Global Institute</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-layout__right">
        <div className="auth-form-card">
          <h2 className="auth-form-card__heading">Hello</h2>
          <p className="auth-form-card__subheading">Good to see you back</p>

          {/* Demo credentials hint */}
          <div style={{
            background: 'rgba(13,66,145,0.06)',
            border: '1px solid rgba(13,66,145,0.15)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: '#374151',
            fontFamily: 'var(--font-poppins)',
            lineHeight: 1.7,
          }}>
            <strong>Demo accounts:</strong><br />
            Admin &nbsp;&nbsp;— <code>admin@hytech.edu</code> / <code>Admin@123</code><br />
            Student — <code>student@hytech.edu</code> / <code>Student@123</code><br />
            Trainer &nbsp;— <code>trainer@hytech.edu</code> / <code>Trainer@123</code>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form__field">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                required
                className="auth-form__input"
                autoComplete="email"
              />
            </div>

            <div className="auth-form__field">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="auth-form__input"
                autoComplete="current-password"
              />
            </div>

            {/* Error message */}
            {error && (
              <p style={{
                color: '#dc2626',
                fontSize: 13,
                fontFamily: 'var(--font-poppins)',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8,
                padding: '8px 12px',
                margin: 0,
              }}>
                {error}
              </p>
            )}

            <div className="auth-form__remember">
              <div
                className={`auth-form__checkbox ${remember ? 'auth-form__checkbox--checked' : ''}`}
                onClick={() => setRemember(!remember)}
                role="checkbox"
                aria-checked={remember}
              />
              <span className="auth-form__remember-label">Remember me next time</span>
            </div>

            <button
              type="submit"
              className="auth-form__submit"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-form__divider">
            <span>or continue with</span>
          </div>

          <div className="auth-form__social">
            <button className="auth-form__social-btn" aria-label="Sign in with Facebook">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.027 4.388 11.025 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.885v2.27h3.328l-.532 3.49h-2.796v8.437C19.612 23.098 24 18.1 24 12.073z" />
              </svg>
            </button>
            <button className="auth-form__social-btn" aria-label="Sign in with Google">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </button>
          </div>

          <p className="auth-form__switch">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="auth-form__switch-link">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
