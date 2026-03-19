import React from 'react';
import { Bell, CheckCircle2, Clock, Dot } from 'lucide-react';
import { useRoleNotifications } from '../../context/useRoleNotifications';
import { useToast } from '../../context/ToastContext';

const ROLE_LABELS = {
  admin: 'Admin',
  trainer: 'Trainer',
  student: 'Student',
};

const NotificationsPage = ({ role = 'student' }) => {
  const { notifications, unreadCount, markAllAsRead } = useRoleNotifications(role);
  const { addToast } = useToast();

  const roleLabel = ROLE_LABELS[role] || 'User';

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

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No notifications yet.</div>
          ) : (
            notifications.map((notification) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
