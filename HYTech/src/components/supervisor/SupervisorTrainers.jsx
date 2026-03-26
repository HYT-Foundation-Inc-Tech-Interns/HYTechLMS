import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Plus, MoreVertical, Eye, Edit2, Trash2 } from 'lucide-react';

const SupervisorTrainers = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const trainers = [
    { id: 1, name: 'John Doe', email: 'john@hytech.com', department: 'Automotive', courses: 3, students: 45 },
    { id: 2, name: 'Jane Smith', email: 'jane@hytech.com', department: 'IT', courses: 4, students: 52 },
    { id: 3, name: 'Mike Johnson', email: 'mike@hytech.com', department: 'Beauty Care', courses: 2, students: 38 },
    { id: 4, name: 'Sarah Williams', email: 'sarah@hytech.com', department: 'Health & Wellness', courses: 3, students: 41 },
  ];

  const filteredTrainers = trainers.filter(trainer =>
    trainer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trainer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                placeholder="Search trainers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trainers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Courses</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Students</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrainers.map(trainer => (
                <tr key={trainer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{trainer.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{trainer.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{trainer.department}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{trainer.courses}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{trainer.students}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
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

export default SupervisorTrainers;
