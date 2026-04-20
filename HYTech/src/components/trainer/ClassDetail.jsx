import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Check, Users, Save, ExternalLink, Calendar, Send, FileText, Video, Copy, Share2, Loader, AlertCircle, X, MessageSquare, Paperclip, ClipboardList, Edit2, Trash2, Download, Eye, Plus, Settings, GripVertical, Upload, Bell, MessageCircle as DiscussionIcon, Award, Clock } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { getCourseByName, getCourseTemplateById, getCourseEnrollmentsWithAvatars, getSectorById, getAnnouncements, subscribeToAnnouncements, createAnnouncement, getModules, createModule, getAssessments, createAssessment, updateAnnouncement, deleteAnnouncement, updateAssessment, deleteAssessment, getClassActivityFeed, storeAnnouncementAttachment, uploadMaterial, compressAndStoreFile, addCommentToAnnouncement, getAnnouncementComments, deleteComment, subscribeToComments, downloadAttachment, createAssignment, getAssignments, removeEnrollment, getUserProfile, subscribeToEnrollments, getAssessmentAttempts, createMaterial, getClassMaterials, publishMaterial, unpublishMaterial, updateMaterial, deleteMaterial, createTopic, getClassTopics, subscribeToClassTopics, updateTopic, deleteTopic, publishTopic, unpublishTopic } from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';

