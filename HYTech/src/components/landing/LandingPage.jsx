import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen h-[100dvh] w-full relative bg-[#0f1438] overflow-hidden">
      {/* Fallback background color if image doesn't load */}
      <div className="absolute inset-0 bg-[#1a1f4e] -z-20" />

      {/* Animated background layers */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.28),transparent_28%),radial-gradient(circle_at_80%_25%,rgba(249,115,22,0.22),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.18),transparent_28%)]" />
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse-slow" />
        <div className="absolute top-24 right-10 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl animate-pulse-slow" />
      </div>

      {/* Background Image */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="landing-hero-image absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/landing_page.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1438]/92 via-[#0f1438]/78 to-[#0f1438]/52" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.08)_45%,transparent_60%)] animate-landing-shimmer" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-screen h-[100dvh] flex items-center justify-center lg:justify-start">
        {/* Left Content */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-10 lg:px-16 xl:px-24 py-8 sm:py-10 md:py-12 w-full lg:w-auto lg:max-w-[58%] overflow-y-auto lg:overflow-y-visible max-h-[100dvh] lg:max-h-none">
          {/* Logo */}
          <div className="mb-4 sm:mb-5 md:mb-6 animate-fade-in">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 landing-logo-glow">
              <img 
                src="/images/hyt_logo.png" 
                alt="HYT Global Institute Logo" 
                className="w-full h-full object-contain drop-shadow-2xl"
                onError={(e) => {
                  e.target.parentElement.innerHTML = `
                    <div class="w-full h-full flex flex-col items-center justify-center">
                      <div class="text-5xl font-bold text-white mb-2">HYT</div>
                      <div class="bg-yellow-500 px-4 py-1 rounded-full">
                        <span class="text-xs font-bold text-navy-900">GLOBAL INSTITUTE</span>
                      </div>
                    </div>
                  `;
                }}
              />
            </div>
          </div>

          {/* Hero Text */}
          <div className="animate-slide-up max-w-full lg:max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75 backdrop-blur-md mb-3 sm:mb-4">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="inline">International Standard Learning</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.05] mb-3 sm:mb-4 md:mb-5 max-w-full lg:max-w-[12ch]">
              Building Skills for a<br />
              Better Tomorrow
            </h1>
            
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-200/90 leading-relaxed mb-5 sm:mb-6 md:mb-7 max-w-full lg:max-w-xl">
              HYTech is a centralized learning management system designed to support structured training programs, simplify course management, and enhance collaboration between administrators, trainors, and trainees.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
              <button
                onClick={() => navigate('/signup')}
                className="w-full sm:w-40 inline-flex items-center justify-center bg-orange-500 text-white px-5 sm:px-7 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base
                           transition-all duration-300 hover:bg-orange-400 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-500/30
                           active:translate-y-0"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate('/signin')}
                className="text-white/80 hover:text-white font-medium transition-all underline-offset-4 hover:underline hover:tracking-wide text-xs sm:text-sm"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
