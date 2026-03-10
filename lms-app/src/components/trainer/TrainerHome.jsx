import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Copy, MoreVertical, Archive, Edit2, Trash2, Check, X } from 'lucide-react';

const TrainerHome = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toast notification
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const courses = [
    {
      id: 1,
      name: 'Barista NCII',
      batch: 'Dreamers Batch 16',
      className: 'Sample Class',
      students: 67,
      image: '/images/barista_course.jpg',
      color: 'from-blue-600 to-blue-800'
    },
    {
      id: 2,
      name: 'Barista NCII',
      batch: 'Dreamers Batch 16',
      className: 'Sample Class',
      students: 67,
      image: '/images/barista_course.jpg',
      color: 'from-purple-600 to-purple-800'
    },
    {
      id: 3,
      name: 'Barista NCII',
      batch: 'Dreamers Batch 16',
      className: 'Sample Class',
      students: 67,
      image: '/images/barista_course.jpg',
      color: 'from-teal-600 to-teal-800'
    },
  ];

  const handleCopyCode = (e, course) => {
    e.stopPropagation();
    navigator.clipboard.writeText('HYTGLOBAL');
    showToast(`Class code for "${course.className}" copied!`);
  };

  const handleViewProgress = (e, course) => {
    e.stopPropagation();
    showToast(`Viewing progress for "${course.className}"`);
  };

  const handleArchive = () => {
    showToast(`"${selectedCourse.className}" archived successfully!`);
    setShowArchiveModal(false);
    setSelectedCourse(null);
  };

  const CourseCard = ({ course }) => (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
      onClick={() => navigate(`/dashboard/courses/${course.id}`)}
    >
      {/* Course Image */}
      <div className="relative h-48 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${course.color} opacity-80`} />
        <img 
          src={course.image}
          alt={course.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        {/* Student Count Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full group-hover:bg-white/30 transition-colors">
          <Users className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">{course.students} Students</span>
        </div>
      </div>

      {/* Course Info */}
      <div className="p-5">
        <div className="border-b border-gray-100 pb-4 mb-4">
          <p className="text-sm text-gray-500 mb-1">{course.batch}</p>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{course.className}</h3>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button 
            className="p-2 hover:bg-blue-50 rounded-lg transition-all duration-200 text-gray-500 hover:text-blue-600 hover:scale-110"
            onClick={(e) => handleViewProgress(e, course)}
            title="View Progress"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
          <button 
            className="p-2 hover:bg-blue-50 rounded-lg transition-all duration-200 text-gray-500 hover:text-blue-600 hover:scale-110"
            onClick={(e) => handleCopyCode(e, course)}
            title="Copy Class Code"
          >
            <Copy className="w-5 h-5" />
          </button>
          <div className="relative" ref={activeMenu === course.id ? menuRef : null}>
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-500 hover:text-gray-700 hover:scale-110"
              onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === course.id ? null : course.id); }}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {activeMenu === course.id && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-slide-down">
                <button
                  onClick={(e) => { e.stopPropagation(); showToast('Edit feature coming soon!'); setActiveMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Course</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); setShowArchiveModal(true); setActiveMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); showToast('Delete feature coming soon!'); setActiveMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Classes</h1>
        <p className="text-gray-500">Manage your courses and track student progress</p>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {/* Empty State (when no courses) */}
      {courses.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Copy className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses yet</h3>
          <p className="text-gray-500 mb-6">Create your first course to get started</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Create Course
          </button>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Archive className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Archive Course?</h2>
              <p className="text-gray-500">
                Are you sure you want to archive <strong>"{selectedCourse.className}"</strong>? You can restore it later from Archived Courses.
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => { setShowArchiveModal(false); setSelectedCourse(null); }}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleArchive}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl z-50 animate-slide-up bg-green-600 text-white flex items-center gap-3">
          <Check className="w-5 h-5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default TrainerHome;
