import React from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = () => {
  const location = useLocation();
  const params = useParams();

  // Get page title based on route
  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return { title: '', subtitle: '' };
    }
    if (path.includes('/dashboard/courses/')) {
      return { title: 'Barista NCII', subtitle: 'Your earned certifications and progress toward new ones.' };
    }
    if (path === '/dashboard/tasks') {
      return { title: 'Tasks', subtitle: 'Your earned certifications and progress toward new ones.' };
    }
    if (path.includes('/dashboard/sectors/')) {
      return { title: 'Sectors', subtitle: 'Training Regulations' };
    }
    if (path === '/dashboard/sectors') {
      return { title: 'Sectors', subtitle: 'Training Regulations' };
    }
    if (path === '/dashboard/archived') {
      return { title: 'Archived Courses', subtitle: 'Your earned certifications and progress toward new ones.' };
    }
    if (path === '/dashboard/settings') {
      return { title: 'Settings', subtitle: 'Configure your Learning Management System.' };
    }
    return { title: '', subtitle: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="h-screen w-screen max-w-[1920px] max-h-[1080px] mx-auto bg-gray-50 flex flex-col transition-colors duration-200">
      {/* Fixed Navbar - Full Width */}
      <Navbar title={pageInfo.title} subtitle={pageInfo.subtitle} />
      {/* Main Area - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Sidebar */}
        <Sidebar />
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

export default DashboardLayout;