const ClassDetail = () => {
  const { className } = useParams();
  const decodedClassName = decodeURIComponent(className);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [classData, setClassData] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [sectorName, setSectorName] = useState('N/A');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
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
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('');
  // Form Builder States for Assignment/Material Creation
  const [formBuilderTitle, setFormBuilderTitle] = useState('');
  const [formBuilderDescription, setFormBuilderDescription] = useState('');
  const [formBuilderQuestions, setFormBuilderQuestions] = useState([]);
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
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [assessmentType, setAssessmentType] = useState('quiz'); // quiz, survey, form
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('');
  const [quizPoints, setQuizPoints] = useState('100');
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionType, setCurrentQuestionType] = useState('multiple-choice');
  // Material Upload States
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
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
  const [assessmentResponses, setAssessmentResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
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
          const initials = (user?.displayName || user?.email || 'Trainer')
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
                  let studentName = 'Unknown Student';
                  
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
                      studentName = studentProfile.email.split('@')[0];
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
                    studentName: 'Unknown Student',
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
  const handleSaveItem = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmittingItem) return;
    
    if (!formBuilderTitle.trim()) {
      addToast('Title is required', 'error');
      return;
    }

    // Validate based on create type
    if (createType === 'Quiz Assignment') {
      if (formBuilderQuestions.length === 0) {
        addToast('Please add at least one question to the quiz', 'error');
        return;
      }
    } else {
      // For regular assignments, require either description or questions
      if (!formBuilderDescription.trim() && formBuilderQuestions.length === 0) {
        addToast('Please add a description or at least one question', 'error');
        return;
      }
    }

    setIsSubmittingItem(true);
    try {
      // Format due date with time (default 11:59 PM if not set)
      let formattedDueDate = null;
      if (formBuilderDueDate) {
        const dueDate = new Date(formBuilderDueDate);
        dueDate.setHours(23, 59, 0, 0); // Set to 11:59 PM
        formattedDueDate = dueDate.toISOString();
      }

      // EDIT MODE - Update existing assignment
      if (isFormBuilderEditMode && editingAssignmentId) {
        const updatedAssignmentData = {
          title: formBuilderTitle.trim(),
          message: formBuilderDescription.trim(),
          questions: formBuilderQuestions,
          dueDate: formattedDueDate,
          points: parseInt(formBuilderPoints) || 100,
          lastModified: new Date().toISOString()
        };

        // Update in activity feed
        setActivityFeed(prev =>
          prev.map(item =>
            item.id === editingAssignmentId
              ? { ...item, ...updatedAssignmentData }
              : item
          )
        );

        // Update in assignments array
        setAssignments(prev =>
          prev.map(a =>
            a.id === editingAssignmentId
              ? { ...a, ...updatedAssignmentData }
              : a
          )
        );

        // Update selected assignment in detail modal (if still open after closing)
        if (selectedAssignmentDetail && selectedAssignmentDetail.id === editingAssignmentId) {
          setSelectedAssignmentDetail(prev => ({ ...prev, ...updatedAssignmentData }));
        }

        addToast('Assignment updated successfully!', 'success');
      } else {
        // CREATE MODE - Create new assignment
        const itemData = {
          title: formBuilderTitle.trim(),
          description: formBuilderDescription.trim(),
          type: createType,
          questions: formBuilderQuestions,
          dueDate: formattedDueDate,
          points: parseInt(formBuilderPoints) || 100,
          createdBy: user?.displayName || user?.email || 'Trainer',
          createdById: user?.uid,
          createdAt: new Date().toISOString(),
          status: 'active'
        };

        // Save based on type
        if (createType === 'Quiz Assignment') {
          // Create assessment for quiz assignments
          const newAssessment = await createAssessment(classData.id, {
            title: itemData.title,
            description: itemData.description,
            type: 'quiz',
            questions: itemData.questions,
            dueDate: formattedDueDate,
            totalPoints: parseInt(formBuilderPoints) || 100,
            author: itemData.createdBy,
            authorId: itemData.createdById,
            createdByAvatar: currentUserAvatar || null
          });

          // Fetch updated assessments to reflect in activity feed
          const updatedAssessments = await getAssessments(classData.id);
          
          // Add to activity feed for real-time update
          const newAssessmentItem = {
            id: newAssessment?.id || `assess_${Date.now()}`,
            type: 'assignment',
            title: itemData.title,
            author: itemData.createdBy,
            authorId: itemData.createdById,
            preview: itemData.description?.substring(0, 50) + '...' || 'Quiz Assignment',
            fullMessage: itemData.description,
            createdAt: new Date().toISOString(),
            dueDate: formattedDueDate,
            points: parseInt(formBuilderPoints) || 100,
            authorAvatar: currentUserAvatar || null
          };

          setActivityFeed(prev => [newAssessmentItem, ...prev]);
        } else {
          // Create assignment for assignments/materials (shows in activity with proper formatting)
          const newAssignment = await createAssignment(classData.id, {
            title: itemData.title,
            description: itemData.description,
            type: createType,
            author: itemData.createdBy,
            authorId: itemData.createdById,
            createdByAvatar: currentUserAvatar || null,
            dueDate: formattedDueDate,
            points: itemData.points,
            questions: itemData.questions
          });

          // Reload assignments to show in activity feed
          const updatedAssignments = await getAssignments(classData.id);
          setAssignments(updatedAssignments);

          // Immediately add to activity feed for real-time update (no refresh needed)
          const newAssignmentItem = {
            id: newAssignment?.id || `assign_${Date.now()}`,
            type: 'assignment',
            itemType: createType,
            title: itemData.title,
            message: itemData.description,
            author: itemData.createdBy,
            authorId: itemData.createdById,
            dueDate: formattedDueDate,
            points: itemData.points,
            questions: itemData.questions || [],
            timestamp: new Date(),
            preview: itemData.description?.substring(0, 50) + '...' || createType,
            createdAt: new Date().toISOString()
          };

          setActivityFeed(prev => [newAssignmentItem, ...prev]);
        }

        addToast(`${createType} created successfully!`, 'success');
      }

      // Reset form
      setFormBuilderTitle('');
      setFormBuilderDescription('');
      setFormBuilderQuestions([]);
      setFormBuilderDueDate('');
      setFormBuilderPoints('100');
      setShowCreateModal(false);
      setCreateType('');
      setIsFormBuilderEditMode(false);
      setEditingAssignmentId(null);
    } catch (error) {
      console.error('Error saving item:', error);
      const action = isFormBuilderEditMode ? 'update' : 'create';
      addToast(`Failed to ${action} ${createType}: ${error.message}`, 'error');
    } finally {
      // Reset submission flag to allow future submissions
      setIsSubmittingItem(false);
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
        author: user?.displayName || user?.email || 'Trainer',
        authorId: user?.uid,
        attachments: [],
        filesBase64: [],
        topicId: selectedTopicId || null,
      };

      // If files selected, upload them
      if (materialFiles && materialFiles.length > 0) {
        try {
          for (const file of materialFiles) {
            // Store attachment metadata
            const attachmentData = {
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString()
            };

            materialData.attachments.push(attachmentData);

            // Compress and get base64
            const compressedFile = await compressAndStoreFile(file);
            materialData.filesBase64.push(compressedFile.base64);
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

        addToast('Material saved as draft! Click "Publish" to make it visible to students.', 'success');
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

      addToast('Material published successfully! Students can now see it.', 'success');

      // Close modal and reset form
      setShowCreateModal(false);
      setMaterialTitle('');
      setMaterialDescription('');
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

      addToast('Material unpublished. Students can no longer see it.', 'success');
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
        author: user?.displayName || user?.email || 'Trainer',
        authorId: user?.uid,
      };

      // CREATE MODE - Save as draft
      if (!selectedTopicId) {
        const savedTopic = await createTopic(classData.id, topicData);
        setTopics(prev => [savedTopic, ...prev]);
        addToast('Topic saved as draft! Click "Publish" to make it visible to students.', 'success');
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

      addToast('Topic unpublished. Students can no longer see it.', 'success');
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
        author: user?.displayName || user?.email || 'Trainer',
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
        author: user?.displayName || user?.email || 'Trainer',
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
          const compressedFile = await compressAndStoreFile(announcementFile);
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
      await updateAnnouncement(classData.id, announcementId, {
        title: 'Announcement',
        message: newMessage.trim(),
        attachments: []
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
        
        setSelectedPost(completePost);
        
        // Load comments initially, then set up live subscription
        try {
          const initialComments = await getAnnouncementComments(classData.id, post.id);
          setPostComments(initialComments);
          setLoadingComments(false);
          
          // Now set up real-time subscription for live updates
          commentUnsubscribeRef.current = subscribeToComments(
            classData.id, 
            post.id, 
            (comments) => {
              setPostComments(comments);
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

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    
    try {
      await addCommentToAnnouncement(classData.id, selectedPost.id, {
        author: user?.displayName || user?.email || 'User',
        authorId: user?.uid,
        message: newComment.trim()
      });
      addToast('Comment added!', 'success');
      setNewComment('');
      
      // Reload comments
      const comments = await getAnnouncementComments(classData.id, selectedPost.id);
      setPostComments(comments);
    } catch (err) {
      console.error('Error adding comment:', err);
      addToast('Failed to add comment', 'error');
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await deleteComment(classData.id, selectedPost.id, commentId);
        addToast('Comment deleted!', 'success');
        
        // Reload comments
        const comments = await getAnnouncementComments(classData.id, selectedPost.id);
        setPostComments(comments);
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
        addToast('Failed to remove student', 'error');
      }
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

  // Handle invite students
  const handleInviteStudents = (e) => {
    e.preventDefault();
    addToast('Invitation sent successfully!');
    setShowInviteModal(false);
  };

  // Handle Google Meet
  const handleStartMeeting = async () => {
    try {
      // Generate a random meeting ID
      const meetingId = 'qqi-nwwk-txb';
      const link = `https://meet.google.com/qqi-nwwk-txb`;
      setMeetingLink(link);
      
      const trainerName = user?.displayName || courseData?.trainer || 'Trainer';
      
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
      setQuizTitle('');
      setQuizDescription('');
      setQuizTimeLimit('');
      setQuizPoints('100');
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
      setMaterialFiles([]);
      setCurrentMaterialId(null);
      setShowCreateModal(true);
    } else {
      // Reset form builder state to clear previous data
      setFormBuilderTitle('');
      setFormBuilderDescription('');
      setFormBuilderQuestions([]);
      setFormBuilderDueDate('');
      setFormBuilderPoints('100');
      setIsFormBuilderEditMode(false);
      setEditingAssignmentId(null);
      setShowCreateModal(true);
    }
  };

  // Quiz/Assessment Functions
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

  const handleSaveQuiz = async () => {
    // Prevent duplicate submissions
    if (isSubmittingQuiz) return;
    
    if (!quizTitle.trim()) {
      addToast('Please enter a quiz title', 'error');
      return;
    }
    if (quizQuestions.length === 0) {
      addToast('Please add at least one question', 'error');
      return;
    }

    setIsSubmittingQuiz(true);
    try {
      const quizData = {
        title: quizTitle,
        description: quizDescription,
        type: assessmentType,
        timeLimit: quizTimeLimit ? parseInt(quizTimeLimit) : null,
        totalPoints: parseInt(quizPoints) || 100,
        questions: quizQuestions,
        settings: assessmentSettings,
        createdAt: new Date().toISOString(),
        author: user?.displayName || 'Trainer',
        authorId: user?.uid,
        createdByAvatar: null
      };

      await createAssessment(classData.id, quizData);
      addToast(`${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} created successfully!`, 'success');
      
      // Reset form
      setShowQuizModal(false);
      setQuizTitle('');
      setQuizDescription('');
      setQuizTimeLimit('');
      setQuizPoints('100');
      setQuizQuestions([]);
      setCurrentQuestionType('multiple-choice');
      setAssessmentType('quiz');
    } catch (error) {
      console.error('Error creating assessment:', error);
      addToast(`Failed to create ${assessmentType}`, 'error');
    } finally {
      // Reset submission flag to allow future submissions
      setIsSubmittingQuiz(false);
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'modules', label: 'Modules', icon: FileText },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'responses', label: 'Responses', icon: FileText },
    { id: 'students', label: 'Students', icon: Users },
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
        <div className="px-6 flex gap-8">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-0 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
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

      <div className="px-6 py-8">
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
                        <span>{enrollments.length} students enrolled</span>
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
                        {(user?.displayName || user?.email || 'Trainer').split(' ').map(n => n[0]).join('').toUpperCase()}
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
                <div className="divide-y divide-gray-100">
                  {loadingAnnouncements ? (
                    <div className="p-5 text-center">
                      <div className="inline-block animate-spin">
                        <div className="w-6 h-6 border-3 border-gray-300 border-t-blue-600 rounded-full"></div>
                      </div>
                      <p className="text-gray-500 mt-2">Loading activity...</p>
                    </div>
                  ) : activityFeed.length > 0 ? (
                    activityFeed.map((item, index) => {
                      // Determine activity type and styling
                      let icon = null;
                      let iconBgColor = 'bg-orange-100';
                      let iconColor = 'text-orange-600';
                      let actionText = 'made an announcement';

                      // Handle assignment items
                      if (item.type === 'assignment') {
                        iconBgColor = 'bg-blue-100';
                        iconColor = 'text-blue-600';
                        actionText = `posted a ${item.itemType.toLowerCase()}`;
                        icon = <ClipboardList className="w-5 h-5" />;
                      } else if (item.hasAttachments) {
                        const fileType = item.attachments[0].type?.toLowerCase() || '';
                        if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('word') || fileType.includes('sheet')) {
                          iconBgColor = 'bg-blue-100';
                          iconColor = 'text-blue-600';
                          actionText = 'uploaded new learning material';
                          icon = <Upload className="w-5 h-5" />;
                        }
                      }

                      // Calculate relative time
                      const getRelativeTime = (date) => {
                        if (!(date instanceof Date)) {
                          date = new Date(date);
                        }
                        const now = new Date();
                        const diffMs = now - date;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);

                        if (diffMins < 1) return 'just now';
                        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
                        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      };

                      // Default icon if not set
                      if (!icon) {
                        icon = <Bell className="w-5 h-5" />;
                      }

                      return (
                        <div key={item.id || index} className="p-5 hover:bg-gray-50 transition-colors group border-l-4 border-transparent hover:border-blue-400">
                          {editingAnnouncementId === item.id && item.type === 'announcement' ? (
                            <div className="space-y-3">
                              <textarea
                                value={editingAnnouncementText}
                                onChange={(e) => setEditingAnnouncementText(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="Edit announcement..."
                                rows="3"
                              />
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
                            <>
                              <div 
                                onClick={() => {
                                  if (item.type === 'announcement') {
                                    handleOpenPost(item);
                                  } else if (item.type === 'assignment') {
                                    setSelectedAssignmentDetail(item);
                                    setAssignmentDetailTab('questions');
                                    setShowAssignmentDetailModal(true);
                                  }
                                }}
                                className={item.type === 'announcement' || item.type === 'assignment' ? 'flex gap-4 cursor-pointer' : 'flex gap-4'}
                              >
                                {/* Avatar with Icon Badge Overlay */}
                                <div className="relative flex-shrink-0">
                                  {item.authorAvatar ? (
                                    <img 
                                      src={item.authorAvatar} 
                                      alt={item.author}
                                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                      {item.author?.charAt(0).toUpperCase() || 'T'}
                                    </div>
                                  )}
                                  {/* Icon Badge Overlay */}
                                  <div className={`absolute -bottom-0 -right-0 w-6 h-6 ${iconBgColor} rounded-full flex items-center justify-center ${iconColor} border-2 border-white shadow-sm`}>
                                    <div className="w-3.5 h-3.5 flex items-center justify-center">
                                      {icon}
                                    </div>
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-1">
                                  {/* Author & Action */}
                                  <div className="mb-1">
                                    <span className="font-semibold text-gray-900">{item.author || 'Trainer'}</span>
                                    <span className="text-gray-600 ml-1">{actionText}</span>
                                  </div>

                                  {/* Title/Subject */}
                                  <p className="text-gray-900 font-medium mb-2 text-sm line-clamp-2">
                                    {item.title || (item.message?.length > 100 
                                      ? item.message.substring(0, 100) + '...' 
                                      : item.message)}
                                  </p>

                                  {/* Assignment-specific details */}
                                  {item.type === 'assignment' && (
                                    <div className="bg-blue-50 rounded-lg p-3 mb-3 text-xs space-y-1">
                                      {item.dueDate && (
                                        <div className="flex items-center gap-2 text-gray-700">
                                          <Calendar className="w-3 h-3" />
                                          <span>Due: {new Date(item.dueDate).toLocaleDateString()} at 11:59 PM</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-gray-700">
                                        <Award className="w-3 h-3" />
                                        <span>{item.points} points</span>
                                      </div>
                                      {item.questions && item.questions.length > 0 && (
                                        <div className="flex items-center gap-2 text-gray-700">
                                          <ClipboardList className="w-3 h-3" />
                                          <span>{item.questions.length} question{item.questions.length !== 1 ? 's' : ''}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Timestamp & Attachments */}
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {getRelativeTime(item.timestamp || item.createdAt)}
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
                                      handleOpenPost(announcement);
                                    }}
                                    className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                                    title="View details and comments"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {item.type === 'announcement' && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingAnnouncementId(item.id);
                                          setEditingAnnouncementText(item.message);
                                        }}
                                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                                        title="Edit announcement"
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
                                    </>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No activity yet</p>
                      <p className="text-gray-400 text-sm mt-1">Post an announcement or create an assignment to get started</p>
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
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">Modules</h3>
              <div className="relative">
                <button
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 font-semibold transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Content
                </button>

                {/* Create Dropdown Menu */}
                {showCreateDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
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
                          setCreateType('material');
                          setShowCreateDropdown(false);
                          setShowCreateModal(true);
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left mb-2"
                      >
                        <Upload className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">Materials</p>
                          <p className="text-xs text-gray-600">Learning resource</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Published Materials and Topics List */}
            {materials.length === 0 && topics.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No modules yet. Create your first module to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Topics (Sections) with Materials inside */}
                {topics.map((topic) => {
                  const topicMaterials = materials.filter(m => m.isPublished && m.topicId === topic.id);
                  const isExpanded = expandedTopics[topic.id] !== false; // Default to expanded
                  
                  return (
                    <div key={topic.id} className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
                      {/* Topic Header */}
                      <button
                        onClick={() => setExpandedTopics(prev => ({ ...prev, [topic.id]: !prev[topic.id] }))}
                        className="w-full flex items-center justify-between p-4 hover:bg-blue-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-blue-200 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-semibold text-blue-900">{topic.title}</h4>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                topic.isPublished 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {topic.isPublished ? 'Published' : 'Draft'}
                              </span>
                            </div>
                            {topic.description && (
                              <p className="text-sm text-blue-700 mt-1 line-clamp-1">{topic.description}</p>
                            )}
                          </div>
                          <span className="text-sm font-medium text-blue-700 bg-blue-200 px-3 py-1 rounded-full">
                            {topicMaterials.length} {topicMaterials.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <div className="p-2 text-blue-600">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </button>

                      {/* Topic Materials */}
                      {isExpanded && (
                        <div className="border-t border-blue-200 bg-white">
                          {topicMaterials.length === 0 ? (
                            <div className="p-6 text-center text-blue-600">
                              <p className="text-sm">No materials in this topic yet</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-blue-200">
                              {topicMaterials.map((material) => (
                                <div key={material.id} className="p-4 hover:bg-blue-50 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div 
                                      className="flex-1 cursor-pointer"
                                      onClick={() => {
                                        setSelectedMaterialForView(material);
                                        setShowMaterialViewModal(true);
                                      }}
                                    >
                                      <h5 className="font-medium text-gray-900 hover:text-blue-600">{material.title}</h5>
                                      {material.description && (
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{material.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                        <span>By {material.author}</span>
                                        {material.attachments && material.attachments.length > 0 && (
                                          <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                              <Paperclip className="w-3 h-3" />
                                              {material.attachments.length} file{material.attachments.length !== 1 ? 's' : ''}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <button
                                        onClick={() => {
                                          setMaterialTitle(material.title);
                                          setMaterialDescription(material.description || '');
                                          setMaterialFiles([]);
                                          setCurrentMaterialId(material.id);
                                          setCreateType('material');
                                          setShowCreateModal(true);
                                        }}
                                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                                        title="Edit material"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (window.confirm('Are you sure you want to delete this material?')) {
                                            try {
                                              await deleteMaterial(classData.id, material.id);
                                              setMaterials(prev => prev.filter(m => m.id !== material.id));
                                              if (currentMaterialId === material.id) {
                                                setCurrentMaterialId(null);
                                              }
                                              addToast('Material deleted successfully', 'success');
                                            } catch (err) {
                                              addToast('Failed to delete material', 'error');
                                            }
                                          }
                                        }}
                                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                                        title="Delete material"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Topic Actions */}
                      <div className="border-t border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setMaterialTitle('');
                            setMaterialDescription('');
                            setMaterialFiles([]);
                            setCurrentMaterialId(null);
                            setCreateType('material');
                            setSelectedTopicId(topic.id);
                            setShowCreateModal(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Add Material to Topic
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setTopicTitle(topic.title);
                              setTopicDescription(topic.description || '');
                              setSelectedTopicId(topic.id);
                              setCreateType('topic');
                              setShowCreateModal(true);
                            }}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                            title="Edit topic"
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
                              if (window.confirm('Are you sure you want to delete this topic? Materials will not be deleted.')) {
                                try {
                                  await deleteTopic(classData.id, topic.id);
                                  setTopics(prev => prev.filter(t => t.id !== topic.id));
                                  addToast('Topic deleted successfully', 'success');
                                } catch (err) {
                                  addToast('Failed to delete topic', 'error');
                                }
                              }
                            }}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                            title="Delete topic"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Standalone Materials (not in any topic) */}
                {materials
                  .filter(material => material.isPublished && !material.topicId)
                  .map((material) => (
                    <div key={material.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedMaterialForView(material);
                            setShowMaterialViewModal(true);
                          }}
                        >
                          <h4 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">{material.title}</h4>
                          {material.description && (
                            <p className="text-gray-600 mt-2 line-clamp-2">{material.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 flex-wrap">
                            <span>By {material.author}</span>
                            <span>•</span>
                            <span>
                              {material.publishedAt ? (() => {
                                try {
                                  let date;
                                  if (typeof material.publishedAt === 'string') {
                                    date = new Date(material.publishedAt);
                                  } else if (material.publishedAt.toDate) {
                                    date = material.publishedAt.toDate();
                                  } else if (typeof material.publishedAt === 'number') {
                                    date = new Date(material.publishedAt);
                                  } else {
                                    return 'Date unavailable';
                                  }
                                  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                } catch {
                                  return 'Date unavailable';
                                }
                              })() : 'Date not available'}
                            </span>
                            {material.attachments && material.attachments.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                  <Paperclip className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{material.attachments.length} file{material.attachments.length !== 1 ? 's' : ''}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Published
                          </span>
                          <button
                            onClick={() => {
                              setMaterialTitle(material.title);
                              setMaterialDescription(material.description || '');
                              setMaterialFiles([]);
                              setCurrentMaterialId(material.id);
                              setCreateType('material');
                              setShowCreateModal(true);
                            }}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                            title="Edit material"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this material?')) {
                                try {
                                  await deleteMaterial(classData.id, material.id);
                                  setMaterials(prev => prev.filter(m => m.id !== material.id));
                                  if (currentMaterialId === material.id) {
                                    setCurrentMaterialId(null);
                                  }
                                  addToast('Material deleted successfully', 'success');
                                } catch (err) {
                                  addToast('Failed to delete material', 'error');
                                }
                              }
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                            title="Delete material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
                      <p className="font-medium text-green-600">Published</p>
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

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 shadow-sm">
                <p className="text-white/70 text-sm">Total Participants</p>
                <div className="mt-2 text-4xl font-bold">{enrollments.length + 1}</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
                  <Users className="w-4 h-4" />
                  Class members
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                <p className="text-gray-500 text-sm">Trainers</p>
                <div className="mt-2 text-4xl font-bold text-gray-900">1</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2 text-sm text-purple-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">T</span>
                  Lead trainer
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                <p className="text-gray-500 text-sm">Students</p>
                <div className="mt-2 text-4xl font-bold text-gray-900">{enrollments.length}</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <Users className="w-4 h-4" />
                  Enrolled learners
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                <p className="text-gray-500 text-sm">Avg. Completion</p>
                <div className="mt-2 text-4xl font-bold text-gray-900">
                  {enrollments.length > 0
                    ? `${Math.round(enrollments.reduce((sum, enrollment) => {
                        const progressValue = enrollment?.progress?.overallProgress ?? enrollment?.progress?.completion ?? enrollment?.progress?.percentage ?? 0;
                        return sum + Number(progressValue || 0);
                      }, 0) / enrollments.length)}%`
                    : '0%'}
                </div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  <Award className="w-4 h-4" />
                  Active progress
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

            <div className="gap-6">
              <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Students ({enrollments.length})</h3>
                    <p className="text-sm text-gray-500 mt-1">All enrolled students in this class</p>
                  </div>
                </div>

                <div className="p-5">
                  {enrollments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-10 text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Users className="w-10 h-10" />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900">Add Your First Student</h4>
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
                      {enrollments.map((enrollment) => {
                        const displayName = enrollment.studentName || enrollment.name || 'Student';
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
                                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-700 font-medium">
                                    {enrollment.status || 'Active'}
                                  </span>
                                  <span>Joined {enrollment.joinedAt ? new Date(enrollment.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="hidden sm:block text-right">
                                <p className="text-xs uppercase tracking-wide text-gray-400">Progress</p>
                                <p className="text-lg font-bold text-gray-900">{Math.round(Number(progressValue) || 0)}%</p>
                              </div>
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

        {/* Assessments Tab */}
        {activeTab === 'assessments' && (
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Assessments</h3>
              
              {/* Combined assessments and assignments */}
              {(() => {
                const allAssessments = [...(assessments || []), ...(assignments || [])];
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
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Type</th>
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
                                  <span className="font-semibold text-gray-900">{assessment.totalPoints || assessment.points || 0}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-gray-600">{assessment.duration || assessment.timeLimit || '-'} min</span>
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
                                  <button
                                    onClick={() => {
                                      setSelectedAssessmentForResponses(assessment);
                                      setActiveTab('responses');
                                    }}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                  >
                                    View Responses
                                  </button>
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

        {/* Responses Tab */}
        {activeTab === 'responses' && (
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Assessment Responses</h3>
              
              {/* Assessment Selection */}
              {!selectedAssessmentForResponses ? (
                <div className="space-y-6">
                  <p className="text-gray-600">Select an assessment to view and analyze student responses:</p>
                  {(() => {
                    const allAssessments = [...(assessments || []), ...(assignments || [])];
                    return allAssessments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allAssessments.map((assessment) => (
                          <button
                            key={assessment.id}
                            onClick={async () => {
                              setSelectedAssessmentForResponses(assessment);
                              setLoadingResponses(true);
                              try {
                                if (classData?.id) {
                                  const responses = await getAssessmentAttempts(classData.id, assessment.id);
                                  setAssessmentResponses(responses || []);
                                }
                              } catch (error) {
                                console.error('Error loading responses:', error);
                                addToast('Error loading responses', 'error');
                              } finally {
                                setLoadingResponses(false);
                              }
                            }}
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
                        <p className="text-gray-400 text-sm mt-2">Create assessments to start receiving student responses</p>
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
                        ← Back to Assessments
                      </button>
                      <h4 className="text-2xl font-bold text-gray-900">{selectedAssessmentForResponses.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedAssessmentForResponses.description || 'No description'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Points</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedAssessmentForResponses.totalPoints || selectedAssessmentForResponses.points || 0}</p>
                    </div>
                  </div>

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
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200 bg-gray-50">
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
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
                                  <div className="text-xs text-gray-500">{response.studentId}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="font-bold text-lg text-gray-900">
                                    {response.earnedPoints || 0}/{response.totalPoints || 100}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className={`font-bold text-lg ${percentage >= 60 ? 'text-green-600' : 'text-red-600'}`}>
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
                                  <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500 text-lg font-medium">No responses yet</p>
                      <p className="text-gray-400 text-sm mt-2">Students who complete this assessment will appear here</p>
                    </div>
                  )}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 px-8 py-6 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {createType === 'material' ? (currentMaterialId && materials.find(m => m.id === currentMaterialId)?.isPublished ? 'Edit Material' : 'Add Material') : createType === 'topic' ? (selectedTopicId ? 'Edit Topic' : 'Create Topic') : 'Create Assignment'}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {createType === 'material' ? (currentMaterialId && materials.find(m => m.id === currentMaterialId)?.isPublished ? 'Update learning resources for your class' : 'Upload learning resources for your class') : createType === 'topic' ? (selectedTopicId ? 'Update your discussion topic' : 'Create a new discussion topic') : 'Create an assignment for your students'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormBuilderTitle('');
                    setFormBuilderDescription('');
                    setFormBuilderQuestions([]);
                    setCreateType('');
                    setMaterialTitle('');
                    setMaterialDescription('');
                    setMaterialFiles([]);
                    setCurrentMaterialId(null);
                    setTopicTitle('');
                    setTopicDescription('');
                    setSelectedTopicId(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content based on createType */}
            {(createType === 'material' || createType === 'topic') && (
              <div className="flex-1 overflow-y-auto p-8">
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
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-900">Upload Files</label>
                      
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
                            Publish to Students
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
                <form onSubmit={handleSaveItem} className="flex-1 overflow-hidden flex w-full">
                  {/* Left Side - Form Builder */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 border-r border-gray-200">
                    {/* Title Section */}
                    <div className="space-y-3">
                  <input 
                    type="text"
                    placeholder="Untitled assignment"
                    value={formBuilderTitle}
                    onChange={(e) => setFormBuilderTitle(e.target.value)}
                    className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none border-b-2 border-transparent focus:border-blue-600 transition-colors pb-2"
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
                          className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-semibold text-gray-700">Q{idx + 1}</span>
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded capitalize">
                              {question.type.replace('-', ' ')}
                            </span>
                            <span className="text-sm text-gray-600 flex-1 truncate ml-2">
                              {question.question || 'Click to edit question'}
                            </span>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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

                {/* Due Date & Points */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input 
                        type="date"
                        value={formBuilderDueDate}
                        onChange={(e) => setFormBuilderDueDate(e.target.value)}
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
              <div className="w-72 overflow-y-auto p-8 bg-gradient-to-b from-blue-50 to-white flex flex-col">
                <h3 className="font-semibold text-gray-900 mb-5">Question Types</h3>
                <div className="space-y-2 flex-1">
                  {[
                    { type: 'short-answer', label: 'Short answer', icon: '✎', desc: 'Brief text response' },
                    { type: 'paragraph', label: 'Paragraph', icon: '¶', desc: 'Long text response' },
                    { type: 'multiple-choice', label: 'Multiple choice', icon: '●', desc: 'Pick one option' },
                    { type: 'checkboxes', label: 'Checkboxes', icon: '☑', desc: 'Pick multiple options' },
                    { type: 'dropdown', label: 'Dropdown', icon: '▼', desc: 'Choose from list' },
                    { type: 'file-upload', label: 'File upload', icon: '📎', desc: 'Upload files' },
                    { type: 'linear-scale', label: 'Linear scale', icon: '⎯', desc: 'Rate on a scale' },
                    { type: 'rating', label: 'Rating', icon: '⭐', desc: 'Star rating' },
                    { type: 'multiple-grid', label: 'Multiple choice grid', icon: '▦', desc: 'Grid of options' },
                    { type: 'checkbox-grid', label: 'Checkbox grid', icon: '▨', desc: 'Grid multi-select' },
                    { type: 'date', label: 'Date', icon: '📅', desc: 'Pick a date' },
                    { type: 'time', label: 'Time', icon: '🕐', desc: 'Pick a time' },
                  ].map(item => (
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
                <div className="border-t border-gray-200 bg-gray-50 px-8 py-4 flex items-center justify-end gap-3 flex-shrink-0">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormBuilderTitle('');
                      setFormBuilderDescription('');
                      setFormBuilderQuestions([]);
                      setIsFormBuilderEditMode(false);
                      setEditingAssignmentId(null);
                    }}
                    className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    form={undefined}
                    onClick={handleSaveItem}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!formBuilderTitle.trim() || isSubmittingItem}
                  >
                    <Save className="w-4 h-4" />
                    {isSubmittingItem ? 'Creating...' : isFormBuilderEditMode ? 'Save Changes' : 'Publish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment Detail Modal */}
      {showAssignmentDetailModal && selectedAssignmentDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-slide-up my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedAssignmentDetail.title}</h2>
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
            <div className="flex gap-0 border-b border-gray-200 px-8 pt-6 flex-shrink-0">
              <button
                onClick={() => setAssignmentDetailTab('questions')}
                className={`pb-4 px-4 font-medium transition-colors ${
                  assignmentDetailTab === 'questions'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Questions ({selectedAssignmentDetail.questions?.length || 0})
              </button>
              <button
                onClick={() => setAssignmentDetailTab('responses')}
                className={`pb-4 px-4 font-medium transition-colors ${
                  assignmentDetailTab === 'responses'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Responses
              </button>
              <button
                onClick={() => setAssignmentDetailTab('settings')}
                className={`pb-4 px-4 font-medium transition-colors ${
                  assignmentDetailTab === 'settings'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Settings
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* Questions Tab */}
              {assignmentDetailTab === 'questions' && (
                <div className="space-y-6">
                  {/* Edit Button */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        // Populate form builder with current assignment data
                        setFormBuilderTitle(selectedAssignmentDetail.title || '');
                        setFormBuilderDescription(selectedAssignmentDetail.message || '');
                        setFormBuilderQuestions(selectedAssignmentDetail.questions || []);
                        
                        // Safely parse dueDate (could be string, Date, or Firestore Timestamp)
                        let dueDateString = '';
                        if (selectedAssignmentDetail.dueDate) {
                          if (typeof selectedAssignmentDetail.dueDate === 'string') {
                            dueDateString = selectedAssignmentDetail.dueDate.split('T')[0];
                          } else if (selectedAssignmentDetail.dueDate instanceof Date) {
                            dueDateString = selectedAssignmentDetail.dueDate.toISOString().split('T')[0];
                          } else if (selectedAssignmentDetail.dueDate.toDate) {
                            // Firestore Timestamp
                            dueDateString = selectedAssignmentDetail.dueDate.toDate().toISOString().split('T')[0];
                          }
                        }
                        setFormBuilderDueDate(dueDateString);
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

                  {selectedAssignmentDetail.dueDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Due Date:</span> {new Date(selectedAssignmentDetail.dueDate).toLocaleDateString()} at 11:59 PM
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="font-semibold">Points:</span> {selectedAssignmentDetail.points}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Responses Tab */}
              {assignmentDetailTab === 'responses' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Student Responses</h3>
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No responses yet</p>
                    <p className="text-gray-500 text-sm mt-1">Responses will appear here once students submit</p>
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
                        <span className="text-sm text-gray-700">Allow students to submit responses</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                        <span className="text-sm text-gray-700">Show correct answers to students</span>
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

      {/* Invite Students Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Invite Students</h2>
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
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create {assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}</h2>
                <p className="text-sm text-gray-500 mt-1">Build your {assessmentType} with various question types</p>
              </div>
              <button 
                onClick={() => setShowQuizModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Assessment Type Selector */}
              <div className="flex gap-3 border-b pb-6">
                {['quiz', 'survey', 'form'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setAssessmentType(type);
                      setQuizQuestions([]);
                    }}
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="number"
                        value={quizTimeLimit}
                        onChange={(e) => setQuizTimeLimit(e.target.value)}
                        placeholder="No limit"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                      />
                    </div>
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
                            <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="text-sm text-gray-500">
                {quizQuestions.length > 0 && (
                  <span>{quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''} • {quizQuestions.reduce((sum, q) => sum + (parseInt(q.points) || 0), 0)} points</span>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSaveQuiz}
                  disabled={quizQuestions.length === 0 || !quizTitle || isSubmittingQuiz}
                  className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                    quizQuestions.length === 0 || !quizTitle || isSubmittingQuiz
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {isSubmittingQuiz ? 'Creating...' : `Create ${assessmentType === 'quiz' ? 'Quiz' : assessmentType === 'survey' ? 'Survey' : 'Form'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {selectedPost.author?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedPost.author || 'Trainer'}</p>
                  <p className="text-xs text-gray-500">
                    {selectedPost.createdAt instanceof Date 
                      ? selectedPost.createdAt.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: selectedPost.createdAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : typeof selectedPost.createdAt === 'string'
                      ? new Date(selectedPost.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: new Date(selectedPost.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ''
                    }
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
              {/* Post Message */}
              <div>
                <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">{selectedPost.message}</p>
              </div>

              {/* Attachments */}
              {selectedPost.attachments && selectedPost.attachments.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Attachments ({selectedPost.attachments.length})</label>
                  <div className="space-y-2">
                    {selectedPost.attachments.map((attachment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors group cursor-pointer">
                        <div 
                          onClick={() => handlePreviewAttachment(attachment)}
                          className="flex items-center gap-2 min-w-0 flex-1"
                        >
                          <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
                          <span className="text-sm text-gray-900 truncate group-hover:text-blue-600 font-medium">{attachment.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">({(attachment.size / 1024).toFixed(2)} KB)</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadAttachment(attachment);
                          }}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 ml-2 flex-shrink-0"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">Comments ({postComments.length})</label>
                
                {/* Comments List */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {loadingComments ? (
                    <div className="text-center py-8">
                      <div className="animate-spin inline-block w-6 h-6 border-3 border-gray-300 border-t-blue-600 rounded-full"></div>
                      <p className="text-gray-500 text-sm mt-2">Loading comments...</p>
                    </div>
                  ) : postComments.length > 0 ? (
                    postComments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{comment.author}</p>
                            <p className="text-xs text-gray-500">
                              {comment.createdAt instanceof Date 
                                ? comment.createdAt.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : typeof comment.createdAt === 'string'
                                ? new Date(comment.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : ''
                              }
                            </p>
                          </div>
                          {(user?.uid === comment.authorId || user?.role === 'trainer') && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 text-sm py-4">No comments yet. Be the first to comment!</p>
                  )}
                </div>

                {/* Add Comment Form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
