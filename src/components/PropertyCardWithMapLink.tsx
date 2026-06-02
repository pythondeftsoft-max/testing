
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, DollarSign, Bed, Bath, Heart, CheckCircle, Eye, Map } from 'lucide-react';

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
  latitude?: number;
  longitude?: number;
  description?: string;
}

interface PropertyCardWithMapLinkProps {
  property: Property;
  onInterestClick: (property: Property) => void;
  onCardClick: (property: Property) => void;
  onViewOnMap: (property: Property) => void;
  isSubmittingInterest: boolean;
  hasApplied: boolean;
  hasViewed: boolean;
}

const PropertyCardWithMapLink = ({ 
  property, 
  onInterestClick, 
  onCardClick,
  onViewOnMap,
  isSubmittingInterest, 
  hasApplied,
  hasViewed 
}: PropertyCardWithMapLinkProps) => {
  const displayRent = property.desired_rent || property.monthly_rent;
  const firstImage = property.photos && property.photos.length > 0 ? property.photos[0] : null;
  const hasCoordinates = property.latitude && property.longitude;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer relative h-[500px] flex flex-col" 
      onClick={() => onCardClick(property)}
      data-property-id={property.id}
    >
      {/* Status Badges */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        {hasApplied && (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Applied
          </Badge>
        )}
        {hasViewed && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Eye className="h-3 w-3 mr-1" />
            Viewed
          </Badge>
        )}
      </div>

      <CardHeader className="p-0 flex-shrink-0">
        {/* Property Image */}
        <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-lg flex items-center justify-center overflow-hidden">
          {firstImage ? (
            <img 
              src={firstImage} 
              alt="Property" 
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <Home className="h-16 w-16 text-blue-400" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Rent */}
          <div className="flex items-center gap-1 text-xl font-bold text-green-600 flex-shrink-0">
            <DollarSign className="h-5 w-5" />
            ${displayRent}/month
          </div>

          {/* Bedroom/Bathroom Info */}
          <div className="flex items-center gap-4 text-gray-600 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms} bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms} bath</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-600 flex-shrink-0">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm line-clamp-2">
              {property.street_address && `${property.street_address}, `}
              {property.city}, {property.state} {property.zipcode}
            </span>
          </div>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 flex-1 items-start overflow-hidden">
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
          )}

          {/* Action Buttons - Always at bottom */}
          <div className="flex gap-2 mt-auto flex-shrink-0">
            {/* View on Map Button */}
            {hasCoordinates && (
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
            
            {/* Interest Button */}
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onInterestClick(property);
              }}
              className={`${hasCoordinates ? 'flex-1' : 'w-full'}`}
              disabled={isSubmittingInterest || hasApplied}
            >
              <Heart className="h-4 w-4 mr-2" />
              {isSubmittingInterest ? 'Submitting...' : 
               hasApplied ? 'Already Applied' : "I'm Interested"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCardWithMapLink;
