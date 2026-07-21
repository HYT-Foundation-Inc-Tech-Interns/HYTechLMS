import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, X, Award, Play,
  AlertTriangle, Loader, AlertCircleIcon, Plus, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getCourses,
  getCoursesTemplates,
  getSectors,
  queryActiveEnrollment,
  getStudentEnrollments,
  applyCourse,
  joinClassByCode,
  getAssessments,
  getAssignments,
  hasStudentAttempted,
  getMySubmission,
} from '../../utils/firestoreService';

import { useToast } from '../../context/ToastContext';

// Color palette for course placeholders
const COLOR_PALETTE = [
  { bg: 'from-blue-500 to-blue-700', light: 'from-blue-400 to-blue-600' },
  { bg: 'from-purple-500 to-purple-700', light: 'from-purple-400 to-purple-600' },
  { bg: 'from-pink-500 to-pink-700', light: 'from-pink-400 to-pink-600' },
  { bg: 'from-red-500 to-red-700', light: 'from-red-400 to-red-600' },
  { bg: 'from-orange-500 to-orange-700', light: 'from-orange-400 to-orange-600' },
  { bg: 'from-yellow-500 to-yellow-700', light: 'from-yellow-400 to-yellow-600' },
  { bg: 'from-green-500 to-green-700', light: 'from-green-400 to-green-600' },
  { bg: 'from-teal-500 to-teal-700', light: 'from-teal-400 to-teal-600' },
  { bg: 'from-cyan-500 to-cyan-700', light: 'from-cyan-400 to-cyan-600' },
  { bg: 'from-indigo-500 to-indigo-700', light: 'from-indigo-400 to-indigo-600' },
];

// Generate consistent color based on course ID
const getPlaceholderColor = (courseId) => {
  if (!courseId) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    const char = courseId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};



// Convert Tailwind color names to actual CSS colors
const getGradientStyle = (color) => {
  const colorMap = {
    'from-blue-500 to-blue-700': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'from-purple-500 to-purple-700': 'linear-gradient(135deg, #a855f7 0%, #6d28d9 100%)',
    'from-pink-500 to-pink-700': 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'from-red-500 to-red-700': 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    'from-orange-500 to-orange-700': 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
    'from-yellow-500 to-yellow-700': 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
    'from-green-500 to-green-700': 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
    'from-teal-500 to-teal-700': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    'from-cyan-500 to-cyan-700': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    'from-indigo-500 to-indigo-700': 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  };
  return colorMap[color] || 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
};

const StudentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // State Management
  const [sectors, setSectors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseTemplates, setCourseTemplates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeEnrollment, setActiveEnrollment] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showEnrollWarning, setShowEnrollWarning] = useState(false);

  // Class Code Join States
  const [classCode, setClassCode] = useState('');
  const [joiningClass, setJoiningClass] = useState(false);

  // Loading & Error States
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingEnrollment, setLoadingEnrollment] = useState(true);
  const [loadingApply, setLoadingApply] = useState(false);
  
  const [errorSectors, setErrorSectors] = useState(null);
  const [errorCourses, setErrorCourses] = useState(null);
  const [errorEnrollment, setErrorEnrollment] = useState(null);

  // Initialize: Load sectors and enrollments
  useEffect(() => {
    const initializeData = async () => {
      if (!user?.uid) {
        setLoadingSectors(false);
        setLoadingEnrollment(false);
        return;
      }

      try {
        // Load sectors
        setLoadingSectors(true);
        const sectorsData = await getSectors({ status: 'Active' });
        setSectors(sectorsData || []);
        setErrorSectors(null);

        // Load ALL courses initially
        setLoadingCourses(true);
        const coursesData = await getCourses({ status: 'Active' });
        setCourses(coursesData || []);
        setErrorCourses(null);

        // Load course templates with bgImage for image lookup via courseId
        const templateData = await getCoursesTemplates({ status: 'Active' });
        setCourseTemplates(templateData || []);

        // Load student's enrollments
        setLoadingEnrollment(true);
        const enrollmentsData = await getStudentEnrollments(user.uid);
        setEnrollments(enrollmentsData || []);

        // Check for active enrollment
        const activeEnroll = await queryActiveEnrollment(user.uid);
        setActiveEnrollment(activeEnroll);
        setErrorEnrollment(null);
      } catch (error) {
        console.error('Error initializing student data:', error);
        setErrorSectors(error.message);
      } finally {
        setLoadingSectors(false);
        setLoadingEnrollment(false);
        setLoadingCourses(false);
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

  // Load courses when sector changes (filter by sector)
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        setErrorCourses(null);
        
        // If a sector is selected, filter by it; otherwise show all
        const coursesData = await getCourses(
          selectedSector
            ? { sectorId: selectedSector, status: 'Active' }
            : { status: 'Active' }
        );
        
        console.table(coursesData?.map(c => ({ 
          id: c.id, 
          name: c.name, 
          sector: c.sectorName, 
          courseId: c.courseId || '(none)',
          bgImage: c.bgImage ? '✓' : '✗'
        })) || []);
        setCourses(coursesData || []);
      } catch (error) {
        console.error('Error loading courses:', error);
        setErrorCourses(error.message);
      } finally {
        setLoadingCourses(false);
      }
    };

    // Only load if sector changed (not on initial load)
    if (selectedSector || selectedSector === undefined) {
      loadCourses();
    }
  }, [selectedSector]);

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

  // Handle course modal. Trainees may enroll in multiple subjects, so opening
  // a course is never blocked by an existing enrollment.
  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  // Handle apply to course
  const handleApplyToCourse = async () => {
    if (!selectedCourse) return;

    try {
      setLoadingApply(true);
      const appId = await applyCourse(user.uid, selectedCourse.id);
      addToast(
        `Successfully applied to ${selectedCourse.name}. Awaiting trainor approval.`,
        'success'
      );
      setShowCourseModal(false);
      setSelectedCourse(null);
    } catch (error) {
      console.error('Error applying to course:', error);
      addToast(error.message || 'Failed to apply to course', 'error');
    } finally {
      setLoadingApply(false);
    }
  };

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

  // Render: Join Class Section (students can join additional classes anytime)
  const JoinClassSection = () => {
    // Don't show until enrollment data has loaded
    if (loadingEnrollment) return null;

    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 mb-8 text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left side - Info */}
          <div>
            <h2 className="text-3xl font-bold mb-3">Join a Class</h2>
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
            className={`${stat.bgColor} rounded-lg p-6 border border-gray-200`}
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
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 mb-6 text-white shadow-lg">
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
            onClick={() => navigate(`/student/${encodeURIComponent(activeEnrollment.className)}`)}
            className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap flex-shrink-0"
          >
            View Class
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Render: Sectors Dropdown
  const SectorsDropdown = () => {
    if (loadingSectors) {
      return (
        <div className="flex items-center justify-center h-20">
          <Loader className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      );
    }

    if (errorSectors) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{errorSectors}</p>
        </div>
      );
    }

    if (!sectors || sectors.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">No sectors available</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 bg-white rounded-lg border border-gray-200">
        {sectors.map((sector) => (
          <button
            key={sector.id}
            onClick={() => {
              setSelectedSector(sector.id);
              setShowSectorDropdown(false);
            }}
            className={`w-full text-left px-4 py-3 text-sm transition-colors ${
              selectedSector === sector.id
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            {sector.name}
          </button>
        ))}
      </div>
    );
  };

  // Render: Popular Courses
  const PopularCoursesSection = () => {
    // Log courses being displayed
    if (courses && courses.length > 0) {
      console.table(courses.map(c => ({ 
        id: c.id, 
        name: c.name, 
        sector: c.sectorName, 
        courseId: c.courseId || '(none)',
        bgImage: c.bgImage ? '✓' : '✗'
      })));
    }
    
    if (loadingCourses) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      );
    }

    if (errorCourses) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{errorCourses}</p>
        </div>
      );
    }

    if (!courses || courses.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">No courses available</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          // Get sector name
          const sector = sectors.find(s => s.id === course.sectorId);
          
          return (
            <div
              key={course.id}
              className={`bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer border border-gray-100`}
              onClick={() => handleCourseClick(course)}
            >
              {/* Course Image/Header */}
              <div 
                className="relative h-48 overflow-hidden"
                style={
                  course.bgImage
                    ? { 
                        backgroundImage: `url(${course.bgImage})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center' 
                      }
                    : { background: getGradientStyle(getPlaceholderColor(course.id).bg) }
                }
              >
                {/* Gradient Overlay for better text contrast if using image */}
                {course.bgImage && (
                  <div className="absolute inset-0 bg-black/20"></div>
                )}
                
                {/* Icon for when no image */}
                {!course.bgImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-80" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 bg-green-400 text-gray-900 text-xs font-bold rounded-full">
                    {course.status === 'active' ? 'Active' : course.status}
                  </span>
                </div>
              </div>

              {/* Course Info */}
              <div className="p-5">
                {/* Course Name */}
                <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">
                  {course.name}
                </h3>

                {/* Sector/Category */}
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                  {sector?.name || 'General'}
                </p>

                {/* Description or placeholder */}
                <p className="text-sm text-gray-600 mb-4 min-h-5">
                  {course.description ? course.description.substring(0, 50) + '...' : 'No description available'}
                </p>

                {/* Level and Status Info */}
                <div className="border-t border-gray-200 pt-3 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Level</p>
                    <p className="font-bold text-gray-900">{course.level || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Status</p>
                    <p className="font-bold text-green-700 capitalize">{course.status}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
          <p className="text-gray-600">No active enrollments yet. Apply to a course to get started!</p>
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
              onClick={() => enrollment.className && navigate(`/student/${encodeURIComponent(enrollment.className)}`)}
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
              <div className="p-6 space-y-4">
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
                      {enrollment.progress?.attendanceRate || '-'}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 font-medium">Level</p>
                    <p className="text-lg font-bold text-blue-600">{courseTemplate?.level || enrollment.level || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 font-medium">Progress</p>
                    <p className="text-lg font-bold text-navy-900">{enrollment.progress?.completionRate || '0'}%</p>
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
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Welcome, {user?.displayName}!</h1>
          <p className="text-gray-600">Track your learning progress and explore new courses</p>
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

        {/* Available Courses Section */}
        <div className="space-y-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Available Classes</h2>
            <p className="text-gray-600">Explore classes you can apply to</p>
          </div>

          {/* Sector Filter */}
          <div className="relative">
            <button
              onClick={() => setShowSectorDropdown(!showSectorDropdown)}
              className="w-full md:w-96 bg-white border border-gray-300 rounded-lg px-4 py-3 text-left font-medium text-gray-900 hover:bg-gray-50 flex items-center justify-between"
            >
              <span>
                {selectedSector
                  ? sectors.find(s => s.id === selectedSector)?.name
                  : 'All Courses'}
              </span>
              {showSectorDropdown ? <ChevronUp /> : <ChevronDown />}
            </button>

            {showSectorDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 z-10">
                <div className="space-y-2 bg-white rounded-lg border border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedSector(null);
                      setShowSectorDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      !selectedSector
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    All Courses
                  </button>
                  <SectorsDropdown />
                </div>
              </div>
            )}
          </div>

          {/* Courses Grid */}
          <PopularCoursesSection />
        </div>

        {/* Course Modal */}
        {showCourseModal && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedCourse.name}</h2>
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 text-sm mb-4">{selectedCourse.description}</p>

              <div className="space-y-2 text-sm mb-6">
                <p><span className="font-medium">Level:</span> {selectedCourse.level}</p>
                <p><span className="font-medium">Duration:</span> {selectedCourse.duration?.weeks} weeks</p>
                <p><span className="font-medium">Available Slots:</span> {selectedCourse.capacity - selectedCourse.currentEnrollments}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyToCourse}
                  disabled={loadingApply || activeEnrollment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingApply ? 'Applying...' : 'Apply Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enrollment Warning Modal */}
        {showEnrollWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <h2 className="text-xl font-bold text-red-600 mb-4">Active Enrollment</h2>
              <p className="text-gray-700 mb-6">
                You currently have an active enrollment. You can only enroll in one course at a time.
                Please complete or terminate your current course before applying to another.
              </p>
              <button
                onClick={() => setShowEnrollWarning(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                OK, Got it
              </button>
            </div>
          </div>
        )}
      </div>
  );
};

export default StudentHome;
