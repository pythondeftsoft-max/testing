import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import ClientOnly from './ClientOnly';

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

interface SimplePropertyMapProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  className?: string;
  viewMode?: string;
}

const SimplePropertyMap: React.FC<SimplePropertyMapProps> = ({ 
  properties, 
  onPropertyClick,
  className = "h-96 w-full",
  viewMode = "map"
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [leafletMap, setLeafletMap] = useState<any>(null);

  const validProperties = properties.filter(p => p.latitude && p.longitude) as Array<Property & { latitude: number; longitude: number }>;

  // Only render map when properly on client and in map mode
  if (viewMode !== 'map') {
    return null;
  }

  useEffect(() => {
    if (!mapRef.current || mapInitialized) {
      return;
    }

    let isMounted = true;

    const initializeMap = async () => {
      try {
        // Dynamic import of Leaflet
        const L = (await import('leaflet')).default;

        if (!isMounted || !mapRef.current) return;

        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Clear any existing content
        mapRef.current.innerHTML = '';

        // Calculate center based on properties or use default
        const defaultCenter: [number, number] = validProperties.length === 1
          ? [validProperties[0].latitude, validProperties[0].longitude]
          : validProperties.length > 1
            ? [validProperties[0].latitude, validProperties[0].longitude]
            : [41.8781, -87.6298]; // Chicago area default for empty map

        const defaultZoom = validProperties.length === 1 ? 15 : validProperties.length > 1 ? 12 : 10;

        // Create map
        const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Add markers for each property (only if there are properties)
        if (validProperties.length > 0) {
          validProperties.forEach(property => {
            const formatAddress = () => {
              return [property.street_address, property.city, property.state, property.zipcode]
                .filter(Boolean)
                .join(', ');
            };

            const displayRent = property.desired_rent || property.monthly_rent;
            
            const popupContent = `
              <div style="padding: 8px; max-width: 250px;">
                <strong>${formatAddress()}</strong><br/>
                <div style="margin: 8px 0;">
                  💰 $${displayRent.toLocaleString()}
                  ${property.bedrooms ? ` • 🛏️ ${property.bedrooms} bed` : ''}
                  ${property.bathrooms ? ` • 🚿 ${property.bathrooms} bath` : ''}
                </div>
                <div style="margin: 8px 0;">
                  <span style="background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
                    ${property.status}
                  </span>
                </div>
              </div>
            `;

            const marker = L.marker([property.latitude, property.longitude])
              .addTo(map)
              .bindPopup(popupContent);

            if (onPropertyClick) {
              marker.on('click', () => onPropertyClick(property));
            }
          });

          // Set up bounds if multiple properties
          if (validProperties.length > 1) {
            const group = new L.FeatureGroup(
              validProperties.map(p => L.marker([p.latitude, p.longitude]))
            );
            map.fitBounds(group.getBounds().pad(0.1));
          }
        }

        setLeafletMap(map);
        setMapInitialized(true);
        console.log('Map initialized successfully with', validProperties.length, 'properties');

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (leafletMap) {
        leafletMap.remove();
      }
    };
  }, [validProperties.length, mapInitialized, onPropertyClick]);


  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="h-full w-full relative overflow-hidden rounded-lg">
          <ClientOnly>
            <div
              ref={mapRef}
              className="h-full w-full"
              style={{ height: '600px', width: '100%' }}
            />
          </ClientOnly>
          
          {/* Empty state overlay */}
          {validProperties.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
              <div className="bg-background/90 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium text-foreground">No listings in this area</div>
                <div className="text-xs text-muted-foreground">Try adjusting your search or filters</div>
              </div>
            </div>
          )}
          
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

export default SimplePropertyMap;