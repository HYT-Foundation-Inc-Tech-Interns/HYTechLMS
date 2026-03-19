import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen max-w-[1920px] max-h-[1080px] mx-auto overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/landing_page.png')" }}
      />
      
      {/* Fallback background color if image doesn't load */}
      <div className="absolute inset-0 bg-[#1a1f4e] -z-10" />

      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center">
        {/* Left Content */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 max-w-[55%]">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <div className="w-40 h-40 lg:w-48 lg:h-48">
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
          <div className="animate-slide-up max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold text-white leading-[1.15] mb-6">
              Building Skills for a<br />
              Better Tomorrow
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl text-gray-300/90 leading-relaxed mb-10 max-w-xl">
              HYTech is a centralized learning management system designed to 
              support structured training programs, simplify course management, and 
              enhance collaboration between administrators, instructors, and 
              students.
            </p>

            {/* CTA Button */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex w-44 items-center justify-center bg-orange-500 text-white px-8 py-4 rounded-lg font-semibold text-lg
                           transition-all duration-200 hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-md
                           active:translate-y-0"
              >
                Get Started
              </button>
              <button
                onClick={() => navigate('/signin')}
                className="text-white/80 hover:text-white font-medium transition-colors underline-offset-4 hover:underline"
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
