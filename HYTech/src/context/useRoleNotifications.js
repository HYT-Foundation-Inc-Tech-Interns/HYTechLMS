import { useEffect, useMemo, useState } from 'react';

const DEFAULT_NOTIFICATIONS_BY_ROLE = {
  admin: [
    { id: 1, text: 'New trainee registered in Construction Sector', time: '1m ago', unread: true },
    { id: 2, text: 'Trainer Ms. Grace updated course materials', time: '15m ago', unread: true },
    { id: 3, text: 'System backup completed successfully', time: '1h ago', unread: false },
  ],
  trainer: [
    { id: 1, text: 'New trainee registered in Construction Sector', time: '1m ago', unread: true },
    { id: 2, text: 'Started NC II: Driving', time: '15m ago', unread: true },
    { id: 3, text: 'Completed National Certificate (NC II): Barista', time: '1h ago', unread: false },
  ],
  student: [
    { id: 1, text: 'New quiz available: Coffee Brewing Fundamentals', time: '1m ago', unread: true },
    { id: 2, text: 'Assignment due tomorrow: Latte Art Portfolio', time: '15m ago', unread: true },
    { id: 3, text: 'Grade posted for Module 2 Assessment', time: '1h ago', unread: false },
  ],
};

const normalizeRole = (role) => {
  if (role === 'dashboard') {
    return 'trainer';
  }
  return role || 'student';
};

const getKey = (role) => `hyt-notifications-${normalizeRole(role)}`;

const readStoredNotifications = (role, fallback = []) => {
  try {
    const raw = localStorage.getItem(getKey(role));
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const useRoleNotifications = (role, seedNotifications = null) => {
  const normalizedRole = normalizeRole(role);

  const defaultNotifications = useMemo(() => {
    if (Array.isArray(seedNotifications) && seedNotifications.length > 0) {
      return seedNotifications;
    }
    return DEFAULT_NOTIFICATIONS_BY_ROLE[normalizedRole] || DEFAULT_NOTIFICATIONS_BY_ROLE.student;
  }, [normalizedRole, seedNotifications]);

  const [notifications, setNotifications] = useState(() =>
    readStoredNotifications(normalizedRole, defaultNotifications)
  );

  useEffect(() => {
    const stored = readStoredNotifications(normalizedRole, defaultNotifications);
    setNotifications(stored);
  }, [normalizedRole, defaultNotifications]);

  useEffect(() => {
    localStorage.setItem(getKey(normalizedRole), JSON.stringify(notifications));
    window.dispatchEvent(
      new CustomEvent('hyt:notifications-updated', { detail: { role: normalizedRole } })
    );
  }, [normalizedRole, notifications]);

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.key && event.key !== getKey(normalizedRole)) {
        return;
      }
      setNotifications(readStoredNotifications(normalizedRole, defaultNotifications));
    };

    const syncFromCustomEvent = (event) => {
      if (event.detail?.role !== normalizedRole) {
        return;
      }
      setNotifications(readStoredNotifications(normalizedRole, defaultNotifications));
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('hyt:notifications-updated', syncFromCustomEvent);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('hyt:notifications-updated', syncFromCustomEvent);
    };
  }, [normalizedRole, defaultNotifications]);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
  };
};
