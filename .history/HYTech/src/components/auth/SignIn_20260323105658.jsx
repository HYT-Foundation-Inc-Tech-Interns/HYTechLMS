import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db, firebaseInitError } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { getHomePathForRole, resolveEffectiveRole } from '../../utils/authRole';

const INITIAL_STAFF_ACCOUNTS = [
  {
    email: 'admin@hytech.com',
    password: 'admin1234',
    role: 'admin',
    name: 'Initial Admin',
  },
  {
    email: 'trainer@hytech.com',
    password: 'trainer1234',
    role: 'trainer',
    name: 'Initial Trainer',
  },
];

const SignIn = () => {
  const SIGN_IN_DRAFT_KEY = 'hyt:signin:draft';
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
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

  const findInitialStaffMatch = (email, password) =>
    INITIAL_STAFF_ACCOUNTS.find(
      (account) => account.email === email.toLowerCase() && account.password === password
    );

  const ensureInitialStaffAccount = async (email, password) => {
    const initialAccount = findInitialStaffMatch(email, password);
    if (!initialAccount) {
      return null;
    }

    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    if (signInMethods.length > 0) {
      return null;
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      name: initialAccount.name,
      email,
      phone: '',
      role: initialAccount.role,
      status: 'Active',
      isDefaultAccount: true,
      createdAt: serverTimestamp(),
    });

    addToast(`${initialAccount.role === 'admin' ? 'Admin' : 'Trainer'} account initialized.`, 'info');
    return credential;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

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

      let credential;

      try {
        credential = await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          formData.password
        );
      } catch (error) {
        const createdCredential = await ensureInitialStaffAccount(
          normalizedEmail,
          formData.password
        );

        if (!createdCredential) {
          throw error;
        }

        credential = createdCredential;
      }

      const role = await resolveEffectiveRole({
        uid: credential.user.uid,
        email: credential.user.email || normalizedEmail,
        database: db,
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
    <div className="min-h-screen flex">
      {/* Left Side - Hero Section */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/Image3.jpg)',
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
            <div className="w-56 h-56 mx-auto mb-6 relative translate-y-1 ">
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
            <h1 className="text-4xl lg:text-6xl font-bold mb-4">
              Welcome to
            </h1>
            <h2 className="text-3xl lg:text-5xl font-bold text-orange-400">
              HYT Global Institute
            </h2>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-900/50 to-transparent" />
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white relative">
        {/* Decorative Illustration */}
        <div className="absolute top-8 right-8 w-64 h-64 opacity-20 hidden xl:block">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="80" fill="#f97316" opacity="0.1" />
            <circle cx="100" cy="100" r="60" fill="#1e2a4a" opacity="0.1" />
            <path d="M60,100 Q100,60 140,100 Q100,140 60,100" fill="none" stroke="#f97316" strokeWidth="2" opacity="0.3" />
          </svg>
        </div>

        <div className="w-full max-w-md animate-fade-in relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-navy-500 rounded-2xl flex items-center justify-center shadow-xl">
              <img 
                src="/images/hyt_logo.png" 
                alt="HYT Logo" 
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-white font-bold text-2xl">HYT</span>';
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-navy-500">HYT Global Institute</h1>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Sign in to your account to continue</p>
          </div>

          <div className="mb-6" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="input-field pl-12"
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="input-field pl-12 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded transition-all duration-200 ${
                    rememberMe ? 'bg-orange-500 border-orange-500' : 'border-gray-300 group-hover:border-orange-400'
                  }`}>
                    {rememberMe && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => addToast('Forgot password flow is not yet enabled.', 'info')}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-70 disabled:cursor-not-allowed mt-6"
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
          </form>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-gray-600">
            Don't have account?{' '}
            <Link 
              to="/signup" 
              className="text-orange-500 font-semibold hover:text-orange-600 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
};

export default SignIn;
