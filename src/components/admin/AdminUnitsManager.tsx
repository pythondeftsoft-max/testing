
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Bed, Bath, Square, Users, DollarSign, Eye, AlertCircle, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, CheckSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InviteTenantButton } from '../InviteTenantButton';
import { EditUnitModal } from '../EditUnitModal';
import { UnitOnMarketToggle } from '../property/UnitOnMarketToggle';
import { UnitRemoveTenantButton } from '../property/UnitRemoveTenantButton';
import { UnitDetailsModal } from '../UnitDetailsModal';
import { calculateRemainingBedBath } from '@/utils/propertyUnitCalculations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PropertyUnit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_name?: string | null;
  monthly_rent?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  status?: string;
  tenant_id?: string | null;
  on_market?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

interface FloorPlanGroup {
  key: string;
  label: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rent: number | null;
  sqft: number | null;
  units: PropertyUnit[];
  onMarketCount: number;
  vacantCount: number;
  occupiedCount: number;
}

interface AdminUnitsManagerProps {
  propertyId: string;
  propertyAddress: string;
}

export const AdminUnitsManager: React.FC<AdminUnitsManagerProps> = ({
  propertyId,
  propertyAddress,
}) => {
  const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(null);
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<PropertyUnit | null>(null);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const { toast } = useToast();

  // Fetch property details for bed/bath totals
  const { data: propertyData } = useQuery({
    queryKey: ['property-details', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('bedrooms, bathrooms')
        .eq('id', propertyId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: units = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-units', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_property_units', {
        p_property_id: propertyId
      });

      if (error) {
        console.error('Error fetching admin units:', error);
        throw error;
      }

      return data || [];
    },
  });

  // Calculate allocation
  const allocation = propertyData ? calculateRemainingBedBath(
    propertyData.bedrooms || 0,
    propertyData.bathrooms || 0,
    units
  ) : null;

  // Group units by floor plan type (bedrooms + bathrooms + rent)
  const floorPlanGroups = useMemo((): FloorPlanGroup[] => {
    if (units.length <= 3) return []; // Don't group if 3 or fewer units

    const grouped = new Map<string, PropertyUnit[]>();
    for (const unit of units) {
      const key = `${unit.bedrooms ?? 'x'}_${unit.bathrooms ?? 'x'}_${unit.monthly_rent ?? 'x'}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(unit);
    }

    // Only group if there are multiple units sharing a floor plan
    const hasGroups = Array.from(grouped.values()).some(g => g.length > 1);
    if (!hasGroups) return [];

    return Array.from(grouped.entries()).map(([key, groupUnits]) => {
      const first = groupUnits[0];
      const planName = first.unit_name || `${first.bedrooms || '?'}bd/${first.bathrooms || '?'}ba`;
      return {
        key,
        label: planName,
        bedrooms: first.bedrooms ?? null,
        bathrooms: first.bathrooms ?? null,
        rent: first.monthly_rent ?? null,
        sqft: first.square_feet ?? null,
        units: groupUnits,
        onMarketCount: groupUnits.filter(u => u.on_market).length,
        vacantCount: groupUnits.filter(u => !u.tenant_id).length,
        occupiedCount: groupUnits.filter(u => u.tenant_id).length,
      };
    }).sort((a, b) => (a.bedrooms ?? 0) - (b.bedrooms ?? 0) || (a.rent ?? 0) - (b.rent ?? 0));
  }, [units]);

  const useGroupedView = floorPlanGroups.length > 0;

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Bulk toggle all units in a group on/off market via admin RPC
  const handleBulkToggleMarket = async (group: FloorPlanGroup, newOnMarket: boolean) => {
    setIsBulkUpdating(true);
    try {
      for (const unit of group.units) {
        const { error } = await supabase.rpc('admin_set_unit_market_status', {
          p_unit_id: unit.id,
          p_on_market: newOnMarket,
          p_reason: `Admin bulk ${newOnMarket ? 'listed' : 'unlisted'} via dashboard`,
          p_metadata: { source: 'admin_bulk_toggle', group: group.label }
        });
        if (error) throw error;
      }
      toast({
        title: `${group.units.length} units updated`,
        description: `All ${group.label} units set to ${newOnMarket ? 'on market' : 'off market'}`,
      });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk toggle selected units across groups
  const handleBulkToggleSelected = async (newOnMarket: boolean) => {
    setIsBulkUpdating(true);
    try {
      for (const unitId of selectedUnitIds) {
        const { error } = await supabase.rpc('admin_set_unit_market_status', {
          p_unit_id: unitId,
          p_on_market: newOnMarket,
          p_reason: `Admin bulk ${newOnMarket ? 'listed' : 'unlisted'} selected units`,
          p_metadata: { source: 'admin_bulk_select' }
        });
        if (error) throw error;
      }
      toast({
        title: `${selectedUnitIds.size} units updated`,
        description: `Selected units set to ${newOnMarket ? 'on market' : 'off market'}`,
      });
      setSelectedUnitIds(new Set());
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUnitIds.size === units.length) {
      setSelectedUnitIds(new Set());
    } else {
      setSelectedUnitIds(new Set(units.map(u => u.id)));
    }
  };

  // Set up real-time subscription for property units
  React.useEffect(() => {
    const channel = supabase
      .channel('admin-property-units-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_units',
          filter: `property_id=eq.${propertyId}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId, refetch]);

  const handleUnitUpdated = () => {
    refetch();
    setSelectedUnit(null);
    setShowAddUnitModal(false);
    setSelectedUnitForDetails(null);
  };

  const handleTenantRemoved = () => {
    refetch();
  };

  if (isLoading) {
    return <div>Loading units...</div>;
  }

  const renderUnitCard = (unit: PropertyUnit) => (
    <Card key={unit.id} className="flex flex-col h-full hover:shadow-md transition-shadow border-amber-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedUnitIds.has(unit.id)}
              onCheckedChange={() => toggleUnitSelection(unit.id)}
              className="mt-0.5"
            />
            <div>
            <CardTitle className="text-base">Unit {unit.unit_number}</CardTitle>
            <Badge variant="outline" className="text-xs mt-1 bg-amber-50 text-amber-700 border-amber-300">
              Admin Mode
            </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setSelectedUnitForDetails(unit)} className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedUnit(unit)} className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-sm">
          {unit.bedrooms && (
            <div className="flex items-center gap-1"><Bed className="h-3 w-3 text-muted-foreground" /><span>{unit.bedrooms}</span></div>
          )}
          {unit.bathrooms && (
            <div className="flex items-center gap-1"><Bath className="h-3 w-3 text-muted-foreground" /><span>{unit.bathrooms}</span></div>
          )}
          {unit.square_feet && (
            <div className="flex items-center gap-1"><Square className="h-3 w-3 text-muted-foreground" /><span>{unit.square_feet}ft²</span></div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          {unit.monthly_rent != null ? (
            <span className="font-medium">${unit.monthly_rent}/month</span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Rent not set</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={unit.status === 'available' ? 'default' : 'secondary'}>
            {unit.status || 'Available'}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between pt-4 border-t bg-amber-50/50">
        <UnitOnMarketToggle 
          propertyId={propertyId}
          unitId={unit.id}
          initialOnMarket={unit.on_market ?? true}
          unitLabel={`Unit ${unit.unit_number}`}
          propertyAddress={propertyAddress}
          unitData={unit}
          onRefresh={refetch}
          onStatusChange={() => refetch()}
          adminMode={true}
        />
        <div className="flex items-center gap-2">
          {unit.tenant_id ? (
            <>
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-100 text-blue-800">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Tenant</span>
              </div>
              <UnitRemoveTenantButton
                propertyId={propertyId}
                unitId={unit.id}
                unitLabel={`Unit ${unit.unit_number}`}
                tenantId={unit.tenant_id}
                onTenantRemoved={handleTenantRemoved}
                iconOnly={true}
                adminMode={true}
              />
            </>
          ) : (
            unit.status === 'available' && (
              <InviteTenantButton
                propertyId={propertyId}
                unitId={unit.id}
                propertyStatus={unit.status || 'available'}
                propertyAddress={`${propertyAddress} - Unit ${unit.unit_number}`}
                landlordId=""
                onTenantInvited={refetch}
                iconOnly={true}
              />
            )
          )}
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {units.length > 0 && (
            <Checkbox
              checked={selectedUnitIds.size === units.length && units.length > 0}
              onCheckedChange={toggleSelectAll}
            />
          )}
          <h3 className="text-lg font-medium">Property Units ({units.length}) - Admin Mode</h3>
        </div>
        <Button 
          onClick={() => setShowAddUnitModal(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </Button>
      </div>

      {/* Bulk Action Bar */}
      {selectedUnitIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent border border-border">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedUnitIds.size} unit{selectedUnitIds.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={isBulkUpdating}
              onClick={() => handleBulkToggleSelected(true)}
            >
              <ToggleRight className="h-3.5 w-3.5 mr-1" />
              Put on Market
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={isBulkUpdating}
              onClick={() => handleBulkToggleSelected(false)}
            >
              <ToggleLeft className="h-3.5 w-3.5 mr-1" />
              Take off Market
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => setSelectedUnitIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Unit Allocation Summary */}
      {allocation && propertyData && (
        <Alert className="border-primary bg-primary/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="font-medium mb-1">Unit Allocation Summary</div>
              <AlertDescription className="space-y-1">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Property Total (Calculated from Units):</span> {propertyData.bedrooms} bed, {propertyData.bathrooms} bath</div>
                  <div><span className="font-medium">Units:</span> {units.length} {units.length === 1 ? 'unit' : 'units'} configured</div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">💡 Property bed/bath totals automatically update based on your units. Add or edit units freely.</p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Missing Unit 1 Alert */}
      {units.length === 0 && propertyData && propertyData.bedrooms && propertyData.bathrooms && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div className="flex items-center justify-between flex-1 ml-2">
            <div>
              <div className="font-medium text-amber-900">Missing Unit 1</div>
              <AlertDescription className="text-amber-800">
                This property has {propertyData.bedrooms} bed, {propertyData.bathrooms} bath but no units. Click to create Unit 1 automatically.
              </AlertDescription>
            </div>
            <Button
              onClick={async () => {
                try {
                  const { data: propertyDetails } = await supabase
                    .from('properties')
                    .select('bedrooms, bathrooms, square_feet')
                    .eq('id', propertyId)
                    .single();
                  if (!propertyDetails) throw new Error('Property not found');
                  const { error } = await supabase
                    .from('property_units')
                    .insert({
                      property_id: propertyId,
                      unit_number: '1',
                      unit_name: 'Unit 1',
                      bedrooms: propertyDetails.bedrooms,
                      bathrooms: propertyDetails.bathrooms,
                      square_feet: propertyDetails.square_feet,
                      status: 'vacant',
                    });
                  if (error) throw error;
                  toast({ title: 'Unit 1 Created', description: 'Unit 1 has been created successfully with the property\'s specifications.' });
                  refetch();
                } catch (error: any) {
                  console.error('Error creating Unit 1:', error);
                  toast({ title: 'Error', description: error.message || 'Failed to create Unit 1', variant: 'destructive' });
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white ml-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Unit 1
            </Button>
          </div>
        </Alert>
      )}

      {/* Grouped View for multi-unit buildings */}
      {useGroupedView ? (
        <div className="space-y-2">
          {floorPlanGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            return (
              <div key={group.key} className="border rounded-lg overflow-hidden">
                {/* Group Header */}
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => toggleGroup(group.key)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{group.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.units.length} unit{group.units.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {group.bedrooms != null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Bed className="h-3 w-3" /> {group.bedrooms}bd/{group.bathrooms}ba
                      </span>
                    )}
                    {group.rent != null && (
                      <span className="text-muted-foreground">${group.rent}/mo</span>
                    )}
                    <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                      {group.onMarketCount} on market
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {group.vacantCount} vacant
                    </Badge>
                    {group.occupiedCount > 0 && (
                      <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
                        {group.occupiedCount} occupied
                      </Badge>
                    )}
                    {/* Bulk market toggle */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {group.onMarketCount < group.units.length && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-green-700"
                          onClick={() => handleBulkToggleMarket(group, true)}
                          title="Put all on market"
                        >
                          <ToggleRight className="h-3.5 w-3.5" /> All On
                        </Button>
                      )}
                      {group.onMarketCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => handleBulkToggleMarket(group, false)}
                          title="Take all off market"
                        >
                          <ToggleLeft className="h-3.5 w-3.5" /> All Off
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Unit Cards */}
                {isExpanded && (
                  <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch auto-rows-fr">
                    {group.units.map(renderUnitCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat View for small properties */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch auto-rows-fr">
          {units.map(renderUnitCard)}
        </div>
      )}

      {units.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No units found for this property.</p>
          <Button className="mt-4" onClick={() => setShowAddUnitModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </div>
      )}

      {selectedUnit && (
        <EditUnitModal
          isOpen={true}
          propertyId={propertyId}
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
          onUnitUpdated={handleUnitUpdated}
          adminMode={true}
          isMultiUnit={true}
          propertyBedrooms={propertyData?.bedrooms}
          propertyBathrooms={propertyData?.bathrooms}
          existingUnits={units.filter(u => u.id !== selectedUnit.id)}
        />
      )}

      {showAddUnitModal && (
        <EditUnitModal
          isOpen={true}
          propertyId={propertyId}
          onClose={() => setShowAddUnitModal(false)}
          onUnitUpdated={handleUnitUpdated}
          adminMode={true}
          isMultiUnit={true}
          propertyBedrooms={propertyData?.bedrooms}
          propertyBathrooms={propertyData?.bathrooms}
          existingUnits={units}
        />
      )}

      {selectedUnitForDetails && (
        <UnitDetailsModal
          unit={selectedUnitForDetails}
          property={{ id: propertyId, address: propertyAddress } as any}
          onClose={() => setSelectedUnitForDetails(null)}
          onUnitUpdated={handleUnitUpdated}
        />
      )}
    </div>
  );
};
