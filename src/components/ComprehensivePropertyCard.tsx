import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ForSaleCheckbox } from '@/components/property/ForSaleCheckbox';
import { 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Square, 
  Heart, 
  CheckCircle, 
  Eye, 
  Map,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Car,
  Dumbbell,
  Waves,
  TreePine,
  Zap,
  Snowflake,
  Thermometer,
  WashingMachine,
  Home,
  PawPrint,
  Calendar,
  Star,
  MapPinIcon,
  Bus,
  Bike,
  Footprints,
  Shield,
  Clock,
  Building,
  Users,
  Camera
} from 'lucide-react';

// Test property data with comprehensive information
const testProperties: Property[] = [
  {
    id: '1',
    address: '123 Modern Living Blvd',
    city: 'San Francisco',
    state: 'CA',
    zipcode: '94105',
    bedrooms: 2,
    bathrooms: 2,
    monthly_rent: 3500,
    desired_rent: 3500,
    square_feet: 1200,
    year_built: 2020,
    property_type: 'apartment',
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560449752-65d9b2467242?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
    ],
    amenities: ['Pool', 'Gym', 'Parking', 'WiFi', 'AC', 'Heating', 'Laundry', 'Dishwasher'],
    special_offers: ['1 Month Free', '0% Security Deposit'],
    pet_policy: 'Dogs & Cats Allowed',
    lease_terms: ['12 months', '6 months'],
    walk_score: 92,
    bike_score: 85,
    transit_score: 78,
    move_in_date: '2024-08-01',
    description: 'Stunning modern apartment in the heart of downtown with floor-to-ceiling windows and premium finishes.',
    status: 'available',
    owner_id: 'owner1',
    unit_count: 1
  },
  {
    id: '2', 
    address: '456 Garden Vista Way',
    city: 'Austin',
    state: 'TX',
    zipcode: '78701',
    bedrooms: 3,
    bathrooms: 2.5,
    monthly_rent: 2800,
    desired_rent: 2800,
    square_feet: 1450,
    year_built: 2018,
    property_type: 'townhouse',
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
    ],
    amenities: ['Garden', 'Parking', 'WiFi', 'AC', 'Heating', 'Washer/Dryer'],
    special_offers: ['Pet Fee Waived'],
    pet_policy: 'Small Dogs Only',
    lease_terms: ['12 months'],
    walk_score: 78,
    bike_score: 82,
    transit_score: 65,
    move_in_date: '2024-07-15',
    description: 'Beautiful townhouse with private garden and modern upgrades throughout.',
    status: 'available',
    owner_id: 'owner2',
    unit_count: 1
  }
];

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  desired_rent?: number;
  rent?: number;
  square_feet?: number;
  year_built?: number;
  property_type?: string;
  photos: string[];
  amenities: string[];
  special_offers?: string[];
  pet_policy?: string;
  lease_terms?: string[];
  walk_score?: number;
  bike_score?: number;
  transit_score?: number;
  move_in_date?: string;
  description?: string;
  status: string;
  owner_id: string;
  unit_count?: number;
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
  // Grouped property fields
  isMultiUnit?: boolean;
  availableUnitCount?: number;
  minRent?: number;
  maxRent?: number;
  unitListings?: any[];
}

interface ComprehensivePropertyCardProps {
  property?: Property;
  onInterestClick: (property: Property) => void;
  showForSaleCheckbox?: boolean;
  onCardClick: (property: Property) => void;
  onViewOnMap?: (property: Property) => void;
  isSubmittingInterest: boolean;
  hasApplied: boolean;
  hasViewed: boolean;
  isUnitListing?: boolean;
  unitNumber?: string;
  unitName?: string;
  totalUnitsAvailable?: number;
}

const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Pool': Waves,
  'Gym': Dumbbell,
  'Parking': Car,
  'WiFi': Wifi,
  'AC': Snowflake,
  'Heating': Thermometer,
  'Laundry': WashingMachine,
  'Dishwasher': Home,
  'Garden': TreePine,
  'Washer/Dryer': WashingMachine,
  'Security': Shield
};

