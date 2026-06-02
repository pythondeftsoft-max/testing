import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ColumnDef, useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCcw, Eye, ChevronDown, ChevronRight, ChevronLeft, BedDouble, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import React from 'react';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';
import { UnitDetailsModal } from '@/components/UnitDetailsModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface DeletedProperty {
  id: string;
  address: string;
  monthly_rent: number;
  status: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  occupancy_status: string;
  unit_count: number;
  tenant_count: number;
  portfolio_id: string | null;
  deleted_at: string;
  deleted_by: string | null;
  deleted_by_name: string | null;
  created_at: string;
}

export const DeletedPropertiesTable = () => {
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [unitsByProperty, setUnitsByProperty] = useState<Record<string, any[]>>({});
  const [loadingUnits, setLoadingUnits] = useState<Record<string, boolean>>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: 'deleted_at', desc: true }]);
  const [pageSize, setPageSize] = useState(25);
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<any>(null);
  const [selectedPropertyForUnit, setSelectedPropertyForUnit] = useState<any>(null);

  const { data: deletedProperties = [], isLoading } = useQuery({
    queryKey: ['admin', 'deleted-properties'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_deleted_properties');
      if (error) throw error;
      return data as DeletedProperty[];
    },
  });

  const handleViewDetails = async (propertyId: string) => {
    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      setSelectedProperty(data);
    } catch (error) {
      console.error('Error fetching property details:', error);
      toast.error('Failed to load property details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleTogglePropertyExpand = async (propertyId: string, unitCount: number) => {
    if (unitCount <= 1) return;

    const newExpanded = new Set(expandedProperties);
    
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
      setExpandedProperties(newExpanded);
      return;
    }

    // Add to expanded set
    newExpanded.add(propertyId);
    setExpandedProperties(newExpanded);

    // Fetch units if not already loaded
    if (!unitsByProperty[propertyId]) {
      setLoadingUnits(prev => ({ ...prev, [propertyId]: true }));
      
      try {
        const { data: units, error } = await supabase
          .from('property_units')
          .select(`
            *,
            profiles:tenant_id(full_name, email)
          `)
          .eq('property_id', propertyId)
          .order('unit_number');

        if (error) throw error;

        setUnitsByProperty(prev => ({ ...prev, [propertyId]: units || [] }));
      } catch (error) {
        console.error('Error fetching units:', error);
        toast.error('Failed to load units');
      } finally {
        setLoadingUnits(prev => ({ ...prev, [propertyId]: false }));
      }
    }
  };

  const handleRestore = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ 
          deleted_at: null, 
          deleted_by: null 
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast.success('Property restored successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'deleted-properties'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'properties'] });
    } catch (error) {
      console.error('Error restoring property:', error);
      toast.error('Failed to restore property');
    }
  };

  const columns: ColumnDef<DeletedProperty>[] = [
    {
      id: 'expander',
      header: '',
      cell: ({ row }) => {
        const unitCount = row.original.unit_count || 0;
        if (unitCount <= 1) return null;
        
        const isExpanded = expandedProperties.has(row.original.id);
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTogglePropertyExpand(row.original.id, unitCount)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        );
      },
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.address}</div>
      ),
    },
    {
      accessorKey: 'monthly_rent',
      header: 'Rent',
      cell: ({ row }) => (
        <div>${row.original.monthly_rent?.toLocaleString() || 'N/A'}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: 'occupancy_status',
      header: 'Occupancy',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.occupancy_status}</Badge>
      ),
    },
    {
      accessorKey: 'unit_count',
      header: 'Units',
      cell: ({ row }) => {
        const unitCount = row.original.unit_count || 0;
        if (unitCount <= 1) {
          return <div className="text-center">{unitCount}</div>;
        }
        
        const isExpanded = expandedProperties.has(row.original.id);
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTogglePropertyExpand(row.original.id, unitCount)}
            className="h-8 gap-1"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>{unitCount} units</span>
          </Button>
        );
      },
    },
    {
      accessorKey: 'tenant_count',
      header: 'Tenants',
      cell: ({ row }) => (
        <div className="text-center">{row.original.tenant_count}</div>
      ),
    },
    {
      accessorKey: 'owner_name',
      header: 'Owner',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.owner_name}</div>
          <div className="text-sm text-muted-foreground">{row.original.owner_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'deleted_at',
      header: 'Deleted At',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.deleted_at), 'MMM dd, yyyy HH:mm')}
        </div>
      ),
    },
    {
      accessorKey: 'deleted_by_name',
      header: 'Deleted By',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.deleted_by_name || 'Unknown'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.original.id)}
            disabled={isLoadingDetails}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRestore(row.original.id)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: deletedProperties,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading deleted properties...</div>;
  }

  const paginationState = table.getState().pagination;
  const totalItems = deletedProperties.length;
  const startItem = paginationState.pageIndex * paginationState.pageSize + 1;
  const endItem = Math.min((paginationState.pageIndex + 1) * paginationState.pageSize, totalItems);

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Deleted Properties</h3>
            <p className="text-sm text-muted-foreground">
              View and restore previously deleted properties
            </p>
          </div>
          <Badge variant="secondary">
            {deletedProperties.length} deleted {deletedProperties.length === 1 ? 'property' : 'properties'}
          </Badge>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : typeof header.column.columnDef.header === 'function'
                        ? header.column.columnDef.header(header.getContext())
                        : header.column.columnDef.header}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No deleted properties found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const property = row.original;
                  const isExpanded = expandedProperties.has(property.id);
                  const units = unitsByProperty[property.id] || [];
                  const isLoadingUnitsForProperty = loadingUnits[property.id];

                  return (
                    <React.Fragment key={row.id}>
                      <TableRow>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {typeof cell.column.columnDef.cell === 'function'
                              ? cell.column.columnDef.cell(cell.getContext())
                              : null}
                          </TableCell>
                        ))}
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="bg-muted/30 p-0">
                            {isLoadingUnitsForProperty ? (
                              <div className="flex items-center justify-center py-8">
                                <LoadingSpinner size="md" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading units...</span>
                              </div>
                            ) : units.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                No units found for this property
                              </div>
                            ) : (
                              <div className="p-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[150px]">Unit</TableHead>
                                      <TableHead>Rent</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Bed/Bath</TableHead>
                                      <TableHead>Tenant</TableHead>
                                      <TableHead>Lease Ends</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {units.map((unit: any) => (
                                      <TableRow key={unit.id} className="bg-background">
                                        <TableCell className="font-medium">
                                          <div className="flex items-center gap-2">
                                            {unit.unit_number || unit.unit_name || 'N/A'}
                                            {unit.deleted_at && (
                                              <Badge variant="destructive" className="text-xs">
                                                Deleted
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          ${unit.monthly_rent?.toLocaleString() || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={unit.occupancy_status === 'occupied' ? 'occupied' : 'outline'}>
                                            {unit.occupancy_status || 'vacant'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <BedDouble className="h-3 w-3" />
                                            {unit.bedrooms || 0} / {unit.bathrooms || 0}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {unit.profiles?.full_name || (
                                            <span className="text-muted-foreground">No tenant</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {unit.lease_end_date ? (
                                            <div className="flex items-center gap-1 text-sm">
                                              <Calendar className="h-3 w-3" />
                                              {format(new Date(unit.lease_end_date), 'MMM dd, yyyy')}
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground">N/A</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedUnitForDetails(unit);
                                              setSelectedPropertyForUnit(property);
                                            }}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Showing {startItem} to {endItem} of {totalItems} {totalItems === 1 ? 'property' : 'properties'}
            </span>
            <div className="flex items-center gap-2">
              <span>|</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger className="h-8 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {paginationState.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedProperty && (
        <PropertyDetailsModal
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          property={selectedProperty}
          isAdmin={true}
        />
      )}

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
            if (selectedPropertyForUnit) {
              const propertyId = selectedPropertyForUnit.id;
              setUnitsByProperty(prev => {
                const newState = { ...prev };
                delete newState[propertyId];
                return newState;
              });
              handleTogglePropertyExpand(propertyId, selectedPropertyForUnit.unit_count || 0);
            }
          }}
        />
      )}
    </>
  );
};
