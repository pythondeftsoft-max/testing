import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useTerritories, useUpdateTerritory, useDeleteTerritory, Territory } from '@/hooks/useTerritories';
import { useAvailableWorkers } from '@/hooks/useAvailableWorkers';
import { MapPin, MoreVertical, Edit, UserPlus, ToggleLeft, ToggleRight, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ManageTerritoryWorkersDialog } from './ManageTerritoryWorkersDialog';
import { EditTerritoryDialog } from './EditTerritoryDialog';

interface TerritoriesAndTeamsTabProps {
  isAddTerritoryOpen: boolean;
  setIsAddTerritoryOpen: (open: boolean) => void;
}

export const TerritoriesAndTeamsTab: React.FC<TerritoriesAndTeamsTabProps> = ({
  isAddTerritoryOpen,
  setIsAddTerritoryOpen
}) => {
  const { data: territories = [], isLoading } = useTerritories();
  const { data: workers = [] } = useAvailableWorkers();
  const updateTerritory = useUpdateTerritory();
  const deleteTerritory = useDeleteTerritory();

  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [managingWorkersTerritory, setManagingWorkersTerritory] = useState<Territory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isManageWorkersDialogOpen, setIsManageWorkersDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

  // Handler functions
  const handleEdit = (territory: Territory) => {
    setEditingTerritory(territory);
    setIsEditDialogOpen(true);
  };

  const handleManageWorkers = (territory: Territory) => {
    setManagingWorkersTerritory(territory);
    setIsManageWorkersDialogOpen(true);
  };

  const handleToggleStatus = (territory: Territory) => {
    updateTerritory.mutate({
      id: territory.id,
      updates: { isActive: !territory.is_active }
    });
  };

  const handleDelete = (territory: Territory) => {
    if (confirm(`Are you sure you want to delete "${territory.territory_name}"?`)) {
      deleteTerritory.mutate(territory.id);
    }
  };


  // Filter territories based on search
  const filteredTerritories = territories.filter(territory =>
    territory.territory_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    territory.region_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    territory.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group territories by country
  const groupedTerritories = filteredTerritories.reduce((acc, territory) => {
    const country = territory.country || 'Uncategorized';
    if (!acc[country]) {
      acc[country] = [];
    }
    acc[country].push(territory);
    return acc;
  }, {} as Record<string, Territory[]>);

  // Sort countries alphabetically
  const sortedCountries = Object.keys(groupedTerritories).sort();

  // Initialize expanded countries when territories load
  useEffect(() => {
    if (territories.length > 0 && expandedCountries.size === 0) {
      setExpandedCountries(new Set(sortedCountries));
    }
  }, [territories.length]);

  // Auto-expand countries with search results
  useEffect(() => {
    if (searchQuery) {
      setExpandedCountries(new Set(sortedCountries));
    }
  }, [searchQuery, sortedCountries]);

  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(country)) {
        next.delete(country);
      } else {
        next.add(country);
      }
      return next;
    });
  };

  const columns: ColumnDef<Territory>[] = [
    {
      accessorKey: 'territory_name',
      header: 'Territory Name',
    },
    {
      accessorKey: 'territory_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('territory_type') as string;
        return <Badge variant="outline">{type}</Badge>;
      },
    },
    {
      accessorKey: 'region_code',
      header: 'Coverage',
      cell: ({ row }) => {
        const regionCode = row.original.region_code;
        const postalRanges = row.original.postal_ranges;
        if (regionCode) return regionCode;
        if (postalRanges) return postalRanges;
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'country',
      header: 'Country',
    },
    {
      accessorKey: 'workers',
      header: 'Assigned Workers',
      cell: ({ row }) => {
        const workers = row.original.workers || [];
        
        if (workers.length === 0) {
          return <span className="text-muted-foreground">Unassigned</span>;
        }
        
        if (workers.length === 1) {
          return <span>{workers[0].full_name}</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <span>{workers[0].full_name}</span>
            <Badge variant="secondary" className="text-xs">
              +{workers.length - 1} more
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean;
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const territory = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleEdit(territory)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Territory
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleManageWorkers(territory)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Workers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(territory)}>
                {territory.is_active ? (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(territory)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Territory
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Columns without country for display within country groups
  const columnsWithoutCountry = columns.filter(col => 
    !('accessorKey' in col) || col.accessorKey !== 'country'
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Territories & Teams
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Set up territories so tenants and properties are routed to the right team members based on region, state, or country.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search and Add Button Row */}
          <div className="flex items-center justify-between gap-4">
            <Input 
              placeholder="Search territories..." 
              className="max-w-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setIsAddTerritoryOpen(true)}
            >
              Add Territory
            </Button>
          </div>
          
          {/* Loading or Empty State or Grouped Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">Loading territories...</p>
            </div>
          ) : territories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No territories have been created yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Territories determine which team member handles tenants and properties based on region, state, or country. Add your first territory to begin assigning leads automatically.
              </p>
              <Button 
                variant="outline"
                onClick={() => setIsAddTerritoryOpen(true)}
              >
                Add Your First Territory
              </Button>
            </div>
          ) : filteredTerritories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No territories found
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Try adjusting your search query
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCountries.map((country) => {
                const countryTerritories = groupedTerritories[country];
                const isExpanded = expandedCountries.has(country);
                
                return (
                  <Collapsible
                    key={country}
                    open={isExpanded}
                    onOpenChange={() => toggleCountry(country)}
                    className="border rounded-lg"
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <h3 className="text-lg font-semibold">
                            {country} ({countryTerritories.length})
                          </h3>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        <DataTable 
                          columns={columnsWithoutCountry} 
                          data={countryTerritories} 
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Territory Dialog */}
      {isEditDialogOpen && editingTerritory && (
        <EditTerritoryDialog
          territory={editingTerritory}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingTerritory(null);
          }}
        />
      )}

      {/* Manage Workers Dialog */}
      {isManageWorkersDialogOpen && managingWorkersTerritory && (
        <ManageTerritoryWorkersDialog
          territory={managingWorkersTerritory}
          isOpen={isManageWorkersDialogOpen}
          onClose={() => {
            setIsManageWorkersDialogOpen(false);
            setManagingWorkersTerritory(null);
          }}
        />
      )}
    </div>
  );
};
