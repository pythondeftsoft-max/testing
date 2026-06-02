
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Home, Building, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SingleFamilyDuplicate {
  owner_id: string;
  norm_address: string;
  duplicate_count: number;
  property_ids: string[];
  addresses: string[];
}

interface UnitDuplicate {
  property_id: string;
  norm_unit: string;
  duplicate_count: number;
  unit_ids: string[];
  unit_numbers: string[];
}

export function DuplicateManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [singleFamilyDuplicates, setSingleFamilyDuplicates] = useState<SingleFamilyDuplicate[]>([]);
  const [unitDuplicates, setUnitDuplicates] = useState<UnitDuplicate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDuplicates();
  }, [user]);

  const loadDuplicates = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load single-family duplicates
      const sfResult = await supabase
        .from('duplicates_single_family_by_owner' as any)
        .select('*')
        .eq('owner_id', user.id);

      if (sfResult.error) {
        console.error('Error loading single-family duplicates:', sfResult.error);
      } else {
        setSingleFamilyDuplicates((sfResult.data || []) as unknown as SingleFamilyDuplicate[]);
      }

      // Load unit duplicates for user's properties
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', user.id);

      if (properties && properties.length > 0) {
        const propertyIds = properties.map(p => p.id);
        const unitResult = await supabase
          .from('duplicates_units' as any)
          .select('*')
          .in('property_id', propertyIds);

        if (unitResult.error) {
          console.error('Error loading unit duplicates:', unitResult.error);
        } else {
          setUnitDuplicates((unitResult.data || []) as unknown as UnitDuplicate[]);
        }
      }
    } catch (error) {
      console.error('Error loading duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to load duplicates.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      const { error } = await supabase.rpc('soft_delete_property', {
        target_property_id: propertyId,
        deleted_by_user_id: user?.id
      });

      if (error) throw error;

      toast({
        title: "Property Deleted",
        description: "Duplicate property has been removed.",
      });

      // Reload duplicates
      loadDuplicates();
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete property.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    try {
      const { error } = await supabase
        .from('property_units')
        .delete()
        .eq('id', unitId);

      if (error) throw error;

      toast({
        title: "Unit Deleted",
        description: "Duplicate unit has been removed.",
      });

      // Reload duplicates
      loadDuplicates();
    } catch (error: any) {
      console.error('Error deleting unit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete unit.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading duplicates...</p>
        </div>
      </div>
    );
  }

  const totalDuplicates = singleFamilyDuplicates.length + unitDuplicates.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Duplicate Manager</h2>
          <p className="text-muted-foreground">
            Manage and clean up duplicate properties and units
          </p>
        </div>
        <Badge variant={totalDuplicates > 0 ? "destructive" : "secondary"}>
          {totalDuplicates} duplicate groups found
        </Badge>
      </div>

      {totalDuplicates === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Home className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
            <p className="text-muted-foreground text-center">
              Great! Your portfolio is clean with no duplicate properties or units.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="properties" className="space-y-4">
          <TabsList>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Properties ({singleFamilyDuplicates.length})
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Units ({unitDuplicates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4">
            {singleFamilyDuplicates.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <p className="text-center text-muted-foreground">
                    No duplicate properties found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              singleFamilyDuplicates.map((duplicate, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <CardTitle className="text-lg">Duplicate Properties</CardTitle>
                      </div>
                      <Badge variant="destructive">
                        {duplicate.duplicate_count} duplicates
                      </Badge>
                    </div>
                    <CardDescription>
                      Normalized address: {duplicate.norm_address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {duplicate.addresses.map((address, addrIndex) => (
                        <div key={addrIndex} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{address}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {duplicate.property_ids[addrIndex]}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteProperty(duplicate.property_ids[addrIndex])}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="units" className="space-y-4">
            {unitDuplicates.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <p className="text-center text-muted-foreground">
                    No duplicate units found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              unitDuplicates.map((duplicate, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <CardTitle className="text-lg">Duplicate Units</CardTitle>
                      </div>
                      <Badge variant="destructive">
                        {duplicate.duplicate_count} duplicates
                      </Badge>
                    </div>
                    <CardDescription>
                      Property ID: {duplicate.property_id} | Normalized unit: {duplicate.norm_unit}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {duplicate.unit_numbers.map((unitNumber, unitIndex) => (
                        <div key={unitIndex} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Unit {unitNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {duplicate.unit_ids[unitIndex]}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUnit(duplicate.unit_ids[unitIndex])}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clean Up Actions</CardTitle>
          <CardDescription>
            Use these tools to maintain a clean portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={loadDuplicates} variant="outline">
              Refresh Duplicates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
