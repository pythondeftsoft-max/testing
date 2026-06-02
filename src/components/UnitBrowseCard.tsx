import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Home, 
  DollarSign, 
  Bed, 
  Bath, 
  Heart, 
  CheckCircle, 
  Eye, 
  Map, 
  Building,
  ChevronLeft,
  ChevronRight,
  Square,
  Calendar,
  Camera,
  Wifi,
  Car,
  Dumbbell,
  Waves,
  TreePine,
  Snowflake,
  Thermometer,
  WashingMachine,
  Shield
} from 'lucide-react';

interface PropertyUnit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_name: string;
  monthly_rent: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  status: string;
  unit_amenities?: string[];
  photos?: string[];
  unit_photos?: string[];
  floor_number?: number;
  description?: string;
  property?: {
    address: string;
    city: string;
    state: string;
    zipcode: string;
    latitude?: number;
    longitude?: number;
  };
}

interface UnitBrowseCardProps {
  unit: PropertyUnit;
  onInterestClick: (unit: PropertyUnit) => void;
  onCardClick: (unit: PropertyUnit) => void;
  onViewOnMap?: (unit: PropertyUnit) => void;
  isSubmittingInterest: boolean;
  hasApplied: boolean;
  hasViewed: boolean;
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

const UnitBrowseCard = ({ 
  unit, 
  onInterestClick, 
  onCardClick,
  onViewOnMap,
  isSubmittingInterest, 
  hasApplied,
  hasViewed 
}: UnitBrowseCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const photos = unit.photos || unit.unit_photos || [];
  const hasCoordinates = unit.property?.latitude && unit.property?.longitude;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % photos.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden border-0 shadow-md">
      {/* Status Badges */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
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
        {/* Unit Image Gallery */}
        <div className="relative h-64 bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden group">
          {photos.length > 0 ? (
            <>
              <img 
                src={photos[currentImageIndex]} 
                alt={`Unit ${currentImageIndex + 1}`}
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
      
      <CardContent className="p-5 space-y-4" onClick={() => onCardClick(unit)}>
        {/* Unit Information */}
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">{unit.unit_name || `Unit ${unit.unit_number}`}</h3>
          <p className="text-sm text-muted-foreground">Unit #{unit.unit_number}</p>
        </div>

        {/* Rent */}
        <div className="flex items-center gap-1">
          <DollarSign className="h-6 w-6 text-openkey-green" />
          <span className="text-2xl font-bold text-openkey-green">
            {unit.monthly_rent?.toLocaleString()}
          </span>
          <span className="text-muted-foreground">/month</span>
        </div>

        {/* Unit Details */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span className="font-medium">{unit.bedrooms}</span>
            <span className="text-sm">bed</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span className="font-medium">{unit.bathrooms}</span>
            <span className="text-sm">bath</span>
          </div>
          {unit.square_feet && (
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              <span className="font-medium">{unit.square_feet.toLocaleString()}</span>
              <span className="text-sm">sq ft</span>
            </div>
          )}
        </div>

          {/* Property Location */}
          {unit.property && (
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                {unit.property.address}, {unit.property.city}, {unit.property.state} {unit.property.zipcode}
              </span>
            </div>
          )}

          {/* Floor Number */}
          {unit.floor_number && (
            <div className="text-sm text-muted-foreground">
              Floor {unit.floor_number}
            </div>
          )}

          {/* Unit Amenities */}
          {unit.unit_amenities && unit.unit_amenities.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Unit Amenities</h4>
              <div className="grid grid-cols-2 gap-2">
                {unit.unit_amenities.slice(0, 4).map((amenity, index) => {
                  const IconComponent = amenityIcons[amenity] || Home;
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconComponent className="h-4 w-4 text-primary" />
                      <span>{amenity}</span>
                    </div>
                  );
                })}
                {unit.unit_amenities.length > 4 && (
                  <div className="text-sm text-primary font-medium col-span-2">
                    +{unit.unit_amenities.length - 4} more amenities
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {/* View on Map Button */}
          {hasCoordinates && onViewOnMap && (
            <Button 
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewOnMap(unit);
              }}
              className="flex-1"
            >
              <Map className="h-4 w-4 mr-2" />
              View on Map
            </Button>
          )}
          
          {/* Interest Button */}
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onInterestClick(unit);
            }}
            className={`${hasCoordinates && onViewOnMap ? 'flex-1' : 'w-full'} bg-openkey-blue hover:bg-openkey-blue/90`}
            disabled={isSubmittingInterest || hasApplied}
          >
            <Heart className="h-4 w-4 mr-2" />
            {isSubmittingInterest ? 'Submitting...' : 
             hasApplied ? 'Already Applied' : "I'm Interested"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnitBrowseCard;