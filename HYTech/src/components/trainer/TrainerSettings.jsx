import React, { useState, useRef, useEffect } from 'react';
import { User, Bell, Shield, Palette, Globe, Save, Camera, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useUserSettings } from '../../context/useUserSettings';
import { compressAvatarImageToBase64 } from '../../utils/avatarStorage';
import MyCoursesCard from '../shared/MyCoursesCard';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { getUserPrivateProfile, saveUserPrivateProfile } from '../../utils/firestoreService';
import { normalizePhMobile, toStoredPhMobile } from '../../utils/phone';

const TrainerSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { addToast } = useToast();
  const { setAvatar } = useProfileAvatar('trainer');
  const { uid, settingsData, saveSettings } = useUserSettings('trainer');
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
    firstName: '',
    middleName: '',
    lastName: '',
    nameExtension: '',
    birthDate: '',
    email: '',
    phone: '',
    bio: '',
  });
  const [trainerNotificationSettings, setTrainerNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    courseUpdates: true,
    newEnrollments: true,
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
    // Sensitive fields come from the private subcollection, not userSettings.
    const { phone: _p, birthDate: _b, ...publicPF } = settingsData.profileForm;
    setProfileForm((prev) => ({ ...prev, ...publicPF }));
  }
  if (settingsData.trainerNotificationSettings) {
    setTrainerNotificationSettings((prev) => ({ ...prev, ...settingsData.trainerNotificationSettings }));
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
      const p = data.profile || {};
      const priv = (await getUserPrivateProfile(uid)) || {};
      const fallbackName = String(data.name || '').trim().split(/\s+/);
      setProfileForm((prev) => ({
        ...prev,
        firstName: data.firstName || p.firstName || fallbackName[0] || prev.firstName,
        middleName: data.middleName || p.middleName || prev.middleName,
        lastName: data.lastName || p.lastName || fallbackName.slice(1).join(' ') || prev.lastName,
        nameExtension: data.nameExtension || p.nameExtension || prev.nameExtension,
        birthDate: priv.birthDate || data.birthDate || p.dateOfBirth || prev.birthDate,
        email: auth?.currentUser?.email || data.email || prev.email,
        phone: normalizePhMobile(priv.phone || data.phone || p.phoneNumber || prev.phone),
        bio: data.bio || prev.bio,
      }));
      profileHydratedRef.current = true;
    } catch {
      // Keep existing UI state if profile load fails.
    }
  };

  loadProfile();
}, [uid]);

const handleAvatarButton = () => fileInputRef.current?.click();

const handleAvatarChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    addToast('Please select a valid image file.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    setAvatarPreview(reader.result);
    setSelectedAvatarFile(file);
  };
  reader.readAsDataURL(file);
};

const removeAvatar = () => {
  setAvatarPreview(null);
  setSelectedAvatarFile(null);
  setAvatar(null);
  addToast('Profile photo removed.', 'info');
};

  // Handle save
const handleSave = async () => {
  setIsSaving(true);
  try {
    let avatarBase64 = settingsData?.avatarBase64 || null;

    if (selectedAvatarFile) {
      const result = await compressAvatarImageToBase64(selectedAvatarFile);
      avatarBase64 = result.base64;
    }

    if (!avatarPreview) {
      avatarBase64 = null;
    }

    // Keep PII out of the world-readable userSettings copy.
    const publicProfileForm = { ...profileForm, phone: '', birthDate: '' };
    await saveSettings({
      profileForm: publicProfileForm,
      trainerNotificationSettings,
      appearanceSettings,
      privacySettings,
      avatarBase64,
    });

    if (uid && db) {
      const fullName = `${profileForm.firstName.trim()} ${profileForm.middleName.trim()} ${profileForm.lastName.trim()}${profileForm.nameExtension.trim() ? ` ${profileForm.nameExtension.trim()}` : ''}`.replace(/\s+/g, ' ').trim();
      await setDoc(
        doc(db, 'users', uid),
        {
          uid,
          firstName: profileForm.firstName.trim(),
          middleName: profileForm.middleName.trim(),
          lastName: profileForm.lastName.trim(),
          nameExtension: profileForm.nameExtension.trim(),
          name: fullName,
          email: auth?.currentUser?.email || profileForm.email,
          bio: profileForm.bio.trim(),
          updatedAt: serverTimestamp(),
          avatarBase64: avatarBase64 || null,
        },
        { merge: true }
      );
      // Sensitive PII to the owner/admin-only private subcollection.
      await saveUserPrivateProfile(uid, {
        phone: toStoredPhMobile(profileForm.phone),
        birthDate: profileForm.birthDate,
      });
    }

    setAvatar(avatarBase64 || null);
    setAvatarPreview(avatarBase64 || null);
    setSelectedAvatarFile(null);
    setIsSaving(false);
    addToast('Settings saved successfully!', 'success');
  } catch {
    setIsSaving(false);
    addToast('Unable to save settings.', 'error');
  }
};

  const handlePasswordSave = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast('Please fill in all password fields.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('New password and confirmation do not match.', 'error');
      return;
    }

    try {
      const currentUser = auth?.currentUser;
      if (!currentUser?.email) {
        addToast('No authenticated user found.', 'error');
        return;
      }

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      addToast('Password updated successfully.', 'success');
    } catch (error) {
      const message =
        error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : 'Unable to update password. Please try again.';
      addToast(message, 'error');
    }
  };

  const handlePrivacySave = () => {
    saveSettings({ privacySettings })
      .then(() => addToast('Privacy settings updated.', 'success'))
      .catch(() => addToast('Unable to save privacy settings.', 'error'));
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div className="relative">
           <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    onChange={handleAvatarChange}
    className="hidden"
  />
         {avatarPreview ? (
    <div className="w-24 h-24 rounded-full overflow-hidden bg-white border flex items-center justify-center">
      <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
    </div>
  ) : (
    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
      {`${profileForm.firstName?.[0] || ''}${profileForm.lastName?.[0] || ''}`.toUpperCase() || 'TR'}
    </div>
  )}
          <button
    type="button"
    onClick={handleAvatarButton}
    className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
  >
    <Camera className="w-4 h-4 text-gray-600" />
  </button>
            {avatarPreview && (
    <button
      type="button"
      onClick={removeAvatar}
      className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
      title="Remove photo"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Profile Photo</h3>
          <p className="text-sm text-gray-500">JPG, PNG or GIF. Max size 2MB</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={profileForm.firstName}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
          <input 
            type="text" 
            value={profileForm.middleName}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, middleName: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={profileForm.lastName}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name Extension</label>
          <input 
            type="text" 
            placeholder="Jr., Sr., III, etc."
            value={profileForm.nameExtension}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, nameExtension: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Birth Date <span className="text-red-500">*</span></label>
          <input 
            type="date"
            value={profileForm.birthDate}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, birthDate: e.target.value }))}
            min="1920-01-01"
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input 
            type="email" 
            value={profileForm.email}
            readOnly
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 pointer-events-none">+63</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="9XX XXX XXXX"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: normalizePhMobile(e.target.value) }))}
              className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300 bg-white"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        <textarea 
          rows={4}
          placeholder="Tell us about yourself..."
          value={profileForm.bio}
          onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none hover:border-gray-300 bg-white"
        />
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {[
          { key: 'emailNotifications', title: 'Email Notifications', desc: 'Receive email updates about your courses' },
          { key: 'pushNotifications', title: 'Push Notifications', desc: 'Get push notifications on your device' },
          { key: 'courseUpdates', title: 'Course Updates', desc: 'Notify when students submit assignments' },
          { key: 'newEnrollments', title: 'New Enrollments', desc: 'Notify when students enroll in your courses' },
          { key: 'messages', title: 'Messages', desc: 'Notify when you receive new messages' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-900">{item.title}</h4>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={trainerNotificationSettings[item.key]}
                onChange={(e) =>
                  setTrainerNotificationSettings((prev) => ({ ...prev, [item.key]: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">Language</h4>
              <p className="text-sm text-gray-500">Select your preferred language</p>
            </div>
          </div>
          <select
            value={appearanceSettings.language}
            onChange={(e) => setAppearanceSettings((prev) => ({ ...prev, language: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          >
            <option value="en">English (US)</option>
            <option value="fil">Filipino</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <input 
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input 
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input 
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handlePasswordSave}
              className="px-4 py-2.5 bg-[#0B005C] text-white rounded-lg font-medium hover:bg-[#13007a] transition-colors"
            >
              Save Password
            </button>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-800">Hide contact details from students</span>
            <input
              type="checkbox"
              checked={privacySettings.hideContactDetails}
              onChange={(e) => setPrivacySettings((prev) => ({ ...prev, hideContactDetails: e.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-800">Hide active status</span>
            <input
              type="checkbox"
              checked={privacySettings.hideActiveStatus}
              onChange={(e) => setPrivacySettings((prev) => ({ ...prev, hideActiveStatus: e.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-800">Allow analytics tracking</span>
            <input
              type="checkbox"
              checked={privacySettings.allowAnalyticsTracking}
              onChange={(e) => setPrivacySettings((prev) => ({ ...prev, allowAnalyticsTracking: e.target.checked }))}
            />
          </label>
          <div className="flex justify-end">
            <button
              onClick={handlePrivacySave}
              className="px-4 py-2.5 bg-[#0B005C] text-white rounded-lg font-medium hover:bg-[#13007a] transition-colors"
            >
              Save Privacy
            </button>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h4 className="font-medium text-gray-900">Enable 2FA</h4>
            <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Enable
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileSettings();
      case 'notifications': return renderNotificationSettings();
      case 'appearance': return renderAppearanceSettings();
      case 'security': return renderSecuritySettings();
      default: return renderProfileSettings();
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="w-full">
        <div className="mb-4 flex items-center gap-3">
          <User className="w-6 h-6 text-blue-600" />
          <span className="text-lg font-semibold text-gray-900">
            {`${profileForm.firstName || ''} ${profileForm.middleName || ''} ${profileForm.lastName || ''}${profileForm.nameExtension ? ` ${profileForm.nameExtension}` : ''}`.replace(/\s+/g, ' ').trim() || (profileForm.email || 'Your name')}
          </span>
        </div>

        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {activeTab === 'profile' && renderProfileSettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'appearance' && renderAppearanceSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
        </div>

        {activeTab === 'profile' && (
          <div className="mt-6">
            <MyCoursesCard role="trainer" />
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainerSettings;
