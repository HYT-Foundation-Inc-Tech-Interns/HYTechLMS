import React, { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Save,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  Camera,
  X,
  Image as ImageIcon,
  Database,
  Loader2
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useProfileAvatar } from '../../context/useProfileAvatar';
import { useUserSettings } from '../../context/useUserSettings';
import { useAppSettings } from '../../context/useAppSettings';
import { compressAvatarImageToBase64 } from '../../utils/avatarStorage';
import { normalizePhMobile, toStoredPhMobile } from '../../utils/phone';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import {
  getUserPrivateProfile,
  saveUserPrivateProfile,
  DEFAULT_APP_SETTINGS,
  saveAppSettings,
  uploadBrandingLogo,
  migrateAssessmentAnswerKeys,
  migrateClassDirectory,
  seedTesdaCatalog,
} from '../../utils/firestoreService';
import { joinNameFields, normalizeEditedNameFields } from '../../utils/nameFormat';

// User-facing notification event types that admins can toggle. Keys match the
// `type` written at each createNotification call site; the gate defaults to
// enabled unless a key is explicitly false.
const NOTIFICATION_TYPES = [
  { key: 'join_request', label: 'New enrollment / join request', description: 'When a trainee requests to join a class (sent to the trainer).' },
  { key: 'join_approved', label: 'Enrollment approved', description: 'When a trainee is approved into a class.' },
  { key: 'id_request', label: 'ID request submitted', description: 'When a trainee submits an ID request (sent to admins).' },
  { key: 'id_request_approved', label: 'ID request approved', description: 'When an ID request is approved.' },
  { key: 'id_request_rejected', label: 'ID request rejected', description: 'When an ID request is rejected.' },
  { key: 'id_request_completed', label: 'ID request completed', description: 'When an ID card is marked ready/completed.' },
  { key: 'incident_filed', label: 'Incident filed', description: 'When an incident form is filed (sent to admins).' },
  { key: 'grade_posted', label: 'Grade posted', description: 'When a grade is posted for a trainee.' },
  { key: 'role_changed', label: 'Role changed', description: 'When an admin changes a user’s role.' },
  { key: 'cotrainer_added', label: 'Co-trainer added', description: 'When a trainer is added as a co-trainer.' },
  { key: 'class_ownership_transferred', label: 'Class ownership transferred', description: 'When a class lead is transferred.' },
];

