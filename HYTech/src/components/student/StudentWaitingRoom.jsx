import React, { useState } from 'react';
import { Bell, GraduationCap, KeyRound, Lock, LogOut, X } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { auth } from '../../firebase';
import {
  joinClassByCode,
  logActivity,
} from '../../utils/firestoreService';

const StudentWaitingRoom = ({ pendingEnrollments = [] }) => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [classCode, setClassCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  // Password change is available here so new students can secure their account
  // before a trainer adds them to a class (the full Settings page is gated
  // behind enrollment).
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
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
    setSavingPassword(true);
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
      setShowPasswordModal(false);
      addToast('Password updated successfully.', 'success');
    } catch (error) {
      const message =
        error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : 'Unable to update password. Please try again.';
      addToast(message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!classCode.trim()) {
      addToast('Enter a class code first.', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const enrollment = await joinClassByCode(user.uid, classCode);
      logActivity(user.uid, 'join_class', 'enrollments', enrollment.id, {
        className: enrollment.className,
      });
      setClassCode('');
      addToast(`Request sent to join ${enrollment.className}. Your trainer will approve you shortly.`, 'success');
      // The layout keeps this student here until the request is approved.
    } catch (error) {
      addToast(error.message || 'Unable to join class.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-[#0B005C] text-white p-4 text-center sm:p-6 lg:p-8">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome, {user?.displayName || 'Trainee'}!
            </h1>
            <p className="text-white/80">
              Your account is ready, but you're not in a class yet.
            </p>
          </div>

          <div className="p-4 space-y-6 sm:p-6 sm:space-y-8 lg:p-8">
            {/* Pending approval banner */}
            {pendingEnrollments.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <h3 className="font-semibold text-amber-800 text-sm">Waiting for approval</h3>
                </div>
                <p className="text-sm text-amber-700">
                  Your request to join{' '}
                  <span className="font-medium">
                    {pendingEnrollments.map((e) => e.className || 'a class').join(', ')}
                  </span>{' '}
                  is pending. Your dashboard unlocks as soon as the trainer approves you.
                </p>
              </div>
            )}

            {/* Waiting message */}
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                Join your class to get started
              </h2>
              <p className="text-gray-500 text-sm">
                Enter the class code your trainer gave you. Your dashboard unlocks automatically once a
                trainer adds you or approves your request.
              </p>
            </div>

            {/* Join by class code */}
            <form onSubmit={handleJoinByCode}>
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-800">Have a class code?</h3>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] focus:border-transparent font-mono tracking-widest"
                  maxLength={12}
                />
                <button
                  type="submit"
                  disabled={isJoining || !classCode.trim()}
                  className="px-6 py-3 rounded-xl bg-orange-700 text-white font-medium hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-4 py-4 bg-gray-50 border-t border-gray-100 flex flex-col items-stretch gap-3 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-all text-xs text-gray-500">Signed in as {user?.email}</p>
            <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:gap-4">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0B005C] transition-colors"
              >
                <Lock className="w-4 h-4" />
                Change password
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#0B005C]" />
                <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2.5 bg-[#0B005C] text-white rounded-xl font-medium hover:bg-[#1a0f7a] transition-colors disabled:opacity-50"
                >
                  {savingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentWaitingRoom;
