import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Calendar, 
  DollarSign, 
  Car, 
  Heart,
  Phone,
  Mail,
  Building,
  Wifi,
  Zap,
  Droplets,
  Trash2,
  Home,
  Shield,
  Camera,
  Users,
  X,
  Info,
  Star,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin as LocationIcon,
  FileText
} from 'lucide-react';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { useAuth } from '@/hooks/useAuth';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';
import QuickApplicationConfirmDialog from '@/components/applications/QuickApplicationConfirmDialog';

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
  // Amenity boolean fields
  shared_laundry?: boolean;
  laundry_hookups?: boolean;
  balcony_patio?: boolean;
  yard_garden?: boolean;
  parking_available?: boolean;
  pet_friendly?: boolean;
  dishwasher?: boolean;
  microwave?: boolean;
  refrigerator?: boolean;
  stove_oven?: boolean;
  hardwood_floors?: boolean;
  carpet?: boolean;
  tile_floors?: boolean;
  central_heating?: boolean;
  fireplace?: boolean;
  walkin_closets?: boolean;
  storage_unit?: boolean;
  gym_fitness?: boolean;
  pool?: boolean;
  security_system?: boolean;
  high_speed_internet?: boolean;
  garage_spaces?: number;
  elevator?: boolean;
  wheelchair_accessible?: boolean;
  in_unit_laundry?: boolean;
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
  on_market?: boolean;
}>;
  parentPropertyId?: string; // For grouped properties: the actual property ID
}

interface PropertyDetailsModalEnhancedProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onInterestClick: (property: Property) => void;
  onUnitInterestClick?: (unit: any) => void;
  isSubmittingInterest: boolean;
  hasApplied: boolean;
  currentUnitId?: string;
  hideBuildingUnits?: boolean;
}

