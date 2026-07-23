import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  Copy, 
  MoreVertical, 
  Archive, 
  Edit2, 
  Trash2, 
  X, 
  Loader, 
  AlertCircle, 
  ChevronLeft, 
  BookOpen, 
  FileText, 
  Video, 
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SubjectListEditor from '../shared/SubjectListEditor';
import ClassAppearanceEditor from '../shared/ClassAppearanceEditor';
import {
  getCourses,
  getClassesForTrainer,
  getCoursesTemplates,
  getCourseEnrollments,
  updateEnrollmentStatus,
  updateCourse,
  getSectors,
  getSectorById,
  createCourse,
  generateUniqueClassCode,
  reconcileSectorStatuses,
  compressAndStoreFile,
} from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';
import { getGradientStyle } from '../../utils/courseColors';

const isTrainerVisibleClass = (course) =>
  ['active', 'draft'].includes(String(course?.status || '').toLowerCase());

const TrainerHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // State Management
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassColor, setEditClassColor] = useState('');
  const [editClassImageUrl, setEditClassImageUrl] = useState('');
  const [editClassImagePath, setEditClassImagePath] = useState('');
  const [editClassImageFile, setEditClassImageFile] = useState(null);
  const [isUpdatingClass, setIsUpdatingClass] = useState(false);

  // Create Class States
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [creationPath, setCreationPath] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedFilterSector, setSelectedFilterSector] = useState('');
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [sectorClasses, setSectorClasses] = useState([]);
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [newClassForm, setNewClassForm] = useState({
    name: '',
  });
  // Editable subjects for the class being created (seed the class's modules).
  const [classSubjects, setClassSubjects] = useState([]);

  // Loading & Error States
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Initialize: Load trainer's courses and available courses
  useEffect(() => {
    const loadTrainerData = async () => {
      if (!user?.uid) return;

      try {
        setLoadingCourses(true);
        setErrorMessage(null);

        // Load classes this trainer leads OR co-trains.
        const assignedClasses = await getClassesForTrainer(user.uid);
        const coursesData = (assignedClasses || []).filter(isTrainerVisibleClass);
        setCourses(coursesData || []);

        // Load available course templates (programs an admin has switched on)
        const availableCoursesData = await getCoursesTemplates({ availableOnly: true });
        const coursesWithSectorNames = await Promise.all(
          (availableCoursesData || []).map(async (course) => {
            if (course.sectorId) {
              try {
                const sector = await getSectorById(course.sectorId);
                return { ...course, sectorName: sector?.name || 'Unknown Sector' };
              } catch (err) {
                console.error('Error fetching sector for course:', err);
                return { ...course, sectorName: 'Unknown Sector' };
              }
            }
            return { ...course, sectorName: 'Unknown Sector' };
          })
        );
        setAvailableCourses(coursesWithSectorNames);

        // Load sectors for filter
        const sectorsData = await getSectors();
        setSectors(sectorsData || []);

        // Load enrollments for each course
        if (coursesData && coursesData.length > 0) {
          const enrollmentsMap = {};
          for (const course of coursesData) {
            const courseEnrollments = await getCourseEnrollments(course.id);
            enrollmentsMap[course.id] = courseEnrollments || [];
          }
          setEnrollments(enrollmentsMap);
        }
      } catch (error) {
        console.error('Error loading trainer data:', error);
        setErrorMessage(error.message);
        addToast('Failed to load courses', 'error');
      } finally {
        setLoadingCourses(false);
      }
    };

    loadTrainerData();
  }, [user?.uid]);

  // Handle archive class
  const handleArchiveCourse = async (courseId) => {
    try {
      await updateCourse(courseId, { status: 'archived' });
      addToast('Class archived successfully.', 'success');
      setCourses(courses.filter(c => c.id !== courseId));
      setShowArchiveModal(false);
    } catch (error) {
      console.error('Error archiving class:', error);
      addToast('Failed to archive class', 'error');
    }
  };

  const handleOpenEditClass = (course) => {
    setEditingClass(course);
    setEditClassName(course?.name || '');
    setEditClassColor(course?.color || '');
    setEditClassImageUrl(course?.bgImage || '');
    setEditClassImagePath(course?.bgImagePath || '');
    setEditClassImageFile(null);
    setActiveMenu(null);
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

  const handleUpdateClass = async (event) => {
    event.preventDefault();
    if (!editingClass) return;
    const normalizedName = editClassName.trim().replace(/\s+/g, ' ');
    if (normalizedName.length < 3 || normalizedName.length > 100) {
      addToast('Class name must be between 3 and 100 characters.', 'error');
      return;
    }

    try {
      setIsUpdatingClass(true);
      let nextImageUrl = editClassImageUrl;
      let nextImagePath = editClassImagePath;
      if (editClassImageFile) {
        const uploadedImage = await compressAndStoreFile(editClassImageFile, editingClass.id);
        nextImageUrl = uploadedImage.url;
        nextImagePath = uploadedImage.storagePath;
      }
      const updates = {
        name: normalizedName,
        color: editClassColor,
        bgImage: nextImageUrl,
        bgImagePath: nextImagePath,
      };
      await updateCourse(editingClass.id, updates);
      setCourses((prev) => prev.map((course) => (
        course.id === editingClass.id ? { ...course, ...updates } : course
      )));
      setEditingClass(null);
      setEditClassName('');
      setEditClassColor('');
      setEditClassImageUrl('');
      setEditClassImagePath('');
      setEditClassImageFile(null);
      addToast('Class details updated.', 'success');
    } catch (error) {
      addToast(error?.message || 'Unable to update the class.', 'error');
    } finally {
      setIsUpdatingClass(false);
    }
  };

  // Handle complete enrollment
  const handleCompleteEnrollment = async (enrollmentId) => {
    try {
      await updateEnrollmentStatus(enrollmentId, 'completed');
      addToast('Enrollment marked as completed.', 'success');
      window.location.reload();
    } catch (error) {
      console.error('Error completing enrollment:', error);
      addToast('Failed to complete enrollment', 'error');
    }
  };

  // Handle open create class modal - load sectors
  const handleOpenCreateClass = () => {
    // Open modal first
    setShowCreateClassModal(true);
    setCreationPath(null);
    setSelectedSector(null);
    setSectorClasses([]);
    setSelectedClassDetails(null);
    
    // Load sectors in background. Reconcile first so sectors with no active
    // course are marked Inactive, then only offer Active sectors for a new class.
    const loadSectors = async () => {
      try {
        setLoadingSectors(true);
        const reconciled = (await reconcileSectorStatuses()) || (await getSectors());
        const activeSectors = (reconciled || []).filter(
          (s) => String(s.status || 'Active').toLowerCase() === 'active'
        );
        setSectors(activeSectors);
      } catch (error) {
        console.error('Error loading sectors:', error);
        addToast('Failed to load sectors', 'error');
      } finally {
        setLoadingSectors(false);
      }
    };

    loadSectors();
  };

  // Handle sector selection - load classes for sector
  const handleSectorSelect = async (sector) => {
    try {
      setLoadingSectors(true);
      setSelectedSector(sector);
      const coursesData = await getCoursesTemplates({ sectorId: sector.id, availableOnly: true });
      setSectorClasses(
        creationPath === 'template'
          ? (coursesData || []).filter((course) => course.hasContent === true)
          : (coursesData || [])
      );
      setSelectedClassDetails(null);
    } catch (error) {
      console.error('Error loading courses:', error);
      addToast('Failed to load courses', 'error');
    } finally {
      setLoadingSectors(false);
    }
  };

  // Handle course selection - show form to create class based on course
  const handleClassSelect = (courseItem) => {
    setSelectedClassDetails(courseItem);
    setNewClassForm({
      name: courseItem.name || '',
    });
    // Pre-fill the editable subject list from the program template. The trainer
    // can rename/reorder/add/remove before these become the class's modules.
    setClassSubjects(
      creationPath === 'empty' && Array.isArray(courseItem.subjects)
        ? [...courseItem.subjects]
        : []
    );
  };

  // Handle create class
  const handleCreateClass = async () => {
    if (!newClassForm.name.trim()) {
      addToast('Class name is required', 'error');
      return;
    }
    if (!selectedSector) {
      addToast('No sector selected', 'error');
      return;
    }
    if (!selectedClassDetails) {
      addToast('No course selected', 'error');
      return;
    }

    try {
      setLoadingSectors(true);
      const classCode = await generateUniqueClassCode();
      
      await createCourse({
        name: newClassForm.name,
        description: selectedClassDetails.description || '',
        level: selectedClassDetails.level || 'NC I',
        status: 'Active',
        classCode: classCode,
        courseId: selectedClassDetails.id,
        bgImage: selectedClassDetails.bgImage || '',
        color: selectedClassDetails.color || '',
        templateMode: creationPath,
        templateHasContent: selectedClassDetails.hasContent === true,
        subjects: creationPath === 'empty' ? classSubjects : [],
      }, { sectorId: selectedSector.id, trainerId: user.uid });
      
      addToast(`Class created successfully! Code: ${classCode}`, 'success');
      setShowCreateClassModal(false);
      setCreationPath(null);
      setSelectedSector(null);
      setSectorClasses([]);
      setSelectedClassDetails(null);
      setNewClassForm({
        name: '',
      });
      setClassSubjects([]);

      // Reload trainer's classes (led + co-trained) to show the new class
      try {
        const assignedClasses = await getClassesForTrainer(user.uid);
        const coursesData = (assignedClasses || []).filter(isTrainerVisibleClass);
        setCourses(coursesData || []);
      } catch (reloadError) {
        console.error('Error reloading courses:', reloadError);
      }
    } catch (error) {
      console.error('Error creating class:', error);
      addToast(error.message || 'Failed to create class', 'error');
    } finally {
      setLoadingSectors(false);
    }
  };

  // Reset modal to sectors view
  const handleBackToSectors = () => {
    if (selectedClassDetails) {
      setSelectedClassDetails(null);
      return;
    }
    if (selectedSector) {
      setSelectedSector(null);
      setSectorClasses([]);
      return;
    }
    setCreationPath(null);
  };

  // Toast notification
  const showToast = (message) => {
    addToast(message, 'info');
  };

  // The create-class flow (sector → course → class form) is rendered from both
  // the empty state and the main grid, so keep it in one place.
  const renderCreateClassModal = () =>
    showCreateClassModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
            <div className="flex items-center gap-3">
              {creationPath && (
                <button
                  onClick={handleBackToSectors}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Back to sectors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-xl font-bold text-gray-900">
                {selectedClassDetails
                  ? 'Create Class'
                  : selectedSector
                  ? `Programs in ${selectedSector.name}`
                  : creationPath
                  ? 'Select a Sector'
                  : 'How do you want to start?'}
              </h2>
            </div>
            <button
              onClick={() => setShowCreateClassModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {loadingSectors ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : selectedClassDetails ? (
              // Class Details View - Form to Create Class
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    value={newClassForm.name}
                    onChange={(e) => setNewClassForm({ ...newClassForm, name: e.target.value })}
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter class name"
                  />
                  <p className="mt-1 text-xs text-gray-500">Use a distinct name for this class or batch. You can change it later.</p>
                </div>
                {creationPath === 'empty' ? (
                  <div className="pt-2 border-t border-gray-100">
                    <SubjectListEditor
                      subjects={classSubjects}
                      onChange={setClassSubjects}
                      label="Module outline"
                      hint="These titles create empty module sections. Materials, quizzes, and assignments will not be copied."
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                      <Copy className="mt-0.5 h-5 w-5 text-blue-700" />
                      <div>
                        <p className="font-semibold text-blue-900">Full teaching content included</p>
                        <p className="mt-1 text-sm text-blue-700">
                          Topics, study materials, quizzes, protected answer keys, and assignments will be copied into this class.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setSelectedClassDetails(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateClass}
                    disabled={loadingSectors}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {loadingSectors ? 'Creating...' : 'Create Class'}
                  </button>
                </div>
              </div>
            ) : selectedSector ? (
              // Courses List View - Select a course to create a class from it
              <div className="space-y-2">
                {sectorClasses.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                    <p className="font-medium text-amber-900">
                      {creationPath === 'template'
                        ? 'No full-content templates are ready in this sector.'
                        : 'No available programs are in this sector yet.'}
                    </p>
                    {creationPath === 'template' && (
                      <p className="mt-1 text-sm text-amber-700">
                        Create an empty class first. After its content is built, an administrator can promote it as this program’s default template.
                      </p>
                    )}
                  </div>
                ) : (
                  sectorClasses.map((classItem) => (
                    <div
                      key={classItem.id}
                      onClick={() => handleClassSelect(classItem)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <h4 className="font-semibold text-gray-900">{classItem.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{classItem.description}</p>
                      <div className="flex gap-2 mt-2">
                        {classItem.hasContent === true && (
                          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded">
                            Includes materials &amp; quizzes
                          </span>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {classItem.level || 'NC'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          classItem.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {classItem.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : creationPath ? (
              // Sectors List View
              <div className="space-y-2">
                {sectors.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No sectors available.</p>
                ) : (
                  sectors.map((sector) => (
                    <div
                      key={sector.id}
                      onClick={() => handleSectorSelect(sector)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <h4 className="font-semibold text-gray-900">{sector.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{sector.description}</p>
                      <span className={`inline-block text-xs px-2 py-1 rounded mt-2 ${
                        sector.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {sector.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCreationPath('template')}
                  className="group rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 text-left transition hover:border-blue-500 hover:bg-blue-100"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Copy className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Use a Template</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Start with the program’s admin-approved topics, materials, quizzes, answer keys, and assignments.
                  </p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-blue-700">
                    Choose template
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationPath('empty')}
                  className="group rounded-2xl border-2 border-gray-200 bg-white p-6 text-left transition hover:border-gray-400 hover:bg-gray-50"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800 text-white">
                    <Plus className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Create Empty Class</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Link the class to a program and create only its module outline, then build the teaching content yourself.
                  </p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-gray-700">
                    Start empty
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );

  // Loading State
  if (loadingCourses) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Error State
  if (errorMessage) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertCircle className="w-6 h-6 text-red-600 mb-3" />
        <h2 className="text-lg font-bold text-red-900 mb-2">Error Loading Classes</h2>
        <p className="text-red-700">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty State
  if (!courses || courses.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Classes Yet</h2>
          <p className="text-gray-600 mb-6">Create your first class to get started teaching.</p>
          <button
            onClick={handleOpenCreateClass}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Class
          </button>
        </div>

        {renderCreateClassModal()}
      </>
    );
  }

  // Main Content - Grid View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        {/* Welcome Message */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.displayName}!</h1>
          <p className="text-gray-500">Manage your classes and explore available courses</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Your Classes Section */}
        <div className="mb-12">
          <div className="flex flex-col items-stretch gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Classes</h2>
              <p className="text-gray-600 mt-1">Active and draft classes assigned to you</p>
            </div>
            <button
              onClick={handleOpenCreateClass}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md hover:shadow-lg sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Create Class
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center sm:p-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No classes yet. Create your first class to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const courseEnrolls = enrollments[course.id] || [];

                return (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/trainer/${course.id}`)}
                    className="relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer border border-gray-200 flex flex-col h-full"
                  >
                    {course.trainerId === user?.uid && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenEditClass(course);
                        }}
                        className="absolute right-3 top-3 z-10 rounded-lg bg-white/95 p-2 text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`Edit ${course.name}`}
                        title="Edit class"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    <div
                      className="relative h-36 overflow-hidden"
                      style={course.bgImage
                        ? {
                            backgroundImage: `url(${course.bgImage})`,
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                          }
                        : { background: getGradientStyle(course.color) }}
                    >
                      {course.bgImage && (
                        <div
                          className="absolute inset-0 opacity-40"
                          style={{ background: getGradientStyle(course.color) }}
                        />
                      )}
                      {!course.bgImage && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-white/80" />
                        </div>
                      )}
                    </div>
                    {/* Class Info */}
                    <div className="p-4 space-y-4 flex flex-col flex-1 sm:p-6">
                      {/* Title */}
                      <div className="min-h-14 pr-9">
                        <h3 className="font-bold text-navy-900 text-lg line-clamp-2 leading-snug">{course.name}</h3>
                        {course.courseName && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{course.courseName}</p>
                        )}
                      </div>

                      {/* Class Code */}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-gray-600 font-medium mb-1">Class Code</p>
                        <p className="font-mono text-sm font-bold text-blue-700">{course.classCode || 'N/A'}</p>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center mt-auto">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium">Enrolled</p>
                          <p className="text-lg font-bold text-navy-900 mt-1">{courseEnrolls.length}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium">Level</p>
                          <p className="text-lg font-bold text-blue-600 mt-1">{course.level || 'NC I'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium">Status</p>
                          <span className={`inline-block text-xs font-bold px-2 py-1 rounded mt-1 ${
                            String(course.status || '').toLowerCase() === 'draft'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {String(course.status || 'Active').toLowerCase() === 'draft' ? 'Draft' : 'Active'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Courses Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Courses</h2>
            <p className="text-gray-600">Explore courses you can create classes from</p>
          </div>

          {/* Sector Filter Dropdown */}
          <div className="mb-6">
            <select
              value={selectedFilterSector || ''}
              onChange={(e) => setSelectedFilterSector(e.target.value)}
              className="w-full px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-900 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer sm:w-auto"
            >
              <option value="">All Courses</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={String(sector.id)}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>

          {/* Available Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses
              .filter((course) => selectedFilterSector === '' || String(course.sectorId) === selectedFilterSector)
              .map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-200 hover:border-purple-300 group"
                >
                  {/* Header with Image or Gradient */}
                  <div 
                    className="relative h-48 overflow-hidden"
                    style={
                      course.bgImage 
                        ? { backgroundImage: `url(${course.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: getGradientStyle(course.color) }
                    }
                  >
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-green-400 text-green-900">Active</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4 sm:p-6">
                    <div>
                      <h3 className="font-bold text-lg line-clamp-1 mb-1">{course.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{course.sectorName}</p>
                    </div>
                    {/* Description */}
                    <p className="text-gray-600 text-sm line-clamp-2">{course.description || 'No description available'}</p>

                    {/* Course Info */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 font-medium">Level</p>
                        <p className="font-bold text-gray-900">{course.level || 'NC I'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 font-medium">Status</p>
                        <span className="text-xs font-bold text-green-700">Active</span>
                      </div>
                    </div>

                    
                  </div>
                </div>
              ))}
          </div>

          {availableCourses.filter((course) => !selectedFilterSector || course.sectorId === selectedFilterSector).length ===
            0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center sm:p-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No courses available in this sector</p>
            </div>
          )}
        </div>
      </div>

        {/* Archive Modal */}
        {showArchiveModal && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Archive Class?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to archive "{selectedCourse.name}"? Existing enrollments will not be affected.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowArchiveModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleArchiveCourse(selectedCourse.id);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}

        {editingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={handleUpdateClass}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit Class</h2>
                  <p className="mt-1 text-sm text-gray-500">Update the class name and the shared card appearance trainees see.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close edit class"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <label htmlFor="edit-class-name" className="mb-2 block text-sm font-semibold text-gray-800">
                Class Name
              </label>
              <input
                id="edit-class-name"
                type="text"
                value={editClassName}
                onChange={(event) => setEditClassName(event.target.value)}
                maxLength={100}
                autoFocus
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter class name"
              />
              <p className="mt-2 text-xs text-gray-500">{editClassName.trim().length}/100 characters</p>

              <div className="mt-5 border-t border-gray-100 pt-5">
                <ClassAppearanceEditor
                  color={editClassColor}
                  imageUrl={editClassImageUrl}
                  imageFile={editClassImageFile}
                  onColorChange={setEditClassColor}
                  onImageChange={handleEditClassImage}
                  onRemoveImage={() => {
                    setEditClassImageFile(null);
                    setEditClassImageUrl('');
                    setEditClassImagePath('');
                  }}
                  disabled={isUpdatingClass}
                />
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  disabled={isUpdatingClass}
                  className="rounded-xl px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingClass || !editClassName.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingClass ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {renderCreateClassModal()}
      </div>
  );
};

export default TrainerHome;



