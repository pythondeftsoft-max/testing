
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Eye, Users, Building, Clipboard, UserPlus, UserX, Settings } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { supabase } from '@/integrations/supabase/client';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';
import ApplicationsManagerDialog from './ApplicationsManagerDialog';
import { OnMarketToggle } from '../property/OnMarketToggle';
import { TenantQuickActions } from '../property/TenantQuickActions';
import { AdminUnitsManagerDialog } from './AdminUnitsManagerDialog';

interface Property {
  id: string;
  address: string;
  monthly_rent: number | null;
  unit_count: number | null;
  occupancy_status: string | null;
  on_market: boolean | null;
  status: string | null;
  owner_id: string | null;
  created_at: string;
  tenant_request_count: number | null;
}

const PropertiesDirectory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showApplicationsDialog, setShowApplicationsDialog] = useState<Property | null>(null);
  const [showUnitsDialog, setShowUnitsDialog] = useState<Property | null>(null);

  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-properties', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('*')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('address', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Property[];
    },
  });

  const handlePropertyStatusChange = () => {
    refetch();
  };

  const filteredProperties = properties.filter(property =>
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-6">Loading properties...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Properties Directory</h2>
          <p className="text-muted-foreground">Manage all properties in the system</p>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          Admin Mode ({filteredProperties.length} properties)
        </Badge>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search properties by address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="hover:shadow-md transition-shadow border-amber-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg font-medium leading-tight mb-2">
                    {property.address}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {property.occupancy_status || 'Unknown'}
                    </Badge>
                    <Badge 
                      variant={property.on_market ? "default" : "outline"}
                      className="text-xs"
                    >
                      {property.on_market ? "On Market" : "Off Market"}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProperty(property)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {property.monthly_rent && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CurrencyDisplay amount={property.monthly_rent} />/mo
                  </div>
                )}
                {property.unit_count && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-600" />
                    <span>{property.unit_count} units</span>
                  </div>
                )}
                {property.tenant_request_count && property.tenant_request_count > 0 && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Clipboard className="h-4 w-4 text-orange-600" />
                    <span>{property.tenant_request_count} tenant requests</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {property.unit_count <= 1 && (
                  <OnMarketToggle
                    propertyId={property.id}
                    currentOnMarket={property.on_market ?? false}
                    onStatusChange={handlePropertyStatusChange}
                    adminMode={true}
                  />
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApplicationsDialog(property)}
                      className="flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Applications
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUnitsDialog(property)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Manage Units
                    </Button>
                  </div>

                  <TenantQuickActions
                    propertyId={property.id}
                    propertyAddress={property.address}
                    hasTenant={property.occupancy_status === 'occupied'}
                    onStatusChange={handlePropertyStatusChange}
                    currentOnMarket={property.on_market ?? false}
                    adminMode={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? 'No properties found matching your search.' : 'No properties found.'}
          </p>
        </div>
      )}

      {selectedProperty && (
        <PropertyDetailsModal
          property={selectedProperty}
          isOpen={true}
          onClose={() => setSelectedProperty(null)}
          isAdmin={true}
        />
      )}

      {showApplicationsDialog && (
        <ApplicationsManagerDialog
          isOpen={true}
          onClose={() => setShowApplicationsDialog(null)}
          property={showApplicationsDialog}
        />
      )}

      {showUnitsDialog && (
        <AdminUnitsManagerDialog
          isOpen={true}
          onClose={() => setShowUnitsDialog(null)}
          property={showUnitsDialog}
        />
      )}
    </div>
  );
};

export { PropertiesDirectory };
