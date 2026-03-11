import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  ClipboardList, 
  FolderOpen, 
  Archive, 
  Settings, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(true);
  const location = useLocation();

  // Check if current path is a course page
  const isCoursePath = location.pathname.includes('/dashboard/courses');

  const mainNavItems = [
    { path: '/dashboard', icon: Home, label: 'Home', exact: true },
  ];

  const bottomNavItems = [
    { path: '/dashboard/tasks', icon: ClipboardList, label: 'Tasks' },
    { path: '/dashboard/sectors', icon: FolderOpen, label: 'Sectors' },
    { path: '/dashboard/archived', icon: Archive, label: 'Archived Courses' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  // Mock enrolled courses
  const enrolledCourses = [
    { id: 1, name: 'AUTOMOTIVE ', code: 'KC' },
    { id: 2, name: 'PLUMBING NCII', code: 'P' },
    { id: 3, name: 'HILOT (WELLNESS)MASSAGE', code: 'HM' },
    { id: 4, name: 'CAREGIVING NCII', code: 'CG' },
    { id: 5, name: 'BEAUTY CARE (SKINCARE)', code: 'BS' },
    { id: 6, name: 'BEAUTY CARE (NAIL CARE)', code: 'BN' },
    { id: 7, name: 'VISUAL GRAPHICS DESIGN', code: 'VG' },
    { id: 8, name: 'COMPUTER SYSTEM SERVICING', code: 'CS' },
    { id: 9, name: 'BOOKKEEPING NCII', code: 'BK' },
    { id: 10, name: 'HOUSEKEEPING NCII', code: 'HK' },
    { id: 11, name: 'EVENT MANAGEMENT SERVICES', code: 'EM' },
    { id: 12, name: 'BARISTA NCII', code: 'BA' },
    { id: 13, name: 'FOOD AND BEVERAGE SERVICES', code: 'FB' }
  ];

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    return (
      <NavLink
        to={item.path}
        end={item.exact}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
          ${isActive 
            ? 'text-white shadow-lg' 
            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
          }`
        }
        style={({ isActive }) => isActive ? { backgroundColor: '#0D4291' } : {}}
        onClick={() => setIsMobileOpen(false)}
      >
        <Icon className={`w-5 h-5 transition-transform duration-300 ${!isCollapsed || isMobileOpen ? '' : 'mx-auto'} group-hover:scale-110`} />
        {(!isCollapsed || isMobileOpen) && (
          <span className="font-medium animate-fade-in">{item.label}</span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          ${isCollapsed ? 'w-20' : 'w-72'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-white border-r border-gray-100 shadow-xl lg:shadow-none
          transition-all duration-300 ease-in-out
          flex flex-col h-full flex-shrink-0
        `}
      >
        {/* Navigation */}
        <nav className="flex-1 p-4 pt-6 space-y-2 overflow-y-auto scrollbar-hidden">
          {/* Home */}
          {mainNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}

          {/* My Courses - Expandable */}
          {(!isCollapsed || isMobileOpen) && (
            <div className="space-y-1">
              <button
                onClick={() => setIsCoursesExpanded(!isCoursesExpanded)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300
                  ${isCoursePath
                    ? 'text-white shadow-lg'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                style={isCoursePath ? { backgroundColor: '#0D4291' } : {}}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-medium">My Courses</span>
                </div>
                {isCoursesExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {/* Course Submenu */}
              {isCoursesExpanded && (
                <div className="ml-4 space-y-1 animate-slide-down">
                  {enrolledCourses.map(course => (
                    <NavLink
                      key={course.id}
                      to={`/dashboard/courses/${course.id}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200
                        ${isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`
                      }
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                        {course.code}
                      </div>
                      <span className="text-sm font-medium">{course.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other Nav Items */}
          {bottomNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* Collapse Button (Desktop Only) */}
        <div className="hidden lg:block p-4 border-t border-gray-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
          >
            <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
            {!isCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