const ComprehensivePropertyCard = ({ 
  property: propProperty,
  onInterestClick, 
  onCardClick,
  onViewOnMap,
  isSubmittingInterest, 
  hasApplied,
  hasViewed,
  showForSaleCheckbox = false,
  isUnitListing = false,
  unitNumber,
  unitName,
  totalUnitsAvailable = 1
}: ComprehensivePropertyCardProps) => {
  // Use test data if no property provided
  const property = propProperty || testProperties[0];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const displayRent = property.rent || property.desired_rent || property.monthly_rent || 0;
  const photos = property.photos || [];

  // Multi-unit property detection and calculations
  const isMultiUnit = property.isMultiUnit || false;
  const availableUnits = property.unitListings || [];
  
  const getRentRange = () => {
    if (isMultiUnit && property.minRent && property.maxRent) {
      const minRent = property.minRent;
      const maxRent = property.maxRent;
      return minRent === maxRent ? `${minRent.toLocaleString()}` : `${minRent.toLocaleString()} - ${maxRent.toLocaleString()}`;
    }
    return displayRent.toLocaleString();
  };

  const getBedroomBathroomInfo = () => {
    if (isMultiUnit && availableUnits.length > 0) {
      const bedrooms = availableUnits.map((unit: any) => unit.bedrooms || 0).filter(Boolean);
      const bathrooms = availableUnits.map((unit: any) => unit.bathrooms || 0).filter(Boolean);
      
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
    
    return { bedText: property.bedrooms?.toString() || '0', bathText: property.bathrooms?.toString() || '0' };
  };

  const bedroomBathroomInfo = getBedroomBathroomInfo();

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % photos.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-openkey-green';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-openkey-green/10 text-openkey-green border-openkey-green/20';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-orange-100 text-orange-700 border-orange-200';
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden border-0 shadow-md flex flex-col h-full" onClick={() => onCardClick(property)}>
      {/* Special Offers Banner */}
      {property.special_offers && property.special_offers.length > 0 && (
        <div className="absolute top-3 left-3 z-20">
          <Badge className="bg-destructive text-destructive-foreground font-medium px-3 py-1">
            {property.special_offers[0]}
          </Badge>
        </div>
      )}

      {/* Status Badges */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        {isUnitListing && (unitName || unitNumber) && (
          <Badge className="bg-primary/90 text-primary-foreground border-0 backdrop-blur-sm">
            <Building className="h-3 w-3 mr-1" />
            Unit {unitName || unitNumber}
          </Badge>
        )}
        {isMultiUnit && property.availableUnitCount > 1 && (
          <Badge className="bg-accent/90 text-accent-foreground border-0 backdrop-blur-sm">
            <Users className="h-3 w-3 mr-1" />
            {property.availableUnitCount} Units Available
          </Badge>
        )}
        {hasApplied && (
          <Badge className="bg-openkey-green/90 text-white border-0 backdrop-blur-sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Applied
          </Badge>
        )}
        {hasViewed && (
          <Badge variant="outline" className="bg-white/90 text-primary border-primary/20 backdrop-blur-sm">
            <Eye className="h-3 w-3 mr-1" />
            Viewed
          </Badge>
        )}
      </div>

      <CardHeader className="p-0">
        {/* Image Gallery */}
        <div className="relative h-64 bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden group">
          {photos.length > 0 ? (
            <>
              <img 
                src={photos[currentImageIndex]} 
                alt={`Property ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Image Navigation */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  {/* Image Indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {photos.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
              
              {/* Photo Count */}
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {photos.length}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 flex flex-col flex-1">
        {/* ZONE 1: Fixed Top Content */}
        <div className="space-y-4">
          {/* Multi-Unit Badge */}
          {isMultiUnit && property.availableUnitCount && property.availableUnitCount > 1 && (
            <Badge variant="secondary" className="w-fit">
              {property.availableUnitCount} Units Available
            </Badge>
          )}
          
          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <DollarSign className="h-6 w-6 text-openkey-green" />
              <span className="text-2xl font-bold text-openkey-green">
                ${getRentRange()}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {property.year_built && (
              <Badge variant="outline" className="text-xs">
                Built {property.year_built}
              </Badge>
            )}
          </div>

          {/* Property Details */}
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span className="font-medium">{bedroomBathroomInfo.bedText}</span>
              <span className="text-sm">bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span className="font-medium">{bedroomBathroomInfo.bathText}</span>
              <span className="text-sm">bath</span>
            </div>
            {property.square_feet && (
              <div className="flex items-center gap-1">
                <Square className="h-4 w-4" />
                <span className="font-medium">{property.square_feet.toLocaleString()}</span>
                <span className="text-sm">sq ft</span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm truncate">
              {property.address}, {property.city}, {property.state} {property.zipcode}
            </span>
          </div>
        </div>

        {/* ZONE 2: Variable Middle Content - with flex-grow */}
        <div className="flex-1 space-y-4 mt-4">
          {/* Description - ALWAYS SHOW container */}
          <div className="min-h-[60px]">
            {property.description ? (
              <>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {property.description}
                </p>
                {property.description.length > 100 && (
                  <span className="text-sm text-primary font-medium cursor-pointer">... more</span>
                )}
              </>
            ) : (
              <div className="h-[60px]" />
            )}
          </div>

          {/* Move-in Date */}
          {property.move_in_date && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Available {new Date(property.move_in_date).toLocaleDateString()}</span>
            </div>
          )}

          {/* Walk/Bike/Transit Scores */}
          {(property.walk_score || property.bike_score || property.transit_score) && (
            <div className="flex gap-3">
              {property.walk_score && (
                <div className="flex items-center gap-1">
                  <Footprints className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm font-medium ${getScoreColor(property.walk_score)}`}>
                    {property.walk_score}
                  </span>
                  <span className="text-xs text-muted-foreground">Walk</span>
                </div>
              )}
              {property.bike_score && (
                <div className="flex items-center gap-1">
                  <Bike className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm font-medium ${getScoreColor(property.bike_score)}`}>
                    {property.bike_score}
                  </span>
                  <span className="text-xs text-muted-foreground">Bike</span>
                </div>
              )}
              {property.transit_score && (
                <div className="flex items-center gap-1">
                  <Bus className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm font-medium ${getScoreColor(property.transit_score)}`}>
                    {property.transit_score}
                  </span>
                  <span className="text-xs text-muted-foreground">Transit</span>
                </div>
              )}
            </div>
          )}

          {/* Amenities - ALWAYS SHOW the title section */}
          <div className="min-h-[100px]">
            <h4 className="font-medium text-sm mb-2">Amenities</h4>
            {property.amenities && property.amenities.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {property.amenities.slice(0, 6).map((amenity, index) => {
                  const IconComponent = amenityIcons[amenity] || Home;
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconComponent className="h-4 w-4 text-primary" />
                      <span>{amenity}</span>
                    </div>
                  );
                })}
                {property.amenities.length > 6 && (
                  <div className="text-sm text-primary font-medium col-span-2">
                    +{property.amenities.length - 6} more amenities
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No amenities listed</p>
            )}
          </div>

          {/* Pet Policy & Lease Terms */}
          <div className="flex flex-wrap gap-2">
            {property.pet_policy && (
              <Badge variant="outline" className="text-xs">
                <PawPrint className="h-3 w-3 mr-1" />
                {property.pet_policy}
              </Badge>
            )}
            {property.lease_terms && property.lease_terms.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {property.lease_terms.join(', ')} lease
              </Badge>
            )}
          </div>
        </div>

        {/* For Sale Checkbox */}
        {showForSaleCheckbox && (
          <ForSaleCheckbox 
            property={{
              id: property.id,
              address: property.address,
              city: property.city,
              state: property.state,
              monthly_rent: property.monthly_rent,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms
            }}
          />
        )}

        {/* ZONE 3: Fixed Bottom - Action Buttons */}
        <div className="flex gap-2 pt-4 mt-auto border-t">
          {onViewOnMap && (
            <Button 
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewOnMap(property);
              }}
              className="flex-1"
            >
              <Map className="h-4 w-4 mr-2" />
              View on Map
            </Button>
          )}
          
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              if (isMultiUnit) {
                onCardClick(property);
              } else {
                onInterestClick(property);
              }
            }}
            className="flex-1 bg-openkey-blue hover:bg-openkey-blue/90"
            disabled={isMultiUnit ? false : (isSubmittingInterest || hasApplied)}
          >
            {isMultiUnit ? (
              <>
                <Building className="h-4 w-4 mr-2" />
                View {property.availableUnitCount || 0} Units
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                {isSubmittingInterest ? 'Submitting...' : hasApplied ? 'Already Applied' : "Apply Now"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Demo component to show multiple test properties
export const PropertyCardDemo = () => {
  const handleInterestClick = (property: Property) => {
    console.log('Interest clicked for:', property.address);
  };

  const handleCardClick = (property: Property) => {
    console.log('Card clicked for:', property.address);
  };

  const handleViewOnMap = (property: Property) => {
    console.log('View on map clicked for:', property.address);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {testProperties.map((property) => (
        <ComprehensivePropertyCard
          key={property.id}
          property={property}
          onInterestClick={handleInterestClick}
          onCardClick={handleCardClick}
          onViewOnMap={handleViewOnMap}
          isSubmittingInterest={false}
          hasApplied={false}
          hasViewed={false}
        />
      ))}
    </div>
  );
};

export default ComprehensivePropertyCard;