
import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapIcon, List, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PropertyFeed from './PropertyFeed';
import GoogleMapsEmbed from './GoogleMapsEmbed';
import PropertyDetailsModalEnhanced from './PropertyDetailsModalEnhanced';
import { useToast } from '@/hooks/use-toast';
import PropertyFilters from './PropertyFilters';
import CompactMapFilters from './CompactMapFilters';
import { filterProperties, type PropertyFilterValues } from '@/utils/propertyFiltering';
import { useAreaGeocoding } from '@/hooks/useAreaGeocoding';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';
import { transformPropertiesToListings, type MarketplaceListing } from '@/utils/marketplaceListings';

// Import geocoding utility for dev testing (exposes function to window.geocodeMissingProperty())
import '@/utils/manualGeocode';

interface Property {
  id: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  desired_rent: number;
  zipcode: string;
  city: string;
  state: string;
  street_address: string;
  address: string;
  photos: string[];
  amenities: string[];
  status: string;
  owner_id: string;
  unit_count: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  square_feet?: number;
  year_built?: number;
  property_type?: string;
  parking_type?: string;
  pet_policy?: string;
  furnished?: boolean;
  air_conditioning?: boolean;
  laundry_type?: string;
  walk_score?: number;
  bike_score?: number;
  transit_score?: number;
  on_market?: boolean;
  property_units?: Array<{
    id: string;
    unit_number: string;
    unit_name: string;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number;
    status: string;
    square_feet: number;
    description: string;
    unit_amenities: string[];
    on_market?: boolean;
  }>;
}

interface PropertySearchProps {
  userId: string;
  properties?: any[];
  tenantProfile?: any;
}

