import React from 'react';
import ComprehensivePropertyCard, { PropertyCardDemo } from '@/components/ComprehensivePropertyCard';
import BrowsePropertyCard from '@/components/BrowsePropertyCard';
import UnitBrowseCard from '@/components/UnitBrowseCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Enhanced test data for properties
const testPropertiesData = [
  {
    id: '1',
    address: '123 Luxury Heights Blvd',
    street_address: '123 Luxury Heights Blvd',
    city: 'San Francisco',
    state: 'CA',
    zipcode: '94105',
    bedrooms: 2,
    bathrooms: 2,
    monthly_rent: 4200,
    desired_rent: 4200,
    square_feet: 1200,
    year_built: 2021,
    property_type: 'apartment',
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560449752-65d9b2467242?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
    ],
    amenities: ['Pool', 'Gym', 'Parking', 'WiFi', 'AC', 'Heating', 'Laundry', 'Dishwasher', 'Security'],
    special_offers: ['2 Months Free', '0% Security Deposit'],
    pet_policy: 'Dogs & Cats Welcome',
    lease_terms: ['12 months', '6 months'],
    walk_score: 95,
    bike_score: 88,
    transit_score: 82,
    move_in_date: '2024-08-01',
    description: 'Stunning modern apartment in the heart of downtown with panoramic city views, floor-to-ceiling windows, and premium finishes throughout.',
    status: 'available',
    owner_id: 'owner1',
    unit_count: 1
  },
  {
    id: '2', 
    address: '456 Garden Vista Complex',
    street_address: '456 Garden Vista Way',
    city: 'Austin',
    state: 'TX',
    zipcode: '78701',
    bedrooms: 3,
    bathrooms: 2.5,
    monthly_rent: 2800,
    desired_rent: 2800,
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'
    ],
    amenities: ['Garden', 'Parking', 'WiFi', 'AC', 'Heating', 'Washer/Dryer', 'Pool'],
    special_offers: ['Pet Fee Waived'],
    status: 'available',
    owner_id: 'owner2',
    unit_count: 24,
    property_units: [
      {
        id: 'unit1',
        unit_number: '101',
        unit_name: 'Garden View Studio',
        bedrooms: 1,
        bathrooms: 1,
        monthly_rent: 1800,
        status: 'available',
        square_feet: 650,
        description: 'Cozy studio with garden view',
        unit_amenities: ['Garden View', 'WiFi', 'AC']
      },
      {
        id: 'unit2',
        unit_number: '201',
        unit_name: 'Premium Two Bedroom',
        bedrooms: 2,
        bathrooms: 2,
        monthly_rent: 2400,
        status: 'available',
        square_feet: 950,
        description: 'Spacious two bedroom with balcony',
        unit_amenities: ['Balcony', 'WiFi', 'AC', 'Dishwasher']
      }
    ]
  },
  {
    id: '3',
    address: '789 Metropolitan Towers',
    street_address: '789 Metropolitan Ave',
    city: 'New York',
    state: 'NY',
    zipcode: '10001',
    bedrooms: 1,
    bathrooms: 1,
    monthly_rent: 3800,
    desired_rent: 3600,
    photos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
    ],
    amenities: ['Gym', 'Parking', 'WiFi', 'AC', 'Heating', 'Security', 'Concierge'],
    special_offers: ['Move-in Special: $500 Off First Month'],
    status: 'available',
    owner_id: 'owner3',
    unit_count: 1
  }
];

