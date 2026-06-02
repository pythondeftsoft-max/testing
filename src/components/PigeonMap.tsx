
import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Map, Marker } from 'pigeon-maps';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Bed, Bath, ZoomIn, ZoomOut, Maximize2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import useSupercluster, { type PointFeature } from '@/hooks/useSupercluster';

// Custom tile provider with English labels (CartoDB Voyager)
// CartoDB provides free tiles with English-only labels globally
const englishTileProvider = (x: number, y: number, z: number, dpr?: number) => {
  return `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}${dpr && dpr >= 2 ? '@2x' : ''}.png`;
};

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
  property_units?: Array<{
    id: string;
    status: string;
    unit_number?: string;
    unit_name?: string;
  }>;
  totalUnitCount?: number;
  availableUnitCount?: number;
}

type GeoJSONPolygon = { type: 'Polygon'; coordinates: number[][][] };
type GeoJSONMultiPolygon = { type: 'MultiPolygon'; coordinates: number[][][][] };

type GeoGeometry = GeoJSONPolygon | GeoJSONMultiPolygon;

interface PigeonMapProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  className?: string;
  selectedProperty?: Property | null;
  viewMode?: string;
  areaBounds?: [number, number, number, number]; // [west, south, east, north]
  areaLabel?: string;
  areaPolygon?: GeoGeometry;
  onBoundsChanged?: (bounds: [number, number, number, number] | null) => void;
}

export interface PigeonMapRef {
  travelToProperty: (property: Property) => void;
}

