import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  deleteNotification,
  clearAllNotifications,
  toDate,
} from '../utils/firestoreService';

const formatTimeAgo = (value) => {
  const date = toDate(value);
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

/**
 * Real-time notifications for the signed-in user, backed by the
 * `notifications` Firestore collection. The `role` argument is kept for
 * call-site compatibility but notifications are addressed per user (uid).
 */
export const useRoleNotifications = () => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      return undefined;
    }

    const unsubscribe = subscribeToNotifications(uid, (items) => {
      setNotifications(
        items.map((item) => ({
          ...item,
          time: formatTimeAgo(item.createdAt),
        }))
      );
    });

    return unsubscribe;
  }, [uid]);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const markAllAsRead = () => {
    if (uid) {
      markAllNotificationsRead(uid);
    }
  };

  const markAsRead = (id) => {
    markNotificationRead(id);
  };

  const dismiss = (id) => deleteNotification(id);

  const clearAll = () => {
    if (uid) return clearAllNotifications(uid);
    return Promise.resolve(0);
  };

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    dismiss,
    clearAll,
  };
};
