import { useState, useEffect } from 'react'
import heroBackground from '../../assets/HYT Global Institute Website Centralized Files-20260504T022615Z-3-001/HYT Global Institute Website Centralized Files/Contact Us/Background.jpg'
import hytLogo from '../../assets/HYT Global Institute Website Centralized Files-20260504T022615Z-3-001/HYT Global Institute Website Centralized Files/Logo and Partner Companies Logos/HYT.png'

export default function Hero() {
  return (
    <section
      id="home"
      className="relative bg-blue-900 text-white py-32 -mt-20 min-h-screen flex items-center"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.72)), url(${heroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="container mx-auto px-4 md:ml-8 lg:ml-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-full lg:w-1/2">
            <div className="max-w-2xl">
          {/* TESDA Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-800/50 backdrop-blur px-4 py-2 rounded-full mb-8 border border-blue-400/30">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <span className="font-medium">TESDA-Accredited Training Institution</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Your Pathway to
            <span className="block text-amber-400 mt-2">Global Excellence</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl leading-relaxed">
            Opening doors to brighter futures by transforming individuals into industry-ready professionals, leaders, and changemakers.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => document.getElementById('courses').scrollIntoView({ behavior: 'smooth' })} className="px-8 py-3 bg-amber-500 text-white font-semibold rounded-full hover:bg-amber-600 transition flex items-center justify-center gap-2">
              <span>Explore Courses</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button onClick={() => document.getElementById('admissions').scrollIntoView({ behavior: 'smooth' })} className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-blue-900 transition">
              Apply Now
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 mt-12 sm:mt-16 md:mt-20 pt-8 sm:pt-10 md:pt-12 border-t border-white">
            <div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-400 mb-2">20+</div>
              <p className="text-gray-300 font-medium text-sm sm:text-base">Programs</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-400 mb-2">95%</div>
              <p className="text-gray-300 font-medium text-sm sm:text-base">Cert. Pass Rate</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-400 mb-2">10+</div>
              <p className="text-gray-300 font-medium text-sm sm:text-base">Global Partners</p>
            </div>
            </div>
          </div>
        </div>

          {/* Slideshow - visible on large screens */}
          <div className="hidden lg:flex lg:w-1/2 items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute inset-8 rounded-full bg-slate-950/35 blur-3xl"
              />
              <img
                src={hytLogo}
                alt="HYT Global Institute Inc."
                className="relative z-10 w-50 h-50 -translate-y-3 object-cover drop-shadow-[0_20px_30px_rgba(80,80,80,0.6)]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}