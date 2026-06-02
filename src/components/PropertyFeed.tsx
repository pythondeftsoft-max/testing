
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Search } from 'lucide-react';
import PropertyGrid from './PropertyGrid';
import PropertyDetailsModalEnhanced from './PropertyDetailsModalEnhanced';
import QuickApplicationConfirmDialog from '@/components/applications/QuickApplicationConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { transformPropertiesToListings, type MarketplaceListing } from '@/utils/marketplaceListings';

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
  latitude?: number;
  longitude?: number;
}

interface PropertyFeedProps {
  userId: string;
  tenantProfile?: any;
  onViewOnMap?: (property: Property) => void;
  listings?: MarketplaceListing[]; // Accept pre-filtered listings from parent
  properties?: Property[]; // Accept pre-filtered properties from parent
}

const PropertyFeed = ({ 
  userId, 
  tenantProfile, 
  onViewOnMap,
  listings: externalListings,
  properties: externalProperties 
}: PropertyFeedProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingInterest, setSubmittingInterest] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationProperty, setApplicationProperty] = useState<Property | null>(null);
  const { toast } = useToast();

  // If external data provided, use it instead of fetching
  useEffect(() => {
    if (externalListings && externalProperties) {
      console.log('📦 PropertyFeed: Using external data', {
        listingsCount: externalListings.length,
        propertiesCount: externalProperties.length,
        listingsSample: externalListings.slice(0, 2).map(l => ({ id: l.id, address: l.address, unitName: l.unitName }))
      });
      setListings(externalListings);
      setProperties(externalProperties);
      setLoading(false);
      return;
    }
    
    // Otherwise fetch independently (backward compatibility)
    fetchProperties();
  }, [externalListings, externalProperties]);

  const fetchProperties = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 PropertyFeed: Fetching properties... (attempt:', retryCount + 1, ')');
      
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
            on_market
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ PropertyFeed: Database error:', error);
        
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          setError('Unable to access property data. Please check your permissions.');
        } else {
          setError(`Failed to load properties: ${error.message}`);
        }
        return;
      }

      console.log('✅ PropertyFeed: Properties fetched:', {
        count: data?.length || 0,
        sample: data?.[0]?.id || 'none'
      });

      if (data && Array.isArray(data)) {
        console.log('🔍 PropertyFeed: Raw data before filtering:', {
          totalFetched: data.length,
          sampleProperties: data.slice(0, 3).map(p => ({
            id: p.id,
            address: p.address || p.street_address,
            on_market: p.on_market,
            units: p.property_units?.length || 0,
            unitsOnMarket: p.property_units?.filter((u: any) => u.on_market).length || 0
          }))
        });

        // Filter to show only properties on market
        // Show property if: property.on_market = true OR at least one unit has on_market = true
        const marketProperties = data.filter(property => {
          // Check if property itself is on market
          if (property.on_market === true) {
            console.log('✅ PropertyFeed: Property on market:', property.id, property.address || property.street_address);
            return true;
          }
          
          // Check if any unit is on market (for multi-unit properties)
          if (property.property_units && Array.isArray(property.property_units)) {
            const hasOnMarketUnit = property.property_units.some(unit => unit.on_market === true);
            if (hasOnMarketUnit) {
              console.log('✅ PropertyFeed: Property has on-market units:', property.id, property.address || property.street_address);
            }
            return hasOnMarketUnit;
          }
          
          console.log('❌ PropertyFeed: Property not on market:', property.id, property.address || property.street_address);
          return false;
        });

        console.log('🎯 PropertyFeed: After marketplace filtering:', {
          originalCount: data.length,
          marketCount: marketProperties.length,
          filteredOut: data.length - marketProperties.length
        });

        const processedProperties = marketProperties.map(property => ({
          ...property,
          address: property.address || `${property.street_address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zipcode || ''}`.trim(),
        }));
        
        // Transform properties to unit-centric listings
        console.log('🔄 PropertyFeed: Transforming to unit-centric listings...');
        const transformedListings = transformPropertiesToListings(processedProperties);
        
        console.log('✨ PropertyFeed: Transformation complete:', {
          propertiesCount: processedProperties.length,
          listingsCount: transformedListings.length,
          listingsSample: transformedListings.slice(0, 3).map(l => ({
            id: l.id,
            address: l.address,
            unitName: l.unitName,
            rent: l.rent
          }))
        });
        
        setProperties(processedProperties);
        setListings(transformedListings);
        
        if (processedProperties.length === 0) {
          toast({
            title: "No Properties Found",
            description: "No available properties found in the system.",
          });
        }
      } else {
        setProperties([]);
      }
    } catch (error: any) {
      console.error('💥 PropertyFeed: Unexpected error:', error);
      
      // Retry logic
      if (retryCount < 2 && (error.name === 'NetworkError' || error.message?.includes('fetch'))) {
        console.log(`🔄 PropertyFeed: Retrying (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchProperties(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      setError('An unexpected error occurred while loading properties.');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestClick = (property: Property) => {
    console.log('💖 PropertyFeed: Opening application dialog for:', property.id);
    setApplicationProperty(property);
    setShowApplicationModal(true);
  };

  const handleCardClick = (listing: MarketplaceListing) => {
    console.log('🏠 PropertyFeed: Card clicked for listing:', listing.id, {
      type: listing.type,
      unitName: listing.unitName,
      address: listing.address
    });
    // Pass the listing object directly - PropertyDetailsModal will detect if it's a unit listing
    setSelectedProperty(listing as any);
    setShowDetailsModal(true);
  };

  const handleViewOnMap = (property: Property) => {
    console.log('🗺️ PropertyFeed: View on map for:', property.id);
    onViewOnMap?.(property);
  };

  const handleRefresh = () => {
    console.log('🔄 PropertyFeed: Manual refresh triggered');
    fetchProperties();
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2 text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading properties...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PropertyGrid
        properties={listings as any}
        allProperties={properties}
        onInterestClick={handleInterestClick as any}
        submittingInterest={submittingInterest}
        onCardClick={handleCardClick as any}
        onViewOnMap={handleViewOnMap}
      />

      {/* Property Details Modal */}
      <PropertyDetailsModalEnhanced
        property={selectedProperty}
        isOpen={showDetailsModal}
        onClose={() => {
          console.log('🔒 PropertyDetailsModalEnhanced closing from PropertyFeed');
          setShowDetailsModal(false);
          setSelectedProperty(null);
        }}
        onInterestClick={handleInterestClick}
        isSubmittingInterest={submittingInterest === selectedProperty?.id}
        hasApplied={false}
      />

      {/* Quick Application Dialog */}
      {applicationProperty && (
        <QuickApplicationConfirmDialog
          isOpen={showApplicationModal}
          onClose={() => {
            setShowApplicationModal(false);
            setApplicationProperty(null);
          }}
          property={applicationProperty}
          unitId={null}
          onSuccess={() => {
            setShowApplicationModal(false);
            setApplicationProperty(null);
            toast({
              title: "Application Submitted! 🎉",
              description: "Your application has been sent to the landlord.",
            });
          }}
        />
      )}
    </>
  );
};

export default PropertyFeed;
