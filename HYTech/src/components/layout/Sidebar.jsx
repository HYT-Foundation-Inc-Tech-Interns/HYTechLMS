import React, { useState, useEffect } from 'react';
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
  X,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCourses } from '../../utils/firestoreService';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('hytech:sidebar-collapse', {
        detail: { isCollapsed },
      })
    );
  }, [isCollapsed]);

  // Fetch trainer's active classes
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.uid) return;
      setLoadingCourses(true);
      try {
        const coursesData = await getCourses({
          trainerId: user.uid,
          status: 'Active',
        });
        // Transform courses to sidebar format
        const formattedCourses = (coursesData || []).map((course) => ({
          id: course.id,
          name: course.name,
          code: course.name.substring(0, 2).toUpperCase() || 'N/A',
          color: 'bg-blue-100 text-blue-700',
        }));
        setEnrolledCourses(formattedCourses);
      } catch (error) {
        console.error('Error fetching trainer courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [user?.uid]);

  // Check if current path is a course page
  const isCoursePath = location.pathname.includes('/trainer/courses') ||
    (location.pathname.startsWith('/trainer/') &&
     !location.pathname.match(/\/(tasks|archived|settings|incident-forms|$)$/) &&
     location.pathname !== '/trainer');

  const mainNavItems = [
    { path: '/trainer', icon: Home, label: 'Home', exact: true },
  ];

  const bottomNavItems = [
    { path: '/trainer/tasks', icon: ClipboardList, label: 'Tasks' },
    { path: '/trainer/incident-forms', icon: AlertTriangle, label: 'Incident Forms' },
    { path: '/trainer/archived', icon: Archive, label: 'Archived Courses' },
    { path: '/trainer/settings', icon: Settings, label: 'Settings' },
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

          {/* My Classes - Expandable */}
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
                  <span className="font-medium">My Classes</span>
                </div>
                {isCoursesExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {/* Course Submenu */}
              {isCoursesExpanded && (
                <div className="space-y-1 animate-slide-down">
                  {loadingCourses ? (
                    <div className="px-8 py-2 text-xs text-gray-500">Loading classes...</div>
                  ) : enrolledCourses.length === 0 ? (
                    <div className="px-8 py-2 text-xs text-gray-500">No active classes</div>
                  ) : (
                    enrolledCourses.map(course => (
                      <NavLink
                        key={course.id}
                        to={`/trainer/${encodeURIComponent(course.name)}`}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-8 py-3 rounded-xl transition-all duration-300
                          ${isActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          }`
                        }
                        onClick={() => setIsMobileOpen(false)}
                        title={course.name}
                      >
                        <div className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${course.color}`}>
                          {course.code}
                        </div>
                        <span className="text-sm font-medium line-clamp-1 min-w-0">{course.name}</span>
                      </NavLink>
                    ))
                  )}
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
            className="w-full flex items-center justify-end gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
          >
            <div className={`w-8 h-8 rounded-full items-center justify-center flex ${isCollapsed ? '' : 'bg-blue-100'}`}>
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
