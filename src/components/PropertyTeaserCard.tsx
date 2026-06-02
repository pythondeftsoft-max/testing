import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Square, 
  Building,
  Lock,
  UserPlus,
  Camera,
  Eye
} from 'lucide-react';

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
  square_feet?: number;
  year_built?: number;
  property_type?: string;
  photos: string[];
  amenities: string[];
  property_units?: Array<{
    id: string;
    unit_number: string;
    unit_name: string;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number;
    status: string;
    square_feet: number;
  }>;
}

interface PropertyTeaserCardProps {
  property: Property;
  onInterestClick: (property: Property) => void;
  onCardClick: (property: Property) => void;
}

const PropertyTeaserCard = ({ 
  property,
  onInterestClick, 
  onCardClick
}: PropertyTeaserCardProps) => {
  const displayRent = property.desired_rent || property.monthly_rent;
  const photos = property.photos || [];
  const hasMultipleUnits = property.property_units && property.property_units.length > 0;

  // Calculate rent range for multi-unit properties
  const getRentRange = () => {
    if (!hasMultipleUnits) return null;
    
    const availableUnits = property.property_units!.filter(unit => unit.status === 'available');
    if (availableUnits.length === 0) return null;
    
    const rents = availableUnits.map(unit => unit.monthly_rent);
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);
    
    return minRent === maxRent ? minRent : `${minRent.toLocaleString()}-${maxRent.toLocaleString()}`;
  };

  const rentRange = getRentRange();

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden border-0 shadow-md bg-card">
      {/* Overlay for "locked" content */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 z-10 pointer-events-none" />
      
      <CardHeader className="p-0 relative">
        {/* Image with overlay */}
        <div className="relative h-48 bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden">
          {photos.length > 0 ? (
            <>
              <img 
                src={photos[0]} 
                alt="Property preview"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Photo count badge */}
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {photos.length}
              </div>
              
              {/* "More photos" overlay */}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 text-primary px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Sign up to see all {photos.length} photos
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Lock icon overlay */}
          <div className="absolute top-3 right-3 bg-white/90 text-primary p-2 rounded-full shadow-md">
            <Lock className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4 relative z-20" onClick={() => onCardClick(property)}>
        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="text-xl font-bold text-primary">
              {hasMultipleUnits && rentRange ? 
                (typeof rentRange === 'string' ? `$${rentRange}` : `$${rentRange.toLocaleString()}`) :
                `$${displayRent.toLocaleString()}`
              }
            </span>
            <span className="text-muted-foreground text-sm">/month</span>
          </div>
          {property.year_built && (
            <Badge variant="outline" className="text-xs">
              Built {property.year_built}
            </Badge>
          )}
        </div>

        {/* Property Details */}
        {hasMultipleUnits ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4" />
              <span className="font-medium text-sm">
                {property.property_units!.filter(unit => unit.status === 'available').length} Units Available
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Multiple floor plans available - sign up to see details
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span className="font-medium">{property.bedrooms}</span>
              <span className="text-sm">bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span className="font-medium">{property.bathrooms}</span>
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
        )}

        {/* Location */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm truncate">
            {property.city}, {property.state} {property.zipcode}
          </span>
        </div>

        {/* Amenities Preview */}
        {property.amenities && property.amenities.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {property.amenities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{property.amenities.length - 3} more
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Sign up to see all amenities and features
            </p>
          </div>
        )}

        {/* Call to Action */}
        <div className="pt-2 border-t border-muted/50">
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-foreground mb-2">
              Want to see more details?
            </p>
            <Button 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onInterestClick(property);
              }}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Sign Up Free to View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyTeaserCard;