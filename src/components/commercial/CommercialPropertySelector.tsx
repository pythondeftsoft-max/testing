
import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  ShoppingCart, 
  Warehouse, 
  Factory, 
  Hotel, 
  TreePine,
  Layers
} from 'lucide-react';
import { CommercialPropertyType, CommercialSubType } from '@/types/commercial';

interface CommercialPropertySelectorProps {
  onSelectType: (type: CommercialPropertyType, subtype?: CommercialSubType) => void;
  selectedType?: CommercialPropertyType;
  selectedSubtype?: CommercialSubType;
}

// Unsplash images for each subtype (free, no API key needed)
const subtypeImages: Record<string, string> = {
  // Office
  office_building: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
  medical: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400',
  coworking_space: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
  call_center: 'https://images.unsplash.com/photo-1560264418-c4445382edbc?w=400',
  government_office: 'https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=400',
  // Retail
  shopping_center: 'https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=400',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
  strip_mall: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
  convenience_store: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
  gas_station: 'https://images.unsplash.com/photo-1565620731358-e8c038abc8d1?w=400',
  car_dealership: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400',
  // Warehouse
  warehouse_distribution: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
  self_storage: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400',
  cold_storage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  truck_terminal: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400',
  fulfillment_center: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=400',
  // Industrial
  manufacturing: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=400',
  flex_space: 'https://images.unsplash.com/photo-1565183928294-7063f23ce0f8?w=400',
  data_center: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400',
  recycling_facility: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400',
  food_processing: 'https://images.unsplash.com/photo-1582769923195-c6e60dc1d8dc?w=400',
  // Hospitality
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
  motel: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28f8e?w=400',
  resort: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400',
  bed_and_breakfast: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
  casino: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400',
  event_venue: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400',
  // Specialty
  golf_course: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400',
  marina: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
  prison: 'https://images.unsplash.com/photo-1584285405429-136bf988919c?w=400',
  campground: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400',
  car_wash: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400',
  senior_living: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=400',
  sports_facility: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
  vineyard: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400',
  solar_farm: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400',
  cell_tower: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  // Mixed Use
  mixed_retail_office: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
  live_work: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
};

const commercialCategories = [
  {
    type: 'office' as CommercialPropertyType,
    label: 'Office',
    icon: Building2,
    subtypes: [
      { value: 'office_building', label: 'Office Building' },
      { value: 'medical', label: 'Medical Office' },
      { value: 'coworking_space', label: 'Coworking' },
      { value: 'call_center', label: 'Call Center' },
      { value: 'government_office', label: 'Government' },
    ]
  },
  {
    type: 'retail' as CommercialPropertyType,
    label: 'Retail',
    icon: ShoppingCart,
    subtypes: [
      { value: 'shopping_center', label: 'Shopping Center' },
      { value: 'restaurant', label: 'Restaurant' },
      { value: 'strip_mall', label: 'Strip Mall' },
      { value: 'convenience_store', label: 'Convenience' },
      { value: 'gas_station', label: 'Gas Station' },
      { value: 'car_dealership', label: 'Car Dealer' },
    ]
  },
  {
    type: 'warehouse' as CommercialPropertyType,
    label: 'Warehouse',
    icon: Warehouse,
    subtypes: [
      { value: 'warehouse_distribution', label: 'Distribution' },
      { value: 'self_storage', label: 'Self Storage' },
      { value: 'cold_storage', label: 'Cold Storage' },
      { value: 'truck_terminal', label: 'Truck Terminal' },
      { value: 'fulfillment_center', label: 'Fulfillment' },
    ]
  },
  {
    type: 'industrial' as CommercialPropertyType,
    label: 'Industrial',
    icon: Factory,
    subtypes: [
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'flex_space', label: 'Flex Space' },
      { value: 'data_center', label: 'Data Center' },
      { value: 'recycling_facility', label: 'Recycling' },
      { value: 'food_processing', label: 'Food Processing' },
    ]
  },
  {
    type: 'hospitality' as CommercialPropertyType,
    label: 'Hospitality',
    icon: Hotel,
    subtypes: [
      { value: 'hotel', label: 'Hotel' },
      { value: 'motel', label: 'Motel' },
      { value: 'resort', label: 'Resort' },
      { value: 'bed_and_breakfast', label: 'B&B' },
      { value: 'casino', label: 'Casino' },
      { value: 'event_venue', label: 'Event Venue' },
    ]
  },
  {
    type: 'specialty' as CommercialPropertyType,
    label: 'Specialty',
    icon: TreePine,
    subtypes: [
      { value: 'golf_course', label: 'Golf Course' },
      { value: 'marina', label: 'Marina' },
      { value: 'prison', label: 'Prison' },
      { value: 'campground', label: 'Campground' },
      { value: 'car_wash', label: 'Car Wash' },
      { value: 'senior_living', label: 'Senior Living' },
      { value: 'sports_facility', label: 'Sports Facility' },
      { value: 'vineyard', label: 'Vineyard' },
      { value: 'solar_farm', label: 'Solar Farm' },
      { value: 'cell_tower', label: 'Cell Tower' },
    ]
  },
  {
    type: 'mixed_use' as CommercialPropertyType,
    label: 'Mixed Use',
    icon: Layers,
    subtypes: [
      { value: 'mixed_retail_office', label: 'Retail + Office' },
      { value: 'live_work', label: 'Live/Work' },
    ]
  },
];

interface ImageTileProps {
  subtype: { value: string; label: string };
  categoryType: CommercialPropertyType;
  isSelected: boolean;
  onClick: () => void;
}

const ImageTile: React.FC<ImageTileProps> = ({ subtype, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden group",
        "hover:ring-2 hover:ring-primary hover:scale-105 transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <img 
        src={subtypeImages[subtype.value] || subtypeImages.office_building} 
        alt={subtype.label}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <span className="absolute bottom-1 left-1 right-1 text-white text-[10px] sm:text-xs font-medium text-center truncate leading-tight">
        {subtype.label}
      </span>
    </button>
  );
};

export const CommercialPropertySelector = ({ 
  onSelectType, 
  selectedType, 
  selectedSubtype 
}: CommercialPropertySelectorProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Commercial Property Type</h3>
        <p className="text-sm text-muted-foreground">Click on a property type to select it</p>
      </div>

      <div className="space-y-5">
        {commercialCategories.map((category) => {
          const Icon = category.icon;
          
          return (
            <div key={category.type} className="space-y-2">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {category.label}
                </h4>
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {category.subtypes.map((subtype) => (
                  <ImageTile
                    key={subtype.value}
                    subtype={subtype}
                    categoryType={category.type}
                    isSelected={selectedType === category.type && selectedSubtype === subtype.value}
                    onClick={() => onSelectType(category.type, subtype.value as CommercialSubType)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
