import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  ClipboardList, 
  Archive, 
  Settings,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Calendar,
  Award,
  CreditCard,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToStudentEnrollments, getCourseByName } from '../../utils/firestoreService';

const StudentSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(false);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
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

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileOpen]);

  // Fetch enrolled classes with real-time updates
  useEffect(() => {
    if (!user?.uid) return;
    
    let unsubscribe;
    
    try {
      // Subscribe to real-time enrollment changes
      unsubscribe = subscribeToStudentEnrollments(user.uid, async (enrollments) => {
        try {
          setLoadingClasses(true);
          
          // Pending join requests aren't accessible classes yet.
          const classesData = await Promise.all(
            enrollments.filter((e) => e.status !== 'pending').map(async (enrollment) => {
              try {
                const classData = await getCourseByName(enrollment.className);
                return {
                  id: enrollment.classId,
                  name: enrollment.className,
                  courseId: classData?.id,
                  ...classData
                };
              } catch (err) {
                console.error(`Error fetching class ${enrollment.className}:`, err);
                return {
                  id: enrollment.classId,
                  name: enrollment.className,
                  courseId: enrollment.classId
                };
              }
            })
          );
          
          setEnrolledClasses(classesData || []);
        } catch (error) {
          console.error('Error processing enrollments:', error);
        } finally {
          setLoadingClasses(false);
        }
      });
    } catch (error) {
      console.error('Error subscribing to enrollments:', error);
      setLoadingClasses(false);
    }
    
    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  // Generate avatar color based on class name
  const getClassColor = (className) => {
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-orange-100', text: 'text-orange-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700' },
      { bg: 'bg-amber-100', text: 'text-amber-700' },
      { bg: 'bg-teal-100', text: 'text-teal-700' },
    ];
    
    const hash = className.charCodeAt(0) + className.charCodeAt(className.length - 1);
    return colors[hash % colors.length];
  };

  // Get initials for class avatar
  const getInitials = (name) => {
    // Remove parentheses and their content, then get initials
    const cleanName = name.replace(/\s*\([^)]*\)/g, '').trim();
    const words = cleanName.split(' ').filter(w => w.length > 0);
    
    if (words.length === 0) return '??';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    
    // Get first letter of first two words
    return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
  };

  const isCoursePath = location.pathname.includes('/student/') && location.pathname !== '/student' && location.pathname !== '/student/calendar' && location.pathname !== '/student/enroll' && !location.pathname.includes('/settings') && !location.pathname.includes('/certificates') && !location.pathname.includes('/archived') && !location.pathname.includes('/tasks') && !location.pathname.includes('/request-id') && !location.pathname.includes('/incident-form');

  const mainNavItems = [
    { path: '/student', icon: Home, label: 'Home', exact: true },
    { path: '/student/enroll', icon: GraduationCap, label: 'Enroll' },
    { path: '/student/calendar', icon: Calendar, label: 'Calendar' },
  ];

  const bottomNavItems = [
    { path: '/student/tasks', icon: ClipboardList, label: 'Tasks' },
    // Certificates feature hidden for now — restore this entry to re-enable.
    // { path: '/student/certificates', icon: Award, label: 'Certificates' },
    { path: '/student/request-id', icon: CreditCard, label: 'Request ID' },
    { path: '/student/incident-form', icon: AlertTriangle, label: 'Incident Report' },
    { path: '/student/archived', icon: Archive, label: 'Archived Courses' },
    { path: '/student/settings', icon: Settings, label: 'Settings' },
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
        aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isMobileOpen}
        aria-controls="student-sidebar-navigation"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="student-sidebar-navigation"
        aria-label="Trainee navigation"
        className={`
          fixed bottom-0 left-0 top-16 z-40 lg:relative lg:inset-y-0
          w-[min(88vw,18rem)] ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-white border-r border-gray-100 shadow-xl lg:shadow-none
          transition-all duration-300 ease-in-out
          flex h-[calc(100dvh-4rem)] flex-col flex-shrink-0 lg:h-full
        `}
      >
        {/* Navigation */}
        <nav className="flex-1 p-4 pt-6 space-y-2 overflow-y-auto scrollbar-hidden">
          {/* Home & Calendar */}
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

              {/* Enrolled Classes List */}
              {isCoursesExpanded && (
                <div className="ml-4 space-y-1 pt-1 animate-slide-down">
                  {loadingClasses ? (
                    <div className="px-4 py-2 text-xs text-gray-500">Loading classes...</div>
                  ) : enrolledClasses.length > 0 ? (
                    enrolledClasses.map((classItem) => {
                      const colors = getClassColor(classItem.name);
                      const initials = getInitials(classItem.name);
                      const classPath = `/student/${classItem.id}`;
                      
                      return (
                        <NavLink
                          key={classItem.id}
                          to={classPath}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300
                            ${isActive 
                              ? 'bg-blue-50 text-blue-600' 
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`
                          }
                          onClick={() => setIsMobileOpen(false)}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${colors.bg} ${colors.text}`}>
                            {initials}
                          </div>
                          <span className="text-sm font-medium truncate">{classItem.name}</span>
                        </NavLink>
                      );
                    })
                  ) : (
                    <div className="px-4 py-2 text-xs text-gray-500">No enrolled classes</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="my-4 border-t border-gray-100" />

          {/* Bottom Navigation */}
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

export default StudentSidebar;
