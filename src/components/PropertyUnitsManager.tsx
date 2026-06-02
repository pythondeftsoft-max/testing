import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Bed, Bath, Square, Users, DollarSign, Eye, Home, Calendar, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InviteTenantButton } from './InviteTenantButton';
import { EditUnitModal } from './EditUnitModal';
import { UnitOnMarketToggle } from './property/UnitOnMarketToggle';
import { UnitRemoveTenantButton } from './property/UnitRemoveTenantButton';
import { UnitDetailsModal } from './UnitDetailsModal';
import { UnitFinancialsEditorDialog } from './unit/UnitFinancialsEditorDialog';

interface PropertyUnit {
  id: string;
  property_id: string;
  unit_number: string;
  name?: string | null;
  unit_name?: string | null;
  monthly_rent?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  status?: string;
  tenant_id?: string | null;
  tenant_type?: string | null;
  has_voucher?: boolean | null;
  pha_portion?: number | null;
  tenant_portion?: number | null;
  description?: string | null;
  security_deposit?: number | null;
  lease_start_date?: string | null;
  lease_end_date?: string | null;
  on_market?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

interface Property {
  id: string;
  address: string;
  owner_id: string;
  unit_count?: number;
}

interface PropertyUnitsManagerProps {
  propertyId: string;
  landlordId?: string;
  propertyAddress?: string;
}

// Enhanced Unit Card Component
const UnitCard = ({ 
  unit, 
  propertyId, 
  landlordId,
  propertyAddress,
  onEdit, 
  onViewDetails,
  onEditFinancials,
  onRefresh 
}: {
  unit: PropertyUnit;
  propertyId: string;
  landlordId?: string;
  propertyAddress?: string;
  onEdit: (unit: PropertyUnit) => void;
  onViewDetails: (unit: PropertyUnit) => void;
  onEditFinancials: (unit: PropertyUnit) => void;
  onRefresh: () => void;
}) => {
  // Helper to compute unit status from lease dates and tenant_id
  const getComputedUnitStatus = (unit: PropertyUnit): string => {
    const now = new Date();
    const leaseStart = unit.lease_start_date ? new Date(unit.lease_start_date) : null;
    const leaseEnd = unit.lease_end_date ? new Date(unit.lease_end_date) : null;
    
    // If tenant_id exists, it's occupied
    if (unit.tenant_id) {
      return 'occupied';
    }
    
    // Check if current date is within active lease dates
    if (leaseStart && leaseEnd && now >= leaseStart && now <= leaseEnd) {
      return 'occupied';
    }
    
    // Otherwise use the database status, defaulting to 'available'
    return (unit.status?.trim() || 'available').toLowerCase();
  };

  const computedStatus = getComputedUnitStatus(unit);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'occupied':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vacant':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'maintenance':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusRibbonColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-emerald-500';
      case 'occupied':
        return 'bg-blue-500';
      case 'vacant':
        return 'bg-amber-500';
      case 'maintenance':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="flex flex-col h-full group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-0 shadow-md bg-gradient-to-br from-background to-muted/20 relative overflow-hidden">
      {/* Status Ribbon */}
      <div className={`absolute top-0 right-0 w-16 h-16 ${getStatusRibbonColor(computedStatus)} opacity-10 rotate-45 translate-x-6 -translate-y-6`} />
      
      <CardHeader className="pb-3 relative">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg font-semibold">Unit {unit.unit_number}</CardTitle>
            </div>
            <Badge className={`text-xs font-medium ${getStatusColor(computedStatus)}`}>
              {computedStatus.charAt(0).toUpperCase() + computedStatus.slice(1)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditFinancials(unit)}
              className="h-8 w-8 p-0 hover:bg-green-500/10 text-green-600"
              title="Edit Financials"
            >
              <DollarSign className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(unit)}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(unit)}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title="Edit Unit"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Unit Stats */}
        <div className="grid grid-cols-3 gap-3">
          {unit.bedrooms && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <Bed className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{unit.bedrooms} bed</span>
            </div>
          )}
          {unit.bathrooms && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <Bath className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{unit.bathrooms} bath</span>
            </div>
          )}
          {unit.square_feet && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <Square className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{unit.square_feet}ft²</span>
            </div>
          )}
        </div>

        {/* Rent Display - only show for occupied or on-market units */}
        <div className="flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <DollarSign className="h-5 w-5 text-primary mr-2" />
          {computedStatus === 'occupied' && unit.monthly_rent != null ? (
            <>
              <span className="text-xl font-bold text-primary">${unit.monthly_rent}</span>
              <span className="text-sm text-muted-foreground ml-1">/month</span>
            </>
          ) : unit.on_market && unit.monthly_rent != null ? (
            <>
              <span className="text-xl font-bold text-primary">${unit.monthly_rent}</span>
              <span className="text-sm text-muted-foreground ml-1">/month (listed)</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground italic">Not Listed</span>
          )}
        </div>

        {/* Voucher Info */}
        {unit.has_voucher && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
            <Badge variant="outline" className="text-blue-700 border-blue-300">Housing Voucher</Badge>
            {unit.pha_portion && (
              <span className="text-xs text-blue-600">PHA: ${unit.pha_portion}</span>
            )}
          </div>
        )}

        {/* Lease Dates */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            {(unit.lease_start_date || unit.lease_end_date) ? (
              <>
                {unit.lease_start_date && (
                  <span>Start: {new Date(unit.lease_start_date).toLocaleDateString()}</span>
                )}
                {unit.lease_start_date && unit.lease_end_date && ' • '}
                {unit.lease_end_date && (
                  <span>End: {new Date(unit.lease_end_date).toLocaleDateString()}</span>
                )}
              </>
            ) : (
              <span className="italic">No active lease</span>
            )}
          </div>
        </div>

      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between pt-4 border-t bg-muted/20">
        <UnitOnMarketToggle 
          propertyId={propertyId}
          unitId={unit.id}
          initialOnMarket={unit.tenant_id ? false : (unit.on_market ?? false)}
          unitLabel={`Unit ${unit.unit_number}`}
          propertyAddress={propertyAddress}
          unitData={unit}
          onRefresh={onRefresh}
          onStatusChange={onRefresh}
        />
        
        <div className="flex items-center gap-2">
          {(unit.tenant_id || computedStatus === 'occupied') ? (
            <UnitRemoveTenantButton
              propertyId={propertyId}
              unitId={unit.id}
              unitLabel={`Unit ${unit.unit_number}`}
              tenantId={unit.tenant_id}
              onTenantRemoved={onRefresh}
              iconOnly={true}
            />
          ) : (
            <InviteTenantButton
              propertyId={propertyId}
              unitId={unit.id}
              propertyStatus={unit.status || 'available'}
              propertyAddress={`Unit ${unit.unit_number}`}
              landlordId={landlordId || ''}
              onTenantInvited={onRefresh}
              iconOnly={true}
            />
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

const PropertyUnitsManager = ({ propertyId, landlordId, propertyAddress = '' }: PropertyUnitsManagerProps) => {
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(null);
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<PropertyUnit | null>(null);
  const [selectedUnitForFinancials, setSelectedUnitForFinancials] = useState<PropertyUnit | null>(null);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    templateName: '',
    count: 1,
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 0,
    rent: 0,
  });
  const { toast } = useToast();

  const handleBulkAdd = async () => {
    if (!bulkForm.templateName.trim() || bulkForm.count < 1) {
      toast({ title: 'Error', description: 'Template name and count are required', variant: 'destructive' });
      return;
    }

    setBulkAdding(true);
    try {
      // Find the highest existing number for this template prefix
      const prefix = bulkForm.templateName.trim();
      const matchingUnits = units.filter(u => u.unit_number.startsWith(prefix + '-'));
      let maxNum = 0;
      matchingUnits.forEach(u => {
        const parts = u.unit_number.split('-');
        const num = parseInt(parts[parts.length - 1]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });

      const startNum = maxNum + 1;
      const newUnits = Array.from({ length: bulkForm.count }, (_, i) => ({
        property_id: propertyId,
        unit_number: `${prefix}-${startNum + i}`,
        bedrooms: bulkForm.bedrooms || null,
        bathrooms: bulkForm.bathrooms || null,
        square_feet: bulkForm.squareFeet || null,
        monthly_rent: bulkForm.rent || null,
        status: 'available',
      }));

      const { error } = await supabase.from('property_units').insert(newUnits);
      if (error) throw error;

      // Update property unit_count
      const { data: totalUnits } = await supabase
        .from('property_units')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      if (totalUnits !== null) {
        await supabase
          .from('properties')
          .update({ unit_count: (units.length + bulkForm.count), updated_at: new Date().toISOString() })
          .eq('id', propertyId);
      }

      toast({ title: 'Success', description: `Added ${bulkForm.count} units (${prefix}-${startNum} through ${prefix}-${startNum + bulkForm.count - 1})` });
      setShowBulkAdd(false);
      setBulkForm({ templateName: '', count: 1, bedrooms: 1, bathrooms: 1, squareFeet: 0, rent: 0 });
      fetchUnits();
    } catch (error: any) {
      console.error('Bulk add error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add units', variant: 'destructive' });
    } finally {
      setBulkAdding(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('property_units')
        .select('*')
        .eq('property_id', propertyId)
        .order('unit_number');

      if (error) {
        console.error('Error fetching units:', error);
        return;
      }

      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();

    // Set up real-time subscription for property units
    const channel = supabase
      .channel('property-units-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_units',
          filter: `property_id=eq.${propertyId}`
        },
        () => {
          fetchUnits(); // Refetch when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  const handleTenantRemoved = () => {
    fetchUnits(); // Refresh the units list
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Property Units</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Property Units ({units.length})</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowBulkAdd(!showBulkAdd)}
          >
            <Layers className="h-4 w-4 mr-2" />
            Bulk Add
          </Button>
          <Button 
            onClick={() => setShowAddUnitModal(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </div>
      </div>

      {showBulkAdd && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Add multiple units at once. Units will be named {bulkForm.templateName || 'B1'}-1, {bulkForm.templateName || 'B1'}-2, etc. (continuing from the highest existing number).
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Template Name</Label>
                <Input
                  placeholder="e.g. B1"
                  value={bulkForm.templateName}
                  onChange={e => setBulkForm(f => ({ ...f, templateName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Count</Label>
                <Input
                  type="number"
                  min={1}
                  value={bulkForm.count}
                  onChange={e => setBulkForm(f => ({ ...f, count: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Beds</Label>
                <Input
                  type="number"
                  min={0}
                  value={bulkForm.bedrooms}
                  onChange={e => setBulkForm(f => ({ ...f, bedrooms: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Baths</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={bulkForm.bathrooms}
                  onChange={e => setBulkForm(f => ({ ...f, bathrooms: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sqft</Label>
                <Input
                  type="number"
                  min={0}
                  value={bulkForm.squareFeet || ''}
                  onChange={e => setBulkForm(f => ({ ...f, squareFeet: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rent ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={bulkForm.rent || ''}
                  onChange={e => setBulkForm(f => ({ ...f, rent: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowBulkAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleBulkAdd} disabled={bulkAdding || !bulkForm.templateName.trim()}>
                {bulkAdding ? 'Adding...' : `Add ${bulkForm.count} Unit${bulkForm.count !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch auto-rows-fr">
        {units.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            propertyId={propertyId}
            landlordId={landlordId}
            propertyAddress={propertyAddress}
            onEdit={setSelectedUnit}
            onViewDetails={setSelectedUnitForDetails}
            onEditFinancials={setSelectedUnitForFinancials}
            onRefresh={fetchUnits}
          />
        ))}
      </div>

      {units.length === 0 && (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="rounded-full bg-muted p-6">
              <Home className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No units added yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Start by adding your first unit to manage tenants, rent, and property details.
              </p>
            </div>
            <Button 
              size="lg"
              onClick={() => setShowAddUnitModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Unit
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedUnit && (
        <EditUnitModal
          isOpen={true}
          propertyId={propertyId}
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
          onUnitUpdated={() => {
            fetchUnits();
            setSelectedUnit(null);
          }}
          isMultiUnit={true}
        />
      )}

      {/* Modal for creating new unit */}
      {showAddUnitModal && (
        <EditUnitModal
          isOpen={true}
          propertyId={propertyId}
          onClose={() => setShowAddUnitModal(false)}
          onUnitUpdated={() => {
            fetchUnits();
            setShowAddUnitModal(false);
          }}
          isMultiUnit={true}
        />
      )}

      {selectedUnitForDetails && (
        <UnitDetailsModal
          unit={selectedUnitForDetails}
          property={{ id: propertyId } as Property}
          onClose={() => setSelectedUnitForDetails(null)}
          onUnitUpdated={() => {
            fetchUnits();
            setSelectedUnitForDetails(null);
          }}
        />
      )}

      {selectedUnitForFinancials && (
        <UnitFinancialsEditorDialog
          isOpen={true}
          onClose={() => setSelectedUnitForFinancials(null)}
          unit={selectedUnitForFinancials}
          onSave={() => {
            fetchUnits();
            setSelectedUnitForFinancials(null);
          }}
        />
      )}
    </div>
  );
};

export default PropertyUnitsManager;