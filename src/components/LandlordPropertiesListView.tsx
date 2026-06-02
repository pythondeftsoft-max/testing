
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Home, DollarSign, Bed, Bath, Building, Eye, Edit, FileText, AlertTriangle, Users, Clock, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';
import { ForSaleCheckbox } from '@/components/property/ForSaleCheckbox';
import { InviteTenantButton } from '@/components/InviteTenantButton';
import { TenantQuickActions } from './property/TenantQuickActions';
import { OnMarketToggle } from './property/OnMarketToggle';
import { useTenantManagementVisibility } from '@/hooks/useAssetBehavior';

interface Property {
  id: string;
  address: string;
  monthly_rent: number;
  desired_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  unit_count: number;
  zipcode?: string;
  city?: string;
  state?: string;
  amenities?: string[];
  status: string;
  occupancy_status?: string;
  tenant_id?: string;
  owner_id: string;
  lease_end_date?: string;
  country?: string;
}

interface UnitSummary {
  total_units: number;
  available_units: number;
  occupied_units: number;
  maintenance_units: number;
  vacancy_rate: number;
}

interface LandlordPropertiesListViewProps {
  properties: Property[];
  onViewDetails: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onPropertyUpdated?: () => void;
}

const LandlordPropertiesListView = ({ 
  properties, 
  onViewDetails, 
  onEdit,
  onPropertyUpdated 
}: LandlordPropertiesListViewProps) => {
  const [unitSummaries, setUnitSummaries] = useState<Record<string, UnitSummary>>({});

  interface Unit {
    id: string;
    unit_number?: string | number;
    unit_name?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    status?: string | null;
    monthly_rent?: number | null;
    lease_start_date?: string | null;
    lease_end_date?: string | null;
    tenant_id?: string | null;
    has_voucher?: boolean | null;
    voucher_amount?: number | null;
    pha_portion?: number | null;
    tenant_portion?: number | null;
    tenant_type?: string | null;
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [unitsByProperty, setUnitsByProperty] = useState<Record<string, Unit[]>>({});
  const [loadingUnits, setLoadingUnits] = useState<Record<string, boolean>>({});
  useEffect(() => {
    // Fetch unit summaries for multi-unit properties
    const fetchUnitSummaries = async () => {
      const multiUnitProperties = properties.filter(p => p.unit_count > 1);
      
      for (const property of multiUnitProperties) {
        try {
          const { data, error } = await supabase
            .rpc('get_property_vacancy_summary', { property_id_param: property.id });

          if (error) throw error;
          if (data && data.length > 0) {
            setUnitSummaries(prev => ({
              ...prev,
              [property.id]: data[0]
            }));
          }
        } catch (error) {
          console.error('Error fetching unit summary:', error);
        }
      }
    };

    if (properties.length > 0) {
      fetchUnitSummaries();
    }
  }, [properties]);

  const getOccupancyRatio = (property: Property) => {
    if (property.unit_count === 1) {
      const isOccupied = property.occupancy_status === 'occupied';
      const occupiedCount = isOccupied ? 1 : 0;
      return `${occupiedCount}/1`;
    } else {
      const summary = unitSummaries[property.id];
      if (summary) {
        return `${summary.occupied_units}/${summary.total_units}`;
      }
      const isOccupied = property.occupancy_status === 'occupied';
      const occupiedCount = isOccupied ? property.unit_count : 0;
      return `${occupiedCount}/${property.unit_count}`;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { variant: 'success' as const, icon: Home, label: 'Available' },
      occupied: { variant: 'occupied' as const, icon: Users, label: 'Occupied' },
      vacant: { variant: 'warning' as const, icon: Clock, label: 'Vacant' },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: 'secondary' as const, icon: Building, label: status };

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
};

  const handleToggleExpand = async (property: Property) => {
    if (property.unit_count <= 1) return;
    const isExpanded = expanded[property.id];

    if (!isExpanded && !unitsByProperty[property.id] && !loadingUnits[property.id]) {
      setLoadingUnits(prev => ({ ...prev, [property.id]: true }));
      try {
        const { data, error } = await supabase
          .from('property_units')
          .select(`
            id,
            unit_number,
            unit_name,
            bedrooms,
            bathrooms,
            status,
            monthly_rent,
            lease_start_date,
            lease_end_date,
            tenant_id,
            has_voucher,
            voucher_amount,
            pha_portion,
            tenant_portion,
            tenant_type
          `)
          .eq('property_id', property.id)
          .order('unit_number', { ascending: true });

        if (error) throw error;
        setUnitsByProperty(prev => ({ ...prev, [property.id]: data || [] }));
      } catch (err) {
        console.error('Error fetching units:', err);
        setUnitsByProperty(prev => ({ ...prev, [property.id]: [] }));
      } finally {
        setLoadingUnits(prev => ({ ...prev, [property.id]: false }));
      }
    }

    setExpanded(prev => ({ ...prev, [property.id]: !isExpanded }));
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Property Address</TableHead>
            <TableHead>Units</TableHead>
            <TableHead>Occupancy</TableHead>
            <TableHead>Rent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>For Sale</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
        {properties.map((property) => {
            const displayRent = property.desired_rent || property.monthly_rent;
            const supportsTenant = useTenantManagementVisibility(property as any);

            return (
              <React.Fragment key={property.id}>
                <TableRow className="hover:bg-transparent">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {property.unit_count > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleToggleExpand(property)}
                            aria-label={expanded[property.id] ? 'Collapse units' : 'Expand units'}
                          >
                            {expanded[property.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <div className="font-medium">{property.address}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {property.city && property.state ? 
                          `${property.city}, ${property.state} ${property.zipcode || ''}`.trim() :
                          (property.zipcode || 'Location not specified')
                        }
                      </div>
                      {property.bedrooms && property.bathrooms && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Bed className="h-3 w-3" />
                            {property.bedrooms}
                          </div>
                          <div className="flex items-center gap-1">
                            <Bath className="h-3 w-3" />
                            {property.bathrooms}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      <span>{property.unit_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {getOccupancyRatio(property)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-medium text-green-600">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(displayRent)}
                    </div>
                  </TableCell>
                   <TableCell>
                     {getStatusBadge(property.occupancy_status || property.status)}
                   </TableCell>
                  <TableCell>
                    {property.occupancy_status === 'occupied' ? (
                      <div className="text-sm">Tenant Assigned</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No tenant</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <ForSaleCheckbox 
                      property={{
                        id: property.id,
                        address: property.address,
                        city: property.city,
                        state: property.state,
                        monthly_rent: property.monthly_rent,
                        bedrooms: property.bedrooms,
                        bathrooms: property.bathrooms
                      }}
                    />
                  </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(property)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(property)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
  
                        {property.occupancy_status === 'occupied' ? (
                          <TenantQuickActions
                            propertyId={property.id}
                            propertyAddress={property.address}
                            hasTenant={true}
                            onStatusChange={() => onPropertyUpdated?.()}
                            supportsTenantManagement={supportsTenant}
                          />
                        ) : (
                          <InviteTenantButton
                            propertyId={property.id}
                            tenantId={property.tenant_id}
                            propertyStatus={property.status}
                            occupancyStatus={property.occupancy_status}
                            propertyAddress={property.address}
                            landlordId={property.owner_id}
                            supportsTenantManagement={supportsTenant}
                            onTenantInvited={() => onPropertyUpdated?.()}
                            iconOnly={true}
                            size="icon"
                            variant="outline"
                          />
                        )}
  
                        {property.unit_count <= 1 ? (
                          <OnMarketToggle
                            propertyId={property.id}
                            currentOnMarket={property.status === 'available' || property.status === 'listed'}
                            propertyData={property}
                            onStatusChange={() => onPropertyUpdated?.()}
                            className="h-8 w-8"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Units</span>
                        )}
                      </div>
                    </TableCell>
                </TableRow>

                {expanded[property.id] && property.unit_count > 1 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="bg-muted/30 p-0">
                      <div className="p-3">
                        {loadingUnits[property.id] ? (
                          <div className="text-sm text-muted-foreground">Loading units...</div>
                        ) : (
                          <Table className="ml-8">
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Unit</TableHead>
                                <TableHead>Occupancy</TableHead>
                                <TableHead>Bed</TableHead>
                                <TableHead>Bath</TableHead>
                                <TableHead>Total Rent</TableHead>
                                <TableHead>Voucher</TableHead>
                                <TableHead>Tenant</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(unitsByProperty[property.id] || []).map((unit) => (
                                <TableRow key={unit.id} className="hover:bg-transparent">
                                  <TableCell>
                                    {unit.unit_name || (unit.unit_number ? `Unit ${unit.unit_number}` : 'Unit')}
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {unit.status === 'occupied' ? '1/1' : '0/1'}
                                    </div>
                                  </TableCell>
                                  <TableCell>{unit.bedrooms ?? '-'}</TableCell>
                                  <TableCell>{unit.bathrooms ?? '-'}</TableCell>
                                  <TableCell>{formatCurrency(Number(unit.monthly_rent || 0))}</TableCell>
                                  <TableCell>
                                    {unit.pha_portion && unit.pha_portion > 0 
                                      ? formatCurrency(Number(unit.pha_portion)) 
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {unit.tenant_portion && unit.tenant_portion > 0 
                                      ? formatCurrency(Number(unit.tenant_portion)) 
                                      : (unit.status === 'occupied' && !unit.pha_portion 
                                          ? formatCurrency(Number(unit.monthly_rent || 0))
                                          : '-')}
                                  </TableCell>
                                  <TableCell>{getStatusBadge((unit.status || 'vacant') as string)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>

      {properties.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No properties found.
        </div>
      )}
    </div>
  );
};

export default LandlordPropertiesListView;
