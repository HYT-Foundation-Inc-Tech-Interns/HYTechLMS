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
  ChevronUp
} from 'lucide-react';

const StudentHome = () => {
  const navigate = useNavigate();
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const [selectedSector, setSelectedSector] = useState('HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES');

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
      title: 'Barista NC II',
      instructor: 'Vince Castillo',
      rating: 4.5,
      reviews: 29,
      lessons: 14,
      students: 67,
      image: '/images/barista_course.jpg'
    },
    {
      id: 2,
      title: 'Barista NC II',
      instructor: 'Vince Castillo',
      rating: 4.5,
      reviews: 29,
      lessons: 14,
      students: 67,
      image: '/images/barista_course.jpg'
    },
    {
      id: 3,
      title: 'Barista NC II',
      instructor: 'Vince Castillo',
      rating: 4.5,
      reviews: 29,
      lessons: 14,
      students: 67,
      image: '/images/barista_course.jpg'
    },
  ];

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
                {sectors.map((sector, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedSector(sector);
                      setShowSectorDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selectedSector === sector 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularCourses.map((course) => (
            <div 
              key={course.id}
              onClick={() => navigate(`/student/courses/${course.id}`)}
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
      </div>
    </div>
  );
};

export default StudentHome;
