import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Check, X, Loader, ImageOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getIdRequests,
  approveIdRequest,
  rejectIdRequest,
  completeIdRequest,
  toDate,
} from '../../utils/firestoreService';

const STATUS_CLS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// What gets printed on the card, in the order it is shown for review. Requests
// created before these fields existed simply have none of them.
const DETAIL_ROWS = [
  ['fullName', 'Full name'],
  ['birthDate', 'Birth date'],
  ['address', 'Address'],
  ['phone', 'Contact number'],
  ['emergencyName', 'Emergency contact'],
  ['emergencyRelation', 'Relation'],
  ['emergencyPhone', 'Emergency number'],
];

// Birth date is the one optional field, so it is not counted as incomplete.
const OPTIONAL_DETAILS = new Set(['birthDate']);

/**
 * Admin ID-request queue: admin approves/rejects pending requests directly and
 * marks approved ones as completed. (Trainors are not involved in ID approval.)
 */
const IdRequests = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState(null); // null = loading
  const [filter, setFilter] = useState('pending');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    if (!user?.uid) return;
    try {
      const data = await getIdRequests({});
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading ID requests:', error);
      setRequests([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const filters = ['pending', 'approved', 'completed', 'rejected', 'all'];

  const visible = useMemo(() => {
    const list = requests || [];
    return filter === 'all' ? list : list.filter((r) => r.status === filter);
  }, [requests, filter]);

  const doApprove = async (r) => {
    setBusyId(r.id);
    try {
      await approveIdRequest(r.id, user.uid);
      addToast('Request approved.', 'success');
      await load();
    } catch {
      addToast('Unable to approve.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (r) => {
    setBusyId(r.id);
    try {
      await rejectIdRequest(r.id, rejectReason.trim(), user.uid);
      addToast('Request rejected.', 'success');
      setRejectingId(null);
      setRejectReason('');
      await load();
    } catch {
      addToast('Unable to reject.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doComplete = async (r) => {
    setBusyId(r.id);
    try {
      await completeIdRequest(r.id, user.uid);
      addToast('Marked as completed.', 'success');
      await load();
    } catch {
      addToast('Unable to complete.', 'error');
    } finally {
      setBusyId(null);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">ID Requests</h2>
        <p className="text-sm text-gray-500">
          Review trainee ID requests: approve or reject, then mark completed once produced.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-[#0B005C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No {filter === 'all' ? '' : filter} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const when = toDate(r.requestedAt);
            const details = r.details || {};
            const hasDetails = Object.values(details).some(Boolean);
            const missingRequired = hasDetails
              ? DETAIL_ROWS
                .filter(([key]) => !OPTIONAL_DETAILS.has(key) && !details[key])
                .map(([, label]) => label.toLowerCase())
              : [];
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-4">
                  {/* The photo is the thing a human actually has to judge. */}
                  {details.photoUrl ? (
                    <a
                      href={details.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                      title="Open full size"
                    >
                      <img
                        src={details.photoUrl}
                        alt={`ID photo for ${r.studentName || r.studentId}`}
                        className="h-20 w-20 rounded-xl border border-gray-200 object-cover hover:opacity-90"
                      />
                    </a>
                  ) : (
                    <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
                      <ImageOff className="h-5 w-5 text-gray-300" />
                      <span className="mt-1 text-[10px] leading-tight text-gray-400">No photo</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{r.studentName || r.studentId}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{r.type} ID</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_CLS[r.status] || STATUS_CLS.pending}`}>{r.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.className || ''}{r.studentEmail ? ` · ${r.studentEmail}` : ''}
                      {when ? ` · ${when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </p>

                    {hasDetails ? (
                      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                        {DETAIL_ROWS.map(([key, label]) => (
                          <div key={key} className="flex gap-2">
                            <dt className="w-32 flex-shrink-0 text-xs text-gray-500">{label}</dt>
                            <dd className={`min-w-0 break-words ${details[key] ? 'text-gray-800' : 'text-amber-600 italic'}`}>
                              {details[key] || 'Not provided'}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                        Submitted before ID details were collected — contact the trainee for their
                        photo and printing details before approving.
                      </p>
                    )}

                    {missingRequired.length > 0 && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Incomplete: {missingRequired.join(', ')}. Reject the request and ask the
                        trainee to resubmit rather than printing a partial card.
                      </p>
                    )}

                    {r.notes && <p className="text-sm text-gray-700 mt-2">{r.notes}</p>}
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {r.rejectionReason}</p>
                    )}
                  </div>
                </div>

                {/* Approve / reject pending requests */}
                {r.status === 'pending' && (
                  rejectingId === r.id ? (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <textarea
                        rows={2}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">Cancel</button>
                        <button onClick={() => doReject(r)} disabled={busyId === r.id} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">Confirm reject</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 justify-end">
                      <button onClick={() => setRejectingId(r.id)} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-1">
                        <X className="w-4 h-4" /> Reject
                      </button>
                      <button onClick={() => doApprove(r)} disabled={busyId === r.id} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Approve
                      </button>
                    </div>
                  )
                )}

                {/* Mark approved requests completed (ID produced) */}
                {r.status === 'approved' && (
                  <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => doComplete(r)} disabled={busyId === r.id} className="px-3 py-1.5 bg-[#0B005C] text-white rounded-lg text-sm font-medium hover:bg-[#1a0f7a] disabled:opacity-50 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Mark completed
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IdRequests;
