import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronUp, X, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getCourses,
  getSectors,
  queryActiveEnrollment,
  applyCourse,
} from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';
import { getPlaceholderColor, getGradientStyle } from '../../utils/courseColors';

// Dedicated "Enroll" tab: browse courses by sector and apply for trainer approval.
// (Moved off the student Home page.)
const StudentEnroll = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [sectors, setSectors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activeEnrollment, setActiveEnrollment] = useState(null);

  const [selectedSector, setSelectedSector] = useState(null);
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);

  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingApply, setLoadingApply] = useState(false);
  const [errorCourses, setErrorCourses] = useState(null);

  // Initial load: sectors + active enrollment.
  useEffect(() => {
    if (!user?.uid) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingSectors(true);
        const [sectorsData, activeEnroll] = await Promise.all([
          getSectors({ status: 'Active' }).catch(() => []),
          queryActiveEnrollment(user.uid).catch(() => null),
        ]);
        if (!mounted) return;
        setSectors(sectorsData || []);
        setActiveEnrollment(activeEnroll);
      } finally {
        if (mounted) setLoadingSectors(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  // Load courses whenever the sector filter changes.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingCourses(true);
        setErrorCourses(null);
        const coursesData = await getCourses(
          selectedSector ? { sectorId: selectedSector, status: 'Active' } : { status: 'Active' }
        );
        if (mounted) setCourses(coursesData || []);
      } catch (error) {
        if (mounted) setErrorCourses(error.message || 'Failed to load courses');
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedSector]);

  const handleApplyToCourse = async () => {
    if (!selectedCourse) return;
    try {
      setLoadingApply(true);
      await applyCourse(user.uid, selectedCourse.id);
      addToast(`Successfully applied to ${selectedCourse.name}. Awaiting trainor approval.`, 'success');
      setShowCourseModal(false);
      setSelectedCourse(null);
    } catch (error) {
      addToast(error.message || 'Failed to apply to course', 'error');
    } finally {
      setLoadingApply(false);
    }
  };

  return (
    <div className="p-4">
      <div className="space-y-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Enroll in a Course</h2>
          <p className="text-gray-600">Browse available courses and apply. Your trainor will review your request.</p>
        </div>

        {/* Sector Filter */}
        <div className="relative">
          <button
            onClick={() => setShowSectorDropdown(!showSectorDropdown)}
            className="w-full md:w-96 bg-white border border-gray-300 rounded-lg px-4 py-3 text-left font-medium text-gray-900 hover:bg-gray-50 flex items-center justify-between"
          >
            <span>{selectedSector ? sectors.find((s) => s.id === selectedSector)?.name : 'All Courses'}</span>
            {showSectorDropdown ? <ChevronUp /> : <ChevronDown />}
          </button>

          {showSectorDropdown && (
            <div className="absolute top-full left-0 right-0 md:right-auto md:w-96 mt-2 z-10">
              <div className="space-y-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-72 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedSector(null);
                    setShowSectorDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    !selectedSector ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  All Courses
                </button>
                {loadingSectors ? (
                  <div className="flex items-center justify-center h-16">
                    <Loader className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  sectors.map((sector) => (
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
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Courses Grid */}
        {loadingCourses ? (
          <div className="flex items-center justify-center h-32">
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : errorCourses ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{errorCourses}</p>
          </div>
        ) : !courses || courses.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">No courses available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const sector = sectors.find((s) => s.id === course.sectorId);
              return (
                <div
                  key={course.id}
                  className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer border border-gray-100"
                  onClick={() => {
                    setSelectedCourse(course);
                    setShowCourseModal(true);
                  }}
                >
                  <div
                    className="relative h-48 overflow-hidden"
                    style={
                      course.bgImage
                        ? { backgroundImage: `url(${course.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: getGradientStyle(getPlaceholderColor(course.id).bg) }
                    }
                  >
                    {course.bgImage && <div className="absolute inset-0 bg-black/20" />}
                    {!course.bgImage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-white opacity-80" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 z-10">
                      <span className="px-3 py-1 bg-green-400 text-gray-900 text-xs font-bold rounded-full">
                        {course.status === 'active' ? 'Active' : course.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{course.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{sector?.name || 'General'}</p>
                    <p className="text-sm text-gray-600 mb-4 min-h-5">
                      {course.description ? course.description.substring(0, 50) + '...' : 'No description available'}
                    </p>
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
        )}
      </div>

      {/* Course Modal */}
      {showCourseModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{selectedCourse.name}</h2>
              <button onClick={() => setShowCourseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">{selectedCourse.description}</p>
            <div className="space-y-2 text-sm mb-6">
              <p><span className="font-medium">Level:</span> {selectedCourse.level}</p>
              <p><span className="font-medium">Duration:</span> {selectedCourse.duration?.weeks} weeks</p>
              <p>
                <span className="font-medium">Available Slots:</span>{' '}
                {selectedCourse.capacity - selectedCourse.currentEnrollments}
              </p>
            </div>
            {activeEnrollment && (
              <p className="text-xs text-orange-600 mb-3">
                You already have an active enrollment. You can still apply, subject to trainor approval.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCourseModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyToCourse}
                disabled={loadingApply}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingApply ? 'Applying...' : 'Apply Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentEnroll;
