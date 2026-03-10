import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowRight, Heart, Wrench, Zap, Users, Car, UtensilsCrossed } from 'lucide-react';

const TrainerSectors = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const sectors = [
    {
      id: 1,
      name: 'HEALTH, SOCIAL, AND OTHER COMMUNITY DEVELOPMENT SERVICES',
      trainings: 3,
      icon: Heart,
      color: 'text-rose-500 bg-rose-50'
    },
    {
      id: 2,
      name: 'CONSTRUCTION SECTOR',
      trainings: 1,
      icon: Wrench,
      color: 'text-amber-500 bg-amber-50'
    },
    {
      id: 3,
      name: 'ELECTRICAL & ELECTRONICS SECTOR',
      trainings: 2,
      icon: Zap,
      color: 'text-blue-500 bg-blue-50'
    },
    {
      id: 4,
      name: 'SOCIAL AND OTHER COMMUNITY DEVELOPMENT SERVICES SECTOR',
      trainings: 2,
      icon: Users,
      color: 'text-teal-500 bg-teal-50'
    },
    {
      id: 5,
      name: 'AUTOMOTIVE/LAND TRANSPORT SECTOR',
      trainings: 1,
      icon: Car,
      color: 'text-indigo-500 bg-indigo-50'
    },
    {
      id: 6,
      name: 'TOURISM SECTOR (HOTEL AND RESTAURANT)',
      trainings: 3,
      icon: UtensilsCrossed,
      color: 'text-orange-500 bg-orange-50'
    },
  ];

  const filteredSectors = sectors.filter(sector =>
    sector.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full sm:w-64 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Sectors List */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
        {filteredSectors.map(sector => {
          const Icon = sector.icon;
          return (
            <div
              key={sector.id}
              onClick={() => navigate(`/dashboard/sectors/${sector.id}`)}
              className="flex items-center justify-between p-5 hover:bg-blue-50/50:bg-gray-700/50 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${sector.color} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 uppercase text-sm group-hover:text-blue-600 transition-colors">{sector.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{sector.trainings} Trainings</p>
                </div>
              </div>
              <button className="p-2 border border-gray-200 rounded-full text-blue-600 hover:bg-blue-50:bg-blue-900/30 transition-all duration-200 group-hover:border-blue-300 group-hover:scale-110">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredSectors.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No sectors found</h3>
          <p className="text-gray-500">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
};

export default TrainerSectors;
