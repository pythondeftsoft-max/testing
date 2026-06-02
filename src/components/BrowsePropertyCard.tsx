import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ForSaleCheckbox } from '@/components/property/ForSaleCheckbox';
import { 
  MapPin, 
  Home, 
  DollarSign, 
  Bed, 
  Bath, 
  Heart, 
  Users
} from 'lucide-react';
import { PropertyCardHeader } from './property/PropertyCardHeader';

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
  photos: string[];
  amenities: string[];
  status: string;
  owner_id: string;
  unit_count: number;
  description?: string;
  property_units?: Array<{
    id: string;
    unit_number: string;
    unit_name: string;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number;
    status: string;
    square_feet: number;
    description: string;
    unit_amenities: string[];
  }>;
}

interface BrowsePropertyCardProps {
  property: Property;
  onInterestClick: (property: Property) => void;
  onCardClick: (property: Property) => void;
  isSubmittingInterest: boolean;
  hasApplied: boolean;
  hasViewed: boolean;
  showForSaleCheckbox?: boolean;
}

const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Pool': () => <Home className="h-4 w-4" />,
  'Gym': () => <Home className="h-4 w-4" />,
  'Parking': () => <Home className="h-4 w-4" />,
  'WiFi': () => <Home className="h-4 w-4" />,
  'AC': () => <Home className="h-4 w-4" />,
  'Heating': () => <Home className="h-4 w-4" />,
  'Laundry': () => <Home className="h-4 w-4" />,
  'Dishwasher': Home,
  'Garden': () => <Home className="h-4 w-4" />,
  'Washer/Dryer': () => <Home className="h-4 w-4" />,
  'Security': () => <Home className="h-4 w-4" />
};

