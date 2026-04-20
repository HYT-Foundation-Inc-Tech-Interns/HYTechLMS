import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronDown, 
  Users, 
  Calendar, 
  AlertCircle,
  Loader 
} from 'lucide-react';
import { getCourses } from '../../utils/firestoreService';
import { useToast } from '../../context/ToastContext';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClassId, setExpandedClassId] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all active courses/classes
        const coursesData = await getCourses({ status: 'Active' });
        setClasses(coursesData || []);
      } catch (err) {
        console.error('Error loading classes:', err);
        setError(err.message || 'Failed to load classes');
        addToast('Failed to load classes', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [addToast]);

  // Filter classes by search term
  const filteredClasses = classes.filter((course) =>
    (course.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpanded = (classId) => {
    setExpandedClassId(expandedClassId === classId ? null : classId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600 mt-2">View all active classes and their details</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search classes by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Error Loading Classes</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && filteredClasses.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'No classes match your search.' : 'No active classes found.'}
            </p>
          </div>
        )}

        {/* Classes List */}
        <div className="space-y-4">
          {filteredClasses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              {/* Class Header - Click to Expand */}
              <button
                onClick={() => toggleExpanded(course.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{course.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    course.status === 'Active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {course.status}
                  </span>
                  
                  {/* Expand Icon */}
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      expandedClassId === course.id ? 'transform rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Details */}
              {expandedClassId === course.id && (
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 space-y-4">
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Course Level</p>
                      <p className="text-gray-900">{course.level || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Status</p>
                      <p className="text-gray-900">{course.status}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Course ID</p>
                      <p className="text-gray-900 font-mono text-xs break-all">{course.id}</p>
                    </div>
                    {course.sector && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Sector</p>
                        <p className="text-gray-900">{course.sector}</p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {course.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                      <p className="text-gray-900">{course.description}</p>
                    </div>
                  )}

                  {/* Image Preview */}
                  {course.bgImage && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Course Image</p>
                      <img 
                        src={course.bgImage} 
                        alt={course.name}
                        className="w-full h-32 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}

                  {/* Timestamps if available */}
                  {(course.createdAt || course.updatedAt) && (
                    <div className="pt-2 border-t border-gray-200 space-y-2">
                      {course.createdAt && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Created:</span> {
                            course.createdAt instanceof Date
                              ? course.createdAt.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : new Date(course.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric'
                                })
                          }
                        </p>
                      )}
                      {course.updatedAt && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Updated:</span> {
                            course.updatedAt instanceof Date
                              ? course.updatedAt.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : new Date(course.updatedAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric'
                                })
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        {!error && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900">
              <span className="font-semibold">Total Active Classes:</span> {filteredClasses.length} 
              {searchTerm && ` (filtered from ${classes.length})`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Classes;
