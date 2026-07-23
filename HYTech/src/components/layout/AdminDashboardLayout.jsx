import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import HytBot from '../hytbot/HytBot';

const AdminDashboardLayout = () => {
  const location = useLocation();

  // Get page title based on route
  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/admin') {
      return { title: 'Dashboard', subtitle: 'System overview and statistics' };
    }
    if (path === '/admin/users') {
      return { title: 'User Management', subtitle: 'Manage system users and roles' };
    }
    if (path === '/admin/sectors') {
      return { title: 'Sectors', subtitle: 'Training Regulations' };
    }
    if (path === '/admin/classes') {
      return { title: 'Classes', subtitle: 'Manage course templates and active classes' };
    }
    if (path === '/admin/id-requests') {
      return { title: 'ID Requests', subtitle: 'Review trainee identification requests' };
    }
    if (path === '/admin/incident-forms') {
      return { title: 'Incident Forms', subtitle: 'Review and manage reported incidents' };
    }
    if (path === '/admin/logs') {
      return { title: 'System Logs', subtitle: 'View system activity and audit logs' };
    }
    if (path === '/admin/settings') {
      return { title: 'Settings', subtitle: 'Configure system settings' };
    }
    if (path === '/admin/notifications') {
      return { title: 'Notifications', subtitle: 'Review all admin alerts and activity updates' };
    }
    return { title: '', subtitle: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="h-screen h-[100dvh] w-full max-w-[1920px] mx-auto bg-gray-50 flex flex-col transition-colors duration-200">
      {/* Fixed Navbar - Full Width */}
      <AdminNavbar title={pageInfo.title} subtitle={pageInfo.subtitle} />
      {/* Main Area - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Sidebar */}
        <AdminSidebar />
        {/* Scrollable Content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-gray-50">
          <div className="animate-fade-in min-h-full p-4 sm:p-6 lg:p-8 pb-10 lg:pb-12">
            <Outlet />
          </div>
        </main>
      </div>
      <HytBot embedded />
    </div>
  );
};

export default AdminDashboardLayout;
