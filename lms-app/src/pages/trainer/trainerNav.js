import { HiHome, HiBookOpen, HiClipboardCheck, HiClipboardList, HiArchive, HiCog } from 'react-icons/hi'

export const trainerNav = [
  { icon: HiHome,           label: 'Home',             path: '/trainer' },
  { icon: HiBookOpen,       label: 'My Courses',       path: '/trainer/courses' },
  { icon: HiClipboardCheck, label: 'Tasks',            path: '/trainer/tasks' },
  { icon: HiClipboardList,  label: 'Sectors',          path: '/trainer/sectors' },
  { icon: HiArchive,        label: 'Archived Courses', path: '/trainer/archived' },
  { icon: HiCog,            label: 'Settings',         path: '/trainer/settings' },
]
