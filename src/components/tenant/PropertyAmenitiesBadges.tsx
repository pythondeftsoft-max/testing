import React from 'react';
import { Badge } from '@/components/ui/badge';
import { LISTING_AMENITIES } from '@/constants/listingAmenities';
import { 
  Wind, Sofa, WashingMachine, Trees, Car, PawPrint, 
  Utensils, Microwave, Refrigerator, Flame, TreeDeciduous, 
  Square, Thermometer, Dumbbell, Waves, Shield, Wifi, 
  Warehouse, ArrowUpDown, Accessibility, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

const amenityIcons: Record<string, React.ElementType> = {
  airConditioning: Wind,
  furnished: Sofa,
  inUnitLaundry: WashingMachine,
  sharedLaundry: WashingMachine,
  laundryHookups: WashingMachine,
  balconyPatio: TreeDeciduous,
  yardGarden: Trees,
  parkingAvailable: Car,
  petFriendly: PawPrint,
  dishwasher: Utensils,
  microwave: Microwave,
  refrigerator: Refrigerator,
  stoveOven: Flame,
  hardwoodFloors: Square,
  carpet: Square,
  tileFloors: Square,
  centralHeating: Thermometer,
  fireplace: Flame,
  walkinClosets: Warehouse,
  storageUnit: Warehouse,
  gymFitness: Dumbbell,
  pool: Waves,
  securitySystem: Shield,
  highSpeedInternet: Wifi,
  garage: Warehouse,
  elevator: ArrowUpDown,
  wheelchairAccessible: Accessibility,
  // Common text-based amenities
  'Air Conditioning': Wind,
  'Furnished': Sofa,
  'In-Unit Laundry': WashingMachine,
  'Shared Laundry': WashingMachine,
  'Laundry Hookups': WashingMachine,
  'Balcony/Patio': TreeDeciduous,
  'Yard/Garden': Trees,
  'Parking Available': Car,
  'Pet-Friendly': PawPrint,
  'Dishwasher': Utensils,
  'Microwave': Microwave,
  'Refrigerator': Refrigerator,
  'Stove/Oven': Flame,
  'Hardwood Floors': Square,
  'Carpet': Square,
  'Tile Floors': Square,
  'Central Heating': Thermometer,
  'Fireplace': Flame,
  'Walk-in Closets': Warehouse,
  'Storage Unit': Warehouse,
  'Gym/Fitness Center': Dumbbell,
  'Pool': Waves,
  'Security System': Shield,
  'High Speed Internet': Wifi,
  'Garage': Warehouse,
  'Elevator': ArrowUpDown,
  'Wheelchair Accessible': Accessibility,
};

interface PropertyAmenitiesBadgesProps {
  amenities: string[];
  className?: string;
  maxDisplay?: number;
}

const PropertyAmenitiesBadges: React.FC<PropertyAmenitiesBadgesProps> = ({
  amenities,
  className,
  maxDisplay = 12,
}) => {
  if (!amenities || amenities.length === 0) return null;

  const displayAmenities = amenities.slice(0, maxDisplay);
  const remainingCount = amenities.length - maxDisplay;

  // Try to get a display label for the amenity
  const getDisplayLabel = (amenity: string): string => {
    // Check if it's a key from LISTING_AMENITIES
    const listingAmenity = LISTING_AMENITIES.find(a => a.key === amenity);
    if (listingAmenity) return listingAmenity.label;
    
    // Otherwise, clean up the string for display
    return amenity;
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displayAmenities.map((amenity, index) => {
        const displayLabel = getDisplayLabel(amenity);
        const IconComponent = amenityIcons[amenity] || amenityIcons[displayLabel] || Check;
        return (
          <Badge
            key={`${amenity}-${index}`}
            variant="secondary"
            className="gap-1.5 py-1 px-2.5 text-xs font-medium bg-muted hover:bg-muted"
          >
            <IconComponent className="h-3 w-3" />
            {displayLabel}
          </Badge>
        );
      })}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
};

export default PropertyAmenitiesBadges;
