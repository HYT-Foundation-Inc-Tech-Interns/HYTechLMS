import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Users,
  UserPlus,
  Trash2,
  DownloadCloud,
  ToggleLeft,
  ToggleRight,
  Layers,
  Filter,
  ArrowUpDown,
  Eye,
  Copy,
} from 'lucide-react';
import {
  getCourses,
  getCoursesTemplates,
  createCourseTemplate,
  getSectors,
  updateCourse,
  getTrainers,
  getStudents,
  getClassEnrollments,
  adminAddStudentToClass,
  removeEnrollment,
  setCourseAvailability,
  seedTesdaCatalog,
  updateCourseTemplate,
  getClassTopics,
  getClassMaterials,
  getAssessments,
  getAssignments,
  promoteClassToTemplate,
  compressAndStoreFile,
} from '../../utils/firestoreService';
import { catalogTotals } from '../../data/tesdaCatalog';
import SubjectListEditor from '../shared/SubjectListEditor';
import ClassAppearanceEditor from '../shared/ClassAppearanceEditor';
import AdminCreateClassModal from './AdminCreateClassModal';
import { useToast } from '../../context/ToastContext';

const LEVEL_OPTIONS = ['NC I', 'NC II', 'NC III', 'NC IV'];

// Treat status case-insensitively so a class/course stored as 'active' isn't
// hidden by a query that expected 'Active'.
const isActiveStatus = (status) => String(status || 'active').toLowerCase() === 'active';

