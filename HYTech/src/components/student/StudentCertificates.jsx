import React, { useState, useEffect } from 'react';
import { 
  Award,
  Download,
  Eye,
  BookOpen,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentEnrollments, toDate } from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';

// Format any Firestore timestamp / Date / string into a readable date, or a fallback.
const formatIssuedDate = (value, fallback = 'Date TBD') => {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Wrap text onto multiple centered lines within maxWidth; returns the next y.
const drawWrappedText = (ctx, text, centerX, y, maxWidth, lineHeight) => {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  lines.forEach((line, i) => ctx.fillText(line, centerX, y + i * lineHeight));
  return y + lines.length * lineHeight;
};

// Render the certificate to a canvas so it can be downloaded as a real image.
const renderCertificateCanvas = (cert) => {
  const W = 1200;
  const H = 850;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const navy = '#0B005C';
  const gray = '#4b5563';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Double border
  ctx.strokeStyle = navy;
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.lineWidth = 2;
  ctx.strokeRect(55, 55, W - 110, H - 110);

  ctx.textAlign = 'center';

  // Title
  ctx.fillStyle = navy;
  ctx.font = 'bold 66px Georgia, serif';
  ctx.fillText('Certificate', W / 2, 190);
  ctx.font = '600 30px Georgia, serif';
  ctx.fillText('of Completion', W / 2, 235);

  // Recipient
  ctx.fillStyle = gray;
  ctx.font = '22px Georgia, serif';
  ctx.fillText('This is to certify that', W / 2, 330);

  ctx.fillStyle = navy;
  ctx.font = 'bold 42px Georgia, serif';
  ctx.fillText(cert.recipientName, W / 2, 395);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 260, 415);
  ctx.lineTo(W / 2 + 260, 415);
  ctx.stroke();

  // Course
  ctx.fillStyle = gray;
  ctx.font = '22px Georgia, serif';
  ctx.fillText('has successfully completed the course', W / 2, 470);

  ctx.fillStyle = navy;
  ctx.font = 'bold 30px Georgia, serif';
  const afterCourse = drawWrappedText(ctx, cert.course, W / 2, 515, W - 320, 40);

  // Date
  ctx.fillStyle = gray;
  ctx.font = '20px Georgia, serif';
  ctx.fillText(`On ${cert.dateIssued}`, W / 2, Math.max(afterCourse + 20, 590));

  // Signature lines
  ctx.strokeStyle = navy;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 320, 700);
  ctx.lineTo(W / 2 - 120, 700);
  ctx.moveTo(W / 2 + 120, 700);
  ctx.lineTo(W / 2 + 320, 700);
  ctx.stroke();
  ctx.fillStyle = gray;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Authorized Signature', W / 2 - 220, 725);
  ctx.fillText('Date', W / 2 + 220, 725);

  // Credential ID
  ctx.fillStyle = '#6b7280';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(`Credential ID: ${cert.credentialId}`, W / 2, 775);

  return canvas;
};

