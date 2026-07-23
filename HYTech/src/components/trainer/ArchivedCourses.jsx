import React, { useEffect, useState } from 'react';
import { Archive, RefreshCcw, Trash2, Search, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  deleteClass,
  getCourseEnrollments,
  getCourses,
  toDate,
  updateCourse,
} from '../../utils/firestoreService';

const ArchivedCourses = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [archivedCourses, setArchivedCourses] = useState(null); // null = loading
  const [isWorking, setIsWorking] = useState(false);

  const loadArchived = async () => {
    if (!user?.uid) return;
    try {
      const classes = await getCourses({ trainerId: user.uid, status: 'archived' });

      const withCounts = await Promise.all(
        classes.map(async (cls) => {
          const enrollments = await getCourseEnrollments(cls.id).catch(() => []);
          return {
            id: cls.id,
            name: cls.name || 'Unnamed Class',
            batch: cls.batch || cls.level || '',
            students: enrollments.length,
            archivedDate: toDate(cls.archivedAt) || toDate(cls.updatedAt),
            image: cls.bgImage || cls.image || '',
          };
        })
      );

      setArchivedCourses(withCounts);
    } catch (error) {
      console.error('Error loading archived classes:', error);
      setArchivedCourses([]);
      addToast('Unable to load archived classes.', 'error');
    }
  };

  useEffect(() => {
    loadArchived();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Filter courses by search
  const filteredCourses = (archivedCourses || []).filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.batch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle restore
  const handleRestore = async () => {
    if (!selectedCourse) return;
    setIsWorking(true);
    try {
      await updateCourse(selectedCourse.id, { status: 'active' });
      addToast(`"${selectedCourse.name}" restored successfully!`, 'success');
      setShowRestoreModal(false);
      setSelectedCourse(null);
      await loadArchived();
    } catch {
      addToast('Unable to restore class.', 'error');
    } finally {
      setIsWorking(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCourse) return;
    setIsWorking(true);
    try {
      await deleteClass(selectedCourse.id);
      addToast(`"${selectedCourse.name}" deleted permanently.`, 'success');
      setShowDeleteModal(false);
      setSelectedCourse(null);
      await loadArchived();
    } catch {
      addToast('Unable to delete class.', 'error');
    } finally {
      setIsWorking(false);
    }
  };

  if (archivedCourses === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Search */}
      <div className="flex justify-end mb-6">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search archived classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300 sm:w-64"
          />
        </div>
      </div>

      {/* Archived Classes List */}
      {filteredCourses.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              className="p-5 hover:bg-gray-50 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="w-20 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg overflow-hidden flex-shrink-0">
                    {course.image && (
                      <img
                        src={course.image}
                        alt={course.name}
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{course.name}</h3>
                    {course.batch && <p className="text-sm text-gray-500">{course.batch}</p>}
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Users className="w-3 h-3" />
                        {course.students} students
                      </span>
                      {course.archivedDate && (
                        <span className="text-xs text-gray-400">
                          Archived {course.archivedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
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
            {searchQuery ? 'No classes found' : 'No archived classes'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery
              ? `No archived classes match "${searchQuery}"`
              : 'When you archive a class, it will appear here. Archived classes can be restored or permanently deleted.'
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Restore Class?</h2>
              <p className="text-gray-500">
                Are you sure you want to restore <strong>"{selectedCourse.name}"</strong>? The class will be moved back to your active classes.
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
                disabled={isWorking}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCcw className="w-4 h-4" />
                {isWorking ? 'Restoring...' : 'Restore'}
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
                disabled={isWorking}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isWorking ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivedCourses;
