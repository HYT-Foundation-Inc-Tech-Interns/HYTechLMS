import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, Users, BookOpen, ClipboardList } from 'lucide-react';
import { signOut } from 'firebase/auth';
import NotificationDropdown from '../shared/NotificationDropdown';
import FlappyBirdGame from '../shared/FlappyBirdGame';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useUserSettings } from '../../context/useUserSettings';
import { useAppSettings } from '../../context/useAppSettings';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';

const Navbar = ({ title, subtitle }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { avatar } = useProfileAvatar('trainer');
  const { settingsData } = useUserSettings('trainer');
  const { appSettings } = useAppSettings();
  const siteName = appSettings.branding.siteName || 'HYTech';
  const logoUrl = appSettings.branding.logoUrl || '/images/hyt_logo.png';
  const { user } = useAuth();

  // Prefer the name saved in Settings, but fall back to the user doc profile
  // (set at sign-up) so the navbar never shows the generic placeholder.
  const firstName = settingsData?.profileForm?.firstName?.trim() || user?.firstName?.trim() || '';
  const middleName = settingsData?.profileForm?.middleName?.trim() || user?.middleName?.trim() || '';
  const lastName = settingsData?.profileForm?.lastName?.trim() || user?.lastName?.trim() || '';
  const nameExtension = settingsData?.profileForm?.nameExtension?.trim() || user?.nameExtension?.trim() || '';
  const composedName = `${firstName} ${middleName} ${lastName}${nameExtension ? ` ${nameExtension}` : ''}`.replace(/\s+/g, ' ').trim();
  const fullName = composedName || user?.displayName?.trim() || user?.name?.trim() || 'Trainor';
  const email = settingsData?.profileForm?.email || auth?.currentUser?.email || user?.email || 'trainer@hytech.com';
  const computedInitials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  const initials = computedInitials
    || (fullName !== 'Trainor'
      ? fullName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
      : 'TR');

  // Easter egg: show Flappy Bird after 5 quick clicks on the wordmark.
  // (The logo itself now navigates home — see handleLogoClick.)
  const [showGame, setShowGame] = useState(false);
  const eggClickCount = useRef(0);
  const eggClickTimer = useRef(null);

  const handleLogoClick = () => {
    navigate('/trainer');
  };

  const handleEasterEgg = () => {
    eggClickCount.current += 1;
    // Reset counter if user pauses more than 2 seconds between clicks
    clearTimeout(eggClickTimer.current);
    eggClickTimer.current = setTimeout(() => {
      eggClickCount.current = 0;
    }, 2000);
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
          onError={(e) => {
            e.target.style.display = 'none';
          }}
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
        <NotificationDropdown role="trainer" />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            {avatar ? (
              <img src={avatar} alt="Trainor profile" className="w-9 h-9 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center font-semibold text-sm shadow-lg">
                {initials}
              </div>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] animate-slide-down">
              <div className="p-4 border-b border-gray-100">
                <p className="font-semibold text-gray-800">{fullName}</p>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={() => navigate('/trainer/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50:bg-gray-700 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">View Profile</span>
                </button>
                <button
                  onClick={() => navigate('/trainer/settings')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50:bg-gray-700 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Settings</span>
                </button>
                <hr className="my-2 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Easter egg: Flappy Bird game */}
    {showGame && <FlappyBirdGame onClose={() => setShowGame(false)} />}
    </>
  );
};

export default Navbar;
