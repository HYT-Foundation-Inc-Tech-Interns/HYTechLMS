import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import StudentNavbar from './StudentNavbar';
import StudentWaitingRoom from './StudentWaitingRoom';
import HytBot from '../hytbot/HytBot';
import { useAuth } from '../../context/AuthContext';
import {
  getCourseByName,
  getCourseTemplateById,
  ensureClassMembership,
  subscribeToStudentEnrollments,
} from '../../utils/firestoreService';
import { formatCertification } from '../../utils/courseLabel';

const StudentDashboardLayout = () => {
  const location = useLocation();
  const { classname } = useParams();
  const { user } = useAuth();
  const [courseInfo, setCourseInfo] = useState(null);
  const [enrollments, setEnrollments] = useState(null); // null = still loading

  // Trainees with no enrollment at all are held in the waiting room
  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const unsubscribe = subscribeToStudentEnrollments(user.uid, async (items) => {
      const nextItems = items || [];
      await Promise.all(
        nextItems
          .filter((item) => ['active', 'ongoing', 'completed'].includes(String(item.status || '').toLowerCase()))
          .map((item) => ensureClassMembership(item).catch(() => false))
      );
      setEnrollments(nextItems);
    });

    return unsubscribe;
  }, [user?.uid]);

  // Fetch course information when classname changes
  useEffect(() => {
    if (!classname) {
      setCourseInfo(null);
      return;
    }

    const fetchCourseInfo = async () => {
      try {
        const decodedClassname = decodeURIComponent(classname);
        
        const classData = await getCourseByName(decodedClassname);
        
        if (classData && classData.courseId) {
          
          // Fetch the course template using the courseId from the class
          const courseTemplate = await getCourseTemplateById(classData.courseId);
          
          setCourseInfo({
            class: classData,
            courseTemplate: courseTemplate
          });
        } else {
          console.warn('⚠️ StudentDashboardLayout - No courseId found in classData');
          setCourseInfo({ class: classData, courseTemplate: null });
        }
      } catch (error) {
        console.error('❌ Error fetching course info:', error);
        setCourseInfo(null);
      }
    };

    fetchCourseInfo();
  }, [classname]);

  // Get page title and subtitle based on current route
  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/student') {
      return { title: '', subtitle: '' };
    }
    if (path === '/student/calendar') {
      return { title: 'Calendar', subtitle: 'View your schedule and upcoming events.' };
    }
    if (path === '/student/enroll') {
      return { title: 'Enroll', subtitle: 'Browse courses and apply to enroll.' };
    }
    if (path.includes('/student/') && classname) {
      const decodedClassname = decodeURIComponent(classname);
      const formattedTitle = decodedClassname;
      // The class name already carries the qualification, so show the spelled-out
      // certification (e.g., "National Certificate II") instead of repeating
      // "COURSE NAME NC II", which was redundant and doubled the "NC II".
      const subtitle = formatCertification(courseInfo?.courseTemplate?.level || '');

      return { title: formattedTitle, subtitle };
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
    if (path === '/student/notifications') {
      return { title: 'Notifications', subtitle: 'View all trainee alerts and announcements.' };
    }
    return { title: '', subtitle: '' };
  };

  const pageInfo = getPageInfo();

  if (enrollments === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

  // A pending enrollment is a join request awaiting trainer approval — it does
  // not unlock the dashboard. Only active/ongoing/completed seats do.
  const approvedEnrollments = enrollments.filter((e) => e.status !== 'pending');
  const pendingEnrollments = enrollments.filter((e) => e.status === 'pending');

  if (approvedEnrollments.length === 0) {
    return <StudentWaitingRoom pendingEnrollments={pendingEnrollments} />;
  }

  return (
    <div className="h-screen h-[100dvh] w-full max-w-[1920px] mx-auto bg-gray-50 flex flex-col transition-colors duration-200">
      {/* Fixed Navbar - Full Width */}
      <StudentNavbar title={pageInfo.title} subtitle={pageInfo.subtitle} />
      {/* Main Area - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Sidebar */}
        <StudentSidebar />
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

export default StudentDashboardLayout;
