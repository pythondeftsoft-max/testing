
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, Eye, Edit, Home, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface ImportedProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  property_type: string;
  monthly_rent: number;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  description: string | null;
  status: string;
  on_market: boolean;
  import_source: string;
  import_completed: boolean;
  created_at: string;
}

const ImportedPropertiesTab = () => {
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch imported properties that need completion
  const { data: importedProperties, isLoading } = useQuery({
    queryKey: ['importedProperties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('import_source', 'csv_import')
        .eq('import_completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ImportedProperty[];
    }
  });

  // Mark properties as completed
  const markAsCompletedMutation = useMutation({
    mutationFn: async (propertyIds: string[]) => {
      const { error } = await supabase
        .from('properties')
        .update({ 
          import_completed: true,
          status: 'available',
          on_market: true
        })
        .in('id', propertyIds);

      if (error) throw error;
      return propertyIds;
    },
    onSuccess: (propertyIds) => {
      queryClient.invalidateQueries({ queryKey: ['importedProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(`Marked ${propertyIds.length} properties as completed and available`);
      setSelectedProperties([]);
    },
    onError: (error) => {
      toast.error('Failed to update properties: ' + error.message);
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProperties(importedProperties?.map(p => p.id) || []);
    } else {
      setSelectedProperties([]);
    }
  };

  const handleSelectProperty = (propertyId: string, checked: boolean) => {
    if (checked) {
      setSelectedProperties(prev => [...prev, propertyId]);
    } else {
      setSelectedProperties(prev => prev.filter(id => id !== propertyId));
    }
  };

  const handleMarkAsCompleted = () => {
    if (selectedProperties.length === 0) {
      toast.error('Please select properties to mark as completed');
      return;
    }
    markAsCompletedMutation.mutate(selectedProperties);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading imported properties...</div>
      </div>
    );
  }

  if (!importedProperties || importedProperties.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Properties Completed</h3>
            <p className="text-muted-foreground">
              No imported properties need completion. All your imported properties are ready!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <CardTitle>Imported Properties Need Completion</CardTitle>
              <Badge variant="secondary">{importedProperties.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedProperties.length === importedProperties.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            These properties were imported but need review before being made available on the market.
          </p>
        </CardHeader>
        <CardContent>
          {selectedProperties.length > 0 && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedProperties.length} properties selected
                </span>
                <Button
                  onClick={handleMarkAsCompleted}
                  disabled={markAsCompletedMutation.isPending}
                  size="sm"
                >
                  Mark as Completed & Available
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {importedProperties.map((property) => (
              <Card key={property.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedProperties.includes(property.id)}
                    onCheckedChange={(checked) => handleSelectProperty(property.id, !!checked)}
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          {property.address}
                        </h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.city}, {property.state} {property.zipcode}
                        </p>
                      </div>
                      <Badge variant="outline">{property.property_type}</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Rent:</span> ${property.monthly_rent}
                      </div>
                      {property.bedrooms && (
                        <div>
                          <span className="font-medium">Beds:</span> {property.bedrooms}
                        </div>
                      )}
                      {property.bathrooms && (
                        <div>
                          <span className="font-medium">Baths:</span> {property.bathrooms}
                        </div>
                      )}
                      {property.square_feet && (
                        <div>
                          <span className="font-medium">Sq Ft:</span> {property.square_feet}
                        </div>
                      )}
                    </div>

                    {property.description && (
                      <p className="text-sm text-muted-foreground">
                        {property.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        Imported {new Date(property.created_at).toLocaleDateString()}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/properties/${property.id}/edit`}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit Details
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportedPropertiesTab;
