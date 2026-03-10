import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';

const SectorDetail = () => {
  const { sectorId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTraining, setSelectedTraining] = useState(null);

  // Mock data based on sector ID
  const sectorData = {
    1: {
      name: 'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES',
      trainings: [
        { id: 1, name: 'Hilot (Wellness Massage)', level: 'NC II', isPopular: true },
        { id: 2, name: 'Hilot (Wellness Massage)', level: 'NC II', isPopular: true },
        { id: 3, name: 'Hilot (Wellness Massage)', level: 'NC II', isPopular: true },
        { id: 4, name: 'Hilot (Wellness Massage)', level: 'NC II', isPopular: true },
        { id: 5, name: 'Hilot (Wellness Massage)', level: 'NC II', isPopular: true },
        { id: 6, name: 'Hilot (Wellness Massage)', level: 'NC II', isPopular: true },
      ]
    },
    2: {
      name: 'CONSTRUCTION SECTOR',
      trainings: [
        { id: 1, name: 'Masonry', level: 'NC II', isPopular: false },
        { id: 2, name: 'Carpentry', level: 'NC II', isPopular: true },
      ]
    },
    3: {
      name: 'ELECTRICAL & ELECTRONICS SECTOR',
      trainings: [
        { id: 1, name: 'Electrical Installation and Maintenance', level: 'NC II', isPopular: true },
        { id: 2, name: 'Electronics Products Assembly and Servicing', level: 'NC II', isPopular: false },
      ]
    },
    4: {
      name: 'SOCIAL AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
      trainings: [
        { id: 1, name: 'Beauty Care Services', level: 'NC II', isPopular: true },
        { id: 2, name: 'Hairdressing', level: 'NC II', isPopular: true },
      ]
    },
    5: {
      name: 'AUTOMOTIVE/LAND TRANSPORT SECTOR',
      trainings: [
        { id: 1, name: 'Automotive Servicing', level: 'NC II', isPopular: true },
      ]
    },
    6: {
      name: 'TOURISM SECTOR (HOTEL AND RESTAURANT)',
      trainings: [
        { id: 1, name: 'Barista', level: 'NC II', isPopular: true },
        { id: 2, name: 'Food and Beverage Services', level: 'NC II', isPopular: true },
        { id: 3, name: 'Cookery', level: 'NC II', isPopular: true },
      ]
    }
  };

  const sector = sectorData[sectorId] || { name: 'Unknown Sector', trainings: [] };

  const filteredTrainings = sector.trainings.filter(training =>
    training.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Back Button & Header */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/dashboard/sectors')}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Sectors
        </button>
        <h1 className="text-lg font-bold text-gray-900 uppercase">{sector.name}</h1>
      </div>

      {/* Search */}
      <div className="flex justify-end mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-64 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Trainings Section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">TRAININGS</h2>
        
        <div className="space-y-3">
          {filteredTrainings.map((training, index) => (
            <div
              key={training.id}
              onClick={() => setSelectedTraining(selectedTraining === training.id ? null : training.id)}
              className={`rounded-xl border transition-all duration-200 cursor-pointer ${
                selectedTraining === training.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30'
                  : 'bg-white text-gray-900 border-gray-100 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className="p-5">
                <h3 className="font-semibold text-lg mb-2">{training.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                    selectedTraining === training.id
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {training.level}
                  </span>
                  {training.isPopular && (
                    <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                      selectedTraining === training.id
                        ? 'bg-green-400 text-white'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      Popular
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTrainings.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No trainings found</h3>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectorDetail;