const PigeonMap = forwardRef<PigeonMapRef, PigeonMapProps>(({ 
  properties, 
  onPropertyClick,
  className = "h-96 w-full",
  selectedProperty = null,
  viewMode = "map",
  areaBounds,
  areaLabel,
  areaPolygon,
  onBoundsChanged: onBoundsChangedCallback,
}, ref) => {
  const [zoom, setZoom] = useState(5);
  const [center, setCenter] = useState<[number, number]>([39.8283, -98.5795]);
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);

  // Travel-to flow state
  const travelTimeoutRef = React.useRef<number | null>(null);
  const [travelTarget, setTravelTarget] = useState<{
    property: Property;
    targetCenter: [number, number];
    targetZoom: number;
  } | null>(null);

  // Initialization tracking refs
  const hasInitialized = useRef(false);
  const lastPropertiesHash = useRef<string>('');
  const lastInteractionTime = useRef<number>(0);

  // Helper to compute center/zoom from bounds
  const computeViewFromBounds = useMemo(() => (bbox: [number, number, number, number]) => {
    const [west, south, east, north] = bbox;
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;
    const latDiff = Math.max(0.0001, north - south);
    const lngDiff = Math.max(0.0001, east - west);
    const maxDiff = Math.max(latDiff, lngDiff);
    let z = 5;
    if (maxDiff > 30) z = 3;
    else if (maxDiff > 20) z = 4;
    else if (maxDiff > 10) z = 5;
    else if (maxDiff > 5) z = 6;
    else if (maxDiff > 2) z = 7;
    else if (maxDiff > 1) z = 8;
    else if (maxDiff > 0.5) z = 10;
    else if (maxDiff > 0.25) z = 11;
    else if (maxDiff > 0.1) z = 12;
    else z = 13;
    return { center: [centerLat, centerLng] as [number, number], zoom: z };
  }, []);

  // Calculate bounds and center from properties
  const { calculatedCenter, calculatedZoom } = useMemo(() => {
    const validProperties = properties.filter(p => p.latitude && p.longitude);
    
    if (validProperties.length === 0) {
      return { calculatedCenter: [39.8283, -98.5795] as [number, number], calculatedZoom: 4 };
    }

    const lats = validProperties.map(p => p.latitude!);
    const lngs = validProperties.map(p => p.longitude!);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate zoom based on bounds - zoom out more to show all properties
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 5; // Default zoom out more to show all properties
    if (maxDiff > 30) zoom = 3;
    else if (maxDiff > 20) zoom = 4;
    else if (maxDiff > 10) zoom = 5;
    else if (maxDiff > 5) zoom = 6;
    else if (maxDiff > 2) zoom = 7;
    else if (maxDiff > 1) zoom = 8;
    else zoom = 9;
    
    return {
      calculatedCenter: [centerLat, centerLng] as [number, number], 
      calculatedZoom: zoom 
    };
  }, [properties]);

  // Initialize center and zoom - only on first mount or when actual property dataset changes
  React.useEffect(() => {
    if (properties.length === 0) return;

    // Create a hash of the property data to detect actual changes vs re-renders
    const propertiesHash = properties
      .map(p => `${p.id}-${p.latitude}-${p.longitude}`)
      .sort()
      .join('|');

    const now = Date.now();
    const timeSinceLastInteraction = now - lastInteractionTime.current;
    const hasRecentInteraction = timeSinceLastInteraction < 3000; // 3 seconds

    // Only reset the map view if:
    // 1. This is the first initialization, OR
    // 2. The actual property dataset has changed (not just a re-render), AND
    // 3. We're not in travel mode, AND  
    // 4. There hasn't been recent user interaction
    const shouldInitialize = !hasInitialized.current || 
      (lastPropertiesHash.current !== propertiesHash && !travelTarget && !hasRecentInteraction);

    if (shouldInitialize) {
      console.log('🗺️ Initializing map view:', { 
        center: calculatedCenter, 
        zoom: calculatedZoom,
        propertyCount: properties.length,
        reason: !hasInitialized.current ? 'first-mount' : 'dataset-changed'
      });
      
      setCenter(calculatedCenter);
      setZoom(calculatedZoom);
      hasInitialized.current = true;
      lastPropertiesHash.current = propertiesHash;
    }
  }, [calculatedCenter, calculatedZoom, properties.length, travelTarget]);

  // Fit to provided area bounds when they change
  React.useEffect(() => {
    if (!areaBounds) return;
    const { center: c, zoom: z } = computeViewFromBounds(areaBounds);
    const minZoom = 13; // ensure we zoom in enough to reveal individual properties
    const targetZoom = Math.max(z, minZoom);
    setCenter(c);
    setZoom(targetZoom);
  }, [areaBounds, computeViewFromBounds, areaLabel]);

  const formatAddress = (property: Property) => {
    return [property.street_address, property.city, property.state]
      .filter(Boolean)
      .join(', ');
  };

  const handleMarkerClick = (property: Property) => {
    if (!property.latitude || !property.longitude) return;
    
    // Track user interaction time to prevent map resets during travel
    lastInteractionTime.current = Date.now();
    
    // Open property details IMMEDIATELY for instant feedback
    onPropertyClick?.(property);
    
    // Then animate map in background for smooth visual transition
    const target: [number, number] = [property.latitude, property.longitude];
    const targetZoom = computeZoomToReveal(property, zoom);
    setTravelTarget({ property, targetCenter: target, targetZoom });
    setCenter(target);
    setZoom(targetZoom);
    
    // Clear travel state after animation completes
    if (travelTimeoutRef.current) {
      window.clearTimeout(travelTimeoutRef.current);
    }
    travelTimeoutRef.current = window.setTimeout(() => {
      setTravelTarget(null);
    }, 800);
  };

  // Expose travel function via ref
  useImperativeHandle(ref, () => ({
    travelToProperty: handleMarkerClick
  }), [handleMarkerClick]);

  const CustomMarker = ({ property }: { property: Property }) => {
    const displayRent = (property as any).rent || property.desired_rent || property.monthly_rent || 0;
    const isHovered = hoveredProperty === property.id;
    const isSelected = selectedProperty?.id === property.id;
    
    // Calculate available units - use metadata if available, fallback to property_units array
    const availableUnits = (property as any).availableUnitCount || 
      property.property_units?.filter(unit => unit.status === 'available').length || 
      0;
    const isMultiUnit = availableUnits > 1;
    
    // Multi-unit property marker (building icon + available unit count)
    const MultiUnitMarker = (
      <div 
        className="relative cursor-pointer transition-all duration-200 pointer-events-auto"
        style={{ 
          transform: isSelected ? 'scale(1.2)' : 'scale(1)',
          zIndex: isSelected ? 10 : 1
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleMarkerClick(property);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseEnter={() => setHoveredProperty(property.id)}
        onMouseLeave={() => setHoveredProperty(null)}
      >
      <div className={`
        flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold shadow-lg border-2 transition-all pointer-events-none
        ${isSelected || isHovered
          ? 'bg-primary text-primary-foreground border-primary scale-105' 
          : 'bg-white text-gray-900 border-primary'
        }
      `}>
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="whitespace-nowrap">
            {availableUnits >= 15 ? '15+' : availableUnits}
          </span>
        </div>
      </div>
    );

    // Single-family home marker (simple price dot - Zillow style, no tail)
    const SingleFamilyMarker = (
      <div 
        className="relative cursor-pointer transition-all duration-200 pointer-events-auto"
        style={{ 
          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
          zIndex: isSelected ? 10 : 1
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleMarkerClick(property);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseEnter={() => setHoveredProperty(property.id)}
        onMouseLeave={() => setHoveredProperty(null)}
      >
      <div className={`
        px-2.5 py-1 rounded-full text-xs font-bold shadow-lg border-2 transition-all pointer-events-none whitespace-nowrap
        ${isSelected || isHovered
          ? 'bg-primary text-primary-foreground border-primary scale-105' 
          : 'bg-primary text-primary-foreground border-primary'
        }
      `}>
          ${displayRent > 0 ? (displayRent >= 1000 ? `${(displayRent/1000).toFixed(1)}k` : displayRent) : '0'}
        </div>
      </div>
    );

    const MarkerContent = isMultiUnit ? MultiUnitMarker : SingleFamilyMarker;

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {MarkerContent}
        </HoverCardTrigger>
        <HoverCardContent className="bg-popover text-popover-foreground border-border shadow-md">
          <div className="space-y-2">
            <div className="font-semibold text-sm">{formatAddress(property) || property.address}</div>
            {isMultiUnit && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {availableUnits} of {property.unit_count} units available
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="font-medium">${displayRent.toLocaleString()}</span>
              </div>
              {property.bedrooms ? (
                <div className="flex items-center gap-1">
                  <Bed className="w-3 h-3" />
                  <span>{property.bedrooms} bd</span>
                </div>
              ) : null}
              {property.bathrooms ? (
                <div className="flex items-center gap-1">
                  <Bath className="w-3 h-3" />
                  <span>{property.bathrooms} ba</span>
                </div>
              ) : null}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const ClusterMarker: React.FC<{ count: number }> = ({ count }) => (
    <div className="relative">
      <div className="rounded-full bg-primary text-primary-foreground text-xs font-semibold w-8 h-8 flex items-center justify-center shadow-md ring-2 ring-primary/30">
        {count}
      </div>
      
    </div>
  );

  const validProperties = properties.filter(p => p.latitude && p.longitude);

  const points = useMemo<PointFeature[]>(() => validProperties.map((p) => ({
    type: 'Feature',
    properties: { cluster: false, propertyId: p.id, property: p },
    geometry: { type: 'Point', coordinates: [p.longitude!, p.latitude!] }
  })), [validProperties]);

  const { clusters, supercluster } = useSupercluster(points, bounds, zoom);

  // Geometry helpers with defensive normalization
  const isArray = (v: any) => Array.isArray(v);
  const isValidCoord = (c: any): c is [number, number] => isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]);
  const isValidRing = (ring: any): ring is number[][] => isArray(ring) && ring.length >= 3 && ring.every(isValidCoord);

  // Normalize GeoJSON Polygon/MultiPolygon to a multi-polygon shape: number[][][][]
  const normalizeToPolygons = (geom?: GeoGeometry | null): number[][][][] => {
    if (!geom) return [];
    try {
      if (geom.type === 'Polygon') {
        const rings = (geom.coordinates || []).filter(isValidRing);
        return rings.length ? [rings] : [];
      }
      // MultiPolygon
      const polys = (geom.coordinates || [])
        .map((poly: any) => (isArray(poly) ? poly.filter(isValidRing) : []))
        .filter((rings: any) => rings.length > 0);
      return polys;
    } catch {
      return [];
    }
  };

  const pointInRing = (lng: number, lat: number, ring: number[][]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const normalizedPolygons = useMemo(() => normalizeToPolygons(areaPolygon), [areaPolygon]);

  const isPointInGeometry = (pt: [number, number], polys: number[][][][]) => {
    if (!polys || polys.length === 0) return true; // no geometry filter
    const [lng, lat] = pt;
    for (const rings of polys) {
      if (!isArray(rings) || rings.length === 0) continue;
      const [outer, ...holes] = rings;
      if (!isValidRing(outer)) continue;
      if (pointInRing(lng, lat, outer)) {
        let inHole = false;
        for (const hole of holes) { if (isValidRing(hole) && pointInRing(lng, lat, hole)) { inHole = true; break; } }
        if (!inHole) return true;
      }
    }
    return false;
  };

  // Filter points to polygon when present (fallback to no filter if polygon invalid)
  const filteredPoints = useMemo<any[]>(() => {
    const polys = normalizedPolygons;
    if (!polys || polys.length === 0) return points as any[];
    return (points as any[]).filter((f: any) => {
      const [lng, lat] = f.geometry.coordinates as [number, number];
      return isPointInGeometry([lng, lat], polys);
    });
  }, [points, normalizedPolygons]);

  // Disable clustering when a location filter (areaBounds/polygon) is active,
  // but re-enable if the in-zone count exceeds a threshold to protect performance
  const inZoneCount = filteredPoints.length;
  const clusteringDisabled = (!!areaBounds || (normalizedPolygons && normalizedPolygons.length > 0)) && inZoneCount <= 60;

  const displayFeatures = useMemo<any[]>(
    () => (clusteringDisabled ? filteredPoints : (clusters as any[])),
    [clusteringDisabled, filteredPoints, clusters]
  );

  // Determine the minimum zoom that reveals an individual property (not a cluster)
  function computeZoomToReveal(p: Property, baseZoom: number): number {
    if (!p.latitude || !p.longitude) return baseZoom;
    if (!supercluster) return Math.max(baseZoom, 14);

    const lng = p.longitude!;
    const lat = p.latitude!;
    const maxZ = 20;
    const epsilon = 0.001; // ~100m bbox around the point

    let z = Math.max(0, Math.floor(baseZoom));

    try {
      // Iterate until this point is no longer clustered or we hit maxZ
      while (z <= maxZ) {
        const bbox: [number, number, number, number] = [
          lng - epsilon,
          lat - epsilon,
          lng + epsilon,
          lat + epsilon,
        ];
        const items: any[] = (supercluster as any).getClusters(bbox, z) || [];

        // If the property itself is visible as a point feature at this zoom, stop
        const point = items.find(
          (f: any) => !f.properties?.cluster && f.properties?.propertyId === p.id
        );
        if (point) return z;

        // Otherwise, expand the cluster at this location
        const cluster = items.find((f: any) => f.properties?.cluster);
        if (!cluster) break;
        const nextZ = (supercluster as any).getClusterExpansionZoom(cluster.id);
        if (typeof nextZ === 'number' && nextZ > z) {
          z = nextZ;
        } else {
          z = z + 1; // safety increment
        }
      }
    } catch (e) {
      console.warn('computeZoomToReveal failed, falling back', e);
      return Math.max(baseZoom, 14);
    }

    return Math.min(z, maxZ);
  }



  const showEmptyMapOverlay = validProperties.length === 0 && !areaBounds && (!normalizedPolygons || normalizedPolygons.length === 0);
  
  // Use default center (USA) when no properties
  const effectiveCenter: [number, number] = showEmptyMapOverlay ? [39.8283, -98.5795] : center;
  const effectiveZoom = showEmptyMapOverlay ? 4 : zoom;

  return (
    <Card className={className}>
      <CardContent className="p-0 relative">
          <div 
            className="h-full w-full relative overflow-hidden rounded-lg" 
            style={{ minHeight: '700px', height: 'calc(100vh - 200px)' }}
            onClick={() => {
              console.log('🗺️ Map background clicked');
            }}
          >
          <Map
            provider={englishTileProvider}
            height={Math.max(700, window.innerHeight - 200)}
            center={effectiveCenter}
            zoom={effectiveZoom}
            minZoom={3}
            onClick={() => setHoveredProperty(null)}
            onBoundsChanged={({ center, zoom, bounds }) => {
              console.log('🗺️ Map bounds changed:', { center, zoom, bounds });
              
              // Track user interaction time for manual map movements
              if (!travelTarget) {
                lastInteractionTime.current = Date.now();
              }
              
              setCenter(center);
              setZoom(zoom);
              if (bounds && (bounds as any).ne && (bounds as any).sw) {
                const ne = (bounds as any).ne as [number, number];
                const sw = (bounds as any).sw as [number, number];
                setBounds([sw[1], sw[0], ne[1], ne[0]]);
                
                // Notify parent of bounds change
                if (onBoundsChangedCallback) {
                  onBoundsChangedCallback([sw[1], sw[0], ne[1], ne[0]]); // [west, south, east, north]
                }
              }
              // If we're traveling to a target, detect arrival and clear travel state
              if (travelTarget) {
                const [tLat, tLng] = travelTarget.targetCenter;
                const close = (a: number, b: number) => Math.abs(a - b) < 0.0025;
                const zoomClose = Math.abs(zoom - travelTarget.targetZoom) <= 0.25;
                const arrived =
                  close(center[0], tLat) &&
                  close(center[1], tLng) &&
                  zoomClose;
                if (arrived) {
                  setTravelTarget(null);
                }
              }
            }}
            attribution={false}
            metaWheelZoom={true}
            mouseEvents={true}
            touchEvents={true}
            animate={true}
            animateMaxScreens={10}
            zoomSnap={false}
            
          >
            {displayFeatures.map((feature: any) => {
              const [lng, lat] = feature.geometry.coordinates as [number, number];
              const isCluster = feature.properties.cluster;
              if (isCluster) {
                const count = feature.properties.point_count as number;
                return (
                  <Marker key={`cluster-${feature.id}`} anchor={[lat, lng]} onClick={() => {
                    const expansionZoom = Math.min(supercluster?.getClusterExpansionZoom(feature.id) ?? (zoom + 1), 20);
                    setCenter([lat, lng]);
                    setZoom(expansionZoom);
                  }}>
                    <ClusterMarker count={count} />
                  </Marker>
                );
              }
              const property: Property = feature.properties.property;
              return (
                <Marker key={property.id} anchor={[property.latitude!, property.longitude!]} onClick={() => handleMarkerClick(property)}>
                  <CustomMarker property={property} />
                </Marker>
              );
            })}
          </Map>
          

          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 hover:bg-white shadow-md"
              onClick={() => setZoom(Math.min(zoom + 1, 18))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 hover:bg-white shadow-md"
              onClick={() => setZoom(Math.max(zoom - 1, 3))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 hover:bg-white shadow-md"
              onClick={() => {
                console.log('Reset to show all properties');
                setCenter(calculatedCenter);
                setZoom(calculatedZoom);
              }}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
          
      {/* Area Badge */}
      {areaLabel ? (
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-white/90 text-gray-700 shadow-md border border-white/50">
            Area: {areaLabel}
          </Badge>
        </div>
      ) : null}
      
      {/* Empty Map Overlay */}
      {showEmptyMapOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg text-center">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium text-foreground">No listings in this area</div>
            <div className="text-xs text-muted-foreground">Try adjusting your search or filters</div>
          </div>
        </div>
      )}
          
        </div>
      </CardContent>
    </Card>
  );
});

export default PigeonMap;