const PropertyDetailsModalEnhanced = ({
  property,
  isOpen,
  onClose,
  onInterestClick,
  onUnitInterestClick = () => {},
  isSubmittingInterest,
  hasApplied,
  currentUnitId,
  hideBuildingUnits = false
}: PropertyDetailsModalEnhancedProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0); // Track which unit is displayed
  
  const { user } = useAuth();
  const { isSaved, toggleSaveProperty } = useSavedProperties(user?.id);
  const { mutate: logEvent } = useMarketplaceEvents();

  // Build amenities array from individual boolean columns (fallback for older listings)
  const buildAmenitiesFromBooleans = (property: Property) => {
    const amenitiesList: string[] = [];
    
    if (property.air_conditioning) amenitiesList.push('Air Conditioning');
    if (property.furnished) amenitiesList.push('Furnished');
    if (property.in_unit_laundry) amenitiesList.push('In-Unit Laundry');
    if (property.shared_laundry) amenitiesList.push('Shared Laundry');
    if (property.laundry_hookups) amenitiesList.push('Laundry Hookups');
    if (property.balcony_patio) amenitiesList.push('Balcony/Patio');
    if (property.yard_garden) amenitiesList.push('Yard/Garden');
    if (property.parking_available) amenitiesList.push('Parking Available');
    if (property.pet_friendly) amenitiesList.push('Pet-Friendly');
    if (property.dishwasher) amenitiesList.push('Dishwasher');
    if (property.microwave) amenitiesList.push('Microwave');
    if (property.refrigerator) amenitiesList.push('Refrigerator');
    if (property.stove_oven) amenitiesList.push('Stove/Oven');
    if (property.hardwood_floors) amenitiesList.push('Hardwood Floors');
    if (property.carpet) amenitiesList.push('Carpet');
    if (property.tile_floors) amenitiesList.push('Tile Floors');
    if (property.central_heating) amenitiesList.push('Central Heating');
    if (property.fireplace) amenitiesList.push('Fireplace');
    if (property.walkin_closets) amenitiesList.push('Walk-in Closets');
    if (property.storage_unit) amenitiesList.push('Storage Unit');
    if (property.gym_fitness) amenitiesList.push('Gym/Fitness Center');
    if (property.pool) amenitiesList.push('Pool');
    if (property.security_system) amenitiesList.push('Security System');
    if (property.high_speed_internet) amenitiesList.push('High Speed Internet');
    if (property.garage_spaces && property.garage_spaces > 0) amenitiesList.push('Garage');
    if (property.elevator) amenitiesList.push('Elevator');
    if (property.wheelchair_accessible) amenitiesList.push('Wheelchair Accessible');
    
    return amenitiesList;
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Reset application form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowApplicationForm(false);
      setSelectedUnitId(null);
      setSelectedUnitIndex(0);
    }
  }, [isOpen]);

  // Reset selectedUnitIndex when property changes
  useEffect(() => {
    setSelectedUnitIndex(0);
  }, [property?.id]);

  if (!property) {
    return null;
  }

  // Detect if this is a unit listing from marketplace transformation
  const isUnitListing = (property as any).type === 'unit';
  
  // Detect if this is a grouped multi-unit property
  const isGroupedMultiUnit = (property as any).isMultiUnit && (property as any).unitListings;
  const availableUnits = isGroupedMultiUnit ? (property as any).unitListings : [];
  
  // Get currently displayed unit (either from selector or the property itself)
  const displayedUnit = isGroupedMultiUnit ? availableUnits[selectedUnitIndex] : property;
  
  const displayRent = (displayedUnit as any).rent || (displayedUnit as any).desiredRent || displayedUnit.monthly_rent || 0;
  // Ensure photos and amenities are arrays, with fallback to property photos
  const unitPhotos = Array.isArray(displayedUnit.photos) ? displayedUnit.photos : [];
  const propertyPhotos = Array.isArray(property.photos) ? property.photos : [];
  const photos = unitPhotos.length > 0 ? unitPhotos : propertyPhotos;
  // First try to use amenities array, fallback to building from boolean columns
  const amenities = Array.isArray(displayedUnit.amenities) && displayedUnit.amenities.length > 0 
    ? displayedUnit.amenities 
    : buildAmenitiesFromBooleans(property);

  console.log('🏠 PropertyDetailsModal received:', {
    type: (property as any).type,
    photos: photos.length,
    amenities: amenities.length,
    address: property.address,
    city: property.city,
    state: property.state,
    zipcode: property.zipcode,
    firstPhoto: photos[0],
    firstAmenity: amenities[0]
  });
  const propertyUnits = property.property_units || [];
  
  // Unit identifier for unit listings
  const unitIdentifier = isUnitListing ? ((property as any).unitName || (property as any).unitNumber) : null;
  
  // Filter out the current unit/property to avoid showing it in "Available Units in This Building"
  const otherAvailableUnits = propertyUnits.filter(unit => {
    // Exclude if it's the currently viewed unit
    if (currentUnitId && unit.id === currentUnitId) return false;
    
    // Exclude if the unit ID matches the property ID (property representing itself)
    if (unit.id === property.id) return false;
    
    // Only include units that are actively on market
    return unit.on_market === true;
  });
  
  // Only show section for TRUE multi-unit buildings (2+ total units) with other available units
  const shouldShowUnitsSection = propertyUnits.length >= 2 && otherAvailableUnits.length > 0;
  
  const rawAddress = property.address || 
    `${property.street_address || ''}${property.city ? ', ' + property.city : ''}${property.state ? ', ' + property.state : ''}${property.zipcode ? ' ' + property.zipcode : ''}`.trim();
  // Avoid duplicating city/state/zip if already in the address string
  const address = rawAddress && property.city && rawAddress.toLowerCase().includes(property.city.toLowerCase())
    ? rawAddress
    : `${rawAddress}${property.city ? ', ' + property.city : ''}${property.state ? ', ' + property.state : ''}${property.zipcode ? ' ' + property.zipcode : ''}`.trim();

  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="h-4 w-4" />;
    if (lower.includes('parking') || lower.includes('garage')) return <Car className="h-4 w-4" />;
    if (lower.includes('laundry') || lower.includes('washer')) return <Droplets className="h-4 w-4" />;
    if (lower.includes('air') || lower.includes('ac')) return <Zap className="h-4 w-4" />;
    if (lower.includes('security') || lower.includes('alarm')) return <Shield className="h-4 w-4" />;
    if (lower.includes('gym') || lower.includes('fitness')) return <Users className="h-4 w-4" />;
    if (lower.includes('pool')) return <Droplets className="h-4 w-4" />;
    if (lower.includes('balcony') || lower.includes('patio')) return <Home className="h-4 w-4" />;
    return <Building className="h-4 w-4" />;
  };

  const handleInterestClick = () => {
    if (property) {
      // For grouped multi-unit properties, use the currently displayed unit
      const unitIdToUse = isGroupedMultiUnit && displayedUnit 
        ? displayedUnit.id 
        : null;
      
      logEvent({ 
        eventType: 'application_started',
        metadata: { 
          property_id: property.id,
          unit_id: unitIdToUse,
          action_type: 'quick_apply',
          property_type: property.property_type || 'unknown'
        }
      });
      setShowApplicationForm(true);
      setSelectedUnitId(unitIdToUse);
    }
  };

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);
    onClose();
  };

  const handleUnitInterestClick = (unit: any) => {
    logEvent({ 
      eventType: 'application_started',
      metadata: { 
        property_id: property?.id,
        unit_id: unit.id,
        action_type: 'apply_for_unit',
        unit_number: unit.unit_number
      }
    });
    setSelectedUnitId(unit.id);
    setShowApplicationForm(true);
  };

  const toggleUnitExpansion = (unitId: string) => {
    setExpandedUnitId(expandedUnitId === unitId ? null : unitId);
  };

  const renderUnitSelector = () => {
    if (!isGroupedMultiUnit || availableUnits.length <= 1) return null;

    return (
      <div className="my-6">
        <h3 className="text-sm font-medium text-foreground mb-3">
          Select a Unit ({availableUnits.length} available)
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {availableUnits.map((unit: any, index: number) => {
            const unitRent = unit.rent || unit.monthly_rent || 0;
            const isSelected = index === selectedUnitIndex;
            
            return (
              <button
                key={unit.id || index}
                onClick={() => setSelectedUnitIndex(index)}
                className={`
                  flex-shrink-0 w-[120px] p-3 rounded-lg border-2 transition-all
                  ${isSelected 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-border hover:border-muted-foreground hover:shadow-sm'
                  }
                `}
              >
                <div className="space-y-1.5">
                  {/* Bed/Bath */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Bed className="w-3 h-3" />
                      <span>{unit.bedrooms || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-3 h-3" />
                      <span>{unit.bathrooms || 0}</span>
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="text-sm font-semibold text-foreground">
                    ${unitRent.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">/month</div>
                  
                  {/* Unit Identifier */}
                  {(unit.unitName || unit.unitNumber) && (
                    <div className="text-xs text-muted-foreground truncate">
                      Unit {unit.unitName || unit.unitNumber}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderUnitDetails = (unit: any) => {
    const isExpanded = expandedUnitId === unit.id;
    
    return (
      <div key={unit.id} className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="text-lg font-semibold mb-2">{unit.unit_name || `Unit ${unit.unit_number}`}</h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{unit.bedrooms} bed{unit.bedrooms !== 1 ? 's' : ''}</span>
                <span>{unit.bathrooms} bath{unit.bathrooms !== 1 ? 's' : ''}</span>
                {unit.square_feet && <span>{unit.square_feet} sq ft</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold mb-2">${unit.monthly_rent.toLocaleString()}/month</div>
              <Badge 
                variant={unit.status === 'available' ? 'default' : 'secondary'}
                className="text-xs px-2 py-1"
              >
                {unit.status}
              </Badge>
            </div>
          </div>
          
          {unit.description && !isExpanded && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{unit.description}</p>
          )}
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleUnitExpansion(unit.id)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {isExpanded ? 'Hide Details' : 'View Details'}
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {unit.status === 'available' && (
              <Button
                onClick={() => handleUnitInterestClick(unit)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                Apply for This Unit
              </Button>
            )}
          </div>
        </div>

        <Collapsible open={isExpanded}>
          <CollapsibleContent className="border-t bg-gray-50">
            <div className="p-5 space-y-6">
              {/* Unit Photos */}
              {((unit.photos && unit.photos.length > 0) || (unit.unit_photos && unit.unit_photos.length > 0)) && (
                <div>
                  <h5 className="font-medium mb-3">Unit Photos</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(unit.photos || unit.unit_photos).map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Unit ${unit.unit_number} - ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Full Description */}
              {unit.description && (
                <div>
                  <h5 className="font-medium mb-3">Description</h5>
                  <p className="text-sm text-gray-600 leading-relaxed">{unit.description}</p>
                </div>
              )}

              {/* Unit Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium mb-3">Unit Details</h5>
                  <div className="space-y-2">
                    {unit.floor_number && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-gray-600">Floor</span>
                        <span className="text-sm font-medium">{unit.floor_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600">Bedrooms</span>
                      <span className="text-sm font-medium">{unit.bedrooms}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600">Bathrooms</span>
                      <span className="text-sm font-medium">{unit.bathrooms}</span>
                    </div>
                    {unit.square_feet && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-gray-600">Square Feet</span>
                        <span className="text-sm font-medium">{unit.square_feet}</span>
                      </div>
                    )}
                    {unit.unit_outdoor_space_type && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-gray-600">Outdoor Space</span>
                        <span className="text-sm font-medium capitalize">
                          {unit.unit_outdoor_space_type}
                          {unit.unit_outdoor_space_size && ` (${unit.unit_outdoor_space_size})`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Unit-Specific Amenities */}
                <div>
                  <h5 className="font-medium mb-3">Unit Features</h5>
                  {unit.unit_amenities && unit.unit_amenities.length > 0 ? (
                    <div className="space-y-2">
                      {unit.unit_amenities.map((amenity: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          {getAmenityIcon(amenity)}
                          <span className="text-sm">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No unit-specific amenities listed</p>
                  )}
                </div>
              </div>

              {/* Video Tour */}
              {unit.video_tour_url && (
                <div>
                  <h5 className="font-medium mb-3">Video Tour</h5>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(unit.video_tour_url, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Watch Unit Tour
                  </Button>
                </div>
              )}

              {/* Unit Location Within Building */}
              {(unit.unit_position || unit.unit_type) && (
                <div>
                  <h5 className="font-medium mb-3">Location in Building</h5>
                  <div className="flex items-center gap-2 text-sm">
                    <LocationIcon className="h-4 w-4 text-gray-500" />
                    <span>
                      {unit.unit_position && `${unit.unit_position} unit`}
                      {unit.unit_position && unit.unit_type && ' • '}
                      {unit.unit_type && unit.unit_type}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const renderContent = () => (
    <div className="space-y-6 pb-8">
      {/* Property Images Section */}
      {photos.length > 0 ? (
        <div className="space-y-2">
          <div className="relative group">
            <img
              src={photos[selectedImageIndex] || photos[0]}
              alt="Property"
              className="w-full h-[28rem] object-cover rounded-xl cursor-pointer"
              onClick={() => setShowImageGallery(true)}
            />
            
            {/* Image Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-10 h-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={handlePrevImage}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-10 h-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                
                {/* Image Indicator Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {photos.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Property ${index + 1}`}
                  className={`w-16 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0 transition-all ${
                    selectedImageIndex === index ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/50'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                />
              ))}
              <div
                className="w-16 h-16 bg-black/70 rounded-lg cursor-pointer flex-shrink-0 flex flex-col items-center justify-center text-white hover:bg-black/80 transition-all"
                onClick={() => setShowImageGallery(true)}
              >
                <Camera className="h-4 w-4 mb-1" />
                <span className="text-xs">View All</span>
                <span className="text-xs">({photos.length})</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-muted/50 h-80 rounded-xl flex items-center justify-center border border-border">
          <div className="text-center text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No images available</p>
          </div>
        </div>
      )}

      {/* Property Header */}
      <div>
        {/* Unit Identifier Badge - Show if this is a unit listing */}
            {isUnitListing && (
              <div className="mb-4 bg-primary/10 border border-primary/20 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">
                  Individual unit within a multi-unit property
                </span>
              </div>
            )}
        
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              {(property as any).rentRangeDisplay 
                ? `${(property as any).rentRangeDisplay}/month` 
                : `$${displayRent.toLocaleString()}/month`}
            </h2>
          </div>
          <Badge 
            variant={property.status === 'available' ? 'default' : 'secondary'}
            className="px-3 py-1"
          >
            {property.status || 'Available'}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => toggleSaveProperty(property.id)}
            className="flex-1"
          >
            <Heart className={`h-4 w-4 mr-2 ${isSaved(property.id) ? 'fill-current text-red-500' : ''}`} />
            {isSaved(property.id) ? 'Saved' : 'Save'}
          </Button>
          <Button
            onClick={() => {
              if (isGroupedMultiUnit) {
                // Apply for the currently selected unit
                handleUnitInterestClick(displayedUnit);
              } else {
                handleInterestClick();
              }
            }}
            disabled={isSubmittingInterest || hasApplied}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            {hasApplied ? 'Application Submitted' : 
             isSubmittingInterest ? 'Submitting...' : 
             'Apply Now'}
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* 🎯 INSERT UNIT SELECTOR HERE */}
      {renderUnitSelector()}

      {/* Property Description */}
      {displayedUnit.description && (
        <>
          <div>
            <h3 className="text-xl font-semibold mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{displayedUnit.description}</p>
          </div>
          <Separator className="my-6" />
        </>
      )}

      {/* Details Section - Consolidated */}
      <div>
        <h3 className="text-xl font-semibold mb-5">Details</h3>
        
        {/* Basic Information - Only show if data exists */}
        {((property as any).propertyType || (property as any).yearBuilt || displayedUnit.bedrooms || displayedUnit.bathrooms || (displayedUnit as any).squareFeet) && (
          <>
            <h4 className="font-medium mb-4 text-gray-900">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 mb-8">
              {(property as any).propertyType && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Property Type</span>
                  <span className="capitalize font-medium">{(property as any).propertyType}</span>
                </div>
              )}
              {(property as any).yearBuilt && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Year Built</span>
                  <span className="font-medium">{(property as any).yearBuilt}</span>
                </div>
              )}
              {displayedUnit.bedrooms !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Bedrooms</span>
                  <span className="font-medium">{displayedUnit.bedrooms}</span>
                </div>
              )}
              {displayedUnit.bathrooms !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Bathrooms</span>
                  <span className="font-medium">{displayedUnit.bathrooms}</span>
                </div>
              )}
              {(displayedUnit as any).squareFeet && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Square Feet</span>
                  <span className="font-medium">{(displayedUnit as any).squareFeet.toLocaleString()}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Amenities - Only show selected ones */}
        {amenities.length > 0 && (
          <>
            <h4 className="font-medium mb-4 text-gray-900">Amenities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {amenities.map((amenity, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  {getAmenityIcon(amenity)}
                  <span className="ml-3">{amenity}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Walkability Scores - Only show if data exists */}
        {((property as any).walkScore || (property as any).bikeScore || (property as any).transitScore) && (
          <>
            <h4 className="font-medium mb-4 text-gray-900">Walkability Scores</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(property as any).walkScore && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600 mb-1">{(property as any).walkScore}/100</div>
                  <div className="text-sm text-gray-600">Walk Score</div>
                </div>
              )}
              {(property as any).bikeScore && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600 mb-1">{(property as any).bikeScore}/100</div>
                  <div className="text-sm text-gray-600">Bike Score</div>
                </div>
              )}
              {(property as any).transitScore && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600 mb-1">{(property as any).transitScore}/100</div>
                  <div className="text-sm text-gray-600">Transit Score</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Units Section - Only show if NOT a grouped multi-unit (to avoid duplication) and not hidden */}
      {shouldShowUnitsSection && !isGroupedMultiUnit && !hideBuildingUnits && (
        <>
          <Separator className="my-6" />
          <div>
            <div className="mb-5">
              <h3 className="text-xl font-semibold mb-2">Available Units in This Building</h3>
              <div className="flex items-center text-gray-600 text-sm">
                <Building className="h-4 w-4 mr-2" />
                <span>{address}</span>
              </div>
            </div>
            <div className="space-y-4">
              {otherAvailableUnits.map((unit) => renderUnitDetails(unit))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="px-8 py-6 border-b">
            <DialogTitle className="text-xl font-bold">
              {property ? `${address}${
                isGroupedMultiUnit && displayedUnit 
                  ? ` - Unit ${(displayedUnit as any).unitName || (displayedUnit as any).unitNumber || (selectedUnitIndex + 1)}` 
                  : unitIdentifier ? ` - Unit ${unitIdentifier}` 
                  : ''
              }` : 'Property Details'}
            </DialogTitle>
            {property && (
              <div className="flex items-center gap-6 text-muted-foreground mt-2">
                <div className="flex items-center">
                  <Bed className="h-4 w-4 mr-2" />
                  <span>{displayedUnit.bedrooms || 0} bed{(displayedUnit.bedrooms || 0) !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center">
                  <Bath className="h-4 w-4 mr-2" />
                  <span>{displayedUnit.bathrooms || 0} bath{(displayedUnit.bathrooms || 0) !== 1 ? 's' : ''}</span>
                </div>
                {displayedUnit.square_feet && (
                  <div className="flex items-center">
                    <Square className="h-4 w-4 mr-2" />
                    <span>{displayedUnit.square_feet.toLocaleString()} sq ft</span>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="px-8 py-6">
              {renderContent()}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Image Gallery Modal */}
      {showImageGallery && photos.length > 0 && (
        <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
          <DialogContent className="max-w-5xl max-h-[90vh] p-0">
            <div className="relative group">
              <img
                src={photos[selectedImageIndex]}
                alt="Property"
                className="w-full h-[82vh] object-contain bg-black"
              />
              
              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 text-white hover:bg-black/90 rounded-full w-12 h-12 p-0 transition-all z-20"
                    onClick={handlePrevImage}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 text-white hover:bg-black/90 rounded-full w-12 h-12 p-0 transition-all z-20"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
              
              <div className="flex gap-2 p-3 overflow-x-auto bg-gray-50">
                {photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Property ${index + 1}`}
                    className={`w-14 h-14 object-cover rounded-lg cursor-pointer flex-shrink-0 ${
                      selectedImageIndex === index ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  />
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Application Dialog - opens on top of property details */}
      {showApplicationForm && property && (
        <QuickApplicationConfirmDialog
          isOpen={showApplicationForm}
          onClose={() => setShowApplicationForm(false)}
          property={
            isGroupedMultiUnit && displayedUnit 
              ? { 
                  ...displayedUnit, 
                  type: 'unit' as const,
                  parentPropertyId: property.parentPropertyId || property.id,
                  monthly_rent: (displayedUnit as any).rent || (displayedUnit as any).monthly_rent || 0,
                }
              : property
          }
          unitId={selectedUnitId}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </>
  );
};

export default PropertyDetailsModalEnhanced;