const Settings = () => {
  const { addToast } = useToast();
  const { setAvatar } = useProfileAvatar('admin');
  const { uid, settingsData, saveSettings } = useUserSettings('admin');
  const { appSettings, isLoading: appSettingsLoading } = useAppSettings();
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
    fullAddress: '',
    contactNumber: '',
    email: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Editable copies of the GLOBAL app settings (config/appSettings), hydrated
  // from the live `appSettings` once loaded. These drive the admin-only tabs.
  const [accessForm, setAccessForm] = useState(DEFAULT_APP_SETTINGS.access);
  const [brandingForm, setBrandingForm] = useState(DEFAULT_APP_SETTINGS.branding);
  const [notifForm, setNotifForm] = useState(DEFAULT_APP_SETTINGS.notifications);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [runningTask, setRunningTask] = useState('');
  const appSettingsHydratedRef = useRef(false);
  const logoInputRef = useRef(null);

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'access', label: 'Access & Registration', icon: Shield },
    { id: 'branding', label: 'Branding', icon: ImageIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'maintenance', label: 'Maintenance', icon: Database },
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
    settingsHydratedRef.current = true;
  }, [settingsData, setAvatar]);

  // Hydrate the admin-tab forms once the global settings have loaded (the first
  // real snapshot). After that the admin edits locally and saves.
  useEffect(() => {
    if (appSettingsLoading || appSettingsHydratedRef.current) return;
    setAccessForm((prev) => ({ ...prev, ...appSettings.access }));
    setBrandingForm((prev) => ({ ...prev, ...appSettings.branding }));
    setNotifForm((prev) => ({ ...prev, ...appSettings.notifications }));
    appSettingsHydratedRef.current = true;
  }, [appSettingsLoading, appSettings]);

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
        const [userDoc, privateProfile] = await Promise.all([
          getDoc(doc(db, 'users', uid)),
          getUserPrivateProfile(uid),
        ]);
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
          birthDate: privateProfile?.birthDate || data.birthDate || p.dateOfBirth || prev.birthDate,
          fullAddress: privateProfile?.address || data.address || prev.fullAddress,
          contactNumber: normalizePhMobile(
            privateProfile?.phone || data.phone || p.phoneNumber || prev.contactNumber
          ),
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

      await saveSettings({ avatarBase64 });

      if (uid && db) {
        const normalizedName = normalizeEditedNameFields(accountForm);
        if (!normalizedName.firstName || !normalizedName.lastName) {
          throw new Error('First name and last name are required.');
        }
        const fullName = joinNameFields(normalizedName);
        await setDoc(
          doc(db, 'users', uid),
          {
            uid,
            firstName: normalizedName.firstName,
            middleName: normalizedName.middleName,
            lastName: normalizedName.lastName,
            nameExtension: normalizedName.nameExtension,
            name: fullName,
            displayName: fullName,
            email: auth?.currentUser?.email || accountForm.email,
            updatedAt: serverTimestamp(),
            avatarBase64: avatarBase64 || null,
          },
          { merge: true }
        );
        await saveUserPrivateProfile(uid, {
          birthDate: accountForm.birthDate,
          phone: toStoredPhMobile(accountForm.contactNumber),
          address: accountForm.fullAddress.trim(),
        });
        if (auth?.currentUser && auth.currentUser.displayName !== fullName) {
          await updateProfile(auth.currentUser, { displayName: fullName });
        }
      }

      // Persist the global app settings (admin-only; rules reject non-admins).
      let logoUrl = brandingForm.logoUrl || '';
      if (logoFile) {
        logoUrl = await uploadBrandingLogo(logoFile);
      }
      await saveAppSettings({
        branding: { ...brandingForm, logoUrl },
        access: {
          ...accessForm,
          sessionTimeoutMinutes: Number(accessForm.sessionTimeoutMinutes) || 0,
          minPasswordLength: Number(accessForm.minPasswordLength) || 8,
        },
        notifications: notifForm,
      });
      if (logoFile) {
        setBrandingForm((b) => ({ ...b, logoUrl }));
        setLogoFile(null);
        setLogoPreview(null);
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

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
    setLogoFile(file);
    addToast('Logo selected. Save changes to apply.', 'info');
  };

  // Run one maintenance task at a time and surface a human-readable result.
  const runMaintenance = async (taskKey, label, fn) => {
    if (runningTask) return;
    setRunningTask(taskKey);
    try {
      const result = await fn();
      const detail =
        result?.migrated != null ? `${result.migrated} updated`
          : result?.synchronized != null ? `${result.synchronized} synchronized`
          : result?.created != null ? `${result.created} created`
          : 'done';
      addToast(`${label}: ${detail}.`, 'success');
    } catch (error) {
      addToast(`${label} failed: ${error?.message || 'unknown error'}`, 'error');
    } finally {
      setRunningTask('');
    }
  };

  const renderAccessTab = () => (
    <div className="space-y-8">
      {/* Registration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Registration</h3>
        <p className="text-sm text-gray-500 mb-6">Control who can join the platform and how enrollments are approved.</p>

        <div className="card p-6">
          <Toggle
            enabled={accessForm.allowSelfRegistration}
            onChange={(val) => setAccessForm({ ...accessForm, allowSelfRegistration: val })}
            label="Allow self-registration"
            description="When off, the public sign-up page is disabled and only admins can create accounts."
          />
          <Toggle
            enabled={accessForm.requireEnrollmentApproval}
            onChange={(val) => setAccessForm({ ...accessForm, requireEnrollmentApproval: val })}
            label="Require enrollment approval"
            description="When on, joining by class code creates a pending request the trainer must approve. When off, trainees are enrolled immediately."
          />
          <Toggle
            enabled={accessForm.allowMultipleEnrollments}
            onChange={(val) => setAccessForm({ ...accessForm, allowMultipleEnrollments: val })}
            label="Allow multiple active enrollments"
            description="When off, a trainee with an active enrollment cannot join another class until it ends."
          />
        </div>
      </div>

      {/* Sign-in security */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Sign-in Security</h3>
        <p className="text-sm text-gray-500 mb-6">Password and session policy applied across all accounts.</p>

        <div className="card p-6">
          <Toggle
            enabled={accessForm.forcePasswordChangeDefault}
            onChange={(val) => setAccessForm({ ...accessForm, forcePasswordChangeDefault: val })}
            label="Force password change on first login"
            description="Admin-created accounts must set a new password before using the app."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Session Timeout (Minutes)</label>
              <div className="relative">
                <select
                  value={accessForm.sessionTimeoutMinutes}
                  onChange={(e) => setAccessForm({ ...accessForm, sessionTimeoutMinutes: Number(e.target.value) })}
                  className="input-field appearance-none cursor-pointer"
                >
                  <option value={0}>Disabled</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                  <option value={120}>120</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Auto sign-out after inactivity. Disabled = never.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Minimum Password Length</label>
              <input
                type="number"
                value={accessForm.minPasswordLength}
                onChange={(e) => setAccessForm({ ...accessForm, minPasswordLength: Number(e.target.value) })}
                min={6}
                max={32}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">Enforced on sign-up and password changes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBrandingTab = () => {
    const currentLogo = logoPreview || brandingForm.logoUrl || '/images/hyt_logo.png';
    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Branding</h3>
          <p className="text-sm text-gray-500 mb-6">Name, welcome message, and logo shown across the app and on the sign-in page.</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
              <input
                type="text"
                value={brandingForm.siteName}
                onChange={(e) => setBrandingForm({ ...brandingForm, siteName: e.target.value })}
                placeholder="HYTech"
                maxLength={60}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
              <textarea
                value={brandingForm.welcomeMessage}
                onChange={(e) => setBrandingForm({ ...brandingForm, welcomeMessage: e.target.value })}
                placeholder="Shown on the landing page and dashboard header..."
                rows={3}
                maxLength={280}
                className="input-field resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              <div className="flex items-center gap-4">
                <img
                  src={currentLogo}
                  alt="Site logo preview"
                  className="h-12 w-12 rounded-lg object-contain bg-gray-50 border border-gray-200 p-1"
                />
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Logo</span>
                </button>
                {(brandingForm.logoUrl || logoPreview) && (
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); setBrandingForm({ ...brandingForm, logoUrl: '' }); }}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Reset to default
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">PNG or SVG, max 5MB. Uploaded on Save.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotificationsTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Notification Events</h3>
        <p className="text-sm text-gray-500 mb-6">Turn off any event to stop generating in-app notifications for it, platform-wide.</p>

        <div className="card p-6">
          {NOTIFICATION_TYPES.map((n) => (
            <Toggle
              key={n.key}
              enabled={notifForm[n.key] !== false}
              onChange={(val) => setNotifForm({ ...notifForm, [n.key]: val })}
              label={n.label}
              description={n.description}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderMaintenanceTab = () => {
    const tasks = [
      {
        key: 'answerKeys',
        label: 'Migrate assessment answer keys',
        description: 'Move legacy quiz answers into the protected answer-key subdocument.',
        fn: migrateAssessmentAnswerKeys,
      },
      {
        key: 'classDirectory',
        label: 'Sync class directory',
        description: 'Rebuild the sanitized class directory used by the enroll catalog.',
        fn: migrateClassDirectory,
      },
      {
        key: 'tesda',
        label: 'Seed TESDA catalog',
        description: 'Create any missing sectors and program templates from the TESDA catalog.',
        fn: seedTesdaCatalog,
      },
    ];
    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Maintenance</h3>
          <p className="text-sm text-gray-500 mb-6">Run data tools on demand. These are safe to re-run, but only run one at a time.</p>

          <div className="space-y-3">
            {tasks.map((t) => (
              <div key={t.key} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium text-gray-800">{t.label}</h4>
                  <p className="text-sm text-gray-500">{t.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => runMaintenance(t.key, t.label, t.fn)}
                  disabled={Boolean(runningTask)}
                  className="inline-flex shrink-0 items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {runningTask === t.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {runningTask === t.key ? 'Running…' : 'Run'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountTab();
      case 'access':
        return renderAccessTab();
      case 'branding':
        return renderBrandingTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'maintenance':
        return renderMaintenanceTab();
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
