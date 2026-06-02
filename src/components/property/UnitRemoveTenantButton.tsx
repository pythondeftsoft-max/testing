
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminUnitActions } from '@/hooks/useAdminUnitActions';

interface UnitRemoveTenantButtonProps {
  propertyId: string;
  unitId: string;
  unitLabel?: string;
  tenantId?: string;
  onTenantRemoved: () => void;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  iconOnly?: boolean;
  adminMode?: boolean;
}

export const UnitRemoveTenantButton: React.FC<UnitRemoveTenantButtonProps> = ({
  propertyId,
  unitId,
  unitLabel,
  tenantId,
  onTenantRemoved,
  size = 'sm',
  variant = 'outline',
  iconOnly = false,
  adminMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { removeUnitTenant } = useAdminUnitActions();

  const handleRemoveTenant = async () => {
    if (adminMode) {
      await handleAdminRemoveTenant();
    } else {
      await handleLandlordRemoveTenant();
    }
  };

  const handleAdminRemoveTenant = async () => {
    setIsLoading(true);
    try {
      await removeUnitTenant.mutateAsync({
        unitId,
        reason: `Admin removed tenant from ${unitLabel || 'unit'}`,
        metadata: { source: 'admin_dashboard', unit_label: unitLabel }
      });

      setIsOpen(false);
      onTenantRemoved();
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleLandlordRemoveTenant = async () => {
    setIsLoading(true);
    try {
      // Update the unit to remove tenant and set status to available
      const { error: unitError } = await supabase
        .from('property_units')
        .update({
          tenant_id: null,
          status: 'available',
        })
        .eq('id', unitId);

      if (unitError) throw unitError;

      // Check if any other units are still occupied
      const { data: occupiedUnits } = await supabase
        .from('property_units')
        .select('id')
        .eq('property_id', propertyId)
        .eq('status', 'occupied');

      // If no occupied units remain, update property occupancy status
      if (!occupiedUnits || occupiedUnits.length === 0) {
        await supabase
          .from('properties')
          .update({ occupancy_status: 'available' })
          .eq('id', propertyId);
      }

      // Optionally, cancel any approved applications tied to this unit
      const { error: applicationError } = await supabase
        .from('property_applications')
        .update({ status: 'cancelled' })
        .eq('property_id', propertyId)
        .eq('unit_id', unitId)
        .eq('status', 'approved');

      if (applicationError) {
        // Log but don't fail the main success
        console.warn('Error updating unit applications:', applicationError);
      }

      toast({
        title: 'Tenant Removed',
        description: `Tenant has been removed from ${unitLabel || 'this unit'}. The unit is now available.`,
      });

      setIsOpen(false);
      onTenantRemoved();
    } catch (error) {
      console.error('Error removing unit tenant:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove tenant from unit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size={iconOnly ? 'icon' : size} variant={variant} className={`flex items-center gap-2 ${iconOnly ? 'h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground' : ''}`} aria-label="Remove Tenant" title="Remove Tenant">
          <UserX className="h-4 w-4" />
          {!iconOnly && 'Remove Tenant'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Tenant from Unit</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove the tenant from <strong>{unitLabel || 'this unit'}</strong>? This will set the unit status to "Available" and allow new applications.
            {adminMode && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                <strong>Admin Override:</strong> This action will use elevated privileges to remove the tenant.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemoveTenant} disabled={isLoading}>
            {isLoading ? 'Removing...' : 'Remove Tenant'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
