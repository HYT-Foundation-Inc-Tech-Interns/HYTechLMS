import React, { useMemo } from 'react';
import { Bell, CheckCircle2, Clock, Dot } from 'lucide-react';
import { useRoleNotifications } from '../../context/useRoleNotifications';
import { useToast } from '../../context/ToastContext';
import { toDate } from '../../utils/firestoreService';

const ROLE_LABELS = {
  admin: 'Admin',
  trainer: 'Trainor',
  student: 'Trainee',
};

// Ordered date buckets for the "all notifications" view.
const BUCKETS = ['Today', 'Yesterday', 'Past Week', 'Past Month', 'Older'];

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const bucketFor = (createdAt) => {
  const date = toDate(createdAt);
  if (!date) return 'Older';
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Past Week';
  if (diffDays <= 30) return 'Past Month';
  return 'Older';
};

const NotificationsPage = ({ role = 'student' }) => {
  const { notifications, unreadCount, markAllAsRead } = useRoleNotifications(role);
  const { addToast } = useToast();

  const roleLabel = ROLE_LABELS[role] || 'User';

  // Group notifications into ordered date buckets (already newest-first).
  const groups = useMemo(() => {
    const map = {};
    notifications.forEach((n) => {
      const b = bucketFor(n.createdAt);
      (map[b] = map[b] || []).push(n);
    });
    return BUCKETS.filter((b) => map[b]?.length).map((b) => ({ label: b, items: map[b] }));
  }, [notifications]);

  const handleMarkAll = () => {
    if (unreadCount === 0) {
      addToast('All notifications are already read.', 'info');
      return;
    }

    markAllAsRead();
    addToast('All notifications marked as read.', 'success');
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-[#0B005C]" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">All Notifications</h2>
                <p className="text-sm text-gray-500">{roleLabel} updates and activity logs</p>
              </div>
            </div>

            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B005C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#13007a] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark all as read
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-500">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{group.label}</h3>
                  <span className="text-xs text-gray-400">{group.items.length}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  {group.items.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-5 border-b last:border-b-0 border-gray-100 ${notification.unread ? 'bg-blue-50/50' : 'bg-white'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          {notification.unread ? (
                            <Dot className="w-6 h-6 text-orange-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-1" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800 font-medium">{notification.text}</p>
                          <div className="mt-1 flex items-center gap-1 text-gray-400 text-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{notification.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
