import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  FolderOpen, 
  BookOpen, 
  AlertTriangle,
  Bell,
  ChevronRight,
  TrendingUp,
  Loader
} from 'lucide-react';
import { getCourses, getSectors, getCoursesTemplates } from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';
import { db } from '../../firebase';
import { collection, getDocs, where, query } from 'firebase/firestore';

const Dashboard = () => {
  const [stats, setStats] = useState([
    { label: 'Total Participants', value: '0', icon: Users, change: '+0%', changeType: 'positive', color: 'blue' },
    { label: 'Active Trainers', value: '0', icon: GraduationCap, change: '0%', changeType: 'neutral', color: 'purple' },
    { label: 'Active Students', value: '0', icon: Users, change: '+0%', changeType: 'positive', color: 'cyan' },
    { label: 'Total Sectors', value: '0', icon: FolderOpen, change: '+0%', changeType: 'positive', color: 'green' },
    { label: 'Active Programs', value: '0', icon: BookOpen, change: '+0%', changeType: 'positive', color: 'orange' },
    { label: 'Total Courses', value: '0', icon: BookOpen, change: '+0%', changeType: 'positive', color: 'teal' },
  ]);
  
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Fetch real data from Firestore
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch total sectors
        const sectorsData = await getSectors();
        const totalSectors = (sectorsData || []).length;
        
        // Fetch active classes (courses with status Active)
        const coursesData = await getCourses({ status: 'Active' });
        const activeClasses = (coursesData || []).length;
        
        // Fetch total courses
        const allCoursesData = await getCoursesTemplates();
        const totalCourses = (allCoursesData || []).length;
        
        // Count total users by role
        const usersCollection = collection(db, 'users');
        const allUsersSnapshot = await getDocs(usersCollection);
        const totalAccounts = allUsersSnapshot.size;
        
        // Count trainers
        const trainersQuery = query(usersCollection, where('role', '==', 'trainer'));
        const trainersSnapshot = await getDocs(trainersQuery);
        const totalTrainers = trainersSnapshot.size;
        
        // Count enrolled students (all enrollments)
        const enrollmentsCollection = collection(db, 'enrollments');
        const enrollmentsSnapshot = await getDocs(enrollmentsCollection);
        const enrolledStudents = enrollmentsSnapshot.size;
        
        // Update stats with new order: Accounts, Active Trainers, Active Students (enrolled), Sectors, Courses, Classes
        setStats([
          { label: 'Accounts', value: totalAccounts.toString(), icon: Users, color: 'blue' },
          { label: 'Active Trainers', value: totalTrainers.toString(), icon: GraduationCap, color: 'purple' },
          { label: 'Active Students', value: enrolledStudents.toString(), icon: Users, color: 'cyan' },
          { label: 'Sectors', value: totalSectors.toString(), icon: FolderOpen, color: 'green' },
          { label: 'Courses', value: totalCourses.toString(), icon: BookOpen, color: 'teal' },
          { label: 'Classes', value: activeClasses.toString(), icon: BookOpen, color: 'orange' },
        ]);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        addToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [addToast]);

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
      blue: { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', icon: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white', border: 'border-blue-200' },
      purple: { bg: 'bg-gradient-to-br from-purple-50 to-purple-100', icon: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white', border: 'border-purple-200' },
      cyan: { bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100', icon: 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white', border: 'border-cyan-200' },
      green: { bg: 'bg-gradient-to-br from-green-50 to-green-100', icon: 'bg-gradient-to-br from-green-500 to-green-600 text-white', border: 'border-green-200' },
      orange: { bg: 'bg-gradient-to-br from-orange-50 to-orange-100', icon: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white', border: 'border-orange-200' },
      teal: { bg: 'bg-gradient-to-br from-teal-50 to-teal-100', icon: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white', border: 'border-teal-200' },
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

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color);
          return (
            <div 
              key={index}
              className={`${colors.bg} border ${colors.border} rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-300 cursor-default group`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${colors.icon} w-14 h-14 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
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
        </>
      )}
    </div>
  );
};

export default Dashboard;
