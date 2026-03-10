import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { trainerNav } from './trainerNav'

const TABS = [
  { key: 'profile',       label: 'Profile' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'preferences',   label: 'Preferences' },
]

function Toggle({ defaultChecked = false }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <label className="toggle">
      <input type="checkbox" checked={on} onChange={() => setOn(!on)} />
      <span className="toggle__track" />
    </label>
  )
}

function ProfileTab() {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section__title">Personal Information</div>
        <div className="settings-section__desc">Update your trainer profile details.</div>
        <div className="settings-row">
          <span className="settings-row__label">Full Name</span>
          <input className="settings-input" defaultValue="Maria Clara Garcia" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Email Address</span>
          <input className="settings-input" defaultValue="trainer@hytech.edu" type="email" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Contact Number</span>
          <input className="settings-input" defaultValue="+63 917 123 4567" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Specialization</span>
          <select className="settings-input">
            <option>Barista &amp; Coffee Arts</option>
            <option>Electrical Wiring</option>
            <option>ICT / Web Development</option>
            <option>Construction</option>
            <option>Driving</option>
            <option>Other</option>
          </select>
        </div>
        <div className="settings-row" style={{ alignItems:'flex-start' }}>
          <span className="settings-row__label" style={{ paddingTop:6 }}>Bio</span>
          <textarea
            className="settings-input"
            defaultValue="Certified Barista NCII trainer with 5 years of experience in specialty coffee education."
            style={{ height:90, padding:'8px 14px', resize:'vertical', minWidth:400 }}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section__title">Change Password</div>
        <div className="settings-section__desc">Keep your account secure.</div>
        <div className="settings-row">
          <span className="settings-row__label">Current Password</span>
          <input className="settings-input" type="password" placeholder="••••••••" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">New Password</span>
          <input className="settings-input" type="password" placeholder="••••••••" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Confirm New Password</span>
          <input className="settings-input" type="password" placeholder="••••••••" />
        </div>
      </div>
    </>
  )
}

function NotificationsTab() {
  return (
    <div className="settings-section">
      <div className="settings-section__title">Notification Preferences</div>
      <div className="settings-section__desc">Choose which events you want to be notified about.</div>
      {[
        { label: 'New student submission',        on: true  },
        { label: 'Student question posted',       on: true  },
        { label: 'New enrollment',                on: true  },
        { label: 'Assignment deadline reminder',  on: true  },
        { label: 'Grade update alert',            on: false },
        { label: 'New system announcement',       on: true  },
      ].map((item) => (
        <div key={item.label} className="settings-row">
          <span className="settings-row__label">{item.label}</span>
          <Toggle defaultChecked={item.on} />
        </div>
      ))}
    </div>
  )
}

function PreferencesTab() {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section__title">Regional</div>
        <div className="settings-section__desc">Set your language and timezone.</div>
        <div className="settings-row">
          <span className="settings-row__label">Language</span>
          <select className="settings-input">
            <option>English (US)</option>
            <option>Filipino</option>
          </select>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Timezone</span>
          <select className="settings-input">
            <option>Asia/Manila (GMT+8)</option>
            <option>UTC</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section__title">Dashboard</div>
        <div className="settings-section__desc">Customize what you see on your dashboard.</div>
        <div className="settings-row">
          <span className="settings-row__label">Show student progress on dashboard</span>
          <Toggle defaultChecked />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Show recent activity feed</span>
          <Toggle defaultChecked />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Email digest frequency</span>
          <select className="settings-input">
            <option>Daily</option>
            <option>Weekly</option>
            <option>Off</option>
          </select>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Default grade visibility</span>
          <select className="settings-input">
            <option>Show immediately</option>
            <option>After deadline</option>
            <option>Manual</option>
          </select>
        </div>
      </div>
    </>
  )
}

const TAB_CONTENT = { profile: ProfileTab, notifications: NotificationsTab, preferences: PreferencesTab }

export default function TrainerSettings() {
  const [activeTab, setActiveTab] = useState('profile')
  const Content = TAB_CONTENT[activeTab]

  return (
    <DashboardLayout
      navItems={trainerNav}
      pageTitle="Settings"
      pageSubtitle="Configure your trainer profile and preferences."
    >
      <div className="settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`settings-tab${activeTab === t.key ? ' settings-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Content />

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
        <button className="btn btn--primary">Save Changes</button>
      </div>
    </DashboardLayout>
  )
}
