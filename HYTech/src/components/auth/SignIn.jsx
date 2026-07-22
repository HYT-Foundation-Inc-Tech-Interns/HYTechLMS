import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db, firebaseInitError } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { getHomePathForRole, resolveEffectiveRole } from '../../utils/authRole';
import { logActivity } from '../../utils/firestoreService';

const SignIn = () => {
  const SIGN_IN_DRAFT_KEY = 'hyt:signin:draft';
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      const saved = localStorage.getItem(SIGN_IN_DRAFT_KEY);
      return saved ? Boolean(JSON.parse(saved)?.rememberMe) : false;
    } catch {
      return false;
    }
  });
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(SIGN_IN_DRAFT_KEY);
      if (!saved) {
        return { email: '', password: '' };
      }
      const parsed = JSON.parse(saved);
      return {
        email: parsed?.email || '',
        password: '',
      };
    } catch {
      return { email: '', password: '' };
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      SIGN_IN_DRAFT_KEY,
      JSON.stringify({
        email: formData.email,
        rememberMe,
      })
    );
  }, [formData, rememberMe]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      addToast('Please enter your email address.', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, forgotPasswordEmail.trim().toLowerCase());
      addToast('Password reset email sent! Check your inbox and spam folder.', 'success');
      setForgotPasswordEmail('');
      setShowForgotPasswordModal(false);
    } catch (error) {
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      addToast(errorMessages[error?.code] || 'Unable to send password reset email. Please try again.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email.trim() || !formData.password) {
      addToast('Enter your email and password, then resend.', 'info');
      return;
    }
    setIsResendingVerification(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        formData.email.trim().toLowerCase(),
        formData.password
      );
      if (credential.user.emailVerified) {
        addToast('Your email is already verified — you can sign in now.', 'success');
        setNeedsVerification(false);
      } else {
        await sendEmailVerification(credential.user);
        addToast(`Verification link sent to ${credential.user.email}. Check your inbox and spam folder.`, 'success');
      }
      await signOut(auth);
    } catch (error) {
      const errorMessages = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/wrong-password': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      };
      addToast(errorMessages[error?.code] || 'Could not resend the verification email. Please try again.', 'error');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const ensureUserProfileDocument = async (firebaseUser) => {
    const normalizedEmail = String(firebaseUser?.email || '').trim().toLowerCase();
    const profileRef = doc(db, 'users', firebaseUser.uid);
    const existingDoc = await getDoc(profileRef);

    if (existingDoc.exists()) {
      return existingDoc;
    }

    await setDoc(
      profileRef,
      {
        uid: firebaseUser.uid,
        name: normalizedEmail.split('@')[0] || 'User',
        email: normalizedEmail,
        phone: '',
        role: 'student',
        status: 'Active',
        createdAt: serverTimestamp(),
        createdBy: 'system-backfill',
      },
      { merge: true }
    );

    return getDoc(profileRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNeedsVerification(false);

    try {
      if (!auth || !db) {
        addToast(firebaseInitError || 'Firebase is not configured correctly.', 'error');
        return;
      }

      const normalizedEmail = formData.email.trim().toLowerCase();
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        formData.password
      );

      // Ensure profile exists so the account appears in User Management.
      const userSnap = await ensureUserProfileDocument(credential.user);

      // Prevent login if user is marked inactive in Firestore
      try {
        const status = String(userSnap.exists() ? (userSnap.data()?.status || 'Active') : 'Active').toLowerCase();
        if (status !== 'active') {
          // Sign out immediately and show message
          await signOut(auth);
          addToast('This account is inactive. Contact your administrator.', 'error');
          return;
        }
      } catch (err) {
        // If we fail to read Firestore, allow fallback to resolve role — but prefer denying on explicit inactive.
        console.warn('Error checking user status during sign-in', err);
      }

      // Require a verified email for self-registered accounts. Admin-created
      // accounts (and staff roles) are exempt so they are never locked out.
      const userData = userSnap.exists() ? (userSnap.data() || {}) : {};
      const roleLower = String(userData.role || '').toLowerCase();
      const isVerificationExempt =
        userData.createdBy === 'admin' || roleLower === 'admin' || roleLower === 'trainer';

      if (!isVerificationExempt && !credential.user.emailVerified) {
        try {
          await sendEmailVerification(credential.user);
        } catch (verifyErr) {
          console.warn('Could not resend verification email:', verifyErr?.message);
        }
        await signOut(auth);
        setNeedsVerification(true);
        addToast(
          `Please verify your email before signing in. We sent a new verification link to ${normalizedEmail}.`,
          'warning'
        );
        return;
      }

      const role = await resolveEffectiveRole({
        uid: credential.user.uid,
        database: db,
      });
      logActivity(credential.user.uid, 'user_login', 'users', credential.user.uid, {
        email: normalizedEmail,
        role,
      });
      navigate(getHomePathForRole(role));
    } catch (error) {
      const errorMessages = {
        'auth/invalid-api-key': 'Invalid Firebase API key. Check your VITE_FIREBASE_API_KEY value.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found': 'User account not found.',
        'auth/wrong-password': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
      };

      const message = errorMessages[error?.code] || 'Unable to sign in. Please try again.';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated Background Layers */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-orange-50" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl animate-pulse-slow animation-delay-1s" />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-purple-300/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2s" />
      </div>

      {/* Left Side - Hero Section */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-navy-500/60" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white text-center">
          {/* Logo - Made Much Bigger */}
          <div className="mb-6 animate-fade-in">
            <div className="w-56 h-56 mx-auto mb-6 relative translate-y-11 auth-logo-glow">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl scale-110" />
              <img 
                src="/images/hyt_logo.png" 
                alt="HYT Global Institute Logo" 
                className="relative w-full h-full object-contain drop-shadow-2xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Welcome Text */}
          <div className="animate-slide-up">
            <h1 className="text-4xl lg:text-4xl font-bold mb-4">
              Welcome Back to
            </h1>
            <h2 className="text-3xl lg:text-5xl font-bold text-orange-400">
              HYTech
            </h2>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-900/50 to-transparent" />
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative">
        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-48 h-48 opacity-10 hidden xl:block animate-float">
          <div className="w-full h-full rounded-full border-2 border-orange-400" />
        </div>
        <div className="absolute bottom-20 left-10 w-32 h-32 opacity-5 hidden xl:block animate-float animation-delay-2s">
          <div className="w-full h-full rounded-full border-2 border-blue-400" />
        </div>

        <div className="w-full max-w-md animate-fade-in relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300 animate-scale-in">
              <img 
                src="/images/hyt_logo.png" 
                alt="HYT Logo" 
                className="w-12 sm:w-16 h-12 sm:h-16 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-white font-bold text-xl sm:text-2xl">HYT</span>';
                }}
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-navy-600 to-orange-500 bg-clip-text text-transparent">HYT Global Institute</h1>
          </div>

          {/* Form Header */}
          <div className="text-center mb-6 sm:mb-8 animate-slide-up animation-delay-100ms">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">Welcome Back</h2>
            <p className="text-sm sm:text-base text-gray-500">Sign in to continue your learning journey</p>
          </div>

          {/* Form Container */}
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 shadow-lg animate-fade-in animation-delay-250ms">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email Input */}
            <div className="relative group animate-slide-up animation-delay-300ms">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                  <Mail className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="input-field pl-10 sm:pl-12 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200 group-focus-within:bg-orange-50/50"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="relative group animate-slide-up animation-delay-400ms">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="input-field pl-10 sm:pl-12 pr-10 sm:pr-12 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200 group-focus-within:bg-orange-50/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 sm:w-5 h-4 sm:h-5" /> : <Eye className="w-4 sm:w-5 h-4 sm:h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end animate-slide-up animation-delay-500ms">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-xs sm:text-sm text-orange-500 hover:text-orange-600 font-semibold transition-all hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-2.5 sm:py-3 text-sm sm:text-base font-semibold disabled:opacity-70 disabled:cursor-not-allowed mt-6 sm:mt-8 animate-slide-up animation-delay-600ms hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 transform"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Email verification notice (shown after a blocked sign-in) */}
            {needsVerification && (
              <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/70 p-4 animate-fade-in">
                <p className="text-sm text-gray-700">
                  Your email isn't verified yet. Check your inbox (and spam) for the verification link,
                  then sign in.
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                  className="mt-2 text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResendingVerification ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}
          </form>
          </div>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-gray-600 animate-slide-up animation-delay-700ms">
            Don't have account?{' '}
            <Link 
              to="/signup" 
              className="text-orange-500 font-semibold hover:text-orange-600 transition-all duration-300 hover:underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForgotPasswordModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
                <button
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="input-field"
                    required
                    disabled={isResettingPassword}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="flex-1 px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                    disabled={isResettingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="flex-1 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isResettingPassword ? 'Sending...' : 'Send Reset Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;
