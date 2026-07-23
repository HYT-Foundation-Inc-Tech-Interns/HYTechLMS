import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import HytBot from '../hytbot/HytBot';
import { getCourseByName, getCourseTemplateById } from '../../utils/firestoreService';
import { formatCertification } from '../../utils/courseLabel';

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
    if (path === '/trainer/tasks') {
      return { title: 'Tasks', subtitle: 'Review assignments, assessments, and class deadlines.' };
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
