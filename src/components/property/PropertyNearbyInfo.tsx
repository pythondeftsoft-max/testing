
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, GraduationCap, Shield, ShoppingCart } from 'lucide-react';

interface NearbyAmenity {
  name: string;
  distance: string;
  type: 'school' | 'safety' | 'shopping' | 'transit';
}

interface PropertyNearbyInfoProps {
  schoolRating?: number;
  safetyScore?: number;
  walkScore?: number;
  nearbyAmenities?: NearbyAmenity[];
}

export const PropertyNearbyInfo = ({
  schoolRating,
  safetyScore,
  walkScore,
  nearbyAmenities = []
}: PropertyNearbyInfoProps) => {
  const getAmenityIcon = (type: string) => {
    switch (type) {
      case 'school': return <GraduationCap className="h-3 w-3" />;
      case 'safety': return <Shield className="h-3 w-3" />;
      case 'shopping': return <ShoppingCart className="h-3 w-3" />;
      default: return <MapPin className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Scores */}
      <div className="flex gap-2">
        {schoolRating && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <GraduationCap className="h-3 w-3 mr-1" />
            Schools: {schoolRating}/10
          </Badge>
        )}
        
        {safetyScore && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <Shield className="h-3 w-3 mr-1" />
            Safety: {safetyScore}/10
          </Badge>
        )}
        
        {walkScore && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
            <MapPin className="h-3 w-3 mr-1" />
            Walk: {walkScore}/100
          </Badge>
        )}
      </div>

      {/* Nearby Amenities */}
      {nearbyAmenities.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Nearby:</div>
          <div className="flex flex-wrap gap-1">
            {nearbyAmenities.slice(0, 3).map((amenity, index) => (
              <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                {getAmenityIcon(amenity.type)}
                <span>{amenity.name} ({amenity.distance})</span>
              </div>
            ))}
            {nearbyAmenities.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{nearbyAmenities.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