const PropertySearch = ({ userId, tenantProfile }: PropertySearchProps) => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  
  // Force Card View on mobile
  useEffect(() => {
    if (isMobile && viewMode === 'map') {
      setViewMode('list');
    }
  }, [isMobile, viewMode]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedMapProperty, setSelectedMapProperty] = useState<Property | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const { toast } = useToast();
  const { mutate: logEvent } = useMarketplaceEvents();
  const [filters, setFilters] = useState<PropertyFilterValues>({
    search: '',
    zipcode: '',
    city: '',
    state: '',
    minRent: '',
    maxRent: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: [],
    minSquareFeet: '',
    maxSquareFeet: '',
    yearBuilt: '',
    parkingType: [],
    petPolicy: [],
    furnished: '',
    laundryType: [],
    airConditioning: '',
    utilitiesIncluded: [],
    appliancesIncluded: [],
    moveInDate: '',
    additionalFeatures: [],
    securityFeatures: [],
    communityAmenities: [],
  });
  // Check for deep link propertyId from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('propertyId');
    
    if (propertyId) {
      console.log('🔗 Deep link detected for property:', propertyId);
      // Find and open property when data is loaded
      const foundProperty = properties.find(p => p.id === propertyId);
      if (foundProperty) {
        handlePropertyClick(foundProperty);
      }
    }
  }, [properties]);

  useEffect(() => {
    fetchProperties();
    // Log search view loaded event
    logEvent({ 
      eventType: 'search_view_loaded',
      metadata: { 
        viewMode: 'map',
        propertyCount: 0 
      }
    });
  }, [logEvent]);

  const fetchProperties = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching properties for marketplace... (attempt:', retryCount + 1, ')');
      
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_units (
            id,
            unit_number,
            unit_name,
            bedrooms,
            bathrooms,
            monthly_rent,
            status,
            square_feet,
            description,
            unit_amenities,
            on_market,
            photos
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error fetching properties:', error);
        
        // Handle specific permission errors
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          setError('Unable to access property data. Please make sure you have the correct permissions.');
          toast({
            title: "Access Error",
            description: "Unable to load properties. Please check your account permissions.",
            variant: "destructive",
          });
        } else {
          setError(`Failed to load properties: ${error.message}`);
          toast({
            title: "Error",
            description: "Failed to load properties. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      console.log('✅ Properties fetched successfully:', {
        total: data?.length || 0,
        sample: data?.[0]?.id || 'none',
        withCoordinates: data?.filter(p => p.latitude && p.longitude)?.length || 0
      });

      if (data && Array.isArray(data)) {
        // Filter properties to show only those on market
        const marketProperties = data.filter(property => {
          const isMultiUnit = property.unit_count && property.unit_count > 1;
          
          if (isMultiUnit) {
            // Multi-unit: Only show if at least one unit is on market
            return property.property_units?.some(unit => unit.on_market === true) || false;
          } else {
            // Single-family: Show if property is on market
            return property.on_market === true;
          }
        });

        const processedProperties = marketProperties.map(property => ({
          ...property,
          address: property.address || `${property.street_address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zipcode || ''}`.trim(),
        }));
        
        // Transform properties to unit-centric listings for map display
        const transformedListings = transformPropertiesToListings(processedProperties);
        
        setProperties(processedProperties);
        setListings(transformedListings);
        
        if (processedProperties.length === 0) {
          toast({
            title: "No Properties Found",
            description: "No available properties found. Check back later for new listings.",
          });
        }
        
        // Update search view loaded event with actual property count
        logEvent({ 
          eventType: 'search_view_loaded',
          metadata: { 
            viewMode: 'map',
            propertyCount: processedProperties.length 
          }
        });
      } else {
        console.warn('⚠️ Unexpected data format received');
        setProperties([]);
      }
    } catch (error: any) {
      console.error('💥 Unexpected error fetching properties:', error);
      
      // Implement retry logic for network errors
      if (retryCount < 2 && (error.name === 'NetworkError' || error.message?.includes('fetch'))) {
        console.log(`🔄 Retrying fetch (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchProperties(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      setError('An unexpected error occurred while loading properties.');
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const propertiesWithCoordinates = properties.filter(p => p.latitude && p.longitude);
  const listingsWithCoordinates = listings.filter(l => l.latitude && l.longitude);
  const filteredProperties = filterProperties(properties, filters);
  const filteredPropertiesWithCoordinates = filteredProperties.filter(p => p.latitude && p.longitude);
  
  // Transform filtered properties to listings for Card View
  const filteredListings = transformPropertiesToListings(filteredProperties);

  // Area geocoding for map fitting
  const { geocodeArea } = useAreaGeocoding();
  const [areaBounds, setAreaBounds] = useState<[number, number, number, number] | null>(null);
  const [areaLabel, setAreaLabel] = useState<string>('');
  const [areaPolygon, setAreaPolygon] = useState<any | null>(null);
  useEffect(() => {
    let timeout: number | null = null;
    let cancelled = false;

    const applyResult = (res: any, fallbackLabel: string) => {
      if (res?.success && res.bbox) {
        setAreaBounds(res.bbox);
        setAreaLabel(res.display_name || fallbackLabel);
        setAreaPolygon(res.geometry || null);
        return true;
      }
      return false;
    };

    const geocodeFromSearch = async (search: string) => {
      const trimmed = search.trim();
      if (!trimmed) return false;

      // ZIP code: 5 digits or ZIP+4
      const zipMatch = /^\d{5}(-\d{4})?$/.test(trimmed);
      if (zipMatch) {
        const res = await geocodeArea({ zipcode: trimmed, country: 'us' });
        return applyResult(res, trimmed);
      }

      // City, ST or "City ST"
      const cityStateRegex = /^([^,]+)[,\s]+([A-Za-z]{2})$/;
      const m = trimmed.match(cityStateRegex);
      if (m) {
        const city = m[1].trim();
        const state = m[2].toUpperCase();
        const res = await geocodeArea({ city, state, country: 'us' });
        return applyResult(res, `${city}, ${state}`);
      }
      return false;
    };

    const run = async () => {
      const zip = filters.zipcode?.trim();
      const city = filters.city?.trim();
      const state = filters.state?.trim();
      const search = filters.search?.trim();

      // Priority: explicit zipcode/city/state inputs
      if (zip) {
        const res = await geocodeArea({ zipcode: zip, country: 'us' });
        if (applyResult(res, zip)) return;
      }
      if (city) {
        const res = await geocodeArea({ city, state, country: 'us' });
        if (applyResult(res, [city, state].filter(Boolean).join(', '))) return;
      }

      // Fallback: infer from main search with debounce
      if (search) {
        timeout = window.setTimeout(async () => {
          if (cancelled) return;
          const ok = await geocodeFromSearch(search);
          if (!ok) {
            setAreaBounds(null);
            setAreaLabel('');
            setAreaPolygon(null);
          }
        }, 300);
        return;
      }

      // Clear when nothing to geocode
      setAreaBounds(null);
      setAreaLabel('');
      setAreaPolygon(null);
    };

    run();

    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [filters.zipcode, filters.city, filters.state, filters.search, geocodeArea]);
  
  // Reset selected map property when filters change to prevent stale selection affecting map view
  useEffect(() => {
    setSelectedMapProperty(null);
  }, [filters]);
  
  console.log('📊 Properties state:', {
    total: properties.length,
    withCoordinates: propertiesWithCoordinates.length,
    viewMode,
    error: !!error,
    selectedProperty: selectedProperty?.id || 'none'
  });

  const handlePropertyClick = (property: Property) => {
    console.log('🔍 Property clicked for full details:', property.id);
    setSelectedProperty(property);
    setSelectedMapProperty(property);
    setShowDetailsModal(true);
  };

  const handleInterestClick = async (property: Property): Promise<void> => {
    console.log('💖 Interest clicked for property:', property.id);
    setIsSubmittingInterest(true);
    
    try {
      // Simulate interest submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Interest Expressed",
        description: `You've expressed interest in ${property.street_address || property.address}`,
      });
    } catch (error) {
      console.error('Error expressing interest:', error);
      toast({
        title: "Error",
        description: "Failed to express interest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  const handleViewOnMapFromList = (property: Property) => {
    console.log('🗺️ Switching to map view for property:', property.id);
    setSelectedMapProperty(property);
    setViewMode('map');
    
    logEvent({ 
      eventType: 'cta_clicked',
      metadata: { 
        source: 'card_view_map_button',
        action: 'view_on_map',
        propertyId: property.id,
        hasCoordinates: !!(property.latitude && property.longitude)
      }
    });
  };

  const handleRefreshProperties = () => {
    console.log('🔄 Manual refresh triggered');
    logEvent({ 
      eventType: 'search_performed',
      metadata: { 
        trigger: 'manual_refresh',
        viewMode,
        propertyCount: filteredProperties.length
      }
    });
    fetchProperties();
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Available Properties</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  <List className="w-4 h-4 mr-2" />
                  Card View
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <MapIcon className="w-4 h-4 mr-2" />
                  Map View
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-2 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading properties...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleRefreshProperties} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle - Desktop only */}
      {!isMobile && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            Card View
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="w-4 h-4 mr-2" />
            Map View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshProperties}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          <CompactMapFilters filters={filters} onFiltersChange={setFilters} />
          <PropertyFeed 
            userId={userId}
            tenantProfile={tenantProfile}
            onViewOnMap={handleViewOnMapFromList}
            listings={filteredListings}
            properties={filteredProperties}
          />
        </div>
      ) : (
        <div className="relative">
          <CompactMapFilters filters={filters} onFiltersChange={setFilters} />
          <GoogleMapsEmbed
            properties={listingsWithCoordinates as any}
            onPropertyClick={handlePropertyClick}
            selectedProperty={selectedMapProperty}
            className="h-[calc(100vh-200px)] w-full min-h-[700px]"
            viewMode={viewMode}
            areaBounds={areaBounds || undefined}
            areaLabel={areaLabel || undefined}
            areaPolygon={areaPolygon || undefined}
          />
        </div>
      )}

      {/* Property Details Modal */}
      <PropertyDetailsModalEnhanced
        property={selectedProperty}
        isOpen={showDetailsModal}
        onClose={() => {
          console.log('🔒 PropertyDetailsModalEnhanced closing');
          setShowDetailsModal(false);
          setSelectedProperty(null);
          setSelectedMapProperty(null);
        }}
        onInterestClick={handleInterestClick}
        isSubmittingInterest={isSubmittingInterest}
        hasApplied={false}
      />
    </div>
  );
};

export default PropertySearch;
