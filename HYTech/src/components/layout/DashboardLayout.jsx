import React from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import HytBot from '../hytbot/HytBot';

const TRAINER_COURSE_TITLES = {
  1: 'AUTOMOTIVE SERVICES NCII',
  2: 'PLUMBING NCII',
  3: 'HILOT (WELLNESS)MASSAGE',
  4: 'CAREGIVING NCII',
  5: 'BEAUTY CARE (SKINCARE)',
  6: 'BEAUTY CARE (NAIL CARE)',
  7: 'VISUAL GRAPHICS DESIGN',
  8: 'COMPUTER SYSTEM SERVICING',
  9: 'BOOKKEEPING NCII',
  10: 'HOUSEKEEPING NCII',
  11: 'EVENT MANAGEMENT SERVICES',
  12: 'BARISTA NCII',
  13: 'FOOD AND BEVERAGE SERVICES',
};

const DashboardLayout = () => {
  const location = useLocation();
  const params = useParams();

  // Get page title based on route
  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/trainer') {
      return { title: '', subtitle: '' };
    }
    if (path.includes('/trainer/courses/')) {
      const activeCourseTitle = TRAINER_COURSE_TITLES[Number(params.courseId)] || 'Course';
      return { title: activeCourseTitle, subtitle: 'Your earned certifications and progress toward new ones.' };
    }
    if (path === '/trainer/tasks') {
      return { title: 'Tasks', subtitle: 'Your earned certifications and progress toward new ones.' };
    }
    if (path.includes('/trainer/sectors/')) {
      return { title: 'Sectors', subtitle: 'Training Regulations' };
    }
    if (path === '/trainer/sectors') {
      return { title: 'Sectors', subtitle: 'Training Regulations' };
    }
    if (path === '/trainer/archived') {
      return { title: 'Archived Courses', subtitle: 'Your earned certifications and progress toward new ones.' };
    }
    if (path === '/trainer/settings') {
      return { title: 'Settings', subtitle: 'Configure your Learning Management System.' };
    }
    if (path === '/trainer/notifications') {
      return { title: 'Notifications', subtitle: 'View all trainer notifications and updates.' };
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
      <HytBot embedded />
    </div>
  );
};

export default DashboardLayout;