const Classes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'classes');
  const [courses, setCourses] = useState([]); // course templates (catalog)
  const [classes, setClasses] = useState([]); // running classes
  const [sectors, setSectors] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const returnedClassId = location.state?.expandedClassId;
    if (!returnedClassId) return;
    setActiveTab('classes');
    setExpandedClassId(returnedClassId);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  // Manage-students modal
  const [managingClass, setManagingClass] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [addStudentId, setAddStudentId] = useState('');
  const [rosterBusy, setRosterBusy] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Filter + sort controls (adapt to the active tab).
  const [sectorFilter, setSectorFilter] = useState('all'); // courses tab
  const [availFilter, setAvailFilter] = useState('all'); // courses tab
  const [classStatusFilter, setClassStatusFilter] = useState('all'); // classes tab
  const [sortBy, setSortBy] = useState('name-asc');
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editClassImageFile, setEditClassImageFile] = useState(null);
  const [savingClassId, setSavingClassId] = useState(null);
  const [previewingClass, setPreviewingClass] = useState(null);
  const [previewContent, setPreviewContent] = useState({
    topics: [],
    materials: [],
    assessments: [],
    assignments: [],
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPromoteWarning, setShowPromoteWarning] = useState(false);
  const [promotingTemplate, setPromotingTemplate] = useState(false);

  // New Course (template) modal
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    level: 'NC I',
    sectorId: '',
    status: 'Active',
  });

  // Catalog import + per-program availability
  const [seeding, setSeeding] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Manage-subjects modal (edit a program template's subjects)
  const [editingSubjectsCourse, setEditingSubjectsCourse] = useState(null);
  const [subjectDraft, setSubjectDraft] = useState([]);
  const [savingSubjects, setSavingSubjects] = useState(false);

  const { addToast } = useToast();

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Load everything unfiltered and reconcile status client-side so nothing
      // is hidden by status casing (part of the admin#4 fix).
      const [templatesData, classesData, sectorsData, trainersData] = await Promise.all([
        getCoursesTemplates({}),
        getCourses({}),
        getSectors({}),
        getTrainers().catch(() => []),
      ]);
      setCourses(templatesData || []);
      setClasses(classesData || []);
      setSectors(sectorsData || []);
      setTrainers(trainersData || []);
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
  const trainerFor = (trainerId) => trainers.find((t) => t.id === trainerId);
  const trainerName = (trainerId) => {
    const t = trainerFor(trainerId);
    return t?.name || t?.displayName || t?.email || (trainerId ? 'Unknown trainer' : 'Unassigned');
  };
  const programFor = (courseId) => courses.find((course) => course.id === courseId);

  const closeTemplatePreview = () => {
    if (promotingTemplate) return;
    setPreviewingClass(null);
    setShowPromoteWarning(false);
    setPreviewContent({ topics: [], materials: [], assessments: [], assignments: [] });
  };

  const openTemplatePreview = async (classItem) => {
    if (!classItem?.courseId) {
      addToast('This class is not linked to a program and cannot be promoted.', 'error');
      return;
    }
    setPreviewingClass(classItem);
    setShowPromoteWarning(false);
    setPreviewLoading(true);
    try {
      const [topics, materials, assessments, assignments] = await Promise.all([
        getClassTopics(classItem.id),
        getClassMaterials(classItem.id),
        getAssessments(classItem.id),
        getAssignments(classItem.id),
      ]);
      setPreviewContent({
        topics: topics || [],
        materials: materials || [],
        assessments: assessments || [],
        assignments: assignments || [],
      });
    } catch (err) {
      console.error('Error loading class template preview:', err);
      addToast(err?.message || 'Could not load the class content preview.', 'error');
      setPreviewingClass(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePromoteClass = async () => {
    if (!previewingClass?.courseId) return;
    try {
      setPromotingTemplate(true);
      const result = await promoteClassToTemplate(previewingClass.id);
      const promotedAt = new Date();
      setCourses((prev) => prev.map((course) => (
        course.id === previewingClass.courseId
          ? {
              ...course,
              hasContent: true,
              sourceClassId: previewingClass.id,
              promotedAt,
            }
          : course
      )));
      addToast(
        `“${previewingClass.name}” is now the default template for ${
          programFor(previewingClass.courseId)?.name || 'this program'
        }. ${result?.counts?.copiedDocuments || 0} content items copied.`,
        'success'
      );
      setPreviewingClass(null);
      setShowPromoteWarning(false);
      setPreviewContent({ topics: [], materials: [], assessments: [], assignments: [] });
    } catch (err) {
      console.error('Error promoting class to template:', err);
      addToast(err?.message || 'Could not replace the program template.', 'error');
    } finally {
      setPromotingTemplate(false);
    }
  };

  // ---- Manage students (admin) ----
  const openManageStudents = async (cls) => {
    setManagingClass(cls);
    setAddStudentId('');
    setRosterLoading(true);
    try {
      const [enr, studs] = await Promise.all([
        getClassEnrollments(cls.id),
        students.length ? Promise.resolve(students) : getStudents(),
      ]);
      setRoster(enr || []);
      if (!students.length) setStudents(studs || []);
    } catch (err) {
      console.error('Error loading roster:', err);
      addToast('Failed to load class roster', 'error');
    } finally {
      setRosterLoading(false);
    }
  };

  const refreshRoster = async (classId) => {
    try {
      const enr = await getClassEnrollments(classId);
      setRoster(enr || []);
    } catch {
      /* keep existing roster on failure */
    }
  };

  const handleAddStudent = async () => {
    if (!addStudentId) {
      addToast('Pick a trainee to add.', 'error');
      return;
    }
    const student = students.find((s) => s.id === addStudentId);
    if (!student || !managingClass) return;
    try {
      setRosterBusy(true);
      await adminAddStudentToClass(managingClass.id, {
        id: student.id,
        name: student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        email: student.email,
      }, managingClass);
      addToast('Trainee added to the class.', 'success');
      setAddStudentId('');
      await refreshRoster(managingClass.id);
    } catch (err) {
      addToast(err.message || 'Failed to add trainee', 'error');
    } finally {
      setRosterBusy(false);
    }
  };

  const handleRemoveStudent = async (enrollment) => {
    if (!window.confirm(`Remove ${enrollment.studentName || 'this trainee'} from the class?`)) return;
    try {
      setRosterBusy(true);
      await removeEnrollment(enrollment.id);
      setRoster((prev) => prev.filter((e) => e.id !== enrollment.id));
      addToast('Trainee removed.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to remove trainee', 'error');
    } finally {
      setRosterBusy(false);
    }
  };

  const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
  const toMs = (v) => (v?.toMillis ? v.toMillis() : v?.seconds ? v.seconds * 1000 : (v ? new Date(v).getTime() || 0 : 0));

  const filteredCourses = courses
    .filter((c) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (c.name || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        sectorName(c.sectorId).toLowerCase().includes(q);
      const matchesSector = sectorFilter === 'all' || c.sectorId === sectorFilter;
      const matchesAvail =
        availFilter === 'all' ||
        (availFilter === 'available' ? !!c.available : !c.available);
      return matchesSearch && matchesSector && matchesAvail;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-desc': return byName(b, a);
        case 'newest': return toMs(b.createdAt) - toMs(a.createdAt);
        case 'oldest': return toMs(a.createdAt) - toMs(b.createdAt);
        case 'name-asc':
        default: return byName(a, b);
      }
    });

  const filteredClasses = classes
    .filter((course) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (course.name || '').toLowerCase().includes(q) ||
        (course.description || '').toLowerCase().includes(q);
      const matchesStatus =
        classStatusFilter === 'all' ||
        String(course.status || 'Active').toLowerCase() === classStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-desc': return byName(b, a);
        case 'newest': return toMs(b.createdAt) - toMs(a.createdAt);
        case 'oldest': return toMs(a.createdAt) - toMs(b.createdAt);
        case 'name-asc':
        default: return byName(a, b);
      }
    });

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
      color: course.color || '',
      bgImage: course.bgImage || '',
      bgImagePath: course.bgImagePath || '',
    });
    setEditClassImageFile(null);
  };

  const cancelEditing = () => {
    setEditingClassId(null);
    setEditFormData({});
    setEditClassImageFile(null);
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditClassImage = (file) => {
    if (!file) {
      setEditClassImageFile(null);
      return;
    }
    if (!file.type?.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      addToast('Class card images must be 25 MB or smaller.', 'error');
      return;
    }
    setEditClassImageFile(file);
  };

  const saveClassData = async (classId) => {
    try {
      setSavingClassId(classId);
      const updates = { ...editFormData };
      if (editClassImageFile) {
        const uploadedImage = await compressAndStoreFile(editClassImageFile, classId);
        updates.bgImage = uploadedImage.url;
        updates.bgImagePath = uploadedImage.storagePath;
      }
      await updateCourse(classId, updates);
      setClasses((prev) => prev.map((cls) => (cls.id === classId ? { ...cls, ...updates } : cls)));
      addToast('Class updated successfully', 'success');
      setEditingClassId(null);
      setEditFormData({});
      setEditClassImageFile(null);
    } catch (err) {
      console.error('Error updating class:', err);
      addToast(`Failed to update class: ${err.message}`, 'error');
    } finally {
      setSavingClassId(null);
    }
  };

  const handleImportCatalog = async () => {
    const totals = catalogTotals();
    if (
      !window.confirm(
        `Import the TESDA catalog?\n\nThis adds up to ${totals.sectors} sectors and ${totals.programs} programs ` +
          `(with ${totals.subjects} subjects). Programs start OFF — you enable each one before trainors can offer it. ` +
          `Anything already present is skipped, so this is safe to re-run.`
      )
    ) {
      return;
    }
    try {
      setSeeding(true);
      const res = await seedTesdaCatalog();
      addToast(
        `Catalog imported: +${res.sectorsCreated} sectors, +${res.programsCreated} programs` +
          (res.programsSkipped ? ` (${res.programsSkipped} already existed)` : ''),
        'success'
      );
      await loadAll();
      setActiveTab('courses');
    } catch (err) {
      console.error('Error importing catalog:', err);
      addToast(err.message || 'Failed to import catalog', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleAvailability = async (course) => {
    const next = !course.available;
    setTogglingId(course.id);
    // Optimistic update.
    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, available: next } : c)));
    try {
      await setCourseAvailability(course.id, next);
      addToast(
        next ? `“${course.name}” is now available to trainors.` : `“${course.name}” is hidden from trainors.`,
        next ? 'success' : 'info'
      );
    } catch (err) {
      // Roll back on failure.
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, available: !next } : c)));
      addToast(err.message || 'Failed to update availability', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const openSubjectsEditor = (course) => {
    setEditingSubjectsCourse(course);
    setSubjectDraft(Array.isArray(course.subjects) ? [...course.subjects] : []);
  };

  const handleSaveSubjects = async () => {
    if (!editingSubjectsCourse) return;
    // Drop blank rows before saving.
    const cleaned = subjectDraft.map((s) => s.trim()).filter(Boolean);
    try {
      setSavingSubjects(true);
      await updateCourseTemplate(editingSubjectsCourse.id, { subjects: cleaned });
      setCourses((prev) =>
        prev.map((c) => (c.id === editingSubjectsCourse.id ? { ...c, subjects: cleaned } : c))
      );
      addToast('Subjects updated.', 'success');
      setEditingSubjectsCourse(null);
      setSubjectDraft([]);
    } catch (err) {
      console.error('Error saving subjects:', err);
      addToast(err.message || 'Failed to save subjects', 'error');
    } finally {
      setSavingSubjects(false);
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
  const previewTopicIds = new Set(previewContent.topics.map((topic) => topic.id));
  const matchesPreviewTopic = (item, topicId) => {
    const itemTopicId = item.topicId || null;
    return topicId === null
      ? itemTopicId === null || !previewTopicIds.has(itemTopicId)
      : itemTopicId === topicId;
  };
  const previewItemsForTopic = (topicId) => [
    ...previewContent.materials
      .filter((item) => matchesPreviewTopic(item, topicId))
      .map((item) => ({ ...item, previewKind: 'Material' })),
    ...previewContent.assessments
      .filter((item) => matchesPreviewTopic(item, topicId))
      .map((item) => ({ ...item, previewKind: 'Quiz' })),
    ...previewContent.assignments
      .filter((item) => matchesPreviewTopic(item, topicId))
      .map((item) => ({ ...item, previewKind: 'Assignment' })),
  ];
  const previewItemCount =
    previewContent.topics.length
    + previewContent.materials.length
    + previewContent.assessments.length
    + previewContent.assignments.length;

  return (
    <div className="min-h-screen bg-gray-50 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              {activeTab === 'classes' ? 'Classes' : 'Course Templates'}
            </h1>
            <p className="text-gray-600 mt-2">
              {activeTab === 'classes'
                ? 'Manage running classes, trainer assignments, rosters, and trainee-view previews.'
                : 'Manage reusable program templates. A template remains hidden from trainers until you make it available.'}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {activeTab === 'courses' ? (
              <>
            <button
              onClick={handleImportCatalog}
              disabled={seeding}
              className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 sm:flex-none"
              title="Import the full TESDA sector/program/subject catalog (programs start disabled)"
            >
              {seeding ? <Loader className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              {seeding ? 'Importing…' : 'Import TESDA Catalog'}
            </button>
            <button
              onClick={() => setShowAddCourse(true)}
              className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium sm:flex-none"
            >
              <Plus className="w-4 h-4" />
              New Course
            </button>
              </>
            ) : (
              <button
                onClick={() => setShowCreateClass(true)}
                className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium sm:flex-none"
              >
                <Plus className="w-4 h-4" />
                Create Class
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-gray-200">
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'classes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-600'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Classes ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 -mb-px border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'courses'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-600'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Courses ({courses.length})
          </button>
        </div>

        {/* Search + filter + sort */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'courses' ? 'Search courses…' : 'Search classes…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {activeTab === 'courses' ? (
            <>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="pl-9 pr-8 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm appearance-none"
                  aria-label="Filter by sector"
                >
                  <option value="all">All sectors</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={availFilter}
                  onChange={(e) => setAvailFilter(e.target.value)}
                  className="pl-9 pr-8 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm appearance-none"
                  aria-label="Filter by availability"
                >
                  <option value="all">All availability</option>
                  <option value="available">Available</option>
                  <option value="off">Off</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </>
          ) : (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={classStatusFilter}
                onChange={(e) => setClassStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm appearance-none"
                aria-label="Filter by status"
              >
                <option value="all">All status</option>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
                <option value="Draft">Draft</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-9 pr-8 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm appearance-none"
              aria-label="Sort by"
            >
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                        <span
                          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                            course.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {course.available ? 'Available' : 'Off'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{sectorName(course.sectorId)}</p>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{course.description || 'No description'}</p>
                      {course.hasContent === true && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                          <Check className="h-3.5 w-3.5" />
                          Full-content template ready
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => openSubjectsEditor(course)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                          title="Edit the subjects (modules) for this program"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          {(course.subjects?.length || 0)} subject{(course.subjects?.length || 0) === 1 ? '' : 's'} · Edit
                        </button>
                        <span className="font-semibold text-gray-900">{course.level || 'N/A'}</span>
                      </div>
                      <button
                        onClick={() => handleToggleAvailability(course)}
                        disabled={togglingId === course.id}
                        className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                          course.available
                            ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {togglingId === course.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : course.available ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                        {course.available ? 'Make unavailable' : 'Make available'}
                      </button>
                      <p className="mt-2 text-[10px] text-gray-400 font-mono truncate" title={course.id}>ID: {course.id}</p>
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
                  {searchTerm ? 'No classes match your search.' : 'No classes yet. Create one from a course or have a trainer open one.'}
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
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {trainerName(course.trainerId)}
                          </span>
                          {course.classCode && (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{course.classCode}</span>
                          )}
                        </div>
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
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => navigate(`/admin/classes/${encodeURIComponent(course.id)}/preview`)}
                              className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              <Eye className="w-4 h-4" />
                              View as Trainee
                            </button>
                            <button
                              onClick={() => openTemplatePreview(course)}
                              disabled={!course.courseId}
                              title={
                                course.courseId
                                  ? 'Preview and promote this class as the program default'
                                  : 'This class is not linked to a program'
                              }
                              className="flex items-center gap-2 px-4 py-2 border border-violet-200 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Copy className="w-4 h-4" />
                              Use as Default Template
                            </button>
                            <button
                              onClick={() => openManageStudents(course)}
                              className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              <Users className="w-4 h-4" />
                              Manage Trainees
                            </button>
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
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                              <div className="border-t border-gray-100 pt-4">
                                <ClassAppearanceEditor
                                  color={editFormData.color || ''}
                                  imageUrl={editFormData.bgImage || ''}
                                  imageFile={editClassImageFile}
                                  onColorChange={(color) => handleEditInputChange('color', color)}
                                  onImageChange={handleEditClassImage}
                                  onRemoveImage={() => {
                                    setEditClassImageFile(null);
                                    setEditFormData((previous) => ({
                                      ...previous,
                                      bgImage: '',
                                      bgImagePath: '',
                                    }));
                                  }}
                                  disabled={savingClassId === course.id}
                                />
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
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Trainor</p>
                                <p className="text-gray-900">{trainerName(course.trainerId)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Class ID</p>
                                <p className="text-gray-900 font-mono text-xs break-all">{course.id}</p>
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

      {showCreateClass && (
        <AdminCreateClassModal
          courses={courses}
          sectors={sectors}
          trainers={trainers}
          onClose={() => setShowCreateClass(false)}
          onCreated={async (classId) => {
            await loadAll();
            setActiveTab('classes');
            setExpandedClassId(classId);
            setShowCreateClass(false);
          }}
        />
      )}

      {/* New Course modal */}
      {showAddCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddCourse(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[calc(100dvh-1rem)] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Course</h2>
              <button onClick={() => setShowAddCourse(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col-reverse justify-end gap-2 sm:flex-row">
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

      {/* Read-only class content preview before replacing a program template */}
      {previewingClass && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeTemplatePreview} />
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-violet-700">
                  <Eye className="h-4 w-4" />
                  Read-only content preview
                </div>
                <h2 className="text-xl font-bold text-gray-900">{previewingClass.name}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Program: {programFor(previewingClass.courseId)?.name || 'Unknown program'}
                </p>
              </div>
              <button
                onClick={closeTemplatePreview}
                disabled={promotingTemplate}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {previewLoading ? (
                <div className="flex min-h-64 items-center justify-center gap-3 text-gray-600">
                  <Loader className="h-6 w-6 animate-spin text-violet-600" />
                  Loading class content…
                </div>
              ) : showPromoteWarning ? (
                <div className="mx-auto max-w-2xl py-6">
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
                    <AlertCircle className="mb-4 h-9 w-9 text-amber-600" />
                    <h3 className="text-xl font-bold text-amber-950">Replace the current default template?</h3>
                    <p className="mt-3 leading-7 text-amber-900">
                      This will replace all current default content for{' '}
                      <strong>{programFor(previewingClass.courseId)?.name || 'this program'}</strong>{' '}
                      with the content from <strong>{previewingClass.name}</strong>.
                    </p>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-800">
                      <li>Future classes created from this template will receive the new content.</li>
                      <li>Existing classes are unaffected because their content was copied when they were created.</li>
                      <li>Topics, files, quizzes, protected answer keys, and assignments are replaced together.</li>
                      <li>Attempts and trainee submissions are never copied.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ['Topics', previewContent.topics.length],
                      ['Materials', previewContent.materials.length],
                      ['Quizzes', previewContent.assessments.length],
                      ['Assignments', previewContent.assignments.length],
                    ].map(([label, count]) => (
                      <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>

                  {previewItemCount === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                      <p className="font-semibold text-amber-900">This class has no reusable content yet.</p>
                      <p className="mt-1 text-sm text-amber-700">
                        Add a topic, material, quiz, or assignment before promoting it.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {previewContent.topics.map((topic, index) => {
                        const items = previewItemsForTopic(topic.id);
                        return (
                          <section key={topic.id} className="overflow-hidden rounded-xl border border-gray-200">
                            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                              <p className="font-semibold text-gray-900">
                                {index + 1}. {topic.title || 'Untitled topic'}
                              </p>
                              {topic.description && (
                                <p className="mt-1 text-sm text-gray-500">{topic.description}</p>
                              )}
                            </div>
                            <div className="divide-y divide-gray-100">
                              {items.length === 0 ? (
                                <p className="px-4 py-3 text-sm text-gray-400">No content assigned to this topic.</p>
                              ) : items.map((item) => (
                                <div key={`${item.previewKind}-${item.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                                  <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                                    {item.title || 'Untitled item'}
                                  </span>
                                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                                    {item.previewKind}
                                    {item.previewKind === 'Quiz' && Array.isArray(item.questions)
                                      ? ` · ${item.questions.length} questions`
                                      : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      })}

                      {previewItemsForTopic(null).length > 0 && (
                        <section className="overflow-hidden rounded-xl border border-gray-200">
                          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                            <p className="font-semibold text-gray-900">Unassigned content</p>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {previewItemsForTopic(null).map((item) => (
                              <div key={`${item.previewKind}-${item.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                                <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                                  {item.title || 'Untitled item'}
                                </span>
                                <span className="shrink-0 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                                  {item.previewKind}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!previewLoading && (
              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 p-4 sm:flex-row sm:justify-end sm:p-5">
                <button
                  onClick={showPromoteWarning ? () => setShowPromoteWarning(false) : closeTemplatePreview}
                  disabled={promotingTemplate}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {showPromoteWarning ? 'Back to preview' : 'Cancel'}
                </button>
                {showPromoteWarning ? (
                  <button
                    onClick={handlePromoteClass}
                    disabled={promotingTemplate}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {promotingTemplate ? <Loader className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                    {promotingTemplate ? 'Replacing template…' : 'Replace Default Template'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPromoteWarning(true)}
                    disabled={previewItemCount === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4" />
                    Use this Class as Default Template
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage Trainees modal */}
      {managingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setManagingClass(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Manage Trainees</h2>
                <p className="text-sm text-gray-500">{managingClass.name} · Trainor: {trainerName(managingClass.trainerId)}</p>
              </div>
              <button onClick={() => setManagingClass(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Add student */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={addStudentId}
                  onChange={(e) => setAddStudentId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm appearance-none"
                >
                  <option value="">Add a student…</option>
                  {students
                    .filter((s) => !roster.some((e) => e.studentId === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email)} — {s.idNumber || s.email}
                      </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={handleAddStudent}
                disabled={rosterBusy || !addStudentId}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Roster */}
            <div className="p-4 overflow-y-auto">
              {rosterLoading ? (
                <div className="py-8 text-center text-gray-500 text-sm">Loading roster…</div>
              ) : roster.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">No trainees in this class yet.</div>
              ) : (
                <div className="space-y-2">
                  {roster.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{e.studentName || e.studentId}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {e.studentEmail || '—'}
                          <span className={`ml-2 px-1.5 py-0.5 rounded-full ${e.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {e.status || 'active'}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(e)}
                        disabled={rosterBusy}
                        className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove from class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Subjects modal (edit a program template's subjects) */}
      {editingSubjectsCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingSubjectsCourse(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Subjects</h2>
                <p className="text-sm text-gray-500">{editingSubjectsCourse.name}</p>
              </div>
              <button onClick={() => setEditingSubjectsCourse(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <SubjectListEditor
                subjects={subjectDraft}
                onChange={setSubjectDraft}
                disabled={savingSubjects}
                label="Subjects"
                hint="These seed a class's modules when a trainor creates a class from this program. Trainors can further tweak them per class."
              />
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingSubjectsCourse(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubjects}
                disabled={savingSubjects}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingSubjects ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingSubjects ? 'Saving…' : 'Save Subjects'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
