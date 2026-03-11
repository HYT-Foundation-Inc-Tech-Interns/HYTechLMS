import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Star,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Award,
  Play,
  AlertTriangle
} from 'lucide-react';

const StudentHome = () => {
  const navigate = useNavigate();
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showEnrollWarning, setShowEnrollWarning] = useState(false);
  
  // Track if student has an ongoing course
  const hasOngoingCourse = true; // Set to true to simulate student has Barista NCII enrolled

  const stats = [
    { 
      icon: BookOpen, 
      value: '2', 
      label: 'Courses Completed',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      icon: Clock, 
      value: '100/200', 
      label: 'Training Hours',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      icon: CheckCircle, 
      value: '92%', 
      label: 'Attendance Rate',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      icon: AlertCircle, 
      value: '3', 
      label: 'Pending Requirements',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
  ];

  const sectors = [
    'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES',
    'CONSTRUCTION SECTOR',
    'ELECTRICAL AND ELECTRONICS SECTOR',
    'SOCIAL AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
    'AUTOMOTIVE/LAND TRANSPORT SECTOR',
    'TOURISM SECTOR'
  ];

  const popularCourses = [
    {
      id: 1,
      title: 'K/C SERVICING (DUNRAC) ',
      instructor: 'Mr. Victor Santos',
      rating: 4.5,
      reviews: 29,
      lessons: 10,
      students: 45,
      sector: 'ELECTRICAL AND ELECTRONICS SECTOR',
      image: 'https://images.unsplash.com/photo-1487754180144-351b8e906e6c?w=500&h=300&fit=crop'
    },
    {
      id: 2,
      title: 'PLUMBING NCII',
      instructor: 'Mr. Ramon Cruz',
      rating: 4.3,
      reviews: 24,
      lessons: 12,
      students: 38,
      sector: 'CONSTRUCTION SECTOR',
      image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=300&fit=crop'
    },
    {
      id: 3,
      title: 'HILOT (WELLNESS)MASSAGE NCII',
      instructor: 'Ms. Angela Fernandez',
      rating: 4.7,
      reviews: 35,
      lessons: 11,
      students: 52,
      sector: 'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES',
      image: 'https://images.unsplash.com/photo-1544161515-81fded323381?w=500&h=300&fit=crop'
    },
    {
      id: 4,
      title: 'CAREGIVING NCII',
      instructor: 'Ms. Grace Reyes',
      rating: 4.4,
      reviews: 28,
      lessons: 10,
      students: 41,
      sector: 'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES',
      image: 'https://images.unsplash.com/photo-1631217314831-dc4a8f63e9b1?w=500&h=300&fit=crop'
    },
    {
      id: 5,
      title: 'BEAUTY CARE (SKINCARE) SERVICES NCII',
      instructor: 'Ms. Maria Clara Garcia',
      rating: 4.6,
      reviews: 31,
      lessons: 9,
      students: 48,
      sector: 'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES',
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=300&fit=crop'
    },
    {
      id: 6,
      title: 'BEAUTY CARE (NAIL CARE) SERVICES NCII',
      instructor: 'Ms. Jessica Torres',
      rating: 4.5,
      reviews: 26,
      lessons: 8,
      students: 44,
      sector: 'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES',
      image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=300&fit=crop'
    },
    {
      id: 7,
      title: 'VISUAL GRAPHICS DESIGN',
      instructor: 'Mr. Robert Santos',
      rating: 4.8,
      reviews: 38,
      lessons: 14,
      students: 56,
      sector: 'SOCIAL AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=300&fit=crop'
    },
    {
      id: 8,
      title: 'COMPUTER SYSTEM SERVICING NCII',
      instructor: 'Mr. Luis Diaz',
      rating: 4.4,
      reviews: 27,
      lessons: 13,
      students: 50,
      sector: 'ELECTRICAL AND ELECTRONICS SECTOR',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop'
    },
    {
      id: 9,
      title: 'BOOKKEEPING NCII',
      instructor: 'Ms. Patricia Lopez',
      rating: 4.3,
      reviews: 22,
      lessons: 11,
      students: 35,
      sector: 'SOCIAL AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=300&fit=crop'
    },
    {
      id: 10,
      title: 'HOUSEKEEPING NCII',
      instructor: 'Ms. Rosa Rivera',
      rating: 4.2,
      reviews: 20,
      lessons: 10,
      students: 39,
      sector: 'TOURISM SECTOR',
      image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=500&h=300&fit=crop'
    },
    {
      id: 11,
      title: 'EVENT MANAGEMENT SERVICES NCIII',
      instructor: 'Mr. Daniel Romero',
      rating: 4.6,
      reviews: 33,
      lessons: 12,
      students: 47,
      sector: 'TOURISM SECTOR',
      image: 'https://images.unsplash.com/photo-1540575467063-178f50002cbc?w=500&h=300&fit=crop'
    },
    {
      id: 12,
      title: 'BARISTA NCII',
      instructor: 'Ms. Maria Clara Garcia',
      rating: 4.5,
      reviews: 29,
      lessons: 12,
      students: 54,
      sector: 'TOURISM SECTOR',
      image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500&h=300&fit=crop'
    },
    {
      id: 13,
      title: 'FOOD AND BEVERAGE SERVICES NCII',
      instructor: 'Mr. Juan Dela Cruz',
      rating: 4.7,
      reviews: 36,
      lessons: 13,
      students: 59,
      sector: 'TOURISM SECTOR',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop'
    },
    {
      id: 14,
      title: 'AUTOMOTIVE SERVICING NCII',
      instructor: 'Mr. Pedro Reyes',
      rating: 4.4,
      reviews: 25,
      lessons: 15,
      students: 42,
      sector: 'AUTOMOTIVE/LAND TRANSPORT SECTOR',
      image: 'https://images.unsplash.com/photo-1487754180144-351b8e906e6c?w=500&h=300&fit=crop'
    },
  ];

  // Filter courses based on selected sector
  const filteredCourses = selectedSector 
    ? popularCourses.filter(course => course.sector === selectedSector)
    : popularCourses;

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  const handleEnroll = () => {
    if (hasOngoingCourse) {
      setShowEnrollWarning(true);
    } else {
      // Handle enrollment logic
      setShowCourseModal(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Popular Courses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Popular Courses</h2>
          
          {/* Sector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSectorDropdown(!showSectorDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-gray-300 transition-colors"
            >
              <span>Sectors</span>
              {showSectorDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSectorDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
                <button
                  onClick={() => {
                    setSelectedSector(null);
                    setShowSectorDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  All Sectors
                </button>
                {sectors.map((sector, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedSector(sector);
                      setShowSectorDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    {sector}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Sector Badge */}
        {selectedSector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filtered by:</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full flex items-center gap-2">
              {selectedSector}
              <button 
                onClick={() => setSelectedSector(null)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div 
              key={course.id}
              onClick={() => handleCourseClick(course)}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
            >
              {/* Course Image */}
              <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
                <img 
                  src={course.image} 
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                        <span class="text-white text-4xl font-bold opacity-50">${course.title.charAt(0)}</span>
                      </div>
                    `;
                  }}
                />
              </div>

              {/* Course Info */}
              <div className="p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span className="font-medium">Expert instructor</span>
                  <span className="text-gray-300">|</span>
                  <span>{course.instructor}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < Math.floor(course.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                    />
                  ))}
                  <span className="text-sm text-gray-500 ml-1">({course.reviews} reviews)</span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{course.lessons} Lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course.students} Students</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State for filtered courses */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No courses found</h3>
            <p className="text-gray-500">No courses available in this sector</p>
          </div>
        )}
      </div>

      {/* Course View Modal */}
      {showCourseModal && selectedCourse && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative h-56 bg-gradient-to-br from-blue-400 to-purple-500 overflow-hidden">
              <img 
                src={selectedCourse.image} 
                alt={selectedCourse.title}
                className="w-full h-full object-cover opacity-60"
                onError={(e) => { 
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button 
                onClick={() => setShowCourseModal(false)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="absolute bottom-4 left-6 right-6">
                <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full mb-2 inline-block">
                  {selectedCourse.sector}
                </span>
                <h2 className="text-2xl font-bold text-white">{selectedCourse.title}</h2>
                <p className="text-white/80">Instructor: {selectedCourse.instructor}</p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-14rem)]">
              {/* Course Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xl font-bold text-gray-900">{selectedCourse.rating}</span>
                  </div>
                  <p className="text-sm text-gray-500">Rating</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-xl font-bold text-gray-900">{selectedCourse.lessons}</span>
                  </div>
                  <p className="text-sm text-gray-500">Lessons</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="w-5 h-5 text-green-500" />
                    <span className="text-xl font-bold text-gray-900">{selectedCourse.students}</span>
                  </div>
                  <p className="text-sm text-gray-500">Students</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <span className="text-xl font-bold text-gray-900">{selectedCourse.reviews}</span>
                  </div>
                  <p className="text-sm text-gray-500">Reviews</p>
                </div>
              </div>

              {/* Course Description */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0D4291]" />
                  Course Overview
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>
              </div>

              {/* What You'll Learn */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#0D4291]" />
                  What You'll Learn
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Sed do eiusmod tempor incididunt ut labore et dolore</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Ut enim ad minim veniam, quis nostrud exercitation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Duis aute irure dolor in reprehenderit in voluptate</span>
                  </li>
                </ul>
              </div>

              {/* Course Content */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0D4291]" />
                  Course Content
                </h3>
                <div className="space-y-2">
                  {['Module 1: Introduction & Fundamentals', 'Module 2: Core Concepts', 'Module 3: Practical Applications', 'Module 4: Advanced Techniques', 'Module 5: Final Assessment'].map((module, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Play className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-gray-700 font-medium">{module}</span>
                      <span className="ml-auto text-sm text-gray-500">{3 + index} lessons</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enroll Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => setShowCourseModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={handleEnroll}
                  className="flex-1 px-4 py-3 bg-[#0D4291] text-white rounded-xl font-medium hover:bg-[#0a3577] transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Enroll Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Warning Modal */}
      {showEnrollWarning && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cannot Enroll</h3>
              <p className="text-gray-500 mb-6">
                You currently have an ongoing course <span className="font-semibold text-gray-700">(Barista NCII)</span>. Please complete your current course before enrolling in a new one.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEnrollWarning(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    setShowEnrollWarning(false);
                    setShowCourseModal(false);
                    navigate('/student/courses/1');
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#0D4291] text-white rounded-xl font-medium hover:bg-[#0a3577] transition-colors"
                >
                  Go to My Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHome;
