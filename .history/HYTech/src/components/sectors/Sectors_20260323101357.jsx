import React, { useState } from 'react';
import { 
  Eye, 
  Trash2,
  Car,
  Hammer,
  Zap,
  Heart,
  Wind,
  Monitor,
  Users,
  Plane,
  UtensilsCrossed,
  X,
  Plus,
  Save
} from 'lucide-react';

const Sectors = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddSectorModal, setShowAddSectorModal] = useState(false);
  const [showViewCoursesModal, setShowViewCoursesModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [newSector, setNewSector] = useState({ name: '', description: '', icon: 'Monitor', bgImage: '' });
  const [newCourse, setNewCourse] = useState({ name: '', description: '', level: '', status: 'On-going' });

  // Sectors data
  const [sectors, setSectors] = useState([
    {
      id: 1,
      name: 'AUTOMOTIVE/LAND TRANSPORT SECTOR',
      description: 'This sector provides training for vehicle operation, maintenance, and servicing within land transport. It builds technical and practical skills to support safe and efficient transport services.',
      icon: Car,
      status: 'On-going',
      color: 'from-blue-600 to-blue-800',
      bgImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400',
      courses: [
        { id: 1, name: 'K/C SERVICING (DUNRAC) NCII', description: 'Air-conditioning and refrigeration servicing for vehicles', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1487754180144-351b8e906e6c?w=500&h=300&fit=crop' },
      ],
    },
    {
      id: 2,
      name: 'CONSTRUCTION SECTOR',
      description: 'This sector trains individuals in building, repair, and maintenance work for residential, commercial, and public structures. It equips learners with practical skills needed in the growing construction and infrastructure industry.',
      icon: Hammer,
      status: 'On-going',
      color: 'from-amber-600 to-amber-800',
      bgImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400',
      courses: [
        { id: 1, name: 'PLUMBING NCII', description: 'Installation and maintenance of plumbing systems', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=300&fit=crop' },
      ],
    },
    {
      id: 3,
      name: 'ELECTRICAL & ELECTRONICS SECTOR',
      description: 'This sector develops competencies in installing, maintaining, and repairing electrical and electronic systems. It ensures learners can safely work with wiring, devices, and digital equipment used in homes, businesses, and industries.',
      icon: Zap,
      status: 'On-going',
      color: 'from-yellow-500 to-orange-600',
      bgImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
      courses: [],
    },
    {
      id: 4,
      name: 'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
      description: 'This sector focuses on developing skills for providing care, wellness, and community support services.',
      icon: Heart,
      status: 'On-going',
      color: 'from-emerald-500 to-emerald-700',
      bgImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400',
      courses: [
        { id: 1, name: 'HILOT (WELLNESS)MASSAGE NCII', description: 'Traditional wellness massage and therapeutic services', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1544161515-81fded323381?w=500&h=300&fit=crop' },
        { id: 2, name: 'CAREGIVING NCII', description: 'Personal care and support services for clients', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1631217314831-dc4a8f63e9b1?w=500&h=300&fit=crop' },
        { id: 3, name: 'BEAUTY CARE (SKINCARE) SERVICES NCII', description: 'Professional skincare and beauty treatment services', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=300&fit=crop' },
        { id: 4, name: 'BEAUTY CARE (NAIL CARE) SERVICES NCII', description: 'Professional nail care and manicure/pedicure services', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=300&fit=crop' },
      ],
    },
    {
      id: 5,
      name: 'HEATING, VENTILATING, AIR-CONDITIONING AND REFRIGERATION TECHNOLOGY SECTOR',
      description: 'This sector builds skills in installing, troubleshooting, and maintaining air-conditioning and refrigeration systems.',
      icon: Wind,
      status: 'On-going',
      color: 'from-cyan-500 to-cyan-700',
      bgImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
      courses: [],
    },
    {
      id: 6,
      name: 'INFORMATION AND COMMUNICATIONS TECHNOLOGY SECTOR',
      description: 'This sector focuses on digital design, technical support, and information technology-related competencies. It trains learners to work effectively in tech-driven environments requiring creativity and problem-solving.',
      icon: Monitor,
      status: 'On-going',
      color: 'from-indigo-500 to-indigo-700',
      bgImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
      courses: [
        { id: 1, name: 'VISUAL GRAPHICS DESIGN', description: 'Digital design and visual communication', level: 'NC', status: 'On-going', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=300&fit=crop' },
        { id: 2, name: 'COMPUTER SYSTEM SERVICING NCII', description: 'Computer hardware maintenance and troubleshooting', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop' },
      ],
    },
    {
      id: 7,
      name: 'SOCIAL AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
      description: 'This sector focuses on household management, personal care, and community services support skills.',
      icon: Users,
      status: 'On-going',
      color: 'from-pink-500 to-pink-700',
      bgImage: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400',
      courses: [
        { id: 1, name: 'BOOKKEEPING NCII', description: 'Financial record-keeping and accounting fundamentals', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&h=300&fit=crop' },
        { id: 2, name: 'HOUSEKEEPING NCII', description: 'Residential and commercial cleaning and maintenance', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=500&h=300&fit=crop' },
      ],
    },
    {
      id: 8,
      name: 'TOURISM SECTOR',
      description: 'This sector covers event planning, tour operations, and guest-related services in tourism establishments. It trains learners to deliver quality experiences to tourists and travelers.',
      icon: Plane,
      status: 'On-going',
      color: 'from-sky-500 to-sky-700',
      bgImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
      courses: [
        { id: 1, name: 'EVENT MANAGEMENT SERVICES NCIII', description: 'Planning and organizing events and tourism experiences', level: 'NCIII', status: 'On-going', image: 'https://images.unsplash.com/photo-1540575467063-178f50002cbc?w=500&h=300&fit=crop' },
      ],
    },
    {
      id: 9,
      name: 'TOURISM SECTOR (HOTEL AND RESTAURANT)',
      description: 'This sector develops skills for hotel, restaurant, and hospitality operations. It prepares learners to deliver quality service in hospitality settings.',
      icon: UtensilsCrossed,
      status: 'On-going',
      color: 'from-rose-500 to-rose-700',
      bgImage: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
      courses: [
        { id: 1, name: 'BARISTA NCII', description: 'Coffee preparation and beverage service expertise', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500&h=300&fit=crop' },
        { id: 2, name: 'FOOD AND BEVERAGE SERVICES NCII', description: 'Food preparation, service, and hospitality standards', level: 'NCII', status: 'On-going', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop' },
      ],
    },
  ]);

  // Icon mapping
  const iconMap = {
    'Car': Car,
    'Hammer': Hammer,
    'Zap': Zap,
    'Heart': Heart,
    'Wind': Wind,
    'Monitor': Monitor,
    'Users': Users,
    'Plane': Plane,
    'UtensilsCrossed': UtensilsCrossed,
  };

  const colorMap = {
    'Car': 'from-blue-600 to-blue-800',
    'Hammer': 'from-amber-600 to-amber-800',
    'Zap': 'from-yellow-500 to-orange-600',
    'Heart': 'from-emerald-500 to-emerald-700',
    'Wind': 'from-cyan-500 to-cyan-700',
    'Monitor': 'from-indigo-500 to-indigo-700',
    'Users': 'from-pink-500 to-pink-700',
    'Plane': 'from-sky-500 to-sky-700',
    'UtensilsCrossed': 'from-rose-500 to-rose-700',
  };

  const handleAddSector = (e) => {
    e.preventDefault();
    const id = Math.max(...sectors.map(s => s.id), 0) + 1;
    const color = colorMap[newSector.icon] || 'from-blue-600 to-blue-800';
    setSectors([...sectors, {
      id,
      name: newSector.name,
      description: newSector.description,
      icon: iconMap[newSector.icon],
      status: 'On-going',
      color,
      bgImage: newSector.bgImage || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
      courses: []
    }]);
    setNewSector({ name: '', description: '', icon: 'Monitor', bgImage: '' });
    setShowAddSectorModal(false);
  };

  const handleViewCourses = (sector) => {
    setSelectedSector(sector);
    setShowViewCoursesModal(true);
  };

  const handleAddCourse = (e) => {
    e.preventDefault();
    if (selectedSector) {
      const updatedSectors = sectors.map(s => {
        if (s.id === selectedSector.id) {
          return {
            ...s,
            courses: [
              ...(s.courses || []),
              {
                id: (s.courses?.length || 0) + 1,
                name: newCourse.name,
                description: newCourse.description,
                level: newCourse.level,
                status: newCourse.status
              }
            ]
          };
        }
        return s;
      });
      setSectors(updatedSectors);
      setSelectedSector(updatedSectors.find(s => s.id === selectedSector.id));
      setNewCourse({ name: '', description: '', level: '', status: 'On-going' });
      setShowAddCourseModal(false);
    }
  };

  const handleDelete = () => {
    if (selectedSector) {
      setSectors(sectors.filter(s => s.id !== selectedSector.id));
      setShowDeleteModal(false);
      setSelectedSector(null);
    }
  };

  return (
    <div className="space-y-6 pb-6 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sectors</h1>
        <button
          onClick={() => setShowAddSectorModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          <span>Add Sector</span>
        </button>
      </div>

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sectors.map((sector, index) => {
          const Icon = sector.icon;
          return (
            <div
              key={sector.id}
              className="card overflow-hidden group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Card Header with Image */}
              <div 
                className={`h-40 relative bg-gradient-to-br ${sector.color} overflow-hidden`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12" />
                </div>
                
                {/* Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm transform group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full shadow-lg">
                    {sector.status}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5">
                <h3 className="text-sm font-bold text-orange-500 mb-2 line-clamp-2 uppercase tracking-wide">
                  {sector.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-3 mb-4">
                  {sector.description}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => handleViewCourses(sector)}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600:text-blue-400 transition-colors text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Courses</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedSector(sector);
                      setShowDeleteModal(true);
                    }}
                    className="flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sectors.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Sectors Found</h3>
          <p className="text-gray-500">There are no sectors available at the moment.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSector && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Sector</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to delete <strong className="text-gray-700">{selectedSector.name}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Sector Modal */}
      {showAddSectorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddSectorModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scale-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Add New Sector</h2>
              </div>
              <button
                onClick={() => setShowAddSectorModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleAddSector} className="p-6 space-y-4 overflow-y-auto">
              {/* Sector Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sector Name</label>
                <input 
                  type="text"
                  value={newSector.name}
                  onChange={(e) => setNewSector({ ...newSector, name: e.target.value })}
                  placeholder="Enter sector name..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea 
                  value={newSector.description}
                  onChange={(e) => setNewSector({ ...newSector, description: e.target.value })}
                  placeholder="Enter sector description..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  required
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <select 
                  value={newSector.icon}
                  onChange={(e) => setNewSector({ ...newSector, icon: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="Car">Automotive/Land Transport</option>
                  <option value="Hammer">Construction</option>
                  <option value="Zap">Electrical & Electronics</option>
                  <option value="Heart">Health & Community Services</option>
                  <option value="Wind">HVAC & Refrigeration</option>
                  <option value="Monitor">Information & Communications</option>
                  <option value="Users">Social Services</option>
                  <option value="Plane">Tourism</option>
                  <option value="UtensilsCrossed">Hotel & Restaurant</option>
                </select>
              </div>

              {/* Background Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Image URL (Optional)</label>
                <input 
                  type="url"
                  value={newSector.bgImage}
                  onChange={(e) => setNewSector({ ...newSector, bgImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddSectorModal(false)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Add Sector
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* View Courses Modal */}
      {showViewCoursesModal && selectedSector && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowViewCoursesModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scale-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedSector.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Manage courses for this sector</p>
              </div>
              <button
                onClick={() => setShowViewCoursesModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Add Course Button */}
              <button 
                onClick={() => setShowAddCourseModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25 mb-4"
              >
                <Plus className="w-4 h-4" />
                <span>Add Course</span>
              </button>

              {/* Courses List */}
              <div className="space-y-3">
                {selectedSector.courses && selectedSector.courses.length > 0 ? (
                  selectedSector.courses.map((course, index) => (
                    <div key={course.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-200 transition-all">
                      <div className="flex items-start gap-4 p-4">
                        {/* Course Image */}
                        <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                          <img 
                            src={course.image}
                            alt={course.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
                                  <span class="text-gray-400 text-2xl font-bold">${course.name.charAt(0)}</span>
                                </div>
                              `;
                            }}
                          />
                        </div>
                        
                        {/* Course Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{course.name}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md">
                              {course.level}
                            </span>
                            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md">
                              {course.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No courses yet</p>
                    <p className="text-sm text-gray-400">Add your first course to get started</p>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && selectedSector && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddCourseModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scale-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Add Course</h2>
              </div>
              <button
                onClick={() => setShowAddCourseModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleAddCourse} className="p-6 space-y-4 overflow-y-auto">
              {/* Course Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                <input 
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="Enter course name..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              {/* Course Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea 
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  placeholder="Enter course description..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  required
                />
              </div>

              {/* Course Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                <select 
                  value={newCourse.level}
                  onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                >
                  <option value="">Select a level</option>
                  <option value="NC I">NC I</option>
                  <option value="NC II">NC II</option>
                  <option value="NC III">NC III</option>
                  <option value="NC IV">NC IV</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select 
                  value={newCourse.status}
                  onChange={(e) => setNewCourse({ ...newCourse, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="On-going">On-going</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Add Course
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sectors;
