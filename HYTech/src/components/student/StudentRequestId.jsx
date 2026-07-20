import React, { useEffect, useState } from 'react';
import { CreditCard, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  createIdRequest,
  getIdRequests,
  getStudentEnrollments,
  toDate,
} from '../../utils/firestoreService';

const TYPES = ['New', 'Lost', 'Replacement'];

const STATUS_STYLE = {
  pending: { label: 'Pending trainer approval', cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved — being produced', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  completed: { label: 'Ready', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700', icon: XCircle },
};

const StudentRequestId = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [enrollment, setEnrollment] = useState(null);
  const [requests, setRequests] = useState(null); // null = loading
  const [type, setType] = useState('New');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    try {
      const [enrollments, myRequests] = await Promise.all([
        getStudentEnrollments(user.uid),
        getIdRequests({ studentId: user.uid }),
      ]);
      const active = (enrollments || []).find(
        (e) => e.status === 'active' || e.status === 'ongoing'
      );
      setEnrollment(active || null);
      setRequests(myRequests || []);
    } catch (error) {
      console.error('Error loading ID requests:', error);
      setRequests([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const hasOpenRequest = (requests || []).some(
    (r) => r.status === 'pending' || r.status === 'approved'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!enrollment?.trainerId) {
      addToast('You need to be in a class before requesting an ID.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createIdRequest(user.uid, {
        studentName: user.displayName || user.name || user.email || 'Student',
        studentEmail: user.email || '',
        classId: enrollment.classId,
        className: enrollment.className,
        trainerId: enrollment.trainerId,
        type,
        notes: notes.trim(),
      });
      addToast('ID request submitted to your trainer.', 'success');
      setNotes('');
      setType('New');
      await load();
    } catch (error) {
      addToast(error.message || 'Unable to submit request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (requests === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="w-8 h-8 text-[#0B005C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Request form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Request an ID</h2>
            <p className="text-sm text-gray-500">Your trainer reviews the request, then it's sent for production.</p>
          </div>
        </div>

        {!enrollment ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            You need to join a class before you can request an ID.
          </div>
        ) : hasOpenRequest ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            You already have an ID request in progress. Track its status below.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm text-gray-600">
              Requesting as <span className="font-medium">{user?.displayName || user?.email}</span> — {enrollment.className}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] focus:border-transparent"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the trainer should know..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] focus:border-transparent resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#0B005C] text-white font-medium hover:bg-[#1a0f7a] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit request'}
            </button>
          </form>
        )}
      </div>

      {/* My requests */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">My requests</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-400">You haven't requested an ID yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const s = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
              const StatusIcon = s.icon;
              const when = toDate(r.requestedAt);
              return (
                <div key={r.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{r.type} ID</p>
                    <p className="text-xs text-gray-500">
                      {when ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      {r.status === 'rejected' && r.rejectionReason ? ` · ${r.rejectionReason}` : ''}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${s.cls}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentRequestId;
