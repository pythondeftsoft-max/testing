import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Phone, Mail, MessageSquare, DollarSign, Calendar, MapPin, Edit, Download } from 'lucide-react';
import { PropertiesForSaleModal } from './PropertiesForSaleModal';
import { PropertiesForSaleEditModal } from './PropertiesForSaleEditModal';
import { PropertiesForSaleFilters } from './PropertiesForSaleFilters';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PropertyForSale {
  id: string;
  property_id: string;
  owner_id: string;
  marketing_price: number;
  additional_details?: string;
  reason_for_sale?: string;
  timeline_for_sale?: string;
  contact_preferences?: any;
  property_condition?: string;
  selling_points?: string;
  status: string;
  admin_notes?: string;
  admin_contacted_at?: string;
  admin_contacted_by?: string;
  created_at: string;
  updated_at: string;
  properties: {
    address: string;
    city: string;
    state: string;
    zipcode: string;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | null;
}

interface FilterState {
  search: string;
  status: string;
  condition: string;
  priceRange: string;
  location: string;
  dateRange: string;
}

const PropertiesForSaleTable = () => {
  const [properties, setProperties] = useState<PropertyForSale[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PropertyForSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyForSale | null>(null);
  const [editProperty, setEditProperty] = useState<PropertyForSale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    condition: '',
    priceRange: '',
    location: '',
    dateRange: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPropertiesForSale();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [properties, filters]);

  const fetchPropertiesForSale = async () => {
    try {
      console.log('Fetching properties for sale...');
      
      // First, try the standard PostgREST nested query syntax
      const { data, error } = await supabase
        .from('properties_for_sale')
        .select(`
          *,
          properties!property_id (
            address,
            city,
            state,
            zipcode,
            bedrooms,
            bathrooms,
            monthly_rent
          ),
          profiles!owner_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error with nested query, trying alternative approach:', error);
        
        // Fallback: Fetch properties_for_sale first, then join manually
        const { data: propertiesForSale, error: propertiesError } = await supabase
          .from('properties_for_sale')
          .select('*')
          .order('created_at', { ascending: false });

        if (propertiesError) {
          console.error('Error fetching properties for sale:', propertiesError);
          toast({
            title: "Error",
            description: "Failed to fetch properties for sale",
            variant: "destructive",
          });
          return;
        }

        if (!propertiesForSale || propertiesForSale.length === 0) {
          console.log('No properties for sale found');
          setProperties([]);
          return;
        }

        // Fetch related properties and profiles
        const propertyIds = propertiesForSale.map(p => p.property_id).filter(Boolean);
        const ownerIds = propertiesForSale.map(p => p.owner_id).filter(Boolean);

        const [propertiesResult, profilesResult] = await Promise.all([
          propertyIds.length > 0 ? supabase
            .from('properties')
            .select('id, address, city, state, zipcode, bedrooms, bathrooms, monthly_rent')
            .in('id', propertyIds) : { data: [], error: null },
          ownerIds.length > 0 ? supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone')
            .in('id', ownerIds) : { data: [], error: null }
        ]);

        if (propertiesResult.error || profilesResult.error) {
          console.error('Error fetching related data:', { 
            propertiesError: propertiesResult.error, 
            profilesError: profilesResult.error 
          });
          toast({
            title: "Error",
            description: "Failed to fetch complete property data",
            variant: "destructive",
          });
          return;
        }

        // Manually join the data
        const enrichedData = propertiesForSale.map(propertyForSale => ({
          ...propertyForSale,
          properties: propertiesResult.data?.find(p => p.id === propertyForSale.property_id) || null,
          profiles: profilesResult.data?.find(p => p.id === propertyForSale.owner_id) || null
        }));

        console.log('Successfully fetched properties using fallback method:', enrichedData.length);
        setProperties(enrichedData);
        return;
      }

      console.log('Successfully fetched properties using nested query:', data?.length || 0);
      setProperties(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties for sale",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('properties-for-sale-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties_for_sale'
        },
        () => {
          fetchPropertiesForSale();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('properties_for_sale')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Property status updated to ${newStatus}`,
      });

      fetchPropertiesForSale();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update property status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'reviewed':
        return <Badge variant="secondary">Reviewed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const applyFilters = () => {
    let filtered = [...properties];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(property => 
        property.properties?.address?.toLowerCase().includes(searchLower) ||
        property.properties?.city?.toLowerCase().includes(searchLower) ||
        property.properties?.state?.toLowerCase().includes(searchLower) ||
        `${property.profiles?.first_name} ${property.profiles?.last_name}`.toLowerCase().includes(searchLower) ||
        property.profiles?.email?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(property => property.status === filters.status);
    }

    // Condition filter
    if (filters.condition && filters.condition !== 'all') {
      filtered = filtered.filter(property => property.property_condition === filters.condition);
    }

    // Price range filter
    if (filters.priceRange && filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(p => p.replace('+', ''));
      filtered = filtered.filter(property => {
        const price = property.marketing_price;
        if (max) {
          return price >= parseInt(min) && price <= parseInt(max);
        } else {
          return price >= parseInt(min);
        }
      });
    }

    // Location filter
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filtered = filtered.filter(property => 
        property.properties?.city?.toLowerCase().includes(locationLower) ||
        property.properties?.state?.toLowerCase().includes(locationLower) ||
        property.properties?.zipcode?.includes(filters.location)
      );
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(property => 
        new Date(property.created_at) >= filterDate
      );
    }

    setFilteredProperties(filtered);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select properties to perform bulk actions",
        variant: "destructive",
      });
      return;
    }

    try {
      let updateData = {};
      let successMessage = '';

      switch (action) {
        case 'mark_reviewed':
          updateData = { status: 'reviewed', updated_at: new Date().toISOString() };
          successMessage = `${selectedProperties.length} properties marked as reviewed`;
          break;
        case 'mark_active':
          updateData = { status: 'active', updated_at: new Date().toISOString() };
          successMessage = `${selectedProperties.length} properties marked as active`;
          break;
        case 'mark_cancelled':
          updateData = { status: 'cancelled', updated_at: new Date().toISOString() };
          successMessage = `${selectedProperties.length} properties marked as cancelled`;
          break;
        case 'export_selected':
          exportPropertiesToCSV(properties.filter(p => selectedProperties.includes(p.id)));
          return;
        default:
          return;
      }

      const { error } = await supabase
        .from('properties_for_sale')
        .update(updateData)
        .in('id', selectedProperties);

      if (error) throw error;

      toast({
        title: "Bulk Action Completed",
        description: successMessage,
      });

      setSelectedProperties([]);
      fetchPropertiesForSale();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const exportPropertiesToCSV = (propertiesToExport: PropertyForSale[] = filteredProperties) => {
    const headers = [
      'Address', 'City', 'State', 'Zip', 'Bedrooms', 'Bathrooms',
      'Marketing Price', 'Current Rent', 'Condition', 'Status', 
      'Owner Name', 'Owner Email', 'Owner Phone', 'Listed Date', 
      'Reason for Sale', 'Timeline', 'Selling Points'
    ];

    const csvData = propertiesToExport.map(property => [
      property.properties?.address || '',
      property.properties?.city || '',
      property.properties?.state || '',
      property.properties?.zipcode || '',
      property.properties?.bedrooms || '',
      property.properties?.bathrooms || '',
      property.marketing_price,
      property.properties?.monthly_rent || '',
      property.property_condition || '',
      property.status,
      `${property.profiles?.first_name || ''} ${property.profiles?.last_name || ''}`.trim(),
      property.profiles?.email || '',
      property.profiles?.phone || '',
      new Date(property.created_at).toLocaleDateString(),
      property.reason_for_sale || '',
      property.timeline_for_sale || '',
      property.selling_points || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `properties-for-sale-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${propertiesToExport.length} properties to CSV`,
    });
  };

  const handleSelectProperty = (propertyId: string, checked: boolean) => {
    if (checked) {
      setSelectedProperties(prev => [...prev, propertyId]);
    } else {
      setSelectedProperties(prev => prev.filter(id => id !== propertyId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProperties(filteredProperties.map(p => p.id));
    } else {
      setSelectedProperties([]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading properties for sale...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PropertiesForSaleFilters
        filters={filters}
        onFilterChange={setFilters}
        onExport={() => exportPropertiesToCSV()}
        onBulkAction={handleBulkAction}
        selectedCount={selectedProperties.length}
        totalCount={filteredProperties.length}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Properties for Sale ({filteredProperties.length} of {properties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProperties.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {properties.length === 0 
                  ? "No properties currently marked for sale" 
                  : "No properties match the current filters"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProperties.length === filteredProperties.length && filteredProperties.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Marketing Price</TableHead>
                    <TableHead>Current Rent</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Listed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={(checked) => handleSelectProperty(property.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {property.properties?.address || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {property.properties?.city}, {property.properties?.state} {property.properties?.zipcode}
                          </div>
                          <div className="text-xs text-gray-400">
                            {property.properties?.bedrooms}bd / {property.properties?.bathrooms}ba
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {property.profiles?.first_name} {property.profiles?.last_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {property.profiles?.email}
                          </div>
                          {property.profiles?.phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {property.profiles.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatPrice(property.marketing_price)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatPrice(property.properties?.monthly_rent || 0)}/mo
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {property.property_condition || 'Not specified'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(property.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(property.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedProperty(property);
                              setIsModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedProperty(property);
                              setIsModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                            title="View For Sale Info"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProperty && (
        <PropertiesForSaleModal
          property={selectedProperty}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProperty(null);
          }}
          onStatusUpdate={handleUpdateStatus}
        />
      )}

      {editProperty && (
        <PropertiesForSaleEditModal
          property={editProperty}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditProperty(null);
          }}
          onUpdate={fetchPropertiesForSale}
        />
      )}
    </>
  );
};

export default PropertiesForSaleTable;