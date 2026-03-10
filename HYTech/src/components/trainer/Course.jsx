import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Copy, 
  MoreVertical, 
  Pencil, 
  FileText, 
  HelpCircle, 
  ClipboardList,
  ChevronUp,
  ChevronDown,
  Plus,
  UserPlus,
  Users,
  X,
  Save,
  Trash2,
  Edit2,
  Check,
  BookOpen,
  MessageSquare,
  FolderPlus,
  Send,
  Calendar,
  Clock,
  Paperclip,
  Award,
  TrendingUp,
  BarChart3,
  Play,
  Eye,
  MessageCircle,
  Share2,
  Bookmark,
  Bell,
  Settings,
  Grid3X3,
  List,
  CircleDot,
  ToggleLeft,
  AlignLeft,
  ListChecks,
  GripVertical,
  Image,
  Video,
  ExternalLink
} from 'lucide-react';

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [topicsExpanded, setTopicsExpanded] = useState(true);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showItemMenu, setShowItemMenu] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [announcementText, setAnnouncementText] = useState('');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('');
  const [quizPoints, setQuizPoints] = useState('100');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionType, setCurrentQuestionType] = useState('multiple-choice');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [activeMeeting, setActiveMeeting] = useState(null);
  const createDropdownRef = useRef(null);
  const menuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (createDropdownRef.current && !createDropdownRef.current.contains(event.target)) {
        setShowCreateDropdown(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowItemMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Copy class code
  const copyClassCode = () => {
    navigator.clipboard.writeText(courseData.code);
    setCopiedCode(true);
    showToast('Class code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Handle create item
  const handleCreateItem = (type) => {
    setCreateType(type);
    setShowCreateDropdown(false);
    if (type === 'Quiz Assignment') {
      setShowQuizModal(true);
      setQuizQuestions([]);
      setQuizTitle('');
      setQuizDescription('');
      setQuizTimeLimit('');
      setQuizPoints('100');
    } else {
      setShowCreateModal(true);
    }
  };

  // Add new question to quiz
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      type: currentQuestionType,
      question: '',
      options: currentQuestionType === 'multiple-choice' ? ['', '', '', ''] : 
               currentQuestionType === 'true-false' ? ['True', 'False'] : [],
      correctAnswer: currentQuestionType === 'true-false' ? 0 : null,
      points: 10
    };
    setQuizQuestions([...quizQuestions, newQuestion]);
  };

  // Update question
  const updateQuestion = (questionId, field, value) => {
    setQuizQuestions(quizQuestions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  // Update option for a question
  const updateOption = (questionId, optionIndex, value) => {
    setQuizQuestions(quizQuestions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  // Add option to question
  const addOption = (questionId) => {
    setQuizQuestions(quizQuestions.map(q => {
      if (q.id === questionId && q.options.length < 6) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
  };

  // Remove option from question
  const removeOption = (questionId, optionIndex) => {
    setQuizQuestions(quizQuestions.map(q => {
      if (q.id === questionId && q.options.length > 2) {
        const newOptions = q.options.filter((_, i) => i !== optionIndex);
        return { 
          ...q, 
          options: newOptions,
          correctAnswer: q.correctAnswer === optionIndex ? null : 
                        q.correctAnswer > optionIndex ? q.correctAnswer - 1 : q.correctAnswer
        };
      }
      return q;
    }));
  };

  // Delete question
  const deleteQuestion = (questionId) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== questionId));
  };

  // Save quiz
  const handleSaveQuiz = () => {
    if (!quizTitle.trim()) {
      showToast('Please enter a quiz title', 'error');
      return;
    }
    if (quizQuestions.length === 0) {
      showToast('Please add at least one question', 'error');
      return;
    }
    showToast(`Quiz "${quizTitle}" created with ${quizQuestions.length} questions!`);
    setShowQuizModal(false);
    setQuizQuestions([]);
    setQuizTitle('');
  };

  // Handle save new item
  const handleSaveItem = (e) => {
    e.preventDefault();
    showToast(`${createType} created successfully!`);
    setShowCreateModal(false);
    setCreateType('');
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setEditItem(item);
    setShowItemMenu(null);
    setShowEditModal(true);
  };

  // Handle delete item
  const handleDeleteItem = (item) => {
    setShowItemMenu(null);
    showToast(`"${item.title}" deleted successfully!`);
  };

  // Handle save announcement
  const handleSaveAnnouncement = (e) => {
    e.preventDefault();
    showToast('Announcement posted successfully!');
    setShowAnnouncementModal(false);
    setAnnouncementText('');
  };

  // Handle invite students
  const handleInviteStudents = (e) => {
    e.preventDefault();
    showToast('Invitation sent successfully!');
    setShowInviteModal(false);
  };

  // Handle Google Meet
  const handleStartMeeting = () => {
    // Generate a random meeting ID
    const meetingId = 'hyt-' + Math.random().toString(36).substring(2, 8) + '-' + Math.random().toString(36).substring(2, 5);
    const link = `https://meet.google.com/${meetingId}`;
    setMeetingLink(link);
    setActiveMeeting({
      id: meetingId,
      link: link,
      startTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      host: courseData.trainer
    });
    setShowMeetingModal(true);
  };

  const handleJoinMeeting = () => {
    if (activeMeeting) {
      window.open(activeMeeting.link, '_blank');
    }
  };

  const handleEndMeeting = () => {
    setActiveMeeting(null);
    setMeetingLink('');
    showToast('Meeting ended');
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(activeMeeting?.link || meetingLink);
    showToast('Meeting link copied!');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Grid3X3 },
    { id: 'modules', label: 'Modules', icon: BookOpen },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'assessments', label: 'Assessments', icon: ClipboardList },
  ];

  const courseData = {
    name: 'Sample Class',
    batch: 'Dreamers Batch 16',
    code: 'HYTGLOBAL',
    program: 'BARISTA NC II',
    scholarship: 'TESDA',
    progress: 65,
    totalModules: 12,
    completedModules: 8,
    students: 67,
    trainer: 'Ms. Maria Clara Garcia'
  };

  const activityFeed = [
    {
      id: 1,
      type: 'material',
      author: 'Ms Garcia',
      authorInitials: 'MG',
      action: 'uploaded new learning material',
      title: 'Module 1: Introduction to Barista',
      time: '2 hours ago',
      icon: FileText,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      id: 2,
      type: 'question',
      author: 'Ms Garcia',
      authorInitials: 'MG',
      action: 'posted a discussion topic',
      title: 'What makes a perfect espresso shot?',
      time: '3 hours ago',
      icon: MessageCircle,
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 3,
      type: 'assignment',
      author: 'Ms Garcia',
      authorInitials: 'MG',
      action: 'created new assessment',
      title: 'Practical Assessment: Latte Art',
      time: '5 hours ago',
      icon: ClipboardList,
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      id: 4,
      type: 'announcement',
      author: 'Ms Garcia',
      authorInitials: 'MG',
      action: 'made an announcement',
      title: 'Class schedule update for next week',
      time: '1 day ago',
      icon: Bell,
      gradient: 'from-orange-500 to-red-600'
    },
  ];

  const modules = [
    { id: 1, title: 'Introduction to Coffee', lessons: 5, duration: '2h 30m', progress: 100, status: 'completed' },
    { id: 2, title: 'Espresso Fundamentals', lessons: 8, duration: '4h 15m', progress: 100, status: 'completed' },
    { id: 3, title: 'Milk Steaming & Texturing', lessons: 6, duration: '3h 45m', progress: 75, status: 'in-progress' },
    { id: 4, title: 'Latte Art Basics', lessons: 10, duration: '5h 00m', progress: 0, status: 'locked' },
    { id: 5, title: 'Customer Service Excellence', lessons: 4, duration: '2h 00m', progress: 0, status: 'locked' },
  ];

  const trainers = [
    { id: 1, name: 'Maria Clara Garcia', role: 'Lead Trainer', avatar: '', initials: 'MG' }
  ];

  const students = [];

  // Overview Tab - New Design
  const OverviewTab = () => (
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
              <h1 className="text-3xl font-bold mb-2">{courseData.name}</h1>
              <p className="text-white/70 mb-4">{courseData.batch}</p>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                    MG
                  </div>
                  <span className="text-white/80">{courseData.trainer}</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Users className="w-4 h-4" />
                  <span>{courseData.students} students enrolled</span>
                </div>
              </div>
            </div>

            {/* Right - Quick Info */}
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold">{courseData.totalModules}</p>
                <p className="text-xs text-white/70">Modules</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold">4</p>
                <p className="text-xs text-white/70">Assessments</p>
              </div>
              <div className="bg-orange-500 rounded-xl px-4 py-3 text-center">
                <p className="text-sm font-bold">{courseData.scholarship}</p>
                <p className="text-xs text-white/80">{courseData.program}</p>
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
          onClick={() => handleCreateItem('Assignment')}
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
          onClick={() => handleCreateItem('Materials')}
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
          <p className="text-xl font-bold font-mono">{courseData.code}</p>
        </div>
        <button 
          onClick={copyClassCode}
          className={`p-2 rounded-lg transition-all ${copiedCode ? 'bg-green-500' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - Timeline Style */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">Recent Activity</h2>
            <span className="text-sm text-gray-500">{activityFeed.length} updates</span>
          </div>

          {/* Inline Announcement Composer */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                AU
              </div>
              <div className="flex-1">
                <input 
                  type="text"
                  placeholder="Share something with your class..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {announcementText && (
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={() => { showToast('Announcement posted!'); setAnnouncementText(''); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Post
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="divide-y divide-gray-100">
            {activityFeed.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.id}
                  className="p-5 hover:bg-gray-50/80:bg-gray-700/50 cursor-pointer transition-all group"
                >
                  <div className="flex gap-4">
                    {/* Timeline Indicator */}
                    <div className="relative flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {index !== activityFeed.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 mt-3" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-gray-900">
                            <span className="font-semibold">{item.author}</span>
                            <span className="text-gray-500"> {item.action}</span>
                          </p>
                          <h3 className="font-medium text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </p>
                        </div>
                        <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-100:bg-gray-600 rounded-lg transition-all">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Module Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Module Progress</h3>
            </div>
            <div className="p-5 space-y-4">
              {modules.slice(0, 4).map(module => (
                <div key={module.id} className="group cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate flex-1">
                      {module.title}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      module.status === 'completed' ? 'bg-green-100 text-green-700' :
                      module.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {module.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all group-hover:opacity-80 ${
                        module.status === 'completed' ? 'bg-green-500' :
                        module.status === 'in-progress' ? 'bg-blue-500' :
                        'bg-gray-300'
                      }`}
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setActiveTab('modules')}
                className="w-full text-center text-sm text-blue-600 font-medium hover:text-blue-700 py-2"
              >
                View all modules
              </button>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Upcoming Deadlines</h3>
            </div>
            <div className="p-5">
              <div className="text-center py-6">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No deadlines this week</p>
                <p className="text-gray-400 text-xs mt-1">All caught up!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Modules Tab Content - New Design
  const ModulesTab = () => (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="relative" ref={createDropdownRef}>
          <button 
            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Add Content</span>
          </button>
          
          {showCreateDropdown && (
            <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20 animate-slide-down">
              <div className="p-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase px-2">Create New</span>
              </div>
              {[
                { type: 'Assignment', icon: ClipboardList, desc: 'Task with deadline' },
                { type: 'Quiz Assignment', icon: FileText, desc: 'Graded assessment' },
                { type: 'Question', icon: HelpCircle, desc: 'Discussion topic' },
                { type: 'Materials', icon: BookOpen, desc: 'Learning resource' },
                { type: 'Topic', icon: FolderPlus, desc: 'New section' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => handleCreateItem(item.type)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 transition-all"
                  >
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block font-medium">{item.type}</span>
                      <span className="text-xs text-gray-400">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
          >
            <List className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
          >
            <Grid3X3 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Modules Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {modules.map((module, index) => (
          <div 
            key={module.id}
            className={`bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all cursor-pointer group ${
              viewMode === 'list' ? 'flex items-center' : ''
            }`}
          >
            {/* Module Number Badge */}
            <div className={`${viewMode === 'list' ? 'w-20 h-full' : 'h-24'} bg-gradient-to-br ${
              module.status === 'completed' ? 'from-green-500 to-emerald-600' :
              module.status === 'in-progress' ? 'from-blue-500 to-indigo-600' :
              'from-gray-400 to-gray-500'
            } flex items-center justify-center relative`}>
              <span className="text-white text-3xl font-bold opacity-90">{String(index + 1).padStart(2, '0')}</span>
              {module.status === 'completed' && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className={`p-5 flex-1 ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    module.status === 'completed' ? 'bg-green-100 text-green-700' :
                    module.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {module.status === 'completed' ? 'Completed' : 
                     module.status === 'in-progress' ? 'In Progress' : 'Locked'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                  {module.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {module.lessons} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {module.duration}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className={viewMode === 'list' ? 'w-32' : 'mt-4'}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-xs font-semibold text-gray-700">{module.progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      module.status === 'completed' ? 'bg-green-500' :
                      module.status === 'in-progress' ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}
                    style={{ width: `${module.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Participants Tab Content - New Design
  const ParticipantsTab = () => (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Total Participants</p>
              <p className="text-3xl font-bold mt-1">{trainers.length + students.length || 1}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Trainers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{trainers.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{courseData.students}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg. Completion</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">72%</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trainers Section */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Trainers</h3>
            <button 
              onClick={() => showToast('Invite trainer feature coming soon!')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-blue-600"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {trainers.map(trainer => (
              <div 
                key={trainer.id} 
                className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg">
                  {trainer.initials || trainer.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{trainer.name}</span>
                  <span className="block text-sm text-gray-500">{trainer.role || 'Trainer'}</span>
                </div>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Admin</span>
              </div>
            ))}
          </div>
        </div>

        {/* Students Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Students ({courseData.students})</h3>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </button>
          </div>
          
          {students.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-blue-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Add Your First Student</h4>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">Share the class code or send email invitations to get students enrolled</p>
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={copyClassCode}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy Code
                </button>
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send Invite
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {students.map(student => (
                <div 
                  key={student.id} 
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-medium">
                    {student.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{student.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Assessments Tab Content - New Design
  const AssessmentsTab = () => {
    const assessments = [
      { id: 1, title: 'Module 1 Quiz', type: 'quiz', dueDate: 'Dec 15, 2024', submissions: 45, total: 67, avgScore: 85, status: 'active' },
      { id: 2, title: 'Practical Assessment: Espresso', type: 'practical', dueDate: 'Dec 20, 2024', submissions: 32, total: 67, avgScore: 78, status: 'active' },
      { id: 3, title: 'Latte Art Practice', type: 'assignment', dueDate: 'Dec 25, 2024', submissions: 0, total: 67, avgScore: 0, status: 'upcoming' },
    ];

    return (
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Assessments</p>
                <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Graded</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Class Average</p>
                <p className="text-2xl font-bold text-gray-900">81.5%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assessments List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">All Assessments</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {assessments.map(assessment => (
              <div 
                key={assessment.id}
                className="p-5 hover:bg-gray-50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-5">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${
                    assessment.type === 'quiz' ? 'bg-blue-100' :
                    assessment.type === 'practical' ? 'bg-purple-100' :
                    'bg-green-100'
                  }`}>
                    {assessment.type === 'quiz' ? <FileText className={`w-6 h-6 text-blue-600`} /> :
                     assessment.type === 'practical' ? <Award className={`w-6 h-6 text-purple-600`} /> :
                     <ClipboardList className={`w-6 h-6 text-green-600`} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {assessment.title}
                      </h4>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        assessment.status === 'active' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {assessment.status === 'active' ? 'Active' : 'Upcoming'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due {assessment.dueDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {assessment.submissions}/{assessment.total} submitted
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  {assessment.avgScore > 0 && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{assessment.avgScore}%</p>
                      <p className="text-xs text-gray-500">Avg. Score</p>
                    </div>
                  )}

                  {/* Progress Ring */}
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-100" />
                      <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" 
                        strokeDasharray={`${(assessment.submissions / assessment.total) * 150.8} 150.8`} 
                        strokeLinecap="round" 
                        className={assessment.status === 'active' ? 'text-blue-500' : 'text-orange-400'} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-700">{Math.round((assessment.submissions / assessment.total) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'modules': return <ModulesTab />;
      case 'participants': return <ParticipantsTab />;
      case 'assessments': return <AssessmentsTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* Tabs Navigation - New Style */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between px-6">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 font-medium text-sm border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl z-50 animate-slide-up flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          <Check className="w-5 h-5" />
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Create Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create {createType}</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input 
                  type="text"
                  placeholder={`Enter ${createType.toLowerCase()} title`}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              {createType !== 'Topic' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                    <textarea 
                      rows={4}
                      placeholder="Add instructions or description..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                  {(createType === 'Assignment' || createType === 'Quiz Assignment') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                        <input 
                          type="number"
                          placeholder="100"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
                      <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
                  <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Post
                </button>
              </div>
            </form>
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
                  <p className="font-bold text-blue-600">{courseData.code}</p>
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
            <form onSubmit={(e) => { e.preventDefault(); showToast('Changes saved successfully!'); setShowEditModal(false); setEditItem(null); }} className="p-6 space-y-4">
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
                <h2 className="text-xl font-bold text-gray-900">Create Quiz</h2>
                <p className="text-sm text-gray-500 mt-1">Add questions and customize your quiz</p>
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
              {/* Quiz Settings */}
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
                <h3 className="font-semibold text-gray-900 mb-4">Add Question</h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    { type: 'multiple-choice', label: 'Multiple Choice', icon: CircleDot, color: 'blue' },
                    { type: 'true-false', label: 'True / False', icon: ToggleLeft, color: 'green' },
                    { type: 'short-answer', label: 'Short Answer', icon: AlignLeft, color: 'purple' },
                    { type: 'checkbox', label: 'Checkboxes', icon: ListChecks, color: 'orange' },
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = currentQuestionType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setCurrentQuestionType(item.type)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? `border-${item.color}-500 bg-${item.color}-50 text-${item.color}-700` 
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                        style={isSelected ? { borderColor: item.color === 'blue' ? '#3b82f6' : item.color === 'green' ? '#22c55e' : item.color === 'purple' ? '#a855f7' : '#f97316', backgroundColor: item.color === 'blue' ? '#eff6ff' : item.color === 'green' ? '#f0fdf4' : item.color === 'purple' ? '#faf5ff' : '#fff7ed' } : {}}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add {currentQuestionType === 'multiple-choice' ? 'Multiple Choice' : currentQuestionType === 'true-false' ? 'True/False' : currentQuestionType === 'short-answer' ? 'Short Answer' : 'Checkbox'} Question
                </button>
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
                  <span>{quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''} added</span>
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
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Course;