// Test unit data
const testUnitsData = [
  {
    id: 'unit1',
    property_id: 'prop1',
    unit_number: '201',
    unit_name: 'Penthouse Suite',
    monthly_rent: 3200,
    bedrooms: 2,
    bathrooms: 2,
    square_feet: 1400,
    status: 'available',
    floor_number: 20,
    unit_amenities: ['City View', 'Balcony', 'WiFi', 'AC', 'Dishwasher', 'Parking'],
    unit_photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560449752-65d9b2467242?w=800'
    ],
    description: 'Stunning penthouse with panoramic city views and premium finishes.',
    property: {
      address: '123 Sky Tower',
      city: 'San Francisco',
      state: 'CA',
      zipcode: '94105',
      latitude: 37.7749,
      longitude: -122.4194
    }
  },
  {
    id: 'unit2',
    property_id: 'prop1',
    unit_number: '105',
    unit_name: 'Garden Level Studio',
    monthly_rent: 2400,
    bedrooms: 1,
    bathrooms: 1,
    square_feet: 800,
    status: 'available',
    floor_number: 1,
    unit_amenities: ['Garden Access', 'WiFi', 'AC', 'Laundry'],
    unit_photos: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
      'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800'
    ],
    description: 'Cozy studio with direct garden access and natural light.',
    property: {
      address: '456 Garden Complex',
      city: 'Austin',
      state: 'TX',
      zipcode: '78701',
      latitude: 30.2672,
      longitude: -97.7431
    }
  }
];

const PropertyCardsDemo = () => {
  const handleInterestClick = (item: any) => {
    console.log('Interest clicked for:', item.address || item.unit_name);
  };

  const handleCardClick = (item: any) => {
    console.log('Card clicked for:', item.address || item.unit_name);
  };

  const handleViewOnMap = (item: any) => {
    console.log('View on map clicked for:', item.address || item.unit_name);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Comprehensive Property Cards</h1>
          <p className="text-muted-foreground text-lg">
            Modern, Zillow-inspired property cards with image galleries, detailed amenities, and captivating design
          </p>
        </div>

        {/* Comprehensive Property Cards */}
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">🏡 Comprehensive Property Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {testPropertiesData.map((property) => (
                  <ComprehensivePropertyCard
                    key={property.id}
                    property={property}
                    onInterestClick={handleInterestClick}
                    onCardClick={handleCardClick}
                    onViewOnMap={handleViewOnMap}
                    isSubmittingInterest={false}
                    hasApplied={property.id === '2'}
                    hasViewed={property.id === '3'}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Enhanced Browse Property Cards */}
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">🏢 Enhanced Browse Property Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {testPropertiesData.map((property) => (
                  <BrowsePropertyCard
                    key={property.id}
                    property={property}
                    onInterestClick={handleInterestClick}
                    onCardClick={handleCardClick}
                    isSubmittingInterest={false}
                    hasApplied={property.id === '1'}
                    hasViewed={property.id === '2'}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Enhanced Unit Browse Cards */}
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">🏠 Enhanced Unit Browse Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {testUnitsData.map((unit) => (
                  <UnitBrowseCard
                    key={unit.id}
                    unit={unit}
                    onInterestClick={handleInterestClick}
                    onCardClick={handleCardClick}
                    onViewOnMap={handleViewOnMap}
                    isSubmittingInterest={false}
                    hasApplied={unit.id === 'unit1'}
                    hasViewed={unit.id === 'unit2'}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Features Overview */}
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">✨ Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🖼️ Image Galleries</h3>
                  <p className="text-muted-foreground text-sm">
                    Interactive photo galleries with navigation arrows, indicators, and photo counts
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🎯 Special Offers</h3>
                  <p className="text-muted-foreground text-sm">
                    Prominent special offer banners to attract attention to deals
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🏃‍♂️ Walk/Bike/Transit Scores</h3>
                  <p className="text-muted-foreground text-sm">
                    Color-coded walkability and transportation scores
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🛠️ Rich Amenities</h3>
                  <p className="text-muted-foreground text-sm">
                    Icon-based amenities grid with visual indicators
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🐕 Pet & Lease Info</h3>
                  <p className="text-muted-foreground text-sm">
                    Clear pet policies and lease term information
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">📱 Mobile Responsive</h3>
                  <p className="text-muted-foreground text-sm">
                    Beautiful design that works perfectly on all screen sizes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default PropertyCardsDemo;