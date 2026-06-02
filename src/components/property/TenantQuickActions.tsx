
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserX, RefreshCw, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InviteTenantModal } from './InviteTenantModal';
import { SwitchTenantModal } from './SwitchTenantModal';
import RentSplitForm from '@/components/RentSplitForm';
import { useAdminActions } from '@/hooks/useAdminActions';
import { debugLog } from '@/utils/debug';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TenantQuickActionsProps {
  propertyId: string;
  propertyAddress: string;
  hasTenant: boolean;
  onStatusChange: () => void;
  currentOnMarket?: boolean;
  supportsTenantManagement?: boolean;
  adminMode?: boolean;
  tenantInfo?: {
    tenant_id: string;
    tenant_name: string;
    tenant_email: string;
  };
}

export const TenantQuickActions = ({ 
  propertyId, 
  propertyAddress, 
  hasTenant, 
  onStatusChange,
  currentOnMarket,
  supportsTenantManagement = true,
  adminMode = false,
  tenantInfo
}: TenantQuickActionsProps) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showRentSplitForm, setShowRentSplitForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { removePropertyTenant, switchPropertyTenant } = useAdminActions();

  // Early return if tenant management is not supported
  if (!supportsTenantManagement) {
    debugLog('TenantQuickActions', 'Component not rendering - no tenant management support', {
      propertyId,
      supportsTenantManagement
    });
    return null;
  }

  debugLog('TenantQuickActions', 'Component rendering', {
    propertyId,
    hasTenant,
    adminMode,
    renderingAs: hasTenant ? 'tenant-actions' : 'invite-button'
  });

  const handleInviteTenant = async (tenantData: {
    name: string;
    email: string;
    tenantType: string;
    rent: string;
    tenantPortion: string;
    phaPortion: string;
    leaseStartDate: string;
    leaseEndDate: string;
    tenantCollectionMethod: 'stripe' | 'external';
    paymentDueDate?: string;
  }) => {
    try {
      setIsLoading(true);
      
      // Generate invitation token
      const invitationToken = crypto.randomUUID();
      
      // Call the invite tenant edge function
      const { error } = await supabase.functions.invoke('send-tenant-invitation', {
        body: {
          propertyId,
          tenantName: tenantData.name,
          tenantEmail: tenantData.email,
          tenantType: tenantData.tenantType,
          monthlyRent: parseFloat(tenantData.rent),
          tenantPortion: tenantData.tenantPortion ? parseFloat(tenantData.tenantPortion) : null,
          phaPortion: tenantData.phaPortion ? parseFloat(tenantData.phaPortion) : null,
          leaseStartDate: tenantData.leaseStartDate,
          leaseEndDate: tenantData.leaseEndDate,
          propertyAddress,
          invitationToken
        }
      });

      if (error) throw error;

      // Create rent_splits record with collection method for payment tracking
      const totalRent = parseFloat(tenantData.rent);
      const phaPortion = tenantData.phaPortion ? parseFloat(tenantData.phaPortion) : 0;
      const tenantPortion = tenantData.tenantPortion 
        ? parseFloat(tenantData.tenantPortion) 
        : totalRent;

      const { error: splitError } = await supabase
        .from('rent_splits')
        .upsert({
          property_id: propertyId,
          total_rent: totalRent,
          pha_portion: phaPortion,
          tenant_portion: tenantPortion,
          tenant_collection_method: tenantData.tenantCollectionMethod,
          effective_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'property_id'
        });

      if (splitError) {
        console.error('Error creating rent split:', splitError);
        // Don't throw - invitation was still sent
      }

      // Create recurring charge if Stripe method selected and tenant portion > 0
      if (tenantData.tenantCollectionMethod === 'stripe' && tenantPortion > 0 && tenantData.paymentDueDate) {
        const { error: chargeError } = await supabase
          .from('recurring_charges')
          .upsert({
            property_id: propertyId,
            charge_name: 'Monthly Rent',
            charge_type: 'rent',
            amount: tenantPortion,
            frequency: 'monthly',
            start_date: tenantData.paymentDueDate,
            next_due_date: tenantData.paymentDueDate,
            applies_to: 'tenant',
            is_active: true
          }, {
            onConflict: 'property_id,charge_type'
          });

        if (chargeError) {
          console.error('Error creating recurring charge:', chargeError);
        }
      }

      toast({
        title: "Success",
        description: "Tenant invitation sent successfully! They will receive an email with instructions to accept.",
      });

      setShowInviteModal(false);
      onStatusChange();
    } catch (error) {
      console.error('Error inviting tenant:', error);
      toast({
        title: "Error",
        description: "Failed to invite tenant.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTenant = async () => {
    if (adminMode) {
      // Use admin override RPC
      await handleRemoveTenantAdmin();
    } else {
      // Use regular landlord flow
      await handleRemoveTenantLandlord();
    }
  };

  const handleRemoveTenantAdmin = async () => {
    try {
      setIsLoading(true);

      await removePropertyTenant.mutateAsync({
        propertyId,
        reason: `Admin removed tenant from ${propertyAddress}`,
        metadata: { source: 'admin_dashboard', property_address: propertyAddress }
      });

      setShowRemoveDialog(false);
      onStatusChange();
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTenantLandlord = async () => {
    try {
      setIsLoading(true);

      // Remove tenant applications
      const { error: applicationError } = await supabase
        .from('property_applications')
        .delete()
        .eq('property_id', propertyId)
        .eq('status', 'approved');

      if (applicationError) throw applicationError;

      // Update property status: vacant and keep off market
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          occupancy_status: 'vacant',
          on_market: false // Keep property off market until manually toggled
        })
        .eq('id', propertyId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Tenant removed. Property is now Vacant.",
      });

      setShowRemoveDialog(false);
      onStatusChange();
    } catch (error) {
      console.error('Error removing tenant:', error);
      toast({
        title: "Error",
        description: "Failed to remove tenant.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchTenant = async ({ newTenantEmail, reason }: { newTenantEmail: string; reason: string }) => {
    try {
      setIsLoading(true);

      await switchPropertyTenant.mutateAsync({
        propertyId,
        newTenantEmail,
        reason: reason || `Admin switched tenant for ${propertyAddress}`,
        metadata: { source: 'admin_dashboard', property_address: propertyAddress }
      });

      setShowSwitchModal(false);
      onStatusChange();
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (hasTenant) {
      setShowRemoveDialog(true);
    } else {
      setShowInviteModal(true);
    }
  };

  return (
    <>
      {hasTenant && adminMode ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={isLoading}
              className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              title="Tenant Actions"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setShowRentSplitForm(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Edit Rent & Payments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowSwitchModal(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Switch Tenant
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowRemoveDialog(true)} className="text-destructive">
              <UserX className="h-4 w-4 mr-2" />
              Remove Tenant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={handleClick}
          disabled={isLoading}
          className={`h-8 w-8 ${
            hasTenant 
              ? "text-destructive hover:bg-destructive hover:text-destructive-foreground" 
              : "text-green-600 hover:bg-green-600 hover:text-white"
          }`}
          title={hasTenant ? "Remove Tenant" : "Invite Tenant"}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
          ) : hasTenant ? (
            <UserX className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </Button>
      )}

      <InviteTenantModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteTenant}
        propertyAddress={propertyAddress}
      />

      <SwitchTenantModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        onSubmit={handleSwitchTenant}
        propertyAddress={propertyAddress}
        currentTenantInfo={tenantInfo ? {
          tenant_name: tenantInfo.tenant_name,
          tenant_email: tenantInfo.tenant_email
        } : undefined}
        isLoading={isLoading}
      />

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the tenant from this property? 
              The property will be marked as vacant and remain off market until you choose to list it again.
              {adminMode && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                  <strong>Admin Override:</strong> This action will use elevated privileges to remove the tenant.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveTenant}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? "Removing..." : "Remove Tenant"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showRentSplitForm && (
        <RentSplitForm
          property={{ 
            id: propertyId, 
            address: propertyAddress 
          }}
          onClose={() => setShowRentSplitForm(false)}
          onSaved={() => {
            setShowRentSplitForm(false);
            onStatusChange();
          }}
        />
      )}
    </>
  );
};
