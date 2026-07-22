import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  Trash2,
  X,
  Plus,
  Save,
  AlertCircle,
  MoreVertical,
  Edit,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSectors, createSector, updateSector, deleteSector, getCourses, getCoursesTemplates, createCourseTemplate, updateCourseTemplate, updateCourse, deleteCourse, reconcileSectorStatuses } from '../../utils/firestoreService';

const Sectors = () => {
  // Helper function to convert Tailwind gradient classes to inline CSS
  const getGradientStyle = (colorClass) => {
    if (!colorClass) {
      return {};
    }
    
    // Map common Tailwind gradient patterns to actual CSS
    const gradientMap = {
      'from-gray-600 to-gray-800': 'linear-gradient(to right, rgb(75, 85, 99), rgb(31, 41, 55))',
      'from-blue-600 to-blue-800': 'linear-gradient(to right, rgb(37, 99, 235), rgb(30, 58, 138))',
      'from-green-600 to-green-800': 'linear-gradient(to right, rgb(22, 163, 74), rgb(20, 83, 45))',
      'from-red-600 to-red-800': 'linear-gradient(to right, rgb(220, 38, 38), rgb(127, 29, 29))',
      'from-purple-600 to-purple-800': 'linear-gradient(to right, rgb(147, 51, 234), rgb(88, 28, 135))',
      'from-orange-600 to-orange-800': 'linear-gradient(to right, rgb(234, 88, 12), rgb(124, 45, 18))',
      'from-indigo-600 to-indigo-800': 'linear-gradient(to right, rgb(79, 70, 229), rgb(55, 48, 163))',
    };
    
    return { background: gradientMap[colorClass] };
  };

  // Color palette for course placeholders
  const COLOR_PALETTE = [
    'linear-gradient(135deg, rgb(59, 130, 246), rgb(30, 58, 138))',      // blue
    'linear-gradient(135deg, rgb(168, 85, 247), rgb(88, 28, 135))',      // purple
    'linear-gradient(135deg, rgb(236, 72, 153), rgb(190, 24, 93))',      // pink
    'linear-gradient(135deg, rgb(239, 68, 68), rgb(127, 29, 29))',       // red
    'linear-gradient(135deg, rgb(249, 115, 22), rgb(120, 53, 15))',      // orange
    'linear-gradient(135deg, rgb(234, 179, 8), rgb(113, 63, 18))',       // yellow
    'linear-gradient(135deg, rgb(34, 197, 94), rgb(20, 83, 45))',        // green
    'linear-gradient(135deg, rgb(20, 184, 166), rgb(13, 78, 76))',       // teal
    'linear-gradient(135deg, rgb(34, 211, 238), rgb(6, 78, 115))',       // cyan
    'linear-gradient(135deg, rgb(99, 102, 241), rgb(55, 48, 163))',      // indigo
  ];

  // Generate consistent color based on course ID
  const getPlaceholderColor = (courseId) => {
    if (!courseId) return COLOR_PALETTE[0];
    // Convert course id to a number to get consistent index
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) {
      const char = courseId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % COLOR_PALETTE.length;
    return COLOR_PALETTE[index];
  };
  
  // Auth and Toast
  const { user } = useAuth();
  const { addToast } = useToast();

  // State Management
  const [sectors, setSectors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddSectorModal, setShowAddSectorModal] = useState(false);
  const [showEditSectorModal, setShowEditSectorModal] = useState(false);
  const [showViewCoursesModal, setShowViewCoursesModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [showCourseMenuId, setShowCourseMenuId] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedSectorCourses, setSelectedSectorCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Form States
  const [newSector, setNewSector] = useState({ 
    name: '', 
    description: '', 
    status: 'Active',
    icon: 'Monitor',
    bgImage: ''
  });

  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    level: 'NC I',
    status: 'Active',
    bgImage: '',
  });

  // Load sectors on mount
  useEffect(() => {
    let isMounted = true;

    const loadSectorsData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Reconcile first so sectors with no active course are persisted Inactive.
        const data = (await reconcileSectorStatuses()) || (await getSectors());
        if (isMounted) {
          setSectors(data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading sectors:', err);
        if (isMounted) {
          setError('Failed to load sectors');
          addToast('Failed to load sectors', 'error');
          setLoading(false);
        }
      }
    };

    loadSectorsData();

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  // Refresh sectors data
  const reloadSectors = async () => {
    try {
      const data = (await reconcileSectorStatuses()) || (await getSectors());
      setSectors(data || []);
    } catch (err) {
      console.error('Error reloading sectors:', err);
      addToast('Failed to reload sectors', 'error');
    }
  };

  const handleAddSector = async () => {
    // Validation
    if (!newSector.name.trim()) {
      addToast('Sector name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      await createSector(newSector);
      addToast('Sector created successfully!', 'success');
      setNewSector({ name: '', description: '', status: 'Active', icon: 'Monitor', bgImage: '' });
      setShowAddSectorModal(false);
      await reloadSectors();
    } catch (err) {
      console.error('Error creating sector:', err);
      addToast(err.message || 'Failed to create sector', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSector = async () => {
    if (!selectedSector) return;

    try {
      setSaving(true);
      await updateSector(selectedSector.id, {
        name: selectedSector.name,
        description: selectedSector.description,
        status: selectedSector.status,
        icon: selectedSector.icon,
        bgImage: selectedSector.bgImage,
      });
      addToast('Sector updated successfully!', 'success');
      setSelectedSector(null);
      await reloadSectors();
    } catch (err) {
      console.error('Error updating sector:', err);
      addToast(err.message || 'Failed to update sector', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSector = async () => {
    if (!selectedSector) return;

    try {
      setDeleting(selectedSector.id);
      await deleteSector(selectedSector.id);
      addToast('Sector deleted successfully!', 'success');
      setShowDeleteModal(false);
      setSelectedSector(null);
      await reloadSectors();
    } catch (err) {
      console.error('Error deleting sector:', err);
      addToast(err.message || 'Failed to delete sector', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const openEditSectorModal = (sector) => {
    setSelectedSector(sector);
    setShowEditSectorModal(true);
  };

  const handleViewCourses = async (sector) => {
    try {
      setSelectedSector(sector);
      const courses = await getCoursesTemplates({ sectorId: sector.id });
      setSelectedSectorCourses(courses || []);
      setShowViewCoursesModal(true);
    } catch (err) {
      console.error('Error loading courses:', err);
      addToast('Failed to load sector courses', 'error');
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.name.trim()) {
      addToast('Course name is required', 'error');
      return;
    }
    if (!selectedSector) {
      addToast('Please select a sector', 'error');
      return;
    }

    try {
      setSaving(true);
      await createCourseTemplate(newCourse, { sectorId: selectedSector.id });
      
      // Refresh courses list BEFORE closing modal - use getCoursesTemplates for consistency
      const courses = await getCoursesTemplates({ sectorId: selectedSector.id });
      setSelectedSectorCourses(courses || []);
      
      addToast('Course created successfully!', 'success');
      setNewCourse({ name: '', description: '', level: 'NC I', status: 'Active', bgImage: '' });
      setShowAddCourseModal(false);
      reloadSectors(); // sector may have flipped Active now that it has a course

    } catch (err) {
      console.error('Error creating course:', err);
      addToast(err.message || 'Failed to create course', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAddCourseModal = (sector) => {
    setSelectedSector(sector);
    setNewCourse({ name: '', description: '', level: 'NC I', status: 'Active', bgImage: '' });
    setShowAddCourseModal(true);
  };

  const handleToggleCourseStatus = async (course) => {
    try {
      setSaving(true);
      const newStatus = course.status === 'Active' ? 'Inactive' : 'Active';
      await updateCourse(course.id, { status: newStatus });
      addToast(`Course marked ${newStatus}!`, 'success');
      // Refresh courses list - use getCoursesTemplates for consistency
      const courses = await getCoursesTemplates({ sectorId: selectedSector.id });
      setSelectedSectorCourses(courses || []);
    } catch (err) {
      console.error('Error updating course status:', err);
      addToast('Failed to update course status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditCourseModal = (course) => {
    setSelectedCourse(course);
    setShowEditCourseModal(true);
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse || !selectedCourse.name.trim()) {
      addToast('Course name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      await updateCourseTemplate(selectedCourse.id, {
        name: selectedCourse.name,
        description: selectedCourse.description,
        level: selectedCourse.level,
        status: selectedCourse.status,
        bgImage: selectedCourse.bgImage,
      });
      
      // Refresh courses list BEFORE closing modal - use getCoursesTemplates for consistency
      const courses = await getCoursesTemplates({ sectorId: selectedSector.id });
      setSelectedSectorCourses(courses || []);
      
      addToast('Course updated successfully!', 'success');
      setShowEditCourseModal(false);
      setSelectedCourse(null);
      reloadSectors(); // course status change may flip the sector's status

    } catch (err) {
      console.error('Error updating course:', err);
      addToast('Failed to update course', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;

    try {
      setDeleting(selectedCourse.id);
      await deleteCourse(selectedCourse.id);
      
      // Refresh courses list BEFORE closing modal - use getCoursesTemplates for consistency
      const courses = await getCoursesTemplates({ sectorId: selectedSector.id });
      setSelectedSectorCourses(courses || []);
      
      addToast('Course deleted successfully!', 'success');
      setShowDeleteCourseModal(false);
      setSelectedCourse(null);
      reloadSectors(); // sector may drop to Inactive if that was its last active course

    } catch (err) {
      console.error('Error deleting course:', err);
      addToast('Failed to delete course', 'error');
    } finally {
      setDeleting(null);
    }
  };

  // Helper function to get background colors
  const getBackgroundColor = (name) => {
    const colors = [
      'from-blue-600 to-blue-800',
      'from-purple-600 to-purple-800',
      'from-pink-600 to-pink-800',
      'from-green-600 to-green-800',
      'from-orange-600 to-orange-800',
      'from-red-600 to-red-800',
      'from-indigo-600 to-indigo-800',
      'from-cyan-600 to-cyan-800',
    ];
    const hash = name.charCodeAt(0) % colors.length;
    return colors[hash];
  };

  // Handle image file upload
  const handleImageUpload = (file, setData, data) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData({ ...data, bgImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply search + status filter + sort to the sectors list.
  const visibleSectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = sectors.filter((s) => {
      const matchesSearch =
        !q ||
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.description || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' || String(s.status || 'Active') === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
    const toMs = (v) => (v?.toMillis ? v.toMillis() : v?.seconds ? v.seconds * 1000 : 0);
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name-desc': return byName(b, a);
        case 'status': return String(a.status || '').localeCompare(String(b.status || '')) || byName(a, b);
        case 'newest': return toMs(b.createdAt) - toMs(a.createdAt);
        case 'oldest': return toMs(a.createdAt) - toMs(b.createdAt);
        case 'name-asc':
        default: return byName(a, b);
      }
    });
    return list;
  }, [sectors, searchQuery, statusFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">{error}</p>
            <button 
              onClick={reloadSectors}
              className="text-sm text-red-700 underline hover:no-underline mt-1"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{user?.role === 'trainer' ? 'Training Classes' : 'Training Sectors'}</h1>
        {user?.role !== 'trainer' && (
          <button
            onClick={() => setShowAddSectorModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B005C] text-white rounded-lg hover:bg-[#0B005C]/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Sector
          </button>
        )}
      </div>

      {/* Search / filter / sort controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search sectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C] bg-white"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C] bg-white text-sm appearance-none"
            aria-label="Filter by status"
          >
            <option value="all">All status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C] bg-white text-sm appearance-none"
            aria-label="Sort by"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="status">Status</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Sectors Grid */}
      {sectors.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No sectors found. Create one to get started.</p>
        </div>
      ) : visibleSectors.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No sectors match your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleSectors.map((sector) => (
            <div
              key={sector.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full relative"
            >
              {/* Sector Image/Background */}
              <div className="h-40 bg-cover bg-center"
                style={sector.bgImage 
                  ? { backgroundImage: `url(${sector.bgImage})` }
                  : (sector.color ? getGradientStyle(sector.color) : { background: getBackgroundColor(sector.name).replace('bg-gradient-to-r ', '') })
                }
              >
              </div>

              {/* Status Badge - Top Right */}
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  sector.status === 'Active' 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {sector.status}
                </span>
              </div>

              <div className="p-4 space-y-3 flex-1">
                {/* Name */}
                <h3 className="font-bold text-gray-900 line-clamp-2">{sector.name}</h3>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2">{sector.description}</p>
              </div>

              {/* Actions - Docked at Bottom */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => handleViewCourses(sector)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#0B005C] bg-[#0B005C]/10 rounded-lg hover:bg-[#0B005C]/20 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Courses
                </button>
                <button
                  onClick={() => openEditSectorModal(sector)}
                  className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  title="Edit Sector"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openAddCourseModal(sector)}
                  className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  title={user?.role === 'trainer' ? "Add Class" : "Add Course"}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedSector(sector);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD SECTOR MODAL */}
      {showAddSectorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Add New Sector</h2>
              <button
                onClick={() => setShowAddSectorModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Sector Name *
                </label>
                <input
                  type="text"
                  value={newSector.name}
                  onChange={(e) => setNewSector({ ...newSector, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                  placeholder="e.g., Information Technology"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  value={newSector.description}
                  onChange={(e) => setNewSector({ ...newSector, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C] h-24"
                  placeholder="Brief description of the sector..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Status
                </label>
                <select
                  value={newSector.status}
                  onChange={(e) => setNewSector({ ...newSector, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Sector Image
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], setNewSector, newSector)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {newSector.bgImage && <span className="text-green-600 text-sm">✓ Image added</span>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddSectorModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSector}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0B005C] text-white rounded-lg hover:bg-[#0B005C]/90 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : user?.role === 'trainer' ? 'Create Class' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SECTOR MODAL */}
      {showEditSectorModal && selectedSector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Edit Sector</h2>
              <button
                onClick={() => setShowEditSectorModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Sector Name *
                </label>
                <input
                  type="text"
                  value={selectedSector.name}
                  onChange={(e) => setSelectedSector({ ...selectedSector, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                  placeholder="e.g., Information Technology"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedSector.description}
                  onChange={(e) => setSelectedSector({ ...selectedSector, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C] h-24"
                  placeholder="Brief description of the sector..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Status
                </label>
                <select
                  value={selectedSector.status}
                  onChange={(e) => setSelectedSector({ ...selectedSector, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Sector Image
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], setSelectedSector, selectedSector)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {selectedSector.bgImage && <span className="text-green-600 text-sm">✓ Image added</span>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditSectorModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUpdateSector();
                    setShowEditSectorModal(false);
                  }}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0B005C] text-white rounded-lg hover:bg-[#0B005C]/90 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW COURSES MODAL */}
      {showViewCoursesModal && selectedSector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">{user?.role === 'trainer' ? 'Classes' : 'Courses'} in {selectedSector.name}</h2>
              <button
                onClick={() => setShowViewCoursesModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {selectedSectorCourses.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No {user?.role === 'trainer' ? 'classes' : 'courses'} in this sector yet.</p>
              ) : (
                <div className="space-y-3">
                  {selectedSectorCourses.map((course) => (
                    <div key={course.id} className="p-3 border border-gray-200 rounded-lg flex gap-3">
                      {/* Course Image - Square */}
                      <div className="w-20 h-20 flex-shrink-0 rounded bg-cover bg-center"
                        style={course.bgImage 
                          ? { backgroundImage: `url(${course.bgImage})` }
                          : { background: getPlaceholderColor(course.id) }
                        }
                      >
                      </div>
                      
                      {/* Course Info */}
                      <div className="flex-1 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900">{course.name}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{course.description}</p>
                          <div className="flex gap-2 mt-2 text-xs">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {course.level || 'NC'}
                            </span>
                            <span className={`px-2 py-1 rounded ${
                              course.status === 'Active' 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {course.status}
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setShowCourseMenuId(showCourseMenuId === course.id ? null : course.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Course options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {showCourseMenuId === course.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <button
                                onClick={() => {
                                  openEditCourseModal(course);
                                  setShowCourseMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setShowDeleteCourseModal(true);
                                  setShowCourseMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD COURSE MODAL */}
      {showAddCourseModal && selectedSector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">{user?.role === 'trainer' ? 'Add Class to' : 'Add Course to'} {selectedSector.name}</h2>
              <button
                onClick={() => setShowAddCourseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  {user?.role === 'trainer' ? 'Class Name' : 'Course Name'} *
                </label>
                <input
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                  placeholder={user?.role === 'trainer' ? 'e.g., Morning Class' : 'e.g., Web Development Basics'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C] h-20"
                  placeholder="Brief course description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Level
                  </label>
                  <select
                    value={newCourse.level}
                    onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                  >
                    <option value="NC I">NC I</option>
                    <option value="NC II">NC II</option>
                    <option value="NC III">NC III</option>
                    <option value="NC IV">NC IV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Status
                  </label>
                  <select
                    value={newCourse.status}
                    onChange={(e) => setNewCourse({ ...newCourse, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Course Image
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], setNewCourse, newCourse)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {newCourse.bgImage && <span className="text-green-600 text-sm">✓ Image added</span>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddCourseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCourse}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0B005C] text-white rounded-lg hover:bg-[#0B005C]/90 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {showEditCourseModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">{user?.role === 'trainer' ? 'Edit Class' : 'Edit Course'}</h2>
              <button
                onClick={() => setShowEditCourseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  {user?.role === 'trainer' ? 'Class Name' : 'Course Name'} *
                </label>
                <input
                  type="text"
                  value={selectedCourse.name}
                  onChange={(e) => setSelectedCourse({ ...selectedCourse, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                  placeholder={user?.role === 'trainer' ? 'e.g., Morning Class' : 'e.g., Web Development Basics'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedCourse.description}
                  onChange={(e) => setSelectedCourse({ ...selectedCourse, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C] h-20"
                  placeholder="Brief course description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Level
                  </label>
                  <select
                    value={selectedCourse.level}
                    onChange={(e) => setSelectedCourse({ ...selectedCourse, level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                  >
                    <option value="NC I">NC I</option>
                    <option value="NC II">NC II</option>
                    <option value="NC III">NC III</option>
                    <option value="NC IV">NC IV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedCourse.status}
                    onChange={(e) => setSelectedCourse({ ...selectedCourse, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B005C]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  {user?.role === 'trainer' ? 'Class Image' : 'Course Image'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], setSelectedCourse, selectedCourse)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {selectedCourse.bgImage && <span className="text-green-600 text-sm">✓ Image added</span>}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditCourseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCourse}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0B005C] text-white rounded-lg hover:bg-[#0B005C]/90 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE COURSE MODAL */}
      {showDeleteCourseModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-center text-gray-900 mt-4">Delete Course?</h3>
              <p className="text-center text-gray-600 mt-2">
                Are you sure you want to delete <strong>{selectedCourse.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteCourseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCourse}
                  disabled={deleting === selectedCourse.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting === selectedCourse.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedSector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-center text-gray-900 mt-4">Delete Sector?</h3>
              <p className="text-center text-gray-600 mt-2">
                Are you sure you want to delete <strong>{selectedSector.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSector}
                  disabled={deleting === selectedSector.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting === selectedSector.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sectors;
