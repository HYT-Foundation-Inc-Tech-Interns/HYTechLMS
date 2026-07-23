import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  deleteNotification,
  clearAllNotifications,
  getUserProfile,
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

    let active = true;
    let enrichmentRun = 0;

    const unsubscribe = subscribeToNotifications(uid, (items) => {
      const run = ++enrichmentRun;
      const baseItems = items.map((item) => ({
        ...item,
        displayText: item.text,
        time: formatTimeAgo(item.createdAt),
      }));
      setNotifications(baseItems);

      const senderIds = [...new Set(items.map((item) => item.fromUid).filter(Boolean))];
      if (senderIds.length === 0) return;

      Promise.all(
        senderIds.map(async (senderId) => [senderId, await getUserProfile(senderId)])
      )
        .then((profiles) => {
          if (!active || run !== enrichmentRun) return;
          const profileById = new Map(profiles);
          setNotifications(
            baseItems.map((item) => {
              const profile = profileById.get(item.fromUid) || {};
              const structuredName = [
                profile.firstName || profile.profile?.firstName,
                profile.middleName || profile.profile?.middleName,
                profile.lastName || profile.profile?.lastName,
                profile.nameExtension || profile.profile?.nameExtension,
              ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
              const currentSenderName =
                structuredName || profile.displayName || profile.name || item.fromName || '';

              if (item.type === 'join_request' && currentSenderName) {
                const className = item.metadata?.className || 'your class';
                return {
                  ...item,
                  fromName: currentSenderName,
                  displayText: `${currentSenderName} requested to join ${className}. Approve them in the class roster.`,
                };
              }
              return { ...item, fromName: currentSenderName || item.fromName };
            })
          );
        })
        .catch(() => {
          // Keep the stored notification text if a profile cannot be resolved.
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
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
