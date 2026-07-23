import React, { useState, useRef, useEffect } from 'react';
import { 
  User,
  Bell,
  Camera,
  Mail,
  Phone,
  MapPin,
  Shield,
  X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useUserSettings } from '../../context/useUserSettings';
import { compressAvatarImageToBase64 } from '../../utils/avatarStorage';
import MyCoursesCard from '../shared/MyCoursesCard';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { getUserPrivateProfile, saveUserPrivateProfile } from '../../utils/firestoreService';
import { normalizePhMobile, toStoredPhMobile } from '../../utils/phone';
import { joinNameFields, normalizeEditedNameFields } from '../../utils/nameFormat';


const StudentSettings = () => {
  // ...existing imports and hooks...
  const { addToast } = useToast();
  const { setAvatar } = useProfileAvatar('student');
  const { uid, settingsData, saveSettings } = useUserSettings('student');
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nameExtension: '',
    birthDate: '',
    email: '',
    phone: '',
    address: '',
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
  const settingsHydratedRef = useRef(false);
  const profileHydratedRef = useRef(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedNameFields, setEditedNameFields] = useState({});

  useEffect(() => {
    if (!settingsData || settingsHydratedRef.current) return;
    if (settingsData.notifications) setNotifications((prev) => ({ ...prev, ...settingsData.notifications }));
    if (settingsData.privacyForm) setPrivacyForm((prev) => ({ ...prev, ...settingsData.privacyForm }));
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
    if (!uid || !db || profileHydratedRef.current) return;
    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) return;
        const data = userDoc.data() || {};
        const p = data.profile || {};
        // Sensitive fields come from the private subcollection; fall back to
        // any legacy values still on the main doc for un-migrated accounts.
        const priv = (await getUserPrivateProfile(uid)) || {};
        setProfileForm((prev) => ({
          ...prev,
          firstName: data.firstName || p.firstName || prev.firstName,
          middleName: data.middleName || p.middleName || prev.middleName,
          lastName: data.lastName || p.lastName || prev.lastName,
          nameExtension: data.nameExtension || p.nameExtension || prev.nameExtension,
          birthDate: priv.birthDate || data.birthDate || p.dateOfBirth || prev.birthDate,
          email: auth?.currentUser?.email || data.email || prev.email,
          phone: normalizePhMobile(priv.phone || data.phone || p.phoneNumber || prev.phone),
          address: priv.address || data.address || prev.address,
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

  const handleSave = async () => {
    const normalizedName = normalizeEditedNameFields(profileForm, editedNameFields);
    const { firstName, middleName, lastName, nameExtension } = normalizedName;

    if (!firstName || !lastName) {
      addToast('First name and last name are required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      let avatarBase64 = settingsData?.avatarBase64 || null;
      if (selectedAvatarFile) {
        const result = await compressAvatarImageToBase64(selectedAvatarFile);
        avatarBase64 = result.base64;
      }
      if (!avatarPreview) avatarBase64 = null;

      if (uid && db) {
        const fullName = joinNameFields(normalizedName);
        // Public (org-readable) fields only.
        await setDoc(
          doc(db, 'users', uid),
          {
            uid,
            firstName,
            middleName,
            lastName,
            nameExtension,
            name: fullName,
            displayName: fullName,
            profileComplete: true,
            email: auth?.currentUser?.email || profileForm.email,
            updatedAt: serverTimestamp(),
            avatarBase64: avatarBase64 || null,
          },
          { merge: true }
        );
        // Sensitive PII goes to the owner/admin-only private subcollection.
        await saveUserPrivateProfile(uid, {
          phone: toStoredPhMobile(profileForm.phone),
          address: profileForm.address.trim(),
          birthDate: profileForm.birthDate,
        });

        // Keep Firebase Authentication's display name aligned with the
        // canonical Firestore profile. The Firestore listener still updates
        // the UI if this best-effort Auth metadata update is unavailable.
        if (auth?.currentUser && auth.currentUser.displayName !== fullName) {
          try {
            await updateProfile(auth.currentUser, { displayName: fullName });
          } catch (profileError) {
            console.warn('Could not synchronize Firebase display name:', profileError?.message);
          }
        }
      }

      // Preferences belong in userSettings; identity fields live only in the
      // users document/private profile to avoid two sources overwriting them.
      await saveSettings({ notifications, privacyForm, avatarBase64 });
      setProfileForm((prev) => ({ ...prev, ...normalizedName }));
      setEditedNameFields({});
      setAvatar(avatarBase64 || null);
      setAvatarPreview(avatarBase64 || null);
      setSelectedAvatarFile(null);
      addToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Unable to save student settings:', error);
      addToast('Unable to save settings.', 'error');
    } finally {
      setIsSaving(false);
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
    { id: 'security', label: 'Security & Privacy', icon: Shield },
  ];

  // Derive real account dates from Firebase Auth metadata (no hardcoded values).
  const authMeta = auth?.currentUser?.metadata;
  const memberSince = authMeta?.creationTime
    ? new Date(authMeta.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';
  const lastLogin = authMeta?.lastSignInTime
    ? new Date(authMeta.lastSignInTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

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
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={profileForm.firstName}
            onChange={(e) => {
              setProfileForm((prev) => ({ ...prev, firstName: e.target.value }));
              setEditedNameFields((prev) => ({ ...prev, firstName: true }));
            }}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
          <input
            type="text"
            value={profileForm.middleName}
            onChange={(e) => {
              setProfileForm((prev) => ({ ...prev, middleName: e.target.value }));
              setEditedNameFields((prev) => ({ ...prev, middleName: true }));
            }}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={profileForm.lastName}
            onChange={(e) => {
              setProfileForm((prev) => ({ ...prev, lastName: e.target.value }));
              setEditedNameFields((prev) => ({ ...prev, lastName: true }));
            }}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name Extension</label>
          <input
            type="text"
            placeholder="Jr., Sr., III, etc."
            value={profileForm.nameExtension}
            onChange={(e) => {
              setProfileForm((prev) => ({ ...prev, nameExtension: e.target.value }));
              setEditedNameFields((prev) => ({ ...prev, nameExtension: true }));
            }}
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
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={profileForm.email}
              readOnly
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">+63</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="9XX XXX XXXX"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: normalizePhMobile(e.target.value) }))}
              autoComplete="off"
              className="w-full pl-[4.25rem] pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300 bg-white"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={profileForm.address}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300 bg-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#0D4291] to-[#0B005C] rounded-2xl p-5 text-white">
        <h3 className="font-bold mb-4">Account Status</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Status</span>
            <span className="px-2 py-0.5 bg-green-500 rounded-full text-xs font-bold">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">Member Since</span>
            <span className="font-medium">{memberSince}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">Last Login</span>
            <span className="font-medium">{lastLogin}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
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
          <input
            type="checkbox"
            checked={Boolean(notifications[item.key])}
            onChange={(e) => setNotifications((prev) => ({ ...prev, [item.key]: e.target.checked }))}
          />
        </div>
      ))}
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
              className="px-4 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
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
            <span className="text-sm font-medium text-gray-800">Show profile to classmates</span>
            <input
              type="checkbox"
              checked={privacyForm.showProfileToClassmates}
              onChange={(e) => setPrivacyForm((prev) => ({ ...prev, showProfileToClassmates: e.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-800">Show email to instructors</span>
            <input
              type="checkbox"
              checked={privacyForm.showEmailToInstructors}
              onChange={(e) => setPrivacyForm((prev) => ({ ...prev, showEmailToInstructors: e.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-800">Allow progress analytics insights</span>
            <input
              type="checkbox"
              checked={privacyForm.allowProgressInsights}
              onChange={(e) => setPrivacyForm((prev) => ({ ...prev, allowProgressInsights: e.target.checked }))}
            />
          </label>
          <div className="flex justify-end">
            <button
              onClick={handlePrivacySave}
              className="px-4 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Save Privacy
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <User className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-semibold text-gray-900">
          {`${profileForm.firstName || ''} ${profileForm.middleName || ''} ${profileForm.lastName || ''}${profileForm.nameExtension ? ` ${profileForm.nameExtension}` : ''}`.replace(/\s+/g, ' ').trim() || 'Trainee User'}
        </span>
      </div>

      <div className="mb-6 sm:hidden">
        <label htmlFor="student-settings-section" className="mb-2 block text-sm font-medium text-gray-700">
          Settings section
        </label>
        <select
          id="student-settings-section"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-6 hidden gap-2 overflow-x-auto border-b border-gray-200 sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 -mb-px border-b-2 transition-colors font-medium text-sm ${
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

      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
        {activeTab === 'profile' && renderProfileSettings()}
        {activeTab === 'notifications' && renderNotificationSettings()}
        {activeTab === 'security' && renderSecuritySettings()}
      </div>

      {activeTab === 'profile' && (
        <div className="mt-6">
          <MyCoursesCard role="student" />
        </div>
      )}

      {(activeTab === 'profile' || activeTab === 'notifications') && (
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

    </div>
  );
};

export default StudentSettings;
