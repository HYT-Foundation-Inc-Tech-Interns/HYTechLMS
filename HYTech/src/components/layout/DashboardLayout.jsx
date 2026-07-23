import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import HytBot from '../hytbot/HytBot';
import { getCourseByName, getCourseTemplateById } from '../../utils/firestoreService';
import { formatCertification } from '../../utils/courseLabel';

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
  const [classData, setClassData] = useState(null);
  const [courseData, setCourseData] = useState(null);

  // Fetch class data when viewing a class
  useEffect(() => {
    if (params.className) {
      const decodedClassName = decodeURIComponent(params.className);
      getCourseByName(decodedClassName)
        .then(data => {
          setClassData(data);
          // If class has courseId, fetch the course template
          if (data?.courseId) {
            getCourseTemplateById(data.courseId)
              .then(courseData => setCourseData(courseData))
              .catch(err => console.error('Error fetching course template:', err));
          }
        })
        .catch(err => console.error('Error fetching class data:', err));
    }
  }, [params.className]);

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
      return { title: 'Archived Classes', subtitle: 'Manage classes you have archived.' };
    }
    if (path === '/trainer/settings') {
      return { title: 'Settings', subtitle: 'Configure your Learning Management System.' };
    }
    if (path === '/trainer/notifications') {
      return { title: 'Notifications', subtitle: 'View all trainor notifications and updates.' };
    }
    if (params.className) {
      // ClassDetail route - show class name as title and the spelled-out
      // certification as subtitle (e.g., "National Certificate II"). The class
      // name already carries the qualification, so repeating "NC II" here was
      // both redundant and doubled up (e.g., "BARISTA NC II NC II").
      const decodedClassName = decodeURIComponent(params.className);

      const level = courseData?.level || classData?.level || '';
      const courseSubtitle = formatCertification(level);

      return { title: decodedClassName, subtitle: courseSubtitle };
    }
    return { title: '', subtitle: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="h-screen h-[100dvh] w-full max-w-[1920px] mx-auto bg-gray-50 flex flex-col transition-colors duration-200">
      {/* Fixed Navbar - Full Width */}
      <Navbar title={pageInfo.title} subtitle={pageInfo.subtitle} />
      {/* Main Area - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Sidebar */}
        <Sidebar />
        {/* Scrollable Content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-gray-50">
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