const StudentCertificates = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [earnedCertificates, setEarnedCertificates] = useState([]);
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  // Load student enrollments
  useEffect(() => {
    if (user?.uid) {
      loadCertificates();
    }
  }, [user?.uid]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError(null);

      const enrollments = await getStudentEnrollments(user.uid);
      
      // Separate completed and in-progress
      const completed = enrollments.filter(e => e.status === 'completed');
      const inProgress = enrollments.filter(e => e.status === 'ongoing');

      const recipientName =
        user.displayName || user.name || 'Trainee';

      // Map to certificate format
      const certs = completed.map((enrollment) => ({
        id: enrollment.id,
        course: enrollment.courseName || 'Course',
        dateIssued: formatIssuedDate(enrollment.completedAt),
        finalGrade: enrollment.finalGrade || 'Pass',
        credentialId: enrollment.certificateId || `CERT-${enrollment.id.substring(0, 8).toUpperCase()}`,
        recipientName,
        enrollmentId: enrollment.id,
      }));

      setEarnedCertificates(certs);

      // Map in-progress courses
      const courses = inProgress.map((enrollment) => ({
        id: enrollment.id,
        course: enrollment.courseName || 'Course',
        estCompletion: formatIssuedDate(enrollment.expectedCompletionDate, 'TBD'),
        progress: enrollment.progress?.percentage || 0,
        enrollmentId: enrollment.id,
      }));

      setInProgressCourses(courses);
    } catch (err) {
      console.error('Error loading certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (certificate) => {
    try {
      const canvas = renderCertificateCanvas(certificate);
      const safeName = `${certificate.course}-${certificate.credentialId}`
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      canvas.toBlob((blob) => {
        if (!blob) {
          addToast('Could not generate the certificate image.', 'error');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${safeName}.png`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Certificate downloaded.', 'success');
      }, 'image/png');
    } catch (err) {
      console.error('Certificate download failed:', err);
      addToast('Failed to download the certificate.', 'error');
    }
  };

  const handleView = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 sm:p-6">
      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">{error}</p>
            <button 
              onClick={loadCertificates}
              className="text-sm text-red-700 underline hover:no-underline mt-1"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Earned Certificates Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-orange-500" />
          <h2 className="font-bold text-gray-900 uppercase text-sm">Earned Certificates ({earnedCertificates.length})</h2>
        </div>

        {earnedCertificates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No certificates earned yet. Complete courses to earn certificates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {earnedCertificates.map((cert) => (
              <div 
                key={cert.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Certificate Preview Header */}
                <div className="bg-gradient-to-r from-[#0B005C] to-[#1a1a7d] p-4 text-center sm:p-6">
                  <Award className="w-12 h-12 text-white mx-auto mb-2" />
                  <h3 className="text-white font-bold">Certificate of Completion</h3>
                </div>

                {/* Certificate Info */}
                <div className="p-5 space-y-3">
                  <h4 className="font-bold text-gray-900 text-lg line-clamp-2">{cert.course}</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Date Issued</span>
                      <span className="font-medium text-gray-900">{cert.dateIssued}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium text-green-700">Completed</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Credential ID</span>
                      <span className="font-medium text-gray-900 text-xs">{cert.credentialId}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-3">
                    <button 
                      onClick={() => handleDownload(cert)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B005C] text-white rounded-lg font-medium hover:bg-[#0B005C]/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button 
                      onClick={() => handleView(cert)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In Progress Section */}
      {inProgressCourses.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-4">In Progress ({inProgressCourses.length})</h2>
          
          <div className="space-y-3">
            {inProgressCourses.map((course) => (
              <div 
                key={course.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{course.course}</h3>
                    <p className="text-sm text-gray-500">Est. completion: {course.estCompletion}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-orange-600 w-10 text-right">{course.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && selectedCertificate && (
        <div className="fixed inset-0 z-[100] overflow-y-auto p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCertificateModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">
              {/* Close Button */}
              <button 
                onClick={() => setShowCertificateModal(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full z-10"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Certificate Design */}
              <div className="p-8 bg-white">
                <div className="relative border-[5px] border-[#0B005C] p-3">
                  {/* Inner Border */}
                  <div className="border-[1.5px] border-[#0B005C] px-8 py-10">
                    
                    {/* Corner Decorations */}
                    <div className="absolute top-5 left-5 w-6 h-6 border-l-[3px] border-t-[3px] border-[#0B005C]" />
                    <div className="absolute top-5 right-5 w-6 h-6 border-r-[3px] border-t-[3px] border-[#0B005C]" />
                    <div className="absolute bottom-5 left-5 w-6 h-6 border-l-[3px] border-b-[3px] border-[#0B005C]" />
                    <div className="absolute bottom-5 right-5 w-6 h-6 border-r-[3px] border-b-[3px] border-[#0B005C]" />

                    {/* Header */}
                    <div className="text-center mb-8 pt-4">
                      <div className="text-4xl font-bold text-[#0B005C]">Certificate</div>
                      <div className="text-xl text-[#0B005C] font-semibold">of Completion</div>
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-6">
                      <p className="text-gray-600">This is to certify that</p>
                      
                      <div>
                        <p className="text-2xl font-bold text-[#0B005C]">{selectedCertificate.recipientName}</p>
                        <div className="mt-2 border-b-2 border-[#0B005C]" />
                      </div>

                      <p className="text-gray-600">Has successfully completed the course</p>
                      
                      <div>
                        <p className="text-xl font-bold text-[#0B005C]">{selectedCertificate.course}</p>
                      </div>

                      <p className="text-gray-600 text-sm">On {selectedCertificate.dateIssued}</p>

                      <div className="flex justify-around mt-12 pt-4">
                        <div className="text-center">
                          <div className="border-t-2 border-[#0B005C] w-32" />
                          <p className="text-xs text-gray-600 mt-2">Authorized Signature</p>
                        </div>
                        <div className="text-center">
                          <div className="border-t-2 border-[#0B005C] w-32" />
                          <p className="text-xs text-gray-600 mt-2">Date</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 pt-4">Credential ID: {selectedCertificate.credentialId}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(selectedCertificate)}
                  className="px-4 py-2 bg-[#0B005C] text-white rounded-lg font-medium hover:bg-[#0B005C]/90 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
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
