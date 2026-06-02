import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Bed, Bath, Square, Eye } from 'lucide-react';
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';

interface SavedProperty {
  id: string;
  property_id: string;
  created_at: string;
  properties: {
    id: string;
    address: string;
    monthly_rent: number;
    desired_rent?: number;
    bedrooms: number;
    bathrooms: number;
    square_feet?: number;
    photos: string[];
    amenities: string[];
    status: string;
    description?: string;
    property_type?: string;
    street_address?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
}

const SavedPropertiesList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedProperties();
    }
  }, [user]);

  const fetchSavedProperties = async () => {
    if (!user) return;

    try {
      // First get saved property IDs
      const { data: savedIds, error: savedError } = await supabase
        .from('saved_properties')
        .select('property_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (savedError) throw savedError;
      
      if (!savedIds || savedIds.length === 0) {
        setSavedProperties([]);
        return;
      }

      // Then get the property details
      const propertyIds = savedIds.map(s => s.property_id);
      const { data: propertiesData, error: propError } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          street_address,
          city,
          state,
          zipcode,
          monthly_rent,
          desired_rent,
          bedrooms,
          bathrooms,
          square_feet,
          photos,
          amenities,
          status,
          description,
          property_type
        `)
        .in('id', propertyIds);

      if (propError) throw propError;

      // Combine the data
      const combinedData = savedIds.map(saved => ({
        id: saved.property_id, // Use property_id as the saved property record id
        property_id: saved.property_id,
        created_at: saved.created_at,
        properties: propertiesData?.find(p => p.id === saved.property_id) || null
      })).filter(item => item.properties); // Filter out any properties that weren't found
      
      setSavedProperties(combinedData as SavedProperty[]);
    } catch (error) {
      console.error('Error fetching saved properties:', error);
      toast({
        title: "Error",
        description: "Failed to load saved properties. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveProperty = async (propertyId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', propertyId);

      if (error) throw error;
      
      setSavedProperties(prev => prev.filter(sp => sp.property_id !== propertyId));
      
      toast({
        title: "Property Removed",
        description: "Property removed from your saved list",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove property. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (property: any) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const handleInterestClick = (property: any) => {
    // Placeholder for interest functionality
    toast({
      title: "Interest Expressed",
      description: "Your interest has been noted for this property.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (savedProperties.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Saved Properties</h3>
          <p className="text-gray-600 mb-6">
            You haven't saved any properties yet. Browse the marketplace to find homes you like!
          </p>
          <Button onClick={() => window.location.href = '/marketplace'}>
            Browse Properties
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Saved Homes ({savedProperties.length})</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedProperties.map((savedProperty) => {
          const property = savedProperty.properties;
          const displayRent = property.desired_rent || property.monthly_rent;
          const photos = property.photos || [];

          return (
            <Card key={savedProperty.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {photos.length > 0 ? (
                  <img
                    src={photos[0]}
                    alt="Property"
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleUnsaveProperty(property.id)}
                >
                  <Heart className="h-4 w-4 fill-current text-red-500" />
                </Button>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-semibold">${displayRent.toLocaleString()}/month</h3>
                  <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
                    {property.status}
                  </Badge>
                </div>

                <div className="flex items-center text-gray-600 mb-3">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm truncate">{property.address}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Bed className="h-4 w-4 mr-1" />
                    <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center">
                    <Bath className="h-4 w-4 mr-1" />
                    <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                  </div>
                  {property.square_feet && (
                    <div className="flex items-center">
                      <Square className="h-4 w-4 mr-1" />
                      <span>{property.square_feet} sq ft</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetails(property)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleInterestClick(property)}
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    Interest
                  </Button>
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  Saved on {new Date(savedProperty.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedProperty && (
        <PropertyDetailsModalEnhanced
          property={selectedProperty}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onInterestClick={handleInterestClick}
          isSubmittingInterest={false}
          hasApplied={false}
        />
      )}
    </div>
  );
};

export default SavedPropertiesList;