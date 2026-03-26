import React, { useState, useRef, useEffect } from 'react';
import { User, Bell, Shield, Palette, Globe, Save, Camera, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useUserSettings } from '../../context/useUserSettings';
import { compressAvatarImageToBase64 } from '../../utils/avatarStorage';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const SupervisorSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { addToast } = useToast();
  const { setAvatar } = useProfileAvatar('supervisor');
  const { uid, settingsData, saveSettings } = useUserSettings('supervisor');
  const settingsHydratedRef = useRef(false);
  const profileHydratedRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [privacySettings, setPrivacySettings] = useState({
    hideContactDetails: false,
    hideActiveStatus: false,
    allowAnalyticsTracking: true,
  });
  const [profileForm, setProfileForm] = useState({
    firstName: 'Supervisor',
    lastName: 'User',
    email: 'supervisor@hytech.com',
    phone: '+63 912 345 6789',
    bio: '',
  });
  const [supervisorNotificationSettings, setSupervisorNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    systemAlerts: true,
    reportDigests: true,
    messages: true,
  });
  const [appearanceSettings, setAppearanceSettings] = useState({
    language: 'en',
  });

  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);

  useEffect(() => {
    if (!settingsData || settingsHydratedRef.current) {
      return;
    }

    if (settingsData.profileForm) {
      setProfileForm((prev) => ({ ...prev, ...settingsData.profileForm }));
    }
    if (settingsData.supervisorNotificationSettings) {
      setSupervisorNotificationSettings((prev) => ({ ...prev, ...settingsData.supervisorNotificationSettings }));
    }
    if (settingsData.appearanceSettings) {
      setAppearanceSettings((prev) => ({ ...prev, ...settingsData.appearanceSettings }));
    }
    if (settingsData.privacySettings) {
      setPrivacySettings((prev) => ({ ...prev, ...settingsData.privacySettings }));
    }
    if (settingsData.avatarBase64 || settingsData.avatarUrl || settingsData.avatarPreview) {
      const syncedAvatar = settingsData.avatarBase64 || settingsData.avatarUrl || settingsData.avatarPreview;
      setAvatarPreview(syncedAvatar);
      setAvatar(syncedAvatar);
    }
    settingsHydratedRef.current = true;
  }, [settingsData, setAvatar]);

  useEffect(() => {
    settingsHydratedRef.current = false;
    profileHydratedRef.current = false;
  }, [uid]);

  useEffect(() => {
    if (!uid || !db || profileHydratedRef.current) {
      return;
    }

    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
          return;
        }

        const data = userDoc.data() || {};
        const fallbackName = String(data.name || '').trim().split(/\s+/);
        setProfileForm((prev) => ({
          ...prev,
          firstName: data.firstName || fallbackName[0] || prev.firstName,
          lastName: data.lastName || fallbackName.slice(1).join(' ') || prev.lastName,
          email: auth?.currentUser?.email || data.email || prev.email,
          phone: data.phone || prev.phone,
          bio: data.bio || prev.bio,
        }));
      } catch (error) {
        console.warn('Error loading profile:', error);
      }
    };

    loadProfile();
    profileHydratedRef.current = true;
  }, [uid]);

  const handleSaveProfile = async () => {
    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      addToast('First name and last name are required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveSettings('supervisor', {
        profileForm,
        supervisorNotificationSettings,
        appearanceSettings,
        privacySettings,
        avatarBase64: avatarPreview,
        updatedAt: serverTimestamp(),
      });
      addToast('Profile settings saved successfully.', 'success');
    } catch {
      addToast('Unable to save settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }

    try {
      const base64 = await compressAvatarImageToBase64(file);
      setAvatarPreview(base64);
      setSelectedAvatarFile(file);
      setAvatar(base64);
    } catch {
      addToast('Unable to process avatar image.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'privacy', label: 'Privacy & Security', icon: Shield },
            { id: 'appearance', label: 'Appearance', icon: Palette },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
                
                {/* Avatar */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                    ) : (
                      <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-indigo-600" />
                      </div>
                    )}
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        Upload Picture
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              {Object.entries(supervisorNotificationSettings).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSupervisorNotificationSettings({ ...supervisorNotificationSettings, [key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Privacy & Security</h2>
              {Object.entries(privacySettings).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setPrivacySettings({ ...privacySettings, [key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={appearanceSettings.language}
                  onChange={(e) => setAppearanceSettings({ ...appearanceSettings, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="en">English</option>
                  <option value="tl">Filipino (Tagalog)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorSettings;
