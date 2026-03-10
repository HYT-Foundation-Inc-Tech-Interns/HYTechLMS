import React, { useState } from 'react';
import { Archive, RefreshCcw, Trash2, Search, Users, X, Check, AlertTriangle } from 'lucide-react';

const ArchivedCourses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [toast, setToast] = useState(null);

  const [archivedCourses, setArchivedCourses] = useState([
    {
      id: 1,
      name: 'Sample Class',
      batch: 'Dreamers Batch 15',
      students: 45,
      archivedDate: '2026-02-15',
      image: '/images/barista_course.jpg'
    },
    {
      id: 2,
      name: 'Barista Basics',
      batch: 'Dreamers Batch 14',
      students: 32,
      archivedDate: '2026-01-20',
      image: '/images/barista_course.jpg'
    },
    {
      id: 3,
      name: 'Coffee Mastery',
      batch: 'Dreamers Batch 13',
      students: 28,
      archivedDate: '2025-12-10',
      image: '/images/barista_course.jpg'
    },
  ]);

  // Toast notification
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Filter courses by search
  const filteredCourses = archivedCourses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.batch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle restore
  const handleRestore = () => {
    if (selectedCourse) {
      setArchivedCourses(archivedCourses.filter(c => c.id !== selectedCourse.id));
      showToast(`"${selectedCourse.name}" restored successfully!`);
      setShowRestoreModal(false);
      setSelectedCourse(null);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (selectedCourse) {
      setArchivedCourses(archivedCourses.filter(c => c.id !== selectedCourse.id));
      showToast(`"${selectedCourse.name}" deleted permanently!`);
      setShowDeleteModal(false);
      setSelectedCourse(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Search */}
      <div className="flex justify-end mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search archived courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-64 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300"
          />
        </div>
      </div>

      {/* Archived Courses List */}
      {filteredCourses.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {filteredCourses.map(course => (
            <div 
              key={course.id} 
              className="p-5 hover:bg-gray-50 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={course.image} 
                      alt={course.name}
                      className="w-full h-full object-cover opacity-80"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{course.name}</h3>
                    <p className="text-sm text-gray-500">{course.batch}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Users className="w-3 h-3" />
                        {course.students} students
                      </span>
                      <span className="text-xs text-gray-400">
                        Archived {new Date(course.archivedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); setShowRestoreModal(true); }}
                    className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-105" 
                    title="Restore"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); setShowDeleteModal(true); }}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-105" 
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Archive className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No courses found' : 'No archived courses'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery 
              ? `No archived courses match "${searchQuery}"`
              : 'When you archive a course, it will appear here. Archived courses can be restored or permanently deleted.'
            }
          </p>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCcw className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Restore Course?</h2>
              <p className="text-gray-500">
                Are you sure you want to restore <strong>"{selectedCourse.name}"</strong>? The course will be moved back to your active courses.
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => { setShowRestoreModal(false); setSelectedCourse(null); }}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRestore}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Permanently?</h2>
              <p className="text-gray-500">
                Are you sure you want to permanently delete <strong>"{selectedCourse.name}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => { setShowDeleteModal(false); setSelectedCourse(null); }}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Permanently
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

export default ArchivedCourses;
