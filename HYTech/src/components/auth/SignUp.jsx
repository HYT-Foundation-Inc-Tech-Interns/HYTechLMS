import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  setPersistence,
  updateProfile,
} from 'firebase/auth';
import { auth, firebaseInitError } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { useAppSettings } from '../../context/useAppSettings';
import {
  createRegisteredUserProfile,
  generateNextIdNumber,
  logActivity,
} from '../../utils/firestoreService';
import { normalizePhMobile, isValidPhMobile, toStoredPhMobile } from '../../utils/phone';
import { buildFullName, normalizeNameFields } from '../../utils/nameFormat';

const SignUp = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { appSettings } = useAppSettings();
  const allowSelfRegistration = appSettings.access.allowSelfRegistration !== false;
  const minPasswordLength = Number(appSettings.access.minPasswordLength) || 8;
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nameExtension: '',
    birthDate: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const clearForm = () => {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      nameExtension: '',
      birthDate: '',
      email: '',
      phone: '',
      password: '',
    });
    setCurrentStep(1);
    addToast('Form cleared successfully!', 'success');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: normalizePhMobile(value) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextStep = () => {
    // Validate Step 1
    if (!formData.firstName.trim()) {
      addToast('Please enter your first name.', 'error');
      return;
    }
    if (!formData.lastName.trim()) {
      addToast('Please enter your last name.', 'error');
      return;
    }
    if (!formData.birthDate) {
      addToast('Please enter your birth date.', 'error');
      return;
    }
    const birth = new Date(`${formData.birthDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(birth.getTime()) || birth > today) {
      addToast('Birth date cannot be in the future.', 'error');
      return;
    }
    if (birth.getFullYear() < 1920) {
      addToast('Please enter a valid birth date.', 'error');
      return;
    }
    // Move to step 2
    setCurrentStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If on step 1, move to step 2
    if (currentStep === 1) {
      handleNextStep();
      return;
    }

    setIsLoading(true);
    let credential = null;
    let profileSaved = false;

    try {
      if (!auth) {
        addToast(firebaseInitError || 'Firebase is not configured correctly.', 'error');
        return;
      }

      if (!allowSelfRegistration) {
        addToast('Self-registration is currently disabled. Please contact an administrator.', 'error');
        return;
      }

      if (!formData.email.trim()) {
        addToast('Please enter your email address.', 'error');
        return;
      }
      if (!isValidPhMobile(formData.phone)) {
        addToast('Enter a valid mobile number: 10 digits starting with 9 (e.g. 9XX XXX XXXX).', 'error');
        return;
      }
      if (formData.password.length < minPasswordLength) {
        addToast(`Password must be at least ${minPasswordLength} characters.`, 'error');
        return;
      }

      const normalizedName = normalizeNameFields(formData);
      const fullName = buildFullName(normalizedName);
      const normalizedEmail = formData.email.trim().toLowerCase();

      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      credential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        formData.password
      );
      await updateProfile(credential.user, { displayName: fullName });

      // Public profile (name/email) on the users doc. Sensitive PII (phone,
      // birth date) goes to the private subcollection so it is not exposed by
      // the org-wide users read. All required records are committed together.
      const idNumber = await generateNextIdNumber();
      await createRegisteredUserProfile(
        credential.user.uid,
        {
          email: normalizedEmail,
          displayName: fullName,
          name: fullName,
          idNumber,
          firstName: normalizedName.firstName,
          middleName: normalizedName.middleName,
          lastName: normalizedName.lastName,
          nameExtension: normalizedName.nameExtension,
        },
        {
          phone: toStoredPhMobile(formData.phone),
          birthDate: formData.birthDate,
        }
      );
      profileSaved = true;

      let emailSent = true;
      try {
        await sendEmailVerification(credential.user);
      } catch (verifyErr) {
        emailSent = false;
        console.warn('Could not send verification email:', verifyErr?.message);
      }

      logActivity(credential.user.uid, 'user_signup', 'users', credential.user.uid, {
        email: normalizedEmail,
      });

      // Keep the (unverified) session so the verify page can resend without
      // asking for the password again. Protected routes still block it.
      addToast(
        emailSent
          ? `Account created! We sent a verification link to ${normalizedEmail}.`
          : `Account created, but we couldn't send the verification email automatically. You can resend it on the next screen.`,
        emailSent ? 'success' : 'warning'
      );
      navigate('/verify-email', { state: { email: normalizedEmail, emailSent } });
    } catch (error) {
      // Roll back a brand-new Auth account when its required profile bundle
      // could not be persisted, allowing a clean retry with the same email.
      if (credential?.user && !profileSaved) {
        try {
          await deleteUser(credential.user);
        } catch (rollbackError) {
          console.error('Could not roll back incomplete signup:', rollbackError);
        }
      }

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
        'permission-denied': 'Your account details could not be saved. Please contact an administrator.',
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

  if (!allowSelfRegistration) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration is disabled</h1>
          <p className="text-gray-600 mb-6">
            New self-registration is currently turned off. Please contact an administrator to have an account created for you.
          </p>
          <Link
            to="/signin"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex relative overflow-hidden">
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
              Welcome to
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
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">Getting Started</h2>
            <p className="text-sm sm:text-base text-gray-500">Create your account to access HYTech</p>
          </div>

          {/* Progress Indicator */}
          <div className="animate-slide-up animation-delay-200ms">
            <div className="flex justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600">Step {currentStep} of 2</span>
              <span className="text-xs sm:text-sm font-medium text-orange-500">{currentStep === 1 ? 'Personal Info' : 'Account Details'}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-sm mb-2">
              <div className={`h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700 ease-out shadow-lg ${currentStep === 1 ? 'w-1/2' : 'w-full'}`} />
            </div>
            <div className="flex justify-end mb-2 mb-2 sm:mb-3 text-right animate-slide-up animation-delay-250ms">
              <button
                type="button"
                onClick={clearForm}
                className="text-xs sm:text-sm text-gray-500 hover:text-orange-500 transition-colors font-medium underline underline-offset-2"
                title="Clear form and start over"
              >
                Clear Form
              </button>
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 shadow-lg animate-fade-in animation-delay-300ms">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

            {/* STEP 1: Name Inputs */}
            {currentStep === 1 && (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-slide-up animation-delay-300ms">
              <div className="group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none z-10">
                    <User className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className="input-field pl-10 sm:pl-12 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200 group-focus-within:bg-orange-50/50"
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                  Middle Name
                </label>
                <div className="relative">
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none z-10">
                    <User className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    placeholder="Enter middle name"
                    className="input-field pl-10 sm:pl-12 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200 group-focus-within:bg-orange-50/50"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none z-10">
                    <User className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className="input-field pl-10 sm:pl-12 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200 group-focus-within:bg-orange-50/50"
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                  Extension
                </label>
                <div className="relative">
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none z-10">
                    <User className="w-4 sm:w-5 h-4 sm:h-5" />
                  </div>
                  <input
                    type="text"
                    name="nameExtension"
                    value={formData.nameExtension}
                    onChange={handleChange}
                    placeholder="Jr., Sr., III..."
                    className="input-field pl-10 sm:pl-12 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200 group-focus-within:bg-orange-50/50"
                  />
                </div>
              </div>

              <div className="group">
                <label htmlFor="signup-birth-date" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                  Birth Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-birth-date"
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  min="1920-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  className="input-field text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200"
                  required
                />
              </div>
            </div>
            </>
            )}

            {/* STEP 2: Email, Phone, Password Inputs */}
            {currentStep === 2 && (
            <>
            {/* Email Input */}
            <div className="group animate-slide-up animation-delay-300ms">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none z-10">
                  <Mail className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  className="input-field pl-10 sm:pl-12 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200 group-focus-within:bg-orange-50/50"
                  required
                />
              </div>
            </div>

            {/* Phone Input */}
            <div className="group animate-slide-up animation-delay-400ms">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none z-10">
                  <Phone className="w-4 sm:w-5 h-4 sm:h-5" />
                  <span className="text-sm sm:text-base font-medium text-gray-600">+63</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9XX XXX XXXX"
                  maxLength={10}
                  className="input-field pl-16 sm:pl-20 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200 group-focus-within:bg-orange-50/50"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] sm:text-xs text-gray-400">
                Enter your 10-digit number starting with 9. You can also paste 09XX XXX XXXX — we'll format it.
              </p>
            </div>

            {/* Password Input */}
            <div className="group animate-slide-up animation-delay-500ms">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 group-focus-within:text-orange-500 transition-colors">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none z-10">
                  <Lock className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="input-field pl-10 sm:pl-12 pr-10 sm:pr-12 text-sm sm:text-base focus:ring-2 focus:ring-orange-400 focus:scale-105 transition-transform duration-200"
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
            </>
            )}

            {/* Action Buttons */}
            <div className={`flex gap-3 mt-6 sm:mt-8 animate-slide-up ${currentStep === 1 ? 'animation-delay-700ms' : 'animation-delay-600ms'}`}>
              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 px-4 py-2.5 sm:py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-all duration-300 border border-gray-300 hover:border-gray-400"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className={`${currentStep === 2 ? 'flex-1' : 'w-full'} btn-primary py-2.5 sm:py-3 text-sm sm:text-base font-semibold disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 transform`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{currentStep === 1 ? 'Processing...' : 'Creating Account...'}</span>
                  </div>
                ) : (
                  currentStep === 1 ? 'Next' : 'Sign Up'
                )}
              </button>
            </div>
          </form>
          </div>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-gray-600 animate-slide-up animation-delay-800ms">
            Already have an account?{' '}
            <Link 
              to="/signin" 
              className="touch-target -mx-3 px-3 text-orange-700 font-semibold hover:text-orange-800 transition-all duration-300 hover:underline underline-offset-4"
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
