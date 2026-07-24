import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Check, Users, Save, ExternalLink, Calendar, Send, FileText, Video, Copy, Share2, Loader, AlertCircle, X, MessageSquare, Paperclip, ClipboardList, Edit2, Trash2, Download, Eye, Plus, Settings, GripVertical, Upload, Bell, MessageCircle as DiscussionIcon, Award, Clock, Megaphone } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { getCourseByName, getCourseTemplateById, getCourseEnrollmentsWithAvatars, getSectorById, getAnnouncements, subscribeToAnnouncements, createAnnouncement, getModules, createModule, getAssessments, createAssessment, updateAnnouncement, deleteAnnouncement, updateAssessment, deleteAssessment, getClassActivityFeed, storeAnnouncementAttachment, uploadMaterial, compressAndStoreFile, addCommentToAnnouncement, getAnnouncementComments, deleteComment, subscribeToComments, downloadAttachment, createAssignment, updateAssignment, getAssignments, removeEnrollment, approveEnrollment, getUserProfile, subscribeToEnrollments, getAssessmentAttempts, createMaterial, getClassMaterials, publishMaterial, unpublishMaterial, updateMaterial, deleteMaterial, createTopic, getClassTopics, subscribeToClassTopics, updateTopic, deleteTopic, publishTopic, unpublishTopic, updateEnrollmentStatus, getAssignmentSubmissions, gradeSubmission, getClassGradebook, getStudents, adminAddStudentToClass, getTrainers, addCoTrainer, removeCoTrainer, transferClassOwnership, getClassActivity, toDate, reorderTopics, setModuleItemTopic, deleteAssignment } from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';

const FORM_QUESTION_TYPES = [
  { type: 'short-answer', label: 'Short answer', icon: 'Aa', desc: 'Brief text response' },
  { type: 'paragraph', label: 'Paragraph', icon: '¶', desc: 'Long text response' },
  { type: 'multiple-choice', label: 'Multiple choice', icon: '●', desc: 'Pick one option' },
  { type: 'checkboxes', label: 'Checkboxes', icon: '☑', desc: 'Pick multiple options' },
  { type: 'dropdown', label: 'Dropdown', icon: '▼', desc: 'Choose from list' },
  { type: 'file-upload', label: 'File upload', icon: '↥', desc: 'Upload files' },
  { type: 'linear-scale', label: 'Linear scale', icon: '—', desc: 'Rate on a scale' },
  { type: 'rating', label: 'Rating', icon: '★', desc: 'Star rating' },
  { type: 'multiple-grid', label: 'Multiple choice grid', icon: '▦', desc: 'Grid of options' },
  { type: 'checkbox-grid', label: 'Checkbox grid', icon: '▨', desc: 'Grid multi-select' },
  { type: 'date', label: 'Date', icon: 'D', desc: 'Pick a date' },
  { type: 'time', label: 'Time', icon: 'T', desc: 'Pick a time' },
];

