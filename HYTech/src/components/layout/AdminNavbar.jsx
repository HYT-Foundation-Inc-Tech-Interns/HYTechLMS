import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import NotificationDropdown from '../shared/NotificationDropdown';
import FlappyBirdGame from '../shared/FlappyBirdGame';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useUserSettings } from '../../context/useUserSettings';
import { useAppSettings } from '../../context/useAppSettings';
import { auth } from '../../firebase';

const AdminNavbar = ({ title, subtitle }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { avatar } = useProfileAvatar('admin');
  const { settingsData } = useUserSettings('admin');
  const { appSettings } = useAppSettings();
  const siteName = appSettings.branding.siteName || 'HYTech';
  const logoUrl = appSettings.branding.logoUrl || '/images/hyt_logo.png';

  const firstName = settingsData?.accountForm?.firstName?.trim() || '';
  const middleName = settingsData?.accountForm?.middleName?.trim() || '';
  const lastName = settingsData?.accountForm?.lastName?.trim() || '';
  const nameExtension = settingsData?.accountForm?.nameExtension?.trim() || '';
  const fullName = `${firstName} ${middleName} ${lastName}${nameExtension ? ` ${nameExtension}` : ''}`.replace(/\s+/g, ' ').trim() || 'Admin User';
  const email = settingsData?.accountForm?.email || settingsData?.accountForm?.emailAddress || auth?.currentUser?.email || 'admin@hytglobal.com';
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'AD';

  // Easter egg: show Flappy Bird after 5 logo clicks
  const [showGame, setShowGame] = useState(false);
  const eggClickCount = useRef(0);
  const eggClickTimer = useRef(null);

  const handleLogoClick = () => {
    navigate('/admin');
  };

  const handleEasterEgg = () => {
    eggClickCount.current += 1;
    clearTimeout(eggClickTimer.current);
    eggClickTimer.current = setTimeout(() => { eggClickCount.current = 0; }, 2000);
    if (eggClickCount.current >= 5) {
      eggClickCount.current = 0;
      clearTimeout(eggClickTimer.current);
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

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch {
      // Ignore sign-out errors and continue navigating to sign-in.
    } finally {
      setShowDropdown(false);
      navigate('/signin', { replace: true });
    }
  };

  return (
    <>
    <header className="text-white h-16 pl-16 pr-3 sm:pr-4 lg:px-6 flex items-center justify-between shadow-lg relative z-50 flex-shrink-0" style={{ backgroundColor: '#0B005C' }}>
      {/* Left Side - Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 pr-2">
        <img
          src={logoUrl}
          alt={`${siteName} Logo`}
          className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain cursor-pointer select-none"
          onClick={handleLogoClick}
          onError={(e) => { e.target.style.display = 'none'; }}
          title="Go to home"
        />
        <span
          className="hidden sm:inline font-semibold text-base md:text-lg whitespace-nowrap cursor-pointer select-none"
          onClick={handleEasterEgg}
        >
          {siteName}
        </span>
        {title && (
          <div className="min-w-0 ml-1 sm:ml-4 lg:ml-16 xl:ml-24 pl-2 sm:pl-4">
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
        <NotificationDropdown role="admin" />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            {avatar ? (
              <img src={avatar} alt="Admin profile" className="w-9 h-9 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {initials}
              </div>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] animate-slide-down">
              <div className="p-4 border-b border-gray-100">
                <p className="font-semibold text-gray-900">{fullName}</p>
                <p className="text-sm text-gray-500">{email}</p>
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