const BrowsePropertyCard = ({ 
  property, 
  onInterestClick, 
  onCardClick,
  isSubmittingInterest, 
  hasApplied,
  hasViewed,
  showForSaleCheckbox = false
}: BrowsePropertyCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const displayRent = property.desired_rent || property.monthly_rent;
  const photos = property.photos || [];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % photos.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };
  
  // Check if this is a multi-unit property
  const isMultiUnit = property.unit_count > 1 && property.property_units && property.property_units.length > 0;
  const availableUnits = isMultiUnit ? property.property_units.filter(unit => unit.status === 'available') : [];
  
  // Get rent range for multi-unit properties
  const getRentRange = () => {
    if (isMultiUnit && availableUnits.length > 0) {
      const rents = availableUnits.map(unit => unit.monthly_rent).filter(rent => rent > 0);
      if (rents.length > 0) {
        const minRent = Math.min(...rents);
        const maxRent = Math.max(...rents);
        return minRent === maxRent ? `$${minRent}` : `$${minRent} - $${maxRent}`;
      }
    }
    return displayRent ? `$${displayRent}` : 'Contact for price';
  };
  
  // Get bedroom/bathroom range for multi-unit properties
  const getBedroomBathroomInfo = () => {
    if (isMultiUnit && availableUnits.length > 0) {
      const bedrooms = availableUnits.map(unit => unit.bedrooms).filter(bed => bed > 0);
      const bathrooms = availableUnits.map(unit => unit.bathrooms).filter(bath => bath > 0);
      
      if (bedrooms.length > 0 && bathrooms.length > 0) {
        const minBed = Math.min(...bedrooms);
        const maxBed = Math.max(...bedrooms);
        const minBath = Math.min(...bathrooms);
        const maxBath = Math.max(...bathrooms);
        
        const bedText = minBed === maxBed ? `${minBed}` : `${minBed}-${maxBed}`;
        const bathText = minBath === maxBath ? `${minBath}` : `${minBath}-${maxBath}`;
        
        return { bedText, bathText };
      }
    }
    
    return {
      bedText: property.bedrooms ? property.bedrooms.toString() : '0',
      bathText: property.bathrooms ? property.bathrooms.toString() : '0'
    };
  };
  
  const { bedText, bathText } = getBedroomBathroomInfo();

  return (
    <CardEnhanced 
      variant="elevated" 
      className="group h-[600px] flex flex-col card-hover animate-fade-in-up"
      onClick={() => onCardClick(property)}
    >
      <CardEnhancedHeader className="p-0 flex-shrink-0">
        <PropertyCardHeader 
          photos={photos}
          currentImageIndex={currentImageIndex}
          onNextImage={nextImage}
          onPrevImage={prevImage}
          hasApplied={hasApplied}
          hasViewed={hasViewed}
        />
      </CardEnhancedHeader>
      
      <CardEnhancedContent className="p-5 space-y-4 flex-1 flex flex-col">
        {/* Rent */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="p-1 rounded-lg bg-gradient-blue-gold">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-gradient-blue-gold">
            {getRentRange()}
          </span>
          <span className="text-muted-foreground">/month</span>
        </div>

        {/* Property Type & Units Info */}
        {isMultiUnit && (
          <div className="flex items-center gap-1 text-sm flex-shrink-0">
            <div className="p-1 rounded bg-openkey-blue/10">
              <Users className="h-4 w-4 text-openkey-blue" />
            </div>
            <span className="text-openkey-blue font-medium">
              {availableUnits.length} of {property.unit_count} units available
            </span>
          </div>
        )}

        {/* Property Details */}
        <div className="flex items-center gap-4 text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span className="font-medium">{bedText}</span>
            <span className="text-sm">bed</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span className="font-medium">{bathText}</span>
            <span className="text-sm">bath</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">
            {property.street_address && `${property.street_address}, `}
            {property.city}, {property.state} {property.zipcode}
          </span>
        </div>

        {/* Available Units Preview (for multi-unit properties) */}
        {isMultiUnit && availableUnits.length > 0 && (
          <div className="space-y-2 flex-shrink-0">
            <div className="text-sm font-medium">Available Units:</div>
            <div className="space-y-1 max-h-16 overflow-y-auto">
              {availableUnits.slice(0, 2).map((unit) => (
                <div key={unit.id} className="text-xs bg-gradient-subtle-blue p-2 rounded flex justify-between">
                  <span>Unit {unit.unit_number}: {unit.bedrooms}bed/{unit.bathrooms}bath</span>
                  {unit.monthly_rent > 0 && <span className="font-medium">${unit.monthly_rent}/mo</span>}
                </div>
              ))}
              {availableUnits.length > 2 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{availableUnits.length - 2} more units
                </div>
              )}
            </div>
          </div>
        )}

        {/* For Sale Checkbox */}
        {showForSaleCheckbox && (
          <div className="flex-shrink-0">
            <ForSaleCheckbox 
              property={{
                id: property.id,
                address: property.street_address,
                city: property.city,
                state: property.state,
                monthly_rent: property.monthly_rent,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms
              }}
            />
          </div>
        )}

        {/* Amenities - Flexible container that takes remaining space */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="flex-1 min-h-0">
            <h4 className="font-medium text-sm mb-2">Amenities</h4>
            <div className="grid grid-cols-2 gap-2 h-full overflow-hidden">
              {property.amenities.slice(0, 4).map((amenity, index) => {
                const IconComponent = amenityIcons[amenity] || Home;
                return (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="p-1 rounded bg-openkey-blue/10">
                      <IconComponent className="h-3 w-3 text-openkey-blue flex-shrink-0" />
                    </div>
                    <span className="truncate">{amenity}</span>
                  </div>
                );
              })}
              {property.amenities.length > 4 && (
                <div className="text-sm text-openkey-blue font-medium col-span-2 text-center">
                  +{property.amenities.length - 4} more amenities
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interest Button - Always at bottom */}
        <div className="flex-shrink-0 mt-auto">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onInterestClick(property);
            }}
            className="w-full bg-gradient-blue-gold hover:bg-gradient-blue-gold/90 text-white border-0 hover-scale"
            disabled={isSubmittingInterest || hasApplied}
          >
            <Heart className="h-4 w-4 mr-2" />
            {isSubmittingInterest ? 'Submitting...' : 
             hasApplied ? 'Already Applied' : "I'm Interested"}
          </Button>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default BrowsePropertyCard;
