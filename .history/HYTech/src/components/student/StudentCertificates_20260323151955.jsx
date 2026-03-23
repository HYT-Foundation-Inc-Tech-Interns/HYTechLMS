import React, { useState } from 'react';
import { 
  Award,
  Download,
  Eye,
  BookOpen,
  X
} from 'lucide-react';

const StudentCertificates = () => {
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  const earnedCertificates = [
    {
      id: 1,
      course: 'Barista NCII',
      dateIssued: 'Dec 15, 2025',
      finalGrade: 'A',
      credentialId: 'CERT-2025-001',
      recipientName: 'Gerald Andrei Lat'
    },
    {
      id: 2,
      course: 'Visual Graphics Design',
      dateIssued: 'Nov 20, 2025',
      finalGrade: 'A-',
      credentialId: 'CERT-2025-002',
      recipientName: 'Gerald Andrei Lat'
    }
  ];

  const inProgressCourses = [
    {
      id: 1,
      course: 'Plumbing NCIII',
      estCompletion: 'Feb 2026',
      progress: 88
    }
  ];

  const handleDownload = (certificate) => {
    setShowDownloadToast(true);
    setTimeout(() => setShowDownloadToast(false), 4000);
  };

  const handleView = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Download Toast */}
      {showDownloadToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 flex items-center gap-4 animate-slide-down">
          <div>
            <p className="font-semibold text-gray-900">Download complete.</p>
            <p className="text-sm text-gray-500">Barista NCII - COC.pdf (5mb)</p>
          </div>
          <button 
            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Open
          </button>
        </div>
      )}

      {/* Earned Certificates Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-orange-500" />
          <h2 className="font-bold text-gray-900 uppercase text-sm">Earned Certificates</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {earnedCertificates.map((cert) => (
            <div 
              key={cert.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Certificate Preview Header */}
              <div className="bg-gradient-to-r from-[#3b5998] to-[#5b7bb5] p-6 text-center">
                <Award className="w-12 h-12 text-white mx-auto mb-2" />
                <h3 className="text-white font-bold">Certificate of Completion</h3>
              </div>

              {/* Certificate Info */}
              <div className="p-5 space-y-3">
                <h4 className="font-bold text-gray-900 text-lg">{cert.course}</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Date Issued</span>
                    <span className="font-medium text-gray-900">{cert.dateIssued}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Final Grade</span>
                    <span className="font-medium text-gray-900">{cert.finalGrade}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Credential ID</span>
                    <span className="font-medium text-gray-900">{cert.credentialId}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-3">
                  <button 
                    onClick={() => handleDownload(cert)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button 
                    onClick={() => handleView(cert)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50:bg-gray-700 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* In Progress Section */}
      <div>
        <h2 className="font-bold text-gray-900 mb-4">In Progress</h2>
        
        <div className="space-y-3">
          {inProgressCourses.map((course) => (
            <div 
              key={course.id}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{course.course}</h3>
                  <p className="text-sm text-gray-500">Est. completion: {course.estCompletion}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Progress</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-orange-600">{course.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificate View Modal */}
      {showCertificateModal && selectedCertificate && (
        <div className="fixed inset-0 z-[100] overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCertificateModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
          <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl animate-slide-up overflow-hidden">
            {/* Close Button */}
            <button 
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Certificate Design */}
            <div className="p-8 bg-white">
              <div className="relative border-[5px] border-[#1e3a8a] p-3">
                {/* Inner Border */}
                <div className="border-[1.5px] border-[#1e3a8a] px-8 py-10">
                  
                  {/* Corner Decorations - Top Left */}
                  <div className="absolute top-5 left-5 w-6 h-6 border-l-[3px] border-t-[3px] border-[#1e3a8a]" />
                  
                  {/* Corner Decorations - Top Right */}
                  <div className="absolute top-5 right-5 w-6 h-6 border-r-[3px] border-t-[3px] border-[#1e3a8a]" />
                  
                  {/* Corner Decorations - Bottom Left */}
                  <div className="absolute bottom-5 left-5 w-6 h-6 border-l-[3px] border-b-[3px] border-[#1e3a8a]" />
                  
                  {/* Corner Decorations - Bottom Right */}
                  <div className="absolute bottom-5 right-5 w-6 h-6 border-r-[3px] border-b-[3px] border-[#1e3a8a]" />

                  {/* Side Diamonds */}
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#1e3a8a] rotate-45" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#1e3a8a] rotate-45" />

                  {/* Certificate Content */}
                  <div className="flex flex-col items-center text-center">
                    {/* TESDA Logo */}
                    <div className="mb-3">
                      <svg width="60" height="60" viewBox="0 0 100 100" className="text-[#1e3a8a]">
                        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="3"/>
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
                          <rect key={i} x="47" y="8" width="6" height="8" fill="currentColor" transform={`rotate(${angle} 50 50)`}/>
                        ))}
                        <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="50" cy="38" r="8" fill="currentColor"/>
                        <path d="M 35 72 L 35 55 Q 50 45 65 55 L 65 72 L 50 62 Z" fill="currentColor"/>
                      </svg>
                      <p className="text-[#1e3a8a] font-bold text-xs tracking-[0.2em]">TESDA</p>
                    </div>

                    {/* Certificate Title */}
                    <h1 className="text-[#1e3a8a] text-3xl font-black tracking-wide mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                      CERTIFICATE OF
                    </h1>
                    <h1 className="text-[#1e3a8a] text-3xl font-black tracking-wide mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                      COMPLETION
                    </h1>

                    {/* This is to certify that */}
                    <p className="text-gray-500 text-sm mb-1">This is to certify that</p>

                    {/* Recipient Name */}
                    <div className="relative mb-1">
                      <h2 className="text-[#1e3a8a] text-4xl" style={{ fontFamily: "'Pinyon Script', cursive" }}>
                        {selectedCertificate.recipientName}
                      </h2>
                      <svg className="w-full h-3 mt-1" viewBox="0 0 200 10" preserveAspectRatio="none">
                        <path d="M 0 5 Q 50 0 100 5 Q 150 10 200 5" fill="none" stroke="#1e3a8a" strokeWidth="0.5" opacity="0.6"/>
                      </svg>
                    </div>

                    {/* Has completed the course */}
                    <p className="text-gray-500 text-sm mt-3 mb-1">Has completed the course</p>

                    {/* Course Name */}
                    <h3 className="text-[#1e3a8a] text-xl font-bold">{selectedCertificate.course}</h3>

                    {/* Bottom Info */}
                    <div className="w-full flex justify-between mt-8 px-4">
                      <div className="text-left">
                        <p className="text-gray-400 text-[10px] uppercase tracking-wider">Date Issued</p>
                        <p className="font-semibold text-gray-800 text-sm">{selectedCertificate.dateIssued}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-[10px] uppercase tracking-wider">Credential ID</p>
                        <p className="font-semibold text-gray-800 text-sm">{selectedCertificate.credentialId}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowCertificateModal(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => handleDownload(selectedCertificate)}
                className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCertificates;
