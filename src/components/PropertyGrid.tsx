import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import ComprehensivePropertyCard from './ComprehensivePropertyCard';
import { groupListingsByProperty } from '@/utils/groupListingsByProperty';

interface Property {
  id: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  desired_rent: number;
  zipcode: string;
  city: string;
  state: string;
  street_address: string;
  address: string;
  photos: string[];
  amenities: string[];
  status: string;
  owner_id: string;
  unit_count: number;
  description?: string;
  square_feet?: number;
  year_built?: number;
  property_type?: string;
  parking_type?: string;
  pet_policy?: string;
  furnished?: boolean;
  air_conditioning?: boolean;
  laundry_type?: string;
  walk_score?: number;
  bike_score?: number;
  transit_score?: number;
  latitude?: number;
  longitude?: number;
}

interface PropertyGridProps {
  properties: Property[];
  allProperties: Property[];
  onInterestClick: (property: Property) => void;
  submittingInterest: string | null;
  onCardClick?: (property: Property) => void;
  onViewOnMap?: (property: Property) => void;
  appliedPropertyIds?: Set<string>;
  viewedPropertyIds?: Set<string>;
}

const PropertyGrid = ({ 
  properties, 
  allProperties, 
  onInterestClick, 
  submittingInterest,
  onCardClick = () => {},
  onViewOnMap = () => {},
  appliedPropertyIds = new Set(),
  viewedPropertyIds = new Set()
}: PropertyGridProps) => {
  // Group listings by property to consolidate multi-unit properties
  const groupedProperties = React.useMemo(() => {
    return groupListingsByProperty(properties);
  }, [properties]);

  if (groupedProperties.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-500">
            {allProperties.length === 0 
              ? "No landlords have requested tenants for their properties yet. Check back later!"
              : "Try adjusting your search criteria to see more results."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
      {groupedProperties.map((property: any) => {
        return (
          <ComprehensivePropertyCard
            key={property.id}
            property={property}
            onInterestClick={onInterestClick}
            onCardClick={onCardClick}
            onViewOnMap={onViewOnMap}
            isSubmittingInterest={submittingInterest === property.id}
            hasApplied={appliedPropertyIds.has(property.id)}
            hasViewed={viewedPropertyIds.has(property.id)}
          />
        );
      })}
    </div>
  );
};

export default PropertyGrid;