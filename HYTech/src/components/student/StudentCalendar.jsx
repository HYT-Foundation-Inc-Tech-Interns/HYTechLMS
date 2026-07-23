import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  FileText,
  Plus,
  X,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAssessments,
  getAssignments,
  getStudentEnrollments,
  createPersonalCalendarEvent,
  subscribeToPersonalCalendarEvents,
} from '../../utils/firestoreService';

const StudentCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'personal',
    location: ''
  });
  const [personalEvents, setPersonalEvents] = useState([]);
  const [taskEvents, setTaskEvents] = useState([]);

  const events = [...taskEvents, ...personalEvents];

  // Personal events are account data and follow the trainee across devices.
  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToPersonalCalendarEvents(user.uid, setPersonalEvents);
  }, [user?.uid]);

  // Deadline events come from real assignments/assessments in enrolled classes
  useEffect(() => {
    if (!user?.uid) return undefined;

    let isMounted = true;

    const loadTaskEvents = async () => {
      try {
        const enrollments = await getStudentEnrollments(user.uid);
        const activeEnrollments = enrollments.filter(
          (e) => e.status === 'active' || e.status === 'ongoing'
        );

        const perClass = await Promise.all(
          activeEnrollments.map(async (enrollment) => {
            const [assessments, assignments] = await Promise.all([
              getAssessments(enrollment.classId).catch(() => []),
              getAssignments(enrollment.classId).catch(() => []),
            ]);

            const toEvent = (item, kind) => {
              const dueDate = item.dueDate
                ? (item.dueDate?.toDate?.() || new Date(item.dueDate))
                : null;
              if (!dueDate || Number.isNaN(dueDate.getTime())) return null;

              return {
                id: `task-${enrollment.classId}-${item.id}`,
                title: `${kind === 'assessment' ? 'Quiz' : 'Assignment'}: ${item.title || 'Untitled'}`,
                date: dueDate,
                type: kind === 'assessment' ? 'quiz' : 'deadline',
                location: enrollment.className || '',
                color: kind === 'assessment' ? 'orange' : 'red',
              };
            };

            return [
              ...assessments.map((a) => toEvent(a, 'assessment')),
              ...assignments.map((a) => toEvent(a, 'assignment')),
            ].filter(Boolean);
          })
        );

        if (isMounted) {
          setTaskEvents(perClass.flat());
        }
      } catch (error) {
        console.error('Error loading calendar events:', error);
      }
    };

    loadTaskEvents();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const handleAddEvent = async () => {
    if (newEvent.title && newEvent.date && newEvent.startTime) {
      const [year, month, day] = newEvent.date.split('-').map(Number);
      const [hours, minutes] = newEvent.startTime.split(':').map(Number);

      const eventColors = {
        personal: 'purple',
        meeting: 'blue',
        deadline: 'red',
        reminder: 'orange'
      };

      const newEventData = {
        title: newEvent.title,
        date: new Date(year, month - 1, day, hours, minutes),
        endTime: newEvent.endTime || '',
        type: newEvent.type,
        location: newEvent.location || '',
        color: eventColors[newEvent.type] || 'blue'
      };

      if (!user?.uid) return;
      try {
        await createPersonalCalendarEvent(user.uid, newEventData);
      } catch (error) {
        console.error('Unable to save personal calendar event:', error);
        return;
      }
      setNewEvent({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'personal',
        location: ''
      });
      setShowEventModal(false);
    }
  };

  const openAddEventModal = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    setNewEvent({
      ...newEvent,
      date: `${year}-${month}-${day}`
    });
    setShowEventModal(true);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  };

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const hasEvents = (day) => {
    return events.some(event => 
      event.date.getDate() === day &&
      event.date.getMonth() === currentDate.getMonth() &&
      event.date.getFullYear() === currentDate.getFullYear()
    );
  };

  const getEventsForDate = (day) => {
    return events.filter(event => 
      event.date.getDate() === day &&
      event.date.getMonth() === currentDate.getMonth() &&
      event.date.getFullYear() === currentDate.getFullYear()
    );
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getEventIcon = (type) => {
    switch(type) {
      case 'live': return <Video className="w-4 h-4" />;
      case 'quiz': return <FileText className="w-4 h-4" />;
      case 'assessment': return <FileText className="w-4 h-4" />;
      case 'deadline': return <Clock className="w-4 h-4" />;
      case 'personal': return <Calendar className="w-4 h-4" />;
      case 'meeting': return <Video className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColorClasses = (color) => {
    switch(color) {
      case 'blue': return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'orange': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'green': return 'bg-green-100 border-green-500 text-green-700';
      case 'red': return 'bg-red-100 border-red-500 text-red-700';
      case 'purple': return 'bg-purple-100 border-purple-500 text-purple-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-3 sm:p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPrevMonth}
                className="p-2 hover:bg-gray-100:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 bg-[#0D4291] text-white rounded-lg text-sm font-medium hover:bg-[#0a3577] transition-colors"
              >
                Today
              </button>
              <button 
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2 sm:text-sm">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first day of month */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-12 sm:h-24" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  aria-label={`${currentDate.toLocaleString('default', { month: 'long' })} ${day}, ${currentDate.getFullYear()}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''}`}
                  className={`h-12 min-h-11 w-full p-1 text-left border border-gray-100 rounded-md cursor-pointer transition-all hover:bg-gray-50 sm:h-24 sm:rounded-lg sm:p-2 ${
                    isToday(day) ? 'bg-blue-50 border-blue-200' : ''
                  } ${
                    selectedDate.getDate() === day && 
                    selectedDate.getMonth() === currentDate.getMonth() 
                      ? 'ring-2 ring-[#0D4291]' 
                      : ''
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium sm:h-7 sm:w-7 sm:text-sm ${
                    isToday(day) 
                      ? 'bg-[#0D4291] text-white' 
                      : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                  
                  {/* Event Indicators */}
                  <div className="mt-1 hidden space-y-1 sm:block">
                    {dayEvents.slice(0, 2).map(event => (
                      <div 
                        key={event.id}
                        className={`text-xs truncate px-1.5 py-0.5 rounded ${getEventColorClasses(event.color)}`}
                      >
                        {event.title.split(' - ')[0]}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 px-1.5">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 flex justify-center gap-0.5 sm:hidden">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span key={event.id} className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Upcoming Events */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h3>
              <button 
                onClick={openAddEventModal}
                className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {getEventsForDate(selectedDate.getDate()).length > 0 ? (
                getEventsForDate(selectedDate.getDate()).map(event => (
                  <div 
                    key={event.id}
                    className={`p-3 rounded-xl border-l-4 ${getEventColorClasses(event.color)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getEventIcon(event.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(event.date)}</span>
                          {event.endTime && <span>- {event.endTime}</span>}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                            <MapPin className="w-3 h-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No events for this day</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Upcoming Events</h3>
            
            <div className="space-y-3">
              {events.slice(0, 4).map(event => (
                <div 
                  key={event.id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                >
                  <div className={`p-2 rounded-lg ${
                    event.color === 'blue' ? 'bg-blue-100' :
                    event.color === 'orange' ? 'bg-orange-100' :
                    event.color === 'green' ? 'bg-green-100' :
                    event.color === 'purple' ? 'bg-purple-100' :
                    'bg-red-100'
                  }`}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{event.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTime(event.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Event Types</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm text-gray-600">Live Sessions / Meetings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-sm text-gray-600">Quizzes / Reminders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600">Assessments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600">Deadlines</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-sm text-gray-600">Personal Events</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Add New Event</h2>
              </div>
              <button 
                onClick={() => setShowEventModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Event Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Enter event title"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={newEvent.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="personal">Personal</option>
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="Enter location (optional)"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button 
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddEvent}
                disabled={!newEvent.title || !newEvent.date || !newEvent.startTime}
                className="flex-1 px-4 py-2.5 bg-[#0D4291] text-white rounded-xl font-medium hover:bg-[#0a3577] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCalendar;
