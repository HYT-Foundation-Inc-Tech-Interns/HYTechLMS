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
import { getAnnouncements, getModules, getClassMaterials, getAssessments, getAssignments, subscribeToAssessments, subscribeToAssignments, subscribeToAnnouncements, subscribeToClassMaterials, updateAnnouncement, deleteAnnouncement, getCourseByName, getStudentProgress, getStudentEnrollments, addCommentToAnnouncement, getAnnouncementComments, createAnnouncement, storeAnnouncementAttachment, compressAndStoreFile, downloadAttachment, submitQuizAttempt, hasStudentAttempted, getStudentQuizAttempts, getCourseEnrollments, getUserProfile, subscribeToClassTopics, subscribeToComments, submitAssignment, getMySubmission, logClassActivity, updateEnrollmentProgress, updateStudentProgress } from '../../utils/firestoreService';

// ---- Quiz question helpers (support every trainer-builder question type) ----
// Types: multiple-choice | true-false | dropdown (single index),
// checkbox (index array), short-answer (string), paragraph (free text, not
// auto-graded), linear-scale (number), multiple-grid (row->column map).
const isBlankAnswer = (v) =>
  v === undefined ||
  v === null ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

const normalizeText = (v) => String(v ?? '').trim().toLowerCase();

// Grade one question. Paragraph has no objective answer, so it is left for the
// trainer to review (autoGraded: false) rather than auto-marked wrong.
const gradeQuestion = (q, answer) => {
  const type = q?.type || 'multiple-choice';
  if (type === 'paragraph') return { isCorrect: false, autoGraded: false };
  if (type === 'checkbox') {
    const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
    const given = Array.isArray(answer) ? answer : [];
    const a = [...correct].map(String).sort().join(',');
    const b = [...given].map(String).sort().join(',');
    return { isCorrect: correct.length > 0 && a === b, autoGraded: true };
  }
  if (type === 'short-answer') {
    return {
      isCorrect: !isBlankAnswer(answer) && normalizeText(answer) === normalizeText(q.correctAnswer),
      autoGraded: true,
    };
  }
  if (type === 'linear-scale') {
    return { isCorrect: !isBlankAnswer(answer) && Number(answer) === Number(q.correctAnswer), autoGraded: true };
  }
  if (type === 'multiple-grid') {
    const rows = Array.isArray(q.rows) ? q.rows : [];
    const key = q.correctAnswer && typeof q.correctAnswer === 'object' ? q.correctAnswer : {};
    const given = answer && typeof answer === 'object' ? answer : {};
    const hasKey = Object.keys(key).length > 0;
    const allMatch = rows.length > 0 && rows.every((_, rIdx) => String(given[rIdx]) === String(key[rIdx]));
    return { isCorrect: hasKey && allMatch, autoGraded: true };
  }
  // single-choice: multiple-choice, true-false, dropdown
  return { isCorrect: !isBlankAnswer(answer) && answer === q.correctAnswer, autoGraded: true };
};

// Human-readable rendering of a student's answer (results review).
const describeAnswer = (q, answer) => {
  const type = q?.type || 'multiple-choice';
  const opts = Array.isArray(q?.options) ? q.options : [];
  if (isBlankAnswer(answer)) return 'Not answered';
  if (type === 'checkbox') {
    return (Array.isArray(answer) ? answer : []).map((i) => opts[i]).filter(Boolean).join(', ') || 'Not answered';
  }
  if (type === 'short-answer' || type === 'paragraph' || type === 'linear-scale') return String(answer);
  if (type === 'multiple-grid') {
    const rows = Array.isArray(q.rows) ? q.rows : [];
    const cols = Array.isArray(q.columns) ? q.columns : [];
    const given = answer && typeof answer === 'object' ? answer : {};
    return rows.map((row, rIdx) => `${row}: ${cols[given[rIdx]] ?? '—'}`).join('; ');
  }
  return opts[answer] ?? 'Not answered';
};

// Human-readable correct answer (results review).
const describeCorrect = (q) => {
  const type = q?.type || 'multiple-choice';
  const opts = Array.isArray(q?.options) ? q.options : [];
  if (type === 'checkbox') {
    return (Array.isArray(q.correctAnswer) ? q.correctAnswer : []).map((i) => opts[i]).filter(Boolean).join(', ');
  }
  if (type === 'short-answer' || type === 'linear-scale') return String(q.correctAnswer ?? '');
  if (type === 'multiple-grid') {
    const rows = Array.isArray(q.rows) ? q.rows : [];
    const cols = Array.isArray(q.columns) ? q.columns : [];
    const key = q.correctAnswer && typeof q.correctAnswer === 'object' ? q.correctAnswer : {};
    return rows.map((row, rIdx) => `${row}: ${cols[key[rIdx]] ?? '—'}`).join('; ');
  }
  return opts[q.correctAnswer] ?? '';
};

