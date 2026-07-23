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
import { useNavigate } from 'react-router-dom';
import { getCourses, getSectors, getCoursesTemplates, subscribeToActivityLogs, getUserProfile, migrateAssessmentAnswerKeys, migrateClassDirectory, toDate } from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

// Map raw activity actions to friendly labels for the dashboard feed.
const ACTION_LABELS = {
  user_login: 'Signed in',
  user_signup: 'Signed up',
  user_created: 'Account created',
  user_updated: 'Profile updated',
  user_role_updated: 'Role changed',
  user_status_updated: 'Status changed',
  apply_course: 'Applied to a course',
  join_class: 'Joined a class',
  notify_trainer: 'Notified a trainer',
  create_class: 'Created a class',
  grade_posted: 'Grade posted',
};

const formatAction = (action) =>
  ACTION_LABELS[action] || String(action || 'Activity').replace(/_/g, ' ');

const formatTimeAgo = (timestamp) => {
  const date = toDate(timestamp);
  if (!date) return 'Just now';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: 'Total Participants', value: '0', icon: Users, change: '+0%', changeType: 'positive', color: 'blue' },
    { label: 'Active Trainors', value: '0', icon: GraduationCap, change: '0%', changeType: 'neutral', color: 'purple' },
    { label: 'Active Trainees', value: '0', icon: Users, change: '+0%', changeType: 'positive', color: 'cyan' },
    { label: 'Total Sectors', value: '0', icon: FolderOpen, change: '+0%', changeType: 'positive', color: 'green' },
    { label: 'Active Programs', value: '0', icon: BookOpen, change: '+0%', changeType: 'positive', color: 'orange' },
    { label: 'Total Courses', value: '0', icon: BookOpen, change: '+0%', changeType: 'positive', color: 'teal' },
  ]);
  
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [trainingSectors, setTrainingSectors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const { addToast } = useToast();
  const { user } = useAuth();
  const adminName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
    || user?.displayName
    || user?.name
    || 'Admin';

  useEffect(() => {
    Promise.allSettled([
      migrateAssessmentAnswerKeys(),
      migrateClassDirectory(),
    ]).then((results) => {
      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.warn('Security migration could not run:', result.reason?.message);
        }
      });
    });
  }, []);

  // Fetch real data from Firestore
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch total sectors
        const sectorsData = await getSectors();
        const totalSectors = (sectorsData || []).length;

        // Fetch all classes (used for stats + per-sector counts)
        const allClasses = await getCourses({});
        const activeClasses = (allClasses || []).filter(
          (c) => String(c.status || '').toLowerCase() === 'active'
        ).length;

        // Fetch total courses
        const allCoursesData = await getCoursesTemplates();
        const totalCourses = (allCoursesData || []).length;

        // Count total users by role
        const usersCollection = collection(db, 'users');
        const allUsersSnapshot = await getDocs(usersCollection);
        const totalAccounts = allUsersSnapshot.size;
        const allUsers = allUsersSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const totalTrainers = allUsers.filter(
          (u) => u.role === 'trainer' && String(u.status || 'Active').toLowerCase() === 'active'
        ).length;
        const studentCount = allUsers.filter(
          (u) => u.role === 'student' && String(u.status || 'Active').toLowerCase() === 'active'
        ).length;
        const inactiveCount = allUsers.filter(
          (u) => String(u.status || 'Active').toLowerCase() !== 'active'
        ).length;

        // Count unique trainees with a currently active seat.
        const enrollmentsCollection = collection(db, 'enrollments');
        const enrollmentsSnapshot = await getDocs(enrollmentsCollection);
        const allEnrollments = enrollmentsSnapshot.docs.map((d) => d.data());
        const activeStudentIds = new Set(
          allEnrollments
            .filter((e) => ['active', 'ongoing'].includes(String(e.status || '').toLowerCase()))
            .map((e) => e.studentId)
            .filter(Boolean)
        );

        // Update stats
        setStats([
          { label: 'Accounts', value: totalAccounts.toString(), icon: Users, color: 'blue' },
          { label: 'Active Trainors', value: totalTrainers.toString(), icon: GraduationCap, color: 'purple' },
          { label: 'Active Trainees', value: activeStudentIds.size.toString(), icon: Users, color: 'cyan' },
          { label: 'Sectors', value: totalSectors.toString(), icon: FolderOpen, color: 'green' },
          { label: 'Courses', value: totalCourses.toString(), icon: BookOpen, color: 'teal' },
          { label: 'Classes', value: activeClasses.toString(), icon: BookOpen, color: 'orange' },
        ]);

        // ---- Training Sectors panel: real per-sector counts ----
        const sectorRows = (sectorsData || []).map((sector) => {
          const sectorClasses = (allClasses || []).filter((c) => c.sectorId === sector.id);
          const classIds = new Set(sectorClasses.map((c) => c.id));
          const sectorEnrollments = allEnrollments.filter(
            (e) =>
              classIds.has(e.classId)
              && ['active', 'ongoing'].includes(String(e.status || '').toLowerCase())
          );
          const pcts = sectorEnrollments
            .map((e) => {
              const value =
                e.progress?.overallProgress
                ?? e.progress?.percentage
                ?? e.progress?.completionRate;
              return Number.isFinite(Number(value)) ? Number(value) : null;
            })
            .filter((v) => v !== null);
          const avgProgress = pcts.length
            ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
            : 0;
          return {
            name: sector.name || 'Sector',
            classes: sectorClasses.length,
            students: new Set(sectorEnrollments.map((e) => e.studentId).filter(Boolean)).size,
            progress: avgProgress,
          };
        });
        // Show the busiest sectors first.
        sectorRows.sort((a, b) => b.students - a.students);
        setTrainingSectors(sectorRows);

        // ---- Alerts panel: real actionable signals ----
        const waitingStudents = Math.max(0, studentCount - activeStudentIds.size);

        const newAlerts = [];
        if (waitingStudents > 0) {
          newAlerts.push({
            type: 'info',
            title: 'Trainees waiting',
            message: `${waitingStudents} trainee${waitingStudents > 1 ? 's are' : ' is'} not yet in a class.`,
            icon: Bell,
          });
        }
        if (inactiveCount > 0) {
          newAlerts.push({
            type: 'warning',
            title: 'Inactive accounts',
            message: `${inactiveCount} account${inactiveCount > 1 ? 's are' : ' is'} marked inactive.`,
            icon: AlertTriangle,
          });
        }
        if (newAlerts.length === 0) {
          newAlerts.push({
            type: 'info',
            title: 'All clear',
            message: 'No pending items right now.',
            icon: Bell,
          });
        }
        setAlerts(newAlerts);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        addToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [addToast]);

  // Live recent activity from the real activityLogs collection.
  useEffect(() => {
    const unsubscribe = subscribeToActivityLogs(async (logs) => {
      // Logins are high-frequency noise on this glance view — they're always
      // available in full on the System Logs page, so keep them out of here.
      const top = (logs || []).filter((l) => l.action !== 'user_login').slice(0, 6);
      const ids = [...new Set(top.map((l) => l.userId).filter(Boolean))];
      const nameMap = {};
      await Promise.all(
        ids.map(async (id) => {
          const profile = await getUserProfile(id).catch(() => null);
          nameMap[id] = profile?.name || profile?.displayName || profile?.email || 'Unknown user';
        })
      );
      setRecentActivity(
        top.map((log) => ({
          action: formatAction(log.action),
          user: log.metadata?.email || nameMap[log.userId] || 'System',
          time: formatTimeAgo(log.timestamp),
        }))
      );
    }, 20);
    return unsubscribe;
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-800">Welcome back, {adminName}</h1>
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
            <button
              onClick={() => navigate('/admin/logs')}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No recent activity yet</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
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
              ))
            )}
          </div>
        </div>

        {/* Training Sectors */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Training Sector</h3>
            <button
              onClick={() => navigate('/admin/sectors')}
              className="flex items-center gap-1 text-orange-500 hover:text-orange-600 text-sm font-medium transition-colors"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-5">
            {trainingSectors.length === 0 && (
              <div className="text-center py-8">
                <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No sectors yet</p>
              </div>
            )}
            {trainingSectors.map((sector, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800 text-sm">{sector.name}</h4>
                    <p className="text-xs text-gray-400">{sector.students} trainees</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{sector.classes} classes</span>
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
