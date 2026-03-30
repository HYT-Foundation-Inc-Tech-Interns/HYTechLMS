import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoleNotifications } from '../../context/useRoleNotifications';
import { useToast } from '../../context/ToastContext';

const NotificationDropdown = ({ role = 'student', notifications = [] }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isViewingAll, setIsViewingAll] = useState(false);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const {
    notifications: notificationList,
    unreadCount,
    markAllAsRead,
    markAsRead,
  } = useRoleNotifications(
    role,
    notifications.length > 0 ? notifications : [{ id: 1, text: 'Welcome to HYTech LMS!', time: 'Just now', unread: true }]
  );
  const visibleNotifications = isViewingAll ? notificationList : notificationList.slice(0, 3);

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) {
      addToast('All notifications are already read.', 'info');
      return;
    }

    markAllAsRead();
    addToast('All notifications marked as read.', 'success');
  };

  const handleViewAll = () => {
    setShowNotifications(false);
    setIsViewingAll(false);

    const basePath = role === 'admin' ? '/admin' : role === 'trainer' ? '/trainer' : '/student';
    navigate(`${basePath}/notifications`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
        setIsViewingAll(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={notificationRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setShowNotifications(!showNotifications);
          if (showNotifications) {
            setIsViewingAll(false);
          }
        }}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Dropdown Panel */}
      {showNotifications && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => {
              setShowNotifications(false);
              setIsViewingAll(false);
            }}
          />
          
          {/* Notification Panel */}
          <div className="fixed md:absolute right-4 md:right-0 top-16 md:top-auto md:mt-2 w-[calc(100%-2rem)] md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-slide-down">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button 
                onClick={() => {
                  setShowNotifications(false);
                  setIsViewingAll(false);
                }}
                className="p-1 hover:bg-gray-100:bg-gray-700 rounded-lg transition-colors md:hidden"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Notifications List */}
            <div className={`${isViewingAll ? 'max-h-[70vh]' : 'max-h-80'} overflow-y-auto transition-all duration-200`}>
              {notificationList.length > 0 ? (
                visibleNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50:bg-gray-700 transition-colors cursor-pointer group ${
                      notification.unread ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => {
                      if (notification.unread) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread indicator */}
                      <div className="flex-shrink-0 mt-1.5">
                        {notification.unread ? (
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        ) : (
                          <Check className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-relaxed">{notification.text}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-400">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notificationList.length > 0 && (
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-sm text-gray-500 hover:text-gray-700:text-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark all as read
                </button>
                <button
                  onClick={isViewingAll ? () => setIsViewingAll(false) : handleViewAll}
                  className="text-sm text-orange-600 hover:text-orange-700:text-orange-300 font-medium transition-colors"
                >
                  {isViewingAll ? 'Show less' : 'View all notifications'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;
