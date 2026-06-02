
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Shield, MessageCircle } from 'lucide-react';

interface PropertyTrustSignalsProps {
  landlordRating?: number;
  responseTime?: string;
  verifiedProperty?: boolean;
  reviewCount?: number;
}

export const PropertyTrustSignals = ({
  landlordRating,
  responseTime,
  verifiedProperty,
  reviewCount
}: PropertyTrustSignalsProps) => {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {landlordRating && (
        <div className="flex items-center gap-1 text-yellow-600">
          <Star className="h-3 w-3 fill-current" />
          <span className="font-medium">{landlordRating.toFixed(1)}</span>
          {reviewCount && <span className="text-muted-foreground">({reviewCount})</span>}
        </div>
      )}
      
      {responseTime && (
        <div className="flex items-center gap-1 text-green-600">
          <Clock className="h-3 w-3" />
          <span className="text-xs">Responds in {responseTime}</span>
        </div>
      )}
      
      {verifiedProperty && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      )}
    </div>
  );
};
