import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';

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
    <div className="h-screen w-screen max-w-[1920px] max-h-[1080px] mx-auto bg-gray-50 flex flex-col transition-colors duration-200">
      {/* Fixed Navbar - Full Width */}
      <AdminNavbar title={pageInfo.title} subtitle={pageInfo.subtitle} />
      {/* Main Area - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Sidebar */}
        <AdminSidebar />
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <div className="animate-fade-in h-full p-6 lg:p-8 pb-10 lg:pb-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;
