import React, { useEffect, useState } from 'react';
import { 
  Archive,
  Eye,
  CheckCircle2,
  Clock,
  X,
  BookOpen,
  FileText,
  Loader
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import {
  getStudentEnrollments,
  getCoursesTemplates,
  subscribeToClassPrefs,
} from '../../utils/firestoreService';
import { getGradientStyle, getPlaceholderColor } from '../../utils/courseColors';
import ClassCardPersonalization from './ClassCardPersonalization';

const StudentArchivedCourses = () => {
  const [uid, setUid] = useState('guest');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [archivedCourses, setArchivedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseTemplates, setCourseTemplates] = useState([]);
  const [classPrefs, setClassPrefs] = useState({});

  useEffect(() => {
    if (!auth) {
      setUid('guest');
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || 'guest');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => subscribeToClassPrefs(uid === 'guest' ? null : uid, setClassPrefs), [uid]);

  // Load archived/completed enrollments from database
  useEffect(() => {
    const loadArchivedClasses = async () => {
      if (!uid || uid === 'guest') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load course templates
        const templates = await getCoursesTemplates();
        setCourseTemplates(templates || []);

        // Load all student enrollments
        const enrollments = await getStudentEnrollments(uid);

        // Filter only completed/graduated enrollments
        const completedEnrollments = (enrollments || []).filter(e => e.status === 'completed');

        // Map to archived course format
        const archived = completedEnrollments.map((enrollment) => {
          const courseTemplate = templates?.find(t => t.id === enrollment.courseId);
          return {
            id: enrollment.id,
            classId: enrollment.classId,
            sharedName: enrollment.className || 'Graduated Class',
            name: enrollment.className || 'Graduated Class',
            // Enrollment values are the graduation-time record. Template data
            // is fallback-only for older enrollments that never stored it.
            courseName: enrollment.courseName || courseTemplate?.name || 'Course',
            instructor: enrollment.trainerName || 'Not recorded',
            description: enrollment.description || courseTemplate?.description || '',
            modules: Array.isArray(enrollment.subjects)
              ? enrollment.subjects
              : (Array.isArray(courseTemplate?.subjects) ? courseTemplate.subjects : []),
            completedDate: enrollment.completedAt 
              ? new Date(enrollment.completedAt.toDate?.() || enrollment.completedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              : 'Recently completed',
            image: enrollment.bgImage || courseTemplate?.bgImage || null,
            color:
              enrollment.color
              || getPlaceholderColor(enrollment.courseId || enrollment.classId).bg,
            finalGrade: enrollment.finalGrade || '',
            progress:
              enrollment.progress?.overallProgress
              ?? enrollment.progress?.percentage
              ?? enrollment.progress?.completionRate
              ?? 100,
          };
        });

        setArchivedCourses(archived);
      } catch (error) {
        console.error('Error loading archived classes:', error);
        setArchivedCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadArchivedClasses();
  }, [uid]);

  const getOverallProgress = (course) => {
    return Math.min(100, Math.max(0, Number(course?.progress) || 0));
  };

  const handleView = (course) => {
    setSelectedCourse(course);
    setShowViewModal(true);
  };

  return (
    <div className="p-4 space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Archive className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-gray-900 uppercase text-sm">Archived Classes</h2>
        <span className="text-sm text-gray-500 ml-2">({archivedCourses.length})</span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading archived classes...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && archivedCourses.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center sm:p-12">
          <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Archived Classes Yet</h3>
          <p className="text-gray-600">When you complete a class, it will appear here as an archived class.</p>
        </div>
      )}

      {/* Courses Grid */}
      {!loading && archivedCourses.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {archivedCourses.map((course) => {
            const preference = classPrefs[course.classId] || {};
            const effectiveName = preference.nickname || course.sharedName;
            const effectiveColor = preference.color || course.color;
            return (
            <div 
              key={course.id}
              className="relative rounded-2xl border border-gray-100 bg-white transition-all hover:shadow-lg group"
            >
            {/* Course Image */}
            <div
              className="relative h-24 overflow-hidden rounded-t-2xl sm:h-40"
              style={course.image ? undefined : { background: getGradientStyle(effectiveColor) }}
            >
              {course.image && (
                <>
                  <img
                    src={course.image}
                    alt={effectiveName}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-45"
                    style={{ background: getGradientStyle(effectiveColor) }}
                  />
                </>
              )}
              
              {/* Completed Badge */}
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-[9px] font-bold text-white sm:left-3 sm:top-3 sm:px-3 sm:text-xs">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </div>

              {/* Grade Badge — stays bottom-right at every width so the top-right
                  corner belongs to the personalize button alone. */}
              {course.finalGrade && (
                <div className="absolute bottom-2 right-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#0D4291] sm:bottom-3 sm:right-3 sm:px-3 sm:py-1.5 sm:text-sm">
                  Grade: {course.finalGrade}
                </div>
              )}
              <ClassCardPersonalization
                userId={uid}
                classId={course.classId}
                preference={preference}
                className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3"
              />
            </div>

            {/* Course Details */}
            <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
              <div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 sm:text-lg">{effectiveName}</h3>
                  {preference.nickname && (
                    <p className="mt-1 truncate text-xs text-gray-400">Shared name: {course.sharedName}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1 sm:text-sm">{course.instructor}</p>

              {/* Completion Date */}
              <div className="flex items-center gap-1 text-xs text-gray-500 sm:gap-2 sm:text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Completed: {course.completedDate}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => handleView({ ...course, name: effectiveName, color: effectiveColor })}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0D4291] px-2 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#0a3577] sm:gap-2 sm:px-4 sm:text-base"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden min-[360px]:inline">View Course</span>
                </button>
              </div>
            </div>
          </div>
            );
          })}
        </div>
      )}

      {/* View Course Modal */}
      {showViewModal && selectedCourse && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowViewModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative h-48 bg-gradient-to-br from-[#0D4291] to-[#0B005C]">
              <img 
                src={selectedCourse.image} 
                alt={selectedCourse.name}
                className="w-full h-full object-cover opacity-60"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div
                className="absolute inset-0 opacity-35"
                style={{ background: getGradientStyle(selectedCourse.color || selectedCourse.courseColor) }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button 
                onClick={() => setShowViewModal(false)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="absolute bottom-4 left-6 right-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </span>
                  {selectedCourse.finalGrade && (
                    <span className="px-3 py-1 bg-white text-[#0D4291] text-sm font-bold rounded-full">
                      Grade: {selectedCourse.finalGrade}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedCourse.name}</h2>
                <p className="text-white/80">Instructor: {selectedCourse.instructor}</p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
              {/* Course Stats */}
              <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-5 h-5 text-green-500" />
                    <span className="text-xl font-bold text-gray-900">{selectedCourse.completedDate}</span>
                  </div>
                  <p className="text-sm text-gray-500">Completion date</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-gray-900">{getOverallProgress(selectedCourse)}%</p>
                  <p className="text-sm text-gray-500">Recorded progress</p>
                </div>
              </div>

              {/* Course Description */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0D4291]" />
                  Course Overview
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {selectedCourse.description || 'No course description was recorded.'}
                </p>
              </div>

              {/* Course Modules */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0D4291]" />
                  Course Modules
                </h3>
                <div className="space-y-2">
                  {selectedCourse.modules.map((module, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-gray-700 font-medium">{module}</span>
                      <span className="ml-auto text-sm text-gray-500">Completed</span>
                    </div>
                  ))}
                  {selectedCourse.modules.length === 0 && (
                    <p className="text-sm text-gray-500">No module list was recorded for this course.</p>
                  )}
                </div>
              </div>

              {/* Completion Info */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div>
                  <p className="text-sm text-green-600 font-medium">Completion Date</p>
                  <p className="text-lg font-bold text-green-700">{selectedCourse.completedDate}</p>
                </div>
              </div>

            </div>
          </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentArchivedCourses;
