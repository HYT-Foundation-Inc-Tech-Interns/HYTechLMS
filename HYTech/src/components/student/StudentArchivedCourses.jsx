import React, { useState } from 'react';
import { 
  Archive,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Star,
  Users
} from 'lucide-react';

const StudentArchivedCourses = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const archivedCourses = [
    {
      id: 1,
      name: 'Barista NCII',
      instructor: 'Anna Reyes',
      completedDate: 'Dec 15, 2025',
      rating: 4.5,
      students: 30,
      image: '/images/barista.png',
      finalGrade: 'A'
    },
    {
      id: 2,
      name: 'Visual Graphics Design',
      instructor: 'Mark Silva',
      completedDate: 'Nov 20, 2025',
      rating: 4.2,
      students: 25,
      image: '/images/graphics.png',
      finalGrade: 'A-'
    },
    {
      id: 3,
      name: 'Food Safety Management',
      instructor: 'Patricia Santos',
      completedDate: 'Oct 5, 2025',
      rating: 4.8,
      students: 45,
      image: '/images/food_safety.png',
      finalGrade: 'B+'
    }
  ];

  const handleDelete = (course) => {
    setSelectedCourse(course);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    // Handle delete logic
    setShowDeleteModal(false);
    setSelectedCourse(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Archive className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-gray-900 uppercase text-sm">Archived Courses</h2>
        <span className="text-sm text-gray-500 ml-2">({archivedCourses.length})</span>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {archivedCourses.map((course) => (
          <div 
            key={course.id}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
          >
            {/* Course Image */}
            <div className="relative h-40 bg-gradient-to-br from-[#0D4291] to-[#0B005C]">
              <img 
                src={course.image} 
                alt={course.name}
                className="w-full h-full object-cover opacity-80"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              
              {/* Completed Badge */}
              <div className="absolute top-3 left-3 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </div>

              {/* Grade Badge */}
              <div className="absolute top-3 right-3 px-3 py-1.5 bg-white text-[#0D4291] text-sm font-bold rounded-full">
                Grade: {course.finalGrade}
              </div>
            </div>

            {/* Course Details */}
            <div className="p-4 space-y-3">
              <h3 className="font-bold text-gray-900 text-lg">{course.name}</h3>
              <p className="text-sm text-gray-500">{course.instructor}</p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{course.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{course.students} students</span>
                </div>
              </div>

              {/* Completion Date */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Completed: {course.completedDate}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D4291] text-white rounded-lg font-medium hover:bg-[#0a3577] transition-colors">
                  <Eye className="w-4 h-4" />
                  View Course
                </button>
                <button 
                  onClick={() => handleDelete(course)}
                  className="p-2.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State (shown when no courses) */}
      {archivedCourses.length === 0 && (
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No Archived Courses</h3>
          <p className="text-gray-500">Completed courses will appear here</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Archived Course?</h3>
              <p className="text-gray-500 mb-6">
                Are you sure you want to remove <span className="font-semibold text-gray-700">{selectedCourse.name}</span> from your archives? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentArchivedCourses;