const StudentCourse = ({ previewMode = false }) => {
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
  const [showQuizInfoModal, setShowQuizInfoModal] = useState(false);
  const [selectedQuizInfo, setSelectedQuizInfo] = useState(null);

  // Submission-type assignment states
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionItem, setSubmissionItem] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [submittingWork, setSubmittingWork] = useState(false);
  
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
  const [quizAttemptHistory, setQuizAttemptHistory] = useState([]);
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
  const [submittedTaskIds, setSubmittedTaskIds] = useState(new Set());
  const lastProgressRef = useRef(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [editingAnnouncementText, setEditingAnnouncementText] = useState('');
  
  // Announcement posting states
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementFile, setAnnouncementFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [studentAvatar, setStudentAvatar] = useState(null);
  // Live avatar lookup (authorId -> current avatar) so posts reflect an
  // author's *current* photo instead of the snapshot stored when they posted.
  const [authorAvatars, setAuthorAvatars] = useState({});

  // Enrollment and progress data
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [studentProgress, setStudentProgress] = useState(null);
  const [courseData, setCourseDataLocal] = useState(null);
  
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
          
          if (!previewMode) {
            // Load student-specific data only in the real trainee experience.
            const enrollments = await getStudentEnrollments(user.uid);
            const currentEnrollment = enrollments.find(e => e.classId === courseData.id);
            if (currentEnrollment) {
              setEnrollmentData(currentEnrollment);
            }

            const progress = await getStudentProgress(user.uid, courseData.id);
            setStudentProgress(progress);
          }
        }
      } catch (error) {
        console.error('Error resolving course ID:', error);
      }
    };
    resolveCourseId();
  }, [decodedClassname, previewMode, user?.uid]);

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
        const initials = (user?.displayName || user?.email || 'Trainee')
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

  // Check attempted assessments and load full attempt history from Firestore
  useEffect(() => {
    if (previewMode) return;
    const loadAssessmentAttempts = async () => {
      const assessableItems = [
        ...(firestoreAssessments || []),
        ...(firestoreAssignments || []),
      ];

      if (!courseId || !user?.uid || !assessableItems.length) return;
      
      try {
        const attemptedIds = new Set();
        const submittedIds = new Set();
        const allAttempts = [];

        for (const item of assessableItems) {
          const itemId = String(item.id);
          // Submission tasks are completed via a submission, not a quiz attempt.
          if (item.type === 'Submission') {
            const sub = await getMySubmission(courseId, itemId, user.uid).catch(() => null);
            if (sub) submittedIds.add(itemId);
            continue;
          }
          const attempts = await getStudentQuizAttempts(courseId, itemId, user.uid);
          if (attempts && attempts.length > 0) {
            attemptedIds.add(itemId);

            attempts.forEach((attempt) => {
              const submittedDate = attempt.submittedAt?.toDate
                ? attempt.submittedAt.toDate()
                : attempt.submittedAt instanceof Date
                ? attempt.submittedAt
                : new Date(attempt.submittedAt);

              allAttempts.push({
                id: attempt.id,
                quizId: itemId,
                score: Number(attempt.score || 0),
                passed:
                  attempt.passed
                  ?? Number(attempt.score || 0) >= Number(attempt.passingScore || item.passingScore || 60),
                passingScore: Number(attempt.passingScore || item.passingScore || 60),
                submittedAt: submittedDate,
                submittedAtLabel: !isNaN(submittedDate?.getTime?.())
                  ? submittedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Unknown',
              });
            });
          }
        }
        
        setAttemptedAssessmentIds(attemptedIds);
        setSubmittedTaskIds(submittedIds);

        allAttempts.sort((a, b) => {
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dateB - dateA;
        });

        setQuizAttemptHistory(allAttempts);
      } catch (error) {
        console.error('Error loading assessment attempts:', error);
      }
    };
    
    loadAssessmentAttempts();
  }, [courseId, user?.uid, firestoreAssessments, firestoreAssignments, previewMode]);

  // Resolve each post author's *current* avatar so changing your photo updates
  // the icon on existing posts (not just the profile spotlight).
  useEffect(() => {
    const ids = [
      ...new Set([
        ...(firestoreAnnouncements || []).map((a) => a.authorId),
        ...(firestoreAssessments || []).map((a) => a.createdById),
      ].filter(Boolean)),
    ];
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const profile = await getUserProfile(id);
            return [id, profile?.avatarBase64 || profile?.avatarUrl || null];
          } catch {
            return [id, null];
          }
        })
      );
      if (cancelled) return;
      setAuthorAvatars((prev) => {
        const next = { ...prev };
        entries.forEach(([id, avatar]) => { next[id] = avatar; });
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [firestoreAnnouncements, firestoreAssessments]);

  // Map Firestore announcements for display
  const displayAnnouncements = firestoreAnnouncements.length > 0 
    ? firestoreAnnouncements.map(ann => ({
        id: ann.id,
        title: ann.title || null,  // Don't default to 'Announcement' - let message be the main content
        author: ann.author || 'Trainor',
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
      author: assessment.createdBy || 'Trainor',
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
              host: classData.meeting.trainerName || 'Trainor',
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
    if (previewMode) {
      addToast('Trainee preview is read-only.', 'info');
      return;
    }
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
    if (previewMode) {
      addToast('Trainee preview is read-only.', 'info');
      return;
    }
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
    if (previewMode) return false;
    // If announced has no authorId but user is posting as student, still allow edit/delete
    // This handles legacy announcements that may not have authorId set
    if (!announcement.authorId) {
      // For announcements without authorId, check if they match the current user's name
      return announcement.author === (user?.displayName || user?.email || 'Trainee');
    }
    return user?.uid === announcement.authorId;
  };

  // Check if can delete (author can always delete own, others can't delete)
  const canDelete = (announcement) => {
    return !previewMode && user?.uid === announcement.authorId;
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
    if (previewMode) {
      addToast('Trainee preview is read-only.', 'info');
      return;
    }
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
    if (previewMode) {
      addToast('Trainee preview is read-only.', 'info');
      return;
    }
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
        const initials = (user?.displayName || user?.email || 'Trainee')
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
        author: user?.displayName || user?.email || 'Trainee',
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

  // Real-time Firestore materials for this class
  const courseMaterials = firestoreMaterials && firestoreMaterials.length > 0 ? firestoreMaterials : [];

  // Only show published materials
  const publishedCourseMaterials = courseMaterials.filter((material) => material.isPublished === true);

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

  // Split quizzes (auto-graded assessments) from submission tasks so they live
  // under their own tabs — quizzes under "Assessments", submit-work tasks under
  // "Assignments" (Classroom/Teams style).
  // Never show drafts (kept-for-later items) to trainees.
  const publishedQuizzes = quizzes.filter((q) => String(q.status || 'active') !== 'draft');
  const submissionTasks = publishedQuizzes.filter((q) => q.type === 'Submission');
  const assessmentItems = publishedQuizzes.filter((q) => q.type !== 'Submission');

  // Keep the trainee's overall progress in sync: completion across published
  // assessments + submission tasks. Persists to the enrollment (so the trainer's
  // Trainees tab shows it) and to studentProgress (the trainee's own view).
  // Previously nothing wrote progress, so it was stuck at 0% even after finishing
  // every assessment.
  useEffect(() => {
    if (previewMode || !enrollmentData?.id || !courseId || !user?.uid) return;
    const assessmentIds = assessmentItems.map((a) => String(a.id));
    const taskIds = submissionTasks.map((t) => String(t.id));
    const total = assessmentIds.length + taskIds.length;
    if (total === 0) return; // nothing gradable yet — leave progress untouched
    const done =
      assessmentIds.filter((id) => attemptedAssessmentIds.has(id)).length +
      taskIds.filter((id) => submittedTaskIds.has(id)).length;
    const pct = Math.round((done / total) * 100);
    if (lastProgressRef.current === pct) return; // avoid redundant writes
    lastProgressRef.current = pct;
    updateEnrollmentProgress(enrollmentData.id, {
      ...(enrollmentData.progress || {}),
      overallProgress: pct,
      completedItems: done,
      totalItems: total,
    }).catch(() => {});
    updateStudentProgress(user.uid, courseId, { modulesCompleted: done, progressPercentage: pct }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptedAssessmentIds, submittedTaskIds, assessmentItems.length, submissionTasks.length, enrollmentData?.id, courseId, user?.uid, previewMode]);

  // An assessment/task is open once its "available from" date has passed
  // (or if none is set). Trainees can't start it before then.
  const isAssessmentOpen = (item) =>
    !item?.availableDate || new Date(item.availableDate).getTime() <= Date.now();
  const availableFromLabel = (item) =>
    item?.availableDate
      ? new Date(item.availableDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      : '';

  // Timer effect
  useEffect(() => {
    let interval;
    if (!previewMode && quizStarted && timeRemaining > 0 && !quizSubmitted) {
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
  }, [quizStarted, timeRemaining, quizSubmitted, previewMode]);

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
      if (!previewMode && !document.fullscreenElement && quizStarted && !quizSubmitted) {
        // User tried to exit fullscreen during quiz - re-enter
        enterFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [quizStarted, quizSubmitted, previewMode]);

  // Prevent tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (previewMode) return;
      if (document.hidden && quizStarted && !quizSubmitted) {
        setShowWarningModal(true);
        // Record the alt-tab away for the trainer's class Logs tab.
        if (courseId && user?.uid) {
          logClassActivity(courseId, {
            studentId: user.uid,
            studentName: user.displayName || user.name || user.email || 'Trainee',
            type: 'assessment_blur',
            assessmentId: selectedQuiz?.id || '',
            assessmentTitle: selectedQuiz?.title || '',
          });
        }
      } else if (!document.hidden && quizStarted && !quizSubmitted) {
        // When user comes back, re-enter fullscreen
        enterFullscreen();
        if (courseId && user?.uid) {
          logClassActivity(courseId, {
            studentId: user.uid,
            studentName: user.displayName || user.name || user.email || 'Trainee',
            type: 'assessment_focus',
            assessmentId: selectedQuiz?.id || '',
            assessmentTitle: selectedQuiz?.title || '',
          });
        }
      }
    };

    const handleBeforeUnload = (e) => {
      if (!previewMode && quizStarted && !quizSubmitted) {
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
  }, [quizStarted, quizSubmitted, previewMode]);

  // Track when a trainee opens and closes this class (trainer Logs tab).
  useEffect(() => {
    if (previewMode || !courseId || !user?.uid) return undefined;
    const actor = {
      studentId: user.uid,
      studentName: user.displayName || user.name || user.email || 'Trainee',
    };
    logClassActivity(courseId, { ...actor, type: 'class_open' });
    const handlePageHide = () => logClassActivity(courseId, { ...actor, type: 'class_close' });
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      logClassActivity(courseId, { ...actor, type: 'class_close' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.uid, previewMode]);

  const handleStartQuiz = async (quiz) => {
    if (!isAssessmentOpen(quiz)) {
      addToast(`This assessment opens ${availableFromLabel(quiz)}.`, 'info');
      return;
    }
    // Check if student has already attempted this assessment
    try {
      if (!previewMode && courseId && user?.uid) {
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
    setTimeRemaining(previewMode ? 0 : Number(selectedQuiz.duration || 0) * 60);
    if (!previewMode) enterFullscreen();
  };

  // Route an assessment to the right flow. Submission-type tasks open the
  // submission bin (upload/text), everything else opens the quiz runner.
  // Without this, a Submission task opened the quiz UI — a progress bar with
  // no questions and no submission bin.
  const openAssessment = (item) => {
    if (item?.type === 'Submission') return openSubmission(item);
    return handleStartQuiz(item);
  };

  // ---- Submission-type assignments ----
  const openSubmission = async (item) => {
    if (!isAssessmentOpen(item)) {
      addToast(`This task opens ${availableFromLabel(item)}.`, 'info');
      return;
    }
    setSubmissionItem(item);
    setSubmissionText('');
    setSubmissionLink('');
    setSubmissionFiles([]);
    setMySubmission(null);
    setShowSubmissionModal(true);
    if (!previewMode && courseId && user?.uid) {
      const existing = await getMySubmission(courseId, item.id, user.uid);
      if (existing) {
        setMySubmission(existing);
        setSubmissionText(existing.text || '');
        setSubmissionLink(existing.link || '');
      }
    }
  };

  // Effective allowed submission types for a task (empty = legacy text + file).
  const allowedSubmitTypes = Array.isArray(submissionItem?.allowedUploadTypes) && submissionItem.allowedUploadTypes.length > 0
    ? submissionItem.allowedUploadTypes
    : ['text', 'file'];
  const submitTextAllowed = allowedSubmitTypes.includes('text');
  const submitLinkAllowed = allowedSubmitTypes.includes('link');
  const submitFileAllowed = allowedSubmitTypes.some((t) => ['pdf', 'image', 'file'].includes(t));
  // accept attribute for the file input based on allowed kinds.
  const submitFileAccept = allowedSubmitTypes.includes('file')
    ? '*/*'
    : [allowedSubmitTypes.includes('pdf') ? '.pdf,application/pdf' : '', allowedSubmitTypes.includes('image') ? 'image/*' : '']
        .filter(Boolean)
        .join(',');
  const isFileAllowed = (file) => {
    if (allowedSubmitTypes.includes('file')) return true;
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    if (allowedSubmitTypes.includes('pdf') && (type === 'application/pdf' || name.endsWith('.pdf'))) return true;
    if (allowedSubmitTypes.includes('image') && type.startsWith('image/')) return true;
    return false;
  };

  const handleSubmitWork = async () => {
    if (previewMode) {
      addToast('Trainee preview is read-only. No work was submitted.', 'info');
      return;
    }
    if (!submissionItem || !courseId || !user?.uid) return;

    const hasText = submitTextAllowed && submissionText.trim().length > 0;
    const hasLink = submitLinkAllowed && submissionLink.trim().length > 0;
    const hasFiles = submitFileAllowed && submissionFiles.length > 0;

    if (!hasText && !hasLink && !hasFiles) {
      addToast('Add your submission using one of the allowed types before submitting.', 'error');
      return;
    }
    // Enforce link is a valid URL when links are the submission method.
    if (hasLink) {
      try {
        // eslint-disable-next-line no-new
        new URL(submissionLink.trim());
      } catch {
        addToast('Please enter a valid link (including https://).', 'error');
        return;
      }
    }
    // Enforce file kinds against the allowed types.
    if (submissionFiles.length > 0) {
      if (!submitFileAllowed) {
        addToast('File uploads are not allowed for this task.', 'error');
        return;
      }
      const bad = submissionFiles.find((f) => !isFileAllowed(f));
      if (bad) {
        addToast(`"${bad.name}" is not an allowed file type for this task.`, 'error');
        return;
      }
    }

    setSubmittingWork(true);
    try {
      const saved = await submitAssignment(courseId, submissionItem.id, {
        studentId: user.uid,
        studentName: user.displayName || user.name || user.email || 'Trainee',
        text: submitTextAllowed ? submissionText.trim() : '',
        link: submitLinkAllowed ? submissionLink.trim() : '',
        files: submissionFiles,
      });
      setMySubmission(saved);
      setSubmissionFiles([]);
      setSubmissionLink('');
      setSubmittedTaskIds((prev) => new Set(prev).add(String(submissionItem.id)));
      addToast('Work submitted!', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to submit work.', 'error');
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  // Free-text (short-answer / paragraph) answers.
  const handleTextAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Linear-scale answers (stored as a number).
  const handleScaleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Checkbox questions store an array of selected option indexes.
  const handleCheckboxToggle = (questionId, index) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const next = current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index];
      return { ...prev, [questionId]: next };
    });
  };

  // Grid questions store a { [rowIndex]: columnIndex } map.
  const handleGridAnswer = (questionId, rowIndex, colIndex) => {
    setAnswers(prev => {
      const current = prev[questionId] && typeof prev[questionId] === 'object' ? prev[questionId] : {};
      return { ...prev, [questionId]: { ...current, [rowIndex]: colIndex } };
    });
  };

  // Render the answer input for a question, by type.
  const renderQuestionInput = (q) => {
    if (!q) return null;
    const type = q.type || 'multiple-choice';
    const answer = answers[q.id];
    const options = Array.isArray(q.options) ? q.options : [];

    // Single-select: multiple-choice, true-false, dropdown
    if (type === 'multiple-choice' || type === 'true-false' || type === 'dropdown') {
      return options.map((option, index) => {
        const selected = answer === index;
        return (
          <button
            key={index}
            onClick={() => handleAnswerSelect(q.id, index)}
            className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
              selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
              }`}>
                {selected && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className="font-medium text-gray-700">{option}</span>
            </div>
          </button>
        );
      });
    }

    // Multi-select checkboxes
    if (type === 'checkbox') {
      const selectedList = Array.isArray(answer) ? answer : [];
      return options.map((option, index) => {
        const selected = selectedList.includes(index);
        return (
          <button
            key={index}
            onClick={() => handleCheckboxToggle(q.id, index)}
            className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
              selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
              }`}>
                {selected && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              <span className="font-medium text-gray-700">{option}</span>
            </div>
          </button>
        );
      });
    }

    // Short answer (single line)
    if (type === 'short-answer') {
      return (
        <input
          type="text"
          value={answer ?? ''}
          onChange={(e) => handleTextAnswer(q.id, e.target.value)}
          placeholder="Type your answer…"
          className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-all"
        />
      );
    }

    // Paragraph (multi-line, reviewed by trainer)
    if (type === 'paragraph') {
      return (
        <>
          <textarea
            value={answer ?? ''}
            onChange={(e) => handleTextAnswer(q.id, e.target.value)}
            rows={5}
            placeholder="Write your response…"
            className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none transition-all resize-y"
          />
          <p className="text-xs text-gray-400">This response will be reviewed by your trainer.</p>
        </>
      );
    }

    // Linear scale (radio row)
    if (type === 'linear-scale') {
      const range = Number(q.scaleRange) || 5;
      const values = Array.from({ length: range }, (_, i) => i + 1);
      return (
        <div>
          <div className="flex items-center justify-between gap-2">
            {values.map((val) => {
              const selected = Number(answer) === val;
              return (
                <button
                  key={val}
                  onClick={() => handleScaleAnswer(q.id, val)}
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                  }`}>
                    {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{val}</span>
                </button>
              );
            })}
          </div>
          {(q.scaleMin || q.scaleMax) && (
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{q.scaleMin}</span>
              <span>{q.scaleMax}</span>
            </div>
          )}
        </div>
      );
    }

    // Multiple grid (rows x columns, one column per row)
    if (type === 'multiple-grid') {
      const rows = Array.isArray(q.rows) ? q.rows : [];
      const columns = Array.isArray(q.columns) ? q.columns : [];
      const gridAnswer = answer && typeof answer === 'object' ? answer : {};
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2" />
                {columns.map((col, cIdx) => (
                  <th key={cIdx} className="p-2 text-sm font-medium text-gray-600 text-center">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-t border-gray-100">
                  <td className="p-2 text-sm font-medium text-gray-700">{row}</td>
                  {columns.map((_, cIdx) => {
                    const selected = gridAnswer[rIdx] === cIdx;
                    return (
                      <td key={cIdx} className="p-2 text-center">
                        <button
                          onClick={() => handleGridAnswer(q.id, rIdx, cIdx)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto ${
                            selected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 hover:border-orange-300'
                          }`}
                          aria-label={`${row} - ${columns[cIdx]}`}
                        >
                          {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Unknown type — show a note rather than crashing.
    return <p className="text-sm text-gray-400 italic">This question type isn’t supported yet.</p>;
  };

  const handleSubmitQuiz = async () => {
    if (previewMode) {
      addToast('Trainee preview is read-only. No attempt was submitted.', 'info');
      return;
    }
    if (!selectedQuiz || !courseId || !user?.uid) return;

    try {
      const gradedAttempt = await submitQuizAttempt(courseId, selectedQuiz.id, user.uid, {
        answers,
        timeTaken: 0,
      });
      const resultByQuestion = new Map(
        (gradedAttempt.questionResults || []).map((result) => [String(result.questionId), result])
      );
      setQuizResults({
        correctCount: Number(gradedAttempt.correctCount || 0),
        totalQuestions: Number(gradedAttempt.totalQuestions || selectedQuiz.questions.length),
        earnedPoints: Number(gradedAttempt.earnedPoints || 0),
        totalPoints: Number(gradedAttempt.totalPoints || 0),
        percentage: Number(gradedAttempt.score || 0),
        passingScore: Number(gradedAttempt.passingScore || selectedQuiz.passingScore || 60),
        passed: Boolean(gradedAttempt.passed),
        showCorrectAnswers: Boolean(gradedAttempt.showCorrectAnswers),
        questionResults: (selectedQuiz.questions || []).map((question) => ({
          ...question,
          ...(resultByQuestion.get(String(question.id)) || {}),
        })),
      });
      setAttemptedAssessmentIds((prev) => new Set([...prev, String(selectedQuiz.id)]));
      setQuizSubmitted(true);

      const refreshedAttempts = await getStudentQuizAttempts(courseId, selectedQuiz.id, user.uid);
      const normalizedRefreshed = (refreshedAttempts || []).map((attempt) => {
        const submittedDate = attempt.submittedAt?.toDate
          ? attempt.submittedAt.toDate()
          : attempt.submittedAt instanceof Date
          ? attempt.submittedAt
          : new Date(attempt.submittedAt);
        return {
          id: attempt.id,
          quizId: selectedQuiz.id,
          score: Number(attempt.score || 0),
          passed: Boolean(attempt.passed),
          passingScore: Number(attempt.passingScore || selectedQuiz.passingScore || 60),
          submittedAt: submittedDate,
          submittedAtLabel: !isNaN(submittedDate?.getTime?.())
            ? submittedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'Unknown',
        };
      });
      setQuizAttemptHistory((prev) => {
        const withoutCurrentQuiz = prev.filter((a) => String(a.quizId) !== String(selectedQuiz.id));
        return [...normalizedRefreshed, ...withoutCurrentQuiz].sort((a, b) => {
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dateB - dateA;
        });
      });
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      addToast(error?.message || 'Failed to submit assessment', 'error');
    }
    exitFullscreen();
  };

  const handleCloseQuiz = () => {
    if (previewMode) {
      exitFullscreen();
      setShowQuizModal(false);
      setQuizStarted(false);
      setQuizSubmitted(false);
      return;
    }
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

  const canPreviewMaterialFile = (fileType = '') => resolveSafePreviewMime(fileType) !== null;

  // Map an untrusted stored MIME string to a hardcoded, safe canonical value.
  // Returning a constant (never the raw stored string) prevents any HTML/JS
  // injection through a crafted "type" field when the file is previewed.
  const resolveSafePreviewMime = (rawType = '') => {
    const t = String(rawType).toLowerCase();
    if (t.includes('pdf')) return 'application/pdf';
    if (t.startsWith('image/png')) return 'image/png';
    if (t.startsWith('image/jpeg') || t.startsWith('image/jpg')) return 'image/jpeg';
    if (t.startsWith('image/gif')) return 'image/gif';
    if (t.startsWith('image/webp')) return 'image/webp';
    if (t.startsWith('image/')) return 'image/png'; // safe fallback for other raster images
    return null; // not previewable
  };

  const base64ToBlob = (base64, mime) => {
    // Tolerate values that still carry a data: prefix.
    const raw = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
    const byteChars = atob(raw);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i += 1) {
      bytes[i] = byteChars.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  };

  const previewMaterialFile = (material, fileIndex) => {
    const attachmentUrl = material?.attachments?.[fileIndex]?.url;
    const fileBase64 = material?.filesBase64?.[fileIndex];
    const rawType = material?.attachments?.[fileIndex]?.type || '';

    if (attachmentUrl) {
      window.open(attachmentUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!fileBase64) {
      addToast('Preview not available for this file', 'error');
      return;
    }

    // Force a safe MIME; never render with the attacker-controllable type.
    const safeMime = resolveSafePreviewMime(rawType);
    if (!safeMime) {
      addToast('Preview not supported for this file type', 'error');
      return;
    }

    try {
      const blob = base64ToBlob(fileBase64, safeMime);
      const objectUrl = URL.createObjectURL(blob);
      // Open the blob directly: the browser renders the PDF/image natively.
      // No HTML is written, so there is no injection sink.
      const previewWindow = window.open(objectUrl, '_blank');
      if (!previewWindow) {
        URL.revokeObjectURL(objectUrl);
        addToast('Popup blocked. Please allow popups to preview files.', 'error');
        return;
      }
      // Give the new tab time to load before releasing the URL.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      addToast('Unable to preview this file.', 'error');
    }
  };

  const downloadMaterialFile = (material, fileIndex) => {
    const fileName = material?.attachments?.[fileIndex]?.name || material?.title || 'material-file';
    const fileType = material?.attachments?.[fileIndex]?.type || 'application/octet-stream';
    const attachmentUrl = material?.attachments?.[fileIndex]?.url;
    const fileBase64 = material?.filesBase64?.[fileIndex];

    if (attachmentUrl) {
      const link = document.createElement('a');
      link.href = attachmentUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = fileName;
      link.click();
      return;
    }
    if (!fileBase64) {
      addToast('This file is unavailable.', 'error');
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

  const isQuizTaken = (quizId) => {
    const normalizedQuizId = String(quizId);
    return attemptedAssessmentIds.has(quizId)
      || attemptedAssessmentIds.has(normalizedQuizId)
      || quizAttemptHistory.some(
        (attempt) => String(attempt.quizId) === normalizedQuizId || String(attempt.id) === normalizedQuizId
      );
  };

  // Calculate stats from Firestore data
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
            onClick={() => setActiveTab('assignments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5 inline-block mr-2" />
            Assignments
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
                <h1 className="text-2xl font-bold mb-2">{previewMode ? 'Trainee experience' : 'Hello!'}</h1>
                <p className="text-white/80 mb-6">
                  {previewMode ? 'Previewing' : "You're currently enrolled in"}{' '}
                  <span className="font-semibold text-white">{displayCourseData.name}</span>.
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
                <p className="text-xs text-white/70 mt-1">{attemptedQuizCount}/{assessmentItems.length} quizzes attempted</p>
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
                <p className="text-xs text-white/70 mt-1">Passing mark is set per assessment</p>
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
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{displayCourseData.name}</span>
                </div>
              </div>
            </div>

            {/* Inline Announcement Composer - hidden in the admin's read-only preview. */}
            {!previewMode && (
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex gap-3">
                {studentAvatar ? (
                  <img 
                    src={studentAvatar}
                    alt={user?.displayName || 'Trainee'}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(user?.displayName || user?.email || 'Trainee').split(' ').map(n => n[0]).join('').toUpperCase()}
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
            )}

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
                            {(item.authorId && item.authorId in authorAvatars ? authorAvatars[item.authorId] : item.authorAvatar) ? (
                              <img
                                src={item.authorId && item.authorId in authorAvatars ? authorAvatars[item.authorId] : item.authorAvatar}
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
                            {(item.authorId && item.authorId in authorAvatars ? authorAvatars[item.authorId] : item.authorAvatar) ? (
                              <img
                                src={item.authorId && item.authorId in authorAvatars ? authorAvatars[item.authorId] : item.authorAvatar}
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
              <span className="text-sm text-gray-500">{assessmentItems.length} available</span>
            </div>

            <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto">
              {assessmentItems.map((quiz) => (
                <div 
                  key={quiz.id}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors relative"
                >
                  {/* "Already Answered" Badge */}
                  {isQuizTaken(quiz.id) && (
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
                          {!isAssessmentOpen(quiz) && (
                            <span className="text-xs text-amber-600 block">Opens {availableFromLabel(quiz)}</span>
                          )}
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
                        {quiz.duration ? `${quiz.duration} mins` : 'No time limit'}
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
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    {isQuizTaken(quiz.id) ? (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-100 text-green-700 rounded-lg font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Taken
                      </div>
                    ) : !isAssessmentOpen(quiz) ? (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed">
                        <Timer className="w-4 h-4" />
                        Opens {availableFromLabel(quiz)}
                      </div>
                    ) : quiz.type === 'Submission' ? (
                      <button
                        onClick={() => openSubmission(quiz)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Open &amp; Submit
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartQuiz(quiz)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Start Quiz
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {assessmentItems.length === 0 && (
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
                      onClick={() => downloadMaterialFile(material, 0)}
                      disabled={
                        !material?.attachments?.[0]?.url
                        && !material?.filesBase64?.[0]
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      Download
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
                              <span>By {material.author || 'Trainor'}</span>
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
                <p className="text-3xl font-bold text-gray-900 mt-2">{assessmentItems.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-gray-600 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{attemptedAssessmentIds.size}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{assessmentItems.length - attemptedAssessmentIds.size}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-gray-600 text-sm font-medium">Average Score</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{averageQuizScore}%</p>
              </div>
            </div>

            {/* All Assessments List */}
            {assessmentItems.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h2 className="text-lg font-bold text-gray-900">All Assessments</h2>
                  <p className="text-sm text-gray-600 mt-1">View and take assessments posted by your trainor</p>
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
                      {assessmentItems.map((quiz) => {
                        const isCompleted = isQuizTaken(quiz.id);
                        const attempt = quizAttemptHistory.find((a) => String(a.quizId) === String(quiz.id) || String(a.id) === String(quiz.id));
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
                                <span className="text-gray-400">No limit</span>
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
                                <span className={`font-bold text-lg ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                                  {attempt.score}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {!isCompleted && !isAssessmentOpen(quiz) ? (
                                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  Opens {availableFromLabel(quiz)}
                                </span>
                              ) : quiz.type === 'Submission' ? (
                                <button
                                  onClick={() => openSubmission(quiz)}
                                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 justify-center bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  <FileText className="w-4 h-4" />
                                  Submit
                                </button>
                              ) : isCompleted ? (
                                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                  Taken
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleStartQuiz(quiz)}
                                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 justify-center bg-orange-600 text-white hover:bg-orange-700"
                                >
                                  <Play className="w-4 h-4" />
                                  Start
                                </button>
                              )}
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
            {assessmentItems.length > 0 && (
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

        {/* Assignments Tab (submission-type tasks) */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-gray-900">Assignments</h2>
                <span className="text-sm text-gray-500">{submissionTasks.length} total</span>
              </div>
              <p className="text-sm text-gray-600">Submit your work for these tasks.</p>
            </div>

            {submissionTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No assignments yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissionTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
                        <p className="text-sm text-gray-500">
                          Due {task.dueDate}
                          {task.totalPoints ? ` · ${task.totalPoints} pts` : ''}
                        </p>
                        {task.author && <p className="text-xs text-gray-400 mt-0.5">Posted by {task.author}</p>}
                      </div>
                    </div>
                    {isAssessmentOpen(task) ? (
                      <button
                        onClick={() => openSubmission(task)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Open &amp; Submit
                      </button>
                    ) : (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-500">
                        <Timer className="w-4 h-4" />
                        Opens {availableFromLabel(task)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                        onClick={() => downloadAttachment(attachment)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download
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
                  By {selectedMaterial.author || 'Trainor'} | {formatMaterialDate(selectedMaterial.publishedAt || selectedMaterial.createdAt)}
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

              {selectedMaterial.link && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Link</h3>
                  <a
                    href={selectedMaterial.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline break-all"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    {selectedMaterial.link}
                  </a>
                </div>
              )}

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
                <p className="text-sm text-gray-500 mt-1">Due {selectedQuizInfo.dueDate} · {selectedQuizInfo.questions?.length || 0} questions</p>
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
                  <p className="text-xl font-bold text-orange-900 mt-1">
                    {selectedQuizInfo.duration ? `${selectedQuizInfo.duration} mins` : 'No limit'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-700 uppercase">Total Points</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">{selectedQuizInfo.totalPoints}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-green-700 uppercase">Pass Mark</p>
                  <p className="text-xl font-bold text-green-900 mt-1">{selectedQuizInfo.passingScore || 60}%</p>
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
                          <span className="text-gray-600">Attempt on {attempt.submittedAtLabel || (attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown')}</span>
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
                  if (isQuizTaken(selectedQuizInfo?.id)) return;
                  setShowQuizInfoModal(false);
                  openAssessment(selectedQuizInfo);
                }}
                disabled={isQuizTaken(selectedQuizInfo?.id)}
                className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
              >
                {isQuizTaken(selectedQuizInfo?.id) ? <CheckCircle className="w-4 h-4" /> : selectedQuizInfo?.type === 'Submission' ? <FileText className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isQuizTaken(selectedQuizInfo?.id) ? 'Taken' : selectedQuizInfo?.type === 'Submission' ? 'Open & Submit' : 'Start Quiz'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Submission Assignment Modal */}
      {showSubmissionModal && submissionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSubmissionModal(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] shadow-2xl animate-slide-up overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{submissionItem.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Submission {submissionItem.dueDate ? `· Due ${submissionItem.dueDate}` : ''}
                </p>
              </div>
              <button
                onClick={() => setShowSubmissionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <p className="text-sm text-gray-600">
                {submissionItem.description || 'Submit your work for this task below.'}
              </p>

              {previewMode && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  Preview only: submission fields are disabled and nothing can be submitted.
                </div>
              )}

              {/* Graded result */}
              {mySubmission?.status === 'graded' && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Grade</span>
                    <span className="text-2xl font-bold text-green-700">
                      {mySubmission.grade ?? '—'}
                    </span>
                  </div>
                  {mySubmission.feedback && (
                    <div className="mt-2 text-sm text-green-900">
                      <p className="font-medium">Feedback:</p>
                      <p>{mySubmission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Current submission status */}
              {mySubmission && mySubmission.status !== 'graded' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  You submitted on{' '}
                  {mySubmission.submittedAt
                    ? new Date(mySubmission.submittedAt.toDate?.() || mySubmission.submittedAt).toLocaleString()
                    : 'record'}
                  . You can resubmit to replace it until it's graded.
                </div>
              )}

              {/* Allowed submission types the trainer set for this task */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500">Allowed:</span>
                {allowedSubmitTypes.map((t) => (
                  <span key={t} className="text-xs rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 capitalize">
                    {t === 'file' ? 'any file' : t === 'link' ? 'link' : t}
                  </span>
                ))}
              </div>

              {submitTextAllowed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your work</label>
                  <textarea
                    rows={4}
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    disabled={previewMode}
                    placeholder="Type your answer or notes here..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              )}

              {submitLinkAllowed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                  <input
                    type="url"
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    disabled={previewMode}
                    placeholder="https://…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  {mySubmission?.link && (
                    <p className="text-xs text-gray-500 mt-1 break-all">Previously submitted: {mySubmission.link}</p>
                  )}
                </div>
              )}

              {submitFileAllowed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attach files <span className="text-gray-400">(max 25MB each)</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    accept={submitFileAccept}
                    onChange={(e) => setSubmissionFiles(Array.from(e.target.files || []))}
                    disabled={previewMode}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {submissionFiles.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{submissionFiles.length} file(s) selected</p>
                  )}
                  {mySubmission?.attachments?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Previously submitted: {mySubmission.attachments.map((a) => a.name).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSubmissionModal(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSubmitWork}
                disabled={previewMode || submittingWork}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {previewMode ? 'Submission Disabled' : submittingWork ? 'Submitting...' : mySubmission ? 'Resubmit' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Quiz Modal */}
      {showQuizModal && selectedQuiz && (
        <div 
          ref={quizContainerRef}
          className="fixed inset-0 h-screen h-[100dvh] w-full bg-gray-100 z-[9999] flex flex-col"
          style={{ margin: 0, padding: 0 }}
        >
          {/* Quiz Header */}
          <div className="bg-white border-b border-gray-200 px-3 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
              <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                <button 
                  onClick={handleCloseQuiz}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <div className="min-w-0">
                  <h1 className="truncate font-bold text-gray-900">{selectedQuiz.title}</h1>
                  <p className="text-sm text-gray-500">{selectedQuiz.questions.length} questions · {selectedQuiz.totalPoints} points</p>
                </div>
              </div>
              
              {quizStarted && !quizSubmitted && Number(selectedQuiz.duration) > 0 && (
                <div className={`flex shrink-0 items-center gap-1 px-2 py-2 rounded-lg font-mono text-sm font-bold sm:gap-2 sm:px-4 sm:text-lg ${
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
            <div className="max-w-3xl mx-auto p-3 sm:p-6">
              {/* Before Starting */}
              {!quizStarted && !quizSubmitted && (
                <div className="bg-white rounded-2xl p-4 text-center sm:p-8">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Pencil className="w-10 h-10 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedQuiz.title}</h2>
                  <p className="text-gray-500 mb-6">Read the instructions carefully before starting</p>
                  
                  <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 sm:p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quiz Instructions:</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>This quiz contains <strong>{selectedQuiz.questions.length} questions</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>
                          {selectedQuiz.duration
                            ? <>You have <strong>{selectedQuiz.duration} minutes</strong> to complete the quiz</>
                            : <>This quiz has <strong>no time limit</strong></>}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Total points: <strong>{selectedQuiz.totalPoints}</strong></span>
                      </li>
                      {!previewMode && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>The quiz will open in <strong>fullscreen mode</strong></span>
                      </li>
                      )}
                      {!previewMode && (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>Do not leave or switch tabs during the quiz</span>
                      </li>
                      )}
                      {!previewMode && selectedQuiz.duration > 0 && (
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>Quiz will auto-submit when time expires</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <button 
                      onClick={handleCloseQuiz}
                      className="w-full px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleBeginQuiz}
                      className="flex w-full items-center justify-center gap-2 px-8 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors sm:w-auto"
                    >
                      <Play className="w-5 h-5" />
                      {previewMode ? 'Preview Questions' : 'Start Quiz'}
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
                    <div className="bg-white rounded-xl p-4 sm:p-6">
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

                      {selectedQuiz.questions[currentQuestion].description && (
                        <p className="text-sm text-gray-500 -mt-4 mb-6">
                          {selectedQuiz.questions[currentQuestion].description}
                        </p>
                      )}

                      <div className="space-y-3">
                        {renderQuestionInput(selectedQuiz.questions[currentQuestion])}
                      </div>

                      {/* Navigation */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6 border-t border-gray-100">
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
                            onClick={previewMode ? handleCloseQuiz : handleSubmitQuiz}
                            className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            {previewMode ? 'Finish Preview' : 'Submit Quiz'}
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
                        : `You need ${quizResults.passingScore}% to pass. Review the material and try again.`}
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
                      {quizResults.questionResults.map((result, index) => {
                        const pending = result.autoGraded === false; // paragraph → trainer reviews
                        const cardClass = pending
                          ? 'border-gray-200 bg-gray-50'
                          : result.isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50';
                        const badgeClass = pending ? 'bg-gray-400' : result.isCorrect ? 'bg-green-500' : 'bg-red-500';
                        return (
                          <div key={result.id} className={`p-4 rounded-xl border-2 ${cardClass}`}>
                            <div className="flex items-start gap-3">
                              <div className={`p-1 rounded-full ${badgeClass}`}>
                                {pending ? (
                                  <FileText className="w-5 h-5 text-white" />
                                ) : result.isCorrect ? (
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
                                  <p className={pending ? 'text-gray-700' : result.isCorrect ? 'text-green-700' : 'text-red-700'}>
                                    Your answer: <strong>{describeAnswer(result, result.userAnswer)}</strong>
                                  </p>
                                  {pending ? (
                                    <p className="text-gray-500">Your trainer will review this response.</p>
                                  ) : !result.isCorrect && quizResults.showCorrectAnswers ? (
                                    <p className="text-green-700">
                                      Correct answer: <strong>{describeCorrect(result)}</strong>
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <span className={`text-sm font-medium ${pending ? 'text-gray-500' : result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {pending ? 'Review' : result.isCorrect ? `+${result.points}` : '0 pts'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
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
            {!previewMode && (
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
            )}
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
                  <p className="font-semibold text-gray-900">{selectedAnnouncementDetail.author || 'Trainor'}</p>
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
                            {!previewMode && user?.uid === comment.authorId && (
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
                {!previewMode && (
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCourse;
