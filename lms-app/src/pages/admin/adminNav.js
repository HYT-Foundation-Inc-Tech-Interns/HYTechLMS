import {
  HiHome, HiUsers, HiBookOpen, HiClipboardList, HiCog
} from 'react-icons/hi'

export const adminNav = [
  { icon: HiHome,          label: 'Home',            path: '/admin' },
  { icon: HiUsers,         label: 'User Management', path: '/admin/users' },
  { icon: HiBookOpen,      label: 'Sectors',         path: '/admin/sectors' },
  { icon: HiClipboardList, label: 'System Logs',     path: '/admin/logs' },
  { icon: HiCog,           label: 'Settings',        path: '/admin/settings' },
]
