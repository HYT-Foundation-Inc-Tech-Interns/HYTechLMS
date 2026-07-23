import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import NotificationDropdown from '../shared/NotificationDropdown';
import FlappyBirdGame from '../shared/FlappyBirdGame';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';

const StudentNavbar = ({ title, subtitle }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { avatar } = useProfileAvatar('student');
  const { user } = useAuth();

  // Identity comes from the canonical users document exposed by AuthContext.
  // Preferences remain in userSettings, so stale settings can no longer
  // overwrite a name captured during signup.
  const firstName = user?.firstName?.trim() || '';
  const middleName = user?.middleName?.trim() || '';
  const lastName = user?.lastName?.trim() || '';
  const nameExtension = user?.nameExtension?.trim() || '';
  const composedName = `${firstName} ${middleName} ${lastName}${nameExtension ? ` ${nameExtension}` : ''}`.replace(/\s+/g, ' ').trim();
  const fullName = composedName || user?.displayName?.trim() || user?.name?.trim() || 'Trainee User';
  const email = auth?.currentUser?.email || user?.email || 'student@hytech.com';
  const computedInitials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  const initials = computedInitials
    || (fullName !== 'Trainee User'
      ? fullName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
      : 'SU');

  // Easter egg: show Flappy Bird after 5 quick clicks on the wordmark.
  // (The logo itself now navigates home — see handleLogoClick.)
  const [showGame, setShowGame] = useState(false);
  const eggClickCount = useRef(0);
  const eggClickTimer = useRef(null);

  const handleLogoClick = () => {
    navigate('/student');
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
          src="/images/hyt_logo.png" 
          alt="HYT Logo" 
          className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain cursor-pointer select-none"
          onClick={handleLogoClick}
          onError={(e) => { e.target.style.display = 'none'; }}
          title="Go to home"
        />
        <span
          className="hidden sm:inline font-semibold text-base md:text-lg whitespace-nowrap cursor-pointer select-none"
          onClick={handleEasterEgg}
        >
          HYTech
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
        <NotificationDropdown role="student" />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-white/10 rounded-lg p-1 transition-colors"
          >
            {avatar ? (
              <img src={avatar} alt="Trainee profile" className="w-9 h-9 rounded-full object-cover border border-white/20" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg">
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
