import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import StudentNavbar from './StudentNavbar';

const StudentDashboardLayout = () => {
  const location = useLocation();

  // Get page title and subtitle based on current route
  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/student') {
      return { title: '', subtitle: '' };
    }
    if (path === '/student/calendar') {
      return { title: 'Calendar', subtitle: 'View your schedule and upcoming events.' };
    }
    if (path.includes('/student/courses/')) {
      return { title: 'Barista NCII', subtitle: 'Your enrolled course progress and materials.' };
    }
    if (path === '/student/tasks') {
      return { title: 'Tasks', subtitle: 'Track your assignments, quizzes, and submissions.' };
    }
    if (path === '/student/certificates') {
      return { title: 'Certificates', subtitle: 'Your earned certifications and progress toward new ones.' };
    }
    if (path === '/student/archived') {
      return { title: 'Archived Courses', subtitle: 'Your completed courses and certifications.' };
    }
    if (path === '/student/settings') {
      return { title: 'Settings', subtitle: 'Configure your account and preferences.' };
    }
    return { title: '', subtitle: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="h-screen w-screen max-w-[1920px] max-h-[1080px] mx-auto bg-gray-50 flex flex-col transition-colors duration-200">
      {/* Fixed Navbar - Full Width */}
      <StudentNavbar title={pageInfo.title} subtitle={pageInfo.subtitle} />
      {/* Main Area - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Sidebar */}
        <StudentSidebar />
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

export default StudentDashboardLayout;
