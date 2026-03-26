import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

const SupervisorStudents = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const students = [
    { id: 1, name: 'Alice Johnson', email: 'alice@hytech.com', course: 'AI/ML Basics', progress: 75, status: 'Active' },
    { id: 2, name: 'Bob Smith', email: 'bob@hytech.com', course: 'Web Development', progress: 90, status: 'Active' },
    { id: 3, name: 'Carol Williams', email: 'carol@hytech.com', course: 'Data Science', progress: 60, status: 'Active' },
    { id: 4, name: 'David Brown', email: 'david@hytech.com', course: 'Cloud Computing', progress: 55, status: 'In Progress' },
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
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
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Course</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{student.course}</td>
                  <td className="px-6 py-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${student.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">{student.progress}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(student.status)}`}>
                      {student.status}
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

export default SupervisorStudents;
