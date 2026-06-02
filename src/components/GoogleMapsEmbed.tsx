
import React, { useState, useRef, useMemo } from 'react';
import ClientOnly from './ClientOnly';
import PigeonMap, { type PigeonMapRef } from './PigeonMap';
import PropertyListPanel from './property/PropertyListPanel';
import { Card, CardContent } from '@/components/ui/card';
import { groupListingsByProperty } from '@/utils/groupListingsByProperty';

interface Property {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  monthly_rent: number;
  desired_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  status: string;
  photos?: string[];
  amenities?: string[];
  description?: string;
  owner_id: string;
  unit_count: number;
  square_feet?: number;
  property_units?: Array<{
    id: string;
    status: string;
    unit_number?: string;
    unit_name?: string;
  }>;
  totalUnitCount?: number;
  availableUnitCount?: number;
}

interface GoogleMapsEmbedProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  className?: string;
  viewMode?: string;
  selectedProperty?: Property | null;
  areaBounds?: [number, number, number, number];
  areaLabel?: string;
  areaPolygon?: { type: 'Polygon' | 'MultiPolygon'; coordinates: any };
}

const GoogleMapsEmbed: React.FC<GoogleMapsEmbedProps> = ({ 
  properties, 
  onPropertyClick,
  className = "h-96 w-full",
  viewMode = "map",
  selectedProperty: externalSelectedProperty = null,
  areaBounds,
  areaLabel,
  areaPolygon,
}) => {
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [internalSelectedProperty, setInternalSelectedProperty] = useState<Property | null>(null);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);
  const mapRef = useRef<PigeonMapRef>(null);
  
  // Use external selectedProperty if provided, otherwise use internal state
  const selectedProperty = externalSelectedProperty || internalSelectedProperty;
  
  // Memoize validProperties to prevent unnecessary recalculations that trigger map resets
  // Properties are already filtered by on_market flag before being passed here
  const validProperties = useMemo(() => {
    const filtered = properties.filter(p => p.latitude && p.longitude);
    return filtered as Array<Property & { latitude: number; longitude: number }>;
  }, [properties]);

  // Helper function to check if property is within bounds
  const isPropertyInBounds = (property: Property, bounds: [number, number, number, number]) => {
    if (!property.latitude || !property.longitude) return false;
    const [west, south, east, north] = bounds;
    return (
      property.latitude >= south &&
      property.latitude <= north &&
      property.longitude >= west &&
      property.longitude <= east
    );
  };

  // Filter properties based on current map viewport
  const visibleProperties = useMemo(() => {
    if (!mapBounds) return validProperties;
    return validProperties.filter(p => isPropertyInBounds(p, mapBounds));
  }, [validProperties, mapBounds]);

  // Group multi-unit properties for the list panel
  const groupedProperties = useMemo(() => {
    return groupListingsByProperty(visibleProperties);
  }, [visibleProperties]);


  const handlePropertyClick = (property: Property) => {
    console.log('🎯 Property clicked in list:', property.id);
    
    // Update internal selected property state
    setInternalSelectedProperty(property);
    
    // Also call the external onPropertyClick if provided
    if (onPropertyClick) {
      onPropertyClick(property);
    }
  };

  // Handler for property list clicks - travel first, then open via map callback
  const handlePropertyClickFromList = (property: Property) => {
    console.log('🚀 Property clicked from list - triggering travel:', property.id);
    if (mapRef.current) {
      mapRef.current.travelToProperty(property);
    }
  };

  if (viewMode !== 'map') {
    return null;
  }


  return (
    <div className="flex relative w-full">
        <PropertyListPanel
          properties={groupedProperties}
          onPropertyClick={handlePropertyClickFromList}
          selectedProperty={selectedProperty}
          isCollapsed={isListCollapsed}
          hasAreaActive={Boolean(areaBounds || areaPolygon || areaLabel)}
          onToggleCollapse={() => setIsListCollapsed(!isListCollapsed)}
        />

      {/* Map Container */}
      <div className="flex-1 relative h-[768px]">

        <ClientOnly 
          fallback={
            <Card className={className}>
              <CardContent className="p-0">
                <div className="h-full w-full relative overflow-hidden rounded-lg">
                  <div className="h-full w-full flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700 mb-2">Loading Map...</div>
                      <div className="text-sm text-gray-500">Please wait while the map loads</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          }
        >
          <PigeonMap 
            ref={mapRef}
            properties={validProperties}
            onPropertyClick={handlePropertyClick}
            onBoundsChanged={setMapBounds}
            className={className}
            selectedProperty={selectedProperty && selectedProperty.latitude && selectedProperty.longitude 
              ? { ...selectedProperty, latitude: selectedProperty.latitude, longitude: selectedProperty.longitude }
              : null
            }
            viewMode={viewMode}
            areaBounds={areaBounds}
            areaLabel={areaLabel}
            areaPolygon={areaPolygon}
          />
        </ClientOnly>
      </div>
    </div>
  );
};

export default GoogleMapsEmbed;
