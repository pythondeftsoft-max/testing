import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import PropertyListItem from './PropertyListItem';

interface Property {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  monthly_rent: number;
  desired_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  status: string;
  photos?: string[];
  amenities?: string[];
  description?: string;
  owner_id: string;
  unit_count: number;
  square_feet?: number;
  
  // Grouped multi-unit fields
  isMultiUnit?: boolean;
  availableUnitCount?: number;
  minRent?: number;
  maxRent?: number;
  unitListings?: any[];
}

interface PropertyListPanelProps {
  properties: Array<Property & { latitude: number; longitude: number }>;
  onPropertyClick?: (property: Property) => void;
  selectedProperty?: Property | null;
  isCollapsed: boolean;
  hasAreaActive?: boolean;
  onToggleCollapse: () => void;
}

const PropertyListPanel: React.FC<PropertyListPanelProps> = ({
  properties,
  onPropertyClick,
  selectedProperty,
  isCollapsed,
  hasAreaActive,
  onToggleCollapse
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(properties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProperties = properties.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [properties.length]);

  return (
    <div className={`transition-all duration-300 h-[707px] ${
      isCollapsed 
        ? 'absolute left-0 top-0 z-20 w-12' 
        : 'flex-shrink-0 w-80'
    }`}>
      <Card className="h-full shadow-lg flex flex-col">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 border-b border-gray-200 flex-shrink-0"
        >
          {!isCollapsed && properties.length > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      size="sm"
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        size="sm"
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      size="sm"
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          
          <div className="ml-auto">
            <button onClick={onToggleCollapse} className="hover:bg-gray-50 p-1 rounded">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Property List */}
        {!isCollapsed && (
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            {properties.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm flex-1 flex items-center justify-center">
                <div>
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div>{hasAreaActive ? 'No properties in this area' : 'No properties with coordinates found'}</div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {paginatedProperties.map((property) => (
                  <PropertyListItem
                    key={property.id}
                    property={property}
                    onClick={onPropertyClick || (() => {})}
                    isSelected={selectedProperty?.id === property.id}
                    hideStatus={true}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default PropertyListPanel;
