import React, { useState } from 'react';
import { 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';

const SystemLogs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');

  // Sample logs data
  const logs = [
    { id: 1, type: 'info', action: 'User Login', name: 'Ms. Grace', idNumber: '5684236526', role: 'Trainer', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 2, type: 'success', action: 'Course Published', name: 'Engr. James', idNumber: '5684236526', role: 'Trainer', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 3, type: 'warning', action: 'Failed Login Attempt', name: 'Jhudiel', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 4, type: 'info', action: 'User Role Updated', name: 'Jomar', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 5, type: 'success', action: 'Resource Uploaded', name: 'Ms. Grace', idNumber: '5684236526', role: 'Trainer', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 6, type: 'warning', action: 'User Suspended', name: 'Lenar', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 7, type: 'info', action: 'User Login', name: 'Karylle', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 8, type: 'info', action: 'User Login', name: 'Mikaela', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 9, type: 'info', action: 'User Logout', name: 'Ellaine', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 10, type: 'success', action: 'Certificate Generated', name: 'Jean', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 11, type: 'info', action: 'User Login', name: 'Kassy', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 12, type: 'info', action: 'User Login', name: 'Ian', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
    { id: 13, type: 'info', action: 'User Login', name: 'Hart', idNumber: '5684236526', role: 'Student', ipAddress: '192.168.1.45', timestamp: 'Feb 16, 2026 14:32:15', status: 'Active' },
  ];

  // Filter logs based on search
  const filteredLogs = logs.filter(log => 
    log.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + rowsPerPage);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'info':
        return <span className="badge-info">info</span>;
      case 'success':
        return <span className="badge-success">success</span>;
      case 'warning':
        return <span className="badge-warning">warning</span>;
      case 'error':
        return <span className="badge-danger">error</span>;
      default:
        return <span className="badge-info">{type}</span>;
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

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50:bg-gray-700 transition-colors">
              <Filter className="w-5 h-5 text-gray-500" />
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">TYPE</th>
                <th className="table-header">ACTION</th>
                <th className="table-header">
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-700:text-gray-300 transition-colors"
                  >
                    NAME
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="table-header">ROLE</th>
                <th className="table-header">IP ADDRESS</th>
                <th className="table-header">TIMESTAMP</th>
                <th className="table-header">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-gray-700:text-gray-300 transition-colors"
                  >
                    STATUS
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLogs.map((log, index) => (
                <tr 
                  key={log.id}
                  className="hover:bg-gray-50:bg-gray-700 transition-colors animate-fade-in"
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
                      <p className="text-xs text-gray-400">{log.idNumber}</p>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">
                    {log.role}
                  </td>
                  <td className="table-cell text-gray-600 font-mono text-sm">
                    {log.ipAddress}
                  </td>
                  <td className="table-cell text-gray-500 text-sm">
                    {log.timestamp}
                  </td>
                  <td className="table-cell">
                    <span className="badge-success">{log.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredLogs.length)} of {filteredLogs.length}
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <span className="text-sm text-gray-600">{currentPage}/{totalPages}</span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Logs Found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
