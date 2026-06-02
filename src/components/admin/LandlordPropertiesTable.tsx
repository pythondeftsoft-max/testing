import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronRight, Building, MapPin, Users } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface Property {
  id: string;
  address: string;
  monthly_rent: number;
  status: string;
  bedrooms: number;
  bathrooms: number;
  unit_count: number;
}

interface Landlord {
  id: string;
  full_name: string;
  company_name: string;
  phone: string;
  user_type: string;
  properties: Property[];
  total_properties: number;
  total_revenue: number;
  occupied_properties: number;
}

const LandlordPropertiesTable = () => {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLandlords, setExpandedLandlords] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLandlordsWithProperties();
  }, []);

  const fetchLandlordsWithProperties = async () => {
    try {
      const { data: landlordsData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          company_name,
          phone,
          user_type,
          properties (
            id,
            address,
            monthly_rent,
            status,
            bedrooms,
            bathrooms,
            unit_count
          )
        `)
        .in('user_type', ['landlord', 'property_manager', 'individual_owner']);

      if (error) {
        console.error('Error fetching landlords with properties:', error);
        return;
      }

      const transformedData = landlordsData?.map(landlord => {
        const properties = landlord.properties || [];
        const totalRevenue = properties
          .filter(p => p.status === 'occupied')
          .reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
        const occupiedProperties = properties.filter(p => p.status === 'occupied').length;

        return {
          id: landlord.id,
          full_name: `${landlord.first_name || ''} ${landlord.last_name || ''}`.trim() || 'N/A',
          company_name: landlord.company_name || '',
          phone: landlord.phone || 'N/A',
          user_type: landlord.user_type,
          properties: properties,
          total_properties: properties.length,
          total_revenue: totalRevenue,
          occupied_properties: occupiedProperties,
        };
      }) || [];

      // Sort by total properties descending
      transformedData.sort((a, b) => b.total_properties - a.total_properties);
      setLandlords(transformedData);
    } catch (error) {
      console.error('Error fetching landlords with properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLandlords = landlords.filter(landlord =>
    landlord.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    landlord.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    landlord.properties.some(p => p.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleLandlordExpansion = (landlordId: string) => {
    const newExpanded = new Set(expandedLandlords);
    if (newExpanded.has(landlordId)) {
      newExpanded.delete(landlordId);
    } else {
      newExpanded.add(landlordId);
    }
    setExpandedLandlords(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'occupied':
        return <Badge className="bg-green-100 text-green-800">Occupied</Badge>;
      case 'vacant':
        return <Badge variant="outline" className="text-orange-600">Vacant</Badge>;
      case 'available':
        return <Badge variant="secondary">Available</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOccupancyRatio = (property: Property) => {
    if (property.unit_count === 1) {
      // For single units, check if it's occupied
      const occupiedCount = property.status === 'occupied' ? 1 : 0;
      return `${occupiedCount}/1`;
    } else {
      // For multi-unit properties, we'd need to calculate from actual unit data
      // For now, we'll estimate based on status - this could be enhanced with actual unit data
      const occupiedCount = property.status === 'occupied' ? property.unit_count : 0;
      return `${occupiedCount}/${property.unit_count}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading landlords and properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search landlords, companies, or properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filteredLandlords.map((landlord) => (
          <Collapsible key={landlord.id}>
            <CollapsibleTrigger
              onClick={() => toggleLandlordExpansion(landlord.id)}
              className="w-full"
            >
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  {expandedLandlords.has(landlord.id) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{landlord.full_name}</div>
                    <div className="text-sm text-gray-500">
                      {landlord.company_name && `${landlord.company_name} • `}
                      {landlord.phone}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span>{landlord.total_properties} properties</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>{landlord.occupied_properties} occupied</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CurrencyDisplay amount={landlord.total_revenue} className="font-medium" />
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {landlord.user_type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="ml-8 mr-4 mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property Address</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Occupancy</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {landlord.properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{property.address}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{property.unit_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {getOccupancyRatio(property)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {property.bedrooms && property.bathrooms ? (
                              <span>{property.bedrooms}bd, {property.bathrooms}ba</span>
                            ) : (
                              <span>{property.unit_count} unit(s)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CurrencyDisplay amount={property.monthly_rent} className="font-medium" />
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(property.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {landlord.properties.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No properties found for this landlord.
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {filteredLandlords.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No landlords found matching your search.' : 'No landlords found.'}
        </div>
      )}
    </div>
  );
};

export default LandlordPropertiesTable;
