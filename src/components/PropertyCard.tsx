
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, DollarSign } from 'lucide-react';
import { ForSaleCheckbox } from '@/components/property/ForSaleCheckbox';

interface PropertyCardProps {
  property: any;
  onRequestScreening: (property: any) => void;
  onMoreInfo?: (property: any) => void;
  onSkip?: (property: any) => void;
  showPersonalizedActions?: boolean;
}

const PropertyCard = ({ 
  property, 
  onRequestScreening, 
  onMoreInfo, 
  onSkip, 
  showPersonalizedActions = false 
}: PropertyCardProps) => {
  // Use desired_rent if available, otherwise fall back to monthly_rent
  const displayRent = property.desired_rent || property.monthly_rent;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Home className="h-4 w-4" />
          {property.bedrooms && property.bathrooms ? 
            `${property.bedrooms}br/${property.bathrooms}ba` : 
            `${property.unit_count} unit(s)`
          }
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {property.city && property.state ? 
            `${property.city}, ${property.state} ${property.zipcode || ''}`.trim() :
            (property.zipcode || 'Location not specified')
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-1 text-lg font-semibold">
            <DollarSign className="h-5 w-5" />
            ${displayRent}/month
          </div>

          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          )}

          <ForSaleCheckbox 
            property={property} 
            className="mb-2"
          />

          {showPersonalizedActions ? (
            <div className="flex space-x-2">
              {onMoreInfo && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onMoreInfo(property)}
                  className="flex-1"
                >
                  More Info
                </Button>
              )}
              <Button 
                onClick={() => onRequestScreening(property)}
                className="flex-1"
              >
                Apply
              </Button>
              {onSkip && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onSkip(property)}
                >
                  Skip
                </Button>
              )}
            </div>
          ) : (
            <Button 
              onClick={() => onRequestScreening(property)}
              className="w-full"
            >
              Request Screening
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;
