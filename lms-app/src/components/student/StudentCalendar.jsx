import React, { useState } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  FileText,
  Plus
} from 'lucide-react';

const StudentCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const events = [
    {
      id: 1,
      title: 'Barista NCII - Live Session',
      date: new Date(2025, 0, 15, 10, 0),
      endTime: '11:30 AM',
      type: 'live',
      location: 'Online via Zoom',
      color: 'blue'
    },
    {
      id: 2,
      title: 'Quiz: Coffee Brewing Fundamentals',
      date: new Date(2025, 0, 15, 14, 0),
      endTime: '3:00 PM',
      type: 'quiz',
      location: 'Online',
      color: 'orange'
    },
    {
      id: 3,
      title: 'Plumbing NCIII - Practical Assessment',
      date: new Date(2025, 0, 18, 9, 0),
      endTime: '12:00 PM',
      type: 'assessment',
      location: 'Training Center A',
      color: 'green'
    },
    {
      id: 4,
      title: 'Assignment Deadline: Latte Art Portfolio',
      date: new Date(2025, 0, 20, 23, 59),
      type: 'deadline',
      color: 'red'
    }
  ];

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
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColorClasses = (color) => {
    switch(color) {
      case 'blue': return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'orange': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'green': return 'bg-green-100 border-green-500 text-green-700';
      case 'red': return 'bg-red-100 border-red-500 text-red-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first day of month */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-24" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              
              return (
                <div 
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  className={`h-24 p-2 border border-gray-100 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    isToday(day) ? 'bg-blue-50 border-blue-200' : ''
                  } ${
                    selectedDate.getDate() === day && 
                    selectedDate.getMonth() === currentDate.getMonth() 
                      ? 'ring-2 ring-[#0D4291]' 
                      : ''
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                    isToday(day) 
                      ? 'bg-[#0D4291] text-white' 
                      : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                  
                  {/* Event Indicators */}
                  <div className="mt-1 space-y-1">
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
                </div>
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
              <button className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
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
                <span className="text-sm text-gray-600">Live Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-sm text-gray-600">Quizzes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600">Assessments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600">Deadlines</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCalendar;
