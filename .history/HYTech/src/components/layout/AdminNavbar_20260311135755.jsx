import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, User, Settings } from 'lucide-react';
import NotificationDropdown from '../shared/NotificationDropdown';
import FlappyBirdGame from '../shared/FlappyBirdGame';

const AdminNavbar = ({ title, subtitle }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Easter egg: show Flappy Bird after 5 logo clicks
  const [showGame, setShowGame] = useState(false);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef(null);

  const handleLogoClick = () => {
    logoClickCount.current += 1;
    clearTimeout(logoClickTimer.current);
    logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 2000);
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      clearTimeout(logoClickTimer.current);
      setShowGame(true);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, text: 'New trainee registered in Construction Sector', time: '1m ago', unread: true },
    { id: 2, text: 'Trainer Ms. Grace updated course materials', time: '15m ago', unread: true },
    { id: 3, text: 'System backup completed successfully', time: '1h ago', unread: false },
  ];

  const handleLogout = () => {
    navigate('/signin');
  };

  return (
    <>
    <header className="text-white h-16 px-6 flex items-center justify-between shadow-lg relative z-50 flex-shrink-0" style={{ backgroundColor: '#0B005C' }}>
      {/* Left Side - Breadcrumb */}
      <div className="flex items-center gap-3">
        <img 
          src="/images/hyt_logo.png" 
          alt="HYT Logo" 
          className="w-10 h-10 object-contain cursor-pointer select-none"
          onClick={handleLogoClick}
          onError={(e) => { e.target.style.display = 'none'; }}
          title="HYTech"
        />
        <span className="font-semibold text-lg">HYTech Admin</span>
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
        <NotificationDropdown notifications={notifications} />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white font-medium text-sm">
              AD
            </div>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] animate-slide-down">
              <div className="p-4 border-b border-gray-100">
                <p className="font-semibold text-gray-900">Admin User</p>
                <p className="text-sm text-gray-500">admin@hytglobal.com</p>
              </div>
              <div className="py-2">
                <button 
                  onClick={() => { navigate('/admin/settings'); setShowDropdown(false); }}
                  className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50:bg-red-900/20 flex items-center gap-3 transition-colors"
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

    {showGame && <FlappyBirdGame onClose={() => setShowGame(false)} />}
    </>
  );
};

export default AdminNavbar;
