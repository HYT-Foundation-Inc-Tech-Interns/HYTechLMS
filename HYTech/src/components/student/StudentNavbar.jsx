import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings } from 'lucide-react';
import NotificationDropdown from '../shared/NotificationDropdown';
import FlappyBirdGame from '../shared/FlappyBirdGame';

const StudentNavbar = ({ title, subtitle }) => {
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
    { id: 1, text: 'New quiz available: Coffee Brewing Fundamentals', time: '1m ago', unread: true },
    { id: 2, text: 'Assignment due tomorrow: Latte Art Portfolio', time: '15m ago', unread: true },
    { id: 3, text: 'Grade posted for Module 2 Assessment', time: '1h ago', unread: false },
  ];

  const handleLogout = () => {
    navigate('/signin');
  };

  return (
    <>
    <header className="text-white h-16 px-3 sm:px-4 md:px-6 flex items-center justify-between shadow-lg relative z-50 flex-shrink-0" style={{ backgroundColor: '#0B005C' }}>
      {/* Left Side - Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 pr-2">
        <img 
          src="/images/hyt_logo.png" 
          alt="HYT Logo" 
          className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain cursor-pointer select-none"
          onClick={handleLogoClick}
          onError={(e) => { e.target.style.display = 'none'; }}
          title="HYTech"
        />
        <span className="font-semibold text-base md:text-lg whitespace-nowrap">HYTech</span>
        {title && (
          <div className="min-w-0 border-l border-white/20 ml-2 sm:ml-4 md:ml-9 lg:ml-12 xl:ml-14 pl-3 sm:pl-4 md:pl-5">
              <h1 className="font-semibold text-base md:text-lg leading-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-[11px] md:text-xs text-white/70 hidden sm:block truncate">{subtitle}</p>
              )}
            </div>
        )}
      </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-2 sm:gap-4 pl-2">
        {/* Notifications */}
        <NotificationDropdown notifications={notifications} />

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
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] animate-slide-down">
              <div className="p-4 border-b border-gray-100">
                <p className="font-semibold text-gray-900">Gerald Andrei Lat</p>
                <p className="text-sm text-gray-500">gerald.lat@email.com</p>
              </div>
              <div className="py-2">
                <button 
                  onClick={() => { navigate('/student/settings'); setShowDropdown(false); }}
                  className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <User className="w-4 h-4" />
                  View Profile
                </button>
                <button 
                  onClick={() => { navigate('/student/settings'); setShowDropdown(false); }}
                  className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50:bg-gray-700 flex items-center gap-3 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <hr className="my-2 border-gray-200" />
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

export default StudentNavbar;
