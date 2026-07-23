import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, X, Award, Play,
  AlertTriangle, Loader, AlertCircleIcon, Plus, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getCoursesTemplates,
  queryActiveEnrollment,
  getStudentEnrollments,
  joinClassByCode,
  getAssessments,
  getAssignments,
  hasStudentAttempted,
  getMySubmission,
} from '../../utils/firestoreService';

import { useToast } from '../../context/ToastContext';
import { getPlaceholderColor, getGradientStyle } from '../../utils/courseColors';

const StudentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // State Management
  const [courseTemplates, setCourseTemplates] = useState([]);
  const [activeEnrollment, setActiveEnrollment] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Class Code Join States
  const [classCode, setClassCode] = useState('');
  const [joiningClass, setJoiningClass] = useState(false);

  const [loadingEnrollment, setLoadingEnrollment] = useState(true);

  // Initialize: Load the student's enrollments + course templates (for images).
  useEffect(() => {
    const initializeData = async () => {
      if (!user?.uid) {
        setLoadingEnrollment(false);
        return;
      }

      try {
        setLoadingEnrollment(true);

        // Course templates carry bgImage for the "My Classes" card images.
        const templateData = await getCoursesTemplates({ status: 'Active' });
        setCourseTemplates(templateData || []);

        const enrollmentsData = await getStudentEnrollments(user.uid);
        setEnrollments(enrollmentsData || []);

        const activeEnroll = await queryActiveEnrollment(user.uid);
        setActiveEnrollment(activeEnroll);
      } catch (error) {
        console.error('Error initializing student data:', error);
      } finally {
        setLoadingEnrollment(false);
      }
    };

    initializeData();
  }, [user?.uid]);

  // Count real pending requirements: published quizzes not yet attempted +
  // submission tasks not yet submitted, across the student's active classes.
  useEffect(() => {
    if (!user?.uid || enrollments.length === 0) {
      setPendingCount(0);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const active = enrollments.filter(
          (e) => e.status === 'active' || e.status === 'ongoing'
        );
        let pending = 0;
        for (const enr of active) {
          const [assessments, assignments] = await Promise.all([
            getAssessments(enr.classId).catch(() => []),
            getAssignments(enr.classId).catch(() => []),
          ]);
          for (const a of assessments.filter((x) => x.status !== 'draft')) {
            const done = await hasStudentAttempted(enr.classId, a.id, user.uid).catch(() => false);
            if (!done) pending += 1;
          }
          for (const a of assignments.filter((x) => x.type === 'Submission' && x.status !== 'draft')) {
            const sub = await getMySubmission(enr.classId, a.id, user.uid).catch(() => null);
            if (!sub) pending += 1;
          }
        }
        if (mounted) setPendingCount(pending);
      } catch {
        if (mounted) setPendingCount(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.uid, enrollments]);

  // Statistics - calculated from real data
  const stats = [
    {
      icon: BookOpen,
      value: enrollments.filter((e) => e.status === 'completed').length,
      label: 'Courses Completed',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: AlertCircle,
      value: pendingCount,
      label: 'Pending Requirements',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    // Training Hours and Attendance Rate are hidden until attendance/hours
    // tracking exists (Phase 2). Showing them would be fake data.
  ];

  // Handle join class by code
  const handleJoinByCode = async (e) => {
    e.preventDefault();

    if (!classCode.trim()) {
      addToast('Please enter a class code', 'error');
      return;
    }

    try {
      setJoiningClass(true);
      const enrollment = await joinClassByCode(user.uid, classCode);
      addToast(`Request sent to join ${enrollment.className}. Awaiting trainor approval.`, 'success');

      // Clear code input
      setClassCode('');
      
      // Reload enrollments
      const updatedEnrollments = await getStudentEnrollments(user.uid);
      setEnrollments(updatedEnrollments);
      
      // Refresh active enrollment
      const activeEnroll = await queryActiveEnrollment(user.uid);
      setActiveEnrollment(activeEnroll);
    } catch (error) {
      console.error('Error joining class:', error);
      addToast(error.message || 'Failed to join class', 'error');
    } finally {
      setJoiningClass(false);
    }
  };

  // Render: Join Class Section — only for students who aren't in a class yet.
  const JoinClassSection = () => {
    // Don't show until enrollment data has loaded
    if (loadingEnrollment) return null;

    // Hide once the student already belongs to a class (active/ongoing).
    const hasClass =
      Boolean(activeEnrollment) ||
      (enrollments || []).some((e) => e.status === 'active' || e.status === 'ongoing');
    if (hasClass) return null;

    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 mb-8 text-white sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left side - Info */}
          <div>
            <h2 className="text-2xl font-bold mb-3 sm:text-3xl">Join a Class</h2>
            <p className="text-blue-100 mb-4">
              Enter your class code to join a class immediately. Your trainor will assign you a class code.
            </p>
            <div className="flex items-center gap-2 text-blue-100 text-sm">
              <Plus className="w-4 h-4" />
              <span>Quick access to class materials and activities</span>
            </div>
          </div>

          {/* Right side - Form */}
          <div>
            <form onSubmit={handleJoinByCode} className="space-y-3">
              <input
                type="text"
                placeholder="Enter class code (e.g. ABC123)"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                disabled={joiningClass}
                className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={joiningClass || !classCode.trim()}
                className="w-full bg-white text-blue-600 font-semibold py-3 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joiningClass ? 'Joining...' : 'Join Class'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Render: Stats Row
  const StatsRow = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg p-4 border border-gray-200 sm:p-6`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color} mt-2`}>
                  {stat.value}
                </p>
              </div>
              <Icon className={`${stat.color} w-8 h-8`} />
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render: Active Enrollment Alert
  const ActiveEnrollmentAlert = () => {
    if (!activeEnrollment) return null;

    return (
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 mb-6 text-white shadow-lg sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">Your Current Class</h3>
            <p className="text-blue-100 text-sm mb-1">
              Enrolled in: <span className="font-semibold">{activeEnrollment.className || 'Class'}</span>
            </p>
            <p className="text-blue-50 text-xs">
              Access your class materials, assignments, and discussions
            </p>
          </div>
          <button
            onClick={() => navigate(`/student/${encodeURIComponent(activeEnrollment.classId || activeEnrollment.className)}`)}
            className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap flex-shrink-0"
          >
            View Class
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Render: Enrollments List (My Classes)
  const EnrollmentsSection = () => {
    // Show current enrollments (exclude completed and not-yet-approved pending).
    const activeEnrollments = (enrollments || []).filter(e => e.status !== 'completed' && e.status !== 'pending');

    if (loadingEnrollment) {
      return (
        <div className="flex items-center justify-center h-20">
          <Loader className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      );
    }

    if (!activeEnrollments || activeEnrollments.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">No active enrollments yet. Enter a class code or browse active classes to get started.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeEnrollments.map((enrollment) => {
          // Look up course template via courseId to get bgImage
          const courseTemplate = courseTemplates.find(t => t.id === enrollment.courseId);
          
          return (
            <div
              key={enrollment.id}
              onClick={() => (enrollment.classId || enrollment.className) && navigate(`/student/${encodeURIComponent(enrollment.classId || enrollment.className)}`)}
              className={`bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer border border-gray-200 ${
                enrollment.className ? '' : 'opacity-75'
              }`}
            >
              {/* Course Image/Header from bgImage via courseId */}
              <div 
                className="relative h-48 overflow-hidden"
                style={
                  courseTemplate?.bgImage
                    ? { 
                        backgroundImage: `url(${courseTemplate.bgImage})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center' 
                      }
                    : { background: getGradientStyle(getPlaceholderColor(enrollment.courseId).bg) }
                }
              >
                {/* Gradient Overlay for better text contrast if using image */}
                {courseTemplate?.bgImage && (
                  <div className="absolute inset-0 bg-black/20"></div>
                )}
                
                {/* Icon for when no image */}
                {!courseTemplate?.bgImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-80" />
                  </div>
                )}
              </div>

              {/* Class Info */}
              <div className="p-4 space-y-4 sm:p-6">
                {/* Title */}
                <div>
                  <h3 className="font-bold text-navy-900 text-lg line-clamp-2">{enrollment.className}</h3>
                  {courseTemplate?.name && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{courseTemplate.name}</p>
                  )}
                </div>

                {/* Status Badge Box */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">Status</p>
                  <p className={`font-bold text-sm ${
                    enrollment.status === 'active'
                      ? 'text-green-700'
                      : enrollment.status === 'completed'
                      ? 'text-blue-700'
                      : 'text-orange-700'
                  } capitalize`}>
                    {enrollment.status || 'N/A'}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 font-medium">Attendance</p>
                    <p className="text-lg font-bold text-navy-900">
                      {enrollment.progress?.attendanceRate ?? '-'}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 font-medium">Level</p>
                    <p className="text-lg font-bold text-blue-600">{courseTemplate?.level || enrollment.level || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 font-medium">Progress</p>
                    <p className="text-lg font-bold text-navy-900">
                      {enrollment.progress?.overallProgress
                        ?? enrollment.progress?.percentage
                        ?? enrollment.progress?.completionRate
                        ?? 0}%
                    </p>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Main Render
  return (
    <div className="p-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2 sm:text-3xl">
            Welcome, {user?.displayName || 'Trainee'}!
          </h1>
        </div>

        {/* Join Class Section */}
        <JoinClassSection />

        {/* Stats */}
        <StatsRow />

        {/* Active Enrollment Alert */}
        <ActiveEnrollmentAlert />

        {/* My Classes Section */}
        {enrollments && enrollments.filter(e => e.status !== 'completed' && e.status !== 'pending').length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
                <p className="text-gray-600 mt-1">Classes you are currently enrolled in</p>
              </div>
            </div>
            <EnrollmentsSection />
          </div>
        )}
      </div>
  );
};

export default StudentHome;
