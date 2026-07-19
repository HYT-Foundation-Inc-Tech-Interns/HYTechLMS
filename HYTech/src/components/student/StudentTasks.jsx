import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckSquare,
  AlertCircle,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAssessments,
  getAssignments,
  getStudentEnrollments,
  hasStudentAttempted,
} from '../../utils/firestoreService';

const StudentTasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(null); // null = loading
  const [showMissingOutputs, setShowMissingOutputs] = useState(true);

  useEffect(() => {
    if (!user?.uid) return undefined;

    let isMounted = true;

    const loadTasks = async () => {
      try {
        const enrollments = await getStudentEnrollments(user.uid);
        const activeEnrollments = enrollments.filter(
          (e) => e.status === 'active' || e.status === 'ongoing'
        );

        const perClass = await Promise.all(
          activeEnrollments.map(async (enrollment) => {
            const classId = enrollment.classId;
            const [assessments, assignments] = await Promise.all([
              getAssessments(classId).catch(() => []),
              getAssignments(classId).catch(() => []),
            ]);

            const published = [
              ...assessments
                .filter((a) => a.status !== 'draft' && a.isPublished !== false)
                .map((a) => ({ ...a, kind: 'assessment' })),
              ...assignments
                .filter((a) => a.status !== 'draft' && a.isPublished !== false)
                .map((a) => ({ ...a, kind: 'assignment' })),
            ];

            return Promise.all(
              published.map(async (item) => {
                const attempted =
                  item.kind === 'assessment'
                    ? await hasStudentAttempted(classId, item.id, user.uid).catch(() => false)
                    : false;

                const dueDate = item.dueDate
                  ? (item.dueDate?.toDate?.() || new Date(item.dueDate))
                  : null;

                return {
                  id: `${classId}-${item.id}`,
                  kind: item.kind,
                  title: item.title || 'Untitled Task',
                  className: enrollment.className || 'My Class',
                  dueDate,
                  attempted,
                  points: item.totalPoints || item.points || 0,
                };
              })
            );
          })
        );

        if (isMounted) {
          setTasks(perClass.flat());
        }
      } catch (error) {
        console.error('Error loading student tasks:', error);
        if (isMounted) setTasks([]);
      }
    };

    loadTasks();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const { pending, missing, completed } = useMemo(() => {
    const now = Date.now();
    const all = tasks || [];
    return {
      pending: all.filter((t) => !t.attempted && (!t.dueDate || t.dueDate.getTime() >= now)),
      missing: all.filter((t) => !t.attempted && t.dueDate && t.dueDate.getTime() < now),
      completed: all.filter((t) => t.attempted),
    };
  }, [tasks]);

  const dueThisWeek = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    return pending.filter(
      (t) => t.dueDate && t.dueDate.getTime() >= now && t.dueDate.getTime() <= weekFromNow
    );
  }, [pending]);

  const openTask = (task) => {
    navigate(`/student/${encodeURIComponent(task.className)}`);
  };

  const formatDue = (date) =>
    date
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'No due date';

  const TaskRow = ({ task, tone }) => (
    <button
      type="button"
      onClick={() => openTask(task)}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          tone === 'missing' ? 'bg-red-100' : tone === 'done' ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          {task.kind === 'assessment'
            ? <ClipboardList className={`w-5 h-5 ${tone === 'missing' ? 'text-red-600' : tone === 'done' ? 'text-green-600' : 'text-blue-600'}`} />
            : <FileText className={`w-5 h-5 ${tone === 'missing' ? 'text-red-600' : tone === 'done' ? 'text-green-600' : 'text-blue-600'}`} />}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{task.title}</p>
          <p className="text-xs text-gray-500 truncate">{task.className}{task.points ? ` · ${task.points} pts` : ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-sm ${tone === 'missing' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          <Calendar className="w-4 h-4 inline mr-1 -mt-0.5" />
          {formatDue(task.dueDate)}
        </span>
        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
      </div>
    </button>
  );

  if (tasks === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Due This Week */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Due This Week</h2>
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            {dueThisWeek.length}
          </span>
        </div>
        {dueThisWeek.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {dueThisWeek.map((task) => <TaskRow key={task.id} task={task} tone="pending" />)}
          </div>
        ) : (
          <div className="p-8 text-center">
            <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="font-medium text-gray-700">No Tasks Due This Week</p>
            <p className="text-sm text-gray-400">Check back later</p>
          </div>
        )}
      </div>

      {/* Missing / Past Due */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMissingOutputs(!showMissingOutputs)}
          className="w-full p-5 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h2 className="font-semibold text-gray-900">Missing Outputs</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            {missing.length}
          </span>
          {showMissingOutputs
            ? <ChevronUp className="w-5 h-5 text-gray-400 ml-auto" />
            : <ChevronDown className="w-5 h-5 text-gray-400 ml-auto" />}
        </button>
        {showMissingOutputs && (
          missing.length > 0 ? (
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {missing.map((task) => <TaskRow key={task.id} task={task} tone="missing" />)}
            </div>
          ) : (
            <p className="px-5 pb-5 text-sm text-gray-400">Nothing overdue. Great job!</p>
          )
        )}
      </div>

      {/* All Pending */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Assigned</h2>
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            {pending.length}
          </span>
        </div>
        {pending.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {pending.map((task) => <TaskRow key={task.id} task={task} tone="pending" />)}
          </div>
        ) : (
          <p className="p-5 text-sm text-gray-400">No pending tasks. New assignments from your trainer will appear here.</p>
        )}
      </div>

      {/* Completed */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-green-600" />
          <h2 className="font-semibold text-gray-900">Completed</h2>
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            {completed.length}
          </span>
        </div>
        {completed.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {completed.map((task) => <TaskRow key={task.id} task={task} tone="done" />)}
          </div>
        ) : (
          <p className="p-5 text-sm text-gray-400">Assessments you complete will show up here.</p>
        )}
      </div>
    </div>
  );
};

export default StudentTasks;
