import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseInitError } from '../../firebase';
import { useToast } from '../../context/ToastContext';

const SignUp = () => {
  const SIGN_UP_DRAFT_KEY = 'hyt:signup:draft';
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      const saved = localStorage.getItem(SIGN_UP_DRAFT_KEY);
      return saved ? Boolean(JSON.parse(saved)?.rememberMe) : false;
    } catch {
      return false;
    }
  });
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(SIGN_UP_DRAFT_KEY);
      if (!saved) {
        return {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
        };
      }
      const parsed = JSON.parse(saved);
      return {
        firstName: parsed?.firstName || '',
        lastName: parsed?.lastName || '',
        email: parsed?.email || '',
        phone: parsed?.phone || '',
        password: '',
      };
    } catch {
      return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
      };
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      SIGN_UP_DRAFT_KEY,
      JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        rememberMe,
      })
    );
  }, [formData, rememberMe]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!auth || !db) {
        addToast(firebaseInitError || 'Firebase is not configured correctly.', 'error');
        return;
      }

      if (formData.password.length < 8) {
        addToast('Password must be at least 8 characters.', 'error');
        return;
      }

      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const credential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: 'student',
        status: 'Active',
        createdAt: serverTimestamp(),
      });

      addToast('Student account created successfully. You can now sign in.', 'success');
      localStorage.removeItem(SIGN_UP_DRAFT_KEY);
      navigate('/signin');
    } catch (error) {
      const errorMessages = {
        'auth/invalid-api-key': 'Invalid Firebase API key. Check your VITE_FIREBASE_API_KEY value.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Please choose a stronger password.',
        'auth/operation-not-allowed': 'Email/password signup is disabled. Enable it in Firebase Authentication > Sign-in method.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/unauthorized-domain': 'This domain is not authorized in Firebase Auth settings.',
        'auth/admin-restricted-operation': 'Signup is restricted by project settings.',
      };

      const fallbackMessage = error?.code
        ? `Unable to create account (${error.code}).`
        : 'Unable to create account. Please try again.';
      const message = errorMessages[error?.code] || fallbackMessage;
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
          <div className="mb-10 animate-fade-in">
            <div className="w-56 h-56 mx-auto mb-6 relative">
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md animate-fade-in">
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
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Getting Started</h2>
            <p className="text-gray-500">Create account to continue!</p>
            <p className="text-xs text-gray-500 mt-2">
              Public sign up is for student accounts only. Admin and trainer accounts are managed in User Management.
            </p>
          </div>

          <div className="mb-6" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </p>

            {/* Name Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            {/* Phone Input */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone"
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
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
            </div>

            {/* Remember Me */}
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
                <span className="text-sm text-gray-600">Remember me next time</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-gray-600">
            Already have an account?{' '}
            <Link 
              to="/signin" 
              className="text-orange-500 font-semibold hover:text-orange-600 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
