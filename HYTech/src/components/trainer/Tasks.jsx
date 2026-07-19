import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, AlertCircle, X, Eye, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAssessments, getAssignments, getCourses } from '../../utils/firestoreService';

const DAY_MS = 24 * 60 * 60 * 1000;

const Tasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState(null); // null = loading

  useEffect(() => {
    if (!user?.uid) return undefined;

    let isMounted = true;

    const loadTasks = async () => {
      try {
        const classes = await getCourses({ trainerId: user.uid });
        const activeClasses = classes.filter(
          (cls) => String(cls.status || 'active').toLowerCase() !== 'archived'
        );

        const perClassItems = await Promise.all(
          activeClasses.map(async (cls) => {
            const [assignments, assessments] = await Promise.all([
              getAssignments(cls.id).catch(() => []),
              getAssessments(cls.id).catch(() => []),
            ]);

            const toTask = (item, kind) => {
              const dueDate = item.dueDate
                ? (item.dueDate?.toDate?.() || new Date(item.dueDate))
                : null;
              const now = Date.now();

              let status = 'no-deadline';
              let priority = 'low';
              if (dueDate) {
                if (dueDate.getTime() < now) {
                  status = 'past-due';
                  priority = 'high';
                } else {
                  status = 'upcoming';
                  priority = dueDate.getTime() - now < 3 * DAY_MS ? 'high'
                    : dueDate.getTime() - now < 7 * DAY_MS ? 'medium'
                      : 'low';
                }
              }

              return {
                id: `${kind}-${cls.id}-${item.id}`,
                kind,
                title: item.title || item.name || `Untitled ${kind}`,
                course: cls.name || 'Unnamed Class',
                classId: cls.id,
                className: cls.name,
                dueDate,
                status,
                priority,
              };
            };

            return [
              ...assignments.map((a) => toTask(a, 'assignment')),
              ...assessments.map((a) => toTask(a, 'assessment')),
            ];
          })
        );

        if (isMounted) {
          const flattened = perClassItems.flat();
          flattened.sort((a, b) => {
            const timeA = a.dueDate?.getTime() ?? Infinity;
            const timeB = b.dueDate?.getTime() ?? Infinity;
            return timeA - timeB;
          });
          setTasks(flattened);
        }
      } catch (error) {
        console.error('Error loading trainer tasks:', error);
        if (isMounted) {
          setTasks([]);
        }
      }
    };

    loadTasks();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past-due', label: 'Past Due' },
    { id: 'no-deadline', label: 'No Deadline' },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-700';
      case 'past-due': return 'bg-red-100 text-red-700';
      case 'no-deadline': return 'bg-gray-100 text-gray-700';
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

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const openClass = (task) => {
    if (task.className) {
      navigate(`/trainer/${encodeURIComponent(task.className)}`);
    }
  };

  if (tasks === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

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
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-purple-100 text-purple-600 font-medium">
                      {task.kind}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{task.course}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {task.dueDate
                        ? `Due: ${task.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'No deadline'}
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
              ? 'Assignments and assessments you create in your classes will appear here.'
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
                  <span className="text-gray-500">Class</span>
                  <span className="font-medium text-gray-900">{selectedTask.course}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-900 capitalize">{selectedTask.kind}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Due Date</span>
                  <span className="font-medium text-gray-900">
                    {selectedTask.dueDate
                      ? selectedTask.dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'No deadline'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusStyle(selectedTask.status)}`}>
                    {selectedTask.status.replace('-', ' ')}
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
                onClick={() => openClass(selectedTask)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
