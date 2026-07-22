import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Loader, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  createIncidentForm,
  getIncidentForms,
  updateIncidentStatus,
  toDate,
} from '../../utils/firestoreService';

const TYPES = ['Behavioral', 'Safety', 'Attendance', 'Property', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['open', 'reviewed', 'resolved'];

const SEVERITY_CLS = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-700',
};
const STATUS_CLS = {
  open: 'bg-orange-100 text-orange-700',
  reviewed: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

/**
 * Shared incident-forms view.
 * @param {'own'|'all'} scope  'own' = only the signed-in user's filings; 'all' = staff view.
 * @param {boolean} canManage  staff may change status.
 */
const IncidentForms = ({ scope = 'own', canManage = false }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [forms, setForms] = useState(null); // null = loading
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    type: 'Behavioral',
    severity: 'Low',
    date: new Date().toISOString().slice(0, 10),
    involvedStudentName: '',
    description: '',
  });

  const load = async () => {
    if (!user?.uid) return;
    try {
      const data =
        scope === 'own'
          ? await getIncidentForms({ filedBy: user.uid })
          : await getIncidentForms({});
      setForms(data || []);
    } catch (error) {
      console.error('Error loading incident forms:', error);
      setForms([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, scope]);

  const handleFile = async () => {
    if (!draft.description.trim()) {
      addToast('Please describe the incident.', 'error');
      return;
    }
    setSaving(true);
    try {
      await createIncidentForm({
        filedByName: user.displayName || user.name || user.email || 'User',
        filedByRole: user.role || '',
        involvedStudentName: draft.involvedStudentName.trim(),
        date: draft.date,
        type: draft.type,
        severity: draft.severity,
        description: draft.description.trim(),
      });
      addToast('Incident report filed.', 'success');
      setShowModal(false);
      setDraft({ type: 'Behavioral', severity: 'Low', date: new Date().toISOString().slice(0, 10), involvedStudentName: '', description: '' });
      await load();
    } catch (error) {
      addToast(error.message || 'Unable to file incident.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (form, status) => {
    try {
      await updateIncidentStatus(form.id, status, user?.uid || '');
      await load();
    } catch {
      addToast('Unable to update status.', 'error');
    }
  };

  if (forms === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="w-8 h-8 text-[#0B005C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Incident Forms</h2>
          <p className="text-sm text-gray-500">
            {scope === 'own' ? 'Reports you have filed.' : 'All incident reports filed by trainees and trainors.'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#0B005C] text-white rounded-xl text-sm font-medium hover:bg-[#1a0f7a] transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          File incident
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No incident reports</p>
          <p className="text-sm text-gray-400 mt-1">Filed reports will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => {
            const when = toDate(form.createdAt);
            return (
              <div key={form.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{form.type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_CLS[form.severity] || SEVERITY_CLS.Low}`}>{form.severity}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_CLS[form.status] || STATUS_CLS.open}`}>{form.status}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{form.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Filed by {form.filedByName || 'Unknown'}{form.filedByRole ? ` (${form.filedByRole})` : ''}
                      {form.involvedStudentName ? ` · involves ${form.involvedStudentName}` : ''}
                      {when ? ` · ${when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatus(form, st)}
                        disabled={form.status === st}
                        className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                          form.status === st ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* File incident modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">File an incident report</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C]">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C]">
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={draft.date} max={new Date().toISOString().split('T')[0]} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trainee involved (optional)</label>
                  <input type="text" value={draft.involvedStudentName} onChange={(e) => setDraft({ ...draft, involvedStudentName: e.target.value })} placeholder="Name" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What happened?" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors">Cancel</button>
              <button onClick={handleFile} disabled={saving} className="px-5 py-2.5 bg-[#0B005C] text-white rounded-xl font-medium hover:bg-[#1a0f7a] transition-colors disabled:opacity-50">
                {saving ? 'Filing...' : 'File report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentForms;
