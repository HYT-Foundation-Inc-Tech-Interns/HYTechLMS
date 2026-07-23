import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck, RefreshCw, LogIn, AlertTriangle } from 'lucide-react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Post-signup "check your email" screen with a resend control.
 *
 * This is a bare public route (not wrapped by PublicOnlyRoute) on purpose: the
 * user arrives here signed in but unverified, so `auth.currentUser` is available
 * for resends and for polling `emailVerified` without asking for the password
 * again. Protected routes still block the unverified session everywhere else.
 */
const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const email = auth?.currentUser?.email || location.state?.email || '';
  // If we landed here after a failed send at signup, start the user on a resend.
  const [cooldown, setCooldown] = useState(location.state?.emailSent === false ? 0 : RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const pollRef = useRef(null);

  // Countdown for the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const finishVerified = async () => {
    addToast('Email verified! Please sign in to continue.', 'success');
    await signOut(auth).catch(() => {});
    navigate('/signin', { replace: true });
  };

  // Poll for verification in the background so the page advances on its own
  // once the user clicks the link in their inbox.
  useEffect(() => {
    if (!auth?.currentUser) return undefined;
    pollRef.current = setInterval(async () => {
      try {
        await auth.currentUser.reload();
        if (auth.currentUser?.emailVerified) {
          clearInterval(pollRef.current);
          await finishVerified();
        }
      } catch {
        /* transient — keep polling */
      }
    }, 5000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    if (cooldown > 0) return;
    if (!auth?.currentUser) {
      addToast('Your session expired. Sign in to resend the verification email.', 'info');
      navigate('/signin', { replace: true });
      return;
    }
    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      addToast(`Verification link sent to ${auth.currentUser.email}. Check your inbox and spam folder.`, 'success');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const messages = {
        'auth/too-many-requests': 'Too many requests. Please wait a minute before trying again.',
        'auth/network-request-failed': 'Network error. Check your connection and try again.',
      };
      addToast(messages[error?.code] || 'Could not resend the verification email. Please try again.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckNow = async () => {
    if (!auth?.currentUser) {
      navigate('/signin', { replace: true });
      return;
    }
    setIsChecking(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser?.emailVerified) {
        await finishVerified();
      } else {
        addToast("We haven't seen the verification yet. Click the link in your email, then try again.", 'info');
      }
    } catch {
      addToast('Could not check verification status. Please try again.', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleBackToSignIn = async () => {
    await signOut(auth).catch(() => {});
    navigate('/signin', { replace: true });
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated background (matches the auth screens) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl animate-pulse-slow animation-delay-1s" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/30 shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg animate-scale-in">
            <MailCheck className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-600">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-gray-900 break-all mt-1 mb-4">
            {email || 'your email address'}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Click the link in that email to verify your account, then sign in.
          </p>

          {/* Prominent spam-folder reminder — the verification email often lands there. */}
          <div className="flex items-start gap-2.5 text-left bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Don't see it?</span> Please also check your{' '}
              <span className="font-semibold">spam</span> or{' '}
              <span className="font-semibold">promotions</span> folder — the email can take a
              minute to arrive.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
              {isResending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend verification email'}
            </button>

            <button
              type="button"
              onClick={handleCheckNow}
              disabled={isChecking}
              className="w-full py-2.5 text-sm font-semibold text-orange-600 hover:text-orange-700 border border-orange-200 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isChecking ? 'Checking…' : "I've verified — check now"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleBackToSignIn}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors font-medium"
          >
            <LogIn className="w-4 h-4" />
            Back to sign in
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Wrong email?{' '}
          <Link to="/signup" onClick={() => signOut(auth).catch(() => {})} className="text-orange-500 hover:underline font-medium">
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
