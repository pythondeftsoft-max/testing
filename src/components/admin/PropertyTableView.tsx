import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, Users, ArrowUpDown, Eye, Settings, ChevronLeft, ChevronRight, ChevronDown, BedDouble, Calendar, Home } from 'lucide-react';
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';
import { OnMarketToggle } from '@/components/property/OnMarketToggle';
import { UnitOnMarketToggle } from '@/components/property/UnitOnMarketToggle';
import { ForSaleCheckbox } from '@/components/property/ForSaleCheckbox';
import { UnitDetailsModal } from '@/components/UnitDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Property {
  id: string;
  street_1?: string;
  street_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  monthly_rent?: number;
  status: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  unit_count?: number;
  created_at: string;
  owner_id: string;
  portfolio_id?: string;
  portfolio_client_email?: string | null;
  on_market?: boolean;
  occupancy_status?: string;
}

interface TenantInfo {
  property_id: string;
  tenant_id: string;
  unit_number?: string;
  unit_name?: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface PropertyTableViewProps {
  properties: Property[];
  tenantInfo?: TenantInfo[];
  selectedProperties: string[];
  onSelectionChange: (selected: string[]) => void;
  onPropertyClick: (property: Property) => void;
  owners?: Array<{ id: string; name: string }>;
  portfolios?: Array<{ id: string; client_name: string; client_email?: string | null }>;
  onStatusChange?: () => void;
}

export function PropertyTableView({
  properties,
  tenantInfo = [],
  selectedProperties,
  onSelectionChange,
  onPropertyClick,
  owners = [],
  portfolios = [],
  onStatusChange,
}: PropertyTableViewProps) {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [pageSize, setPageSize] = useState(25);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [unitsByProperty, setUnitsByProperty] = useState<Record<string, any[]>>({});
  const [loadingUnits, setLoadingUnits] = useState<Record<string, boolean>>({});
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<any>(null);
  const [selectedPropertyForUnit, setSelectedPropertyForUnit] = useState<any>(null);
  
  // Listing preview state
  const [listingPreviewProperty, setListingPreviewProperty] = useState<any>(null);
  const [showListingPreview, setShowListingPreview] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState<string | null>(null);

  // Helper to format address
  const formatAddress = (property: Property) => {
    const parts = [property.street_1, property.street_2].filter(Boolean);
    const address = parts.join(' ') || 'No Address';
    const location = [property.city, property.state].filter(Boolean).join(', ');
    return { address, location };
  };

  // Helper to get tenant info for property
  const getTenantInfo = (propertyId: string) => {
    const tenants = tenantInfo?.filter(t => t.property_id === propertyId) || [];
    if (tenants.length === 0) return null;
    if (tenants.length === 1) {
      const t = tenants[0];
      return `${t.profiles.first_name} ${t.profiles.last_name}${t.unit_number ? ` (${t.unit_number})` : ''}`;
    }
    return `${tenants.length} Tenants`;
  };

  // Helper for status badge
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'occupied':
        return 'secondary';
      case 'vacant':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Helper for occupancy badge
  const getOccupancyBadge = (property: Property) => {
    const status = property.occupancy_status || 'unknown';
    const variants: Record<string, any> = {
      vacant: { variant: 'outline', label: 'Vacant', className: 'bg-gray-50' },
      occupied: { variant: 'secondary', label: 'Occupied', className: 'bg-green-50' },
      partial: { variant: 'default', label: 'Partial', className: 'bg-yellow-50' },
      unknown: { variant: 'outline', label: '-', className: 'bg-gray-50' },
    };
    return variants[status] || variants.unknown;
  };

  // Handle toggling property expansion and fetching units
  const handleTogglePropertyExpand = async (property: Property) => {
    if (!property.unit_count || property.unit_count <= 1) return;
    
    const isExpanded = expandedProperties.has(property.id);
    
    if (!isExpanded && !unitsByProperty[property.id] && !loadingUnits[property.id]) {
      setLoadingUnits(prev => ({ ...prev, [property.id]: true }));
      try {
        const { data, error } = await supabase
          .from('property_units')
          .select(`
            id, unit_number, unit_name, bedrooms, bathrooms, 
            status, monthly_rent, square_feet, on_market,
            created_at, lease_end_date, tenant_id
          `)
          .eq('property_id', property.id)
          .order('unit_number', { ascending: true });
        
        if (error) throw error;
        setUnitsByProperty(prev => ({ ...prev, [property.id]: data || [] }));
      } catch (err) {
        console.error('Error fetching units:', err);
        toast({
          title: "Error",
          description: "Failed to load units. Please try again.",
          variant: "destructive",
        });
        setUnitsByProperty(prev => ({ ...prev, [property.id]: [] }));
      } finally {
        setLoadingUnits(prev => ({ ...prev, [property.id]: false }));
      }
    }
    
    const newExpanded = new Set(expandedProperties);
    if (isExpanded) {
      newExpanded.delete(property.id);
    } else {
      newExpanded.add(property.id);
    }
    setExpandedProperties(newExpanded);
  };

  // Helper to get units available count
  const getUnitsAvailable = (units: any[]) => {
    if (!units || units.length === 0) return 0;
    return units.filter(u => u.status === 'vacant' || u.status === 'available').length;
  };

  // Helper to format unit bed/bath
  const formatUnitBedBath = (unit: any) => {
    return `${unit.bedrooms || 0} bed / ${unit.bathrooms || 0} bath`;
  };

  // Helper to get unit days listed
  const getUnitDaysListed = (unit: any) => {
    // Use listed_date instead of created_at, only count days for on-market units
    if (!unit.listed_date || !unit.on_market) return 0;
    
    const listedDate = new Date(unit.listed_date);
    const now = new Date();
    return Math.floor((now.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Handle viewing unit details
  const handleViewUnit = (unit: any, property: Property) => {
    setSelectedUnitForDetails(unit);
    setSelectedPropertyForUnit(property);
  };

  // Fetch full property data for listing preview
  const fetchFullPropertyForPreview = async (propertyId: string) => {
    setIsLoadingPreview(propertyId);
    try {
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
            on_market,
            photos
          )
        `)
        .eq('id', propertyId)
        .single();
        
      if (error) throw error;
      
      // Transform to match PropertyDetailsModalEnhanced expected format
      // Include property_units array so modal can access photos for any selected unit
    const transformedProperty = {
      ...data,
      street_address: data.address,
      address: `${data.address || ''}${data.city ? ', ' + data.city : ''}${data.state ? ', ' + data.state : ''}${data.zipcode ? ' ' + data.zipcode : ''}`.trim(),
      city: data.city,
      state: data.state,
      zipcode: data.zipcode,
      desiredRent: data.monthly_rent || data.property_units?.[0]?.monthly_rent,
      desired_rent: data.monthly_rent || data.property_units?.[0]?.monthly_rent,
      monthly_rent: data.monthly_rent || data.property_units?.[0]?.monthly_rent,
      // Pass all units so modal can display correct photos for selected unit
      photos: data.property_units?.[0]?.photos || [],
      property_units: data.property_units,
      description: data.property_units?.[0]?.description || '',
    };
      
      setListingPreviewProperty(transformedProperty);
      setShowListingPreview(true);
    } catch (error) {
      console.error('Error fetching property for preview:', error);
      toast({
        title: "Error",
        description: "Failed to load listing preview",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPreview(null);
    }
  };

  const columns = useMemo<ColumnDef<Property>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            if (value) {
              onSelectionChange(properties.map(p => p.id));
            } else {
              onSelectionChange([]);
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedProperties.includes(row.original.id)}
          onCheckedChange={() => {
            const id = row.original.id;
            if (selectedProperties.includes(id)) {
              onSelectionChange(selectedProperties.filter(i => i !== id));
            } else {
              onSelectionChange([...selectedProperties, id]);
            }
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: 'street_1',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Address
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const { address, location } = formatAddress(row.original);
        const isMultiUnit = row.original.unit_count && row.original.unit_count > 1;
        const isExpanded = expandedProperties.has(row.original.id);
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isMultiUnit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePropertyExpand(row.original);
                  }}
                  className="hover:bg-muted rounded p-1"
                >
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
              )}
              <button
                onClick={() => onPropertyClick(row.original)}
                className="font-medium text-left hover:underline"
              >
                {address}
              </button>
            </div>
            {location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground" style={{ marginLeft: isMultiUnit ? '32px' : '0' }}>
                <MapPin className="w-3 h-3" />
                {location}
              </div>
            )}
          </div>
        );
      },
      size: 250,
    },
    {
      accessorKey: 'monthly_rent',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Rent
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const rent = row.original.monthly_rent;
        return rent ? (
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{rent.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      size: 140,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
      size: 110,
    },
    {
      accessorKey: 'occupancy_status',
      header: 'Occupancy',
      cell: ({ row }) => {
        const badge = getOccupancyBadge(row.original);
        return (
          <Badge variant={badge.variant} className={badge.className}>
            {badge.label}
          </Badge>
        );
      },
      size: 110,
    },
    {
      id: 'tenant',
      header: 'Units / Tenant',
      cell: ({ row }) => {
        const isMultiUnit = row.original.unit_count && row.original.unit_count > 1;
        const units = unitsByProperty[row.original.id] || [];
        const isExpanded = expandedProperties.has(row.original.id);
        
        if (isMultiUnit) {
          // For multi-unit properties, show clickable unit count with chevron
          return (
            <button
              onClick={() => handleTogglePropertyExpand(row.original)}
              className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
            >
              <span className="font-medium">{row.original.unit_count} units</span>
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </button>
          );
        }
        
        // For single-unit properties, show tenant name
        const tenant = getTenantInfo(row.original.id);
        return tenant ? (
          <div className="text-sm">{tenant}</div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
      size: 180,
    },
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => {
        // Client property - show client email + OpenKey Listed badge (embedded on property)
        if (row.original.portfolio_client_email) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{row.original.portfolio_client_email}</span>
              <Badge className="w-fit bg-purple-100 text-purple-800 text-xs">
                OpenKey Listed
              </Badge>
            </div>
          );
        }
        
        // Regular landlord property - show owner name
        const owner = owners.find(o => o.id === row.original.owner_id);
        return owner ? (
          <div className="flex items-center gap-1 text-sm">
            <Users className="w-3 h-3 text-muted-foreground" />
            {owner.name}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
      size: 180,
    },
    {
      id: 'portfolio',
      header: 'Portfolio',
      cell: ({ row }) => {
        const portfolio = portfolios.find(p => p.id === row.original.portfolio_id);
        return portfolio ? (
          <Badge variant="outline" className="text-xs">
            {portfolio.client_name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
      size: 140,
    },
        {
          id: 'market',
          header: 'Market',
          cell: ({ row }) => {
            const isMultiUnit = row.original.unit_count && row.original.unit_count > 1;
            
            if (isMultiUnit) {
              return <span className="text-muted-foreground text-sm">-</span>;
            }
            
            return (
              <OnMarketToggle
                propertyId={row.original.id}
                currentOnMarket={row.original.on_market || false}
                propertyData={row.original}
                onStatusChange={onStatusChange}
                adminMode={true}
              />
            );
          },
          size: 80,
        },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPropertyClick(row.original)}
            className="h-8 w-8 p-0 hover:bg-primary/10"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {row.original.on_market && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchFullPropertyForPreview(row.original.id)}
              disabled={isLoadingPreview === row.original.id}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title="View Listing as Tenant"
            >
              {isLoadingPreview === row.original.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Home className="h-4 w-4" />
              )}
            </Button>
          )}
          
          <ForSaleCheckbox 
            property={row.original}
            className="scale-90"
          />
        </div>
      ),
      size: 180,
    },
  ], [
    portfolios, 
    owners, 
    selectedProperties, 
    onSelectionChange, 
    onPropertyClick, 
    onStatusChange,
    expandedProperties,
    unitsByProperty,
    properties,
    tenantInfo,
    isLoadingPreview
  ]);

  const table = useReactTable({
    data: properties,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Update page size when changed
  React.useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const property = row.original;
                const isExpanded = expandedProperties.has(property.id);
                const isMultiUnit = property.unit_count && property.unit_count > 1;
                const units = unitsByProperty[property.id] || [];
                
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      data-state={selectedProperties.includes(row.original.id) && 'selected'}
                      className="cursor-pointer"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {isExpanded && isMultiUnit && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={columns.length} className="bg-muted/30 p-0">
                          <div className="p-3">
                            {loadingUnits[property.id] ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                <span className="ml-3 text-sm text-muted-foreground">Loading units...</span>
                              </div>
                            ) : units.length === 0 ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                No units found for this property.
                              </div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[12%]">Unit</TableHead>
                                    <TableHead className="w-[10%]">Rent</TableHead>
                                    <TableHead className="w-[10%]">Status</TableHead>
                                    <TableHead className="w-[15%]">Bed/Bath</TableHead>
                                    <TableHead className="w-[12%]">Tenant</TableHead>
                                    <TableHead className="w-[10%]">On Market</TableHead>
                                    <TableHead className="w-[12%]">Lease Ends</TableHead>
                                    <TableHead className="w-[10%]">Days Listed</TableHead>
                                    <TableHead className="w-[9%] text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {units.map((unit) => (
                                    <TableRow key={unit.id}>
                                      <TableCell className="font-medium">
                                        {unit.unit_name || `Unit ${unit.unit_number}`}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        <div className="flex items-center gap-1">
                                          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                                          <span className="font-medium">
                                            {(unit.monthly_rent || 0).toLocaleString()}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant={unit.status === 'occupied' ? 'default' : 'secondary'}
                                          className={unit.status === 'occupied' ? 'bg-green-500 hover:bg-green-600' : ''}
                                        >
                                          {unit.status === 'occupied' ? 'Occupied' : 'Vacant'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        <div className="flex items-center gap-1">
                                          <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
                                          <span>{formatUnitBedBath(unit)}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {unit.tenant_id && unit.profiles ? (
                                          <span className="font-medium">
                                            {unit.profiles.first_name} {unit.profiles.last_name}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <UnitOnMarketToggle
                                          propertyId={property.id}
                                          unitId={unit.id}
                                          initialOnMarket={unit.on_market || false}
                                          unitLabel={unit.unit_name || `Unit ${unit.unit_number}`}
                                          propertyAddress={`${property.street_1}, ${property.city}, ${property.state} ${property.zipcode}`}
                                          unitData={unit}
                                          onStatusChange={onStatusChange}
                                          adminMode={true}
                                        />
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {unit.status === 'occupied' && unit.lease_end_date ? (
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className={
                                              new Date(unit.lease_end_date) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                                                ? 'text-orange-500 font-medium'
                                                : ''
                                            }>
                                              {new Date(unit.lease_end_date).toLocaleDateString()}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {unit.on_market ? (
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>{getUnitDaysListed(unit)} days</span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleViewUnit(unit, property)}
                                            title="View Unit Details"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            title="Manage Unit"
                                          >
                                            <Settings className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
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
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No properties found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * pageSize + 1} to{' '}
            {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, properties.length)} of{' '}
            {properties.length} properties
          </span>
          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Unit Details Modal */}
      {selectedUnitForDetails && selectedPropertyForUnit && (
        <UnitDetailsModal
          unit={selectedUnitForDetails}
          property={selectedPropertyForUnit}
          onClose={() => {
            setSelectedUnitForDetails(null);
            setSelectedPropertyForUnit(null);
          }}
          onUnitUpdated={() => {
            // Refresh units for the property
            const propertyId = selectedPropertyForUnit.id;
            if (unitsByProperty[propertyId]) {
              handleTogglePropertyExpand(selectedPropertyForUnit).then(() => {
                handleTogglePropertyExpand(selectedPropertyForUnit);
              });
            }
            if (onStatusChange) {
              onStatusChange();
            }
          }}
        />
      )}

      {/* Listing Preview Modal - Shows what tenant sees */}
      <PropertyDetailsModalEnhanced
        property={listingPreviewProperty}
        isOpen={showListingPreview}
        onClose={() => {
          setShowListingPreview(false);
          setListingPreviewProperty(null);
        }}
        onInterestClick={() => {}}
        isSubmittingInterest={false}
        hasApplied={false}
      />
    </div>
  );
}
