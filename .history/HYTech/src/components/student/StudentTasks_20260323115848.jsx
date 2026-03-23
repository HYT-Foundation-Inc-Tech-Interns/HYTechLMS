import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckSquare, 
  AlertCircle,
  FileText,
  Pencil,
  X,
  Send,
  Paperclip,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const StudentTasks = () => {
  const [showMissingOutputs, setShowMissingOutputs] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const dueThisWeek = {
    count: 0,
    message: 'No Tasks Due This Week',
    submessage: 'Check back later'
  };

  const [missingOutputs, setMissingOutputs] = useState([
    {
      id: 1,
      title: 'Submit Internship Requirements',
      daysLate: 3,
      dueDate: 'Feb 28',
      type: 'Assigned',
      posted: 'Thu, 19 Feb',
      description: 'Upload all required internship documents for verification.'
    },
    {
      id: 2,
      title: 'Daily Log Monitoring Report and Format Interns',
      daysLate: 2,
      dueDate: 'Mar 01',
      type: 'Assigned',
      posted: 'Fri, 20 Feb',
      description: 'Submit your weekly internship log and report summary.'
    },
  ]);

  const [assignedTasks, setAssignedTasks] = useState({
    noDueDate: [
      {
        id: 1,
        title: 'Submit Internship Requirements',
        posted: 'Thu, 19 Feb',
        type: 'Assigned',
        icon: FileText,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        description: 'Upload all required internship documents for verification.'
      },
      {
        id: 2,
        title: 'Daily Log Monitoring Report and Format Interns',
        posted: 'Fri, 20 Feb',
        type: 'Assigned',
        icon: FileText,
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        description: 'Submit your daily log and attendance report for review.'
      },
    ],
    nextWeek: [
      {
        id: 3,
        title: 'Automotive Services NCII - Skills Quiz',
        dueDate: 'Mar 15',
        type: 'Quiz',
        icon: Pencil,
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        description: 'Complete the online quiz for this week\'s practical lessons.'
      },
    ]
  });

  const [completedTasks, setCompletedTasks] = useState([
    {
      id: 1,
      title: 'Intro to Coffee Origins',
      submitted: 'Feb 10',
      type: 'Assigned',
      icon: CheckSquare,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      description: 'Completed introduction module and submitted reflection output.'
    },
    {
      id: 2,
      title: 'Barista Tools Overview',
      submitted: 'Feb 12',
      type: 'Assigned',
      icon: CheckSquare,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      description: 'Completed tools identification activity and worksheet.'
    },
    {
      id: 3,
      title: 'Customer Service Basics',
      submitted: 'Feb 14',
      type: 'Assigned',
      icon: CheckSquare,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      description: 'Submitted role-play activity and checklist output.'
    },
  ]);

  const assignedCount = assignedTasks.noDueDate.length + assignedTasks.nextWeek.length + missingOutputs.length;
  const completedCount = completedTasks.length;

  const openTaskModal = (task, source) => {
    setSelectedTask({ ...task, source });
    setSubmissionNote('');
    setUploadedFiles([]);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    setSubmissionNote('');
    setUploadedFiles([]);
  };

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setUploadedFiles((prev) => {
      const nextFiles = [...prev];
      files.forEach((file) => {
        const exists = nextFiles.some((item) => item.name === file.name && item.size === file.size);
        if (!exists) {
          nextFiles.push(file);
        }
      });
      return nextFiles;
    });

    event.target.value = '';
  };

  const removeUploadedFile = (indexToRemove) => {
    setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeTaskFromSource = (task) => {
    if (task.source === 'missing') {
      setMissingOutputs((prev) => prev.filter((item) => item.id !== task.id));
      return;
    }

    if (task.source === 'noDueDate') {
      setAssignedTasks((prev) => ({
        ...prev,
        noDueDate: prev.noDueDate.filter((item) => item.id !== task.id),
      }));
      return;
    }

    if (task.source === 'nextWeek') {
      setAssignedTasks((prev) => ({
        ...prev,
        nextWeek: prev.nextWeek.filter((item) => item.id !== task.id),
      }));
    }
  };

  const moveToCompleted = (task, withSubmission = false) => {
    const submittedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    removeTaskFromSource(task);
    setCompletedTasks((prev) => [
      {
        id: Date.now(),
        title: task.title,
        submitted: submittedDate,
        type: task.type || 'Assigned',
        icon: CheckSquare,
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        description: withSubmission && submissionNote.trim()
          ? `${task.description || 'Task submitted.'} Note: ${submissionNote.trim()}`
          : (task.description || 'Task completed.'),
        attachments: withSubmission ? uploadedFiles.map((file) => file.name) : [],
      },
      ...prev,
    ]);
    closeTaskModal();
  };

  const isCompletedTask = selectedTask?.source === 'completed';

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
                    className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => openTaskModal(output, 'missing')}
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
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{assignedCount}</span>
        </div>
        <div className="flex items-center gap-3 pb-4 border-b-2 border-transparent">
          <div className="p-1.5 bg-gray-100 rounded-lg">
            <CheckSquare className="w-4 h-4 text-gray-500" />
          </div>
          <span className="font-medium text-gray-600">Completed</span>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">{completedCount}</span>
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
                    onClick={() => openTaskModal(task, 'noDueDate')}
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
                    onClick={() => openTaskModal(task, 'nextWeek')}
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
                  onClick={() => openTaskModal(task, 'completed')}
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

      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeTaskModal}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scale-in flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{selectedTask.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedTask.type || 'Task'}
                    {selectedTask.posted ? ` · Posted ${selectedTask.posted}` : ''}
                    {selectedTask.dueDate ? ` · Due ${selectedTask.dueDate}` : ''}
                    {selectedTask.submitted ? ` · Submitted ${selectedTask.submitted}` : ''}
                  </p>
                </div>
                <button
                  onClick={closeTaskModal}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Task Details</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedTask.description || 'No additional description was provided for this task.'}
                  </p>
                </div>

                {selectedTask.daysLate ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-700">Missing Output</p>
                      <p className="text-sm text-red-600">
                        This task is {selectedTask.daysLate} day{selectedTask.daysLate > 1 ? 's' : ''} late.
                      </p>
                    </div>
                  </div>
                ) : null}

                {!isCompletedTask && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Attach Files</label>
                      <label className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 bg-blue-50 text-blue-700 rounded-xl px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors">
                        <Paperclip className="w-4 h-4" />
                        <span className="font-medium text-sm">Upload submission files</span>
                        <input
                          type="file"
                          multiple
                          onChange={handleFilesSelected}
                          className="hidden"
                        />
                      </label>
                      {uploadedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${file.size}-${index}`}
                              className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeUploadedFile(index)}
                                className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                                aria-label="Remove file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Submission Note (Optional)</label>
                      <textarea
                        value={submissionNote}
                        onChange={(event) => setSubmissionNote(event.target.value)}
                        rows={4}
                        placeholder="Add context about your submission..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={closeTaskModal}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Close
                </button>

                {!isCompletedTask && (
                  <>
                    <button
                      onClick={() => moveToCompleted(selectedTask, false)}
                      className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                    >
                      Mark as Completed
                    </button>
                    <button
                      onClick={() => moveToCompleted(selectedTask, true)}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Submit Task
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTasks;
