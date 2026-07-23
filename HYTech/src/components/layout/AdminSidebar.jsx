import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  Settings,
  BookOpen,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

const AdminSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('hytech:sidebar-collapse', {
        detail: { isCollapsed },
      })
    );
  }, [isCollapsed]);

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/users', icon: Users, label: 'User Management' },
    { path: '/admin/sectors', icon: FolderOpen, label: 'Sectors' },
    { path: '/admin/classes', icon: BookOpen, label: 'Classes' },
    { path: '/admin/id-requests', icon: CreditCard, label: 'ID Requests' },
    { path: '/admin/incident-forms', icon: AlertTriangle, label: 'Incident Forms' },
    { path: '/admin/logs', icon: FileText, label: 'System Logs' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
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
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
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
          {navItems.map((item) => (
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

export default AdminSidebar;
