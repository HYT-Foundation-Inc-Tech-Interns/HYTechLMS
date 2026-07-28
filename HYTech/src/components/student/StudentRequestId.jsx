import React, { useEffect, useState } from 'react';
import { CreditCard, Clock, CheckCircle, XCircle, Loader, Upload, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { uploadIdPhoto } from '../../utils/avatarStorage';
import {
  createIdRequest,
  getIdRequests,
  getStudentEnrollments,
  getUserProfile,
  getUserPrivateProfile,
  toDate,
} from '../../utils/firestoreService';

const TYPES = ['New', 'Lost', 'Replacement'];

const STATUS_STYLE = {
  pending: { label: 'Pending admin review', cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved — being produced', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  completed: { label: 'Ready', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700', icon: XCircle },
};

const EMPTY_DETAILS = {
  fullName: '',
  birthDate: '',
  address: '',
  phone: '',
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: '',
};

const StudentRequestId = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [enrollment, setEnrollment] = useState(null);
  const [requests, setRequests] = useState(null); // null = loading
  const [type, setType] = useState('New');
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState(EMPTY_DETAILS);
  // Photo defaults to the profile avatar; a replacement is only uploaded on submit.
  const [profilePhoto, setProfilePhoto] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    try {
      const [enrollments, myRequests, profile, privateProfile] = await Promise.all([
        getStudentEnrollments(user.uid),
        getIdRequests({ studentId: user.uid }),
        getUserProfile(user.uid).catch(() => null),
        getUserPrivateProfile(user.uid),
      ]);
      const active = (enrollments || []).find(
        (e) => e.status === 'active' || e.status === 'ongoing'
      );
      setEnrollment(active || null);
      setRequests(myRequests || []);

      // Prefill from the trainee's own profile. Names and avatar live on the
      // users document; phone/address/birthDate in the private subcollection.
      const avatar = profile?.avatarUrl || profile?.avatarBase64 || '';
      setProfilePhoto(avatar);
      setPhotoPreview(avatar);
      setDetails({
        fullName: profile?.name || profile?.displayName || user.displayName || '',
        birthDate: privateProfile?.birthDate || '',
        address: privateProfile?.address || '',
        phone: privateProfile?.phone || '',
        emergencyName: privateProfile?.emergencyName || '',
        emergencyRelation: privateProfile?.emergencyRelation || '',
        emergencyPhone: privateProfile?.emergencyPhone || '',
      });
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

  const setDetail = (key, value) => setDetails((prev) => ({ ...prev, [key]: value }));

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      addToast('Please choose an image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Photos must be 5 MB or smaller.', 'error');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const useProfilePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(profilePhoto);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!enrollment?.trainerId) {
      addToast('You need to be in a class before requesting an ID.', 'error');
      return;
    }
    if (!photoFile && !profilePhoto) {
      addToast('Add a photo — upload one here or set a profile photo first.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      // Only upload when the trainee actually picked a new file; otherwise the
      // existing profile photo URL is reused as-is.
      const photoUrl = photoFile ? (await uploadIdPhoto(photoFile)).url : profilePhoto;

      await createIdRequest(user.uid, {
        studentName: user.displayName || user.name || user.email || 'Trainee',
        studentEmail: user.email || '',
        classId: enrollment.classId,
        className: enrollment.className,
        trainerId: enrollment.trainerId,
        type,
        notes: notes.trim(),
        details: { ...details, photoUrl },
      });
      addToast('ID request submitted to the administrator.', 'success');
      setNotes('');
      setType('New');
      setPhotoFile(null);
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

  const inputCls =
    'w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] focus:border-transparent';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Request form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Request an ID</h2>
            <p className="text-sm text-gray-500">An administrator reviews the request, then sends it for production.</p>
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-sm text-gray-600">
              Requesting as <span className="font-medium">{user?.displayName || user?.email}</span> — {enrollment.className}
            </div>

            <p className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600">
              These details are filled in from your profile and get printed on your ID.
              Correct anything that is out of date — changes here apply to this request only.
            </p>

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ID photo *</label>
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {photoPreview ? (
                    <img src={photoPreview} alt="ID photo preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    {photoFile ? 'Choose a different photo' : 'Replace photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                  {photoFile ? (
                    <button
                      type="button"
                      onClick={useProfilePhoto}
                      className="block text-xs font-medium text-blue-600 hover:underline"
                    >
                      Use my profile photo instead
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {profilePhoto ? 'Using your profile photo.' : 'No profile photo set — upload one.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                <input
                  type="text"
                  value={details.fullName}
                  onChange={(e) => setDetail('fullName', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth date</label>
                <input
                  type="date"
                  value={details.birthDate}
                  onChange={(e) => setDetail('birthDate', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact number *</label>
                <input
                  type="tel"
                  value={details.phone}
                  onChange={(e) => setDetail('phone', e.target.value)}
                  placeholder="09XXXXXXXXX"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  value={details.address}
                  onChange={(e) => setDetail('address', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Emergency contact */}
            <fieldset className="rounded-xl border border-gray-100 p-4">
              <legend className="px-1 text-sm font-semibold text-gray-800">In case of emergency</legend>
              <p className="mb-3 text-xs text-gray-500">Who should be contacted if something happens to you.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact person *</label>
                  <input
                    type="text"
                    value={details.emergencyName}
                    onChange={(e) => setDetail('emergencyName', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relation to you *</label>
                  <input
                    type="text"
                    value={details.emergencyRelation}
                    onChange={(e) => setDetail('emergencyRelation', e.target.value)}
                    placeholder="Parent, spouse, sibling…"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Their contact number *</label>
                  <input
                    type="tel"
                    value={details.emergencyPhone}
                    onChange={(e) => setDetail('emergencyPhone', e.target.value)}
                    placeholder="09XXXXXXXXX"
                    className={inputCls}
                  />
                </div>
              </div>
            </fieldset>

            {/* Request meta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputCls}
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
                placeholder="Anything the administrator should know..."
                className={`${inputCls} resize-none`}
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
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
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
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.details?.photoUrl && (
                      <img
                        src={r.details.photoUrl}
                        alt=""
                        className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">{r.type} ID</p>
                      <p className="text-xs text-gray-500">
                        {when ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        {r.status === 'rejected' && r.rejectionReason ? ` · ${r.rejectionReason}` : ''}
                      </p>
                    </div>
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
