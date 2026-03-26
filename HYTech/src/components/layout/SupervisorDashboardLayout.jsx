import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SupervisorSidebar from './SupervisorSidebar';
import SupervisorNavbar from './SupervisorNavbar';

const SupervisorDashboardLayout = () => {
  const location = useLocation();

  // Get page title based on route
  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/supervisor') {
      return { title: '', subtitle: '' };
    }
    if (path === '/supervisor/trainers') {
      return { title: 'Trainers', subtitle: 'Manage and monitor trainer activities and performance.' };
    }
    if (path === '/supervisor/students') {
      return { title: 'Students', subtitle: 'Monitor student progress and enrollment.' };
    }
    if (path === '/supervisor/courses') {
      return { title: 'Courses', subtitle: 'Monitor all courses and training programs.' };
    }
    if (path === '/supervisor/reports') {
      return { title: 'Reports', subtitle: 'View comprehensive training reports and analytics.' };
    }
    if (path === '/supervisor/settings') {
      return { title: 'Settings', subtitle: 'Configure your supervisor account settings.' };
    }
    if (path === '/supervisor/notifications') {
      return { title: 'Notifications', subtitle: 'View all supervisor notifications and updates.' };
    }
    return { title: '', subtitle: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="h-screen w-screen max-w-[1920px] max-h-[1080px] mx-auto bg-gray-50 flex flex-col transition-colors duration-200">
      {/* Fixed Navbar - Full Width */}
      <SupervisorNavbar title={pageInfo.title} subtitle={pageInfo.subtitle} />
      {/* Main Area - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Sidebar */}
        <SupervisorSidebar />
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <div className="animate-fade-in h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupervisorDashboardLayout;
