import React, { useState, useRef, useEffect } from 'react';
import { Users, TrendingUp, BookOpen, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';

const SupervisorHome = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    {
      title: 'Total Trainers',
      value: '24',
      icon: Users,
      color: 'from-blue-600 to-blue-800',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Active Students',
      value: '456',
      icon: Users,
      color: 'from-green-600 to-green-800',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Active Courses',
      value: '18',
      icon: BookOpen,
      color: 'from-purple-600 to-purple-800',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Avg. Completion Rate',
      value: '78%',
      icon: TrendingUp,
      color: 'from-amber-600 to-amber-800',
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  const recentActivities = [
    { id: 1, type: 'course_started', title: 'New course started', description: 'AUTOMOTIVE SERVICES NCII by Batch 01', timestamp: '2 hours ago', status: 'success' },
    { id: 2, type: 'trainer_added', title: 'Trainer added', description: 'John Doe added to IT Department', timestamp: '4 hours ago', status: 'success' },
    { id: 3, type: 'student_enrolled', title: 'Student enrolled', description: 'Sarah Johnson enrolled in Beauty Care', timestamp: '6 hours ago', status: 'success' },
    { id: 4, type: 'completion_achieved', title: 'Certification awarded', description: '12 students completed PLUMBING NCII', timestamp: '1 day ago', status: 'success' },
    { id: 5, type: 'alert', title: 'Low attendance alert', description: '3 students with attendance below 80%', timestamp: '1 day ago', status: 'warning' },
  ];

  const StatCard = ({ stat }) => {
    const Icon = stat.icon;
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </div>
          <div className={`${stat.bgColor} p-3 rounded-lg`}>
            <Icon className={`w-6 h-6 ${stat.iconColor}`} />
          </div>
        </div>
      </div>
    );
  };

  const ActivityItem = ({ activity }) => {
    const statusIcon = activity.status === 'success' ? 
      <CheckCircle className="w-5 h-5 text-green-600" /> : 
      <AlertCircle className="w-5 h-5 text-amber-600" />;

    return (
      <div key={activity.id} className="flex items-start gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-b-0">
        <div className="mt-1">
          {statusIcon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{activity.title}</p>
          <p className="text-sm text-gray-600 truncate">{activity.description}</p>
          <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Welcome Message */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800">Welcome back, Supervisor</h1>
        <p className="text-gray-500">Monitor your trainers, students, and courses in one place</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recent Activities
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Alerts & Notifications
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {activeTab === 'overview' && (
            recentActivities.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))
          )}

          {activeTab === 'alerts' && (
            <div className="p-4">
              <p className="text-gray-600 text-center py-8">
                No critical alerts at the moment. All systems are functioning normally.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-gray-700">
              View Trainer Reports
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-gray-700">
              View Student Progress
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-gray-700">
              Manage Courses
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Server</span>
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Backups</span>
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Updated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorHome;
