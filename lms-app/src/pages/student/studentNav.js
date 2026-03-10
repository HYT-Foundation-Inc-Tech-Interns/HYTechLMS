import {
  HiHome, HiCalendar, HiBookOpen,
  HiClipboardCheck, HiAcademicCap, HiArchive, HiCog
} from 'react-icons/hi'

export const studentNav = [
  { icon: HiHome,           label: 'Home',             path: '/student' },
  { icon: HiCalendar,       label: 'Calendar',         path: '/student/calendar' },
  { icon: HiBookOpen,       label: 'Courses',          path: '/student/courses' },
  { icon: HiClipboardCheck, label: 'Tasks',            path: '/student/tasks' },
  { icon: HiAcademicCap,    label: 'Certificates',     path: '/student/certificates' },
  { icon: HiArchive,        label: 'Archived Courses', path: '/student/archived' },
  { icon: HiCog,            label: 'Settings',         path: '/student/settings' },
]
