import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  AlertCircle,
  Loader,
  Edit2,
  X,
  Check,
  Plus,
  BookOpen,
  FolderOpen,
} from 'lucide-react';
import {
  getCourses,
  getCoursesTemplates,
  createCourseTemplate,
  getSectors,
  updateCourse,
} from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';

const LEVEL_OPTIONS = ['NC I', 'NC II', 'NC III', 'NC IV'];

// Treat status case-insensitively so a class/course stored as 'active' isn't
// hidden by a query that expected 'Active'.
const isActiveStatus = (status) => String(status || 'active').toLowerCase() === 'active';

const Classes = () => {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]); // course templates (catalog)
  const [classes, setClasses] = useState([]); // running classes
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingClassId, setSavingClassId] = useState(null);

  // New Course (template) modal
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    level: 'NC I',
    sectorId: '',
    status: 'Active',
  });

  const { addToast } = useToast();

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Load everything unfiltered and reconcile status client-side so nothing
      // is hidden by status casing (part of the admin#4 fix).
      const [templatesData, classesData, sectorsData] = await Promise.all([
        getCoursesTemplates({}),
        getCourses({}),
        getSectors({}),
      ]);
      setCourses(templatesData || []);
      setClasses(classesData || []);
      setSectors(sectorsData || []);
    } catch (err) {
      console.error('Error loading catalog:', err);
      setError(err.message || 'Failed to load data');
      addToast('Failed to load classes', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sectorName = (sectorId) => sectors.find((s) => s.id === sectorId)?.name || 'Uncategorized';

  const filteredCourses = courses.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      sectorName(c.sectorId).toLowerCase().includes(q)
    );
  });

  const filteredClasses = classes.filter(
    (course) =>
      (course.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not available';
    try {
      let date;
      if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else {
        return 'Invalid Date';
      }
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
    }
  };

  const toggleExpanded = (classId) => {
    setExpandedClassId(expandedClassId === classId ? null : classId);
  };

  const startEditing = (course) => {
    setEditingClassId(course.id);
    setEditFormData({
      name: course.name || '',
      description: course.description || '',
      level: course.level || '',
      sector: course.sector || '',
      status: course.status || 'Active',
    });
  };

  const cancelEditing = () => {
    setEditingClassId(null);
    setEditFormData({});
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveClassData = async (classId) => {
    try {
      setSavingClassId(classId);
      await updateCourse(classId, editFormData);
      setClasses((prev) => prev.map((cls) => (cls.id === classId ? { ...cls, ...editFormData } : cls)));
      addToast('Class updated successfully', 'success');
      setEditingClassId(null);
      setEditFormData({});
    } catch (err) {
      console.error('Error updating class:', err);
      addToast(`Failed to update class: ${err.message}`, 'error');
    } finally {
      setSavingClassId(null);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.name.trim()) {
      addToast('Give the course a name.', 'error');
      return;
    }
    if (!newCourse.sectorId) {
      addToast('Pick a category (sector) for this course.', 'error');
      return;
    }
    try {
      setSavingCourse(true);
      const { sectorId, ...courseData } = newCourse;
      await createCourseTemplate(courseData, { sectorId });
      // Refresh so the new course shows up immediately (the admin#4 complaint).
      const templatesData = await getCoursesTemplates({});
      setCourses(templatesData || []);
      addToast('Course created successfully!', 'success');
      setNewCourse({ name: '', description: '', level: 'NC I', sectorId: '', status: 'Active' });
      setShowAddCourse(false);
      setActiveTab('courses');
    } catch (err) {
      console.error('Error creating course:', err);
      addToast(err.message || 'Failed to create course', 'error');
    } finally {
      setSavingCourse(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading catalog...</p>
        </div>
      </div>
    );
  }

  const statusBadge = (status) => (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        isActiveStatus(status) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
      }`}
    >
      {status || 'Active'}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Courses &amp; Classes</h1>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">Courses</span> are the catalog (created per category).{' '}
              <span className="font-medium">Classes</span> are the running sessions trainers open from a course.
            </p>
          </div>
          <button
            onClick={() => setShowAddCourse(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Course
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'courses'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-600'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'classes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-600'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Classes ({classes.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'courses' ? 'Search courses…' : 'Search classes…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Error Loading Data</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* ---- Courses (templates) tab ---- */}
        {activeTab === 'courses' && (
          <>
            {filteredCourses.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  {searchTerm ? 'No courses match your search.' : 'No courses yet. Use “New Course” to add one.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course) => (
                  <div key={course.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div
                      className="h-24 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"
                      style={course.bgImage ? { backgroundImage: `url(${course.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    >
                      {!course.bgImage && <BookOpen className="w-8 h-8 text-white/80" />}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">{course.name}</h3>
                        {statusBadge(course.status)}
                      </div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{sectorName(course.sectorId)}</p>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{course.description || 'No description'}</p>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Level</span>
                        <span className="font-semibold text-gray-900">{course.level || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---- Classes tab ---- */}
        {activeTab === 'classes' && (
          <>
            {filteredClasses.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  {searchTerm ? 'No classes match your search.' : 'No classes yet. Trainers open classes from a course.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClasses.map((course) => (
                  <div key={course.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <button
                      onClick={() => toggleExpanded(course.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{course.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {statusBadge(course.status)}
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                            expandedClassId === course.id ? 'transform rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {expandedClassId === course.id && (
                      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 space-y-4">
                        {!editingClassId && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => startEditing(course)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Class
                            </button>
                          </div>
                        )}

                        {editingClassId === course.id ? (
                          <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                                <input
                                  type="text"
                                  value={editFormData.name}
                                  onChange={(e) => handleEditInputChange('name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                  value={editFormData.description}
                                  onChange={(e) => handleEditInputChange('description', e.target.value)}
                                  rows="3"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                                  <input
                                    type="text"
                                    value={editFormData.level}
                                    onChange={(e) => handleEditInputChange('level', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                                  <input
                                    type="text"
                                    value={editFormData.sector}
                                    onChange={(e) => handleEditInputChange('sector', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                  value={editFormData.status}
                                  onChange={(e) => handleEditInputChange('status', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Archived">Archived</option>
                                  <option value="Draft">Draft</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                              <button
                                onClick={() => saveClassData(course.id)}
                                disabled={savingClassId === course.id}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {savingClassId === course.id ? (
                                  <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Save Changes
                                  </>
                                )}
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Course Level</p>
                                <p className="text-gray-900">{course.level || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Status</p>
                                <p className="text-gray-900">{course.status}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Class Code</p>
                                <p className="text-gray-900 font-mono text-xs break-all">{course.classCode || 'N/A'}</p>
                              </div>
                              {course.sector && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-1">Sector</p>
                                  <p className="text-gray-900">{course.sector}</p>
                                </div>
                              )}
                            </div>
                            {course.description && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                                <p className="text-gray-900">{course.description}</p>
                              </div>
                            )}
                            {course.bgImage && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Course Image</p>
                                <img src={course.bgImage} alt={course.name} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
                              </div>
                            )}
                            <div className="pt-2 border-t border-gray-200 space-y-2">
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Created:</span> {formatDate(course.createdAt)}
                              </p>
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Updated:</span> {formatDate(course.updatedAt)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Course modal */}
      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddCourse(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Course</h2>
              <button onClick={() => setShowAddCourse(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Barista NC II"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category (Sector) <span className="text-red-500">*</span></label>
                <select
                  value={newCourse.sectorId}
                  onChange={(e) => setNewCourse((p) => ({ ...p, sectorId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select a category…</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {sectors.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No categories yet — create one on the Sectors page first.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    value={newCourse.level}
                    onChange={(e) => setNewCourse((p) => ({ ...p, level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {LEVEL_OPTIONS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newCourse.status}
                    onChange={(e) => setNewCourse((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse((p) => ({ ...p, description: e.target.value }))}
                  rows="3"
                  placeholder="Short description of the course"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowAddCourse(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCourse}
                disabled={savingCourse}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingCourse ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {savingCourse ? 'Creating…' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
