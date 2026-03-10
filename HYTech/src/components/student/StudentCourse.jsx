import React, { useState } from 'react';
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
  Pencil
} from 'lucide-react';

const StudentCourse = () => {
  const { courseId } = useParams();
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');

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
    }
  ];

  const courseMaterials = [
    { id: 1, title: 'Chapter 1 Reading', type: 'PDF' },
    { id: 2, title: 'Chapter 2 Reading', type: 'PDF' },
  ];

  const quizzes = [
    { id: 1, title: 'Coffee Beans Basics', dueDate: 'March 15', progress: 88 }
  ];

  const handleDownload = (fileName) => {
    setDownloadFileName(`Barista_NC2_${fileName.replace(/\s+/g, '_')}.pdf`);
    setShowDownloadToast(true);
    setTimeout(() => setShowDownloadToast(false), 4000);
  };

  const openAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowAnnouncementModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Download Toast */}
      {showDownloadToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 flex items-center gap-4 animate-slide-down">
          <div>
            <p className="font-semibold text-gray-900">Download complete.</p>
            <p className="text-sm text-gray-500">{downloadFileName} (5mb)</p>
          </div>
          <button 
            onClick={() => {}}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Open
          </button>
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
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="divide-y divide-gray-100">
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

            <div className="divide-y divide-gray-100">
              {courseMaterials.map((material) => (
                <div 
                  key={material.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="font-medium text-blue-600">{material.title}</span>
                  </div>
                  <button 
                    onClick={() => handleDownload(material.title)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quizzes */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Quizzes</h2>
            </div>

            <div className="p-5 space-y-4">
              {quizzes.map((quiz) => (
                <div 
                  key={quiz.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Pencil className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{quiz.title}</h3>
                      <p className="text-sm text-gray-500">Due {quiz.dueDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Progress</span>
                      <span className="text-sm font-bold text-orange-600">{quiz.progress}%</span>
                    </div>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${quiz.progress}%` }}
                      />
                    </div>
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
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
    </div>
  );
};

export default StudentCourse;
