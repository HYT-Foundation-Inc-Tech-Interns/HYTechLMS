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
  Check, 
  X, 
  Loader, 
  AlertCircle, 
  ChevronLeft, 
  BookOpen, 
  FileText, 
  Video, 
  Plus,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getCourses,
  getCoursesTemplates,
  getCourseApplications,
  getCourseEnrollments,
  approveApplication,
  rejectApplication,
  updateEnrollmentStatus,
  updateCourse,
  getSectors,
  getSectorById,
  createCourse,
} from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';

const TrainerHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Helper function to convert Tailwind gradient classes to inline CSS
  const getGradientStyle = (colorClass) => {
    if (!colorClass) {
      return { background: 'linear-gradient(to right, rgb(168, 85, 247), rgb(147, 51, 234))' }; // purple-500 to purple-600
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
    
    return { background: gradientMap[colorClass] || 'linear-gradient(to right, rgb(168, 85, 247), rgb(147, 51, 234))' };
  };

  // State Management
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Create Class States
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [sectors, setSectors] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedFilterSector, setSelectedFilterSector] = useState(null);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [sectorClasses, setSectorClasses] = useState([]);
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [newClassForm, setNewClassForm] = useState({
    name: '',
  });

  // Loading & Error States
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Initialize: Load trainer's courses and available courses
  useEffect(() => {
    const loadTrainerData = async () => {
      if (!user?.uid) return;

      try {
        setLoadingCourses(true);
        setErrorMessage(null);

        // Load trainer's active courses (classes)
        const coursesData = await getCourses({
          trainerId: user.uid,
          status: 'Active',
        });
        setCourses(coursesData || []);

        // Load available course templates with sector names
        const availableCoursesData = await getCoursesTemplates();
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

        // Load pending applications for trainer's courses
        const appsData = await getCourseApplications({
          trainerId: user.uid,
          status: 'pending',
        });
        setApplications(appsData || []);

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

  // Handle approve application
  const handleApproveApplication = async (appId) => {
    try {
      setLoadingApprove(true);
      await approveApplication(appId);
      addToast('Application approved! Enrollment will be created shortly.', 'success');
      
      // Remove from pending list immediately (reactive update)
      setApplications(applications.filter(a => a.id !== appId));
      setShowApplicationModal(false);
      setSelectedApp(null);
    } catch (error) {
      console.error('Error approving application:', error);
      addToast(error.message || 'Failed to approve application', 'error');
    } finally {
      setLoadingApprove(false);
    }
  };

  // Handle reject application
  const handleRejectApplication = async (appId) => {
    try {
      setLoadingApprove(true);
      await rejectApplication(appId, rejectReason);
      addToast('Application rejected.', 'success');
      
      setApplications(applications.filter(a => a.id !== appId));
      setShowApplicationModal(false);
      setSelectedApp(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting application:', error);
      addToast(error.message || 'Failed to reject application', 'error');
    } finally {
      setLoadingApprove(false);
    }
  };

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
    setSelectedSector(null);
    setSectorClasses([]);
    setSelectedClassDetails(null);
    
    // Load sectors in background
    const loadSectors = async () => {
      try {
        setLoadingSectors(true);
        const sectorsData = await getSectors();
        setSectors(sectorsData || []);
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
      const coursesData = await getCoursesTemplates({ sectorId: sector.id });
      setSectorClasses(coursesData || []);
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
      // Generate unique class code
      const classCode = `CLASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await createCourse({
        name: newClassForm.name,
        description: selectedClassDetails.description || '',
        level: selectedClassDetails.level || 'NC I',
        status: 'Active',
        classCode: classCode,
        courseTemplateId: selectedClassDetails.id,
        bgImage: selectedClassDetails.bgImage || '',
      }, { sectorId: selectedSector.id, trainerId: user.uid });
      
      addToast(`Class created successfully! Code: ${classCode}`, 'success');
      setShowCreateClassModal(false);
      setSelectedSector(null);
      setSectorClasses([]);
      setSelectedClassDetails(null);
      setNewClassForm({
        name: '',
      });
      
      // Reload trainer's courses to show the newly created class
      try {
        const coursesData = await getCourses({
          trainerId: user.uid,
          status: 'Active',
        });
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
    setSelectedSector(null);
    setSectorClasses([]);
    setSelectedClassDetails(null);
  };

  // Toast notification
  const showToast = (message) => {
    addToast(message, 'info');
  };

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

        {/* Create Class Modal - Always Render */}
        {showCreateClassModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-96 overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  {selectedSector && (
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
                      ? `Courses in ${selectedSector.name}` 
                      : 'Select a Sector'}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter class name"
                      />
                    </div>
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
                      <p className="text-gray-600 text-center py-4">No courses in this sector yet.</p>
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
                ) : (
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
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Main Content - Grid View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="px-6 py-8">
        {/* Welcome Message */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.displayName}!</h1>
          <p className="text-gray-500">Manage your classes and explore available courses</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Your Classes Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Classes</h2>
              <p className="text-gray-600 mt-1">Active classes you are teaching</p>
            </div>
            <button
              onClick={handleOpenCreateClass}
              className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Class
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
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
                    onClick={() => navigate(`/trainer/${encodeURIComponent(course.name)}`)}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer border border-gray-200"
                  >
                    {/* Class Info */}
                    <div className="p-6 space-y-4">
                      {/* Title */}
                      <div>
                        <h3 className="font-bold text-navy-900 text-lg line-clamp-2">{course.name}</h3>
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
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 font-medium">Enrolled</p>
                          <p className="text-lg font-bold text-navy-900">{courseEnrolls.length}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 font-medium">Level</p>
                          <p className="text-lg font-bold text-blue-600">{course.level || 'NC I'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 font-medium">Status</p>
                          <span className="inline-block text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                            Active
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
              onChange={(e) => setSelectedFilterSector(e.target.value || null)}
              className="px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-900 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="">All Courses</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>

          {/* Available Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses
              .filter((course) => !selectedFilterSector || course.sectorId === selectedFilterSector)
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
                        : getGradientStyle(course.color)
                    }
                  >
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-green-400 text-green-900">Active</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-bold text-lg line-clamp-1 mb-1">{course.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{course.sectorName}</p>
                    </div>
                    {/* Description */}
                    <p className="text-gray-600 text-sm line-clamp-2">{course.description || 'No description available'}</p>

                    {/* Course Info */}
                    <div className="grid grid-cols-2 gap-3">
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
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No courses available in this sector</p>
            </div>
          )}
        </div>
      </div>

        {/* Archive Modal */}
        {showArchiveModal && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-sm w-full mx-4 p-6">
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

        {/* Applications Review Modal */}
        {showApplicationModal && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Pending Applications - {selectedCourse.name}
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                {applications
                  .filter(a => a.courseId === selectedCourse.id)
                  .map((app) => (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-gray-900">Applicant ID: {app.studentId}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Applied: {new Date(app.appliedAt.seconds * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApproveApplication(app.id)}
                          disabled={loadingApprove}
                          className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setShowApplicationModal(false);
                          }}
                          disabled={loadingApprove}
                          className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => setShowApplicationModal(false)}
                className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-sm w-full mx-4 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Reject Application</h2>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4 h-24"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectApplication(selectedApp.id)}
                  disabled={loadingApprove}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loadingApprove ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Class Modal */}
        {showCreateClassModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-96 overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  {selectedSector && (
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
                      ? `Courses in ${selectedSector.name}` 
                      : 'Select a Sector'}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter class name"
                      />
                    </div>
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
                      <p className="text-gray-600 text-center py-4">No courses in this sector yet.</p>
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
                ) : (
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default TrainerHome;



