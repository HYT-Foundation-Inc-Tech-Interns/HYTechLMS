import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { subscribeToActivityLogs, getUserProfile, toDate } from '../../utils/firestoreService';

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
  notify_trainer: { label: 'Trainer Notified', type: 'info' },
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

const SystemLogs = () => {
  const [logs, setLogs] = useState(null); // null = loading
  const [userCache, setUserCache] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');

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

  // Filter logs based on search
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const matches = enrichedLogs.filter(
      (log) =>
        log.name.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.role.toLowerCase().includes(q) ||
        log.email.toLowerCase().includes(q)
    );

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...matches].sort((a, b) => {
      if (sortField === 'timestamp') {
        return direction * ((a.timestampDate?.getTime() || 0) - (b.timestampDate?.getTime() || 0));
      }
      return direction * String(a[sortField] || '').localeCompare(String(b[sortField] || ''));
    });
  }, [enrichedLogs, searchQuery, sortField, sortDirection]);

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 sm:w-80 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, action, role, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <p className="text-sm text-gray-400">{filteredLogs.length} events</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
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
                    {getTypeBadge(log.type)}
                  </td>
                  <td className="table-cell font-medium text-gray-800">
                    {log.action}
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-gray-800">{log.name}</p>
                      <p className="text-xs text-gray-400">{log.email}</p>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600 capitalize">
                    {log.role || '—'}
                  </td>
                  <td className="table-cell text-gray-500 text-sm">
                    {log.timestamp}
                  </td>
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
            {searchQuery
              ? 'Try adjusting your search criteria.'
              : 'System events like logins, sign-ups, and role changes will appear here.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
