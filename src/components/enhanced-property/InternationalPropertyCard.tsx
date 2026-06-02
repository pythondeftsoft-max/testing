
import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Bed, Bath, Square, Eye, Star, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { InternationalAddressDisplay } from '@/components/ui/international-address-display';
import { useUserInternationalContext } from '@/hooks/useUserInternationalContext';
import { useInternationalProperty } from '@/hooks/useInternationalProperty';
import type { InternationalProperty } from '@/lib/internationalUtils';

interface InternationalPropertyCardProps {
  property: InternationalProperty & {
    id: string;
    bedrooms?: number;
    bathrooms?: number;
    square_feet?: number;
    photos?: string[];
    amenities?: string[];
    landlord_rating?: number;
    is_high_demand?: boolean;
    is_new_listing?: boolean;
    price_reduced?: boolean;
  };
  onInterestClick: (property: any) => void;
  onCardClick?: (property: any) => void;
  onSaveProperty?: (propertyId: string, saved: boolean) => void;
  isSubmittingInterest?: boolean;
  hasApplied?: boolean;
  hasViewed?: boolean;
  isSaved?: boolean;
  className?: string;
}

const InternationalPropertyCard: React.FC<InternationalPropertyCardProps> = ({
  property,
  onInterestClick,
  onCardClick = () => {},
  onSaveProperty = () => {},
  isSubmittingInterest = false,
  hasApplied = false,
  hasViewed = false,
  isSaved = false,
  className = ''
}) => {
  const { internationalContext } = useUserInternationalContext();
  const { processedProperty, isLoading } = useInternationalProperty(property, {
    targetCountry: internationalContext?.countryCode,
    autoDetectContext: true
  });

  const handleCardClick = () => {
    onCardClick(property);
  };

  const handleInterestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInterestClick(property);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveProperty(property.id, !isSaved);
  };

  if (isLoading || !processedProperty) {
    return (
      <Card className={`overflow-hidden animate-pulse ${className}`}>
        <CardContent className="p-0">
          <div className="h-48 bg-muted"></div>
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayProperty = processedProperty.property;
  const hasConversion = processedProperty.convertedAmounts?.rent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={className}
    >
      <Card 
        className="overflow-hidden cursor-pointer card-hover-gold transition-all duration-300"
        onClick={handleCardClick}
      >
        <CardContent className="p-0">
          {/* Property Image */}
          <div className="relative h-48 bg-muted">
            {displayProperty.photos && displayProperty.photos.length > 0 ? (
              <img
                src={displayProperty.photos[0]}
                alt="Property"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-12 h-12 text-muted-foreground" />
              </div>
            )}

            {/* Status Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {displayProperty.is_new_listing && (
                <Badge className="bg-green-600 text-white text-xs">New</Badge>
              )}
              {displayProperty.price_reduced && (
                <Badge className="bg-red-600 text-white text-xs">Price Drop</Badge>
              )}
              {displayProperty.is_high_demand && (
                <Badge className="bg-orange-600 text-white text-xs">High Demand</Badge>
              )}
              {hasViewed && (
                <Badge variant="secondary" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Viewed
                </Badge>
              )}
            </div>

            {/* Save Button */}
            <Button
              size="sm"
              variant={isSaved ? "default" : "secondary"}
              className="absolute top-2 right-2 p-2"
              onClick={handleSaveClick}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>

            {/* International Context Indicator */}
            {processedProperty.context && processedProperty.context.countryCode !== 'US' && (
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  {processedProperty.context.countryCode}
                </Badge>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="p-4 space-y-3">
            {/* Price */}
            <div className="space-y-1">
              <CurrencyDisplay
                amount={displayProperty.rent || 0}
                currency={internationalContext?.currency}
                countryCode={internationalContext?.countryCode}
                variant="large"
                className="font-bold"
              />
              {hasConversion && (
                <div className="text-sm text-muted-foreground">
                  Originally: <CurrencyDisplay
                    amount={displayProperty.rent || 0}
                    currency={displayProperty.currency}
                    variant="compact"
                  />
                </div>
              )}
            </div>

            {/* Address */}
            <InternationalAddressDisplay
              address={displayProperty.address}
              countryCode={displayProperty.countryCode}
              variant="single-line"
              className="text-muted-foreground"
            />

            {/* Property Features */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {displayProperty.bedrooms && (
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{displayProperty.bedrooms}</span>
                </div>
              )}
              {displayProperty.bathrooms && (
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{displayProperty.bathrooms}</span>
                </div>
              )}
              {displayProperty.square_feet && (
                <div className="flex items-center gap-1">
                  <Square className="w-4 h-4" />
                  <span>{displayProperty.square_feet.toLocaleString()} ft²</span>
                </div>
              )}
            </div>

            {/* Landlord Rating */}
            {displayProperty.landlord_rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{displayProperty.landlord_rating.toFixed(1)} Landlord Rating</span>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleInterestClick}
              disabled={hasApplied || isSubmittingInterest}
              className="w-full"
              variant={hasApplied ? "secondary" : "default"}
            >
              {hasApplied ? 'Applied' : isSubmittingInterest ? 'Submitting...' : 'Express Interest'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default InternationalPropertyCard;
