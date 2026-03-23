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
  Play
} from 'lucide-react';

const StudentCourse = () => {
  const { courseId } = useParams();
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
  const [quizAttemptHistory, setQuizAttemptHistory] = useState([
    { id: 1, quizId: 1, score: 78, passed: true, submittedAt: 'Mar 05' },
    { id: 2, quizId: 2, score: 64, passed: true, submittedAt: 'Mar 08' },
    { id: 3, quizId: 1, score: 84, passed: true, submittedAt: 'Mar 12' },
  ]);
  const quizContainerRef = useRef(null);

  // Mock active meeting (in real app, this would come from backend)
  const [activeMeeting, setActiveMeeting] = useState({
    id: 'hyt-abc123-xyz',
    link: 'https://meet.google.com/hyt-abc123-xyz',
    host: 'Ms. Maria Clara Garcia',
    startTime: '10:30 AM',
    participants: 45
  });

  const handleJoinMeeting = () => {
    if (activeMeeting) {
      window.open(activeMeeting.link, '_blank');
    }
  };

  const courseData = {
    name: 'Barista NC II',
    progress: 37,
    weeksLeft: 9
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

  const courseMaterials = [
    { id: 1, title: 'Chapter 1 Reading', type: 'PDF', size: '5mb', uploadedOn: 'Mar 01', description: 'Foundational reading on coffee bean origins and classifications.' },
    { id: 2, title: 'Chapter 2 Reading', type: 'PDF', size: '4mb', uploadedOn: 'Mar 03', description: 'Brewing fundamentals and extraction principles.' },
    { id: 3, title: 'Espresso Calibration Guide', type: 'PDF', size: '3mb', uploadedOn: 'Mar 05', description: 'Step-by-step guide for grinder and espresso machine calibration.' },
    { id: 4, title: 'Milk Steaming Worksheet', type: 'DOCX', size: '1mb', uploadedOn: 'Mar 07', description: 'Practice worksheet for milk texture and latte art prep.' },
    { id: 5, title: 'Customer Service Roleplay Script', type: 'PDF', size: '2mb', uploadedOn: 'Mar 09', description: 'Scenario-based script for customer handling simulations.' },
    { id: 6, title: 'Bar Flow Checklist', type: 'PDF', size: '2mb', uploadedOn: 'Mar 11', description: 'Daily opening and closing checklist for bar operations.' },
  ];

  const quizzes = [
    { 
      id: 1, 
      title: 'Coffee Beans Basics', 
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

  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setShowQuizModal(true);
    setQuizStarted(false);
    setCurrentQuestion(0);
    setAnswers({});
    setQuizSubmitted(false);
    setQuizResults(null);
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

  const handleSubmitQuiz = () => {
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
    
    setQuizSubmitted(true);
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

  const attemptedQuizCount = new Set(quizAttemptHistory.map((attempt) => attempt.quizId)).size;
  const passedAttemptCount = quizAttemptHistory.filter((attempt) => attempt.passed).length;
  const averageQuizScore = quizAttemptHistory.length
    ? Math.round(quizAttemptHistory.reduce((total, attempt) => total + attempt.score, 0) / quizAttemptHistory.length)
    : 0;
  const bestQuizScore = quizAttemptHistory.length
    ? Math.max(...quizAttemptHistory.map((attempt) => attempt.score))
    : 0;
  const quizCompletionRate = quizzes.length ? Math.round((attemptedQuizCount / quizzes.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
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
              You're currently enrolled in <span className="font-semibold text-white">{courseData.name}</span>.
            </p>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-colors">
                <BookOpen className="w-4 h-4" />
                Curriculum
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white/80 text-sm">
                <Clock className="w-4 h-4" />
                <span>{courseData.progress}% complete · Est. {courseData.weeksLeft} weeks left</span>
              </div>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="relative w-32 h-32 mr-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-white/20" />
              <circle 
                cx="64" cy="64" r="56" 
                stroke="currentColor" 
                strokeWidth="8" 
                fill="none" 
                strokeDasharray={`${courseData.progress * 3.52} 352`} 
                strokeLinecap="round"
                className="text-orange-400" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{courseData.progress}%</span>
              <span className="text-xs text-white/60 uppercase tracking-wider">Complete</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-white/60">Overall Progress</p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Announcements */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-900">Announcements</h2>
              </div>
              <button
                onClick={() => setShowAnnouncementHistoryModal(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="View previous announcements"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
              {announcements.map((announcement) => (
                <div 
                  key={announcement.id}
                  className="p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {announcement.title} <span className="font-normal text-gray-500">• {announcement.author}</span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{announcement.preview}</p>
                        {announcement.attachments.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
                            <Paperclip className="w-4 h-4" />
                            <span>{announcement.attachments.length} attachment</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-gray-400 mb-2">Posted {announcement.time}</p>
                      <button 
                        onClick={() => openAnnouncement(announcement)}
                        className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Course Materials */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-600" />
              <h2 className="font-bold text-gray-900">Course Materials - {courseData.name}</h2>
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
                      <span className="text-xs text-gray-500">{material.type} · {material.size} · Uploaded {material.uploadedOn}</span>
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
                  className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Pencil className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <p className="text-sm text-gray-500">Due {quiz.dueDate}</p>
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
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button 
                      onClick={() => handleStartQuiz(quiz)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Start Quiz
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
        </div>
      </div>

      {/* Announcement Modal */}
      {showAnnouncementModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up">
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
                    className="p-2 hover:bg-gray-100:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
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
      )}

      {/* Previous Announcements Modal */}
      {showAnnouncementHistoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-hidden shadow-2xl animate-slide-up flex flex-col">
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
              {announcements.slice(1).map((announcement) => (
                <div key={announcement.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{announcement.preview}</p>
                      <p className="text-xs text-gray-400 mt-2">{announcement.author} · {announcement.time}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAnnouncementHistoryModal(false);
                        openAnnouncement(announcement);
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
      )}

      {/* Material Details Modal */}
      {showMaterialModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedMaterial.title}</h2>
                  <p className="text-sm text-gray-500">{selectedMaterial.type} · {selectedMaterial.size} · Uploaded {selectedMaterial.uploadedOn}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMaterialModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{selectedMaterial.description}</p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(selectedMaterial.title)}
                  className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Assessment Modal */}
      {showQuizInfoModal && selectedQuizInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up overflow-hidden">
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

            <div className="p-6 space-y-4">
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-200">
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
      )}
    </div>
  );
};

export default StudentCourse;
