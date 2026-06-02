
import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { ForSaleCheckbox } from '@/components/property/ForSaleCheckbox';
import { PropertyCardHeader } from './property/PropertyCardHeader';
import { PropertyUrgencyIndicators } from './property/PropertyUrgencyIndicators';
import { PropertyTrustSignals } from './property/PropertyTrustSignals';
import { PropertyFinancialBreakdown } from './property/PropertyFinancialBreakdown';
import { PropertyActionButtons } from './property/PropertyActionButtons';
import { PropertyNearbyInfo } from './property/PropertyNearbyInfo';
import { 
  MapPin, 
  Home, 
  DollarSign, 
  Bed, 
  Bath, 
  Users,
  Video,
  Calendar
} from 'lucide-react';

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
  // Enhanced fields for new features
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
  walk_score?: number;
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

interface EnhancedBrowsePropertyCardProps {
  property: Property;
  onInterestClick: (property: Property) => void;
  onCardClick: (property: Property) => void;
  isSubmittingInterest: boolean;
  hasApplied: boolean;
  hasViewed: boolean;
  isSaved?: boolean;
  onSaveProperty?: (id: string) => void;
  showForSaleCheckbox?: boolean;
}

const EnhancedBrowsePropertyCard = ({ 
  property, 
  onInterestClick, 
  onCardClick,
  isSubmittingInterest, 
  hasApplied,
  hasViewed,
  isSaved = false,
  onSaveProperty,
  showForSaleCheckbox = false
}: EnhancedBrowsePropertyCardProps) => {
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
  
  const isMultiUnit = property.unit_count > 1 && property.property_units && property.property_units.length > 0;
  const availableUnits = isMultiUnit ? property.property_units.filter(unit => unit.status === 'available') : [];
  
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

  const handleCallLandlord = () => {
    if (property.landlord_phone) {
      window.location.href = `tel:${property.landlord_phone}`;
    }
  };

  const handleScheduleTour = () => {
    // Open tour scheduling modal or navigate to scheduling page
    console.log('Schedule tour for property:', property.id);
  };

  const handleShareProperty = () => {
    if (navigator.share) {
      navigator.share({
        title: `Property at ${property.street_address}`,
        text: `Check out this property: ${getRentRange()}/month`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <CardEnhanced 
      variant="elevated" 
      className="group h-[700px] flex flex-col card-hover animate-fade-in-up"
      onClick={() => onCardClick(property)}
    >
      <CardEnhancedHeader className="p-0 flex-shrink-0 relative">
        <PropertyCardHeader 
          photos={photos}
          currentImageIndex={currentImageIndex}
          onNextImage={nextImage}
          onPrevImage={prevImage}
          hasApplied={hasApplied}
          hasViewed={hasViewed}
        />
        
        {/* Video Tour Badge */}
        {property.video_tour_url && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-black/70 text-white border-0">
              <Video className="h-3 w-3 mr-1" />
              Video Tour
            </Badge>
          </div>
        )}
        
        {/* Urgency Indicators */}
        <div className="absolute bottom-2 left-2 right-2 z-10">
          <PropertyUrgencyIndicators
            isNewListing={property.is_new_listing}
            priceReduced={property.price_reduced}
            applicantCount={property.applicant_count}
            recentlyToured={property.recently_toured}
            daysOnMarket={property.days_on_market}
            isHighDemand={property.is_high_demand}
          />
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Rent */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="p-1 rounded-lg bg-gradient-blue-gold">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gradient-blue-gold">
            {getRentRange()}
          </span>
          <span className="text-muted-foreground text-sm">/month</span>
          {property.move_in_special && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs ml-2">
              Special Offer
            </Badge>
          )}
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

        {/* Trust Signals */}
        <div className="flex-shrink-0">
          <PropertyTrustSignals
            landlordRating={property.landlord_rating}
            responseTime={property.landlord_response_time}
            verifiedProperty={property.verified_property}
            reviewCount={property.review_count}
          />
        </div>

        {/* Nearby Info */}
        <div className="flex-shrink-0">
          <PropertyNearbyInfo
            schoolRating={property.school_rating}
            safetyScore={property.safety_score}
            walkScore={property.walk_score}
            nearbyAmenities={property.nearby_amenities}
          />
        </div>

        {/* Financial Breakdown */}
        <div className="flex-shrink-0">
          <PropertyFinancialBreakdown
            monthlyRent={displayRent}
            securityDeposit={property.security_deposit}
            applicationFee={property.application_fee}
            utilityEstimate={property.utility_estimate}
            moveInSpecial={property.move_in_special}
          />
        </div>

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

        {/* Amenities - Flexible container */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="flex-1 min-h-0">
            <h4 className="font-medium text-sm mb-2">Amenities</h4>
            <div className="grid grid-cols-2 gap-1 h-full overflow-hidden">
              {property.amenities.slice(0, 4).map((amenity, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="p-1 rounded bg-openkey-blue/10">
                    <Home className="h-3 w-3 text-openkey-blue flex-shrink-0" />
                  </div>
                  <span className="truncate">{amenity}</span>
                </div>
              ))}
              {property.amenities.length > 4 && (
                <div className="text-sm text-openkey-blue font-medium col-span-2 text-center">
                  +{property.amenities.length - 4} more amenities
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Always at bottom */}
        <div className="flex-shrink-0 mt-auto space-y-2">
          <PropertyActionButtons
            propertyId={property.id}
            onSaveProperty={onSaveProperty}
            onCallLandlord={handleCallLandlord}
            onScheduleTour={handleScheduleTour}
            onShareProperty={handleShareProperty}
            onViewDetails={() => onCardClick(property)}
            isSaved={isSaved}
            landlordPhone={property.landlord_phone}
          />
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default EnhancedBrowsePropertyCard;
