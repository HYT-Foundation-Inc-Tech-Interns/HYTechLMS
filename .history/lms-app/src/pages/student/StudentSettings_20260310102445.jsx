import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { studentNav } from './studentNav'
import { HiDownload } from 'react-icons/hi'

function Toggle({ defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <label className="toggle">
      <input type="checkbox" checked={on} onChange={() => setOn(!on)} />
      <span className="toggle__track" />
    </label>
  )
}

export default function StudentSettings() {
  return (
    <DashboardLayout
      navItems={studentNav}
      pageTitle="Settings"
      pageSubtitle="Manage your profile and preferences."
    >
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Profile card */}
        <div className="settings-section" style={{ flex: '1 1 380px', borderRadius: 16 }}>
          <div className="settings-section__title" style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 600, fontSize: 24 }}>
            Profile
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white' }}>
              AU
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Student User</div>
              <div style={{ color: 'var(--color-gray)', fontSize: 13 }}>student@hytech.edu</div>
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row__label">Full Name</span>
            <input className="settings-input" defaultValue="Student User" />
          </div>
          <div className="settings-row">
            <span className="settings-row__label">Email</span>
            <input className="settings-input" defaultValue="student@hytech.edu" type="email" />
          </div>
          <div className="settings-row">
            <span className="settings-row__label">Contact Number</span>
            <input className="settings-input" defaultValue="+63 912 345 6789" />
          </div>
          <div className="settings-row">
            <span className="settings-row__label">Current Password</span>
            <input className="settings-input" type="password" placeholder="••••••••" />
          </div>
          <div className="settings-row">
            <span className="settings-row__label">New Password</span>
            <input className="settings-input" type="password" placeholder="••••••••" />
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="btn btn--accent" style={{ borderRadius: 10 }}>
              <HiDownload size={16} /> Export PDF
            </button>
            <button className="btn btn--primary">Save Changes</button>
          </div>
        </div>

        {/* Notifications card */}
        <div className="settings-section" style={{ flex: '1 1 380px', borderRadius: 16 }}>
          <div className="settings-section__title" style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 600, fontSize: 24 }}>
            Notifications
          </div>
          <div className="settings-section__desc">Manage which notifications you receive.</div>

          {[
            { label: 'New task assigned',       info: 'When a trainer assigns you a task',   on: true },
            { label: 'Quiz reminders',           info: 'Before a quiz deadline',              on: true },
            { label: 'Course announcements',     info: 'Messages from your trainers',         on: true },
            { label: 'Certificate issued',       info: 'When you earn a new certificate',     on: true },
            { label: 'Course material updates',  info: 'New files uploaded',                  on: false },
            { label: 'Grade released',           info: 'When a score is posted',              on: true },
            { label: 'System announcements',     info: 'Platform-wide alerts',                on: false },
          ].map((n) => (
            <div key={n.label} className="settings-row">
              <div>
                <div className="settings-row__label">{n.label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-gray)', marginTop: 2 }}>{n.info}</div>
              </div>
              <Toggle defaultChecked={n.on} />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
