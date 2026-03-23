import React from 'react';
import { 
  Users, 
  GraduationCap, 
  FolderOpen, 
  BookOpen, 
  Award,
  AlertTriangle,
  Bell,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  // Stats data
  const stats = [
    { label: 'Total Participants', value: '250', icon: Users, change: '+18%', changeType: 'positive', color: 'blue' },
    { label: 'Active Trainers', value: '5', icon: GraduationCap, change: '5%', changeType: 'neutral', color: 'purple' },
    { label: 'Active Students', value: '245', icon: Users, change: '+12%', changeType: 'positive', color: 'cyan' },
    { label: 'Total Sectors', value: '9', icon: FolderOpen, change: '+8%', changeType: 'positive', color: 'green' },
    { label: 'Active Programs', value: '156', icon: BookOpen, change: '+8%', changeType: 'positive', color: 'orange' },
    { label: 'Certification Rate', value: '84%', icon: Award, change: '+18%', changeType: 'positive', color: 'teal' },
  ];

  // Alerts data
  const alerts = [
    {
      type: 'warning',
      title: 'Batch Assessment Pending',
      message: '2 trainees pending for NC III Electrical Installation final assessment.',
      icon: AlertTriangle,
    },
    {
      type: 'info',
      title: 'New Training Materials Available',
      message: 'Updated NCII competency modules for Automotive Technology now available.',
      icon: Bell,
    },
  ];

  // Recent activity data
  const recentActivity = [
    { user: 'Hart Lawrence', action: 'New trainee registered in Construction Sector', time: '1m ago' },
    { user: 'Hart Lawrence', action: 'Started NC II: Driving', time: '15m ago' },
    { user: 'Hart Lawrence', action: 'Completed National Certificate (NC II): Barista', time: '1h ago' },
  ];

  // Training sectors data
  const trainingSectors = [
    { name: 'Electrical & Electromechanics', courses: 8, students: 50, progress: 65 },
    { name: 'Automotive/Land Transport', courses: 8, students: 124, progress: 80 },
    { name: 'Tourism Sector', courses: 8, students: 14, progress: 35 },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      purple: 'bg-purple-50 text-purple-600',
      cyan: 'bg-cyan-50 text-cyan-600',
      green: 'bg-green-50 text-green-600',
      orange: 'bg-orange-50 text-orange-600',
      teal: 'bg-teal-50 text-teal-600',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6 pb-6 lg:pb-8">
      {/* Welcome Message */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800">Welcome back, Admin</h1>
        <p className="text-gray-500">Here's your learning system overview for today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="card p-4 hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(stat.color)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.changeType === 'positive' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Alerts Section */}
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;
          return (
            <div 
              key={index}
              className={`p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-md ${
                alert.type === 'warning' 
                  ? 'bg-orange-50 border-orange-500' 
                  : 'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  alert.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`font-semibold ${
                    alert.type === 'warning' ? 'text-orange-700' : 'text-blue-700'
                  }`}>
                    {alert.title}
                  </h4>
                  <p className={`text-sm ${
                    alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
            <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50:bg-gray-700 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.user}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Training Sectors */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Training Sector</h3>
            <button className="flex items-center gap-1 text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors">
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-5">
            {trainingSectors.map((sector, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800 text-sm">{sector.name}</h4>
                    <p className="text-xs text-gray-400">{sector.students} students</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{sector.courses} courses</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill bg-blue-500"
                    style={{ width: `${sector.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
