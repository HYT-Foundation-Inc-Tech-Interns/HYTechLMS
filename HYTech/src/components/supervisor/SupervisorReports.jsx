import React, { useState } from 'react';
import { BarChart3, TrendingUp, Download, TrendingDown } from 'lucide-react';

const SupervisorReports = () => {
  const [selectedReport, setSelectedReport] = useState('overview');

  const reportOptions = [
    { id: 'overview', name: 'System Overview' },
    { id: 'trainer', name: 'Trainer Performance' },
    { id: 'student', name: 'Student Progress' },
    { id: 'courses', name: 'Course Completion' },
  ];

  // Mock data for trainer performance
  const trainerPerformanceData = [
    { id: 1, name: 'John Doe', courses: 3, students: 145, avgRating: 4.8, completion: 92, trend: '+8%' },
    { id: 2, name: 'Jane Smith', courses: 4, students: 178, avgRating: 4.6, completion: 88, trend: '+5%' },
    { id: 3, name: 'Mike Johnson', courses: 2, students: 95, avgRating: 4.5, completion: 85, trend: '+3%' },
    { id: 4, name: 'Sarah Williams', courses: 3, students: 132, avgRating: 4.7, completion: 89, trend: '+6%' },
  ];

  // Mock data for student progress
  const studentProgressData = [
    { id: 1, name: 'Alice Johnson', course: 'AUTOMOTIVE SERVICES NCII', progress: 92, status: 'Excellent', hoursSpent: 120 },
    { id: 2, name: 'Bob Smith', course: 'WEB DEVELOPMENT', progress: 78, status: 'Good', hoursSpent: 95 },
    { id: 3, name: 'Carol Williams', course: 'DATA SCIENCE', progress: 65, status: 'Average', hoursSpent: 72 },
    { id: 4, name: 'David Brown', course: 'CLOUD COMPUTING', progress: 55, status: 'Below Average', hoursSpent: 48 },
    { id: 5, name: 'Emma Davis', course: 'BEAUTY CARE (SKINCARE)', progress: 88, status: 'Excellent', hoursSpent: 110 },
    { id: 6, name: 'Frank Wilson', course: 'PLUMBING NCII', progress: 72, status: 'Good', hoursSpent: 85 },
  ];

  // Mock data for course completion
  const courseCompletionData = [
    { id: 1, name: 'AUTOMOTIVE SERVICES NCII', enrolled: 145, completed: 134, inProgress: 8, dropout: 3, rate: 92 },
    { id: 2, name: 'PLUMBING NCII', enrolled: 128, completed: 112, inProgress: 12, dropout: 4, rate: 88 },
    { id: 3, name: 'BEAUTY CARE (SKINCARE)', enrolled: 156, completed: 136, inProgress: 15, dropout: 5, rate: 87 },
    { id: 4, name: 'CAREGIVING NCII', enrolled: 98, completed: 82, inProgress: 10, dropout: 6, rate: 84 },
    { id: 5, name: 'COMPUTER SYSTEM SERVICING', enrolled: 167, completed: 142, inProgress: 18, dropout: 7, rate: 85 },
  ];

  // Mock monthly metrics for trend chart
  const monthlyMetrics = [
    { month: 'Jan', enrollments: 850, completions: 720, dropouts: 45 },
    { month: 'Feb', enrollments: 920, completions: 780, dropouts: 42 },
    { month: 'Mar', enrollments: 1020, completions: 850, dropouts: 38 },
    { month: 'Apr', enrollments: 1150, completions: 920, dropouts: 35 },
    { month: 'May', enrollments: 1280, completions: 1010, dropouts: 32 },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Excellent': return 'text-green-600 bg-green-50';
      case 'Good': return 'text-blue-600 bg-blue-50';
      case 'Average': return 'text-yellow-600 bg-yellow-50';
      case 'Below Average': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Report Selector */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Reports & Analytics</h2>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="card">
        <div className="flex gap-2 p-4 border-b border-gray-200 overflow-x-auto">
          {reportOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setSelectedReport(option.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedReport === option.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className="p-6">
          {selectedReport === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">System Performance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Enrollments</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">1,280</p>
                    <p className="text-xs text-gray-500 mt-1">+12% from last month</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Courses Running</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">18</p>
                    <p className="text-xs text-gray-500 mt-1">100% active</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Completion</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">78%</p>
                    <p className="text-xs text-gray-500 mt-1">+5% improvement</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-amber-600 mt-2">542</p>
                    <p className="text-xs text-gray-500 mt-1">This month</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Monthly Trend (Jan - May)</h3>
                <div className="bg-white border border-gray-200 p-6 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Month</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Enrollments</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Completions</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Dropouts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyMetrics.map((metric, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium text-gray-900">{metric.month}</td>
                          <td className="py-3 px-3 text-center text-blue-600 font-semibold">{metric.enrollments}</td>
                          <td className="py-3 px-3 text-center text-green-600 font-semibold">{metric.completions}</td>
                          <td className="py-3 px-3 text-center text-red-600 font-semibold">{metric.dropouts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {selectedReport === 'trainer' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Trainer Performance Metrics</h3>
              <p className="text-gray-600 text-sm">Performance data for all trainers including course completion rates and student satisfaction scores.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Trainer Name</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Courses</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Students</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Avg Rating</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Completion Rate</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trainerPerformanceData.map(trainer => (
                      <tr key={trainer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{trainer.name}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">{trainer.courses}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">{trainer.students}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
                            ⭐ {trainer.avgRating}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${trainer.completion}%` }}></div>
                            </div>
                            <span className="font-semibold text-gray-700 text-xs">{trainer.completion}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold flex items-center justify-center gap-1">
                          <TrendingUp className="w-4 h-4" /> {trainer.trend}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReport === 'student' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Student Progress Report</h3>
              <p className="text-gray-600 text-sm">Comprehensive student performance data, progress tracking, and engagement metrics.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Student Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Course</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Progress</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Hours Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentProgressData.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.course}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${student.progress}%` }}></div>
                            </div>
                            <span className="font-semibold text-gray-700 text-xs">{student.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(student.status)}`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600 font-semibold">{student.hoursSpent}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReport === 'courses' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Course Completion Analytics</h3>
              <p className="text-gray-600 text-sm">Completion rates, dropouts, and performance data for all courses.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Course Name</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Enrolled</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Completed</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">In Progress</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Dropout</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {courseCompletionData.map(course => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{course.name}</td>
                        <td className="px-4 py-3 text-sm text-center text-blue-600 font-semibold">{course.enrolled}</td>
                        <td className="px-4 py-3 text-sm text-center text-green-600 font-semibold">{course.completed}</td>
                        <td className="px-4 py-3 text-sm text-center text-yellow-600 font-semibold">{course.inProgress}</td>
                        <td className="px-4 py-3 text-sm text-center text-red-600 font-semibold">{course.dropout}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${course.rate >= 90 ? 'bg-green-600' : course.rate >= 80 ? 'bg-blue-600' : 'bg-yellow-600'}`}
                                style={{ width: `${course.rate}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold text-gray-700 text-xs">{course.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorReports;
