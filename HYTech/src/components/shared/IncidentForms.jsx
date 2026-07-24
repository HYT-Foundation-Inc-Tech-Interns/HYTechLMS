import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Loader, X, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  createIncidentForm,
  getIncidentForms,
  updateIncidentStatus,
  updateIncidentForm,
  deleteIncidentForms,
  toDate,
} from '../../utils/firestoreService';

const TYPES = ['Behavioral', 'Safety', 'Attendance', 'Property', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['open', 'reviewed', 'resolved'];
const TABS = ['all', 'open', 'reviewed', 'resolved'];

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

const emptyDraft = () => ({
  type: 'Behavioral',
  severity: 'Low',
  date: new Date().toISOString().slice(0, 10),
  involvedStudentName: '',
  description: '',
});

/**
 * Shared incident-forms view.
 * @param {'own'|'all'} scope  'own' = only the signed-in user's filings; 'all' = staff view.
 * @param {boolean} canManage  staff may change status and edit reports.
 */
const IncidentForms = ({ scope = 'own', canManage = false }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const canDelete = canManage && user?.role === 'admin';
  const canEditReport = canManage && user?.role === 'admin';

  const [forms, setForms] = useState(null); // null = loading
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

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

  const counts = useMemo(() => {
    const c = { all: 0, open: 0, reviewed: 0, resolved: 0 };
    (forms || []).forEach((f) => {
      c.all += 1;
      if (c[f.status] !== undefined) c[f.status] += 1;
    });
    return c;
  }, [forms]);

  const visibleForms = useMemo(
    () => (forms || []).filter((f) => activeTab === 'all' || f.status === activeTab),
    [forms, activeTab]
  );

  // Drop selections that are no longer visible (e.g. after a tab switch or reload).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(visibleForms.map((f) => f.id));
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleForms]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setShowModal(true);
  };

  const openEdit = (form) => {
    setEditingId(form.id);
    setDraft({
      type: form.type || 'Behavioral',
      severity: form.severity || 'Low',
      date: form.date || new Date().toISOString().slice(0, 10),
      involvedStudentName: form.involvedStudentName || '',
      description: form.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!draft.description.trim()) {
      addToast('Please describe the incident.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateIncidentForm(editingId, {
          type: draft.type,
          severity: draft.severity,
          date: draft.date,
          involvedStudentName: draft.involvedStudentName.trim(),
          description: draft.description.trim(),
        });
        addToast('Incident report updated.', 'success');
      } else {
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
      }
      setShowModal(false);
      setEditingId(null);
      setDraft(emptyDraft());
      await load();
    } catch (error) {
      addToast(error.message || 'Unable to save incident.', 'error');
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

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visibleForms.length > 0 && visibleForms.every((f) => selected.has(f.id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allVisibleSelected) return new Set();
      return new Set(visibleForms.map((f) => f.id));
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} incident report${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteIncidentForms(ids);
      addToast(`Deleted ${ids.length} report${ids.length > 1 ? 's' : ''}.`, 'success');
      setSelected(new Set());
      await load();
    } catch (error) {
      addToast(error.message || 'Unable to delete reports.', 'error');
    } finally {
      setDeleting(false);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Incident Forms</h2>
          <p className="text-sm text-gray-500">
            {scope === 'own' ? 'Reports you have filed.' : 'All incident reports filed by trainees and trainors.'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#0B005C] text-white rounded-xl text-sm font-medium hover:bg-[#1a0f7a] transition-colors flex items-center justify-center gap-1 sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          File incident
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-[#0B005C] text-[#0B005C]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab}
            <span className="ml-1.5 text-xs text-gray-400">{counts[tab] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {canDelete && visibleForms.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-[#0B005C] focus:ring-[#0B005C]"
            />
            {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
          </label>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          )}
        </div>
      )}

      {visibleForms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No incident reports</p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'all' ? 'Filed reports will appear here.' : `No ${activeTab} reports.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleForms.map((form) => {
            const when = toDate(form.createdAt);
            const isSelected = selected.has(form.id);
            return (
              <div
                key={form.id}
                className={`bg-white rounded-xl border p-4 transition-colors ${
                  isSelected ? 'border-[#0B005C] ring-1 ring-[#0B005C]' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  {canDelete && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(form.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-[#0B005C] focus:ring-[#0B005C] shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
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
                  {canEditReport && (
                    <button
                      onClick={() => openEdit(form)}
                      className="p-2 text-gray-400 hover:text-[#0B005C] hover:bg-gray-50 rounded-lg transition-colors shrink-0"
                      title="Edit report"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
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

      {/* File / edit incident modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit incident report' : 'File an incident report'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={draft.date} max={new Date().toISOString().split('T')[0]} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Persons involved (optional)</label>
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
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-[#0B005C] text-white rounded-xl font-medium hover:bg-[#1a0f7a] transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'File report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentForms;
