import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Bath, DollarSign } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Property {
  id: string;
  latitude?: number;
  longitude?: number;
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
  owner_id: string;
}

interface PropertyMapProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  className?: string;
}

const PropertyMap: React.FC<PropertyMapProps> = ({ 
  properties, 
  onPropertyClick,
  className = "h-96 w-full" 
}) => {
  const mapRef = useRef<L.Map | null>(null);

  // Default center (Chicago area)
  const defaultCenter: [number, number] = [41.8781, -87.6298];
  const defaultZoom = 10;

  // Calculate map bounds based on properties
  const getMapBounds = () => {
    if (!properties || properties.length === 0) {
      return { center: defaultCenter, zoom: defaultZoom };
    }

    const validProperties = properties.filter(p => p.latitude && p.longitude);
    
    if (validProperties.length === 0) {
      return { center: defaultCenter, zoom: defaultZoom };
    }

    if (validProperties.length === 1) {
      return { 
        center: [validProperties[0].latitude, validProperties[0].longitude] as [number, number], 
        zoom: 15 
      };
    }

    const lats = validProperties.map(p => p.latitude);
    const lngs = validProperties.map(p => p.longitude);
    
    const bounds = L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );

    return { bounds };
  };

  const mapConfig = getMapBounds();

  useEffect(() => {
    // Trigger map resize when component is mounted or window resizes
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Small delay to ensure map is rendered
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatAddress = (property: Property) => {
    return [property.street_address, property.city, property.state, property.zipcode]
      .filter(Boolean)
      .join(', ');
  };

  const getDisplayRent = (property: Property) => {
    return property.desired_rent || property.monthly_rent;
  };

  const validProperties = properties.filter(p => p.latitude && p.longitude) as Array<Property & { latitude: number; longitude: number }>;

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="h-full w-full relative overflow-hidden rounded-lg">
          <MapContainer
            ref={mapRef}
            center={mapConfig.center || defaultCenter}
            zoom={mapConfig.zoom || defaultZoom}
            {...(mapConfig.bounds ? { bounds: mapConfig.bounds } : {})}
            className="h-full w-full z-0"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {validProperties.map((property) => (
              <Marker
                key={property.id}
                position={[property.latitude, property.longitude]}
              >
                <Popup>
                  <div className="w-64 p-2">
                    <div className="space-y-3">
                      {/* Property Address */}
                      <div>
                        <h3 className="font-semibold text-base text-gray-900">
                          {formatAddress(property)}
                        </h3>
                      </div>

                      {/* Property Details */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-medium">${getDisplayRent(property).toLocaleString()}</span>
                        </div>
                        
                        {property.bedrooms && (
                          <div className="flex items-center space-x-1">
                            <Bed className="w-4 h-4 text-blue-600" />
                            <span>{property.bedrooms} bed</span>
                          </div>
                        )}
                        
                        {property.bathrooms && (
                          <div className="flex items-center space-x-1">
                            <Bath className="w-4 h-4 text-purple-600" />
                            <span>{property.bathrooms} bath</span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div>
                        <Badge 
                          variant={property.status === 'available' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {property.status}
                        </Badge>
                      </div>

                      {/* Action Button */}
                      <Button 
                        onClick={() => onPropertyClick?.(property)}
                        className="w-full text-sm"
                        size="sm"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Properties Counter */}
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="secondary" className="bg-white/90 text-gray-700">
              <MapPin className="w-3 h-3 mr-1" />
              {validProperties.length} properties
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyMap;