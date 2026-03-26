import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

const SupervisorCourses = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const courses = [
    { id: 1, name: 'AUTOMOTIVE SERVICES NCII', trainer: 'John Doe', students: 45, status: 'Active', duration: '6 months' },
    { id: 2, name: 'PLUMBING NCII', trainer: 'Jane Smith', students: 38, status: 'Active', duration: '3 months' },
    { id: 3, name: 'BEAUTY CARE (SKINCARE) SERVICES', trainer: 'Sarah Williams', students: 52, status: 'Active', duration: '4 months' },
    { id: 4, name: 'COMPUTER SYSTEM SERVICING NCII', trainer: 'Mike Johnson', students: 41, status: 'Planning', duration: 'TBD' },
  ];

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.trainer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Top Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-5 h-5 text-gray-500" />
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Course Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Trainer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Students</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map(course => (
                <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{course.trainer}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{course.students}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{course.duration}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(course.status)}`}>
                      {course.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupervisorCourses;
