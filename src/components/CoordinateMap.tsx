import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, Bed, Bath, Home } from 'lucide-react';

interface Property {
  id: string;
  latitude: number;
  longitude: number;
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

interface CoordinateMapProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  className?: string;
}

const CoordinateMap: React.FC<CoordinateMapProps> = ({ 
  properties, 
  onPropertyClick,
  className = "h-96 w-full"
}) => {
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);

  const { plotPoints } = useMemo(() => {
    if (properties.length === 0) {
      return { plotPoints: [] };
    }

    // US bounds for accurate geographic positioning
    const usBounds = {
      minLat: 24.396308, // Southern tip of Florida
      maxLat: 49.384358, // Northern border with Canada
      minLng: -125.000000, // West coast
      maxLng: -66.934570 // East coast
    };

    // Convert coordinates to SVG coordinates (0-100 scale)
    const plotPoints = properties.map((property, index) => {
      const x = ((property.longitude - usBounds.minLng) / (usBounds.maxLng - usBounds.minLng)) * 100;
      const y = 100 - ((property.latitude - usBounds.minLat) / (usBounds.maxLat - usBounds.minLat)) * 100; // Invert Y for SVG
      
      return {
        ...property,
        x,
        y,
        label: String.fromCharCode(65 + (index % 26))
      };
    });

    return { plotPoints };
  }, [properties]);

  if (properties.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="h-full w-full relative overflow-hidden rounded-lg">
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
              <div className="text-center">
                <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-xl font-semibold text-gray-700 mb-2">No Properties to Display</div>
                <div className="text-sm text-gray-500">Properties need coordinates to appear on the map</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatAddress = (property: Property) => {
    return [property.street_address, property.city, property.state, property.zipcode]
      .filter(Boolean)
      .join(', ');
  };

  // Simplified US outline path (approximation)
  const usOutlinePath = "M 10,30 L 15,25 L 20,20 L 30,18 L 40,16 L 50,15 L 60,16 L 70,18 L 80,20 L 85,25 L 88,30 L 90,35 L 89,40 L 87,45 L 85,50 L 82,55 L 80,60 L 85,65 L 87,70 L 85,75 L 80,78 L 75,80 L 70,82 L 65,83 L 60,85 L 55,86 L 50,87 L 45,86 L 40,85 L 35,83 L 30,80 L 25,78 L 20,75 L 15,70 L 12,65 L 10,60 L 8,55 L 7,50 L 8,45 L 9,40 L 10,35 Z";

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="h-full w-full relative overflow-hidden rounded-lg" style={{ height: '600px' }}>
          {/* Modern Map Background */}
          <div className="absolute inset-0 bg-muted">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className="text-primary/10" stopColor="currentColor" />
                  <stop offset="100%" className="text-primary/20" stopColor="currentColor" />
                </linearGradient>
                <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className="text-muted" stopColor="currentColor" />
                  <stop offset="100%" className="text-muted-foreground/20" stopColor="currentColor" />
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="0.3" dy="0.3" stdDeviation="0.3" floodOpacity="0.3"/>
                </filter>
              </defs>
              
              {/* Ocean background */}
              <rect width="100" height="100" fill="url(#oceanGradient)" />
              
              {/* US landmass */}
              <path 
                d={usOutlinePath}
                fill="url(#landGradient)" 
                stroke="#cbd5e1" 
                strokeWidth="0.2"
                filter="url(#shadow)"
              />
              
              {/* State boundaries (simplified grid) */}
              <g opacity="0.1">
                {[...Array(8)].map((_, i) => (
                  <line key={`v${i}`} x1={15 + i * 10} y1="15" x2={15 + i * 10} y2="85" stroke="#64748b" strokeWidth="0.15" />
                ))}
                {[...Array(5)].map((_, i) => (
                  <line key={`h${i}`} x1="15" y1={20 + i * 15} x2="85" y2={20 + i * 15} stroke="#64748b" strokeWidth="0.15" />
                ))}
              </g>
            </svg>
            
            {/* Property markers */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <filter id="markerGlow">
                  <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {plotPoints.map((point) => {
                const displayRent = point.desired_rent || point.monthly_rent;
                const isHovered = hoveredProperty === point.id;
                
                return (
                  <g key={point.id}>
                    {/* Marker pulse animation for hovered */}
                    {isHovered && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="#ef4444"
                        opacity="0.3"
                        className="animate-ping"
                      />
                    )}
                    
                    {/* Main marker */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? "2.5" : "2"}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="0.6"
                      className="cursor-pointer transition-all duration-200"
                      filter="url(#markerGlow)"
                      onClick={() => onPropertyClick?.(point)}
                      onMouseEnter={() => setHoveredProperty(point.id)}
                      onMouseLeave={() => setHoveredProperty(null)}
                    />
                    
                    {/* Marker label */}
                    <text
                      x={point.x}
                      y={point.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="2.5"
                      fontWeight="bold"
                      className="cursor-pointer select-none"
                      onClick={() => onPropertyClick?.(point)}
                      onMouseEnter={() => setHoveredProperty(point.id)}
                      onMouseLeave={() => setHoveredProperty(null)}
                    >
                      {point.label}
                    </text>
                    
                    {/* Price label on hover */}
                    {isHovered && (
                      <g>
                        <rect
                          x={point.x - 8}
                          y={point.y - 8}
                          width="16"
                          height="5"
                          fill="rgba(0,0,0,0.8)"
                          rx="1"
                        />
                        <text
                          x={point.x}
                          y={point.y - 5.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="2"
                          fontWeight="600"
                        >
                          ${(displayRent/1000).toFixed(0)}k
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          
          {/* Modern header badges */}
          <div className="absolute top-4 left-4 z-10">
            <Badge className="bg-white/90 text-gray-700 shadow-sm border border-white/50">
              <MapPin className="w-3 h-3 mr-1" />
              {properties.length} properties
            </Badge>
          </div>
          
          <div className="absolute top-4 right-4 z-10">
            <Badge variant="outline" className="bg-white/90 text-gray-600 border-white/50 shadow-sm">
              🇺🇸 United States
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CoordinateMap;
