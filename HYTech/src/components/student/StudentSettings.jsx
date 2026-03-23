import React, { useState, useRef, useEffect } from 'react';
import { 
  User,
  Bell,
  Camera,
  Mail,
  Phone,
  MapPin,
  Shield,
  ChevronRight,
  X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useUserSettings } from '../../context/useUserSettings';
import { compressAvatarImageToBase64 } from '../../utils/avatarStorage';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';


const StudentSettings = () => {
  // ...existing imports and hooks...
  const { addToast } = useToast();
  const { setAvatar } = useProfileAvatar('student');
  const { uid, settingsData, saveSettings } = useUserSettings('student');
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: 'Gerald Andrei',
    lastName: 'Lat',
    email: 'gerald.lat@email.com',
    phone: '+63 912 345 6789',
    address: 'Makati City, Philippines',
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    courseUpdates: true,
    taskReminders: true,
    newMaterials: false,
    gradeUpdates: true,
  });
  const [privacyForm, setPrivacyForm] = useState({
    showProfileToClassmates: true,
    showEmailToInstructors: false,
    allowProgressInsights: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settingsData) return;
    if (settingsData.profileForm) setProfileForm((prev) => ({ ...prev, ...settingsData.profileForm }));
    if (settingsData.notifications) setNotifications((prev) => ({ ...prev, ...settingsData.notifications }));
    if (settingsData.privacyForm) setPrivacyForm((prev) => ({ ...prev, ...settingsData.privacyForm }));
    if (settingsData.avatarBase64 || settingsData.avatarUrl || settingsData.avatarPreview) {
      const syncedAvatar = settingsData.avatarBase64 || settingsData.avatarUrl || settingsData.avatarPreview;
      setAvatarPreview(syncedAvatar);
      setAvatar(syncedAvatar);
    }
  }, [settingsData, setAvatar]);

  useEffect(() => {
    if (!uid || !db) return;
    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) return;
        const data = userDoc.data() || {};
        setProfileForm((prev) => ({
          ...prev,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
          email: auth?.currentUser?.email || data.email || prev.email,
          phone: data.phone || prev.phone,
          address: data.address || prev.address,
        }));
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let avatarBase64 = settingsData?.avatarBase64 || null;
      if (selectedAvatarFile) {
        const result = await compressAvatarImageToBase64(selectedAvatarFile);
        avatarBase64 = result.base64;
      }
      if (!avatarPreview) avatarBase64 = null;
      await saveSettings({ profileForm, notifications, privacyForm, avatarBase64 });
      if (uid && db) {
        await setDoc(
          doc(db, 'users', uid),
          {
            uid,
            firstName: profileForm.firstName.trim(),
            lastName: profileForm.lastName.trim(),
            name: `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim(),
            email: auth?.currentUser?.email || profileForm.email,
            phone: profileForm.phone.trim(),
            address: profileForm.address.trim(),
            updatedAt: serverTimestamp(),
            avatarBase64: avatarBase64 || null,
          },
          { merge: true }
        );
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

  const handlePrivacySave = async () => {
    try {
      await saveSettings({ privacyForm });
      addToast('Privacy settings updated.', 'success');
    } catch {
      addToast('Unable to save privacy settings.', 'error');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const ProfileSettings = () => (
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
            <div className="w-24 h-24 bg-gradient-to-br from-[#0D4291] to-[#0B005C] rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {`${profileForm.firstName?.[0] || ''}${profileForm.lastName?.[0] || ''}`}
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
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            value={profileForm.firstName}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            value={profileForm.lastName}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
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
          <input
            type="tel"
            value={profileForm.phone}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300 bg-white"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <input
            type="text"
            value={profileForm.address}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300 bg-white"
          />
        </div>
      </div>
    </div>
  );

  const NotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {[
          { key: 'emailNotifications', title: 'Email Notifications', desc: 'Receive notifications via email' },
          { key: 'pushNotifications', title: 'Push Notifications', desc: 'Receive browser push notifications' },
          { key: 'courseUpdates', title: 'Course Updates', desc: 'Get notified about course announcements' },
          { key: 'taskReminders', title: 'Task Reminders', desc: 'Receive reminders for upcoming tasks' },
          { key: 'newMaterials', title: 'New Materials', desc: 'Get notified when new materials are uploaded' },
          { key: 'gradeUpdates', title: 'Grade Updates', desc: 'Receive notifications about grade changes' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-900">{item.title}</h4>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications[item.key]}
                onChange={(e) =>
                  setNotifications((prev) => ({ ...prev, [item.key]: e.target.checked }))
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

  const PrivacySettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">Privacy Settings</h4>
              <p className="text-sm text-gray-500">Control your privacy preferences</p>
            </div>
          </div>
          <label className="flex items-center justify-between text-sm text-gray-700 mb-2">
            <span>Show profile to classmates</span>
            <input
              type="checkbox"
              checked={privacyForm.showProfileToClassmates}
              onChange={(e) => setPrivacyForm((prev) => ({ ...prev, showProfileToClassmates: e.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between text-sm text-gray-700 mb-2">
            <span>Show email to instructors</span>
            <input
              type="checkbox"
              checked={privacyForm.showEmailToInstructors}
              onChange={(e) => setPrivacyForm((prev) => ({ ...prev, showEmailToInstructors: e.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between text-sm text-gray-700">
            <span>Allow progress analytics insights</span>
            <input
              type="checkbox"
              checked={privacyForm.allowProgressInsights}
              onChange={(e) => setPrivacyForm((prev) => ({ ...prev, allowProgressInsights: e.target.checked }))}
            />
          </label>
        </div>
      </div>
    </div>
  );

  const SecuritySettings = () => (
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
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handlePasswordSave}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Save Password
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* User Name Bar */}
      <div className="mb-4 flex items-center gap-3">
        <User className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-semibold text-gray-900">
          {profileForm.firstName} {profileForm.lastName}
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
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'privacy' && <PrivacySettings />}
        {activeTab === 'security' && <SecuritySettings />}
      </div>
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default StudentSettings;
