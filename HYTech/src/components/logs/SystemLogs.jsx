import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Download,
  Trash2,
  ChevronDown,
  X,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  subscribeToActivityLogs,
  getUserProfile,
  toDate,
  purgeActivityLogs,
  getActivityLogsByDateRange,
} from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';

// Map raw activity actions to a display label and severity badge
const ACTION_DISPLAY = {
  user_login: { label: 'User Login', type: 'info' },
  user_signup: { label: 'User Sign Up', type: 'success' },
  user_created: { label: 'User Created', type: 'success' },
  user_updated: { label: 'User Updated', type: 'info' },
  user_role_updated: { label: 'User Role Updated', type: 'warning' },
  user_status_updated: { label: 'User Status Updated', type: 'warning' },
  apply_course: { label: 'Course Application', type: 'info' },
  join_class: { label: 'Joined Class', type: 'success' },
  notify_trainer: { label: 'Trainor Notified', type: 'info' },
  create_course: { label: 'Course Created', type: 'success' },
  create_class: { label: 'Class Created', type: 'success' },
  grade_posted: { label: 'Grade Posted', type: 'info' },
};

const formatAction = (action) =>
  ACTION_DISPLAY[action]?.label ||
  String(action || 'Activity')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatTimestamp = (value) => {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const CSV_HEADERS = ['Log ID', 'Type', 'Action', 'Name', 'Email', 'Role', 'Entity Type', 'Linked ID', 'Timestamp'];
const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// Trigger a browser download for a CSV string.
const downloadCsv = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Purge presets: how far back the range starts, measured from "now".
const PURGE_PRESETS = [
  { id: '1m', label: 'Past month', months: 1 },
  { id: '6m', label: 'Past 6 months', months: 6 },
  { id: '12m', label: 'Past 12 months', months: 12 },
];

const SystemLogs = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState(null); // null = loading
  const [userCache, setUserCache] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [purging, setPurging] = useState(false);

  // Export & purge modal
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [rangePreset, setRangePreset] = useState('1m');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToActivityLogs((items) => setLogs(items));
    return unsubscribe;
  }, []);

  // Resolve user names for any userIds we haven't seen yet
  useEffect(() => {
    if (!logs) return;

    const missingIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))].filter(
      (id) => !(id in userCache)
    );
    if (missingIds.length === 0) return;

    let isMounted = true;

    (async () => {
      const entries = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const profile = await getUserProfile(id);
            return [
              id,
              profile
                ? {
                    name: profile.name || profile.displayName || profile.email || 'Unknown User',
                    email: profile.email || '',
                    role: profile.role || '',
                  }
                : { name: 'Deleted User', email: '', role: '' },
            ];
          } catch {
            return [id, { name: 'Unknown User', email: '', role: '' }];
          }
        })
      );

      if (isMounted) {
        setUserCache((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs]);

  const enrichedLogs = useMemo(() => {
    if (!logs) return [];

    return logs.map((log) => {
      const userInfo = userCache[log.userId] || { name: '...', email: '', role: '' };
      return {
        id: log.id,
        logId: log.id,
        entityType: log.entityType || '',
        linkedId: log.entityId || '',
        type: ACTION_DISPLAY[log.action]?.type || 'info',
        action: formatAction(log.action),
        name: userInfo.name,
        email: log.metadata?.email || userInfo.email,
        role: log.metadata?.role || userInfo.role,
        timestampDate: toDate(log.timestamp),
        timestamp: formatTimestamp(log.timestamp),
      };
    });
  }, [logs, userCache]);

  // Filter logs by search text + severity type.
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const matches = enrichedLogs.filter((log) => {
      const matchesSearch =
        !q ||
        log.name.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.role.toLowerCase().includes(q) ||
        log.email.toLowerCase().includes(q) ||
        log.logId.toLowerCase().includes(q) ||
        String(log.linkedId).toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || log.type === typeFilter;
      return matchesSearch && matchesType;
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...matches].sort((a, b) => {
      if (sortField === 'timestamp') {
        return direction * ((a.timestampDate?.getTime() || 0) - (b.timestampDate?.getTime() || 0));
      }
      return direction * String(a[sortField] || '').localeCompare(String(b[sortField] || ''));
    });
  }, [enrichedLogs, searchQuery, typeFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + rowsPerPage);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'success':
        return <span className="badge-success">success</span>;
      case 'warning':
        return <span className="badge-warning">warning</span>;
      case 'error':
        return <span className="badge-danger">error</span>;
      default:
        return <span className="badge-info">info</span>;
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export the currently filtered logs to a CSV file.
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      addToast('Nothing to export.', 'info');
      return;
    }
    const rows = filteredLogs.map((l) =>
      [l.logId, l.type, l.action, l.name, l.email, l.role, l.entityType, l.linkedId, l.timestamp]
        .map(csvEscape)
        .join(',')
    );
    const csv = [CSV_HEADERS.map(csvEscape).join(','), ...rows].join('\n');
    downloadCsv(csv, `system-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    addToast(`Exported ${filteredLogs.length} log(s).`, 'success');
  };

  // Resolve the selected [from, to] Date range from preset or custom inputs.
  // Returns null (with a toast) if a custom range is missing/invalid.
  const resolveRange = () => {
    const to = new Date();
    if (rangePreset === 'custom') {
      if (!customFrom || !customTo) {
        addToast('Please pick both a start and end date.', 'info');
        return null;
      }
      const from = new Date(`${customFrom}T00:00:00`);
      const customEnd = new Date(`${customTo}T23:59:59.999`);
      if (from > customEnd) {
        addToast('Start date must be before the end date.', 'error');
        return null;
      }
      return { from, to: customEnd };
    }
    const preset = PURGE_PRESETS.find((p) => p.id === rangePreset) || PURGE_PRESETS[0];
    const from = new Date(to);
    from.setMonth(from.getMonth() - preset.months);
    return { from, to };
  };

  // Build a CSV string from raw Firestore log docs, resolving user names as needed.
  const buildCsvFromRawLogs = async (rawLogs) => {
    const cache = { ...userCache };
    const missingIds = [...new Set(rawLogs.map((l) => l.userId).filter(Boolean))].filter(
      (id) => !(id in cache)
    );
    await Promise.all(
      missingIds.map(async (id) => {
        try {
          const profile = await getUserProfile(id);
          cache[id] = profile
            ? {
                name: profile.name || profile.displayName || profile.email || 'Unknown User',
                email: profile.email || '',
                role: profile.role || '',
              }
            : { name: 'Deleted User', email: '', role: '' };
        } catch {
          cache[id] = { name: 'Unknown User', email: '', role: '' };
        }
      })
    );

    const rows = rawLogs.map((log) => {
      const u = cache[log.userId] || { name: '', email: '', role: '' };
      return [
        log.id,
        ACTION_DISPLAY[log.action]?.type || 'info',
        formatAction(log.action),
        u.name,
        log.metadata?.email || u.email,
        log.metadata?.role || u.role,
        log.entityType || '',
        log.entityId || '',
        formatTimestamp(log.timestamp),
      ]
        .map(csvEscape)
        .join(',');
    });
    return [CSV_HEADERS.map(csvEscape).join(','), ...rows].join('\n');
  };

  // Combined flow: export the selected date range to CSV, then permanently purge it.
  const handleExportAndPurge = async () => {
    const range = resolveRange();
    if (!range) return;

    try {
      setPurging(true);
      const rawLogs = await getActivityLogsByDateRange(range.from, range.to);
      if (rawLogs.length === 0) {
        addToast('No logs found in the selected date range.', 'info');
        setPurging(false);
        return;
      }

      // Export first so there is always a CSV backup before anything is deleted.
      const csv = await buildCsvFromRawLogs(rawLogs);
      const stamp = `${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}`;
      downloadCsv(csv, `system-logs-${stamp}.csv`);

      const count = await purgeActivityLogs(rawLogs.map((l) => l.id));
      addToast(`Exported and purged ${count} log(s).`, 'success');
      setShowPurgeModal(false);
    } catch (err) {
      console.error('Export & purge failed:', err);
      addToast('Failed to export & purge logs. Check your permissions.', 'error');
    } finally {
      setPurging(false);
    }
  };

  if (logs === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6 lg:pb-8">
      {/* Top Bar */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 sm:w-72 min-w-[12rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, action, log ID, linked ID…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            {/* Type filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm appearance-none"
                aria-label="Filter by type"
              >
                <option value="all">All types</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-400 mr-1">{filteredLogs.length} events</p>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setShowPurgeModal(true)}
              disabled={purging}
              className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Export &amp; Purge
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">LOG ID</th>
                <th className="table-header">TYPE</th>
                <th className="table-header">
                  <button
                    onClick={() => handleSort('action')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    ACTION
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="table-header">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    NAME
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="table-header">ROLE</th>
                <th className="table-header">LINKED ID</th>
                <th className="table-header">
                  <button
                    onClick={() => handleSort('timestamp')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    TIMESTAMP
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLogs.map((log, index) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="table-cell">
                    <span className="font-mono text-xs text-gray-500" title={log.logId}>
                      {log.logId.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="table-cell">{getTypeBadge(log.type)}</td>
                  <td className="table-cell font-medium text-gray-800">{log.action}</td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-gray-800">{log.name}</p>
                      <p className="text-xs text-gray-400">{log.email}</p>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600 capitalize">{log.role || '—'}</td>
                  <td className="table-cell">
                    {log.linkedId ? (
                      <span className="font-mono text-xs text-gray-500" title={`${log.entityType}: ${log.linkedId}`}>
                        {log.entityType ? `${log.entityType}/` : ''}
                        {String(log.linkedId).slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="table-cell text-gray-500 text-sm">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            {filteredLogs.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredLogs.length)} of {filteredLogs.length}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <span className="text-sm text-gray-600">{safePage}/{totalPages}</span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Logs Yet</h3>
          <p className="text-gray-500">
            {searchQuery || typeFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'System events like logins, sign-ups, and role changes will appear here.'}
          </p>
        </div>
      )}

      {/* Export & Purge Modal */}
      {showPurgeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !purging && setShowPurgeModal(false)}
        >
          <div
            className="card w-full max-w-lg p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Export &amp; Purge Logs</h3>
                  <p className="text-sm text-gray-500">Download a CSV backup, then permanently delete the range.</p>
                </div>
              </div>
              <button
                onClick={() => !purging && setShowPurgeModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Presets */}
            <label className="block text-sm font-medium text-gray-700 mb-2">Date range</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PURGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setRangePreset(preset.id)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    rangePreset === preset.id
                      ? 'border-[#0B005C] bg-[#0B005C]/5 text-[#0B005C] font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setRangePreset('custom')}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors flex items-center justify-center gap-1.5 ${
                  rangePreset === 'custom'
                    ? 'border-[#0B005C] bg-[#0B005C]/5 text-[#0B005C] font-medium'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Custom
              </button>
            </div>

            {/* Custom date inputs */}
            {rangePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 mb-5">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">
                All logs in this range will be exported to a CSV file and then{' '}
                <span className="font-semibold">permanently deleted</span>. This cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPurgeModal(false)}
                disabled={purging}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExportAndPurge}
                disabled={purging}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {purging ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export &amp; Purge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
