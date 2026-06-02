
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';
import EnhancedBrowsePropertyCard from './EnhancedBrowsePropertyCard';
import { useSavedProperties } from '@/hooks/useSavedProperties';

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
  // Enhanced fields
  move_in_special?: string;
  security_deposit?: number;
  application_fee?: number;
  utility_estimate?: number;
  landlord_rating?: number;
  landlord_response_time?: string;
  review_count?: number;
  verified_property?: boolean;
  school_rating?: number;
  safety_score?: number;
  video_tour_url?: string;
  days_on_market?: number;
  applicant_count?: number;
  recently_toured?: boolean;
  is_new_listing?: boolean;
  price_reduced?: boolean;
  is_high_demand?: boolean;
  landlord_phone?: string;
  nearby_amenities?: Array<{
    name: string;
    distance: string;
    type: 'school' | 'safety' | 'shopping' | 'transit';
  }>;
}

interface EnhancedPropertyGridProps {
  properties: Property[];
  allProperties: Property[];
  onInterestClick: (property: Property) => void;
  submittingInterest: string | null;
  onCardClick?: (property: Property) => void;
  onViewOnMap?: (property: Property) => void;
  appliedPropertyIds?: Set<string>;
  viewedPropertyIds?: Set<string>;
  userId?: string;
}

const EnhancedPropertyGrid = ({ 
  properties, 
  allProperties, 
  onInterestClick, 
  submittingInterest,
  onCardClick = () => {},
  onViewOnMap = () => {},
  appliedPropertyIds = new Set(),
  viewedPropertyIds = new Set(),
  userId
}: EnhancedPropertyGridProps) => {
  const { savedPropertyIds, toggleSaveProperty } = useSavedProperties(userId);

  if (properties.length === 0) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <EnhancedBrowsePropertyCard
          key={property.id}
          property={property}
          onInterestClick={onInterestClick}
          onCardClick={onCardClick}
          isSubmittingInterest={submittingInterest === property.id}
          hasApplied={appliedPropertyIds.has(property.id)}
          hasViewed={viewedPropertyIds.has(property.id)}
          isSaved={savedPropertyIds.has(property.id)}
          onSaveProperty={toggleSaveProperty}
        />
      ))}
    </div>
  );
};

export default EnhancedPropertyGrid;
