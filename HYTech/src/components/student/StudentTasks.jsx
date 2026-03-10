import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckSquare, 
  AlertCircle,
  FileText,
  Pencil,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const StudentTasks = () => {
  const [showMissingOutputs, setShowMissingOutputs] = useState(false);

  const dueThisWeek = {
    count: 0,
    message: 'No Tasks Due This Week',
    submessage: 'Check back later'
  };

  const missingOutputs = [
    { id: 1, title: 'Submit Internship Requirements', daysLate: 3, dueDate: 'Feb 28' },
    { id: 2, title: 'Submit Internship Requirements', daysLate: 3, dueDate: 'Feb 28' },
  ];

  const assignedTasks = {
    noDueDate: [
      { id: 1, title: 'Submit Internship Requirements', posted: 'Thu, 19 Feb', type: 'Assigned', icon: FileText, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
      { id: 2, title: 'Daily Log Monitoring Report and Format Interns', posted: 'Fri, 20 Feb', type: 'Assigned', icon: FileText, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    ],
    nextWeek: [
      { id: 3, title: 'Submit Internship Requirements', dueDate: 'Mar 15', type: 'Quiz', icon: Pencil, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    ]
  };

  const completedTasks = [
    { id: 1, title: 'Intro to Coffee Origins', submitted: 'Feb 10', type: 'Assigned', icon: CheckSquare, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { id: 2, title: 'Barista Tools Overview', submitted: 'Feb 12', type: 'Assigned', icon: CheckSquare, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { id: 3, title: 'Customer Service Basics', submitted: 'Feb 14', type: 'Assigned', icon: CheckSquare, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Top Section */}
      <div className="flex items-center justify-between">
        {/* Due This Week Card */}
        <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 pr-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="font-semibold text-purple-600 uppercase text-sm">Due This Week</span>
          </div>
          <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold">
              -
            </div>
            <div>
              <p className="font-semibold text-gray-900">{dueThisWeek.message}</p>
              <p className="text-sm text-gray-500">{dueThisWeek.submessage}</p>
            </div>
          </div>
        </div>

        {/* Missing Outputs Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMissingOutputs(!showMissingOutputs)}
            className="flex items-center gap-2 px-4 py-3 border-2 border-orange-200 bg-orange-50 rounded-xl text-orange-600 hover:bg-orange-100 transition-colors"
          >
            <Clock className="w-5 h-5" />
            <span className="font-semibold">{missingOutputs.length} missing outputs</span>
            {showMissingOutputs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMissingOutputs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <span className="text-sm font-semibold text-gray-600 uppercase">Missing Outputs</span>
              </div>
              <div className="p-2">
                {missingOutputs.map((output) => (
                  <div 
                    key={output.id}
                    className="flex items-center gap-3 p-3 hover:bg-red-50:bg-red-900/20 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{output.title}</p>
                      <p className="text-sm text-red-500">{output.daysLate} days late · Due {output.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-8 border-b border-gray-200">
        <div className="flex items-center gap-3 pb-4 border-b-2 border-transparent">
          <div className="p-1.5 bg-gray-100 rounded-lg">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <span className="font-medium text-gray-600">Assigned</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">5</span>
        </div>
        <div className="flex items-center gap-3 pb-4 border-b-2 border-transparent">
          <div className="p-1.5 bg-gray-100 rounded-lg">
            <CheckSquare className="w-4 h-4 text-gray-500" />
          </div>
          <span className="font-medium text-gray-600">Completed</span>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">5</span>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Column */}
        <div className="space-y-6">
          {/* No Due Date Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-gray-400 uppercase">No Due Date</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            <div className="space-y-3">
              {assignedTasks.noDueDate.map((task) => {
                const Icon = task.icon;
                return (
                  <div 
                    key={task.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200:border-gray-600 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${task.iconBg}`}>
                        <Icon className={`w-5 h-5 ${task.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">Posted {task.posted}</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {task.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Week Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-gray-400 uppercase">Next Week</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            <div className="space-y-3">
              {assignedTasks.nextWeek.map((task) => {
                const Icon = task.icon;
                return (
                  <div 
                    key={task.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200:border-gray-600 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${task.iconBg}`}>
                        <Icon className={`w-5 h-5 ${task.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">Due {task.dueDate}</p>
                      </div>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {task.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Completed Column */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-semibold text-gray-400 uppercase">Completed</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>
          <div className="space-y-3">
            {completedTasks.map((task) => {
              const Icon = task.icon;
              return (
                <div 
                  key={task.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200:border-gray-600 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${task.iconBg}`}>
                      <Icon className={`w-5 h-5 ${task.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-600">{task.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">Submitted {task.submitted}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {task.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentTasks;
