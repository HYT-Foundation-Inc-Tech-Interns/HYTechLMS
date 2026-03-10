import { createContext, useContext, useState } from 'react'

/* ── Demo accounts ────────────────────────────────────────────────── */
const ACCOUNTS = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@hytech.edu',
    password: 'Admin@123',
    role: 'admin',
    initials: 'AU',
  },
  {
    id: 2,
    name: 'Sample Student',
    email: 'student@hytech.edu',
    password: 'Student@123',
    role: 'student',
    initials: 'SS',
  },
  {
    id: 3,
    name: 'Maria Clara Garcia',
    email: 'trainer@hytech.edu',
    password: 'Trainer@123',
    role: 'trainer',
    initials: 'MG',
  },
]

/* ── Context ──────────────────────────────────────────────────────── */
const AuthContext = createContext(null)

function loadUser() {
  try {
    const raw = localStorage.getItem('lms_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)

  const login = (email, password) => {
    const match = ACCOUNTS.find(
      (a) =>
        a.email.toLowerCase() === email.toLowerCase() &&
        a.password === password
    )
    if (!match) {
      return { success: false, error: 'Invalid email or password.' }
    }
    const { password: _pw, ...safe } = match
    localStorage.setItem('lms_user', JSON.stringify(safe))
    setUser(safe)
    return { success: true, user: safe }
  }

  const logout = () => {
    localStorage.removeItem('lms_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
