
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, Flame, MapPin, TrendingUp } from 'lucide-react';

interface PropertyUrgencyIndicatorsProps {
  isNewListing?: boolean;
  priceReduced?: boolean;
  applicantCount?: number;
  recentlyToured?: boolean;
  daysOnMarket?: number;
  isHighDemand?: boolean;
}

export const PropertyUrgencyIndicators = ({
  isNewListing,
  priceReduced,
  applicantCount,
  recentlyToured,
  daysOnMarket,
  isHighDemand
}: PropertyUrgencyIndicatorsProps) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {isNewListing && (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white border-0">
          <Flame className="h-3 w-3 mr-1" />
          New Listing
        </Badge>
      )}
      
      {priceReduced && (
        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-white border-0">
          <TrendingUp className="h-3 w-3 mr-1" />
          Price Reduced
        </Badge>
      )}
      
      {applicantCount && applicantCount > 0 && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          <Eye className="h-3 w-3 mr-1" />
          {applicantCount} interested
        </Badge>
      )}
      
      {recentlyToured && (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
          <MapPin className="h-3 w-3 mr-1" />
          Recently toured
        </Badge>
      )}
      
      {isHighDemand && (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 animate-pulse">
          <Flame className="h-3 w-3 mr-1" />
          High demand area
        </Badge>
      )}
      
      {daysOnMarket && daysOnMarket <= 7 && (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <Clock className="h-3 w-3 mr-1" />
          {daysOnMarket} days listed
        </Badge>
      )}
    </div>
  );
};
