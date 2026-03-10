import React, { useState } from 'react';
import { Calendar, CheckCircle, Clock, AlertCircle, X, Eye, Check } from 'lucide-react';

const Tasks = () => {
  const [filter, setFilter] = useState('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [toast, setToast] = useState(null);

  // Toast notification
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const tasks = [
    {
      id: 1,
      title: 'Review Barista Module 1 Submissions',
      course: 'Sample Class - Dreamers Batch 16',
      dueDate: '2026-03-15',
      status: 'pending',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Grade Quiz Assignment 1',
      course: 'Sample Class - Dreamers Batch 16',
      dueDate: '2026-03-12',
      status: 'in-progress',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Prepare Week 3 Materials',
      course: 'Sample Class - Dreamers Batch 16',
      dueDate: '2026-03-18',
      status: 'pending',
      priority: 'low'
    },
  ];

  const filters = [
    { id: 'all', label: 'All Tasks' },
    { id: 'pending', label: 'Pending' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  return (
    <div className="p-6 lg:p-8">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
              filter === f.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {filteredTasks.map(task => (
            <div 
              key={task.id}
              onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
              className="p-5 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getPriorityIcon(task.priority)}
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{task.course}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      Due: {new Date(task.dueDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(task.status)}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded-lg transition-all">
                  <Eye className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500">
            {filter === 'all' 
              ? "You're all caught up! No tasks assigned."
              : `No ${filter.replace('-', ' ')} tasks at the moment.`
            }
          </p>
        </div>
      )}

      {/* Task Detail Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
              <button 
                onClick={() => { setShowTaskModal(false); setSelectedTask(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                {getPriorityIcon(selectedTask.priority)}
                <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Course</span>
                  <span className="font-medium text-gray-900">{selectedTask.course}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Due Date</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedTask.dueDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusStyle(selectedTask.status)}`}>
                    {selectedTask.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-500">Priority</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                    selectedTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                    selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {selectedTask.priority}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => { setShowTaskModal(false); setSelectedTask(null); }}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => { 
                  showToast('Task marked as completed!'); 
                  setShowTaskModal(false); 
                  setSelectedTask(null); 
                }}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl z-50 animate-slide-up bg-green-600 text-white flex items-center gap-3">
          <Check className="w-5 h-5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default Tasks;
