import React, { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { useAppSettings } from '../../context/useAppSettings';

/**
 * Blocking screen shown when a user's account has `mustChangePassword: true`
 * (set on admin-created accounts). The user cannot reach the app until they
 * replace their temporary password. Clearing the flag releases the gate via
 * the users-doc snapshot in RoleProtectedRoute.
 */
const ForcePasswordChange = () => {
  const { addToast } = useToast();
  const { appSettings } = useAppSettings();
  const minLen = Number(appSettings.access.minPasswordLength) || 8;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const currentUser = auth?.currentUser;
    if (!currentUser?.email) {
      addToast('No authenticated user found.', 'error');
      return;
    }
    if (newPassword.length < minLen) {
      addToast(`New password must be at least ${minLen} characters.`, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New password and confirmation do not match.', 'error');
      return;
    }
    if (newPassword === currentPassword) {
      addToast('Choose a password different from your temporary one.', 'error');
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        mustChangePassword: false,
        passwordChangedAt: serverTimestamp(),
      });
      addToast('Password updated. Welcome!', 'success');
    } catch (error) {
      const message =
        error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : 'Unable to update password. Please try again.';
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (auth) await signOut(auth);
    } catch {
      // Ignore sign-out errors.
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Lock className="w-5 h-5" /></div>
          <h1 className="text-xl font-bold text-gray-900">Set a new password</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Your account uses a temporary password. Please choose a new one to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current (temporary) password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field w-full"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field w-full"
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-xs text-gray-400">At least {minLen} characters.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field w-full"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPasswords ? 'Hide passwords' : 'Show passwords'}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
