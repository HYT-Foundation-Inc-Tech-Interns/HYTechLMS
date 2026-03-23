import React, { useEffect, useState } from 'react';
import { 
  Archive,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Star,
  Users,
  X,
  BookOpen,
  Award,
  FileText,
  BarChart3
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';

const DEFAULT_ARCHIVED_COURSES = [
  {
    id: 1,
    name: 'Barista NCII',
    instructor: 'Anna Reyes',
    completedDate: 'Dec 15, 2025',
    rating: 4.5,
    students: 30,
    image: '/images/barista.png',
    finalGrade: 'A',
    recipientName: 'Gerald Andrei Lat',
    credentialId: 'CERT-2025-001',
    scores: {
      quizzes: 92,
      assignments: 94,
      exams: 90,
    },
  },
  {
    id: 2,
    name: 'Visual Graphics Design',
    instructor: 'Mark Silva',
    completedDate: 'Nov 20, 2025',
    rating: 4.2,
    students: 25,
    image: '/images/graphics.png',
    finalGrade: 'A-',
    recipientName: 'Gerald Andrei Lat',
    credentialId: 'CERT-2025-002',
    scores: {
      quizzes: 88,
      assignments: 91,
      exams: 87,
    },
  },
  {
    id: 3,
    name: 'Food Safety Management',
    instructor: 'Patricia Santos',
    completedDate: 'Oct 5, 2025',
    rating: 4.8,
    students: 45,
    image: '/images/food_safety.png',
    finalGrade: 'B+',
    recipientName: 'Gerald Andrei Lat',
    credentialId: 'CERT-2025-003',
    scores: {
      quizzes: 84,
      assignments: 86,
      exams: 83,
    },
  },
];

const StudentArchivedCourses = () => {
  const [uid, setUid] = useState('guest');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [archivedCourses, setArchivedCourses] = useState(DEFAULT_ARCHIVED_COURSES);

  const archivedStorageKey = `hyt:student:archived-courses:${uid}`;

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(archivedStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setArchivedCourses(parsed);
          return;
        }
      }
      setArchivedCourses(DEFAULT_ARCHIVED_COURSES);
    } catch {
      setArchivedCourses(DEFAULT_ARCHIVED_COURSES);
    }
  }, [archivedStorageKey]);

  useEffect(() => {
    localStorage.setItem(archivedStorageKey, JSON.stringify(archivedCourses));
  }, [archivedCourses, archivedStorageKey]);

  const getOverallProgress = (course) => {
    const values = [course?.scores?.quizzes, course?.scores?.assignments, course?.scores?.exams]
      .map((value) => Number(value || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
  };

  const handleDelete = (course) => {
    setSelectedCourse(course);
    setShowDeleteModal(true);
  };

  const handleView = (course) => {
    setSelectedCourse(course);
    setShowViewModal(true);
  };

  const confirmDelete = () => {
    if (selectedCourse) {
      setArchivedCourses((prev) => prev.filter((course) => course.id !== selectedCourse.id));
    }
    setShowDeleteModal(false);
    setSelectedCourse(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Archive className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-gray-900 uppercase text-sm">Archived Courses</h2>
        <span className="text-sm text-gray-500 ml-2">({archivedCourses.length})</span>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {archivedCourses.map((course) => (
          <div 
            key={course.id}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
          >
            {/* Course Image */}
            <div className="relative h-40 bg-gradient-to-br from-[#0D4291] to-[#0B005C]">
              <img 
                src={course.image} 
                alt={course.name}
                className="w-full h-full object-cover opacity-80"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              
              {/* Completed Badge */}
              <div className="absolute top-3 left-3 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </div>

              {/* Grade Badge */}
              <div className="absolute top-3 right-3 px-3 py-1.5 bg-white text-[#0D4291] text-sm font-bold rounded-full">
                Grade: {course.finalGrade}
              </div>
            </div>

            {/* Course Details */}
            <div className="p-4 space-y-3">
              <h3 className="font-bold text-gray-900 text-lg">{course.name}</h3>
              <p className="text-sm text-gray-500">{course.instructor}</p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{course.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{course.students} students</span>
                </div>
              </div>

              {/* Completion Date */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Completed: {course.completedDate}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => handleView(course)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D4291] text-white rounded-lg font-medium hover:bg-[#0a3577] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Course
                </button>
                <button 
                  onClick={() => handleDelete(course)}
                  className="p-2.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State (shown when no courses) */}
      {archivedCourses.length === 0 && (
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No Archived Courses</h3>
          <p className="text-gray-500">Completed courses will appear here</p>
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
                  <span className="px-3 py-1 bg-white text-[#0D4291] text-sm font-bold rounded-full">
                    Grade: {selectedCourse.finalGrade}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedCourse.name}</h2>
                <p className="text-white/80">Instructor: {selectedCourse.instructor}</p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
              {/* Course Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xl font-bold text-gray-900">{selectedCourse.rating}</span>
                  </div>
                  <p className="text-sm text-gray-500">Course Rating</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-xl font-bold text-gray-900">{selectedCourse.students}</span>
                  </div>
                  <p className="text-sm text-gray-500">Students</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-5 h-5 text-green-500" />
                    <span className="text-xl font-bold text-gray-900">100%</span>
                  </div>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>

              {/* Course Description */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0D4291]" />
                  Course Overview
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                </p>
              </div>

              {/* Learning Outcomes */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#0D4291]" />
                  What You Learned
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Sed do eiusmod tempor incididunt ut labore et dolore</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Ut enim ad minim veniam, quis nostrud exercitation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Duis aute irure dolor in reprehenderit in voluptate</span>
                  </li>
                </ul>
              </div>

              {/* Course Modules */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0D4291]" />
                  Course Modules
                </h3>
                <div className="space-y-2">
                  {['Module 1: Introduction', 'Module 2: Fundamentals', 'Module 3: Advanced Concepts', 'Module 4: Practical Application', 'Module 5: Final Assessment'].map((module, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-gray-700 font-medium">{module}</span>
                      <span className="ml-auto text-sm text-gray-500">Completed</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completion Info */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div>
                  <p className="text-sm text-green-600 font-medium">Completion Date</p>
                  <p className="text-lg font-bold text-green-700">{selectedCourse.completedDate}</p>
                </div>
                <button
                  onClick={() => setShowCertificateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0D4291] text-white rounded-xl font-medium hover:bg-[#0a3577] transition-colors"
                >
                  <Award className="w-4 h-4" />
                  View Certificate
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-blue-700" />
                  <h4 className="font-bold text-blue-900">Overall Progress Statistics</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-gray-500">Quizzes</p>
                    <p className="text-xl font-bold text-gray-900">{selectedCourse.scores?.quizzes || 0}%</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-gray-500">Assignments</p>
                    <p className="text-xl font-bold text-gray-900">{selectedCourse.scores?.assignments || 0}%</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-gray-500">Exams</p>
                    <p className="text-xl font-bold text-gray-900">{selectedCourse.scores?.exams || 0}%</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-gray-500">Overall</p>
                    <p className="text-xl font-bold text-blue-700">{getOverallProgress(selectedCourse)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {showCertificateModal && selectedCourse && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCertificateModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Certificate of Completion</h3>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 bg-white">
              <div className="border-4 border-[#1e3a8a] rounded-xl p-6">
                <div className="border border-[#1e3a8a] rounded-lg p-8 text-center">
                  <Award className="w-12 h-12 text-[#1e3a8a] mx-auto mb-3" />
                  <h4 className="text-2xl font-black text-[#1e3a8a] tracking-wide">CERTIFICATE OF COMPLETION</h4>
                  <p className="text-sm text-gray-500 mt-4">This certifies that</p>
                  <p className="text-3xl text-[#1e3a8a] mt-1" style={{ fontFamily: "'Pinyon Script', cursive" }}>
                    {selectedCourse.recipientName || 'Student'}
                  </p>
                  <p className="text-sm text-gray-500 mt-4">has successfully completed</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{selectedCourse.name}</p>
                  <div className="grid grid-cols-2 gap-4 mt-8 text-sm text-left">
                    <div>
                      <p className="text-gray-500">Date Issued</p>
                      <p className="font-semibold text-gray-900">{selectedCourse.completedDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Credential ID</p>
                      <p className="font-semibold text-gray-900">{selectedCourse.credentialId || `CERT-${selectedCourse.id}`}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-5 py-2.5 bg-[#0D4291] text-white rounded-xl font-medium hover:bg-[#0a3577] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCourse && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowDeleteModal(false); setSelectedCourse(null); }}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Archived Course?</h3>
              <p className="text-gray-500 mb-6">
                Are you sure you want to remove <span className="font-semibold text-gray-700">{selectedCourse.name}</span> from your archives? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowDeleteModal(false); setSelectedCourse(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
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
