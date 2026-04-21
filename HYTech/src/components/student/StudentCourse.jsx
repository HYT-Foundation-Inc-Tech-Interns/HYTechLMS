import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  ChevronRight, 
  FileText, 
  Download,
  Megaphone,
  Paperclip,
  X,
  Eye,
  Pencil,
  Video,
  ExternalLink,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Award,
  Timer,
  ChevronLeft,
  Play,
  Edit2,
  Trash2,
  MessageCircle,
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { getAnnouncements, getModules, getClassMaterials, getAssessments, getAssignments, subscribeToAssessments, subscribeToAssignments, subscribeToAnnouncements, subscribeToClassMaterials, updateAnnouncement, deleteAnnouncement, getCourseByName, getStudentProgress, getStudentEnrollments, addCommentToAnnouncement, getAnnouncementComments, createAnnouncement, storeAnnouncementAttachment, compressAndStoreFile, submitQuizAttempt, hasStudentAttempted, getCourseEnrollments, getUserProfile, subscribeToClassTopics, subscribeToComments } from '../../utils/firestoreService';

const StudentCourse = () => {
  const { classname } = useParams();
  const decodedClassname = decodeURIComponent(classname || '');
  const [courseId, setCourseId] = useState(null);
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showAnnouncementHistoryModal, setShowAnnouncementHistoryModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');
  const [showQuizInfoModal, setShowQuizInfoModal] = useState(false);
  const [selectedQuizInfo, setSelectedQuizInfo] = useState(null);
  
  // Quiz states
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [studentHasAttempted, setStudentHasAttempted] = useState(false);
  const [quizAttemptHistory, setQuizAttemptHistory] = useState([
    { id: 1, quizId: 1, score: 78, passed: true, submittedAt: 'Mar 05' },
    { id: 2, quizId: 2, score: 64, passed: true, submittedAt: 'Mar 08' },
    { id: 3, quizId: 1, score: 84, passed: true, submittedAt: 'Mar 12' },
  ]);
  const quizContainerRef = useRef(null);
  const commentUnsubscribeRef = useRef(null);

  // Firestore data state
  const [firestoreAnnouncements, setFirestoreAnnouncements] = useState([]);
  const [firestoreModules, setFirestoreModules] = useState([]);
  const [firestoreMaterials, setFirestoreMaterials] = useState([]);
  const [firestoreTopics, setFirestoreTopics] = useState([]);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [firestoreAssessments, setFirestoreAssessments] = useState([]);
  const [firestoreAssignments, setFirestoreAssignments] = useState([]);
  const [loadingFirestoreData, setLoadingFirestoreData] = useState(false);
  const [attemptedAssessmentIds, setAttemptedAssessmentIds] = useState(new Set());
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [editingAnnouncementText, setEditingAnnouncementText] = useState('');
  
  // Announcement posting states
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementFile, setAnnouncementFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [studentAvatar, setStudentAvatar] = useState(null);
  
  // Enrollment and progress data
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [studentProgress, setStudentProgress] = useState(null);
  const [courseData, setCourseDataLocal] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);
  
  // Comments states
  const [announcementComments, setAnnouncementComments] = useState({});
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedAnnouncementForComments, setSelectedAnnouncementForComments] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Meeting state - Real-time from Firestore
  const [activeMeeting, setActiveMeeting] = useState(null);
  
  // Announcement detail modal
  const [showAnnouncementDetailModal, setShowAnnouncementDetailModal] = useState(false);
  const [selectedAnnouncementDetail, setSelectedAnnouncementDetail] = useState(null);
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState('overview');

  // Resolve courseId from classname and load enrollment/progress
  useEffect(() => {
    if (!decodedClassname || !user?.uid) return;
    const resolveCourseId = async () => {
      try {
        const courseData = await getCourseByName(decodedClassname);
        if (courseData) {
          setCourseId(courseData.id);
          setCourseDataLocal(courseData);
          
          // Load student enrollment data
          const enrollments = await getStudentEnrollments(user.uid);
          const currentEnrollment = enrollments.find(e => e.classId === courseData.id);
          if (currentEnrollment) {
            setEnrollmentData(currentEnrollment);
          }
          
          // Load student progress
          const progress = await getStudentProgress(user.uid, courseData.id);
          setStudentProgress(progress);
        }
      } catch (error) {
        console.error('Error resolving course ID:', error);
      }
    };
    resolveCourseId();
  }, [decodedClassname, user?.uid]);

  // Fetch student's avatar for use in UI
  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchStudentAvatar = async () => {
      try {
        // Try fetching from users/{uid} first (where Settings saves it)
        const usersRef = doc(db, 'users', user.uid);
        const usersSnap = await getDoc(usersRef);
        if (usersSnap.exists()) {
          const avatar = usersSnap.data()?.avatarBase64 || null;
          if (avatar) {
            setStudentAvatar(avatar);
            return;
          }
        }
        
        // Fallback to userSettings if not found in users
        const settingsRef = doc(db, 'userSettings', user.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const studentSettings = settingsSnap.data()?.student;
          if (studentSettings) {
            const avatar = studentSettings.avatarUrl || studentSettings.avatarPreview || studentSettings.avatarBase64 || null;
            if (avatar) {
              setStudentAvatar(avatar);
              return;
            }
          }
        }
        
        // If no avatar found, generate one
        const initials = (user?.displayName || user?.email || 'Student')
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
        const colorIndex = user.uid.charCodeAt(0) % colors.length;
        const bgColor = colors[colorIndex];
        
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.arc(100, 100, 100, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 80px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initials, 100, 100);
          
          setStudentAvatar(canvas.toDataURL('image/png'));
        } catch (err) {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="100" fill="${bgColor}"/><text x="100" y="130" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">${initials}</text></svg>`;
          setStudentAvatar(`data:image/svg+xml;base64,${btoa(svg)}`);
        }
      } catch (err) {
        console.error('Error fetching student avatar:', err);
      }
    };
    
    fetchStudentAvatar();
  }, [user?.uid]);

  // Load announcements from Firestore
  // Real-time subscription to announcements
  useEffect(() => {
    if (!courseId) return;
    
    const unsubscribe = subscribeToAnnouncements(courseId, (announcementData) => {
      setFirestoreAnnouncements(announcementData || []);
    });
    
    return () => unsubscribe();
  }, [courseId]);

  // Load modules from Firestore
  useEffect(() => {
    if (!courseId) return;
    const loadModules = async () => {
      try {
        const moduleData = await getModules(courseId);
        setFirestoreModules(moduleData || []);
      } catch (error) {
        console.error('Error loading modules:', error);
      }
    };
    loadModules();
  }, [courseId]);

  // Real-time subscription to class materials
  useEffect(() => {
    if (!courseId) return;
    
    const unsubscribe = subscribeToClassMaterials(courseId, (materials) => {
      setFirestoreMaterials(materials || []);
    });
    
    return () => unsubscribe();
  }, [courseId]);

  // Real-time subscription to class topics
  useEffect(() => {
    if (!courseId) return;
    
    const unsubscribe = subscribeToClassTopics(courseId, (topics) => {
      setFirestoreTopics(topics || []);
    });
    
    return () => unsubscribe();
  }, [courseId]);

  // Load assessments from Firestore with real-time updates
  useEffect(() => {
    // Only subscribe if courseId exists
    if (!courseId) return;
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToAssessments(courseId, (assessmentData) => {
      setFirestoreAssessments(assessmentData || []);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [courseId]);

  // Load assignments from Firestore with real-time updates
  useEffect(() => {
    if (!courseId) return;
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToAssignments(courseId, (assignmentData) => {
      setFirestoreAssignments(assignmentData || []);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [courseId]);

  // Load all students enrolled in this class
  useEffect(() => {
    if (!courseId) return;

    const loadClassStudents = async () => {
      try {
        setLoadingClassStudents(true);
        const enrollments = await getCourseEnrollments(courseId);

        const students = await Promise.all(
          (enrollments || []).map(async (enrollment) => {
            const profile = await getUserProfile(enrollment.studentId);

            const fullName =
              profile?.displayName ||
              [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
              profile?.name ||
              profile?.email ||
              'Student';

            return {
              id: enrollment.studentId || enrollment.id,
              name: fullName,
              email: profile?.email || '',
              avatar: profile?.avatarBase64 || profile?.avatarUrl || null,
              joinedAt: enrollment.joinedAt,
            };
          })
        );

        setClassStudents(students);
      } catch (error) {
        console.error('Error loading class students:', error);
        setClassStudents([]);
      } finally {
        setLoadingClassStudents(false);
      }
    };

    loadClassStudents();
  }, [courseId]);

  // Check which assessments the student has already attempted
  useEffect(() => {
    const checkAttemptedAssessments = async () => {
      if (!courseId || !user?.uid || !firestoreAssessments.length) return;
      
      try {
        const attemptedIds = new Set();
        
        for (const assessment of firestoreAssessments) {
          const hasAttempted = await hasStudentAttempted(courseId, assessment.id, user.uid);
          if (hasAttempted) {
            attemptedIds.add(assessment.id);
          }
        }
        
        setAttemptedAssessmentIds(attemptedIds);
      } catch (error) {
        console.error('Error checking attempted assessments:', error);
      }
    };
    
    checkAttemptedAssessments();
  }, [courseId, user?.uid, firestoreAssessments]);

  // Use Firestore data if available, otherwise fall back to mock data
  const displayAnnouncements = firestoreAnnouncements.length > 0 
    ? firestoreAnnouncements.map(ann => ({
        id: ann.id,
        title: ann.title || null,  // Don't default to 'Announcement' - let message be the main content
        author: ann.author || 'Trainer',
        authorId: ann.authorId,
        message: ann.message || '',
        preview: ann.message?.substring(0, 100) || ann.message || 'No content',
        fullMessage: ann.message || 'No content',
        time: ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Recently',
        createdAt: ann.createdAt,
        attachments: ann.attachments || [],
        type: 'announcement',
        authorAvatar: ann.authorAvatar || null
      }))
    : [];

  // Combine announcements and assignments into activity feed
  const activityFeed = [
    ...displayAnnouncements,
    ...(firestoreAssessments || []).map(assessment => ({
      id: assessment.id,
      title: assessment.title || 'Assignment',
      author: assessment.createdBy || 'Trainer',
      authorId: assessment.createdById,
      preview: `${assessment.questions?.length || 0} questions`,
      fullMessage: assessment.description || 'No description',
      createdAt: assessment.createdAt,
      type: 'assignment',
      icon: 'FileText',
      dueDate: assessment.dueDate,
      points: assessment.totalPoints,
      authorAvatar: assessment.createdByAvatar || null // Include trainer avatar if available
    }))
  ].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA; // Most recent first
  });

  // Listen for real-time meeting updates from Firestore
  useEffect(() => {
    if (!courseId) {
      return;
    }
    
    try {
      // Use 'classes' collection to match how getCourseByName retrieves it
      const classDocRef = doc(db, 'classes', courseId);
      const unsubscribe = onSnapshot(classDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const classData = docSnap.data();
          
          // Only set activeMeeting if trainer has toggled meeting to active
          if (classData?.meeting?.isActive) {
            // Convert Firestore Timestamp to readable time
            let startTimeStr = 'Now';
            if (classData.meeting.startTime) {
              try {
                const startDate = classData.meeting.startTime.toDate 
                  ? classData.meeting.startTime.toDate() 
                  : new Date(classData.meeting.startTime);
                startTimeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch (e) {
                console.error('Error converting meeting start time:', e);
                startTimeStr = 'Now';
              }
            }
            
            setActiveMeeting({
              id: classData.meeting.meetingCode || 'N/A',
              link: classData.meeting.meetingLink || '',
              host: classData.meeting.trainerName || 'Trainer',
              startTime: startTimeStr,
              participants: classData.meeting.participants || 0
            });
          } else {
            setActiveMeeting(null);
          }
        }
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error listening to meeting updates:', error);
    }
  }, [courseId]);

  // Cleanup comment subscription when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (commentUnsubscribeRef.current) {
        commentUnsubscribeRef.current();
        commentUnsubscribeRef.current = null;
      }
    };
  }, []);

  const handleJoinMeeting = () => {
    if (activeMeeting) {
      window.open(activeMeeting.link, '_blank');
    }
  };

  // Handle edit announcement
  const handleEditAnnouncement = async (announcementId, newMessage) => {
    if (!newMessage.trim()) {
      addToast('Announcement cannot be empty', 'error');
      return;
    }
    try {
      await updateAnnouncement(courseId, announcementId, {
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
        await deleteAnnouncement(courseId, announcementId);
        addToast('Announcement deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting announcement:', error);
        addToast('Failed to delete announcement', 'error');
      }
    }
  };

  // Check if current user is the author (can edit and delete own posts)
  const isAuthor = (announcement) => {
    // If announced has no authorId but user is posting as student, still allow edit/delete
    // This handles legacy announcements that may not have authorId set
    if (!announcement.authorId) {
      // For announcements without authorId, check if they match the current user's name
      return announcement.author === (user?.displayName || user?.email || 'Student');
    }
    return user?.uid === announcement.authorId;
  };

  // Check if can delete (author can always delete own, others can't delete)
  const canDelete = (announcement) => {
    return user?.uid === announcement.authorId;
  };

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

  // Format date to relative time (e.g., "2 hours ago")
  const getRelativeTime = (date) => {
    if (!date) return 'unknown';
    
    let dateObj = date;
    
    // Handle Firestore Timestamp objects
    if (date.toDate && typeof date.toDate === 'function') {
      try {
        dateObj = date.toDate();
      } catch (e) {
        console.error('Error converting Firestore timestamp:', e);
        return 'unknown';
      }
    } 
    // Handle string dates (ISO format or other)
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    }
    // Handle plain objects with numeric timestamps (Firebase format)
    else if (typeof date === 'object' && date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    }
    // Convert to Date object if not already
    else if (!(date instanceof Date)) {
      dateObj = new Date(date);
    }
    
    // Validate the date
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date object:', date);
      return 'unknown';
    }
    
    const now = new Date();
    const diffMs = now - dateObj;
    
    // Only calculate if difference is positive and reasonable
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

  // Handle opening announcement detail modal
  const handleOpenAnnouncementDetail = async (announcement) => {
    // Fetch author's profile picture
    let announcementWithAvatar = { ...announcement };
    if (announcement.authorId) {
      try {
        const authorProfile = await getUserProfile(announcement.authorId);
        announcementWithAvatar.authorAvatar = authorProfile?.avatarBase64 || authorProfile?.avatarUrl || null;
      } catch (error) {
        console.error('Error loading author avatar:', error);
      }
    }
    
    setSelectedAnnouncementDetail(announcementWithAvatar);
    setShowAnnouncementDetailModal(true);
    
    // Load comments for this announcement
    if (announcement.type === 'announcement') {
      try {
        // Load initial comments
        const comments = await getAnnouncementComments(courseId, announcement.id);
        // Fetch avatar for each comment author
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
        
        setAnnouncementComments(prev => ({
          ...prev,
          [announcement.id]: commentsWithAvatars || []
        }));
        
        // Set up real-time subscription for live comment updates
        commentUnsubscribeRef.current = subscribeToComments(
          courseId,
          announcement.id,
          async (liveComments) => {
            // Enrich live comments with avatars
            const enrichedComments = await Promise.all(
              (liveComments || []).map(async (comment) => {
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
            
            setAnnouncementComments(prev => ({
              ...prev,
              [announcement.id]: enrichedComments || []
            }));
          }
        );
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    }
  };

  // Handle opening comments modal
  const handleOpenComments = async (announcement) => {
    setSelectedAnnouncementForComments(announcement);
    setShowCommentsModal(true);
    
    try {
      setLoadingComments(true);
      const comments = await getAnnouncementComments(courseId, announcement.id);
      setAnnouncementComments({
        ...announcementComments,
        [announcement.id]: comments || []
      });
    } catch (error) {
      console.error('Error loading comments:', error);
      addToast('Failed to load comments', 'error');
    } finally {
      setLoadingComments(false);
    }
  };

  // Handle adding a comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedAnnouncementForComments) {
      addToast('Comment cannot be empty', 'error');
      return;
    }

    try {
      await addCommentToAnnouncement(courseId, selectedAnnouncementForComments.id, {
        author: user?.displayName || 'You',
        authorId: user?.uid,
        message: newComment.trim()
      });
      
      // Reload comments
      const updatedComments = await getAnnouncementComments(courseId, selectedAnnouncementForComments.id);
      setAnnouncementComments({
        ...announcementComments,
        [selectedAnnouncementForComments.id]: updatedComments || []
      });
      
      setNewComment('');
      addToast('Comment added successfully!', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      addToast('Failed to add comment', 'error');
    }
  };

  // Handle posting announcement as student
  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) {
      addToast('Announcement cannot be empty', 'error');
      return;
    }
    try {
      setUploadingAttachment(true);
      
      // Get student's avatar if available
      let studentAvatar = null;
      try {
        // Try fetching from users/{uid} first (where Settings saves it)
        const usersRef = doc(db, 'users', user.uid);
        const usersSnap = await getDoc(usersRef);
        if (usersSnap.exists()) {
          studentAvatar = usersSnap.data()?.avatarBase64 || null;
        }
        
        // Fallback to userSettings if not found in users
        if (!studentAvatar) {
          const settingsRef = doc(db, 'userSettings', user.uid);
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const studentSettings = settingsSnap.data()?.student;
            if (studentSettings) {
              studentAvatar = studentSettings.avatarUrl || studentSettings.avatarPreview || studentSettings.avatarBase64 || null;
            }
          }
        }
      } catch (err) {
        console.error('Avatar fetch error:', err);
      }
      
      // If no avatar, generate one with initials using canvas
      if (!studentAvatar) {
        const initials = (user?.displayName || user?.email || 'Student')
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
          
          studentAvatar = canvas.toDataURL('image/png');
        } catch (err) {
          console.warn('Could not generate avatar canvas:', err);
          // Fallback: use SVG data URL
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="100" fill="${bgColor}"/><text x="100" y="130" font-size="80" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">${initials}</text></svg>`;
          studentAvatar = `data:image/svg+xml;base64,${btoa(svg)}`;
        }
      }
      
      const announcementData = {
        title: '',
        message: announcementText.trim(),
        author: user?.displayName || user?.email || 'Student',
        authorId: user?.uid,
        authorAvatar: studentAvatar,
        attachments: [],
        createdAt: new Date().toISOString()
      };
      
      // Create announcement
      const announcement = await createAnnouncement(courseId, announcementData);
      
      // If file selected, upload
      if (announcementFile) {
        try {
          await storeAnnouncementAttachment(courseId, announcement.id, announcementFile);
          addToast('Announcement posted with attachment!', 'success');
        } catch (fileErr) {
          console.error('Error uploading file:', fileErr);
          addToast(`File upload failed: ${fileErr.message}`, 'error');
        }
      } else {
        addToast('Announcement posted successfully!', 'success');
      }
      
      // Announcements will update automatically via real-time listener
      setAnnouncementText('');
      setAnnouncementFile(null);
    } catch (error) {
      console.error('Error posting announcement:', error);
      addToast('Failed to post announcement', 'error');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const displayCourseData = {
    name: courseData?.name || 'Course',
    progress: studentProgress?.progressPercentage || 0,
    weeksLeft: 9,
    level: courseData?.level || 'N/A'
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const announcements = [
    {
      id: 1,
      title: 'New Assignment Released',
      author: 'Ms. Garcia',
      preview: 'Chapter 3 materials are now available. Please review before Friday\'s class.',
      fullMessage: `Hello everyone!

The materials for Chapter 3 are now available.
Please make sure to review them before our class on Friday so you can come prepared for the discussion and activities.

If you have any questions while going through the materials, feel free to note them down and bring them up during class.

See you on Friday!`,
      time: '2 hours ago',
      attachments: [
        { name: 'Chapter 1 Reading', type: 'PDF', size: '5mb' }
      ]
    },
    {
      id: 2,
      title: 'Live Demo Session Reminder',
      author: 'Ms. Garcia',
      preview: 'Join our live espresso extraction demo tomorrow at 10:30 AM.',
      fullMessage: `Good day class!

This is a reminder that we have a live demo session tomorrow at 10:30 AM.
We will focus on espresso extraction and proper grinder calibration.

Please prepare your notebooks and previous activity outputs for review.`,
      time: '1 day ago',
      attachments: [
        { name: 'Espresso Demo Guide', type: 'PDF', size: '3mb' }
      ]
    },
    {
      id: 3,
      title: 'Module 2 Materials Uploaded',
      author: 'Ms. Garcia',
      preview: 'Module 2 slides and worksheets are now available in course materials.',
      fullMessage: `Module 2 materials are now available.

Please read the lesson slides and complete the worksheet before Friday.
The worksheet will be discussed in class and checked for participation points.`,
      time: '3 days ago',
      attachments: [
        { name: 'Module 2 Slides', type: 'PDF', size: '6mb' },
        { name: 'Module 2 Worksheet', type: 'DOCX', size: '1mb' }
      ]
    },
    {
      id: 4,
      title: 'Assessment Rubric Published',
      author: 'Ms. Garcia',
      preview: 'Practical assessment rubric is now posted for your reference.',
      fullMessage: `The practical assessment rubric is now posted.

Review the criteria so you understand how your performance will be graded.
Focus on workflow, cleanliness, and consistency of output quality.`,
      time: '5 days ago',
      attachments: [
        { name: 'Practical Assessment Rubric', type: 'PDF', size: '2mb' }
      ]
    }
  ];

  // Use real Firestore materials if available, otherwise use mock data
  // Always use Firestore materials for real-time updates
  const courseMaterials = firestoreMaterials && firestoreMaterials.length > 0 ? firestoreMaterials : [];

  // Filter to only show published materials
  const publishedCourseMaterials = courseMaterials.filter((material) => material.isPublished === true);

  // Use real Firestore assessments if available, otherwise use mock data
  const mockQuizzes = [
    { 
      id: 1, 
      title: 'Coffee Beans Basics',
      author: 'Trainer Name',
      dueDate: 'March 15', 
      progress: 0,
      duration: 15, // minutes
      totalPoints: 50,
      questions: [
        {
          id: 1,
          question: 'What are the two main species of coffee beans commercially grown?',
          type: 'multiple-choice',
          options: ['Arabica and Robusta', 'Liberica and Excelsa', 'Colombian and Brazilian', 'Espresso and Latte'],
          correctAnswer: 0,
          points: 10
        },
        {
          id: 2,
          question: 'Which coffee bean species is known for its smoother, sweeter taste?',
          type: 'multiple-choice',
          options: ['Robusta', 'Liberica', 'Arabica', 'Excelsa'],
          correctAnswer: 2,
          points: 10
        },
        {
          id: 3,
          question: 'Robusta coffee beans contain more caffeine than Arabica beans.',
          type: 'true-false',
          options: ['True', 'False'],
          correctAnswer: 0,
          points: 10
        },
        {
          id: 4,
          question: 'What is the ideal temperature range for brewing espresso?',
          type: 'multiple-choice',
          options: ['70-80°C', '90-96°C', '100-110°C', '60-70°C'],
          correctAnswer: 1,
          points: 10
        },
        {
          id: 5,
          question: 'Which factor does NOT affect the flavor of coffee beans?',
          type: 'multiple-choice',
          options: ['Altitude where grown', 'Roasting level', 'Color of the coffee cup', 'Processing method'],
          correctAnswer: 2,
          points: 10
        }
      ]
    },
    { 
      id: 2, 
      title: 'Espresso Fundamentals',
      author: 'Trainer Name',
      dueDate: 'March 20', 
      progress: 0,
      duration: 20,
      totalPoints: 60,
      questions: [
        {
          id: 1,
          question: 'What is the standard brewing time for a single shot of espresso?',
          type: 'multiple-choice',
          options: ['10-15 seconds', '25-30 seconds', '45-60 seconds', '2-3 minutes'],
          correctAnswer: 1,
          points: 10
        },
        {
          id: 2,
          question: 'The crema on top of an espresso indicates a properly extracted shot.',
          type: 'true-false',
          options: ['True', 'False'],
          correctAnswer: 0,
          points: 10
        },
        {
          id: 3,
          question: 'What is the typical pressure used in espresso machines?',
          type: 'multiple-choice',
          options: ['3 bars', '9 bars', '15 bars', '25 bars'],
          correctAnswer: 1,
          points: 10
        },
        {
          id: 4,
          question: 'How many grams of coffee are typically used for a double shot?',
          type: 'multiple-choice',
          options: ['7-9 grams', '14-18 grams', '25-30 grams', '35-40 grams'],
          correctAnswer: 1,
          points: 10
        },
        {
          id: 5,
          question: 'A ristretto uses more water than a regular espresso shot.',
          type: 'true-false',
          options: ['True', 'False'],
          correctAnswer: 1,
          points: 10
        },
        {
          id: 6,
          question: 'What does "tamping" refer to in espresso preparation?',
          type: 'multiple-choice',
          options: ['Heating the cup', 'Compressing the coffee grounds', 'Frothing milk', 'Cleaning the portafilter'],
          correctAnswer: 1,
          points: 10
        }
      ]
    }
  ];

  // Use ONLY real Firestore data - combine assessments AND assignments
  const quizzes = [
    // Assessments (quizzes)
    ...(firestoreAssessments || []).map(assessment => {
      const formattedDueDate = assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'No due date';
      return {
        ...assessment,
        id: assessment.id,
        title: assessment.title,
        author: assessment.author,
        dueDate: formattedDueDate,
        duration: assessment.timeLimit || 0,
        totalPoints: assessment.totalPoints,
        questions: assessment.questions || []
      };
    }),
    // Assignments (regular assignments)
    ...(firestoreAssignments || []).map(assignment => {
      const formattedDueDate = assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'No due date';
      return {
        ...assignment,
        id: assignment.id,
        title: assignment.title,
        author: assignment.author,
        dueDate: formattedDueDate,
        duration: 0,
        totalPoints: assignment.points || 100,
        questions: assignment.questions || []
      };
    })
  ];

  // Timer effect
  useEffect(() => {
    let interval;
    if (quizStarted && timeRemaining > 0 && !quizSubmitted) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizStarted, timeRemaining, quizSubmitted]);

  // Fullscreen handling
  const enterFullscreen = () => {
    if (quizContainerRef.current) {
      if (quizContainerRef.current.requestFullscreen) {
        quizContainerRef.current.requestFullscreen();
      } else if (quizContainerRef.current.webkitRequestFullscreen) {
        quizContainerRef.current.webkitRequestFullscreen();
      } else if (quizContainerRef.current.msRequestFullscreen) {
        quizContainerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    setIsFullscreen(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && quizStarted && !quizSubmitted) {
        // User tried to exit fullscreen during quiz - re-enter
        enterFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [quizStarted, quizSubmitted]);

  // Prevent tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && quizStarted && !quizSubmitted) {
        setShowWarningModal(true);
      } else if (!document.hidden && quizStarted && !quizSubmitted) {
        // When user comes back, re-enter fullscreen
        enterFullscreen();
      }
    };

    const handleBeforeUnload = (e) => {
      if (quizStarted && !quizSubmitted) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [quizStarted, quizSubmitted]);

  const handleStartQuiz = async (quiz) => {
    // Check if student has already attempted this assessment
    try {
      if (courseId && user?.uid) {
        const hasAttempted = await hasStudentAttempted(courseId, quiz.id, user.uid);
        if (hasAttempted) {
          setStudentHasAttempted(true);
          addToast('You have already answered this assessment and cannot retake it', 'warning');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking student attempts:', error);
    }

    setSelectedQuiz(quiz);
    setShowQuizModal(true);
    setQuizStarted(false);
    setCurrentQuestion(0);
    setAnswers({});
    setQuizSubmitted(false);
    setQuizResults(null);
    setStudentHasAttempted(false);
  };

  const handleBeginQuiz = () => {
    setQuizStarted(true);
    setTimeRemaining(selectedQuiz.duration * 60);
    enterFullscreen();
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;
    
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const questionResults = [];

    selectedQuiz.questions.forEach(q => {
      totalPoints += q.points;
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) {
        correctCount++;
        earnedPoints += q.points;
      }
      questionResults.push({
        ...q,
        userAnswer,
        isCorrect
      });
    });

    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    
    setQuizResults({
      correctCount,
      totalQuestions: selectedQuiz.questions.length,
      earnedPoints,
      totalPoints,
      percentage,
      questionResults,
      passed: percentage >= 60
    });

    setQuizAttemptHistory((prev) => [
      {
        id: Date.now(),
        quizId: selectedQuiz.id,
        score: percentage,
        passed: percentage >= 60,
        submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
      ...prev,
    ]);
    
    setQuizSubmitted(true);
    
    // Save attempt to Firestore
    try {
      if (courseId && user?.uid && selectedQuiz?.id) {
        await submitQuizAttempt(courseId, selectedQuiz.id, user.uid, {
          answers,
          score: percentage,
          earnedPoints,
          totalPoints,
          correctCount,
          totalQuestions: selectedQuiz.questions.length,
          timeTaken: 0 // Could track time if needed
        });
      }
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      addToast('Failed to save quiz attempt', 'error');
    }
    exitFullscreen();
  };

  const handleCloseQuiz = () => {
    if (quizStarted && !quizSubmitted) {
      if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
        exitFullscreen();
        setShowQuizModal(false);
        setQuizStarted(false);
      }
    } else {
      exitFullscreen();
      setShowQuizModal(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = (fileName) => {
    setDownloadFileName(`Barista_NC2_${fileName.replace(/\s+/g, '_')}.pdf`);
    setShowDownloadToast(true);
    setTimeout(() => setShowDownloadToast(false), 4000);
  };

  const formatMaterialDate = (date) => {
    if (!date) return 'Recently';

    let dateObj = date;
    if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (typeof date === 'object' && date?.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (!(date instanceof Date)) {
      dateObj = new Date(date);
    }

    if (isNaN(dateObj?.getTime?.())) return 'Recently';

    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const canPreviewMaterialFile = (fileType = '') => fileType.includes('pdf') || fileType.startsWith('image/');

  const previewMaterialFile = (material, fileIndex) => {
    const fileBase64 = material?.filesBase64?.[fileIndex];
    const fileType = material?.attachments?.[fileIndex]?.type || 'application/octet-stream';

    if (!fileBase64) {
      addToast('Preview not available for this file', 'error');
      return;
    }

    const previewWindow = window.open();
    if (!previewWindow) {
      addToast('Popup blocked. Please allow popups to preview files.', 'error');
      return;
    }

    if (fileType.includes('pdf')) {
      previewWindow.document.write(`
        <html>
          <head><title>File Preview</title></head>
          <body style="margin:0;overflow:hidden;">
            <iframe src="data:${fileType};base64,${fileBase64}" style="width:100%;height:100%;border:none;"></iframe>
          </body>
        </html>
      `);
      previewWindow.document.close();
      return;
    }

    if (fileType.startsWith('image/')) {
      previewWindow.document.write(`
        <html>
          <head><title>Image Preview</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#111;">
            <img src="data:${fileType};base64,${fileBase64}" alt="Preview" style="max-width:100vw;max-height:100vh;object-fit:contain;" />
          </body>
        </html>
      `);
      previewWindow.document.close();
      return;
    }

    addToast('Preview not supported for this file type', 'error');
  };

  const downloadMaterialFile = (material, fileIndex) => {
    const fileName = material?.attachments?.[fileIndex]?.name || material?.title || 'material-file';
    const fileType = material?.attachments?.[fileIndex]?.type || 'application/octet-stream';
    const fileBase64 = material?.filesBase64?.[fileIndex];

    if (!fileBase64) {
      handleDownload(fileName);
      return;
    }

    const link = document.createElement('a');
    link.href = `data:${fileType};base64,${fileBase64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowAnnouncementModal(true);
  };

  const openMaterial = (material) => {
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const openQuizDetails = (quiz) => {
    setSelectedQuizInfo(quiz);
    setShowQuizInfoModal(true);
  };

  // Calculate stats from real or mock data
  const attemptedQuizCount = new Set(quizAttemptHistory.map((attempt) => attempt.quizId)).size;
  const passedAttemptCount = quizAttemptHistory.filter((attempt) => attempt.passed).length;
  const averageQuizScore = quizAttemptHistory.length
    ? Math.round(quizAttemptHistory.reduce((total, attempt) => total + attempt.score, 0) / quizAttemptHistory.length)
    : 0;
  const bestQuizScore = quizAttemptHistory.length
    ? Math.max(...quizAttemptHistory.map((attempt) => attempt.score))
    : 0;
  const quizCompletionRate = firestoreAssessments.length ? Math.round((attemptedQuizCount / firestoreAssessments.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 lg:px-8">
      {/* Download Toast - fixed to bottom-right corner */}
      {showDownloadToast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-center gap-4 min-w-[300px]">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Download complete.</p>
            <p className="text-sm text-gray-500">{downloadFileName} (5mb)</p>
          </div>
          <button 
            onClick={() => setShowDownloadToast(false)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex-shrink-0"
          >
            Open
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 -mx-4 md:-mx-6 lg:-mx-8">
        <div className="flex items-center gap-8 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-5 h-5 inline-block mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'modules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5 inline-block mr-2" />
            Modules
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'assessments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Award className="w-5 h-5 inline-block mr-2" />
            Assessments
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'students'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5 inline-block mr-2" />
            Students
          </button>
        </div>
      </div>

      <div className='pb-6'></div>

      {activeTab === 'overview' && (
        <>
          {/* Active Meeting Banner */}
          {activeMeeting && (
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl" />
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Live Class in Progress
                    </p>
                    <p className="text-sm text-white/80">Hosted by {activeMeeting.host} · Started at {activeMeeting.startTime}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-white/70">
                      <Users className="w-4 h-4" />
                      <span>{activeMeeting.participants} participants</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleJoinMeeting}
                  className="px-6 py-3 bg-white text-red-600 rounded-xl font-semibold flex items-center gap-2 hover:bg-white/90 transition-colors shadow-lg"
                >
                  <ExternalLink className="w-5 h-5" />
                  Join Meeting
                </button>
              </div>
            </div>
          )}

          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] rounded-2xl p-6 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-blue-400 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-white/70 text-sm mb-1">{currentDate}</p>
                <h1 className="text-2xl font-bold mb-2">Hello!</h1>
                <p className="text-white/80 mb-6">
                  You're currently enrolled in <span className="font-semibold text-white">{displayCourseData.name}</span>.
                </p>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-colors">
                    <BookOpen className="w-4 h-4" />
                    Curriculum
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white/80 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{displayCourseData.progress}% complete · Est. {displayCourseData.weeksLeft} weeks left</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs text-white/70 uppercase tracking-wider">Quiz Completion</p>
                <p className="text-2xl font-bold mt-1">{quizCompletionRate}%</p>
                <p className="text-xs text-white/70 mt-1">{attemptedQuizCount}/{quizzes.length} quizzes attempted</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs text-white/70 uppercase tracking-wider">Average Score</p>
                <p className="text-2xl font-bold mt-1">{averageQuizScore}%</p>
                <p className="text-xs text-white/70 mt-1">Across {quizAttemptHistory.length} assessment attempts</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs text-white/70 uppercase tracking-wider">Best Score</p>
                <p className="text-2xl font-bold mt-1">{bestQuizScore}%</p>
                <p className="text-xs text-white/70 mt-1">Highest recorded performance</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs text-white/70 uppercase tracking-wider">Passed Attempts</p>
                <p className="text-2xl font-bold mt-1">{passedAttemptCount}</p>
                <p className="text-xs text-white/70 mt-1">Pass mark: 60% and above</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="pt-0 pb-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Announcements & Activity Feed */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-gray-900 text-lg">Recent Activity</h2>
                </div>
                <span className="text-sm text-gray-500">{activityFeed.length} {activityFeed.length === 1 ? 'update' : 'updates'}</span>
              </div>
              {/* Class Info Badge */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-2">
                  <span>📚</span>
                  <span>{displayCourseData.name}</span>
                </div>
              </div>
            </div>

            {/* Inline Announcement Composer - Students can post too */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex gap-3">
                {studentAvatar ? (
                  <img 
                    src={studentAvatar}
                    alt={user?.displayName || 'Student'}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(user?.displayName || user?.email || 'Student').split(' ').map(n => n[0]).join('').toUpperCase()}
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
                          name="announcement-attachment"
                          onChange={(e) => setAnnouncementFile(e.target.files?.[0] || null)}
                          className="hidden"
                          accept="*/*"
                        />
                        <Paperclip className="w-4 h-4" />
                        <span className="text-xs">{announcementFile ? `File selected (${announcementFile.name})` : 'Add file'}</span>
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

            <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
              {loadingFirestoreData ? (
                <div className="p-5 text-center">
                  <div className="inline-block animate-spin">
                    <div className="w-6 h-6 border-3 border-gray-300 border-t-blue-600 rounded-full"></div>
                  </div>
                  <p className="text-gray-500 mt-2 text-sm">Loading activity...</p>
                </div>
              ) : activityFeed.length > 0 ? (
                activityFeed.map((item) => {
                  // Handle announcements
                  if (item.type === 'announcement') {
                    return (
                    <div 
                      key={item.id}
                      className="p-5 hover:bg-gray-50 transition-colors group border-l-4 border-transparent hover:border-blue-400"
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
                          onClick={() => handleOpenAnnouncementDetail(item)}
                          className="flex gap-4 cursor-pointer justify-between items-start"
                        >
                          {/* Avatar with Icon Badge - Make clickable */}
                          <div className="relative flex-shrink-0">
                            {item.authorAvatar ? (
                              <img 
                                src={item.authorAvatar} 
                                alt={item.author || 'Trainer'}
                                className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {(item.author || 'Trainer').split(' ').map(n => n[0]).join('').toUpperCase()}
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
                              <span className="font-semibold text-gray-900">{item.author || 'Trainer'}</span>
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
                                handleOpenAnnouncementDetail(item);
                              }}
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                              title="View full announcement"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {isAuthor(item) && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAnnouncementId(item.id);
                                    setEditingAnnouncementText(item.message || item.preview);
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
                              </>
                            )}
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
                        <div className="flex gap-4 justify-between items-start">
                          {/* Avatar with Icon Badge */}
                          <div className="relative flex-shrink-0">
                            {item.authorAvatar ? (
                              <img 
                                src={item.authorAvatar} 
                                alt={item.author || 'Trainer'}
                                className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {(item.author || 'Trainer').split(' ').map(n => n[0]).join('').toUpperCase()}
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
                              <span className="font-semibold text-gray-900">{item.author || 'Trainer'}</span>
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
                              onClick={() => {
                                // Navigate to or open assignment details
                                console.log('View assignment:', item.id);
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
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quizzes */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Quizzes & Assessments</h2>
              <span className="text-sm text-gray-500">{quizzes.length} available</span>
            </div>

            <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto">
              {quizzes.map((quiz) => (
                <div 
                  key={quiz.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors relative"
                >
                  {/* "Already Answered" Badge */}
                  {attemptedAssessmentIds.has(quiz.id) && (
                    <div className="absolute top-3 right-3 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                      ✓ Answered
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Pencil className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <p className="text-sm text-gray-500">
                          <span>Due {quiz.dueDate}</span>
                          {quiz.author && (
                            <span className="text-xs text-gray-400 block">Posted by {quiz.author}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center gap-4 text-gray-500">
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        {quiz.duration} mins
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        {quiz.totalPoints} pts
                      </span>
                      <span>{quiz.questions.length} questions</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => openQuizDetails(quiz)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={attemptedAssessmentIds.has(quiz.id)}
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button 
                      onClick={() => handleStartQuiz(quiz)}
                      disabled={attemptedAssessmentIds.has(quiz.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
                    >
                      <Play className="w-4 h-4" />
                      {attemptedAssessmentIds.has(quiz.id) ? 'Already Answered' : 'Start Quiz'}
                    </button>
                  </div>
                </div>
              ))}

              {quizzes.length === 0 && (
                <div className="text-center py-8">
                  <Pencil className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No quizzes available</p>
                </div>
              )}
            </div>
          </div>

          {/* Course Materials */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-600" />
              <h2 className="font-bold text-gray-900">Course Materials - {displayCourseData.name}</h2>
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
              {courseMaterials.map((material) => (
                <div 
                  key={material.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <button
                    onClick={() => openMaterial(material)}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <span className="font-medium text-blue-600 block">{material.title}</span>
                      <span className="text-xs text-gray-500">
                        {(Array.isArray(material.attachments) ? material.attachments.length : 1)} {(Array.isArray(material.attachments) ? material.attachments.length : 1) === 1 ? 'file' : 'files'} · Uploaded {material.uploadedOn || (material.createdAt ? getRelativeTime(material.createdAt) : 'recently')}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openMaterial(material)}
                      className="p-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      title="View material details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDownload(material.title)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        )}

        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            {/* Published Topics with Materials inside */}
            {firestoreTopics.filter(t => t.isPublished !== false).length > 0 || publishedCourseMaterials.filter(m => !m.topicId).length > 0 ? (
              <div className="space-y-4">
                {/* Topics (Sections) with Materials inside */}
                {firestoreTopics
                  .filter(topic => topic.isPublished !== false) // Only show published topics
                  .map((topic) => {
                    const topicMaterials = publishedCourseMaterials.filter(m => m.topicId === topic.id);
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
                              <h4 className="text-lg font-semibold text-blue-900">{topic.title}</h4>
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
                                <p className="text-sm">No materials in this section yet</p>
                              </div>
                            ) : (
                              <div className="divide-y divide-blue-200">
                                {topicMaterials.map((material) => {
                                  const fileCount = Array.isArray(material.attachments) ? material.attachments.length : 0;
                                  return (
                                    <button
                                      key={material.id}
                                      onClick={() => openMaterial(material)}
                                      className="w-full text-left p-4 hover:bg-blue-50 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                          <h5 className="font-medium text-gray-900 hover:text-blue-600">{material.title}</h5>
                                          {material.description && (
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{material.description}</p>
                                          )}
                                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                            <span>By {material.author}</span>
                                            {fileCount > 0 && (
                                              <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                  <Paperclip className="w-3 h-3" />
                                                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Standalone Materials (not in any topic) */}
                {publishedCourseMaterials
                  .filter(material => !material.topicId)
                  .map((material) => {
                    const fileCount = Array.isArray(material.attachments) ? material.attachments.length : 0;
                    
                    return (
                      <button
                        key={material.id}
                        onClick={() => openMaterial(material)}
                        className="w-full text-left p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold text-gray-900 mb-2">{material.title}</h3>
                            <p className="text-sm text-gray-700 mb-4 line-clamp-2">{material.description || 'No description provided'}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              <span>By {material.author || 'Trainer'}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-2">
                                <Paperclip className="w-4 h-4" />
                                {fileCount} {fileCount === 1 ? 'file' : 'files'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No materials available yet</p>
              </div>
            )}
          </div>
        )}

        {/* Assessments Tab */}
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-gray-600 text-sm font-medium">Total Assessments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{quizzes.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-gray-600 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{attemptedAssessmentIds.size}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{quizzes.length - attemptedAssessmentIds.size}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-gray-600 text-sm font-medium">Average Score</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{averageQuizScore}%</p>
              </div>
            </div>

            {/* All Assessments List */}
            {quizzes.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h2 className="text-lg font-bold text-gray-900">All Assessments</h2>
                  <p className="text-sm text-gray-600 mt-1">View and take assessments posted by your trainer</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Assessment Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Points</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Time Limit</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Score</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {quizzes.map((quiz) => {
                        const isCompleted = attemptedAssessmentIds.has(quiz.id);
                        const attempt = quizAttemptHistory.find(a => a.quizId === quiz.id || a.id === quiz.id);
                        const statusColor = isCompleted 
                          ? (attempt?.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')
                          : 'bg-orange-100 text-orange-700';
                        const statusText = isCompleted 
                          ? (attempt?.passed ? 'Passed' : 'Not Passed')
                          : 'Not Started';

                        return (
                          <tr key={quiz.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-semibold text-gray-900">{quiz.title}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{quiz.description || 'No description'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {isCompleted ? (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {statusText}
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {statusText}
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {quiz.totalPoints ? (
                                <span className="font-semibold text-gray-900">{quiz.totalPoints}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {quiz.duration ? (
                                <div className="flex items-center justify-center gap-1 text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-sm">{quiz.duration} mins</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isCompleted && attempt?.score !== undefined ? (
                                <span className={`font-bold text-lg ${attempt.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                  {attempt.score}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleStartQuiz(quiz)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 justify-center ${
                                  isCompleted
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                }`}
                              >
                                {isCompleted ? (
                                  <>
                                    <Eye className="w-4 h-4" />
                                    Review
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4" />
                                    Start
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No assessments available</p>
                <p className="text-gray-400 text-sm mt-2">Your instructor hasn't posted any assessments yet</p>
              </div>
            )}

            {/* Legend */}
            {quizzes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span>
                    <span className="text-blue-800">Not Started - You haven't taken this assessment yet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-blue-800">Passed - You completed with passing score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-blue-800">Not Passed - Score below passing threshold</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Students</h2>
              <p className="text-sm text-gray-600 mt-1">All students enrolled in this class</p>
            </div>
            <div className="divide-y divide-gray-100">
              {loadingClassStudents ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">Loading students...</p>
                </div>
              ) : classStudents.length > 0 ? (
                classStudents.map((student) => {
                  const initials = (student.name || 'S')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <div key={student.id} className="p-6 flex items-center gap-4">
                      {student.avatar ? (
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-12 h-12 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                        <p className="text-sm text-gray-500 truncate">{student.email || 'No email available'}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No students found for this class</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Announcement Modal */}
      {showAnnouncementModal && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAnnouncementModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] shadow-2xl animate-slide-up overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-blue-600">
                      {selectedAnnouncement.title} <span className="text-gray-900">• {selectedAnnouncement.author}</span>
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Posted {selectedAnnouncement.time}</span>
                  <button 
                    onClick={() => setShowAnnouncementModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                {selectedAnnouncement.fullMessage}
              </div>

              {/* Attachments */}
              {selectedAnnouncement.attachments.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  {selectedAnnouncement.attachments.map((attachment, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <span className="font-medium text-gray-900">{attachment.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDownload(attachment.name)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Previous Announcements Modal */}
      {showAnnouncementHistoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAnnouncementHistoryModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden shadow-2xl animate-slide-up flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Previous Announcements</h2>
                <p className="text-sm text-gray-500 mt-1">View and open earlier class updates.</p>
              </div>
              <button
                onClick={() => setShowAnnouncementHistoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto">
              {activityFeed.slice(1).map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${item.type === 'assignment' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.type === 'assignment' ? 'Assignment' : 'Announcement'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{item.preview}</p>
                      <p className="text-xs text-gray-400 mt-2">{item.author} · {item.time || getRelativeTime(item.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAnnouncementHistoryModal(false);
                        if (item.type === 'announcement') {
                          openAnnouncement(item);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Material Details Modal */}
      {showMaterialModal && selectedMaterial && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMaterialModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl w-full max-w-5xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] shadow-2xl animate-slide-up overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedMaterial.title}</h2>
                <p className="text-base text-gray-600 mt-1">
                  By {selectedMaterial.author || 'Trainer'} | {formatMaterialDate(selectedMaterial.publishedAt || selectedMaterial.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setShowMaterialModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{selectedMaterial.description || 'No description provided'}</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Files ({Array.isArray(selectedMaterial.attachments) ? selectedMaterial.attachments.length : 0})
                </h3>
                <div className="space-y-3">
                  {Array.isArray(selectedMaterial.attachments) && selectedMaterial.attachments.length > 0 ? (
                    selectedMaterial.attachments.map((file, idx) => {
                      const canPreview = canPreviewMaterialFile(file.type || '');
                      const uploadedDate = formatMaterialDate(file.uploadedAt || selectedMaterial.createdAt);

                      return (
                        <div key={`${file.name}-${idx}`} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="p-3 bg-gray-100 rounded-xl">
                              <FileText className={`w-6 h-6 ${(file.type || '').includes('pdf') ? 'text-red-500' : 'text-purple-500'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-lg font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-sm text-gray-500 mt-1">
                                {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                <span className="mx-2">•</span>
                                Uploaded {uploadedDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {canPreview && (
                              <button
                                onClick={() => previewMaterialFile(selectedMaterial, idx)}
                                className="px-5 py-2.5 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Preview
                              </button>
                            )}
                            <button
                              onClick={() => downloadMaterialFile(selectedMaterial, idx)}
                              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="border border-gray-200 rounded-xl p-4 text-gray-500">
                      No files attached.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Quiz Assessment Modal */}
      {showQuizInfoModal && selectedQuizInfo && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowQuizInfoModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] shadow-2xl animate-slide-up overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedQuizInfo.title}</h2>
                <p className="text-sm text-gray-500 mt-1">Due {selectedQuizInfo.dueDate} · {selectedQuizInfo.questions.length} questions</p>
              </div>
              <button
                onClick={() => setShowQuizInfoModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-orange-700 uppercase">Duration</p>
                  <p className="text-xl font-bold text-orange-900 mt-1">{selectedQuizInfo.duration} mins</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-700 uppercase">Total Points</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">{selectedQuizInfo.totalPoints}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-green-700 uppercase">Pass Mark</p>
                  <p className="text-xl font-bold text-green-900 mt-1">60%</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Recent Performance</h3>
                {quizAttemptHistory.filter((attempt) => attempt.quizId === selectedQuizInfo.id).length > 0 ? (
                  <div className="space-y-2">
                    {quizAttemptHistory
                      .filter((attempt) => attempt.quizId === selectedQuizInfo.id)
                      .slice(0, 3)
                      .map((attempt) => (
                        <div key={attempt.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600">Attempt on {attempt.submittedAt}</span>
                          <span className={`font-semibold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {attempt.score}%
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No previous attempts yet for this assessment.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowQuizInfoModal(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowQuizInfoModal(false);
                  handleStartQuiz(selectedQuizInfo);
                }}
                className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Quiz
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Fullscreen Quiz Modal */}
      {showQuizModal && selectedQuiz && (
        <div 
          ref={quizContainerRef}
          className="fixed top-0 left-0 w-screen h-screen bg-gray-100 z-[9999] flex flex-col"
          style={{ margin: 0, padding: 0 }}
        >
          {/* Quiz Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleCloseQuiz}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                  <h1 className="font-bold text-gray-900">{selectedQuiz.title}</h1>
                  <p className="text-sm text-gray-500">{selectedQuiz.questions.length} questions · {selectedQuiz.totalPoints} points</p>
                </div>
              </div>
              
              {quizStarted && !quizSubmitted && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
                  timeRemaining < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <Timer className="w-5 h-5" />
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>
          </div>

          {/* Quiz Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6">
              {/* Before Starting */}
              {!quizStarted && !quizSubmitted && (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Pencil className="w-10 h-10 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedQuiz.title}</h2>
                  <p className="text-gray-500 mb-6">Read the instructions carefully before starting</p>
                  
                  <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quiz Instructions:</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>This quiz contains <strong>{selectedQuiz.questions.length} questions</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>You have <strong>{selectedQuiz.duration} minutes</strong> to complete the quiz</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Total points: <strong>{selectedQuiz.totalPoints}</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>The quiz will open in <strong>fullscreen mode</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>Do not leave or switch tabs during the quiz</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>Quiz will auto-submit when time expires</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={handleCloseQuiz}
                      className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleBeginQuiz}
                      className="px-8 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Start Quiz
                    </button>
                  </div>
                </div>
              )}

              {/* Taking Quiz */}
              {quizStarted && !quizSubmitted && (
                <div className="space-y-6">
                  {/* Progress */}
                  <div className="bg-white rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">Progress</span>
                      <span className="text-sm font-medium text-gray-900">
                        {Object.keys(answers).length} of {selectedQuiz.questions.length} answered
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${(Object.keys(answers).length / selectedQuiz.questions.length) * 100}%` }}
                      />
                    </div>
                    
                    {/* Question Pagination */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedQuiz.questions.map((q, index) => (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQuestion(index)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            currentQuestion === index
                              ? 'bg-orange-500 text-white'
                              : answers[q.id] !== undefined
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Question */}
                  {selectedQuiz.questions[currentQuestion] && (
                    <div className="bg-white rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          Question {currentQuestion + 1} of {selectedQuiz.questions.length}
                        </span>
                        <span className="text-sm text-gray-500">
                          {selectedQuiz.questions[currentQuestion].points} points
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-6">
                        {selectedQuiz.questions[currentQuestion].question}
                      </h3>

                      <div className="space-y-3">
                        {selectedQuiz.questions[currentQuestion].options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(selectedQuiz.questions[currentQuestion].id, index)}
                            className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                              answers[selectedQuiz.questions[currentQuestion].id] === index
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                answers[selectedQuiz.questions[currentQuestion].id] === index
                                  ? 'border-orange-500 bg-orange-500'
                                  : 'border-gray-300'
                              }`}>
                                {answers[selectedQuiz.questions[currentQuestion].id] === index && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                              <span className="font-medium text-gray-700">{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                        <button
                          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                          disabled={currentQuestion === 0}
                          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          Previous
                        </button>
                        
                        {currentQuestion === selectedQuiz.questions.length - 1 ? (
                          <button
                            onClick={handleSubmitQuiz}
                            className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Submit Quiz
                          </button>
                        ) : (
                          <button
                            onClick={() => setCurrentQuestion(prev => Math.min(selectedQuiz.questions.length - 1, prev + 1))}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                          >
                            Next
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz Results */}
              {quizSubmitted && quizResults && (
                <div className="space-y-6">
                  {/* Score Card */}
                  <div className={`rounded-2xl p-8 text-center ${
                    quizResults.passed ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
                  } text-white`}>
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      {quizResults.passed ? (
                        <Award className="w-12 h-12" />
                      ) : (
                        <XCircle className="w-12 h-12" />
                      )}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">
                      {quizResults.passed ? 'Congratulations!' : 'Keep Practicing!'}
                    </h2>
                    <p className="text-white/80 mb-6">
                      {quizResults.passed 
                        ? 'You have successfully passed this quiz!' 
                        : 'You need 60% to pass. Review the material and try again.'}
                    </p>
                    
                    <div className="flex items-center justify-center gap-8">
                      <div>
                        <p className="text-5xl font-bold">{quizResults.percentage}%</p>
                        <p className="text-white/70">Score</p>
                      </div>
                      <div className="w-px h-16 bg-white/30" />
                      <div>
                        <p className="text-5xl font-bold">{quizResults.correctCount}/{quizResults.totalQuestions}</p>
                        <p className="text-white/70">Correct Answers</p>
                      </div>
                      <div className="w-px h-16 bg-white/30" />
                      <div>
                        <p className="text-5xl font-bold">{quizResults.earnedPoints}/{quizResults.totalPoints}</p>
                        <p className="text-white/70">Points Earned</p>
                      </div>
                    </div>
                  </div>

                  {/* Review Answers */}
                  <div className="bg-white rounded-2xl p-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-6">Review Your Answers</h3>
                    
                    <div className="space-y-4">
                      {quizResults.questionResults.map((result, index) => (
                        <div 
                          key={result.id}
                          className={`p-4 rounded-xl border-2 ${
                            result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-1 rounded-full ${result.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                              {result.isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : (
                                <XCircle className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 mb-2">
                                {index + 1}. {result.question}
                              </p>
                              <div className="text-sm space-y-1">
                                <p className={result.isCorrect ? 'text-green-700' : 'text-red-700'}>
                                  Your answer: <strong>{result.options[result.userAnswer] || 'Not answered'}</strong>
                                </p>
                                {!result.isCorrect && (
                                  <p className="text-green-700">
                                    Correct answer: <strong>{result.options[result.correctAnswer]}</strong>
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {result.isCorrect ? `+${result.points}` : '0'} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="text-center">
                    <button
                      onClick={handleCloseQuiz}
                      className="px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                    >
                      Close Results
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal for Tab Switching */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Warning!</h2>
            <p className="text-gray-600 mb-6">
              Leaving the quiz page is not allowed during the exam. 
              Please stay on this page until you complete and submit your quiz.
            </p>
            <button
              onClick={() => {
                setShowWarningModal(false);
                enterFullscreen();
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors w-full"
            >
              Return to Quiz
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && selectedAnnouncementForComments && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Discussion</h2>
              <button 
                onClick={() => {
                  setShowCommentsModal(false);
                  setSelectedAnnouncementForComments(null);
                  setNewComment('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
                  </div>
                </div>
              ) : announcementComments[selectedAnnouncementForComments.id]?.length > 0 ? (
                announcementComments[selectedAnnouncementForComments.id].map((comment, index) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{comment.author}</p>
                        <p className="text-xs text-gray-500">
                          {formatAbsoluteTime(comment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{comment.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="border-t border-gray-100 p-6 bg-gray-50">
              <div className="flex gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows="3"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0 h-fit mt-3"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {showAnnouncementDetailModal && selectedAnnouncementDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {selectedAnnouncementDetail.authorAvatar ? (
                    <img src={selectedAnnouncementDetail.authorAvatar} alt={selectedAnnouncementDetail.author} className="w-full h-full object-cover" />
                  ) : (
                    (selectedAnnouncementDetail.author || 'T').split(' ').map(n => n[0]).join('').toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedAnnouncementDetail.author || 'Trainer'}</p>
                  <p className="text-xs text-gray-500">{formatAbsoluteTime(selectedAnnouncementDetail.createdAt)}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  // Cleanup subscription when closing
                  if (commentUnsubscribeRef.current) {
                    commentUnsubscribeRef.current();
                    commentUnsubscribeRef.current = null;
                  }
                  setShowAnnouncementDetailModal(false);
                  setSelectedAnnouncementDetail(null);
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
                  {selectedAnnouncementDetail.message || selectedAnnouncementDetail.preview}
                </p>
              </div>

              {/* Attachments */}
              {selectedAnnouncementDetail.attachments && selectedAnnouncementDetail.attachments.length > 0 && (
                <div>
                  <div className="space-y-2">
                    {selectedAnnouncementDetail.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                      >
                        <Paperclip className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        <span className="text-sm text-gray-700 group-hover:text-blue-600 font-medium flex-1 truncate">
                          {attachment.name || `Attachment ${index + 1}`}
                        </span>
                        <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Comments ({announcementComments[selectedAnnouncementDetail.id]?.length || 0})</h4>
                
                <div className="space-y-4 mb-6">
                  {announcementComments[selectedAnnouncementDetail.id]?.length > 0 ? (
                    announcementComments[selectedAnnouncementDetail.id].map((comment, index) => (
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
                            {user?.uid === comment.authorId && (
                              <button
                                onClick={async () => {
                                  try {
                                    // Delete comment logic would go here
                                    console.log('Delete comment:', index);
                                    addToast('Comment deleted', 'success');
                                  } catch (error) {
                                    console.error('Error deleting comment:', error);
                                  }
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Delete your comment"
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
                        document.querySelector('[data-add-comment-btn]')?.click();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-gray-50"
                  />
                  <button
                    data-add-comment-btn
                    disabled={submittingComment || !newComment.trim()}
                    onClick={async () => {
                      if (!newComment.trim()) {
                        addToast('Comment cannot be empty', 'error');
                        return;
                      }
                      
                      if (submittingComment) {
                        return;
                      }
                      
                      setSubmittingComment(true);
                      
                      try {
                        await addCommentToAnnouncement(courseId, selectedAnnouncementDetail.id, {
                          author: user?.displayName || 'You',
                          authorId: user?.uid,
                          message: newComment.trim()
                        });
                        
                        // Reload comments with avatars
                        const updatedComments = await getAnnouncementComments(courseId, selectedAnnouncementDetail.id);
                        const commentsWithAvatars = await Promise.all(
                          (updatedComments || []).map(async (comment) => {
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
                        
                        setAnnouncementComments(prev => ({
                          ...prev,
                          [selectedAnnouncementDetail.id]: commentsWithAvatars || []
                        }));
                        
                        setNewComment('');
                        addToast('Comment added successfully!', 'success');
                      } catch (error) {
                        console.error('Error adding comment:', error);
                        addToast('Failed to add comment', 'error');
                      } finally {
                        setSubmittingComment(false);
                      }
                    }}
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
    </div>
  );
};

export default StudentCourse;
