import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, User, Settings } from 'lucide-react';

const StudentNavbar = ({ title, subtitle }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, text: 'New quiz available: Coffee Brewing Fundamentals', time: '1m ago', unread: true },
    { id: 2, text: 'Assignment due tomorrow: Latte Art Portfolio', time: '15m ago', unread: true },
    { id: 3, text: 'Grade posted for Module 2 Assessment', time: '1h ago', unread: false },
  ];

  const handleLogout = () => {
    navigate('/signin');
  };

  return (
    <header className="text-white h-16 px-6 flex items-center justify-between shadow-lg relative z-20 flex-shrink-0" style={{ backgroundColor: '#0B005C' }}>
      {/* Left Side - Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
          <img 
            src="/images/hyt_logo.png" 
            alt="HYT Logo" 
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<span class="text-white font-bold text-xs">HYT</span>';
            }}
          />
        </div>
        <span className="font-semibold">HYTech</span>
        {title && (
          <>
            <ChevronRight className="w-4 h-4 text-white/50" />
            <div>
              <h1 className="font-semibold text-lg leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-xs text-white/70 hidden sm:block">{subtitle}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-slide-down">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${notification.unread ? 'bg-blue-50/50' : ''}`}
                  >
                    <p className="text-sm text-gray-700">{notification.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 text-center border-t border-gray-100">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg">
              GL
            </div>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-slide-down">
              <div className="p-4 border-b border-gray-100">
                <p className="font-semibold text-gray-900">Gerald Andrei Lat</p>
                <p className="text-sm text-gray-500">gerald.lat@email.com</p>
              </div>
              <div className="py-2">
                <button 
                  onClick={() => { navigate('/student/settings'); setShowDropdown(false); }}
                  className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <User className="w-4 h-4" />
                  View Profile
                </button>
                <button 
                  onClick={() => { navigate('/student/settings'); setShowDropdown(false); }}
                  className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <hr className="my-2" />
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default StudentNavbar;
