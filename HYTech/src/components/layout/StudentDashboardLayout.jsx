import React from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import StudentSidebar from '../student/StudentSidebar';
import StudentNavbar from '../student/StudentNavbar';
import HytBot from '../hytbot/HytBot';

const StudentDashboardLayout = () => {
  const location = useLocation();
  const { classname } = useParams();

  // Get page title based on route
  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/student') {
      return { title: '', subtitle: '' };
    }
    
    // If classname parameter exists, show the class name
    if (classname) {
      return { title: classname, subtitle: 'Class materials, assignments, and discussions' };
    }
    
    if (path === '/student/tasks') {
      return { title: 'Tasks', subtitle: 'Your assigned tasks and submissions.' };
    }
    if (path === '/student/certificates') {
      return { title: 'Certificates', subtitle: 'Your earned certifications and achievements.' };
    }
    if (path === '/student/archived') {
      return { title: 'Archived Courses', subtitle: 'Your completed and archived courses.' };
    }
    if (path === '/student/calendar') {
      return { title: 'Calendar', subtitle: 'Your training schedule and events.' };
    }
    if (path === '/student/settings') {
      return { title: 'Settings', subtitle: 'Manage your account and preferences.' };
    }
    if (path === '/student/notifications') {
      return { title: 'Notifications', subtitle: 'View all your notifications and updates.' };
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
      <HytBot embedded />
    </div>
  );
};

export default StudentDashboardLayout;
