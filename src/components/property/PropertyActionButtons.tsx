
import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Phone, Calendar, Share2, Eye } from 'lucide-react';

interface PropertyActionButtonsProps {
  propertyId: string;
  onSaveProperty?: (id: string) => void;
  onCallLandlord?: () => void;
  onScheduleTour?: () => void;
  onShareProperty?: () => void;
  onViewDetails: () => void;
  isSaved?: boolean;
  landlordPhone?: string;
}

export const PropertyActionButtons = ({
  propertyId,
  onSaveProperty,
  onCallLandlord,
  onScheduleTour,
  onShareProperty,
  onViewDetails,
  isSaved = false,
  landlordPhone
}: PropertyActionButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSaveProperty?.(propertyId)}
        className={`flex-1 ${isSaved ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
      >
        <Heart className={`h-4 w-4 mr-1 ${isSaved ? 'fill-current' : ''}`} />
        {isSaved ? 'Saved' : 'Save'}
      </Button>
      
      {landlordPhone && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCallLandlord}
          className="flex-1"
        >
          <Phone className="h-4 w-4 mr-1" />
          Call
        </Button>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={onScheduleTour}
        className="flex-1"
      >
        <Calendar className="h-4 w-4 mr-1" />
        Tour
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onShareProperty}
        className="px-2"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        onClick={onViewDetails}
        className="bg-gradient-blue-gold hover:bg-gradient-blue-gold/90 text-white px-3"
      >
        <Eye className="h-4 w-4 mr-1" />
        Details
      </Button>
    </div>
  );
};
