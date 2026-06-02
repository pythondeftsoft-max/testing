import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapIcon, List, RefreshCw, AlertCircle, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PropertyTeaserCard from './PropertyTeaserCard';
import GoogleMapsEmbed from './GoogleMapsEmbed';
import { useToast } from '@/hooks/use-toast';
import CompactMapFilters from './CompactMapFilters';
import { filterProperties, type PropertyFilterValues } from '@/utils/propertyFiltering';
import { useAreaGeocoding } from '@/hooks/useAreaGeocoding';
import AuthModal from './AuthModal';

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

const MarketView = () => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching properties for market view... (attempt:', retryCount + 1, ')');
      
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          bedrooms,
          bathrooms,
          monthly_rent,
          desired_rent,
          zipcode,
          city,
          state,
          street_address,
          address,
          photos,
          amenities,
          status,
          owner_id,
          unit_count,
          latitude,
          longitude,
          square_feet,
          year_built,
          property_type,
          on_market,
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
            on_market
          )
        `)
        .eq('status', 'available')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error fetching properties:', error);
        setError('Unable to load properties at the moment. Please try again later.');
        return;
      }

      console.log('✅ Properties fetched successfully for market view:', {
        total: data?.length || 0,
        withCoordinates: data?.filter(p => p.latitude && p.longitude)?.length || 0
      });

      if (data && Array.isArray(data)) {
        // Filter properties to show only those on market
        // Show property if: property.on_market = true OR at least one unit has on_market = true
        const marketProperties = data.filter(property => {
          // Check if property itself is on market
          if (property.on_market === true) {
            return true;
          }
          
          // Check if any unit is on market (for multi-unit properties)
          if (property.property_units && Array.isArray(property.property_units)) {
            return property.property_units.some(unit => unit.on_market === true);
          }
          
          return false;
        });

        const processedProperties = marketProperties.map(property => ({
          ...property,
          address: property.address || `${property.street_address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zipcode || ''}`.trim(),
        }));
        
        setProperties(processedProperties);
      } else {
        setProperties([]);
      }
    } catch (error: any) {
      console.error('💥 Unexpected error fetching properties:', error);
      
      if (retryCount < 2) {
        console.log(`🔄 Retrying fetch (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchProperties(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      setError('An unexpected error occurred while loading properties.');
    } finally {
      setLoading(false);
    }
  };

  const propertiesWithCoordinates = properties.filter(p => p.latitude && p.longitude);
  const filteredProperties = filterProperties(properties, filters);
  const filteredPropertiesWithCoordinates = filteredProperties.filter(p => p.latitude && p.longitude);

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

      const zipMatch = /^\d{5}(-\d{4})?$/.test(trimmed);
      if (zipMatch) {
        const res = await geocodeArea({ zipcode: trimmed, country: 'us' });
        return applyResult(res, trimmed);
      }

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

      if (zip) {
        const res = await geocodeArea({ zipcode: zip, country: 'us' });
        if (applyResult(res, zip)) return;
      }
      if (city) {
        const res = await geocodeArea({ city, state, country: 'us' });
        if (applyResult(res, [city, state].filter(Boolean).join(', '))) return;
      }

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

  const handlePropertyClick = (property: Property) => {
    console.log('🔍 Property clicked in market view - showing auth modal');
    setSelectedProperty(property);
    setShowAuthModal(true);
  };

  const handleInterestClick = (property: Property) => {
    console.log('💖 Interest clicked in market view - showing auth modal');
    setSelectedProperty(property);
    setShowAuthModal(true);
  };

  const handleRefreshProperties = () => {
    console.log('🔄 Manual refresh triggered in market view');
    fetchProperties();
  };

  const handleAuthRedirect = (mode: 'login' | 'signup') => {
    // Store the selected property for after authentication
    if (selectedProperty) {
      sessionStorage.setItem('selected_property_after_auth', JSON.stringify(selectedProperty));
    }
    
    // Redirect to auth page
    const redirectUrl = `/auth?mode=${mode}&redirect=${encodeURIComponent('/browse-properties')}`;
    window.location.href = redirectUrl;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Explore Properties in Your Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading properties...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Explore Properties in Your Area</CardTitle>
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
      {/* Header with Call to Action */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl text-foreground">
                Explore {filteredProperties.length} Available Properties
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Get a preview of what's available in your area. Sign up free to see detailed photos and contact landlords directly.
              </p>
            </div>
            <Button size="lg" className="shrink-0" onClick={() => setShowAuthModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Sign Up Free
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Market Preview ({filteredProperties.length} properties)</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                List View
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
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => (
              <PropertyTeaserCard
                key={property.id}
                property={property}
                onInterestClick={handleInterestClick}
                onCardClick={handlePropertyClick}
              />
            ))}
          </div>
          
          {filteredProperties.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <MapIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No properties found in this area</p>
                  <p className="text-sm">Try adjusting your search filters</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="relative">
          <CompactMapFilters filters={filters} onFiltersChange={setFilters} />
          <GoogleMapsEmbed
            properties={filteredPropertiesWithCoordinates}
            onPropertyClick={handlePropertyClick}
            selectedProperty={selectedProperty}
            className="h-[calc(100vh-200px)] w-full min-h-[700px]"
            viewMode={viewMode}
            areaBounds={areaBounds || undefined}
            areaLabel={areaLabel || undefined}
            areaPolygon={areaPolygon || undefined}
          />
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setSelectedProperty(null);
        }}
        onAuthRedirect={handleAuthRedirect}
      />
    </div>
  );
};

export default MarketView;