import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Settings as SettingsIcon, 
  Shield,
  Save,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  Camera,
  X
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useUserSettings } from '../../context/useUserSettings';
import { compressAvatarImageToBase64 } from '../../utils/avatarStorage';
import { normalizePhMobile, toStoredPhMobile } from '../../utils/phone';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const Settings = () => {
  const { addToast } = useToast();
  const { setAvatar } = useProfileAvatar('admin');
  const { uid, settingsData, saveSettings } = useUserSettings('admin');
  const avatarInputRef = useRef(null);
  const settingsHydratedRef = useRef(false);
  const profileHydratedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);

  // Account form state
  const [accountForm, setAccountForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nameExtension: '',
    birthDate: '',
    emailAddress: '',
    fullAddress: '167 Brgy. Yehey, Quezon City, Philippines',
    contactNumber: '',
    email: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Access & Notification settings
  const [accessSettings, setAccessSettings] = useState({
    allowSelfRegistration: true,
    requireAdminApproval: true,
    lockAccountAfterFailed: true,
    sessionTimeout: 30,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newEnrollmentAlerts: true,
    courseCompletion: true,
    systemAlerts: true,
    newUserRegistration: true,
    certificateIssuance: true,
    emailNotifications: true,
    smsNotifications: true,
  });

  // System Preferences
  const [systemPrefs, setSystemPrefs] = useState({
    siteName: '',
    siteLogo: '',
    welcomeMessage: '',
    language: 'English',
    timezone: 'Asia/Manila (GMT +8)',
    dateFormat: 'MM/DD/YYYY',
    maxEnrolleesPerCourse: 50,
    maxUploadFileSize: 10,
    certificateTemplate: 'TESDA Template',
    gradingSystem: 'Competency-Based (Competent/Not Yet Competent)',
    allowSelfRegistration: true,
    requireAdminApproval: true,
    lockAccountAfterFailed: true,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    forcePasswordChange: true,
    minPasswordLength: 8,
    passwordExpiry: 'Every 90 days',
  });

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'access', label: 'Access and Notification', icon: Bell },
    { id: 'system', label: 'System Preference', icon: SettingsIcon },
    { id: 'security', label: 'Backup & Security', icon: Shield },
  ];

  useEffect(() => {
    if (!settingsData || settingsHydratedRef.current) {
      return;
    }

    if (settingsData.avatarBase64 || settingsData.avatarUrl || settingsData.avatarPreview) {
      const syncedAvatar = settingsData.avatarBase64 || settingsData.avatarUrl || settingsData.avatarPreview;
      setAvatarPreview(syncedAvatar);
      setAvatar(syncedAvatar);
    }
    if (settingsData.accountForm) {
      setAccountForm((prev) => ({
        ...prev,
        ...settingsData.accountForm,
        email: auth?.currentUser?.email || settingsData.accountForm.email || prev.email,
        emailAddress: auth?.currentUser?.email || settingsData.accountForm.emailAddress || prev.emailAddress,
      }));
    }
    if (settingsData.accessSettings) {
      setAccessSettings((prev) => ({ ...prev, ...settingsData.accessSettings }));
    }
    if (settingsData.notificationSettings) {
      setNotificationSettings((prev) => ({ ...prev, ...settingsData.notificationSettings }));
    }
    if (settingsData.systemPrefs) {
      setSystemPrefs((prev) => ({ ...prev, ...settingsData.systemPrefs }));
    }
    if (settingsData.securitySettings) {
      setSecuritySettings((prev) => ({ ...prev, ...settingsData.securitySettings }));
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
        const emailValue = auth?.currentUser?.email || data.email || '';

        setAccountForm((prev) => ({
          ...prev,
          firstName: data.firstName || p.firstName || prev.firstName,
          middleName: data.middleName || p.middleName || prev.middleName,
          lastName: data.lastName || p.lastName || prev.lastName,
          nameExtension: data.nameExtension || p.nameExtension || prev.nameExtension,
          birthDate: data.birthDate || p.dateOfBirth || prev.birthDate,
          fullAddress: data.address || prev.fullAddress,
          contactNumber: normalizePhMobile(data.phone || p.phoneNumber || prev.contactNumber),
          email: emailValue,
          emailAddress: emailValue,
        }));
        profileHydratedRef.current = true;
      } catch {
        // Keep existing UI state if profile load fails.
      }
    };

    loadProfile();
  }, [uid]);

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setSelectedAvatarFile(file);
      addToast('Profile photo selected. Save changes to apply.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setSelectedAvatarFile(null);
    setAvatar(null);
    addToast('Profile photo removed.', 'info');
  };

  const handlePasswordUpdate = async () => {
    if (!accountForm.password || !accountForm.newPassword || !accountForm.confirmPassword) {
      addToast('Please complete all password fields.', 'error');
      return;
    }

    if (accountForm.newPassword.length < 8) {
      addToast('New password must be at least 8 characters.', 'error');
      return;
    }

    if (accountForm.newPassword !== accountForm.confirmPassword) {
      addToast('New password and confirmation do not match.', 'error');
      return;
    }

    try {
      const currentUser = auth?.currentUser;
      if (!currentUser?.email) {
        addToast('No authenticated user found.', 'error');
        return;
      }

      const credential = EmailAuthProvider.credential(currentUser.email, accountForm.password);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, accountForm.newPassword);

      setAccountForm({
        ...accountForm,
        password: '',
        newPassword: '',
        confirmPassword: '',
      });
      addToast('Password updated successfully.', 'success');
    } catch (error) {
      const message =
        error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : 'Unable to update password. Please try again.';
      addToast(message, 'error');
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSaveAll = async () => {
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

      await saveSettings({
        avatarBase64,
        accountForm,
        accessSettings,
        notificationSettings,
        systemPrefs,
        securitySettings,
      });

      if (uid && db) {
        const fullName = `${accountForm.firstName.trim()} ${accountForm.middleName.trim()} ${accountForm.lastName.trim()}${accountForm.nameExtension.trim() ? ` ${accountForm.nameExtension.trim()}` : ''}`.replace(/\s+/g, ' ').trim();
        await setDoc(
          doc(db, 'users', uid),
          {
            uid,
            firstName: accountForm.firstName.trim(),
            middleName: accountForm.middleName.trim(),
            lastName: accountForm.lastName.trim(),
            nameExtension: accountForm.nameExtension.trim(),
            birthDate: accountForm.birthDate,
            name: fullName,
            email: auth?.currentUser?.email || accountForm.email,
            phone: toStoredPhMobile(accountForm.contactNumber),
            address: accountForm.fullAddress.trim(),
            updatedAt: serverTimestamp(),
            avatarBase64: avatarBase64 || null,
          },
          { merge: true }
        );
      }

      setAvatar(avatarBase64 || null);
      setAvatarPreview(avatarBase64 || null);
      setSelectedAvatarFile(null);
      addToast('Settings saved successfully.', 'success');
    } catch {
      addToast('Unable to save settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const Toggle = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <h4 className="font-medium text-gray-800">{label}</h4>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2:ring-offset-gray-800 ${
          enabled ? 'bg-navy-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Profile Photo</h3>
        <p className="text-sm text-gray-500 mb-6">Update your admin profile picture.</p>

        <div className="flex items-center gap-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Admin avatar" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0B005C] to-[#0D4291] text-white text-xl font-semibold flex items-center justify-center">AD</div>
            )}
            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="absolute -top-2 -right-2 p-1.5 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-600" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleAvatarPick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Change Photo
          </button>
        </div>
      </div>

      {/* Account Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Account Information</h3>
        <p className="text-sm text-gray-500 mb-6">Edit or update your account information.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={accountForm.firstName}
              onChange={(e) => setAccountForm({ ...accountForm, firstName: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
            <input
              type="text"
              value={accountForm.middleName}
              onChange={(e) => setAccountForm({ ...accountForm, middleName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={accountForm.lastName}
              onChange={(e) => setAccountForm({ ...accountForm, lastName: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name Extension</label>
            <input
              type="text"
              placeholder="Jr., Sr., III, etc."
              value={accountForm.nameExtension}
              onChange={(e) => setAccountForm({ ...accountForm, nameExtension: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Birth Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={accountForm.birthDate}
              onChange={(e) => setAccountForm({ ...accountForm, birthDate: e.target.value })}
              min="1920-01-01"
              max={new Date().toISOString().split('T')[0]}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address:</label>
            <input
              type="text"
              value={accountForm.emailAddress}
              readOnly
              className="input-field bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Address:</label>
            <input
              type="text"
              value={accountForm.fullAddress}
              onChange={(e) => setAccountForm({ ...accountForm, fullAddress: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number:</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 pointer-events-none z-10">+63</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9XX XXX XXXX"
                value={accountForm.contactNumber}
                onChange={(e) => setAccountForm({ ...accountForm, contactNumber: normalizePhMobile(e.target.value) })}
                className="input-field pl-12"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address:</label>
            <input
              type="email"
              value={accountForm.email}
              readOnly
              className="input-field bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Change Password</h3>
        <p className="text-sm text-gray-500 mb-6">Secure your account</p>
        
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password:</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={accountForm.newPassword}
                onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600:text-gray-300"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password:</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={accountForm.confirmPassword}
                onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePasswordUpdate}
            className="px-4 py-2.5 bg-[#0B005C] text-white rounded-lg font-medium hover:bg-[#13007a] transition-colors"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );

  const renderAccessTab = () => (
    <div className="space-y-8">
      {/* Access Control */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Access Control</h3>
        <p className="text-sm text-gray-500 mb-6">Control how users access the system.</p>
        
        <div className="card p-6">
          <Toggle
            enabled={accessSettings.allowSelfRegistration}
            onChange={(val) => setAccessSettings({ ...accessSettings, allowSelfRegistration: val })}
            label="Allow self registration"
            description="Let new trainees register on their own"
          />
          <Toggle
            enabled={accessSettings.requireAdminApproval}
            onChange={(val) => setAccessSettings({ ...accessSettings, requireAdminApproval: val })}
            label="Require Admin Approval"
            description="New accounts need admin approval before activation"
          />
          <Toggle
            enabled={accessSettings.lockAccountAfterFailed}
            onChange={(val) => setAccessSettings({ ...accessSettings, lockAccountAfterFailed: val })}
            label="Lock Account After Failed Attempts"
            description="Temporarily lock accounts after 5 failed login attempts"
          />
          
          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">Session Time Out (Minutes)</label>
            <div className="relative w-32">
              <select
                value={accessSettings.sessionTimeout}
                onChange={(e) => setAccessSettings({ ...accessSettings, sessionTimeout: Number(e.target.value) })}
                className="input-field appearance-none cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={120}>120</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Auto-logout after inactivity</p>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Notification Preferences</h3>
        <p className="text-sm text-gray-500 mb-6">Choose which notifications you'd like to receive as admin.</p>
        
        <div className="card p-6">
          <Toggle
            enabled={notificationSettings.newEnrollmentAlerts}
            onChange={(val) => setNotificationSettings({ ...notificationSettings, newEnrollmentAlerts: val })}
            label="New Enrollment Alerts"
            description="Get notified when a trainee enrolls in a course"
          />
          <Toggle
            enabled={notificationSettings.courseCompletion}
            onChange={(val) => setNotificationSettings({ ...notificationSettings, courseCompletion: val })}
            label="Course Completion"
            description="Notify when a trainee completes a course or assessment"
          />
          <Toggle
            enabled={notificationSettings.systemAlerts}
            onChange={(val) => setNotificationSettings({ ...notificationSettings, systemAlerts: val })}
            label="System Alerts"
            description="Critical system warnings, errors, and maintenance notices"
          />
          <Toggle
            enabled={notificationSettings.newUserRegistration}
            onChange={(val) => setNotificationSettings({ ...notificationSettings, newUserRegistration: val })}
            label="New User Registration"
            description="Notify when a new user registers and needs approval"
          />
          <Toggle
            enabled={notificationSettings.certificateIssuance}
            onChange={(val) => setNotificationSettings({ ...notificationSettings, certificateIssuance: val })}
            label="Certificate Issuance"
            description="Alert when a certificate is generated"
          />
          <Toggle
            enabled={notificationSettings.emailNotifications}
            onChange={(val) => setNotificationSettings({ ...notificationSettings, emailNotifications: val })}
            label="Email Notifications"
            description="Send all notifications via email"
          />
          <Toggle
            enabled={notificationSettings.smsNotifications}
            onChange={(val) => setNotificationSettings({ ...notificationSettings, smsNotifications: val })}
            label="SMS Notifications"
            description="Send urgent notifications via SMS"
          />
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-8">
      {/* Access Control - Site Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">General Settings</h3>
        <p className="text-sm text-gray-500 mb-6">Configure the look and feel of the LMS platform.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
            <input
              type="text"
              value={systemPrefs.siteName}
              onChange={(e) => setSystemPrefs({ ...systemPrefs, siteName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site Logo</label>
            <div className="flex gap-4">
              <input
                type="text"
                value={systemPrefs.siteLogo}
                onChange={(e) => setSystemPrefs({ ...systemPrefs, siteLogo: e.target.value })}
                className="input-field flex-1"
              />
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload Photo</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Recommended: 200×60px, PNG or SVG</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
            <textarea
              value={systemPrefs.welcomeMessage}
              onChange={(e) => setSystemPrefs({ ...systemPrefs, welcomeMessage: e.target.value })}
              placeholder="Message shown on the login page and dashboard..."
              rows={4}
              className="input-field resize-none"
            />
          </div>
        </div>
      </div>

      {/* Language & Regional */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Language & Regional</h3>
        <p className="text-sm text-gray-500 mb-6">Set the default language and regional preferences.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <div className="relative">
              <select
                value={systemPrefs.language}
                onChange={(e) => setSystemPrefs({ ...systemPrefs, language: e.target.value })}
                className="input-field appearance-none cursor-pointer"
              >
                <option>English</option>
                <option>Filipino</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <div className="relative">
              <select
                value={systemPrefs.timezone}
                onChange={(e) => setSystemPrefs({ ...systemPrefs, timezone: e.target.value })}
                className="input-field appearance-none cursor-pointer"
              >
                <option>Asia/Manila (GMT +8)</option>
                <option>UTC</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
            <div className="relative">
              <select
                value={systemPrefs.dateFormat}
                onChange={(e) => setSystemPrefs({ ...systemPrefs, dateFormat: e.target.value })}
                className="input-field appearance-none cursor-pointer"
              >
                <option>MM/DD/YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Course & Training Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Course & Training Settings</h3>
        <p className="text-sm text-gray-500 mb-6">Configure defaults for courses and training programs.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Enrollees per Course</label>
            <div className="relative">
              <select
                value={systemPrefs.maxEnrolleesPerCourse}
                onChange={(e) => setSystemPrefs({ ...systemPrefs, maxEnrolleesPerCourse: Number(e.target.value) })}
                className="input-field appearance-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Upload File Size (MB)</label>
            <div className="relative">
              <select
                value={systemPrefs.maxUploadFileSize}
                onChange={(e) => setSystemPrefs({ ...systemPrefs, maxUploadFileSize: Number(e.target.value) })}
                className="input-field appearance-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Template</label>
            <div className="relative">
              <select
                value={systemPrefs.certificateTemplate}
                onChange={(e) => setSystemPrefs({ ...systemPrefs, certificateTemplate: e.target.value })}
                className="input-field appearance-none cursor-pointer"
              >
                <option>TESDA Template</option>
                <option>Custom Template</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Grading System</label>
            <div className="relative">
              <select
                value={systemPrefs.gradingSystem}
                onChange={(e) => setSystemPrefs({ ...systemPrefs, gradingSystem: e.target.value })}
                className="input-field appearance-none cursor-pointer"
              >
                <option>Competency-Based (Competent/Not Yet Competent)</option>
                <option>Percentage-Based</option>
                <option>Letter Grade</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <Toggle
            enabled={systemPrefs.allowSelfRegistration}
            onChange={(val) => setSystemPrefs({ ...systemPrefs, allowSelfRegistration: val })}
            label="Allow self registration"
            description="Let new trainees register on their own"
          />
          <Toggle
            enabled={systemPrefs.requireAdminApproval}
            onChange={(val) => setSystemPrefs({ ...systemPrefs, requireAdminApproval: val })}
            label="Require Admin Approval"
            description="New accounts need admin approval before activation"
          />
          <Toggle
            enabled={systemPrefs.lockAccountAfterFailed}
            onChange={(val) => setSystemPrefs({ ...systemPrefs, lockAccountAfterFailed: val })}
            label="Lock Account After Failed Attempts"
            description="Temporarily lock accounts after 5 failed login attempts"
          />
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-8">
      {/* Security Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Security Settings</h3>
        <p className="text-sm text-gray-500 mb-6">Strengthen your system's security with these options.</p>
        
        <div className="card p-6">
          <Toggle
            enabled={securitySettings.twoFactorAuth}
            onChange={(val) => setSecuritySettings({ ...securitySettings, twoFactorAuth: val })}
            label="Two-Factor Authentication (2FA)"
            description="Require 2FA for admin accounts"
          />
          <Toggle
            enabled={securitySettings.forcePasswordChange}
            onChange={(val) => setSecuritySettings({ ...securitySettings, forcePasswordChange: val })}
            label="Force Password Change on First Login"
            description="New users must change their password immediately"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Password Length</label>
              <input
                type="number"
                value={securitySettings.minPasswordLength}
                onChange={(e) => setSecuritySettings({ ...securitySettings, minPasswordLength: Number(e.target.value) })}
                min={6}
                max={32}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry</label>
              <div className="relative">
                <select
                  value={securitySettings.passwordExpiry}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })}
                  className="input-field appearance-none cursor-pointer"
                >
                  <option>Every 30 days</option>
                  <option>Every 60 days</option>
                  <option>Every 90 days</option>
                  <option>Every 180 days</option>
                  <option>Never</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountTab();
      case 'access':
        return renderAccessTab();
      case 'system':
        return renderSystemTab();
      case 'security':
        return renderSecurityTab();
      default:
        return renderAccountTab();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        <div className="mb-4 flex items-center gap-3">
          <User className="w-6 h-6 text-blue-600" />
          <span className="text-lg font-semibold text-gray-900">
            {`${accountForm.firstName || ''} ${accountForm.middleName || ''} ${accountForm.lastName || ''}${accountForm.nameExtension ? ` ${accountForm.nameExtension}` : ''}`.replace(/\s+/g, ' ').trim() || 'Administrator'}
          </span>
        </div>

        <div className="mb-6 sm:hidden">
          <label htmlFor="admin-settings-section" className="mb-2 block text-sm font-medium text-gray-700">
            Settings section
          </label>
          <select
            id="admin-settings-section"
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value)}
            className="input-field w-full appearance-auto"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-6 hidden gap-2 border-b border-gray-200 overflow-x-auto sm:flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-3 sm:px-4 py-2 -mb-px border-b-2 transition-colors font-medium text-sm whitespace-nowrap ${
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

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 animate-fade-in">
          {renderTabContent()}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
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

export default Settings;
