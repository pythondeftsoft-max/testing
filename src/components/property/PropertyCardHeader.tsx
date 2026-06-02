
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  CheckCircle, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Camera,
  Building,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PropertyCardHeaderProps {
  photos: string[];
  currentImageIndex: number;
  onNextImage: (e: React.MouseEvent) => void;
  onPrevImage: (e: React.MouseEvent) => void;
  hasApplied?: boolean;
  hasViewed?: boolean;
}

export const PropertyCardHeader: React.FC<PropertyCardHeaderProps> = ({
  photos,
  currentImageIndex,
  onNextImage,
  onPrevImage,
  hasApplied,
  hasViewed
}) => {
  return (
    <div className="relative h-64 bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden group">
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
                onClick={onPrevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onNextImage}
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
  );
};
