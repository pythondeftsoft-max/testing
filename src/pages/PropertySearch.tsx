import React, { useState, useEffect } from 'react';
import InternationalPropertySearch from '@/components/enhanced-search/InternationalPropertySearch';
import InternationalPropertyCard from '@/components/enhanced-property/InternationalPropertyCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ApplicationForm from '@/components/applications/ApplicationForm';
import { useUserInternationalContext } from '@/hooks/useUserInternationalContext';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';
import { Globe, MapPin } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { InternationalProperty } from '@/lib/internationalUtils';

// Mock data for demonstration
const mockProperties: (InternationalProperty & { id: string; title: string; bedrooms: number; bathrooms: number; square_feet: number; photos: string[]; amenities: string[]; landlord_rating: number; is_high_demand: boolean; is_new_listing: boolean; price_reduced: boolean })[] = [
  {
    id: '1',
    title: 'Modern Downtown Apartment',
    rent: 2500,
    currency: 'USD',
    countryCode: 'US',
    address: {
      street_1: '123 Main Street',
      city: 'New York',
      state_province: 'NY',
      postal_code: '10001',
      
    },
    bedrooms: 2,
    bathrooms: 2,
    square_feet: 1200,
    photos: ['/placeholder.svg'],
    amenities: ['Gym', 'Pool', 'Parking'],
    landlord_rating: 4.8,
    is_high_demand: true,
    is_new_listing: false,
    price_reduced: false
  },
  {
    id: '2',
    title: 'Cozy London Flat',
    rent: 1800,
    currency: 'GBP',
    countryCode: 'GB',
    address: {
      street_1: '45 Victoria Road',
      city: 'London',
      state_province: 'England',
      postal_code: 'SW1A 1AA',
      
    },
    bedrooms: 1,
    bathrooms: 1,
    square_feet: 800,
    photos: ['/placeholder.svg'],
    amenities: ['Garden', 'Parking'],
    landlord_rating: 4.6,
    is_high_demand: false,
    is_new_listing: true,
    price_reduced: false
  }
];

const PropertySearch = () => {
  const [filteredProperties, setFilteredProperties] = useState(mockProperties);
  const [savedProperties, setSavedProperties] = useState<Set<string>>(new Set());
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const { internationalContext, isLoading } = useUserInternationalContext();
  const marketplaceEvents = useMarketplaceEvents();
  const [searchParams] = useSearchParams();

  // Handle deep linking to specific property
  React.useEffect(() => {
    const propertyId = searchParams.get('propertyId');
    if (propertyId) {
      const property = mockProperties.find(p => p.id === propertyId);
      if (property) {
        setSelectedProperty(property);
        setShowApplicationModal(true);
      }
    }
  }, [searchParams]);

  // Log search view loaded event when component mounts
  React.useEffect(() => {
    marketplaceEvents.mutate({
      eventType: 'search_view_loaded',
      metadata: { 
        totalPropertiesAvailable: mockProperties.length,
        userCountry: internationalContext?.countryCode,
        userCurrency: internationalContext?.currency
      }
    });
  }, [internationalContext, marketplaceEvents]);

  const handleSearch = (filters: any) => {
    // In a real app, this would make an API call
    console.log('Search filters:', filters);
    
    let filtered = mockProperties;
    
    if (filters.country) {
      filtered = filtered.filter(p => p.countryCode.toLowerCase() === filters.country.toLowerCase());
    }
    
    if (filters.location) {
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(filters.location.toLowerCase()) ||
        p.address.city?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter(p => {
        const price = p.rent;
        return (!filters.minPrice || price >= filters.minPrice) &&
               (!filters.maxPrice || price <= filters.maxPrice);
      });
    }
    
    setFilteredProperties(filtered);
  };

  const handleInterestClick = (property: any) => {
    console.log('Interest expressed in:', property.title || property.id);
    // Handle interest expression
  };

  const handleCardClick = (property: any) => {
    setSelectedProperty(property);
    setShowApplicationModal(true);
  };

  const handleSaveProperty = (propertyId: string, isSaved: boolean) => {
    const newSavedProperties = new Set(savedProperties);
    if (isSaved) {
      newSavedProperties.add(propertyId);
    } else {
      newSavedProperties.delete(propertyId);
    }
    setSavedProperties(newSavedProperties);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Property Search</h1>
            {internationalContext && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {internationalContext.countryCode} • {internationalContext.currency}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Find your perfect property with international search and currency conversion.
          </p>
        </div>

        {/* Current Context Indicator */}
        {!isLoading && internationalContext && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Searching from: {internationalContext.countryCode} • Prices shown in {internationalContext.currency}
                  </span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/settings">Change Location</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Component */}
        <InternationalPropertySearch onSearch={handleSearch} />

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {filteredProperties.length} Properties Found
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <InternationalPropertyCard
                key={property.id}
                property={property}
                onInterestClick={handleInterestClick}
                onCardClick={handleCardClick}
                onSaveProperty={handleSaveProperty}
                isSaved={savedProperties.has(property.id)}
                hasApplied={false}
                hasViewed={false}
                isSubmittingInterest={false}
              />
            ))}
          </div>

          {filteredProperties.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No properties found matching your criteria. Try adjusting your search filters.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Application Modal */}
        <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Apply for {selectedProperty?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedProperty && (
              <ApplicationForm
                propertyId={selectedProperty.id}
                onSuccess={() => {
                  setShowApplicationModal(false);
                  setSelectedProperty(null);
                }}
                onCancel={() => {
                  setShowApplicationModal(false);
                  setSelectedProperty(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PropertySearch;