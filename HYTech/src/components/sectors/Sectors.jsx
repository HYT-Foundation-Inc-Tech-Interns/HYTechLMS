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
  X
} from 'lucide-react';

const Sectors = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);

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
    },
    {
      id: 2,
      name: 'CONSTRUCTION SECTOR',
      description: 'This sector trains individuals in building, repair, and maintenance work for residential, commercial, and public structures. It equips learners with practical skills needed in the growing construction and infrastructure industry.',
      icon: Hammer,
      status: 'On-going',
      color: 'from-amber-600 to-amber-800',
      bgImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400',
    },
    {
      id: 3,
      name: 'ELECTRICAL & ELECTRONICS SECTOR',
      description: 'This sector develops competencies in installing, maintaining, and repairing electrical and electronic systems. It ensures learners can safely work with wiring, devices, and digital equipment used in homes, businesses, and industries.',
      icon: Zap,
      status: 'On-going',
      color: 'from-yellow-500 to-orange-600',
      bgImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    },
    {
      id: 4,
      name: 'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
      description: 'This sector focuses on developing skills for providing care, wellness, and community support services.',
      icon: Heart,
      status: 'On-going',
      color: 'from-emerald-500 to-emerald-700',
      bgImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400',
    },
    {
      id: 5,
      name: 'HEATING, VENTILATING, AIR-CONDITIONING AND REFRIGERATION TECHNOLOGY SECTOR',
      description: 'This sector builds skills in installing, troubleshooting, and maintaining air-conditioning and refrigeration systems.',
      icon: Wind,
      status: 'On-going',
      color: 'from-cyan-500 to-cyan-700',
      bgImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
    },
    {
      id: 6,
      name: 'INFORMATION AND COMMUNICATIONS TECHNOLOGY SECTOR',
      description: 'This sector focuses on digital design, technical support, and information technology-related competencies. It trains learners to work effectively in tech-driven environments requiring creativity and problem-solving.',
      icon: Monitor,
      status: 'On-going',
      color: 'from-indigo-500 to-indigo-700',
      bgImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
    },
    {
      id: 7,
      name: 'SOCIAL AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
      description: 'This sector focuses on household management, personal care, and community services support skills.',
      icon: Users,
      status: 'On-going',
      color: 'from-pink-500 to-pink-700',
      bgImage: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400',
    },
    {
      id: 8,
      name: 'TOURISM SECTOR',
      description: 'This sector covers event planning, tour operations, and guest-related services in tourism establishments. It trains learners to deliver quality experiences to tourists and travelers.',
      icon: Plane,
      status: 'On-going',
      color: 'from-sky-500 to-sky-700',
      bgImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
    },
    {
      id: 9,
      name: 'TOURISM SECTOR (HOTEL AND RESTAURANT)',
      description: 'This sector develops skills for hotel, restaurant, and hospitality operations. It prepares learners to deliver quality service in hospitality settings.',
      icon: UtensilsCrossed,
      status: 'On-going',
      color: 'from-rose-500 to-rose-700',
      bgImage: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
    },
  ]);

  const handleDelete = () => {
    if (selectedSector) {
      setSectors(sectors.filter(s => s.id !== selectedSector.id));
      setShowDeleteModal(false);
      setSelectedSector(null);
    }
  };

  return (
    <div className="space-y-6">
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
                  <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600:text-blue-400 transition-colors text-sm font-medium">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
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
      )}
    </div>
  );
};

export default Sectors;