const ClassDetail = () => {
  const { className } = useParams();
  const decodedClassName = decodeURIComponent(className);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  // Honor ?tab= hints while preserving legacy Responses/Grades deep links.
  const initialRequestedTab = searchParams.get('tab');
  const initialAssessmentSection = ['responses', 'grades'].includes(initialRequestedTab)
    ? initialRequestedTab
    : 'assessments';
  const [activeTab, setActiveTab] = useState(
    ['responses', 'grades'].includes(initialRequestedTab)
      ? 'assessments'
      : initialRequestedTab || 'overview'
  );
  const [assessmentSection, setAssessmentSection] = useState(initialAssessmentSection);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (!requestedTab) return;
    if (['responses', 'grades'].includes(requestedTab)) {
      setActiveTab('assessments');
      setAssessmentSection(requestedTab);
      return;
    }
    setActiveTab(requestedTab);
    if (requestedTab === 'assessments') setAssessmentSection('assessments');
  }, [searchParams]);

  // Due/available date pickers are capped at one year from today (no far-future
  // 2099 picks). getMaxDate() returns a fresh Date so validation tracks "now".
  const getMaxDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  };
  const maxDateStr = getMaxDate().toISOString().split('T')[0];
  const [classData, setClassData] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [sectorName, setSectorName] = useState('N/A');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  // Add-existing-trainee picker
  const [showAddTraineeModal, setShowAddTraineeModal] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [addingStudentId, setAddingStudentId] = useState(null);
  // Co-trainers & ownership
  const [allTrainers, setAllTrainers] = useState([]);
  const [showAddCoTrainerModal, setShowAddCoTrainerModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [coTrainerBusy, setCoTrainerBusy] = useState(false);
  // Class engagement logs
  const [classActivity, setClassActivity] = useState(null); // null = not loaded
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');
  // Modules drag-and-drop (declared here — must stay above the early returns
  // below so hook order is stable).
  const dragItemRef = useRef(null); // { kind, id }
  const dragTopicRef = useRef(null); // topicId being reordered
  const [dragOverTopicId, setDragOverTopicId] = useState(null);
  const [dragOverUnassigned, setDragOverUnassigned] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [modalAnnouncementText, setModalAnnouncementText] = useState('');
  const [modalAnnouncementFiles, setModalAnnouncementFiles] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [modules, setModules] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [editingAnnouncementText, setEditingAnnouncementText] = useState('');
  const [activityFeed, setActivityFeed] = useState([]);
  const [loadingActivityFeed, setLoadingActivityFeed] = useState(false);
  const [announcementFile, setAnnouncementFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postComments, setPostComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('');
  // Form Builder States for Assignment/Material Creation
  const [formBuilderTitle, setFormBuilderTitle] = useState('');
  const [formBuilderDescription, setFormBuilderDescription] = useState('');
  const [formBuilderQuestions, setFormBuilderQuestions] = useState([]);
  const [formBuilderAvailableDate, setFormBuilderAvailableDate] = useState('');
  const [formBuilderDueDate, setFormBuilderDueDate] = useState('');
  const [formBuilderPoints, setFormBuilderPoints] = useState('100');
  const [currentFormQuestionType, setCurrentFormQuestionType] = useState('multiple-choice');
  const [editingQuestionId, setEditingQuestionId] = useState(null); // Track which question is being edited
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showAssignmentDetailModal, setShowAssignmentDetailModal] = useState(false);
  const [selectedAssignmentDetail, setSelectedAssignmentDetail] = useState(null);
  const [assignmentDetailTab, setAssignmentDetailTab] = useState('questions'); // questions, responses, settings
  const [isEditingAssignmentDetail, setIsEditingAssignmentDetail] = useState(false);
  const [editAssignmentTitle, setEditAssignmentTitle] = useState('');
  const [editAssignmentDescription, setEditAssignmentDescription] = useState('');
  const [editAssignmentQuestions, setEditAssignmentQuestions] = useState([]);
  const [isFormBuilderEditMode, setIsFormBuilderEditMode] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isPublishingItem, setIsPublishingItem] = useState(false);
  const [currentAssignmentDraftId, setCurrentAssignmentDraftId] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [assessmentType, setAssessmentType] = useState('quiz'); // quiz, survey, form
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizHasTimeLimit, setQuizHasTimeLimit] = useState(false);
  const [quizTimeLimit, setQuizTimeLimit] = useState('');
  const [quizPoints, setQuizPoints] = useState('100');
  const [quizPassingScore, setQuizPassingScore] = useState('60');
  const [quizAvailableDate, setQuizAvailableDate] = useState('');
  const [quizDueDate, setQuizDueDate] = useState('');
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isPublishingQuiz, setIsPublishingQuiz] = useState(false);
  const [currentQuizDraftId, setCurrentQuizDraftId] = useState(null);
  const [currentQuizStatus, setCurrentQuizStatus] = useState('draft');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionType, setCurrentQuestionType] = useState('multiple-choice');
  // Material Upload States
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [materialFiles, setMaterialFiles] = useState([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [isSavingMaterialDraft, setIsSavingMaterialDraft] = useState(false);
  const [currentMaterialId, setCurrentMaterialId] = useState(null);
  const [showMaterialViewModal, setShowMaterialViewModal] = useState(false);
  const [selectedMaterialForView, setSelectedMaterialForView] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);
  // Topic States
  const [topics, setTopics] = useState([]);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [submittingTopic, setSubmittingTopic] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  // Assessment Settings
  const [assessmentSettings, setAssessmentSettings] = useState({
    shuffleQuestions: false,
    shuffleAnswers: false,
    showScore: true,
    showCorrectAnswers: true,
    allowReview: true,
    randomizeQuestionOrder: false,
    requiredQuestionsOnly: false,
    oneResponsePerUser: false,
    customColor: '#3b82f6'
  });
  
  // Responses/Submissions States
  const [selectedAssessmentForResponses, setSelectedAssessmentForResponses] = useState(null);
  const [selectedAssessmentForPreview, setSelectedAssessmentForPreview] = useState(null);
  const [assessmentResponses, setAssessmentResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  // A single student's quiz response, shown in the "View Details" modal.
  const [selectedResponseDetail, setSelectedResponseDetail] = useState(null);
  // Submission-type assignment grading
  const [itemSubmissions, setItemSubmissions] = useState([]);
  const [gradingStudentId, setGradingStudentId] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  // Create submission task
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState('100');
  // Which upload kinds a trainee may submit for this task.
  const [newTaskUploadTypes, setNewTaskUploadTypes] = useState(['text', 'file']);
  const [creatingTask, setCreatingTask] = useState(false);
  // Gradebook
  const [gradebook, setGradebook] = useState(null);
  const [loadingGradebook, setLoadingGradebook] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);
  const menuRef = useRef(null);

  // Fetch current user's avatar on component mount
  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (!user?.uid) return;
      
      try {
        let avatar = null;
        
        // Try fetching from users/{uid} first (where Settings saves it)
        const usersRef = doc(db, 'users', user.uid);
        const usersSnap = await getDoc(usersRef);
        if (usersSnap.exists()) {
          avatar = usersSnap.data()?.avatarBase64 || null;
        }
        
        // If still no avatar, try userSettings
        if (!avatar) {
          const userRole = user?.role || 'trainer';
          const settingsRef = doc(db, 'userSettings', user.uid);
          const settingsSnap = await getDoc(settingsRef);
          
          if (settingsSnap.exists()) {
            const roleSettings = settingsSnap.data()?.[userRole] || {};
            avatar = roleSettings.avatarUrl || roleSettings.avatarPreview || roleSettings.avatarBase64 || null;
          }
        }
        
        // If still no avatar, generate one from initials
        if (!avatar) {
          const initials = (user?.displayName || user?.email || 'Trainor')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
          
          // Generate a consistent color based on user ID
          const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
          const colorIndex = user.uid.charCodeAt(0) % colors.length;
          const bgColor = colors[colorIndex];
          
          // Create avatar using canvas
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            
            // Draw colored circle background
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.arc(100, 100, 100, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 80px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initials, 100, 100);
            
            avatar = canvas.toDataURL('image/png');
          } catch (err) {
            console.warn('Could not generate avatar canvas:', err);
            // Fallback: use SVG data URL
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="100" fill="${bgColor}"/><text x="100" y="130" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">${initials}</text></svg>`;
            avatar = `data:image/svg+xml;base64,${btoa(svg)}`;
          }
        }
        
        setCurrentUserAvatar(avatar);
      } catch (err) {
        console.warn('Error fetching user avatar:', err);
      }
    };
    
    fetchUserAvatar();
  }, [user?.uid, user?.role]);

  useEffect(() => {
    let unsubscribeEnrollments;

    const loadClassData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load class data by name
        const courseData = await getCourseByName(decodedClassName);
        if (!courseData) {
          setError('Class not found');
          setLoading(false);
          return;
        }
        setClassData(courseData);

        // Subscribe to real-time enrollments
        unsubscribeEnrollments = subscribeToEnrollments(courseData.id, async (enrollmentData) => {
          try {
            // Fetch student profile for each enrollment
            const enrollmentsWithStudentInfo = await Promise.all(
              (enrollmentData || []).map(async (enrollment) => {
                try {
                  const studentProfile = await getUserProfile(enrollment.studentId);
                  // Try multiple name variations
                  let studentName = 'Unknown Trainee';
                  
                  // Check various name fields in order of preference
                  if (studentProfile) {
                    if (studentProfile.displayName) {
                      studentName = studentProfile.displayName;
                    } else if (studentProfile.fullName) {
                      studentName = studentProfile.fullName;
                    } else if (studentProfile.name) {
                      studentName = studentProfile.name;
                    } else if (studentProfile.firstName && studentProfile.lastName) {
                      studentName = `${studentProfile.firstName} ${studentProfile.lastName}`;
                    } else if (studentProfile.firstName) {
                      studentName = studentProfile.firstName;
                    } else if (studentProfile.email) {
                      // Use email username as fallback
                      studentName = 'Trainee';
                    }
                  }
                  
                  return {
                    ...enrollment,
                    studentName,
                    studentEmail: studentProfile?.email || 'N/A',
                    studentAvatar: studentProfile?.avatarBase64 || studentProfile?.avatarUrl || studentProfile?.avatarPreview || null
                  };
                } catch (error) {
                  console.error('Error fetching student profile:', error);
                  return {
                    ...enrollment,
                    studentName: 'Unknown Trainee',
                    studentEmail: 'N/A',
                    studentAvatar: null
                  };
                }
              })
            );
            
            setEnrollments(enrollmentsWithStudentInfo || []);
          } catch (error) {
            console.error('Error processing enrollments:', error);
            addToast('Error loading participants', 'error');
          }
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading class data:', err);
        setError(err.message || 'Failed to load class');
        addToast('Failed to load class details', 'error');
        setLoading(false);
      }
    };

    if (decodedClassName) {
      loadClassData();
    }

    // Cleanup subscription on unmount or when classname changes
    return () => {
      if (unsubscribeEnrollments) {
        unsubscribeEnrollments();
      }
    };
  }, [decodedClassName]);

  // Fetch sector name and course details when class data is loaded
  useEffect(() => {
    const loadSectorAndCourseData = async () => {
      if (classData?.sectorId) {
        try {
          const sectorData = await getSectorById(classData.sectorId);
          setSectorName(sectorData?.name || 'N/A');
        } catch (err) {
          console.error('Error loading sector name:', err);
          setSectorName('N/A');
        }
      }

      if (classData?.courseId) {
        try {
          const cData = await getCourseTemplateById(classData.courseId);
          setCourseData(cData);
        } catch (err) {
          console.error('Error loading course details:', err);
          setCourseData(null);
        }
      }
    };
    loadSectorAndCourseData();
  }, [classData]);

  // subscription to announcements
  useEffect(() => {
    if (!classData?.id) return;

    const loadAnnouncements = async () => {
      try {
        setLoadingAnnouncements(true);
        const announcementData = await getAnnouncements(classData.id);
        setAnnouncements(announcementData || []);
      } catch (err) {
        console.error('Error loading announcements:', err);
      } finally {
        setLoadingAnnouncements(false);
      }
    };

    loadAnnouncements();
    
    // Subscribe to real-time announcements and update activity feed
    const unsubscribe = subscribeToAnnouncements(classData.id, async (announcementData) => {
      setAnnouncements(announcementData);
      
      // Also fetch assignments to merge into activity feed
      try {
        const assignmentsData = await getAssignments(classData.id);
        setAssignments(assignmentsData || []);

        // Merge announcements and assignments into activity feed
        const announcementItems = announcementData.map(announcement => ({
          id: announcement.id,
          type: 'announcement',
          title: announcement.title,
          message: announcement.message,
          author: announcement.author,
          authorId: announcement.authorId,
          authorAvatar: announcement.authorAvatar || null,
          attachments: announcement.attachments || [],
          timestamp: announcement.createdAt instanceof Date 
            ? announcement.createdAt 
            : new Date(announcement.createdAt),
          preview: announcement.message?.substring(0, 50) + '...' || 'Announcement',
          hasAttachments: (announcement.attachments || []).length > 0,
          createdAt: announcement.createdAt
        }));

        const assignmentItems = (assignmentsData || []).map(assignment => ({
          id: assignment.id,
          type: 'assignment',
          itemType: assignment.type,
          title: assignment.title,
          message: assignment.description,
          author: assignment.author,
          authorId: assignment.authorId,
          authorAvatar: assignment.createdByAvatar || null,
          dueDate: assignment.dueDate,
          points: assignment.points,
          questions: assignment.questions || [],
          timestamp: (assignment.createdAt instanceof Date 
            ? assignment.createdAt 
            : typeof assignment.createdAt === 'string' 
              ? new Date(assignment.createdAt)
              : assignment.createdAt?.toDate?.() || new Date()),
          preview: assignment.description?.substring(0, 50) + '...' || assignment.type,
          createdAt: assignment.createdAt
        }));

        // Merge and sort by timestamp (newest first)
        const allItems = [...announcementItems, ...assignmentItems].sort((a, b) => 
          (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0)
        );
        setActivityFeed(allItems);
      } catch (err) {
        console.error('Error loading assignments for activity feed:', err);
        // Fallback to just announcements
        const feedItems = announcementData.map(announcement => ({
          id: announcement.id,
          type: 'announcement',
          title: announcement.title,
          message: announcement.message,
          author: announcement.author,
          authorId: announcement.authorId,
          authorAvatar: announcement.authorAvatar || null,
          attachments: announcement.attachments || [],
          timestamp: announcement.createdAt instanceof Date 
            ? announcement.createdAt 
            : new Date(announcement.createdAt),
          preview: announcement.message?.substring(0, 50) + '...' || 'Announcement',
          hasAttachments: (announcement.attachments || []).length > 0,
          createdAt: announcement.createdAt
        }));
        setActivityFeed(feedItems);
      }
    });

    return () => unsubscribe?.();
  }, [classData?.id]);

  // Load modules
  useEffect(() => {
    if (!classData?.id) return;

    const loadModulesData = async () => {
      try {
        setLoadingModules(true);
        const modulesData = await getModules(classData.id);
        setModules(modulesData || []);
      } catch (err) {
        console.error('Error loading modules:', err);
      } finally {
        setLoadingModules(false);
      }
    };

    loadModulesData();
  }, [classData?.id]);

  // Load assessments
  useEffect(() => {
    if (!classData?.id) return;

    const loadAssessmentsData = async () => {
      try {
        setLoadingAssessments(true);
        const assessmentsData = await getAssessments(classData.id);
        setAssessments(assessmentsData || []);
      } catch (err) {
        console.error('Error loading assessments:', err);
      } finally {
        setLoadingAssessments(false);
      }
    };

    loadAssessmentsData();
  }, [classData?.id]);

  // Load assignments
  useEffect(() => {
    if (!classData?.id) return;

    const loadAssignmentsData = async () => {
      try {
        const assignmentsData = await getAssignments(classData.id);
        setAssignments(assignmentsData || []);
      } catch (err) {
        console.error('Error loading assignments:', err);
      }
    };

    loadAssignmentsData();
  }, [classData?.id]);

  // Load materials
  useEffect(() => {
    if (!classData?.id) return;

    const loadMaterialsData = async () => {
      try {
        const materialsData = await getClassMaterials(classData.id);
        setMaterials(materialsData || []);
      } catch (err) {
        console.error('Error loading materials:', err);
      }
    };

    loadMaterialsData();
  }, [classData?.id]);

  // Load topics
  useEffect(() => {
    if (!classData?.id) return;

    const loadTopicsData = async () => {
      try {
        const topicsData = await getClassTopics(classData.id);
        setTopics(topicsData || []);
      } catch (err) {
        console.error('Error loading topics:', err);
      }
    };

    loadTopicsData();
  }, [classData?.id]);

  // Activity feed is now updated in real-time from announcements subscription
  // No need for separate loading

  // Handle save new item (Assignment/Material/Quiz with form builder)
  const handleSaveItem = async (e, mode = 'publish') => {
    e?.preventDefault?.();

    if (isSubmittingItem || isPublishingItem) return;

    if (!formBuilderTitle.trim()) {
      addToast('Title is required', 'error');
      return;
    }

    if (mode === 'publish' && !hasPublishableAssignmentQuestion) {
      addToast('Cannot publish with empty questions. Add at least one question text.', 'error');
      return;
    }

    if (mode === 'publish') {
      setIsPublishingItem(true);
    } else {
      setIsSubmittingItem(true);
    }

    try {
      let formattedDueDate = null;
      if (formBuilderDueDate) {
        const dueDate = new Date(formBuilderDueDate);
        // Cap at one year out (and reject nonsensical typed-in years).
        if (isNaN(dueDate.getTime()) || dueDate > getMaxDate()) {
          addToast('Please enter a due date within the next year.', 'error');
          setIsSubmittingItem(false);
          return;
        }
        dueDate.setHours(23, 59, 0, 0);
        formattedDueDate = dueDate.toISOString();
      }

      // Available-from date (when students can start). Defaults to now (open).
      let formattedAvailableDate = null;
      if (formBuilderAvailableDate) {
        const availableDate = new Date(formBuilderAvailableDate);
        if (isNaN(availableDate.getTime()) || availableDate > getMaxDate()) {
          addToast('Please enter an available date within the next year.', 'error');
          setIsSubmittingItem(false);
          return;
        }
        availableDate.setHours(0, 0, 0, 0);
        formattedAvailableDate = availableDate.toISOString();
      }

      // Available date must not be after the due date.
      if (formattedAvailableDate && formattedDueDate && formattedAvailableDate > formattedDueDate) {
        addToast('Available date cannot be after the due date.', 'error');
        setIsSubmittingItem(false);
        return;
      }

      if (isFormBuilderEditMode && editingAssignmentId) {
        const updatedAssignmentData = {
          title: formBuilderTitle.trim(),
          message: formBuilderDescription.trim(),
          description: formBuilderDescription.trim(),
          questions: formBuilderQuestions,
          availableDate: formattedAvailableDate,
          dueDate: formattedDueDate,
          points: parseInt(formBuilderPoints) || 100,
          lastModified: new Date().toISOString()
        };

        // Persist the edit to Firestore so it survives reloads and reaches students.
        await updateAssignment(classData.id, editingAssignmentId, {
          title: updatedAssignmentData.title,
          description: updatedAssignmentData.description,
          questions: updatedAssignmentData.questions,
          availableDate: formattedAvailableDate,
          dueDate: formattedDueDate,
          points: updatedAssignmentData.points,
        });

        setActivityFeed((prev) =>
          prev.map((item) =>
            item.id === editingAssignmentId ? { ...item, ...updatedAssignmentData } : item
          )
        );

        setAssignments((prev) =>
          prev.map((a) =>
            a.id === editingAssignmentId ? { ...a, ...updatedAssignmentData } : a
          )
        );

        if (selectedAssignmentDetail && selectedAssignmentDetail.id === editingAssignmentId) {
          setSelectedAssignmentDetail((prev) => ({ ...prev, ...updatedAssignmentData }));
        }

        addToast('Assignment updated successfully!', 'success');

        setFormBuilderTitle('');
        setFormBuilderDescription('');
        setFormBuilderQuestions([]);
        setFormBuilderAvailableDate('');
        setFormBuilderDueDate('');
        setFormBuilderPoints('100');
        setShowCreateModal(false);
        setCreateType('');
        setIsFormBuilderEditMode(false);
        setEditingAssignmentId(null);
      } else {
        const itemData = {
          title: formBuilderTitle.trim(),
          description: formBuilderDescription.trim(),
          type: createType,
          questions: formBuilderQuestions,
          availableDate: formattedAvailableDate,
          dueDate: formattedDueDate,
          points: parseInt(formBuilderPoints) || 100,
          createdBy: user?.displayName || user?.email || 'Trainor',
          createdById: user?.uid,
          status: mode === 'draft' ? 'draft' : 'active'
        };

        if (mode === 'publish' && !currentAssignmentDraftId) {
          addToast('Please save draft first before publishing', 'warning');
          return;
        }

        if (mode === 'draft') {
          if (currentAssignmentDraftId) {
            await updateAssignment(classData.id, currentAssignmentDraftId, {
              title: itemData.title,
              description: itemData.description,
              type: itemData.type,
              availableDate: itemData.availableDate,
              dueDate: itemData.dueDate,
              points: itemData.points,
              questions: itemData.questions,
              status: 'draft'
            });
          } else {
            const newAssignment = await createAssignment(classData.id, {
              title: itemData.title,
              description: itemData.description,
              type: itemData.type,
              author: itemData.createdBy,
              authorId: itemData.createdById,
              createdByAvatar: currentUserAvatar || null,
              availableDate: itemData.availableDate,
              dueDate: itemData.dueDate,
              points: itemData.points,
              questions: itemData.questions,
              status: 'draft'
            });

            setCurrentAssignmentDraftId(newAssignment.id);
          }

          addToast('Assignment draft saved. Add questions, then publish.', 'success');
          return;
        }

        await updateAssignment(classData.id, currentAssignmentDraftId, {
          title: itemData.title,
          description: itemData.description,
          type: itemData.type,
          availableDate: itemData.availableDate,
          dueDate: itemData.dueDate,
          points: itemData.points,
          questions: itemData.questions,
          status: 'active'
        });

        const updatedAssignments = await getAssignments(classData.id);
        setAssignments(updatedAssignments);

        addToast(`${createType} created successfully!`, 'success');

        setCurrentAssignmentDraftId(null);
        setFormBuilderTitle('');
        setFormBuilderDescription('');
        setFormBuilderQuestions([]);
        setFormBuilderAvailableDate('');
        setFormBuilderDueDate('');
        setFormBuilderPoints('100');
        setShowCreateModal(false);
        setCreateType('');
        setIsFormBuilderEditMode(false);
        setEditingAssignmentId(null);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      const action = isFormBuilderEditMode ? 'update' : mode === 'draft' ? 'save draft for' : 'publish';
      addToast(`Failed to ${action} ${createType}: ${error.message}`, 'error');
    } finally {
      setIsSubmittingItem(false);
      setIsPublishingItem(false);
    }
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    
    if (!materialTitle.trim()) {
      addToast('Material title is required', 'error');
      return;
    }

    setIsSavingMaterialDraft(true);
    try {
      const materialData = {
        title: materialTitle.trim(),
        description: materialDescription.trim(),
        link: materialLink.trim(),
        author: user?.displayName || user?.email || 'Trainor',
        authorId: user?.uid,
        attachments: [],
        filesBase64: [],
        topicId: selectedTopicId || null,
      };

      // If files selected, upload them
      if (materialFiles && materialFiles.length > 0) {
        try {
          for (const file of materialFiles) {
            const uploadedFile = await compressAndStoreFile(file, classData.id);
            // Store attachment metadata
            const attachmentData = {
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              url: uploadedFile.url,
              storagePath: uploadedFile.storagePath,
            };

            materialData.attachments.push(attachmentData);
          }
        } catch (fileErr) {
          console.error('Error processing files:', fileErr);
          addToast(`File processing failed: ${fileErr.message}`, 'error');
          setIsSavingMaterialDraft(false);
          return;
        }
      }

      // UPDATE MODE - Update existing material
      if (currentMaterialId) {
        // Get existing material to append files
        const existingMaterial = materials.find(m => m.id === currentMaterialId);
        const finalAttachments = existingMaterial?.attachments ? [...existingMaterial.attachments, ...materialData.attachments] : materialData.attachments;
        const finalFilesBase64 = existingMaterial?.filesBase64 ? [...existingMaterial.filesBase64, ...materialData.filesBase64] : materialData.filesBase64;

        await updateMaterial(classData.id, currentMaterialId, {
          title: materialData.title,
          description: materialData.description,
          link: materialData.link,
          attachments: finalAttachments,
          filesBase64: finalFilesBase64
        });

        setMaterials(prev => 
          prev.map(m => 
            m.id === currentMaterialId 
              ? { ...m, ...materialData, attachments: finalAttachments, filesBase64: finalFilesBase64 }
              : m
          )
        );

        addToast('Material updated successfully!', 'success');
        setMaterialFiles([]);
      } else {
        // CREATE MODE - Save as draft
        const savedMaterial = await createMaterial(classData.id, materialData);
        setCurrentMaterialId(savedMaterial.id);
        setMaterials(prev => [savedMaterial, ...prev]);

        addToast('Material saved as draft! Click "Publish" to make it visible to trainees.', 'success');
      }

      // Don't close modal - allow user to publish or continue editing
    } catch (error) {
      console.error('Error saving material:', error);
      addToast(`Failed to save material: ${error.message}`, 'error');
    } finally {
      setIsSavingMaterialDraft(false);
    }
  };

  const handlePublishMaterial = async () => {
    if (!currentMaterialId) {
      addToast('No material to publish', 'error');
      return;
    }

    setUploadingMaterial(true);
    try {
      await publishMaterial(classData.id, currentMaterialId);
      
      // Update materials list
      setMaterials(prev => 
        prev.map(m => 
          m.id === currentMaterialId 
            ? { ...m, isPublished: true, publishedAt: new Date().toISOString() }
            : m
        )
      );

      addToast('Material published successfully! Trainees can now see it.', 'success');

      // Close modal and reset form
      setShowCreateModal(false);
      setMaterialTitle('');
      setMaterialDescription('');
      setMaterialLink('');
      setMaterialFiles([]);
      setCreateType('');
      setCurrentMaterialId(null);
      setSelectedTopicId(null);
    } catch (error) {
      console.error('Error publishing material:', error);
      addToast(`Failed to publish material: ${error.message}`, 'error');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleUnpublishMaterial = async () => {
    if (!currentMaterialId) {
      addToast('No material to unpublish', 'error');
      return;
    }

    setUploadingMaterial(true);
    try {
      await unpublishMaterial(classData.id, currentMaterialId);
      
      // Update materials list
      setMaterials(prev => 
        prev.map(m => 
          m.id === currentMaterialId 
            ? { ...m, isPublished: false }
            : m
        )
      );

      addToast('Material unpublished. Trainees can no longer see it.', 'success');
    } catch (error) {
      console.error('Error unpublishing material:', error);
      addToast(`Failed to unpublish material: ${error.message}`, 'error');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleMaterialFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      setMaterialFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const handleMaterialFileDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    
    if (!topicTitle.trim()) {
      addToast('Topic title is required', 'error');
      return;
    }

    setSubmittingTopic(true);
    try {
      const topicData = {
        title: topicTitle.trim(),
        description: topicDescription.trim(),
        author: user?.displayName || user?.email || 'Trainor',
        authorId: user?.uid,
      };

      // CREATE MODE - Save as draft
      if (!selectedTopicId) {
        const savedTopic = await createTopic(classData.id, topicData);
        setTopics(prev => [savedTopic, ...prev]);
        addToast('Topic saved as draft! Click "Publish" to make it visible to trainees.', 'success');
      } else {
        // EDIT MODE - Update existing topic
        await updateTopic(classData.id, selectedTopicId, topicData);
        setTopics(prev =>
          prev.map(t =>
            t.id === selectedTopicId
              ? { ...t, ...topicData }
              : t
          )
        );
        addToast('Topic updated successfully!', 'success');
      }

      // Reset form
      setTopicTitle('');
      setTopicDescription('');
      setShowCreateModal(false);
      setCreateType('');
      setSelectedTopicId(null);
    } catch (error) {
      console.error('Error saving topic:', error);
      addToast(`Failed to save topic: ${error.message}`, 'error');
    } finally {
      setSubmittingTopic(false);
    }
  };

  const handlePublishTopic = async (topicId) => {
    try {
      setSubmittingTopic(true);
      await publishTopic(classData.id, topicId);
      
      setTopics(prev =>
        prev.map(t =>
          t.id === topicId
            ? { ...t, isPublished: true, publishedAt: new Date().toISOString() }
            : t
        )
      );

      addToast('Topic published successfully!', 'success');
    } catch (error) {
      console.error('Error publishing topic:', error);
      addToast(`Failed to publish topic: ${error.message}`, 'error');
    } finally {
      setSubmittingTopic(false);
    }
  };

  const handleUnpublishTopic = async (topicId) => {
    try {
      setSubmittingTopic(true);
      await unpublishTopic(classData.id, topicId);
      
      setTopics(prev =>
        prev.map(t =>
          t.id === topicId
            ? { ...t, isPublished: false }
            : t
        )
      );

      addToast('Topic unpublished. Trainees can no longer see it.', 'success');
    } catch (error) {
      console.error('Error unpublishing topic:', error);
      addToast(`Failed to unpublish topic: ${error.message}`, 'error');
    } finally {
      setSubmittingTopic(false);
    }
  };

  // Add question to form builder
  const addFormQuestion = (questionType) => {
    let newQuestion = {
      id: `fq_${Date.now()}`,
      type: questionType,
      question: '',
      required: false,
      points: 1,
      description: ''
    };

    // Add type-specific defaults
    switch(questionType) {
      case 'multiple-choice':
      case 'checkboxes':
      case 'dropdown':
        newQuestion.options = ['Option 1', 'Option 2'];
        newQuestion.correctAnswer = questionType === 'checkboxes' ? [] : 0;
        break;
      case 'linear-scale':
        newQuestion.scaleMin = 'Not satisfied';
        newQuestion.scaleMax = 'Very satisfied';
        newQuestion.scaleRange = 5;
        break;
      case 'multiple-grid':
      case 'checkbox-grid':
        newQuestion.rows = ['Row 1', 'Row 2'];
        newQuestion.columns = ['Column 1', 'Column 2'];
        break;
      default:
        break;
    }

    setFormBuilderQuestions([...formBuilderQuestions, newQuestion]);
  };

  // Delete question from form builder
  const deleteFormQuestion = (questionId) => {
    setFormBuilderQuestions(formBuilderQuestions.filter(q => q.id !== questionId));
  };

  // Update form builder question
  const updateFormQuestion = (questionId, field, value) => {
    setFormBuilderQuestions(
      formBuilderQuestions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    );
  };

  const hasPublishableAssignmentQuestion = formBuilderQuestions.some(
    (q) => (q?.question || '').trim().length > 0
  );

  // Add option to a question
  const addOptionToQuestion = (questionId) => {
    setFormBuilderQuestions(
      formBuilderQuestions.map(q => {
        if (q.id === questionId && q.options) {
          return { ...q, options: [...q.options, ''] };
        }
        return q;
      })
    );
  };

  // Update option in a question
  const updateOptionInQuestion = (questionId, optionIndex, value) => {
    setFormBuilderQuestions(
      formBuilderQuestions.map(q => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  // Remove option from a question
  const removeOptionFromQuestion = (questionId, optionIndex) => {
    setFormBuilderQuestions(
      formBuilderQuestions.map(q => {
        if (q.id === questionId && q.options) {
          const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  // Toggle edit mode for assignment detail

  // Update form builder modal header based on mode
  const getFormBuilderHeader = () => {
    if (isFormBuilderEditMode) {
      return {
        title: 'Edit Assignment',
        subtitle: 'Modify your assignment and make changes'
      };
    }
    return {
      title: 'Create Assignment',
      subtitle: 'Build your assignment with questions and customization'
    };
  };
  const handleCopyClassCode = () => {
    if (classData?.classCode) {
      navigator.clipboard.writeText(classData.classCode);
      addToast('Class code copied to clipboard!', 'success');
    }
  };

  const handleBackClick = () => {
    navigate('/trainer');
  };

  // Handle save announcement
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!modalAnnouncementText.trim()) {
      addToast('Announcement cannot be empty', 'error');
      return;
    }
    try {
      setUploadingAttachment(true);
      
      // Create announcement first
      const announcementData = {
        title: 'Announcement',
        message: modalAnnouncementText.trim(),
        author: user?.displayName || user?.email || 'Trainor',
        authorId: user?.uid,
        attachments: [],
        createdAt: new Date().toISOString()
      };
      
      const announcement = await createAnnouncement(classData.id, announcementData);
      
      // Upload files if any
      if (modalAnnouncementFiles.length > 0) {
        let successCount = 0;
        let failureCount = 0;
        
        for (const file of modalAnnouncementFiles) {
          try {
            await storeAnnouncementAttachment(classData.id, announcement.id, file);
            successCount++;
          } catch (fileErr) {
            failureCount++;
            console.error(`Error uploading file ${file.name}:`, fileErr);
            addToast(`Failed to upload ${file.name}: ${fileErr.message}`, 'error');
          }
        }
        
        if (successCount > 0) {
          addToast(`Announcement posted with ${successCount} file(s)!`, 'success');
        }
        if (failureCount > 0) {
          addToast(`${failureCount} file(s) failed to upload`, 'error');
        }
      } else {
        addToast('Announcement posted successfully!', 'success');
      }
      
      setShowAnnouncementModal(false);
      setModalAnnouncementText('');
      setModalAnnouncementFiles([]);
    } catch (error) {
      console.error('Error posting announcement:', error);
      addToast(`Failed to post announcement: ${error.message}`, 'error');
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Handle modal file input change
  const handleModalFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    // Validate file sizes (max 500KB per file - Firestore limit is 1MB document size)
    const validFiles = files.filter(file => {
      if (file.size > 500 * 1024) {
        addToast(`${file.name} is too large (max 500KB). File: ${(file.size / 1024).toFixed(0)}KB`, 'error');
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      setModalAnnouncementFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Handle drag and drop for modal
  const handleModalDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleModalDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    // Validate file sizes (max 500KB per file - Firestore limit is 1MB document size)
    const validFiles = files.filter(file => {
      if (file.size > 500 * 1024) {
        addToast(`${file.name} is too large (max 500KB). File: ${(file.size / 1024).toFixed(0)}KB`, 'error');
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      setModalAnnouncementFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Remove file from modal
  const removeModalFile = (index) => {
    setModalAnnouncementFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle inline announcement post
  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) {
      addToast('Announcement cannot be empty', 'error');
      return;
    }
    try {
      setUploadingAttachment(true);
      
      const announcementData = {
        title: '',
        message: announcementText.trim(),
        author: user?.displayName || user?.email || 'Trainor',
        authorId: user?.uid,
        authorAvatar: currentUserAvatar || null, // Use the pre-fetched avatar
        attachments: [],
        createdAt: new Date().toISOString()
      };
      
      // Create announcement first
      const announcement = await createAnnouncement(classData.id, announcementData);
      
      // If file selected, compress and upload
      if (announcementFile) {
        try {
          await storeAnnouncementAttachment(classData.id, announcement.id, announcementFile);
          addToast('Announcement posted with attachment!', 'success');
        } catch (fileErr) {
          console.error('Error uploading file:', fileErr);
          addToast('Announcement posted but file upload failed', 'warning');
        }
      } else {
        addToast('Announcement posted successfully!', 'success');
      }
      
      setAnnouncementText('');
      setAnnouncementFile(null);
    } catch (error) {
      console.error('Error posting announcement:', error);
      addToast('Failed to post announcement', 'error');
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Handle edit announcement
  const handleEditAnnouncement = async (announcementId, newMessage) => {
    if (!newMessage.trim()) {
      addToast('Announcement cannot be empty', 'error');
      return;
    }
    try {
      // Only update the text — leave the existing title and attachments intact
      // (passing attachments: [] here previously wiped them on every edit).
      await updateAnnouncement(classData.id, announcementId, {
        message: newMessage.trim(),
      });
      addToast('Announcement updated successfully!', 'success');
      setEditingAnnouncementId(null);
      setEditingAnnouncementText('');
    } catch (error) {
      console.error('Error updating announcement:', error);
      addToast('Failed to update announcement', 'error');
    }
  };

  // Handle delete announcement
  const handleDeleteAnnouncement = async (announcementId) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteAnnouncement(classData.id, announcementId);
        addToast('Announcement deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting announcement:', error);
        addToast('Failed to delete announcement', 'error');
      }
    }
  };

  // Handle open post detail
  const commentUnsubscribeRef = useRef(null);

  const handleOpenPost = async (post) => {
    try {
      setLoadingComments(true);
      setPostComments([]);
      
      // Unsubscribe from previous subscription if exists
      if (commentUnsubscribeRef.current) {
        commentUnsubscribeRef.current();
        commentUnsubscribeRef.current = null;
      }
      
      // Fetch complete announcement with attachments
      const announcementRef = doc(db, 'classes', classData.id, 'announcements', post.id);
      const announcementSnap = await getDoc(announcementRef);
      
      if (announcementSnap.exists()) {
        const announcementData = announcementSnap.data();
        const completePost = {
          id: announcementSnap.id,
          ...announcementData,
          attachments: announcementData.attachments || [],
          createdAt: announcementData.createdAt?.toDate?.() || new Date(announcementData.createdAt),
        };
        
        // Fetch author's profile picture
        if (completePost.authorId) {
          try {
            const authorProfile = await getUserProfile(completePost.authorId);
            completePost.authorAvatar = authorProfile?.avatarBase64 || authorProfile?.avatarUrl || null;
          } catch (error) {
            console.error('Error loading author avatar:', error);
          }
        }
        
        setSelectedPost(completePost);
        
        // Load comments initially, then set up live subscription
        try {
          const initialComments = await getAnnouncementComments(classData.id, post.id);
          
          // Fetch avatars for all comment authors
          const commentsWithAvatars = await Promise.all(
            (initialComments || []).map(async (comment) => {
              if (comment.authorId) {
                try {
                  const authorProfile = await getUserProfile(comment.authorId);
                  return {
                    ...comment,
                    authorAvatar: authorProfile?.avatarBase64 || authorProfile?.avatarUrl || null
                  };
                } catch (error) {
                  console.error('Error loading comment author avatar:', error);
                  return comment;
                }
              }
              return comment;
            })
          );
          
          setPostComments(commentsWithAvatars);
          setLoadingComments(false);
          
          // Now set up real-time subscription for live updates
          commentUnsubscribeRef.current = subscribeToComments(
            classData.id, 
            post.id, 
            async (comments) => {
              // Enrich new comments with avatars too
              const enrichedComments = await Promise.all(
                (comments || []).map(async (comment) => {
                  if (comment.authorId && !comment.authorAvatar) {
                    try {
                      const authorProfile = await getUserProfile(comment.authorId);
                      return {
                        ...comment,
                        authorAvatar: authorProfile?.avatarBase64 || authorProfile?.avatarUrl || null
                      };
                    } catch (error) {
                      console.error('Error loading comment author avatar:', error);
                      return comment;
                    }
                  }
                  return comment;
                })
              );
              setPostComments(enrichedComments);
            }
          );
        } catch (err) {
          console.error('Error loading comments:', err);
          setPostComments([]);
          setLoadingComments(false);
        }
      } else {
        setLoadingComments(false);
      }
      
      setShowPostModal(true);
    } catch (err) {
      console.error('Error opening post:', err);
      addToast('Failed to open post', 'error');
      setLoadingComments(false);
    }
  };

  // Cleanup subscription when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (commentUnsubscribeRef.current) {
        commentUnsubscribeRef.current();
        commentUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Format absolute time
  const formatAbsoluteTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    
    setSubmittingComment(true);
    try {
      await addCommentToAnnouncement(classData.id, selectedPost.id, {
        author: user?.displayName || user?.email || 'User',
        authorId: user?.uid,
        message: newComment.trim()
      });
      addToast('Comment added!', 'success');
      setNewComment('');
      
      // Reload comments with avatars
      const comments = await getAnnouncementComments(classData.id, selectedPost.id);
      const commentsWithAvatars = await Promise.all(
        (comments || []).map(async (comment) => {
          if (comment.authorId) {
            try {
              const authorProfile = await getUserProfile(comment.authorId);
              return {
                ...comment,
                authorAvatar: authorProfile?.avatarBase64 || authorProfile?.avatarUrl || null
              };
            } catch (error) {
              console.error('Error loading comment author avatar:', error);
              return comment;
            }
          }
          return comment;
        })
      );
      setPostComments(commentsWithAvatars);
    } catch (err) {
      console.error('Error adding comment:', err);
      addToast('Failed to add comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await deleteComment(classData.id, selectedPost.id, commentId);
        addToast('Comment deleted!', 'success');
        
        // Reload comments with avatars
        const comments = await getAnnouncementComments(classData.id, selectedPost.id);
        const commentsWithAvatars = await Promise.all(
          (comments || []).map(async (comment) => {
            if (comment.authorId) {
              try {
                const authorProfile = await getUserProfile(comment.authorId);
                return {
                  ...comment,
                  authorAvatar: authorProfile?.avatarBase64 || authorProfile?.avatarUrl || null
                };
              } catch (error) {
                console.error('Error loading comment author avatar:', error);
                return comment;
              }
            }
            return comment;
          })
        );
        setPostComments(commentsWithAvatars);
      } catch (err) {
        console.error('Error deleting comment:', err);
        addToast('Failed to delete comment', 'error');
      }
    }
  };

  // Handle download attachment
  const handleDownloadAttachment = (attachment) => {
    try {
      downloadAttachment(attachment);
      addToast('Download started!', 'success');
    } catch (err) {
      console.error('Error downloading:', err);
      addToast('Failed to download file', 'error');
    }
  };

  // Handle remove/kick student
  const handleRemoveStudent = async (enrollmentId, studentName) => {
    if (window.confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
      try {
        await removeEnrollment(enrollmentId);
        setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
        addToast(`${studentName} has been removed from the class`, 'success');
      } catch (err) {
        console.error('Error removing student:', err);
        addToast('Failed to remove trainee', 'error');
      }
    }
  };

  // Open the "add existing trainee" picker and lazy-load the student directory.
  const openAddTrainee = async () => {
    setShowAddTraineeModal(true);
    setStudentSearch('');
    if (allStudents.length === 0) {
      setLoadingStudents(true);
      try {
        const studs = await getStudents();
        setAllStudents(studs || []);
      } catch (err) {
        console.error('Error loading students:', err);
        addToast('Unable to load the trainee directory.', 'error');
      } finally {
        setLoadingStudents(false);
      }
    }
  };

  const handleAddTrainee = async (student) => {
    if (!classData?.id) return;
    setAddingStudentId(student.id);
    try {
      const enrollment = await adminAddStudentToClass(
        classData.id,
        {
          id: student.id,
          name: student.name || student.displayName || student.email,
          email: student.email,
        },
        {
          name: classData.name,
          trainerId: classData.trainerId,
          trainerName: classData.trainerName || user?.displayName || '',
          courseId: classData.courseId,
          level: classData.level,
        }
      );
      setEnrollments((prev) => [...prev, enrollment]);
      addToast(`${enrollment.studentName || 'Trainee'} added to the class.`, 'success');
    } catch (err) {
      addToast(err.message || 'Unable to add trainee.', 'error');
    } finally {
      setAddingStudentId(null);
    }
  };

  // ---- Co-trainers & ownership (lead-only actions) ----
  const isLead = classData?.trainerId === user?.uid;
  const coTrainerIds = Array.isArray(classData?.coTrainerIds) ? classData.coTrainerIds : [];

  const ensureTrainersLoaded = async () => {
    if (allTrainers.length > 0) return;
    try {
      const list = await getTrainers();
      setAllTrainers(list || []);
    } catch (err) {
      console.error('Error loading trainers:', err);
      addToast('Unable to load the trainer directory.', 'error');
    }
  };

  const trainerLabel = (id) => {
    const t = allTrainers.find((x) => x.id === id);
    return t?.name || t?.displayName || t?.email || 'Trainer';
  };

  const openAddCoTrainer = async () => {
    await ensureTrainersLoaded();
    setShowAddCoTrainerModal(true);
  };

  const openTransfer = async () => {
    await ensureTrainersLoaded();
    setShowTransferModal(true);
  };

  const handleAddCoTrainer = async (trainerId) => {
    setCoTrainerBusy(true);
    try {
      await addCoTrainer(classData.id, trainerId);
      setClassData((prev) => ({ ...prev, coTrainerIds: [...(prev.coTrainerIds || []), trainerId] }));
      addToast('Co-trainer added.', 'success');
      setShowAddCoTrainerModal(false);
    } catch (err) {
      addToast(err.message || 'Unable to add co-trainer.', 'error');
    } finally {
      setCoTrainerBusy(false);
    }
  };

  const handleRemoveCoTrainer = async (trainerId) => {
    if (!window.confirm(`Remove ${trainerLabel(trainerId)} as a co-trainer?`)) return;
    setCoTrainerBusy(true);
    try {
      await removeCoTrainer(classData.id, trainerId);
      setClassData((prev) => ({ ...prev, coTrainerIds: (prev.coTrainerIds || []).filter((id) => id !== trainerId) }));
      addToast('Co-trainer removed.', 'success');
    } catch (err) {
      addToast(err.message || 'Unable to remove co-trainer.', 'error');
    } finally {
      setCoTrainerBusy(false);
    }
  };

  const handleTransferOwnership = async (newLeadId) => {
    if (!window.confirm(`Transfer lead ownership to ${trainerLabel(newLeadId)}? You will become a co-trainer.`)) return;
    setCoTrainerBusy(true);
    try {
      await transferClassOwnership(classData.id, newLeadId);
      setClassData((prev) => {
        const oldLead = prev.trainerId;
        const nextCo = (prev.coTrainerIds || []).filter((id) => id && id !== newLeadId);
        if (oldLead && !nextCo.includes(oldLead)) nextCo.push(oldLead);
        return { ...prev, trainerId: newLeadId, coTrainerIds: nextCo };
      });
      addToast('Ownership transferred.', 'success');
      setShowTransferModal(false);
    } catch (err) {
      addToast(err.message || 'Unable to transfer ownership.', 'error');
    } finally {
      setCoTrainerBusy(false);
    }
  };

  // Preload the trainer directory so lead/co-trainer names render in the panel.
  useEffect(() => {
    if (classData?.id) ensureTrainersLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData?.id]);

  // Handle mark student as graduated
  const handleGraduateStudent = async (enrollmentId, studentName) => {
    if (window.confirm(`Mark ${studentName} as graduated? Their enrollment will be archived as completed.`)) {
      try {
        await updateEnrollmentStatus(enrollmentId, 'completed');
        
        // Update the enrollment in state with new status
        setEnrollments(enrollments.map(e => 
          e.id === enrollmentId ? { ...e, status: 'completed' } : e
        ));
        
        addToast(`${studentName} has been marked as graduated.`, 'success');
      } catch (err) {
        console.error('Error graduating student:', err);
        addToast('Failed to mark trainee as graduated', 'error');
      }
    }
  };

  // Approve a pending class-join request (pending -> active).
  const handleApproveJoin = async (enrollment) => {
    try {
      await approveEnrollment(enrollment.id, {
        studentId: enrollment.studentId,
        className: classData?.name,
      });
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollment.id ? { ...e, status: 'active', joinedAt: new Date().toISOString() } : e))
      );
      addToast(`${enrollment.studentName || 'Trainee'} approved and added to the class.`, 'success');
    } catch (err) {
      console.error('Error approving join request:', err);
      addToast('Failed to approve request', 'error');
    }
  };

  // Reject a pending class-join request (removes the enrollment).
  const handleRejectJoin = async (enrollment) => {
    if (!window.confirm(`Decline ${enrollment.studentName || 'this student'}'s request to join?`)) return;
    try {
      await removeEnrollment(enrollment.id);
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollment.id));
      addToast('Join request declined.', 'info');
    } catch (err) {
      console.error('Error rejecting join request:', err);
      addToast('Failed to decline request', 'error');
    }
  };

  // Handle preview attachment
  const handlePreviewAttachment = (attachment) => {
    // Check if file is an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const pdfExtensions = ['.pdf'];
    const fileExtension = attachment.name.toLowerCase().slice(attachment.name.lastIndexOf('.'));
    
    if (imageExtensions.includes(fileExtension)) {
      setSelectedAttachment(attachment);
      setShowAttachmentPreview(true);
    } else if (pdfExtensions.includes(fileExtension)) {
      // For PDFs, also preview if possible, otherwise download
      setSelectedAttachment(attachment);
      setShowAttachmentPreview(true);
    } else {
      // For other file types, just download
      handleDownloadAttachment(attachment);
    }
  };

  // Copy the class join code to the clipboard
  const copyClassCode = () => {
    const code = classData?.classCode || '';
    if (!code) {
      addToast('No class code available yet.', 'error');
      return;
    }
    try {
      navigator.clipboard?.writeText(code);
      addToast('Class code copied to clipboard!');
    } catch {
      addToast('Unable to copy. Class code: ' + code, 'error');
    }
  };

  // Handle invite students
  const handleInviteStudents = (e) => {
    e.preventDefault();
    addToast('Invitation sent successfully!');
    setShowInviteModal(false);
  };

  // ---- Submission-type assignments (trainer) ----
  const loadItemSubmissions = async (item) => {
    if (!classData?.id || item?.type !== 'Submission') {
      setItemSubmissions([]);
      return;
    }
    try {
      const subs = await getAssignmentSubmissions(classData.id, item.id);
      setItemSubmissions(subs);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setItemSubmissions([]);
    }
  };

  const openAssessmentResponses = async (assessment) => {
    if (!assessment) return;
    setSelectedAssessmentForResponses(assessment);
    setAssessmentSection('responses');
    setActiveTab('assessments');
    setLoadingResponses(true);
    setItemSubmissions([]);
    setAssessmentResponses([]);
    setGradingStudentId(null);
    try {
      if (!classData?.id) return;
      if (assessment.type === 'Submission') {
        await loadItemSubmissions(assessment);
      } else {
        const responses = await getAssessmentAttempts(classData.id, assessment.id);
        setAssessmentResponses(responses || []);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
      addToast('Error loading responses', 'error');
    } finally {
      setLoadingResponses(false);
    }
  };

  const startGrading = (submission) => {
    setGradingStudentId(submission.studentId);
    setGradeInput(submission.grade ?? '');
    setFeedbackInput(submission.feedback || '');
  };

  const handleSaveGrade = async (submission) => {
    if (!classData?.id || !selectedAssessmentForResponses) return;
    setSavingGrade(true);
    try {
      await gradeSubmission(classData.id, selectedAssessmentForResponses.id, submission.studentId, {
        grade: gradeInput,
        feedback: feedbackInput,
        gradedBy: user?.uid || '',
        assignmentTitle: selectedAssessmentForResponses.title || '',
      });
      addToast('Grade saved.', 'success');
      setGradingStudentId(null);
      await loadItemSubmissions(selectedAssessmentForResponses);
    } catch (error) {
      addToast(error.message || 'Unable to save grade.', 'error');
    } finally {
      setSavingGrade(false);
    }
  };

  const handleCreateSubmissionTask = async (publish = false) => {
    if (!classData?.id) return;
    if (!newTaskTitle.trim()) {
      addToast('Give the task a title.', 'error');
      return;
    }
    if (!newTaskDesc.trim()) {
      // Submission tasks have no questions, so the instructions ARE the prompt.
      addToast('Add instructions so trainees know what to submit.', 'error');
      return;
    }
    if (newTaskUploadTypes.length === 0) {
      addToast('Pick at least one allowed submission type.', 'error');
      return;
    }
    if (newTaskDue) {
      const parsedDue = new Date(newTaskDue);
      if (isNaN(parsedDue.getTime()) || parsedDue > getMaxDate()) {
        addToast('Please enter a due date within the next year.', 'error');
        return;
      }
    }
    setCreatingTask(true);
    try {
      await createAssignment(classData.id, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        type: 'Submission',
        author: user?.displayName || user?.email || 'Trainor',
        authorId: user?.uid,
        dueDate: newTaskDue || null,
        points: parseInt(newTaskPoints, 10) || 100,
        questions: [],
        allowedUploadTypes: newTaskUploadTypes,
        topicId: selectedTopicId || null,
        // Draft = kept for later (hidden from trainees); Active = published.
        status: publish ? 'active' : 'draft',
      });
      const updated = await getAssignments(classData.id);
      setAssignments(updated);
      setShowNewTaskModal(false);
      setSelectedTopicId(null);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskDue('');
      setNewTaskPoints('100');
      setNewTaskUploadTypes(['text', 'file']);
      addToast(publish ? 'Submission task published.' : 'Submission task saved as draft.', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to create task.', 'error');
    } finally {
      setCreatingTask(false);
    }
  };

  // Publish a draft assessment/assignment (task) so trainees can see it.
  const handlePublishAssessmentItem = async (item) => {
    if (!classData?.id || !item?.id) return;
    try {
      if (item._source === 'assessment') {
        await updateAssessment(classData.id, item.id, { status: 'active' });
        setAssessments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: 'active' } : a)));
      } else {
        await updateAssignment(classData.id, item.id, { status: 'active' });
        setAssignments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: 'active' } : a)));
      }
      addToast('Published — trainees can now see it.', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to publish.', 'error');
    }
  };

  const UPLOAD_TYPE_OPTIONS = [
    { id: 'link', label: 'Valid link (URL)' },
    { id: 'pdf', label: 'PDF' },
    { id: 'image', label: 'Image' },
    { id: 'file', label: 'Any file' },
    { id: 'text', label: 'Text answer' },
  ];
  const toggleTaskUploadType = (id) => {
    setNewTaskUploadTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const loadGradebook = async () => {
    if (!classData?.id) return;
    setLoadingGradebook(true);
    try {
      const gb = await getClassGradebook(classData.id);
      setGradebook(gb);
    } catch (error) {
      console.error('Error loading gradebook:', error);
      addToast('Unable to load gradebook.', 'error');
    } finally {
      setLoadingGradebook(false);
    }
  };

  const exportGradebookCsv = () => {
    if (!gradebook) return;
    const header = ['Trainee', ...gradebook.columns.map((c) => c.title), 'Average'];
    const lines = [header.join(',')];
    gradebook.rows.forEach((row) => {
      const cells = row.cells.map((c) => (c.score === null || c.score === undefined ? '' : c.score));
      const escapedName = `"${String(row.studentName).replace(/"/g, '""')}"`;
      lines.push([escapedName, ...cells, row.average ?? ''].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gradebook-${classData?.name || 'class'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Handle Google Meet
  const handleStartMeeting = async () => {
    try {
      // Generate a random meeting ID
      const meetingId = 'qqi-nwwk-txb';
      const link = `https://meet.google.com/qqi-nwwk-txb`;
      setMeetingLink(link);
      
      const trainerName = user?.displayName || courseData?.trainer || 'Trainor';
      
      const meetingData = {
        id: meetingId,
        link: link,
        startTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        host: trainerName
      };
      
      setActiveMeeting(meetingData);
      
      // Write to Firestore 'classes' collection to sync with students
      if (classData?.id) {
        const classRef = doc(db, 'classes', classData.id);
        await updateDoc(classRef, {
          'meeting.isActive': true,
          'meeting.meetingCode': meetingId,
          'meeting.meetingLink': link,
          'meeting.trainerName': trainerName,
          'meeting.startTime': new Date(),
          'meeting.participants': 1
        });
      } else {
        addToast('Error: Class data not loaded', 'error');
        return;
      }
      
      setShowMeetingModal(true);
    } catch (error) {
      console.error('Error starting meeting:', error);
      addToast('Error starting meeting', 'error');
    }
  };

  // Handle create item
  const handleCreateItem = (type) => {
    setCreateType(type);
    setShowCreateDropdown(false);
    if (type === 'Quiz Assignment') {
      setShowQuizModal(true);
      setAssessmentType('quiz');
      setQuizQuestions([]);
      setCurrentQuizDraftId(null);
      setCurrentQuizStatus('draft');
      setQuizTitle('');
      setQuizDescription('');
      setQuizHasTimeLimit(false);
      setQuizTimeLimit('');
      setQuizPoints('100');
      setQuizPassingScore('60');
      setQuizAvailableDate('');
      setQuizDueDate('');
      setAssessmentSettings({
        shuffleQuestions: false,
        shuffleAnswers: false,
        showScore: true,
        showCorrectAnswers: true,
        allowReview: true,
        randomizeQuestionOrder: false,
        requiredQuestionsOnly: false,
        oneResponsePerUser: false,
        customColor: '#3b82f6'
      });
    } else if (type === 'material') {
      // Reset material form state for new material
      setMaterialTitle('');
      setMaterialDescription('');
      setMaterialLink('');
      setMaterialFiles([]);
      setCurrentMaterialId(null);
      setShowCreateModal(true);
    } else {
      // Reset form builder state to clear previous data
      setFormBuilderTitle('');
      setFormBuilderDescription('');
      setFormBuilderQuestions([]);
      setCurrentAssignmentDraftId(null);
      setFormBuilderAvailableDate('');
      setFormBuilderDueDate('');
      setFormBuilderPoints('100');
      setIsFormBuilderEditMode(false);
      setEditingAssignmentId(null);
      setShowCreateModal(true);
    }
  };

  // Quiz/Assessment Functions
  const openAssessmentEditor = (assessment) => {
    if (!assessment?.id || assessment._source !== 'assessment') return;

    const toDateInputValue = (value) => {
      if (!value) return '';
      const date = value?.toDate ? value.toDate() : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const pad = (part) => String(part).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    const timeLimit = Number(assessment.timeLimit || assessment.duration || 0);
    setCurrentQuizDraftId(assessment.id);
    setCurrentQuizStatus(String(assessment.status || 'active'));
    setAssessmentType(assessment.type || 'quiz');
    setQuizTitle(assessment.title || '');
    setQuizDescription(assessment.description || '');
    setQuizHasTimeLimit(timeLimit > 0);
    setQuizTimeLimit(timeLimit > 0 ? String(timeLimit) : '');
    setQuizPoints(String(assessment.totalPoints || 100));
    setQuizPassingScore(String(assessment.passingScore ?? 60));
    setQuizAvailableDate(toDateInputValue(assessment.availableDate));
    setQuizDueDate(toDateInputValue(assessment.dueDate));
    setQuizQuestions(assessment.questions || []);
    setAssessmentSettings((prev) => ({ ...prev, ...(assessment.settings || {}) }));
    setShowQuizModal(true);
  };

  const validatedQuizTimeLimit = () => {
    if (!quizHasTimeLimit) return null;
    const minutes = Number(quizTimeLimit);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) {
      addToast('Time limit must be a whole number from 1 to 480 minutes.', 'error');
      return undefined;
    }
    return minutes;
  };

  const validatedPassingScore = () => {
    const score = Number(quizPassingScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      addToast('Passing score must be from 0 to 100 percent.', 'error');
      return undefined;
    }
    return score;
  };

  const addQuestion = () => {
    let newQuestion = {
      id: `q_${Date.now()}`,
      type: currentQuestionType,
      question: '',
      required: false,
      points: 1,
      description: ''
    };

    // Add type-specific defaults
    switch(currentQuestionType) {
      case 'multiple-choice':
      case 'checkbox':
      case 'dropdown':
        newQuestion.options = ['', ''];
        newQuestion.correctAnswer = currentQuestionType === 'checkbox' ? [] : 0;
        break;
      case 'true-false':
        newQuestion.options = ['True', 'False'];
        newQuestion.correctAnswer = 0;
        break;
      case 'short-answer':
      case 'paragraph':
        newQuestion.correctAnswer = '';
        break;
      case 'linear-scale':
        newQuestion.correctAnswer = Math.ceil(5/2);
        newQuestion.scaleMin = 'Not satisfied';
        newQuestion.scaleMax = 'Very satisfied';
        newQuestion.scaleRange = 5;
        break;
      case 'multiple-grid':
        newQuestion.rows = ['Row 1', 'Row 2'];
        newQuestion.columns = ['Column 1', 'Column 2'];
        newQuestion.correctAnswer = {};
        break;
      default:
        newQuestion.options = [''];
    }

    setQuizQuestions([...quizQuestions, newQuestion]);
  };

  const deleteQuestion = (questionId) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== questionId));
  };

  const updateQuestion = (questionId, field, value) => {
    setQuizQuestions(quizQuestions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const addOption = (questionId) => {
    setQuizQuestions(quizQuestions.map(q => 
      q.id === questionId ? { ...q, options: [...q.options, ''] } : q
    ));
  };

  const removeOption = (questionId, optionIndex) => {
    setQuizQuestions(quizQuestions.map(q => 
      q.id === questionId ? { ...q, options: q.options.filter((_, idx) => idx !== optionIndex) } : q
    ));
  };

  const updateOption = (questionId, optionIndex, value) => {
    setQuizQuestions(quizQuestions.map(q => 
      q.id === questionId ? { 
        ...q, 
        options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) 
      } : q
    ));
  };

  const handleSaveQuizDraft = async () => {
    // Prevent duplicate submissions
    if (isSubmittingQuiz || isPublishingQuiz) return;
    
    if (!quizTitle.trim()) {
      addToast('Please enter a quiz title', 'error');
      return;
    }

    const timeLimit = validatedQuizTimeLimit();
    if (timeLimit === undefined) return;
    const passingScore = validatedPassingScore();
    if (passingScore === undefined) return;

    setIsSubmittingQuiz(true);
    try {
      const quizData = {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        type: assessmentType,
        timeLimit,
        totalPoints: parseInt(quizPoints) || 100,
        passingScore,
        questions: quizQuestions,
        settings: assessmentSettings,
        availableDate: quizAvailableDate ? new Date(new Date(quizAvailableDate).setHours(0, 0, 0, 0)).toISOString() : null,
        dueDate: quizDueDate ? new Date(new Date(quizDueDate).setHours(23, 59, 0, 0)).toISOString() : null,
        author: user?.displayName || 'Trainor',
        authorId: user?.uid,
        createdByAvatar: null,
        status: currentQuizDraftId ? currentQuizStatus : 'draft'
      };

      if (currentQuizDraftId) {
        await updateAssessment(classData.id, currentQuizDraftId, quizData);
        setAssessments(await getAssessments(classData.id));
        addToast(currentQuizStatus === 'draft' ? 'Assessment draft updated' : 'Assessment updated', 'success');
      } else {
        // Place it in the section it was created from (if any), then refresh the
        // list so it shows in the Modules organiser / Assessments tab.
        const newDraft = await createAssessment(classData.id, { ...quizData, topicId: selectedTopicId || null });
        setCurrentQuizDraftId(newDraft.id);
        setSelectedTopicId(null);
        try { setAssessments(await getAssessments(classData.id)); } catch { /* ignore */ }
        addToast('Assessment draft saved. Add questions, then publish.', 'success');
      }
    } catch (error) {
      console.error('Error saving assessment draft:', error);
      addToast(`Failed to save draft: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handlePublishQuiz = async () => {
    if (isPublishingQuiz || isSubmittingQuiz) return;

    if (!quizTitle.trim()) {
      addToast('Please enter a quiz title', 'error');
      return;
    }

    if (quizQuestions.length === 0) {
      addToast('Cannot publish assessment without questions', 'error');
      return;
    }

    const timeLimit = validatedQuizTimeLimit();
    if (timeLimit === undefined) return;
    const passingScore = validatedPassingScore();
    if (passingScore === undefined) return;

    if (!currentQuizDraftId) {
      addToast('Please save draft first before publishing', 'warning');
      return;
    }

    setIsPublishingQuiz(true);
    try {
      await updateAssessment(classData.id, currentQuizDraftId, {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        type: assessmentType,
        timeLimit,
        totalPoints: parseInt(quizPoints) || 100,
        passingScore,
        questions: quizQuestions,
        settings: assessmentSettings,
        availableDate: quizAvailableDate ? new Date(new Date(quizAvailableDate).setHours(0, 0, 0, 0)).toISOString() : null,
        dueDate: quizDueDate ? new Date(new Date(quizDueDate).setHours(23, 59, 0, 0)).toISOString() : null,
        status: 'active'
      });

      const updatedAssessments = await getAssessments(classData.id);
      setAssessments(updatedAssessments || []);

      addToast(`${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} published successfully!`, 'success');

      setShowQuizModal(false);
      setCurrentQuizDraftId(null);
      setCurrentQuizStatus('draft');
      setQuizTitle('');
      setQuizDescription('');
      setQuizHasTimeLimit(false);
      setQuizTimeLimit('');
      setQuizPoints('100');
      setQuizPassingScore('60');
      setQuizAvailableDate('');
      setQuizDueDate('');
      setQuizQuestions([]);
      setCurrentQuestionType('multiple-choice');
      setAssessmentType('quiz');
    } catch (error) {
      console.error('Error publishing assessment:', error);
      addToast(`Failed to publish ${assessmentType}: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsPublishingQuiz(false);
    }
  };

  const updateAssessmentSetting = (key, value) => {
    setAssessmentSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleJoinMeeting = () => {
    if (activeMeeting) {
      window.open(activeMeeting.link, '_blank');
    }
  };

  const handleEndMeeting = async () => {
    try {
      setActiveMeeting(null);
      setMeetingLink('');
      
      // Update Firestore 'classes' collection to notify students
      if (classData?.id) {
        const classRef = doc(db, 'classes', classData.id);
        await updateDoc(classRef, {
          'meeting.isActive': false
        });
      }
      
      addToast('Meeting ended');
    } catch (error) {
      console.error('Error ending meeting:', error);
      addToast('Error ending meeting', 'error');
    }
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(activeMeeting?.link || meetingLink);
    addToast('Meeting link copied!');
  };

  // Load the gradebook when the Grades tab is opened.
  // Must stay above the early returns below to keep hook order stable.
  useEffect(() => {
    if (activeTab === 'assessments' && assessmentSection === 'grades' && classData?.id) {
      loadGradebook();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, assessmentSection, classData?.id]);

  // Load engagement logs when the Logs tab is opened.
  const loadClassActivity = async () => {
    if (!classData?.id) return;
    setLoadingActivity(true);
    try {
      const events = await getClassActivity(classData.id);
      setClassActivity(events || []);
    } catch {
      setClassActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs' && classData?.id) {
      loadClassActivity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, classData?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertCircle className="w-6 h-6 text-red-600 mb-3" />
        <h2 className="text-lg font-bold text-red-900 mb-2">Error</h2>
        <p className="text-red-700 mb-4">{error || 'Class not found'}</p>
        <button
          onClick={() => navigate('/trainer')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Back to Classes
        </button>
      </div>
    );
  }

  // ---- Modules drag-and-drop (organise items into topics; reorder topics) ----
  // Topics in their persisted order (fallback to creation time for older topics).
  const orderedTopics = [...topics].sort((a, b) => {
    const ao = a.order ?? 9999;
    const bo = b.order ?? 9999;
    if (ao !== bo) return ao - bo;
    const at = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const bt = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return at - bt;
  });

  // All draggable module items tagged with their kind, so materials, assessments
  // and tasks can all be dropped into topics.
  const allModuleItems = [
    ...materials.map((m) => ({ kind: 'material', item: m })),
    ...assessments.map((a) => ({ kind: 'assessment', item: a })),
    ...assignments.map((a) => ({ kind: 'assignment', item: a })),
  ];
  const moduleItemsFor = (topicId) =>
    allModuleItems.filter(({ item }) => (topicId ? item.topicId === topicId : !item.topicId));

  const onItemDragStart = (kind, id) => (e) => {
    dragItemRef.current = { kind, id };
    dragTopicRef.current = null;
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };
  const onTopicDragStart = (topicId) => (e) => {
    dragTopicRef.current = topicId;
    dragItemRef.current = null;
    e.dataTransfer.effectAllowed = 'move';
  };

  const moveItemToTopic = async (kind, id, topicId) => {
    // Optimistic update, then persist.
    const patch = (arr, setArr) => setArr(arr.map((x) => (x.id === id ? { ...x, topicId: topicId || null } : x)));
    if (kind === 'material') patch(materials, setMaterials);
    else if (kind === 'assessment') patch(assessments, setAssessments);
    else if (kind === 'assignment') patch(assignments, setAssignments);
    try {
      await setModuleItemTopic(classData.id, kind, id, topicId || null);
    } catch {
      addToast('Could not move item. Refresh and try again.', 'error');
    }
  };

  const reorderTopicBefore = (draggedId, targetId) => {
    const ids = orderedTopics.map((t) => t.id);
    const from = ids.indexOf(draggedId);
    if (from === -1) return;
    ids.splice(from, 1);
    const insertAt = targetId ? ids.indexOf(targetId) : ids.length;
    ids.splice(insertAt < 0 ? ids.length : insertAt, 0, draggedId);
    // Optimistic order, then persist.
    setTopics((prev) => prev.map((t) => ({ ...t, order: ids.indexOf(t.id) })));
    reorderTopics(classData.id, ids).catch(() => addToast('Could not save the new order.', 'error'));
  };

  const moveTopicByOffset = (topicId, offset) => {
    const ids = orderedTopics.map((topic) => topic.id);
    const currentIndex = ids.indexOf(topicId);
    const nextIndex = currentIndex + offset;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
    [ids[currentIndex], ids[nextIndex]] = [ids[nextIndex], ids[currentIndex]];
    setTopics((prev) => prev.map((topic) => ({ ...topic, order: ids.indexOf(topic.id) })));
    reorderTopics(classData.id, ids).catch(() => addToast('Could not save the new order.', 'error'));
  };

  const onTopicDrop = (topic) => (e) => {
    e.preventDefault();
    setDragOverTopicId(null);
    if (dragItemRef.current) {
      const { kind, id } = dragItemRef.current;
      dragItemRef.current = null;
      moveItemToTopic(kind, id, topic.id);
    } else if (dragTopicRef.current && dragTopicRef.current !== topic.id) {
      const draggedId = dragTopicRef.current;
      dragTopicRef.current = null;
      reorderTopicBefore(draggedId, topic.id);
    }
  };
  const onUnassignedDrop = (e) => {
    e.preventDefault();
    setDragOverUnassigned(false);
    if (dragItemRef.current) {
      const { kind, id } = dragItemRef.current;
      dragItemRef.current = null;
      moveItemToTopic(kind, id, null);
    }
  };

  // Is a module item currently visible to trainees?
  const isModuleItemPublished = (kind, item) =>
    kind === 'material' ? item.isPublished === true : String(item.status || 'active') !== 'draft';

  // Toggle a material / assessment / task between published and draft.
  const toggleModuleItemPublished = async (kind, item) => {
    const publishNow = !isModuleItemPublished(kind, item);
    try {
      if (kind === 'material') {
        if (publishNow) await publishMaterial(classData.id, item.id);
        else await unpublishMaterial(classData.id, item.id);
        setMaterials((prev) => prev.map((m) => (m.id === item.id ? { ...m, isPublished: publishNow, publishedAt: publishNow ? new Date().toISOString() : m.publishedAt } : m)));
      } else if (kind === 'assessment') {
        await updateAssessment(classData.id, item.id, { status: publishNow ? 'active' : 'draft' });
        setAssessments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: publishNow ? 'active' : 'draft' } : a)));
      } else {
        await updateAssignment(classData.id, item.id, { status: publishNow ? 'active' : 'draft' });
        setAssignments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: publishNow ? 'active' : 'draft' } : a)));
      }
      addToast(publishNow ? 'Published — visible to trainees.' : 'Unpublished — hidden from trainees.', 'success');
    } catch {
      addToast('Could not update visibility.', 'error');
    }
  };

  // Icon + label for a module item by kind.
  const MODULE_ITEM_ICON = { material: Upload, assessment: ClipboardList, assignment: FileText };
  const moduleItemKindLabel = (kind, item) =>
    kind === 'material' ? 'Material' : kind === 'assessment' ? (item.type || 'Assessment') : (item.type === 'Submission' ? 'Task' : 'Assignment');

  // A single draggable item row used inside topics and the unassigned tray.
  const renderModuleItemRow = (kind, item) => {
    const Icon = MODULE_ITEM_ICON[kind] || FileText;
    const isDraft = String(item.status || (kind === 'material' ? (item.isPublished ? 'active' : 'draft') : 'active')) === 'draft'
      || (kind === 'material' && item.isPublished === false);
    return (
      <div
        key={`${kind}-${item.id}`}
        draggable
        onDragStart={onItemDragStart(kind, item.id)}
        className="group flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-white p-3 transition-all hover:border-blue-200 hover:shadow-sm sm:flex-nowrap sm:gap-3 sm:cursor-move"
      >
        <GripVertical className="hidden w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 sm:block" />
        <div className="p-1.5 rounded-lg bg-gray-50 flex-shrink-0">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => {
            if (kind === 'material') {
              setSelectedMaterialForView(item);
              setShowMaterialViewModal(true);
            } else {
              openAssessmentResponses(item);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{item.title}</p>
            <span className="text-[10px] uppercase tracking-wide text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 flex-shrink-0">{moduleItemKindLabel(kind, item)}</span>
            {isDraft && <span className="text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 flex-shrink-0">Draft</span>}
          </div>
          {item.description && <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>}
        </div>
        <div className="flex w-full flex-shrink-0 items-center justify-end gap-1 border-t border-gray-100 pt-2 sm:w-auto sm:border-0 sm:pt-0">
          <button
            onClick={() => toggleModuleItemPublished(kind, item)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              isModuleItemPublished(kind, item)
                ? 'text-orange-600 hover:bg-orange-50'
                : 'text-green-700 bg-green-50 hover:bg-green-100'
            }`}
            title={isModuleItemPublished(kind, item) ? 'Unpublish (hide from trainees)' : 'Publish (show to trainees)'}
          >
            {isModuleItemPublished(kind, item) ? 'Unpublish' : 'Publish'}
          </button>
          {kind === 'material' && (
            <button
              className="p-1.5 hover:bg-blue-50 rounded text-blue-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              onClick={() => {
                setMaterialTitle(item.title);
                setMaterialDescription(item.description || '');
                setMaterialLink(item.link || '');
                setMaterialFiles([]);
                setCurrentMaterialId(item.id);
                setCreateType('material');
                setShowCreateModal(true);
              }}
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={async () => {
              if (!window.confirm(`Delete "${item.title}"?`)) return;
              try {
                if (kind === 'material') { await deleteMaterial(classData.id, item.id); setMaterials((p) => p.filter((x) => x.id !== item.id)); }
                else if (kind === 'assessment') { await deleteAssessment(classData.id, item.id); setAssessments((p) => p.filter((x) => x.id !== item.id)); }
                else { await deleteAssignment(classData.id, item.id); setAssignments((p) => p.filter((x) => x.id !== item.id)); }
                addToast('Deleted.', 'success');
              } catch {
                addToast('Failed to delete.', 'error');
              }
            }}
            className="p-1.5 hover:bg-red-50 rounded text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="order-last w-full sm:hidden">
          <label htmlFor={`move-${kind}-${item.id}`} className="sr-only">Move {item.title} to section</label>
          <select
            id={`move-${kind}-${item.id}`}
            value={item.topicId || ''}
            onChange={(event) => moveItemToTopic(kind, item.id, event.target.value || null)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
          >
            <option value="">Move to: Unassigned</option>
            {orderedTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>Move to: {topic.title}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'modules', label: 'Modules', icon: FileText },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'students', label: 'People', icon: Users },
    { id: 'logs', label: 'Logs', icon: Clock },
  ];

  const actions = [
    { icon: Share2, label: 'Post Announcement', desc: 'Share with class' },
    { icon: FileText, label: 'Create Assessment', desc: 'Add quiz or task' },
    { icon: FileText, label: 'Upload Material', desc: 'Share resources' },
    { icon: Video, label: 'Start Google Meet', desc: 'Begin live session' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex gap-4 overflow-x-auto px-4 sm:gap-8 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'assessments') setAssessmentSection('assessments');
                }}
                className={`shrink-0 whitespace-nowrap py-4 px-0 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        {/* Overview Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Course Header Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-orange-400 to-pink-600 rounded-full blur-3xl" />
              </div>

              <div className="relative">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Course Info */}
                  <div className="flex-1">
                    <div className="flex items-end gap-4 mb-6">
                      <div>
                        <h1 className="text-3xl font-bold">{classData.name}</h1>
                        <p className="text-white/70">{courseData?.description || classData.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className='flex gap-2'>
                        <div className="flex items-center gap-2">
                          <span className="text-white/80">{user?.displayName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Users className="w-4 h-4" />
                        <span>{enrollments.length} trainees enrolled</span>
                      </div>
                    </div>
                  </div>

                  {/* Right - Quick Info */}
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                      <p className="text-2xl font-bold">{materials?.length || 0}</p>
                      <p className="text-xs text-white/70">Materials</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                      <p className="text-2xl font-bold">{(assessments?.length || 0) + (assignments?.length || 0)}</p>
                      <p className="text-xs text-white/70">Assessments</p>
                    </div>
                    <div className="bg-orange-500 rounded-xl px-4 py-3 text-center">
                      <p className="text-sm font-bold">{sectorName}</p>
                      <p className="text-xs text-white/80">SECTOR</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button 
                onClick={() => setShowAnnouncementModal(true)}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <MessageSquare className="w-5 h-5 text-blue-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Post Announcement</p>
                  <p className="text-xs text-gray-500">Share with class</p>
                </div>
              </button>

              <button 
                onClick={() => handleCreateItem('assignment')}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group"
              >
                <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-500 transition-colors">
                  <ClipboardList className="w-5 h-5 text-emerald-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Create Assessment</p>
                  <p className="text-xs text-gray-500">Add quiz or task</p>
                </div>
              </button>

              <button 
                onClick={() => handleCreateItem('material')}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/10 transition-all group"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-500 transition-colors">
                  <FileText className="w-5 h-5 text-purple-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Upload Material</p>
                  <p className="text-xs text-gray-500">Share resources</p>
                </div>
              </button>

              <button 
                onClick={handleStartMeeting}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/10 transition-all group"
              >
                <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-500 transition-colors">
                  <Video className="w-5 h-5 text-red-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Start Google Meet</p>
                  <p className="text-xs text-gray-500">Begin live session</p>
                </div>
              </button>
            </div>

            {/* Active Meeting Banner */}
            {activeMeeting && (
              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        Live Meeting in Progress
                      </p>
                      <p className="text-sm text-white/80">Started at {activeMeeting.startTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={copyMeetingLink}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                    <button
                      onClick={handleJoinMeeting}
                      className="px-4 py-2 bg-white text-red-600 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/90 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Join Meeting
                    </button>
                    <button
                      onClick={handleEndMeeting}
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg text-sm font-medium transition-colors"
                    >
                      End Meeting
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Class Code Card */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl text-white max-w-xs">
              <div className="flex-1">
                <p className="text-sm text-white/70">Class Code</p>
                <p className="text-xl font-bold font-mono">{classData.classCode}</p>
              </div>
              <button
                onClick={handleCopyClassCode}
                className="bg-white text-slate-900 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                title="Copy class code"
              >
                <Copy className="w-6 h-6" />
              </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Feed - Timeline Style */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-gray-900 text-lg">Recent Activity</h2>
                    <span className="text-sm text-gray-500">{activityFeed.length} {activityFeed.length === 1 ? 'update' : 'updates'}</span>
                  </div>
                  {/* Class and Course Info Badge */}
                  {courseData && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-2">
                        <span>📚</span>
                        <span>{decodedClassName}</span>
                      </div>
                      {sectorName && sectorName !== 'N/A' && (
                        <div className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-2">
                          <span>🏢</span>
                          <span>{sectorName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline Announcement Composer */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex gap-3">
                    {currentUserAvatar ? (
                      <img 
                        src={currentUserAvatar} 
                        alt={user?.displayName || 'User'}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(user?.displayName || user?.email || 'Trainor').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <input 
                        type="text"
                        placeholder="Share something with your class..."
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      {announcementText && (
                        <div className="flex justify-between items-center mt-3">
                          <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors">
                            <input 
                              type="file" 
                              onChange={(e) => setAnnouncementFile(e.target.files?.[0] || null)}
                              className="hidden"
                              disabled={uploadingAttachment}
                            />
                            <Paperclip className="w-4 h-4" />
                            <span className="text-xs">{announcementFile ? 'File selected' : 'Add file'}</span>
                          </label>
                          <button 
                            onClick={handlePostAnnouncement}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            disabled={!announcementText.trim() || uploadingAttachment}
                          >
                            <Send className="w-4 h-4" />
                            {uploadingAttachment ? 'Uploading...' : 'Post'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Announcements & Assignments List - Activity Feed Timeline */}
                <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
                  {loadingAnnouncements ? (
                    <div className="p-5 text-center">
                      <div className="inline-block animate-spin">
                        <div className="w-6 h-6 border-3 border-gray-300 border-t-blue-600 rounded-full"></div>
                      </div>
                      <p className="text-gray-500 mt-2 text-sm">Loading activity...</p>
                    </div>
                  ) : activityFeed.length > 0 ? (
                    activityFeed.map((item) => {
                      // Calculate relative time
                      const getRelativeTime = (date) => {
                        if (!date) return 'unknown';
                        let dateObj = date;
                        if (date.toDate && typeof date.toDate === 'function') {
                          try {
                            dateObj = date.toDate();
                          } catch (e) {
                            return 'unknown';
                          }
                        } else if (typeof date === 'string') {
                          dateObj = new Date(date);
                        } else if (typeof date === 'object' && date.seconds) {
                          dateObj = new Date(date.seconds * 1000);
                        } else if (!(date instanceof Date)) {
                          dateObj = new Date(date);
                        }
                        if (isNaN(dateObj.getTime())) {
                          return 'unknown';
                        }
                        const now = new Date();
                        const diffMs = now - dateObj;
                        if (diffMs < 0) return 'just now';
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);
                        const diffWeeks = Math.floor(diffDays / 7);
                        if (diffMins < 1) return 'just now';
                        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                        if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
                        return dateObj.toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                          year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
                        });
                      };

                      // Handle announcements
                      if (item.type === 'announcement') {
                        return (
                          <div 
                            key={item.id}
                            className="p-5 hover:bg-gray-50 transition-colors group border-l-4 border-transparent hover:border-orange-400"
                          >
                            {editingAnnouncementId === item.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editingAnnouncementText}
                                  onChange={(e) => setEditingAnnouncementText(e.target.value)}
                                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                  placeholder="Edit announcement..."
                                  rows="3"
                                />
                                {Array.isArray(item.attachments) && item.attachments.length > 0 && (
                                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    <p className="text-xs font-medium text-gray-500 mb-2">
                                      {item.attachments.length} attachment{item.attachments.length === 1 ? '' : 's'} — kept when you save
                                    </p>
                                    <div className="space-y-1">
                                      {item.attachments.map((att, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                          <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                          <span className="truncate">{att.name || att.fileName || att.title || `Attachment ${idx + 1}`}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditAnnouncement(item.id, editingAnnouncementText)}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingAnnouncementId(null);
                                      setEditingAnnouncementText('');
                                    }}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => handleOpenPost(item)}
                                className="flex gap-4 cursor-pointer justify-between items-start"
                              >
                                {/* Avatar with Icon Badge - Make clickable */}
                                <div className="relative flex-shrink-0">
                                  {item.authorAvatar ? (
                                    <img 
                                      src={item.authorAvatar} 
                                      alt={item.author || 'Trainor'}
                                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                      {(item.author || 'Trainor').split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                  )}
                                  <div className="absolute -bottom-0 -right-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 border-2 border-white shadow-sm">
                                    <Megaphone className="w-3 h-3" />
                                  </div>
                                </div>

                                {/* Content - Make clickable */}
                                <div className="flex-1 min-w-0">
                                  {/* Author & Action */}
                                  <div className="mb-1">
                                    <span className="font-semibold text-gray-900">{item.author || 'Trainor'}</span>
                                    <span className="text-gray-600 ml-1">made an announcement:</span>
                                  </div>

                                  {/* Title/Message - Show as the announcement content */}
                                  <p className="text-gray-900 font-medium mb-2 text-sm line-clamp-2">
                                    {item.title || (item.message?.length > 100 
                                      ? item.message.substring(0, 100) + '...' 
                                      : item.message)}
                                  </p>

                                  {/* Timestamp & Attachments */}
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {getRelativeTime(item.createdAt)}
                                    </span>
                                    {item.attachments && item.attachments.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Paperclip className="w-3 h-3" />
                                        {item.attachments.length} file{item.attachments.length !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPost(item);
                                    }}
                                    className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                                    title="View full announcement"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingAnnouncementId(item.id);
                                      setEditingAnnouncementText(item.message);
                                    }}
                                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                                    title="Edit your announcement"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAnnouncement(item.id);
                                    }}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                                    title="Delete announcement"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      // Handle assignments
                      else if (item.type === 'assignment') {
                        return (
                          <div 
                            key={item.id}
                            className="p-5 hover:bg-gray-50 transition-colors group border-l-4 border-transparent hover:border-purple-400"
                          >
                            <div className="flex gap-4 justify-between items-start cursor-pointer" onClick={() => {
                              setSelectedAssignmentDetail(item);
                              setAssignmentDetailTab('questions');
                              setShowAssignmentDetailModal(true);
                            }}>
                              {/* Avatar with Icon Badge */}
                              <div className="relative flex-shrink-0">
                                {item.authorAvatar ? (
                                  <img 
                                    src={item.authorAvatar} 
                                    alt={item.author || 'Trainor'}
                                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {(item.author || 'Trainor').split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </div>
                                )}
                                <div className="absolute -bottom-0 -right-0 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 border-2 border-white shadow-sm">
                                  <FileText className="w-3 h-3" />
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {/* Author & Action */}
                                <div className="mb-1">
                                  <span className="font-semibold text-gray-900">{item.author || 'Trainor'}</span>
                                  <span className="text-gray-600 ml-1">posted an assignment</span>
                                </div>

                                {/* Title */}
                                <p className="text-gray-900 font-medium mb-2 text-sm">
                                  {item.title}
                                </p>

                                {/* Assignment Details */}
                                <div className="flex items-center gap-3 text-xs mb-1">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                                    {item.preview}
                                  </span>
                                  {item.points && (
                                    <span className="text-gray-600">
                                      {item.points} points
                                    </span>
                                  )}
                                </div>

                                {/* Timestamp & Due Date */}
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {getRelativeTime(item.createdAt)}
                                  </span>
                                  {item.dueDate && (
                                    <span className="text-orange-600 font-medium">
                                      Due: {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* View Button */}
                              <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAssignmentDetail(item);
                                    setAssignmentDetailTab('questions');
                                    setShowAssignmentDetailModal(true);
                                  }}
                                  className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600"
                                  title="View assignment"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })
                  ) : (
                    <div className="p-8 text-center">
                      <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No activity yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Upcoming Deadlines */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Upcoming Deadlines</h3>
                  </div>
                  <div className="p-5">
                    {assignments.filter(a => a.dueDate && new Date(a.dueDate) > new Date()).length > 0 ? (
                      <div className="space-y-3">
                        {assignments
                          .filter(a => a.dueDate && new Date(a.dueDate) > new Date())
                          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                          .slice(0, 5)
                          .map(assignment => (
                            <div key={assignment.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No upcoming deadlines</p>
                        <p className="text-gray-400 text-xs mt-1">All caught up!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-8">
            <div className="mb-6 flex flex-col items-stretch gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-bold text-gray-900">Modules</h3>
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto sm:rounded-full sm:px-6"
                >
                  <Plus className="w-5 h-5" />
                  Add Content
                </button>

                {/* Create Dropdown Menu */}
                {showCreateDropdown && (
                  <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg sm:left-auto sm:w-64">
                    <div className="p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3 px-3">CREATE NEW</p>
                      
                      {/* Topic Option */}
                      <button
                        onClick={() => {
                          setCreateType('topic');
                          setShowCreateDropdown(false);
                          setShowCreateModal(true);
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Topic</p>
                          <p className="text-xs text-gray-600">New section</p>
                        </div>
                      </button>
                      
                      {/* Materials Option */}
                      <button
                        onClick={() => {
                          setSelectedTopicId(null);
                          setMaterialTitle('');
                          setMaterialDescription('');
                          setMaterialLink('');
                          setMaterialFiles([]);
                          setCurrentMaterialId(null);
                          setCreateType('material');
                          setShowCreateDropdown(false);
                          setShowCreateModal(true);
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left mb-2"
                      >
                        <Upload className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Materials</p>
                          <p className="text-xs text-gray-600">Learning resource {'·'} draft until published</p>
                        </div>
                      </button>

                      {/* Assessment Option */}
                      <button
                        onClick={() => {
                          setSelectedTopicId(null);
                          setShowCreateDropdown(false);
                          handleCreateItem('Quiz Assignment');
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left mb-2"
                      >
                        <ClipboardList className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Assessment</p>
                          <p className="text-xs text-gray-600">Quiz / survey / form {'·'} draft or publish</p>
                        </div>
                      </button>

                      {/* Task Option */}
                      <button
                        onClick={() => {
                          setSelectedTopicId(null);
                          setShowCreateDropdown(false);
                          setNewTaskTitle('');
                          setNewTaskDesc('');
                          setNewTaskDue('');
                          setNewTaskPoints('100');
                          setNewTaskUploadTypes(['text', 'file']);
                          setShowNewTaskModal(true);
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Task</p>
                          <p className="text-xs text-gray-600">Trainees upload work {'·'} you set upload types</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modules organiser — drag items into sections, drag the handle to reorder sections */}
            {orderedTopics.length === 0 && allModuleItems.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No modules yet. Create your first module to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Drag a material, assessment, or task onto a section to organise it. Drag the handle on a section to reorder sections.
                </p>

                {/* Sections (topics) with their items */}
                {orderedTopics.map((topic) => {
                  const topicItems = moduleItemsFor(topic.id);
                  const isExpanded = expandedTopics[topic.id] !== false; // default expanded
                  return (
                    <div
                      key={topic.id}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTopicId(topic.id); }}
                      onDragLeave={() => setDragOverTopicId((cur) => (cur === topic.id ? null : cur))}
                      onDrop={onTopicDrop(topic)}
                      className={`border rounded-lg overflow-hidden transition-colors ${dragOverTopicId === topic.id ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-100' : 'border-blue-200 bg-blue-50'}`}
                    >
                      {/* Section header */}
                      <div className="p-3 sm:p-4">
                        <div className="flex items-start gap-2">
                          <span
                            draggable
                            onDragStart={onTopicDragStart(topic.id)}
                            className="hidden cursor-grab flex-shrink-0 text-blue-400 hover:text-blue-600 active:cursor-grabbing sm:inline-flex"
                            title="Drag to reorder section"
                          >
                            <GripVertical className="w-5 h-5" />
                          </span>
                          <button
                            onClick={() => setExpandedTopics(prev => ({ ...prev, [topic.id]: !prev[topic.id] }))}
                            className="flex min-w-0 flex-1 items-start gap-2 text-left sm:items-center sm:gap-3"
                          >
                            <div className="flex-shrink-0 rounded-lg bg-blue-200 p-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="min-w-0 max-w-full truncate text-base font-semibold text-blue-900 sm:text-lg">{topic.title}</h4>
                                <span className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium ${topic.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {topic.isPublished ? 'Published' : 'Draft'}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-blue-700 sm:text-sm">
                                {topicItems.length} {topicItems.length === 1 ? 'item' : 'items'}
                                {topic.description ? ` · ${topic.description}` : ''}
                              </p>
                            </div>
                            <span className="flex-shrink-0 p-1 text-blue-600">{isExpanded ? '▼' : '▶'}</span>
                          </button>
                          {/* Desktop section actions */}
                          <div className="hidden flex-shrink-0 items-center gap-1 sm:flex">
                            <button
                              onClick={() => {
                                setTopicTitle(topic.title);
                                setTopicDescription(topic.description || '');
                                setSelectedTopicId(topic.id);
                                setCreateType('topic');
                                setShowCreateModal(true);
                              }}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                              title="Edit section"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!topic.isPublished ? (
                              <button
                                onClick={() => handlePublishTopic(topic.id)}
                                disabled={submittingTopic}
                                className="px-3 py-2 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnpublishTopic(topic.id)}
                                disabled={submittingTopic}
                                className="px-3 py-2 text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Unpublish
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this section? Its items are kept and moved to Unassigned.')) {
                                  try {
                                    await deleteTopic(classData.id, topic.id);
                                    setTopics(prev => prev.filter(t => t.id !== topic.id));
                                    addToast('Section deleted.', 'success');
                                  } catch {
                                    addToast('Failed to delete section', 'error');
                                  }
                                }
                              }}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                              title="Delete section"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Touch-safe alternatives to desktop drag and hover controls. */}
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
                          <button
                            type="button"
                            onClick={() => moveTopicByOffset(topic.id, -1)}
                            disabled={orderedTopics[0]?.id === topic.id}
                            className="min-h-11 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-40"
                          >
                            ↑ Move up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTopicByOffset(topic.id, 1)}
                            disabled={orderedTopics[orderedTopics.length - 1]?.id === topic.id}
                            className="min-h-11 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-40"
                          >
                            ↓ Move down
                          </button>
                          <button
                            onClick={() => {
                              setTopicTitle(topic.title);
                              setTopicDescription(topic.description || '');
                              setSelectedTopicId(topic.id);
                              setCreateType('topic');
                              setShowCreateModal(true);
                            }}
                            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                          {!topic.isPublished ? (
                            <button
                              onClick={() => handlePublishTopic(topic.id)}
                              disabled={submittingTopic}
                              className="min-h-11 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 disabled:opacity-50"
                            >
                              Publish
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnpublishTopic(topic.id)}
                              disabled={submittingTopic}
                              className="min-h-11 rounded-lg bg-orange-100 px-3 py-2 text-sm font-medium text-orange-700 disabled:opacity-50"
                            >
                              Unpublish
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (window.confirm('Delete this section? Its items are kept and moved to Unassigned.')) {
                                try {
                                  await deleteTopic(classData.id, topic.id);
                                  setTopics(prev => prev.filter(t => t.id !== topic.id));
                                  addToast('Section deleted.', 'success');
                                } catch {
                                  addToast('Failed to delete section', 'error');
                                }
                              }
                            }}
                            className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                          >
                            <Trash2 className="w-4 h-4" /> Delete section
                          </button>
                        </div>
                      </div>

                      {/* Section items (drop zone) */}
                      {isExpanded && (
                        <div className="border-t border-blue-200 bg-white p-3 space-y-2 min-h-[3.5rem]">
                          {topicItems.length === 0 ? (
                            <p className="text-sm text-blue-500 text-center py-4">Drop materials, assessments, or tasks here</p>
                          ) : (
                            topicItems.map(({ kind, item }) => renderModuleItemRow(kind, item))
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <button
                              onClick={() => {
                                setMaterialTitle('');
                                setMaterialDescription('');
                                setMaterialLink('');
                                setMaterialFiles([]);
                                setCurrentMaterialId(null);
                                setCreateType('material');
                                setSelectedTopicId(topic.id);
                                setShowCreateModal(true);
                              }}
                              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center gap-1 py-2 border border-dashed border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" /> Material
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTopicId(topic.id);
                                handleCreateItem('Quiz Assignment');
                              }}
                              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center justify-center gap-1 py-2 border border-dashed border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" /> Assessment
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTopicId(topic.id);
                                setNewTaskTitle('');
                                setNewTaskDesc('');
                                setNewTaskDue('');
                                setNewTaskPoints('100');
                                setNewTaskUploadTypes(['text', 'file']);
                                setShowNewTaskModal(true);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 py-2 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" /> Task
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned tray (drop here to remove an item from a section) */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOverUnassigned(true); }}
                  onDragLeave={() => setDragOverUnassigned(false)}
                  onDrop={onUnassignedDrop}
                  className={`border rounded-lg p-3 transition-colors ${dragOverUnassigned ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50' : 'border-dashed border-gray-300 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h4 className="text-sm font-semibold text-gray-600">Unassigned</h4>
                    <span className="text-xs text-gray-400">{moduleItemsFor(null).length} item{moduleItemsFor(null).length === 1 ? '' : 's'}</span>
                  </div>
                  {moduleItemsFor(null).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No unassigned items. Drag an item here to remove it from a section.</p>
                  ) : (
                    <div className="space-y-2">
                      {moduleItemsFor(null).map(({ kind, item }) => renderModuleItemRow(kind, item))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Material View Modal */}
        {showMaterialViewModal && selectedMaterialForView && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl animate-slide-up my-8 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedMaterialForView.title}</h2>
                    <p className="text-gray-600 text-sm mt-1">By {selectedMaterialForView.author}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowMaterialViewModal(false);
                      setSelectedMaterialForView(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Description */}
                {selectedMaterialForView.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedMaterialForView.description}</p>
                  </div>
                )}

                {/* Link */}
                {selectedMaterialForView.link && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Link</h3>
                    <a
                      href={selectedMaterialForView.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline break-all"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      {selectedMaterialForView.link}
                    </a>
                  </div>
                )}

                {/* Files Section */}
                {selectedMaterialForView.attachments && selectedMaterialForView.attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Files ({selectedMaterialForView.attachments.length})</h3>
                    <div className="space-y-2">
                      {selectedMaterialForView.attachments.map((attachment, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4 p-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {(() => {
                                const fileName = attachment.name || '';
                                const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                
                                if (['pdf'].includes(ext)) return <FileText className="w-6 h-6 text-red-600" />;
                                if (['doc', 'docx'].includes(ext)) return <FileText className="w-6 h-6 text-blue-600" />;
                                if (['xls', 'xlsx'].includes(ext)) return <FileText className="w-6 h-6 text-green-600" />;
                                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FileText className="w-6 h-6 text-purple-600" />;
                                return <Paperclip className="w-6 h-6 text-gray-600" />;
                              })()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{attachment.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span>
                                  {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                                </span>
                                {attachment.uploadedAt && (
                                  <>
                                    <span>•</span>
                                    <span>Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {attachment.url && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  Open
                                </a>
                                <a
                                  href={attachment.url}
                                  download={attachment.name}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </a>
                              </div>
                            )}
                            {selectedMaterialForView.filesBase64 && selectedMaterialForView.filesBase64[idx] && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {(() => {
                                  const fileName = attachment.name || '';
                                  const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                  const isPreviewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                  
                                  return isPreviewable ? (
                                    <button
                                      onClick={() => {
                                        setPreviewFile({...attachment, fileBase64: selectedMaterialForView.filesBase64[idx]});
                                        setShowFilePreview(true);
                                      }}
                                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                                      title="Preview file"
                                    >
                                      <Eye className="w-4 h-4" />
                                      Preview
                                    </button>
                                  ) : null;
                                })()}
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = `data:${attachment.type || 'application/octet-stream'};base64,${selectedMaterialForView.filesBase64[idx]}`;
                                    link.download = attachment.name;
                                    link.click();
                                  }}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-gray-600">Published Date</p>
                      <p className="font-medium text-gray-900">
                        {selectedMaterialForView.publishedAt ? (() => {
                          try {
                            let date;
                            if (typeof selectedMaterialForView.publishedAt === 'string') {
                              date = new Date(selectedMaterialForView.publishedAt);
                            } else if (selectedMaterialForView.publishedAt.toDate) {
                              date = selectedMaterialForView.publishedAt.toDate();
                            } else if (typeof selectedMaterialForView.publishedAt === 'number') {
                              date = new Date(selectedMaterialForView.publishedAt);
                            } else {
                              return 'N/A';
                            }
                            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                          } catch {
                            return 'N/A';
                          }
                        })() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className={`font-medium ${selectedMaterialForView.isPublished ? 'text-green-600' : 'text-amber-600'}`}>
                        {selectedMaterialForView.isPublished ? 'Published' : 'Draft (unpublished)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 flex items-center justify-end gap-3 flex-shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setShowMaterialViewModal(false);
                    setSelectedMaterialForView(null);
                    setMaterialTitle(selectedMaterialForView.title);
                    setMaterialDescription(selectedMaterialForView.description || '');
                    setMaterialLink(selectedMaterialForView.link || '');
                    setMaterialFiles([]);
                    setCurrentMaterialId(selectedMaterialForView.id);
                    setCreateType('material');
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowMaterialViewModal(false);
                    setSelectedMaterialForView(null);
                  }}
                  className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File Preview Modal */}
        {showFilePreview && previewFile && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-[95vw] h-[95vh] shadow-2xl flex flex-col">
              {/* Header */}
              <div className="px-8 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900">{previewFile.name}</h2>
                <button 
                  onClick={() => {
                    setShowFilePreview(false);
                    setPreviewFile(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto flex items-center justify-center bg-gray-50 p-8">
                {(() => {
                  if (!previewFile) return null;
                  
                  const fileBase64 = previewFile.fileBase64 || '';
                  if (!fileBase64) return <p className="text-gray-600">No file data available</p>;
                  
                  const fileName = previewFile.name || '';
                  const ext = fileName.split('.').pop()?.toLowerCase() || '';
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                  const isPdf = ['pdf'].includes(ext);
                  
                  if (isImage) {
                    return (
                      <img 
                        src={`data:${previewFile.type || 'image/*'};base64,${fileBase64}`}
                        alt={previewFile.name}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    );
                  } else if (isPdf) {
                    return (
                      <iframe
                        src={`data:application/pdf;base64,${fileBase64}`}
                        className="w-full h-full rounded-lg border-0"
                        title={previewFile.name}
                      />
                    );
                  } else {
                    return (
                      <div className="text-center">
                        <Paperclip className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium mb-2">Preview not available</p>
                        <p className="text-gray-500 text-sm">This file type cannot be previewed directly</p>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `data:${previewFile.type || 'application/octet-stream'};base64,${fileBase64}`;
                            link.download = previewFile.name;
                            link.click();
                          }}
                          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Instead
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    const fileBase64 = previewFile.fileBase64 || '';
                    const link = document.createElement('a');
                    link.href = `data:${previewFile.type || 'application/octet-stream'};base64,${fileBase64}`;
                    link.download = previewFile.name;
                    link.click();
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowFilePreview(false);
                    setPreviewFile(null);
                  }}
                  className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* People Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 shadow-sm">
                <p className="text-white/70 text-sm">Total Participants</p>
                <div className="mt-2 text-4xl font-bold">
                  {enrollments.filter((enrollment) => enrollment.status !== 'pending').length + 1 + coTrainerIds.length}
                </div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
                  <Users className="w-4 h-4" />
                  Class members
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                <p className="text-gray-500 text-sm">Trainors</p>
                <div className="mt-2 text-4xl font-bold text-gray-900">{1 + coTrainerIds.length}</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2 text-sm text-purple-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">T</span>
                  {coTrainerIds.length > 0 ? `Lead + ${coTrainerIds.length} co-trainer${coTrainerIds.length > 1 ? 's' : ''}` : 'Lead trainer'}
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                <p className="text-gray-500 text-sm">Active Trainees</p>
                <div className="mt-2 text-4xl font-bold text-gray-900">
                  {enrollments.filter((enrollment) => !['completed', 'pending'].includes(enrollment.status)).length}
                </div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <Users className="w-4 h-4" />
                  Currently enrolled
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                <p className="text-gray-500 text-sm">Graduated</p>
                <div className="mt-2 text-4xl font-bold text-gray-900">{enrollments.filter(e => e.status === 'completed').length}</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  <Award className="w-4 h-4" />
                  Certificates issued
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 shadow-sm">
                <p className="text-white/70 text-sm">Class Code</p>
                <div className="mt-2 text-2xl font-bold font-mono tracking-wider">{classData?.classCode || 'N/A'}</div>
                <button
                  onClick={handleCopyClassCode}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-2 text-sm font-medium transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>

            {/* One role-annotated roster for everyone with class access. */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    People ({enrollments.filter((enrollment) => enrollment.status !== 'pending').length + 1 + coTrainerIds.length})
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Lead trainer, co-trainers, and trainees with access to this class.</p>
                </div>
                {isLead && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={openAddCoTrainer}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Co-trainer
                    </button>
                    <button
                      onClick={openTransfer}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Transfer Ownership
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {/* Lead */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50/50 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold flex-shrink-0">
                      {(trainerLabel(classData?.trainerId)[0] || 'T').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {trainerLabel(classData?.trainerId)}
                        {classData?.trainerId === user?.uid ? ' (You)' : ''}
                      </p>
                      <p className="text-xs text-gray-500">Lead trainer</p>
                    </div>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-purple-100 text-purple-700 px-2.5 py-1 text-xs font-medium">Lead</span>
                </div>
                {/* Co-trainers */}
                {coTrainerIds.length === 0 ? (
                  <p className="text-sm text-gray-400 px-1 py-2">No co-trainers yet.</p>
                ) : (
                  coTrainerIds.map((id) => (
                    <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold flex-shrink-0">
                          {(trainerLabel(id)[0] || 'T').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {trainerLabel(id)}{id === user?.uid ? ' (You)' : ''}
                          </p>
                          <p className="text-xs text-gray-500">Co-trainer</p>
                        </div>
                      </div>
                      {isLead && (
                        <button
                          onClick={() => handleRemoveCoTrainer(id)}
                          disabled={coTrainerBusy}
                          className="flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Trainees ({enrollments.filter((e) => e.status !== 'pending').length})</h3>
                    <p className="text-sm text-gray-500 mt-1">All trainees including graduates</p>
                  </div>
                  <button
                    onClick={openAddTrainee}
                    className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Trainee
                  </button>
                </div>

                <div className="p-5">
                  {/* Pending join requests awaiting approval */}
                  {enrollments.filter((e) => e.status === 'pending').length > 0 && (
                    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Pending requests ({enrollments.filter((e) => e.status === 'pending').length})
                      </h4>
                      <div className="space-y-2">
                        {enrollments.filter((e) => e.status === 'pending').map((enrollment) => {
                          const displayName = enrollment.studentName || enrollment.name || 'Trainee';
                          const email = enrollment.studentEmail || enrollment.email || 'N/A';
                          return (
                            <div key={enrollment.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-amber-100 p-3">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{displayName}</p>
                                <p className="text-xs text-gray-500 truncate">{email}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleApproveJoin(enrollment)}
                                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors flex items-center gap-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectJoin(enrollment)}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {enrollments.filter((e) => e.status !== 'pending').length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-10 text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Users className="w-10 h-10" />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900">Add Your First Trainee</h4>
                      <p className="mx-auto mt-3 max-w-md text-gray-500">
                        Share the class code or send email invitations to get students enrolled.
                      </p>
                      <div className="mt-6 flex flex-col gap-3">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <p className="text-sm text-gray-600 mb-2">Class Code:</p>
                          <p className="text-2xl font-bold font-mono text-gray-900 mb-3">{classData?.classCode || 'N/A'}</p>
                          <button
                            onClick={handleCopyClassCode}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Code
                          </button>
                        </div>
                        <button
                          onClick={() => setShowInviteModal(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Send Invite
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                      {enrollments.filter((e) => e.status !== 'pending').map((enrollment) => {
                        const displayName = enrollment.studentName || enrollment.name || 'Trainee';
                        const email = enrollment.studentEmail || enrollment.email || 'N/A';
                        const initials = displayName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join('')
                          .toUpperCase();
                        const progressValue = enrollment?.progress?.overallProgress ?? enrollment?.progress?.completion ?? enrollment?.progress?.percentage ?? 0;

                        return (
                          <div key={enrollment.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4 min-w-0">
                              {enrollment.studentAvatar || enrollment.avatar || enrollment.avatarBase64 ? (
                                <img
                                  src={enrollment.studentAvatar || enrollment.avatar || enrollment.avatarBase64}
                                  alt={displayName}
                                  className="h-14 w-14 rounded-full object-cover flex-shrink-0 border border-gray-200"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-sm flex-shrink-0">
                                  {initials || 'S'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                                <p className="text-sm text-gray-500 truncate">{email}</p>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700">
                                    Trainee
                                  </span>
                                  <span className={`rounded-full px-2.5 py-1 font-medium ${
                                    enrollment.status === 'completed' 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {enrollment.status === 'completed' ? 'Graduated' : enrollment.status || 'Active'}
                                  </span>
                                  <span>Joined {enrollment.joinedAt ? new Date(enrollment.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="hidden sm:block text-right">
                                <p className="text-xs uppercase tracking-wide text-gray-400">Progress</p>
                                <p className="text-lg font-bold text-gray-900">{Math.round(Number(progressValue) || 0)}%</p>
                              </div>
                              {enrollment.status !== 'completed' && (
                                <button
                                  onClick={() => handleGraduateStudent(enrollment.id, displayName)}
                                  className="rounded-xl px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                                  title="Mark student as graduated and issue certificate"
                                >
                                  <Award className="w-4 h-4" />
                                  Graduate
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveStudent(enrollment.id, displayName)}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab — student engagement (open/close, assessment alt-tab) */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Class Activity Logs</h3>
                <p className="text-sm text-gray-500 mt-1">When trainees open/close the class, and alt-tab during an assessment.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All events</option>
                  <option value="class_open">Opened class</option>
                  <option value="class_close">Closed class</option>
                  <option value="assessment_blur">Alt-tab (assessment)</option>
                  <option value="assessment_focus">Returned (assessment)</option>
                </select>
                <button onClick={loadClassActivity} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Refresh
                </button>
              </div>
            </div>
            {loadingActivity || classActivity === null ? (
              <div className="py-16 text-center text-gray-500 text-sm">Loading logs…</div>
            ) : (() => {
              const EVENT_META = {
                class_open: { label: 'Opened class', cls: 'bg-green-100 text-green-700' },
                class_close: { label: 'Closed class', cls: 'bg-gray-100 text-gray-600' },
                assessment_blur: { label: 'Alt-tabbed away', cls: 'bg-red-100 text-red-700' },
                assessment_focus: { label: 'Returned', cls: 'bg-blue-100 text-blue-700' },
              };
              const rows = classActivity.filter((e) => activityFilter === 'all' || e.type === activityFilter);
              if (rows.length === 0) {
                return <div className="py-16 text-center text-gray-500 text-sm">No activity recorded yet.</div>;
              }
              return (
                <div className="overflow-x-auto">
                  <table className="min-w-[680px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trainee</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Event</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assessment</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((e) => {
                        const meta = EVENT_META[e.type] || { label: e.type, cls: 'bg-gray-100 text-gray-600' };
                        const when = toDate(e.at);
                        return (
                          <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3 text-sm font-medium text-gray-800">{e.studentName || e.studentId}</td>
                            <td className="px-6 py-3">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">{e.assessmentTitle || (e.type.startsWith('assessment') ? '(assessment)' : '—')}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">{when ? when.toLocaleString() : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'assessments', label: 'Assessments', icon: ClipboardList },
              { id: 'responses', label: 'Responses', icon: FileText },
              { id: 'grades', label: 'Grades', icon: Award },
            ].map((section) => {
              const SectionIcon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setAssessmentSection(section.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    assessmentSection === section.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <SectionIcon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Assessments section */}
        {activeTab === 'assessments' && assessmentSection === 'assessments' && (
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Assessments</h3>
                <button
                  onClick={() => handleCreateItem('assignment')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create Assessment
                </button>
              </div>

              {/* Combined assessments and assignments */}
              {(() => {
                const allAssessments = [
                  ...(assessments || []).map((a) => ({ ...a, _source: 'assessment' })),
                  ...(assignments || []).map((a) => ({ ...a, _source: 'assignment' })),
                ];
                return (
                  <>
                    {/* Stats Cards */}
                    {allAssessments.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                          <p className="text-blue-600 text-sm font-medium">Total Assessments</p>
                          <p className="text-3xl font-bold text-blue-900 mt-2">{allAssessments.length}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                          <p className="text-purple-600 text-sm font-medium">Total Points</p>
                          <p className="text-3xl font-bold text-purple-900 mt-2">
                            {allAssessments.reduce((sum, a) => sum + (a.totalPoints || a.points || 0), 0)}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                          <p className="text-green-600 text-sm font-medium">Avg Duration</p>
                          <p className="text-3xl font-bold text-green-900 mt-2">
                            {Math.round(allAssessments.reduce((sum, a) => sum + (a.duration || 0), 0) / allAssessments.length) || 0} min
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Assessments List */}
                    {allAssessments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-[900px]">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Type</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Points</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Duration</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Questions</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Created</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {allAssessments.map((assessment) => (
                              <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div>
                                    <p className="font-semibold text-gray-900">{assessment.title}</p>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{assessment.description || 'No description'}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                    {assessment.type || 'Assignment'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {String(assessment.status || 'active') === 'draft' ? (
                                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Draft</span>
                                  ) : (
                                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Published</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="font-semibold text-gray-900">{assessment.totalPoints || assessment.points || 0}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-gray-600">
                                    {assessment.duration || assessment.timeLimit
                                      ? `${assessment.duration || assessment.timeLimit} min`
                                      : 'No limit'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-gray-600">{(assessment.questions || []).length}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-sm text-gray-600">
                                    {assessment.createdAt ? (
                                      new Date(assessment.createdAt instanceof Date ? assessment.createdAt : assessment.createdAt.toDate?.() || new Date()).toLocaleDateString()
                                    ) : '-'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAssessmentForPreview(assessment)}
                                      className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium text-sm"
                                      aria-label={`View contents of ${assessment.title}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                      View
                                    </button>
                                    {assessment._source === 'assessment' && (
                                      <button
                                        onClick={() => openAssessmentEditor(assessment)}
                                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={() => toggleModuleItemPublished(assessment._source === 'assessment' ? 'assessment' : 'assignment', assessment)}
                                      className={`font-medium text-sm ${String(assessment.status || 'active') === 'draft' ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}`}
                                    >
                                      {String(assessment.status || 'active') === 'draft' ? 'Publish' : 'Unpublish'}
                                    </button>
                                    <button
                                      onClick={() => openAssessmentResponses(assessment)}
                                      className="text-violet-600 hover:text-violet-700 font-medium text-sm"
                                    >
                                      View Responses
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-lg font-medium mb-2">No assessments yet</p>
                        <p className="text-gray-400 text-sm">Create your first assessment to get started.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
      )}

      {/* Read-only trainer assessment content viewer */}
      {selectedAssessmentForPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-2 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assessment-preview-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedAssessmentForPreview(null);
          }}
        >
          <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]">
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {selectedAssessmentForPreview.type || 'Assessment'}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    String(selectedAssessmentForPreview.status || 'active') === 'draft'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {String(selectedAssessmentForPreview.status || 'active') === 'draft' ? 'Draft' : 'Published'}
                  </span>
                </div>
                <h2 id="assessment-preview-title" className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                  {selectedAssessmentForPreview.title || 'Untitled assessment'}
                </h2>
                <p className="mt-1 break-words text-sm text-gray-600">
                  {selectedAssessmentForPreview.description || selectedAssessmentForPreview.message || 'No description provided.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssessmentForPreview(null)}
                className="touch-target flex-shrink-0 rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close assessment preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Questions</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{(selectedAssessmentForPreview.questions || []).length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Points</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {selectedAssessmentForPreview.totalPoints || selectedAssessmentForPreview.points || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Time limit</p>
                  <p className="mt-1 text-base font-bold text-gray-900">
                    {selectedAssessmentForPreview.duration || selectedAssessmentForPreview.timeLimit
                      ? `${selectedAssessmentForPreview.duration || selectedAssessmentForPreview.timeLimit} min`
                      : 'None'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Passing score</p>
                  <p className="mt-1 text-base font-bold text-gray-900">
                    {selectedAssessmentForPreview.passingScore ?? selectedAssessmentForPreview.passingPercentage ?? 'Not set'}
                    {(selectedAssessmentForPreview.passingScore !== undefined || selectedAssessmentForPreview.passingPercentage !== undefined) ? '%' : ''}
                  </p>
                </div>
              </div>

              <section>
                <h3 className="mb-3 text-lg font-bold text-gray-900">Assessment contents</h3>
                {(selectedAssessmentForPreview.questions || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <p className="font-medium text-gray-700">No questions were saved with this item.</p>
                    <p className="mt-1 text-sm text-gray-500">It may be a submission task or an incomplete draft.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(selectedAssessmentForPreview.questions || []).map((question, questionIndex) => {
                      const options = Array.isArray(question.options) ? question.options : [];
                      const correctAnswer = question.correctAnswer;
                      const correctIndexes = Array.isArray(correctAnswer)
                        ? correctAnswer
                        : Number.isInteger(correctAnswer)
                          ? [correctAnswer]
                          : [];
                      const textAnswer = typeof correctAnswer === 'string' && correctAnswer.trim()
                        ? correctAnswer
                        : null;
                      const gridAnswer = correctAnswer && typeof correctAnswer === 'object' && !Array.isArray(correctAnswer)
                        ? JSON.stringify(correctAnswer)
                        : null;

                      return (
                        <article key={question.id || questionIndex} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="break-words font-semibold text-gray-900">
                                {questionIndex + 1}. {question.question || question.text || 'Untitled question'}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium capitalize text-blue-700">
                                  {String(question.type || 'question').replaceAll('-', ' ')}
                                </span>
                                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                  {question.points || 0} point{Number(question.points || 0) === 1 ? '' : 's'}
                                </span>
                                {question.required && (
                                  <span className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Required</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {options.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {options.map((option, optionIndex) => {
                                const isCorrect = correctIndexes.includes(optionIndex);
                                return (
                                  <div
                                    key={`${question.id || questionIndex}-${optionIndex}`}
                                    className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                                      isCorrect
                                        ? 'border-green-200 bg-green-50 text-green-800'
                                        : 'border-gray-200 text-gray-700'
                                    }`}
                                  >
                                    <span className="break-words">{optionIndex + 1}. {option}</span>
                                    {isCorrect && <span className="flex-shrink-0 text-xs font-semibold">Correct answer</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {textAnswer && (
                            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                              <span className="font-semibold">Expected answer:</span> {textAnswer}
                            </div>
                          )}
                          {gridAnswer && (
                            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                              <span className="font-semibold">Saved answer key:</span>{' '}
                              <code className="break-all">{gridAnswer}</code>
                            </div>
                          )}
                          {options.length === 0 && !textAnswer && !gridAnswer && (
                            <p className="mt-4 text-sm italic text-gray-500">No preset answer key; this question may require manual review.</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="flex flex-shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setSelectedAssessmentForPreview(null)}
                className="w-full rounded-lg px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:w-auto"
              >
                Close
              </button>
              {selectedAssessmentForPreview._source === 'assessment' && (
                <button
                  type="button"
                  onClick={() => {
                    const assessment = selectedAssessmentForPreview;
                    setSelectedAssessmentForPreview(null);
                    openAssessmentEditor(assessment);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Assessment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gradebook section */}
        {activeTab === 'assessments' && assessmentSection === 'grades' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Gradebook</h3>
              <div className="flex gap-2">
                <button onClick={loadGradebook} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Refresh</button>
                <button onClick={exportGradebookCsv} disabled={!gradebook} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
            {loadingGradebook ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : !gradebook || gradebook.rows.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500 text-lg font-medium">No grades yet</p>
                <p className="text-gray-400 text-sm mt-2">Quiz scores and graded submissions appear here once trainees are enrolled and assessed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-50">Trainee</th>
                      {gradebook.columns.map((c) => (
                        <th key={c.id} className="px-4 py-3 text-center font-semibold text-gray-700 whitespace-nowrap">
                          {c.title}
                          <span className="block text-xs font-normal text-gray-400">{c.kind === 'assessment' ? 'quiz' : 'task'}</span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gradebook.rows.map((row) => (
                      <tr key={row.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">{row.studentName}</td>
                        {row.cells.map((cell) => (
                          <td key={cell.columnId} className="px-4 py-3 text-center text-gray-700">
                            {cell.score === null || cell.score === undefined ? <span className="text-gray-300">—</span> : cell.score}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-bold text-blue-600">{row.average === null ? '—' : row.average}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-3">Average is a simple mean of available scores (quiz % and task points) — a rough indicator, not a weighted final grade.</p>
              </div>
            )}
          </div>
        )}

        {/* Responses section */}
        {activeTab === 'assessments' && assessmentSection === 'responses' && (
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Assessment Responses</h3>
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  New Submission Task
                </button>
              </div>

              {/* Assessment Selection */}
              {!selectedAssessmentForResponses ? (
                <div className="space-y-6">
                  <p className="text-gray-600">Select an assessment to view and analyze trainee responses:</p>
                  {(() => {
                    const allAssessments = [...(assessments || []), ...(assignments || [])];
                    return allAssessments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allAssessments.map((assessment) => (
                          <button
                            key={assessment.id}
                            onClick={() => openAssessmentResponses(assessment)}
                            className="text-left p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors flex-1">{assessment.title}</h4>
                              <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 ml-2 flex-shrink-0">
                                {assessment.type === 'assignment' || assessment.type === 'quiz' ? 'Quiz' : 'Assessment'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{assessment.description || 'No description'}</p>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-500">{(assessment.questions || []).length} questions</span>
                              <span className="text-sm font-semibold text-gray-700">{assessment.totalPoints || assessment.points || 0} pts</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-lg font-medium">No assessments yet</p>
                        <p className="text-gray-400 text-sm mt-2">Create assessments to start receiving trainee responses</p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div>
                  {/* Back Button and Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <div>
                      <button
                        onClick={() => {
                          setSelectedAssessmentForResponses(null);
                          setAssessmentResponses([]);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1 mb-2"
                      >
                        ← Back to response selection
                      </button>
                      <h4 className="text-2xl font-bold text-gray-900">{selectedAssessmentForResponses.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedAssessmentForResponses.description || 'No description'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Points</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedAssessmentForResponses.totalPoints || selectedAssessmentForResponses.points || 0}</p>
                    </div>
                  </div>

                  {/* Submission-type: grade student uploads */}
                  {selectedAssessmentForResponses.type === 'Submission' && (
                    <div className="space-y-3">
                      {itemSubmissions.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-gray-500 text-lg font-medium">No submissions yet</p>
                          <p className="text-gray-400 text-sm mt-2">Trainee submissions will appear here for grading</p>
                        </div>
                      ) : (
                        itemSubmissions.map((sub) => (
                          <div key={sub.studentId} className="border border-gray-200 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">{sub.studentName || sub.studentId}</p>
                                <p className="text-xs text-gray-500">
                                  {sub.status === 'graded' ? `Graded: ${sub.grade ?? '—'}` : 'Submitted'}
                                  {sub.submittedAt ? ` · ${new Date(sub.submittedAt.toDate?.() || sub.submittedAt).toLocaleString()}` : ''}
                                </p>
                                {sub.text && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{sub.text}</p>}
                                {sub.attachments?.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {sub.attachments.map((attachment) => (
                                      <a
                                        key={attachment.storagePath || attachment.name}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        {attachment.name}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {sub.status === 'graded' ? 'Graded' : 'Needs grading'}
                              </span>
                            </div>
                            {gradingStudentId === sub.studentId ? (
                              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                                <div className="flex gap-2 items-center">
                                  <label className="text-sm text-gray-600">Grade</label>
                                  <input type="number" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} className="w-24 px-2 py-1 border border-gray-200 rounded-lg" />
                                  <span className="text-sm text-gray-400">/ {selectedAssessmentForResponses.points || 100}</span>
                                </div>
                                <textarea rows={2} value={feedbackInput} onChange={(e) => setFeedbackInput(e.target.value)} placeholder="Feedback (optional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none" />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setGradingStudentId(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">Cancel</button>
                                  <button onClick={() => handleSaveGrade(sub)} disabled={savingGrade} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{savingGrade ? 'Saving...' : 'Save grade'}</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => startGrading(sub)} className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">
                                {sub.status === 'graded' ? 'Edit grade' : 'Grade'}
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Response Stats */}
                  {assessmentResponses && assessmentResponses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-blue-600 text-sm font-medium">Total Responses</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{assessmentResponses.length}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-green-600 text-sm font-medium">Passed</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {assessmentResponses.filter(r => r.passed).length}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <p className="text-red-600 text-sm font-medium">Failed</p>
                        <p className="text-2xl font-bold text-red-900 mt-1">
                          {assessmentResponses.filter(r => !r.passed).length}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-purple-600 text-sm font-medium">Avg Score</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                          {Math.round(assessmentResponses.reduce((sum, r) => sum + ((r.earnedPoints / r.totalPoints) * 100), 0) / assessmentResponses.length)}%
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Responses Table */}
                  {loadingResponses ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-gray-500 mt-4">Loading responses...</p>
                    </div>
                  ) : assessmentResponses && assessmentResponses.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-[760px]">
                        <thead>
                          <tr className="border-b-2 border-gray-200 bg-gray-50">
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Trainee</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Score</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Percentage</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Submitted</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {assessmentResponses.map((response, index) => {
                            const percentage = Math.round((response.earnedPoints / response.totalPoints) * 100);
                            const statusColor = response.passed 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700';
                            return (
                              <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm">
                                  <div className="font-semibold text-gray-900">{response.studentName || response.studentId}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="font-bold text-lg text-gray-900">
                                    {response.earnedPoints || 0}/{response.totalPoints || 100}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className={`font-bold text-lg ${response.passed ? 'text-green-600' : 'text-red-600'}`}>
                                      {percentage}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                    {response.passed ? 'Passed' : 'Not Passed'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-sm text-gray-600">
                                    {response.submittedAt instanceof Date
                                      ? response.submittedAt.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric', 
                                          year: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                      : 'N/A'
                                    }
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => setSelectedResponseDetail(response)}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : selectedAssessmentForResponses.type !== 'Submission' ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500 text-lg font-medium">No responses yet</p>
                      <p className="text-gray-400 text-sm mt-2">Trainees who complete this assessment will appear here</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">New Announcement</h2>
              <button 
                onClick={() => setShowAnnouncementModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSaveAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Announcement</label>
                <textarea 
                  rows={5}
                  placeholder="Share something with your class..."
                  value={modalAnnouncementText}
                  onChange={(e) => setModalAnnouncementText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (optional)</label>
                <div 
                  onDragOver={handleModalDragOver}
                  onDrop={handleModalDrop}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
                >
                  <input 
                    type="file"
                    id="modal-file-input"
                    multiple
                    onChange={handleModalFileInput}
                    className="hidden"
                    disabled={uploadingAttachment}
                  />
                  <label htmlFor="modal-file-input" className="cursor-pointer block">
                    <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  </label>
                </div>
                
                {/* Display selected files */}
                {modalAnnouncementFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {modalAnnouncementFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">({(file.size / 1024).toFixed(2)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeModalFile(index)}
                          disabled={uploadingAttachment}
                          className="ml-2 p-1 hover:bg-blue-100 rounded transition-colors text-gray-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    setModalAnnouncementText('');
                    setModalAnnouncementFiles([]);
                  }}
                  disabled={uploadingAttachment}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploadingAttachment || !modalAnnouncementText.trim()}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {uploadingAttachment ? 'Uploading...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl animate-slide-up sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
            {/* Header */}
            <div className="sticky top-0 px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {createType === 'material' ? (currentMaterialId && materials.find(m => m.id === currentMaterialId)?.isPublished ? 'Edit Material' : 'Add Material') : createType === 'topic' ? (selectedTopicId ? 'Edit Topic' : 'Create Topic') : 'Create Assignment'}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                    {createType === 'material' ? (currentMaterialId && materials.find(m => m.id === currentMaterialId)?.isPublished ? 'Update learning resources for your class' : 'Upload learning resources for your class') : createType === 'topic' ? (selectedTopicId ? 'Update your discussion topic' : 'Create a new discussion topic') : 'Create an assignment for your trainees'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormBuilderTitle('');
                    setFormBuilderDescription('');
                    setFormBuilderQuestions([]);
                    setCurrentAssignmentDraftId(null);
                    setCreateType('');
                    setMaterialTitle('');
                    setMaterialDescription('');
                    setMaterialFiles([]);
                    setCurrentMaterialId(null);
                    setTopicTitle('');
                    setTopicDescription('');
                    setSelectedTopicId(null);
                  }}
                  className="shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content based on createType */}
            {(createType === 'material' || createType === 'topic') && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                {/* Materials Form */}
                {createType === 'material' && (
                  <form id="material-form" onSubmit={handleSaveMaterial} className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-900">Material Title</label>
                      <input 
                        type="text"
                        placeholder="e.g., Chapter 1: Introduction"
                        value={materialTitle}
                        onChange={(e) => setMaterialTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-900">Description</label>
                      <textarea
                        rows={4}
                        placeholder="Add a description for this material..."
                        value={materialDescription}
                        onChange={(e) => setMaterialDescription(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900">Link <span className="font-normal text-gray-400">(optional)</span></label>
                      <input
                        type="url"
                        placeholder="https://example.com/resource"
                        value={materialLink}
                        onChange={(e) => setMaterialLink(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-gray-500">Share a link (video, doc, website) — no file upload required.</p>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-900">Upload Files <span className="font-normal text-gray-400">(optional)</span></label>

                      {/* Current attachments (when editing) */}
                      {currentMaterialId && materials.find(m => m.id === currentMaterialId)?.attachments && materials.find(m => m.id === currentMaterialId).attachments.length > 0 && materialFiles.length === 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                          <p className="text-xs font-semibold text-blue-900 mb-3">Current Files:</p>
                          {materials.find(m => m.id === currentMaterialId)?.attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-600">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentMaterial = materials.find(m => m.id === currentMaterialId);
                                  if (currentMaterial) {
                                    const newAttachments = currentMaterial.attachments.filter((_, i) => i !== idx);
                                    const newFilesBase64 = currentMaterial.filesBase64.filter((_, i) => i !== idx);
                                    // Update local state only - will be saved when user clicks Save
                                    setMaterials(prev => prev.map(m => 
                                      m.id === currentMaterialId 
                                        ? {...m, attachments: newAttachments, filesBase64: newFilesBase64}
                                        : m
                                    ));
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 flex-shrink-0 ml-2"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-2"
                          >
                            Replace All Files
                          </button>
                        </div>
                      )}

                      {/* Selected files to upload */}
                      {materialFiles.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                          <p className="text-xs font-semibold text-green-900 mb-3">Files to Upload:</p>
                          {materialFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Upload className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-600">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMaterialFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* File upload area */}
                      <div 
                        onDrop={handleMaterialFileDrop}
                        onDragOver={handleMaterialFileDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Drag and drop files here, or click to select</p>
                        <p className="text-xs text-gray-500 mt-1">You can upload multiple files</p>
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              setMaterialFiles(prev => [...prev, ...Array.from(files)]);
                            }
                          }}
                          className="hidden"
                          accept="*/*"
                          multiple
                        />
                      </div>
                    </div>
                  </form>
                )}

                {/* Topic Form */}
                {createType === 'topic' && (
                  <form id="topic-form" onSubmit={handleSaveTopic} className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-900">Topic Title</label>
                      <input 
                        type="text"
                        placeholder="e.g., Discussion: Best Practices"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-900">Description</label>
                      <textarea 
                        rows={4}
                        placeholder="Describe the topic for your students..."
                        value={topicDescription}
                        onChange={(e) => setTopicDescription(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                      />
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Footer for Material and Topic forms */}
            {(createType === 'material' || createType === 'topic') && (
              <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 flex items-center justify-end gap-3 flex-shrink-0">
                {createType === 'material' && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowCreateModal(false);
                        setMaterialTitle('');
                        setMaterialDescription('');
                        setMaterialFiles([]);
                        setCurrentMaterialId(null);
                        setCreateType('');
                      }}
                      className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    {!currentMaterialId ? (
                      <button 
                        type="submit" 
                        form="material-form"
                        disabled={isSavingMaterialDraft || !materialTitle.trim()}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingMaterialDraft ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Draft
                          </>
                        )}
                      </button>
                    ) : materials.find(m => m.id === currentMaterialId)?.isPublished ? (
                      // Editing published material
                      <>
                        <button 
                          type="submit" 
                          form="material-form"
                          disabled={isSavingMaterialDraft || !materialTitle.trim()}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSavingMaterialDraft ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Update Material
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleUnpublishMaterial}
                          disabled={uploadingMaterial}
                          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {uploadingMaterial ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Unpublishing...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 rotate-180" />
                              Unpublish
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      // Publishing draft
                      <button 
                        type="button"
                        onClick={handlePublishMaterial}
                        disabled={uploadingMaterial}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {uploadingMaterial ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Publish to Trainees
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
                {createType === 'topic' && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowCreateModal(false);
                        setTopicTitle('');
                        setTopicDescription('');
                        setCreateType('');
                        setSelectedTopicId(null);
                      }}
                      className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    {!selectedTopicId ? (
                      <button 
                        type="submit" 
                        form="topic-form"
                        disabled={submittingTopic || !topicTitle.trim()}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {submittingTopic ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Draft
                          </>
                        )}
                      </button>
                    ) : (
                      <button 
                        type="submit" 
                        form="topic-form"
                        disabled={submittingTopic || !topicTitle.trim()}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {submittingTopic ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Update Topic
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Assignment Form */}
            {(!createType || createType === 'assignment') && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto lg:overflow-hidden flex w-full flex-col lg:flex-row">
                  {/* Left Side - Form Builder */}
                  <div className="flex-1 overflow-y-visible p-4 space-y-6 border-b border-gray-200 sm:p-8 sm:space-y-8 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                    {/* Title Section */}
                    <div className="space-y-3">
                  <input 
                    type="text"
                    placeholder="Untitled assignment"
                    value={formBuilderTitle}
                    onChange={(e) => setFormBuilderTitle(e.target.value)}
                    className="w-full text-2xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none border-b-2 border-transparent focus:border-blue-600 transition-colors pb-2 sm:text-3xl"
                    required
                  />
                  <textarea 
                    rows={2}
                    placeholder="Assignment description"
                    value={formBuilderDescription}
                    onChange={(e) => setFormBuilderDescription(e.target.value)}
                    className="w-full px-0 py-2 text-base text-gray-600 placeholder-gray-400 focus:outline-none border-b border-gray-300 focus:border-blue-600 resize-none transition-colors"
                  />
                </div>

                {/* Touch-friendly question picker appears before the question list on mobile. */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 lg:hidden">
                  <h3 className="font-semibold text-gray-900">Add a question</h3>
                  <p className="mb-3 mt-1 text-xs text-gray-600">Choose a response type to insert it below.</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {FORM_QUESTION_TYPES.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => addFormQuestion(item.type)}
                        className="flex min-h-11 items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 active:bg-blue-100"
                      >
                        <span className="flex h-6 min-w-6 items-center justify-center text-xs font-bold text-blue-700">{item.icon}</span>
                        <span className="min-w-0 leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Questions ({formBuilderQuestions.length})</h3>
                  </div>

                  {formBuilderQuestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No questions added yet. Use the question types panel on the right to add questions.</p>
                    </div>
                  ) : (
                    formBuilderQuestions.map((question, idx) => (
                      <div key={question.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Question Header - Clickable */}
                        <div
                          onClick={() => setEditingQuestionId(editingQuestionId === question.id ? null : question.id)}
                          className="flex items-start justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-3 cursor-pointer hover:bg-blue-50 transition-colors sm:items-center sm:px-5"
                        >
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                            <span className="font-semibold text-gray-700">Q{idx + 1}</span>
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded capitalize">
                              {question.type.replace('-', ' ')}
                            </span>
                            <span className="min-w-0 basis-full truncate text-sm text-gray-600 sm:ml-2 sm:basis-auto sm:flex-1">
                              {question.question || 'Click to edit question'}
                            </span>
                          </div>
                          <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                            <button 
                              type="button"
                              onClick={() => deleteFormQuestion(question.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Question Content - Editable when expanded */}
                        {editingQuestionId === question.id && (
                          <div className="p-5 space-y-4 bg-white">
                            {/* Question Text */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                              <textarea
                                value={question.question}
                                onChange={(e) => updateFormQuestion(question.id, 'question', e.target.value)}
                                placeholder="Enter your question here..."
                                rows={2}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                              />
                            </div>

                            {/* Options for choice-based questions */}
                            {question.options && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                  {question.type === 'checkboxes' ? 'Options (select all that apply)' : 'Options'}
                                </label>
                                <div className="space-y-2 mb-3">
                                  {question.options.map((option, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-3">
                                      {question.type === 'checkboxes' ? (
                                        <input
                                          type="checkbox"
                                          checked={Array.isArray(question.correctAnswer) && question.correctAnswer.includes(optIdx)}
                                          onChange={() => {
                                            const current = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
                                            const newAnswer = current.includes(optIdx) 
                                              ? current.filter(i => i !== optIdx)
                                              : [...current, optIdx];
                                            updateFormQuestion(question.id, 'correctAnswer', newAnswer);
                                          }}
                                          className="w-4 h-4 rounded border-gray-300 text-green-600"
                                          title="Mark as correct answer"
                                        />
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => updateFormQuestion(question.id, 'correctAnswer', optIdx)}
                                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            question.correctAnswer === optIdx 
                                              ? 'border-green-500 bg-green-500' 
                                              : 'border-gray-300 hover:border-gray-400'
                                          }`}
                                          title="Mark as correct answer"
                                        >
                                          {question.correctAnswer === optIdx && (
                                            <Check className="w-3 h-3 text-white" />
                                          )}
                                        </button>
                                      )}
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => updateOptionInQuestion(question.id, optIdx, e.target.value)}
                                        placeholder={`Option ${optIdx + 1}`}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                      />
                                      {question.options.length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => removeOptionFromQuestion(question.id, optIdx)}
                                          className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addOptionToQuestion(question.id)}
                                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add option
                                </button>
                              </div>
                            )}

                            {/* Description/Help Text */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                              <textarea
                                value={question.description || ''}
                                onChange={(e) => updateFormQuestion(question.id, 'description', e.target.value)}
                                placeholder="Add help text or instructions..."
                                rows={1}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-sm"
                              />
                            </div>

                            {/* Points */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Points (optional)</label>
                              <input
                                type="number"
                                value={question.points || 1}
                                onChange={(e) => updateFormQuestion(question.id, 'points', parseInt(e.target.value) || 1)}
                                min="0"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                              />
                            </div>

                            {/* Required toggle */}
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={question.required || false}
                                onChange={(e) => updateFormQuestion(question.id, 'required', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">Make this question required</span>
                            </label>
                          </div>
                        )}

                        {/* Question Preview - when collapsed */}
                        {editingQuestionId !== question.id && (
                          <div className="px-5 py-3 bg-gray-50">
                            <p className="text-sm text-gray-700 font-medium">{question.question || 'Click to edit question'}</p>
                            {question.description && (
                              <p className="text-xs text-gray-600 mt-1">{question.description}</p>
                            )}
                            {question.options && (
                              <div className="mt-2 text-xs text-gray-600">
                                <span className="font-medium">{question.options.length} options</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Settings Section */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Settings
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <span className="text-sm text-gray-700">Allow attached files</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <span className="text-sm text-gray-700">Shuffle question order</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <span className="text-sm text-gray-700">One response per user</span>
                    </label>
                  </div>
                </div>

                {/* Available date, Due Date & Points */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Available From</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={formBuilderAvailableDate}
                        onChange={(e) => setFormBuilderAvailableDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        max={maxDateStr}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Blank = open immediately</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={formBuilderDueDate}
                        onChange={(e) => setFormBuilderDueDate(e.target.value)}
                        min={formBuilderAvailableDate || new Date().toISOString().split('T')[0]}
                        max={maxDateStr}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Will be set to 11:59 PM</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                    <input
                      type="number"
                      value={formBuilderPoints}
                      onChange={(e) => setFormBuilderPoints(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Right Side - Question Type Selector */}
              <div className="hidden w-72 shrink-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-white p-8 lg:flex lg:flex-col">
                <h3 className="font-semibold text-gray-900 mb-5">Question Types</h3>
                <div className="flex-1 space-y-2">
                  {FORM_QUESTION_TYPES.map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addFormQuestion(item.type)}
                      className="w-full text-left p-3 hover:bg-blue-100 hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-blue-300 group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700 transition-colors">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-8 flex flex-col-reverse items-stretch justify-end gap-2 flex-shrink-0 sm:flex-row sm:items-center sm:gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormBuilderTitle('');
                      setFormBuilderDescription('');
                      setFormBuilderQuestions([]);
                      setCurrentAssignmentDraftId(null);
                      setIsFormBuilderEditMode(false);
                      setEditingAssignmentId(null);
                    }}
                    className="w-full px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors sm:w-auto"
                  >
                    Cancel
                  </button>
                  {isFormBuilderEditMode ? (
                    <button 
                      type="submit"
                      form={undefined}
                      onClick={(e) => handleSaveItem(e, 'publish')}
                      className="flex w-full items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed sm:w-auto"
                      disabled={!formBuilderTitle.trim() || !hasPublishableAssignmentQuestion || isSubmittingItem || isPublishingItem}
                    >
                      <Save className="w-4 h-4" />
                      {isSubmittingItem || isPublishingItem ? 'Saving...' : 'Save Changes'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleSaveItem(e, 'draft')}
                        className="flex w-full items-center justify-center gap-2 px-6 py-2.5 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed sm:w-auto"
                        disabled={!formBuilderTitle.trim() || isSubmittingItem || isPublishingItem}
                      >
                        <Save className="w-4 h-4" />
                        {isSubmittingItem ? 'Saving...' : 'Save Draft'}
                      </button>
                      <button 
                        type="submit"
                        form={undefined}
                        onClick={(e) => handleSaveItem(e, 'publish')}
                        className="flex w-full items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed sm:w-auto"
                        disabled={!formBuilderTitle.trim() || !hasPublishableAssignmentQuestion || isSubmittingItem || isPublishingItem || !currentAssignmentDraftId}
                      >
                        <Send className="w-4 h-4" />
                        {isPublishingItem ? 'Publishing...' : 'Publish'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trainee Response Detail Modal (quiz/assessment "View Details") */}
      {selectedResponseDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up my-8 max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-gray-200 flex-shrink-0 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedResponseDetail.studentName || selectedResponseDetail.studentId}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {selectedResponseDetail.earnedPoints || 0}/{selectedResponseDetail.totalPoints || 0} points
                  {' · '}
                  {Math.round(((selectedResponseDetail.earnedPoints || 0) / (selectedResponseDetail.totalPoints || 1)) * 100)}%
                  {' · '}
                  <span className={selectedResponseDetail.passed ? 'text-green-600' : 'text-red-600'}>
                    {selectedResponseDetail.passed ? 'Passed' : 'Not Passed'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedResponseDetail(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-8 py-6 overflow-y-auto space-y-4">
              {(selectedAssessmentForResponses?.questions || []).length === 0 ? (
                <p className="text-gray-500 text-sm">No questions recorded for this assessment.</p>
              ) : (
                (selectedAssessmentForResponses?.questions || []).map((q, idx) => {
                  const answers = selectedResponseDetail.answers || {};
                  const studentAnswer = answers[q.id];
                  const isCorrect = studentAnswer === q.correctAnswer;
                  const options = q.options || [];
                  return (
                    <div
                      key={q.id || idx}
                      className={`rounded-xl border p-4 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                    >
                      <p className="font-semibold text-gray-900 mb-2">
                        {idx + 1}. {q.question || q.text || 'Question'}
                      </p>
                      <div className="space-y-1 text-sm">
                        {options.map((opt, optIdx) => {
                          const chosen = studentAnswer === optIdx;
                          const correct = q.correctAnswer === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`px-3 py-1.5 rounded-lg flex items-center justify-between ${
                                correct ? 'bg-green-100 text-green-800' : chosen ? 'bg-red-100 text-red-800' : 'text-gray-700'
                              }`}
                            >
                              <span>{opt}</span>
                              <span className="text-xs font-medium">
                                {correct ? 'Correct answer' : chosen ? 'Their answer' : ''}
                              </span>
                            </div>
                          );
                        })}
                        {studentAnswer === undefined && (
                          <p className="text-xs text-gray-500 italic">No answer submitted.</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Detail Modal */}
      {showAssignmentDetailModal && selectedAssignmentDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-slide-up max-h-[calc(100dvh-1rem)] sm:my-8 sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{selectedAssignmentDetail.title}</h2>
                  <p className="text-gray-600 text-sm mt-1">Created by {selectedAssignmentDetail.author}</p>
                </div>
                <button 
                  onClick={() => setShowAssignmentDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 overflow-x-auto border-b border-gray-200 px-4 pt-4 flex-shrink-0 sm:px-8 sm:pt-6">
              <button
                onClick={() => setAssignmentDetailTab('questions')}
                className={`shrink-0 whitespace-nowrap pb-4 px-4 font-medium transition-colors ${
                  assignmentDetailTab === 'questions'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Questions ({selectedAssignmentDetail.questions?.length || 0})
              </button>
              <button
                onClick={() => setAssignmentDetailTab('responses')}
                className={`shrink-0 whitespace-nowrap pb-4 px-4 font-medium transition-colors ${
                  assignmentDetailTab === 'responses'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Responses
              </button>
              <button
                onClick={() => setAssignmentDetailTab('settings')}
                className={`shrink-0 whitespace-nowrap pb-4 px-4 font-medium transition-colors ${
                  assignmentDetailTab === 'settings'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Settings
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              {/* Questions Tab */}
              {assignmentDetailTab === 'questions' && (
                <div className="space-y-6">
                  {/* Edit Button */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        // Populate form builder with current assignment data
                        setFormBuilderTitle(selectedAssignmentDetail.title || '');
                        setFormBuilderDescription(selectedAssignmentDetail.message || selectedAssignmentDetail.description || '');
                        setFormBuilderQuestions(selectedAssignmentDetail.questions || []);

                        // Safely parse a date (string, Date, or Firestore Timestamp) → YYYY-MM-DD.
                        const toDateInput = (val) => {
                          if (!val) return '';
                          if (typeof val === 'string') return val.split('T')[0];
                          if (val instanceof Date) return val.toISOString().split('T')[0];
                          if (val.toDate) return val.toDate().toISOString().split('T')[0];
                          return '';
                        };
                        setFormBuilderAvailableDate(toDateInput(selectedAssignmentDetail.availableDate));
                        setFormBuilderDueDate(toDateInput(selectedAssignmentDetail.dueDate));
                        setFormBuilderPoints(selectedAssignmentDetail.points?.toString() || '100');
                        
                        // Set edit mode and close current modal
                        setIsFormBuilderEditMode(true);
                        setEditingAssignmentId(selectedAssignmentDetail.id);
                        setShowAssignmentDetailModal(false);
                        setShowCreateModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit Assignment
                    </button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700">{selectedAssignmentDetail.message || 'No description provided'}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Assignment Questions</h3>
                    {selectedAssignmentDetail.questions && selectedAssignmentDetail.questions.length > 0 ? (
                      <div className="space-y-4">
                        {selectedAssignmentDetail.questions.map((q, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start gap-3">
                              <span className="font-semibold text-gray-700">Q{idx + 1}.</span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{q.question || 'Untitled question'}</p>
                                <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded capitalize">
                                  {q.type?.replace('-', ' ')}
                                </span>
                                {q.options && q.options.length > 0 && (
                                  <div className="mt-3 space-y-1">
                                    {q.options.map((opt, optIdx) => (
                                      <div key={optIdx} className="text-sm text-gray-600">
                                        • {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No questions in this assignment</p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Available from:</span>{' '}
                      {selectedAssignmentDetail.availableDate
                        ? new Date(selectedAssignmentDetail.availableDate).toLocaleDateString()
                        : 'Open immediately'}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Due Date:</span>{' '}
                      {selectedAssignmentDetail.dueDate
                        ? `${new Date(selectedAssignmentDetail.dueDate).toLocaleDateString()} at 11:59 PM`
                        : 'No due date'}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Points:</span> {selectedAssignmentDetail.points}
                    </p>
                    {selectedAssignmentDetail.createdAt && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Created:</span>{' '}
                        {new Date(
                          selectedAssignmentDetail.createdAt?.toDate
                            ? selectedAssignmentDetail.createdAt.toDate()
                            : selectedAssignmentDetail.createdAt
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Responses Tab */}
              {assignmentDetailTab === 'responses' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Trainee Responses</h3>
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No responses yet</p>
                    <p className="text-gray-500 text-sm mt-1">Responses will appear here once trainees submit</p>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {assignmentDetailTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Manage Assignment</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                        <span className="text-sm text-gray-700">Allow trainees to submit responses</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                        <span className="text-sm text-gray-700">Show correct answers to trainees</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                        <span className="text-sm text-gray-700">Allow late submissions</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-700 mb-3">Danger Zone</h4>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                      Delete Assignment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 flex gap-3 justify-end flex-shrink-0">
              <button 
                onClick={() => setShowAssignmentDetailModal(false)}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Submission Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">New Submission Task</h2>
              <button onClick={() => setShowNewTaskModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Trainees upload their work (text and/or files) for this task, and you grade each submission.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Practical Output: Espresso Extraction"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="What should students submit? (required — this is the task prompt)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                  <input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} min={new Date().toISOString().split('T')[0]} max={maxDateStr} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                  <input type="number" value={newTaskPoints} onChange={(e) => setNewTaskPoints(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed submission types <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {UPLOAD_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        newTaskUploadTypes.includes(opt.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newTaskUploadTypes.includes(opt.id)}
                        onChange={() => toggleTaskUploadType(opt.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Trainees can only submit the types you allow.</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowNewTaskModal(false)} className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors">Cancel</button>
              <button onClick={() => handleCreateSubmissionTask(false)} disabled={creatingTask} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                {creatingTask ? 'Saving…' : 'Save as draft'}
              </button>
              <button onClick={() => handleCreateSubmissionTask(true)} disabled={creatingTask} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                <Plus className="w-4 h-4" />
                {creatingTask ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Trainees Modal */}
      {/* Add co-trainer modal (lead only) */}
      {showAddCoTrainerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Add Co-trainer</h2>
              <button onClick={() => setShowAddCoTrainerModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {(() => {
                const taken = new Set([classData?.trainerId, ...coTrainerIds]);
                const available = allTrainers.filter((t) => !taken.has(t.id));
                if (available.length === 0) {
                  return <div className="py-8 text-center text-gray-500 text-sm">No other trainers available to add.</div>;
                }
                return (
                  <div className="space-y-2">
                    {available.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{t.name || t.displayName || t.email}</p>
                          <p className="text-xs text-gray-500 truncate">{t.email || '—'}</p>
                        </div>
                        <button
                          onClick={() => handleAddCoTrainer(t.id)}
                          disabled={coTrainerBusy}
                          className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Transfer ownership modal (lead only) */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Transfer Ownership</h2>
                <p className="text-sm text-gray-500 mt-0.5">The chosen trainer becomes lead; you become a co-trainer.</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {(() => {
                // Co-trainers first, then any other trainer (never the current lead).
                const candidates = allTrainers.filter((t) => t.id !== classData?.trainerId);
                candidates.sort((a, b) => (coTrainerIds.includes(b.id) ? 1 : 0) - (coTrainerIds.includes(a.id) ? 1 : 0));
                if (candidates.length === 0) {
                  return <div className="py-8 text-center text-gray-500 text-sm">No other trainers to transfer to.</div>;
                }
                return (
                  <div className="space-y-2">
                    {candidates.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {t.name || t.displayName || t.email}
                            {coTrainerIds.includes(t.id) ? <span className="ml-2 text-xs text-blue-600">co-trainer</span> : ''}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{t.email || '—'}</p>
                        </div>
                        <button
                          onClick={() => handleTransferOwnership(t.id)}
                          disabled={coTrainerBusy}
                          className="flex-shrink-0 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          Make lead
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add existing trainee modal */}
      {showAddTraineeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add Trainee</h2>
                <p className="text-sm text-gray-500 mt-0.5">Add an existing trainee directly to this class.</p>
              </div>
              <button
                onClick={() => setShowAddTraineeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="p-4 overflow-y-auto">
              {loadingStudents ? (
                <div className="py-10 text-center text-gray-500 text-sm">Loading trainees…</div>
              ) : (() => {
                const enrolledIds = new Set(enrollments.map((e) => e.studentId));
                const q = studentSearch.trim().toLowerCase();
                const available = allStudents.filter((s) => {
                  if (enrolledIds.has(s.id)) return false;
                  if (!q) return true;
                  const name = (s.name || s.displayName || '').toLowerCase();
                  const email = (s.email || '').toLowerCase();
                  return name.includes(q) || email.includes(q);
                });
                if (available.length === 0) {
                  return (
                    <div className="py-10 text-center text-gray-500 text-sm">
                      {allStudents.length === 0 ? 'No trainees found in the directory.' : 'No matching trainees available to add.'}
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {available.map((s) => {
                      const displayName = s.name || s.displayName || s.email || 'Trainee';
                      return (
                        <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{s.email || '—'}{s.idNumber ? ` · ID ${s.idNumber}` : ''}</p>
                          </div>
                          <button
                            onClick={() => handleAddTrainee(s)}
                            disabled={addingStudentId === s.id}
                            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            {addingStudentId === s.id ? 'Adding…' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowAddTraineeModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Invite Trainees</h2>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleInviteStudents} className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Copy className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Share class code</p>
                  <p className="font-bold text-blue-600">{classData?.classCode}</p>
                </div>
                <button 
                  type="button"
                  onClick={copyClassCode}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Copy
                </button>
              </div>
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200" />
                <span className="px-4 text-sm text-gray-500">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email addresses</label>
                <textarea 
                  rows={3}
                  placeholder="Enter email addresses separated by commas..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Invitations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Edit {editItem.type}</h2>
              <button 
                onClick={() => { setShowEditModal(false); setEditItem(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addToast('Changes saved successfully!'); setShowEditModal(false); setEditItem(null); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input 
                  type="text"
                  defaultValue={editItem.title}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                <textarea 
                  rows={4}
                  defaultValue="Sample instructions for this item..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditItem(null); }}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Creation Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-slide-up my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900">
                  {currentQuizDraftId ? 'Edit' : 'Create'} {assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {currentQuizDraftId ? 'Update assessment content, schedule, and timing' : `Build your ${assessmentType} with various question types`}
                </p>
              </div>
              <button 
                onClick={() => setShowQuizModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Assessment Type Selector */}
              <div className="flex gap-3 overflow-x-auto border-b pb-6">
                {['quiz', 'survey', 'form'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setAssessmentType(type);
                      setQuizQuestions([]);
                    }}
                    className={`shrink-0 px-4 py-2.5 rounded-lg font-medium transition-all ${
                      assessmentType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'quiz' ? '📝 Quiz' : type === 'survey' ? '📊 Survey' : '📋 Form'}
                  </button>
                ))}
              </div>

              {/* Quiz/Survey Settings */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">Quiz Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
                    <input 
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="Enter quiz title..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea 
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                      placeholder="Add instructions or description for students..."
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-gray-700 mb-2">
                      <span>Timed assessment</span>
                      <input
                        type="checkbox"
                        checked={quizHasTimeLimit}
                        onChange={(e) => {
                          setQuizHasTimeLimit(e.target.checked);
                          if (e.target.checked && !quizTimeLimit) setQuizTimeLimit('30');
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                    {quizHasTimeLimit ? (
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          min="1"
                          max="480"
                          step="1"
                          value={quizTimeLimit}
                          onChange={(e) => setQuizTimeLimit(e.target.value)}
                          aria-label="Time limit in minutes"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-500">
                        No time limit
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Timed assessments auto-submit when time expires.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Points</label>
                    <input
                      type="number"
                      value={quizPoints}
                      onChange={(e) => setQuizPoints(e.target.value)}
                      placeholder="100"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={quizPassingScore}
                      onChange={(e) => setQuizPassingScore(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Available From</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={quizAvailableDate}
                        onChange={(e) => setQuizAvailableDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        max={maxDateStr}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Blank = open immediately</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={quizDueDate}
                        onChange={(e) => setQuizDueDate(e.target.value)}
                        min={quizAvailableDate || new Date().toISOString().split('T')[0]}
                        max={maxDateStr}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Question Section */}
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Add Question Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                  {[
                    { type: 'multiple-choice', label: 'Multiple Choice', icon: '●' },
                    { type: 'true-false', label: 'True / False', icon: '⊙' },
                    { type: 'checkbox', label: 'Checkboxes', icon: '☑' },
                    { type: 'dropdown', label: 'Dropdown', icon: '▼' },
                    { type: 'short-answer', label: 'Short Answer', icon: '✎' },
                    { type: 'paragraph', label: 'Paragraph', icon: '¶' },
                    { type: 'linear-scale', label: 'Linear Scale', icon: '⎯' },
                    { type: 'multiple-grid', label: 'Grid (MC)', icon: '▦' },
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCurrentQuestionType(item.type)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        currentQuestionType === item.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      title={
                        item.type === 'multiple-choice' ? 'Select one answer from multiple options' :
                        item.type === 'true-false' ? 'Binary choice question' :
                        item.type === 'checkbox' ? 'Select multiple correct answers' :
                        item.type === 'dropdown' ? 'Choose from a dropdown list' :
                        item.type === 'short-answer' ? 'Brief text response' :
                        item.type === 'paragraph' ? 'Long text response' :
                        item.type === 'linear-scale' ? 'Rate on a scale' :
                        'Matrix of options'
                      }
                    >
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-xs font-medium">{item.label}</div>
                    </button>
                  ))}
                </div>

                {/* Question Type Description */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {currentQuestionType === 'multiple-choice' && '✓ Single answer selection - Perfect for knowledge tests and quizzes'}
                    {currentQuestionType === 'true-false' && '✓ Binary choice - Great for quick comprehension checks'}
                    {currentQuestionType === 'checkbox' && '✓ Multiple selections - Ideal for identifying all correct concepts'}
                    {currentQuestionType === 'dropdown' && '✓ Dropdown selection - Useful for long option lists'}
                    {currentQuestionType === 'short-answer' && '✓ Brief text response - For quick answers or keywords'}
                    {currentQuestionType === 'paragraph' && '✓ Extended response - Perfect for essays and detailed feedback'}
                    {currentQuestionType === 'linear-scale' && '✓ Rating scale - Great for surveys and satisfaction feedback'}
                    {currentQuestionType === 'multiple-grid' && '✓ Matrix questions - Compare multiple items across options'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>

              {/* Assessment Settings - Customization */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {assessmentType === 'quiz' ? 'Quiz Settings' : 'Survey Settings'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentSettings.shuffleQuestions}
                      onChange={(e) => updateAssessmentSetting('shuffleQuestions', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Shuffle Question Order</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentSettings.shuffleAnswers}
                      onChange={(e) => updateAssessmentSetting('shuffleAnswers', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Shuffle Answer Options</span>
                  </label>
                  {assessmentType === 'quiz' && (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assessmentSettings.showScore}
                          onChange={(e) => updateAssessmentSetting('showScore', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Show Score After Submit</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assessmentSettings.showCorrectAnswers}
                          onChange={(e) => updateAssessmentSetting('showCorrectAnswers', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Show Correct Answers</span>
                      </label>
                    </>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentSettings.allowReview}
                      onChange={(e) => updateAssessmentSetting('allowReview', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow Responses Review</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentSettings.oneResponsePerUser}
                      onChange={(e) => updateAssessmentSetting('oneResponsePerUser', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Limit to 1 Response/User</span>
                  </label>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={assessmentSettings.customColor}
                        onChange={(e) => updateAssessmentSetting('customColor', e.target.value)}
                        className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">{assessmentSettings.customColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              {quizQuestions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Questions ({quizQuestions.length})</h3>
                    <span className="text-sm text-gray-500">
                      Total: {quizQuestions.reduce((sum, q) => sum + (parseInt(q.points) || 0), 0)} points
                    </span>
                  </div>

                  {quizQuestions.map((question, qIndex) => (
                    <div key={question.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Question Header */}
                      <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                            <span className="font-semibold text-gray-700">Q{qIndex + 1}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            question.type === 'multiple-choice' ? 'bg-blue-100 text-blue-700' :
                            question.type === 'true-false' ? 'bg-green-100 text-green-700' :
                            question.type === 'short-answer' ? 'bg-purple-100 text-purple-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {question.type === 'multiple-choice' ? 'Multiple Choice' :
                             question.type === 'true-false' ? 'True/False' :
                             question.type === 'short-answer' ? 'Short Answer' : 'Checkboxes'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
                            placeholder="Pts"
                          />
                          <span className="text-xs text-gray-500">pts</span>
                          <button
                            type="button"
                            onClick={() => deleteQuestion(question.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Content */}
                      <div className="p-5 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                          <textarea
                            value={question.question}
                            onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                            placeholder="Enter your question here..."
                            rows={2}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                          />
                        </div>

                        {/* Options for Multiple Choice and True/False */}
                        {(question.type === 'multiple-choice' || question.type === 'true-false' || question.type === 'checkbox') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {question.type === 'checkbox' ? 'Options (select all correct answers)' : 'Options (select correct answer)'}
                            </label>
                            <div className="space-y-2">
                              {question.options.map((option, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-3">
                                  {question.type === 'checkbox' ? (
                                    <input
                                      type="checkbox"
                                      checked={Array.isArray(question.correctAnswer) && question.correctAnswer.includes(oIndex)}
                                      onChange={() => {
                                        const current = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
                                        const newAnswer = current.includes(oIndex) 
                                          ? current.filter(i => i !== oIndex)
                                          : [...current, oIndex];
                                        updateQuestion(question.id, 'correctAnswer', newAnswer);
                                      }}
                                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => updateQuestion(question.id, 'correctAnswer', oIndex)}
                                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                        question.correctAnswer === oIndex 
                                          ? 'border-green-500 bg-green-500' 
                                          : 'border-gray-300 hover:border-gray-400'
                                      }`}
                                    >
                                      {question.correctAnswer === oIndex && (
                                        <Check className="w-4 h-4 text-white" />
                                      )}
                                    </button>
                                  )}
                                  {question.type === 'true-false' ? (
                                    <span className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
                                      {option}
                                    </span>
                                  ) : (
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                                      placeholder={`Option ${oIndex + 1}`}
                                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                  )}
                                  {question.type !== 'true-false' && question.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(question.id, oIndex)}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {question.type !== 'true-false' && question.options.length < 6 && (
                              <button
                                type="button"
                                onClick={() => addOption(question.id)}
                                className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                <Plus className="w-4 h-4" />
                                Add Option
                              </button>
                            )}
                          </div>
                        )}

                        {/* Short Answer */}
                        {question.type === 'short-answer' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Answer (for reference)</label>
                            <input
                              type="text"
                              value={question.correctAnswer || ''}
                              onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                              placeholder="Enter the expected answer..."
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                          </div>
                        )}

                        {/* Paragraph Answer */}
                        {question.type === 'paragraph' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Answer Guidelines (optional)</label>
                            <textarea
                              value={question.correctAnswer || ''}
                              onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                              placeholder="Enter guidelines or expected content for this answer..."
                              rows={3}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                            />
                          </div>
                        )}

                        {/* Dropdown */}
                        {question.type === 'dropdown' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Dropdown Options</label>
                            <div className="space-y-2">
                              {question.options.map((option, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(question.id, 'correctAnswer', oIndex)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                      question.correctAnswer === oIndex 
                                        ? 'border-green-500 bg-green-500' 
                                        : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    {question.correctAnswer === oIndex && (
                                      <Check className="w-4 h-4 text-white" />
                                    )}
                                  </button>
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                                    placeholder={`Option ${oIndex + 1}`}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                  />
                                  {question.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(question.id, oIndex)}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {question.options.length < 10 && (
                              <button
                                type="button"
                                onClick={() => addOption(question.id)}
                                className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                <Plus className="w-4 h-4" />
                                Add Option
                              </button>
                            )}
                          </div>
                        )}

                        {/* Linear Scale */}
                        {question.type === 'linear-scale' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Low End Label</label>
                                <input
                                  type="text"
                                  value={question.scaleMin || ''}
                                  onChange={(e) => updateQuestion(question.id, 'scaleMin', e.target.value)}
                                  placeholder="e.g., Not satisfied"
                                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">High End Label</label>
                                <input
                                  type="text"
                                  value={question.scaleMax || ''}
                                  onChange={(e) => updateQuestion(question.id, 'scaleMax', e.target.value)}
                                  placeholder="e.g., Very satisfied"
                                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Scale Range (1-10)</label>
                              <input
                                type="number"
                                value={question.scaleRange || 5}
                                onChange={(e) => updateQuestion(question.id, 'scaleRange', Math.min(10, Math.max(2, parseInt(e.target.value))))}
                                min="2"
                                max="10"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              />
                            </div>
                          </div>
                        )}

                        {/* Multiple Choice Grid */}
                        {question.type === 'multiple-grid' && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Rows (Questions)</label>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {question.rows && question.rows.map((row, rIndex) => (
                                  <div key={rIndex} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={row}
                                      onChange={(e) => {
                                        const newRows = [...question.rows];
                                        newRows[rIndex] = e.target.value;
                                        updateQuestion(question.id, 'rows', newRows);
                                      }}
                                      placeholder={`Row ${rIndex + 1}`}
                                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    {question.rows.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newRows = question.rows.filter((_, i) => i !== rIndex);
                                          updateQuestion(question.id, 'rows', newRows);
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newRows = [...(question.rows || []), ''];
                                  updateQuestion(question.id, 'rows', newRows);
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                <Plus className="w-4 h-4" />
                                Add Row
                              </button>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Columns (Options)</label>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {question.columns && question.columns.map((col, cIndex) => (
                                  <div key={cIndex} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={col}
                                      onChange={(e) => {
                                        const newCols = [...question.columns];
                                        newCols[cIndex] = e.target.value;
                                        updateQuestion(question.id, 'columns', newCols);
                                      }}
                                      placeholder={`Column ${cIndex + 1}`}
                                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    {question.columns.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newCols = question.columns.filter((_, i) => i !== cIndex);
                                          updateQuestion(question.id, 'columns', newCols);
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newCols = [...(question.columns || []), ''];
                                  updateQuestion(question.id, 'columns', newCols);
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                <Plus className="w-4 h-4" />
                                Add Column
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {quizQuestions.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-1">No questions added yet</p>
                  <p className="text-sm text-gray-400">Select a question type above and click "Add Question"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                {quizQuestions.length > 0 && (
                  <span>{quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''} • {quizQuestions.reduce((sum, q) => sum + (parseInt(q.points) || 0), 0)} points</span>
                )}
              </div>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:gap-3">
                <button 
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="w-full px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors sm:w-auto"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSaveQuizDraft}
                  disabled={!quizTitle || isSubmittingQuiz || isPublishingQuiz}
                  className={`flex w-full items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all sm:w-auto ${
                    !quizTitle || isSubmittingQuiz || isPublishingQuiz
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-slate-600 text-white hover:bg-slate-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {isSubmittingQuiz ? 'Saving...' : currentQuizDraftId ? 'Save Changes' : 'Save Draft'}
                </button>
                {currentQuizStatus === 'draft' && (
                  <button
                    type="button"
                    onClick={handlePublishQuiz}
                    disabled={!quizTitle || quizQuestions.length === 0 || isSubmittingQuiz || isPublishingQuiz || !currentQuizDraftId}
                    className={`flex w-full items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all sm:w-auto ${
                      !quizTitle || quizQuestions.length === 0 || isSubmittingQuiz || isPublishingQuiz || !currentQuizDraftId
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {isPublishingQuiz ? 'Publishing...' : 'Publish'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {selectedPost.authorAvatar ? (
                    <img src={selectedPost.authorAvatar} alt={selectedPost.author} className="w-full h-full object-cover" />
                  ) : (
                    (selectedPost.author || 'T').split(' ').map(n => n[0]).join('').toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedPost.author || 'Trainor'}</p>
                  <p className="text-xs text-gray-500">
                    {formatAbsoluteTime(selectedPost.createdAt)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  // Cleanup subscription when closing
                  if (commentUnsubscribeRef.current) {
                    commentUnsubscribeRef.current();
                    commentUnsubscribeRef.current = null;
                  }
                  setShowPostModal(false);
                  setSelectedPost(null);
                  setPostComments([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Message Content */}
              <div>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">
                  {selectedPost.message}
                </p>
              </div>

              {/* Attachments */}
              {selectedPost.attachments && selectedPost.attachments.length > 0 && (
                <div>
                  <div className="space-y-2">
                    {selectedPost.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                      >
                        <Paperclip className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        <span className="text-sm text-gray-700 group-hover:text-blue-600 font-medium flex-1 truncate">
                          {attachment.name || `Attachment ${idx + 1}`}
                        </span>
                        <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Comments ({postComments.length})</h4>
                
                <div className="space-y-4 mb-6">
                  {loadingComments ? (
                    <div className="text-center py-8">
                      <div className="animate-spin inline-block w-6 h-6 border-3 border-gray-300 border-t-blue-600 rounded-full"></div>
                      <p className="text-gray-500 text-sm mt-2">Loading comments...</p>
                    </div>
                  ) : postComments.length > 0 ? (
                    postComments.map((comment, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                          {comment.authorAvatar ? (
                            <img src={comment.authorAvatar} alt={comment.author} className="w-full h-full object-cover" />
                          ) : (
                            (comment.author || 'U').split(' ').map(n => n[0]).join('').toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-gray-900 text-sm">{comment.author}</p>
                            {comment.authorId === user?.uid && (
                              <button
                                onClick={async () => {
                                  try {
                                    await handleDeleteComment(comment.id);
                                  } catch (error) {
                                    console.error('Error deleting comment:', error);
                                  }
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {formatAbsoluteTime(comment.createdAt)}
                          </p>
                          <p className="text-gray-700 text-sm">{comment.message || comment.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-6">No comments yet. Be the first!</p>
                  )}
                </div>

                {/* Comment Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && newComment.trim()) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-gray-50"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex-shrink-0 h-fit disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {showAttachmentPreview && selectedAttachment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedAttachment.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Size: {(selectedAttachment.size / 1024).toFixed(2)} KB | Type: {selectedAttachment.type || 'Unknown'}</p>
              </div>
              <button 
                onClick={() => {
                  setShowAttachmentPreview(false);
                  setSelectedAttachment(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-4 w-full">
                {selectedAttachment.base64 && (
                  <>
                    {/* Image Preview */}
                    {['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'].includes(selectedAttachment.type) ? (
                      <>
                        <img 
                          src={`data:${selectedAttachment.type};base64,${selectedAttachment.base64}`}
                          alt={selectedAttachment.name}
                          className="max-w-full max-h-[60vh] rounded-lg shadow-lg"
                        />
                        <p className="text-center text-gray-600 text-sm">Image Preview</p>
                      </>
                    ) : selectedAttachment.type === 'application/pdf' ? (
                      <>
                        <iframe 
                          src={`data:application/pdf;base64,${selectedAttachment.base64}`}
                          title={selectedAttachment.name}
                          className="w-full max-h-[60vh] rounded-lg border border-gray-200"
                        />
                        <p className="text-center text-gray-600 text-sm">PDF Preview</p>
                      </>
                    ) : (
                      <>
                        <FileText className="w-16 h-16 text-gray-400 mb-2" />
                        <p className="text-center text-gray-600 font-medium">{selectedAttachment.name}</p>
                        <p className="text-center text-gray-500 text-sm max-w-md">
                          This file type cannot be previewed in the browser. Please download to view.
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 flex-shrink-0 bg-gray-50">
              <button
                onClick={() => {
                  setShowAttachmentPreview(false);
                  setSelectedAttachment(null);
                }}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownloadAttachment(selectedAttachment);
                  setShowAttachmentPreview(false);
                  setSelectedAttachment(null);
                }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetail;
