import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from './adminNav'

const TABS = [
  { key: 'account',  label: 'Account Information' },
  { key: 'access',   label: 'Access & Notifications' },
  { key: 'system',   label: 'System Preferences' },
  { key: 'backup',   label: 'Backup & Security' },
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

function AccountTab() {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section__title">Account Information</div>
        <div className="settings-section__desc">Edit or update your account information.</div>
        <div className="settings-row">
          <span className="settings-row__label">Full Name</span>
          <input className="settings-input" defaultValue="Admin User" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Email Address</span>
          <input className="settings-input" defaultValue="admin@hytech.edu" type="email" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Contact Number</span>
          <input className="settings-input" defaultValue="+63 912 345 6789" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Full Address</span>
          <input className="settings-input" defaultValue="Manila, Philippines" style={{ minWidth: 400 }} />
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section__title">Change Password</div>
        <div className="settings-section__desc">Secure your account.</div>
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

function AccessTab() {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section__title">Access Control</div>
        <div className="settings-section__desc">Control how users access the system.</div>
        <div className="settings-row">
          <span className="settings-row__label">Session Timeout (Minutes)</span>
          <input className="settings-input" defaultValue="30" type="number" style={{ minWidth: 120 }} />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Auto-logout after inactivity</span>
          <Toggle defaultChecked />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Require 2FA for Admin</span>
          <Toggle />
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section__title">Notification Preferences</div>
        <div className="settings-section__desc">Choose which notifications you&apos;d like to receive as admin.</div>
        {[
          'New user registration',
          'Course enrollment',
          'System errors',
          'Backup completion',
          'Password reset requests',
          'New course submission',
          'Certificate issued',
        ].map((item) => (
          <div key={item} className="settings-row">
            <span className="settings-row__label">{item}</span>
            <Toggle defaultChecked />
          </div>
        ))}
      </div>
    </>
  )
}

function SystemTab() {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section__title">Site Settings</div>
        <div className="settings-section__desc">Control how users access the system.</div>
        <div className="settings-row">
          <span className="settings-row__label">Site Name</span>
          <input className="settings-input" defaultValue="HYT Global Institute LMS" />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Welcome Message</span>
          <textarea
            className="settings-input"
            defaultValue="Welcome to HYT Global Institute!"
            style={{ height: 70, padding: '8px 14px', resize: 'vertical' }}
          />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Site Logo</span>
          <button className="btn btn--primary" style={{ background: '#0b005c' }}>Upload Photo</button>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section__title">Language &amp; Regional</div>
        <div className="settings-section__desc">Set the default language and regional preferences.</div>
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
        <div className="settings-row">
          <span className="settings-row__label">Date Format</span>
          <select className="settings-input">
            <option>MM/DD/YYYY</option>
            <option>DD/MM/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section__title">Course &amp; Training Settings</div>
        <div className="settings-section__desc">Configure defaults for courses and training programs.</div>
        <div className="settings-row">
          <span className="settings-row__label">Max Enrollees per Course</span>
          <input className="settings-input" defaultValue="50" type="number" style={{ minWidth: 120 }} />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Max Upload File Size (MB)</span>
          <input className="settings-input" defaultValue="25" type="number" style={{ minWidth: 120 }} />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Grading System</span>
          <select className="settings-input">
            <option>Percentage (0–100)</option>
            <option>Letter Grade</option>
          </select>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Certificate Template</span>
          <select className="settings-input">
            <option>Default Template</option>
            <option>TESDA Template</option>
          </select>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Allow Student Self-Enrollment</span>
          <Toggle defaultChecked />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Show Leaderboard</span>
          <Toggle />
        </div>
      </div>
    </>
  )
}

function BackupTab() {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section__title">Security Settings</div>
        <div className="settings-section__desc">Strengthen your system&apos;s security with these options.</div>
        <div className="settings-row">
          <span className="settings-row__label">Minimum Password Length</span>
          <input className="settings-input" defaultValue="8" type="number" style={{ minWidth: 120 }} />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Password Expiry (Days)</span>
          <input className="settings-input" defaultValue="90" type="number" style={{ minWidth: 120 }} />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Enforce Password Complexity</span>
          <Toggle defaultChecked />
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Lock Account After Failed Logins</span>
          <Toggle defaultChecked />
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section__title">Backup Settings</div>
        <div className="settings-section__desc">Configure how and when your LMS data is backed up.</div>
        <div className="settings-row">
          <span className="settings-row__label">Backup Frequency</span>
          <select className="settings-input">
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Backup Retention (Days)</span>
          <input className="settings-input" defaultValue="30" type="number" style={{ minWidth: 120 }} />
        </div>
      </div>
    </>
  )
}

const TAB_CONTENT = { account: AccountTab, access: AccessTab, system: SystemTab, backup: BackupTab }

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('account')
  const Content = TAB_CONTENT[activeTab]

  return (
    <DashboardLayout
      navItems={adminNav}
      pageTitle="Settings"
      pageSubtitle="Configure your Learning Management System."
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn--primary">Save Changes</button>
      </div>
    </DashboardLayout>
  )
}
