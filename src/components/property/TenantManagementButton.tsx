import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, UserMinus } from 'lucide-react';
import { InviteTenantModal } from './InviteTenantModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface TenantManagementButtonProps {
  propertyId: string;
  hasTenant: boolean;
  tenantInfo?: any;
  propertyAddress: string;
  onStatusChange: () => void;
  className?: string;
  supportsTenantManagement?: boolean;
}

export const TenantManagementButton = ({ 
  propertyId, 
  hasTenant, 
  tenantInfo,
  propertyAddress,
  onStatusChange,
  className,
  supportsTenantManagement = true
}: TenantManagementButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();

  // Early return if tenant management is not supported
  if (!supportsTenantManagement) {
    return null;
  }

  const handleInviteTenant = async (tenantData: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('invite_property_tenant', {
        p_property_id: propertyId,
        p_tenant_email: tenantData.email,
        p_tenant_name: tenantData.name,
        p_rent_amount: parseFloat(tenantData.rent),
        p_move_in_date: tenantData.moveInDate
      });

      if (error) throw error;

      toast({
        title: "Tenant Invited",
        description: `${tenantData.name} has been invited. Property is now Occupied.`,
      });

      onStatusChange();
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error inviting tenant:', error);
      toast({
        title: "Error",
        description: "Failed to invite tenant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTenant = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('remove_property_tenant', {
        p_property_id: propertyId
      });

      if (error) throw error;

      toast({
        title: "Tenant Removed",
        description: "Tenant has been removed. Property is now Vacant.",
      });

      onStatusChange();
    } catch (error) {
      console.error('Error removing tenant:', error);
      toast({
        title: "Error",
        description: "Failed to remove tenant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasTenant) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInviteModal(true)}
          disabled={isLoading}
          className={className}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Invite Tenant
        </Button>

        <InviteTenantModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInviteTenant}
          propertyAddress={propertyAddress}
        />
      </>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          className={className}
        >
          <UserMinus className="h-4 w-4 mr-1" />
          Remove Tenant
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Tenant</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove the tenant from <strong>{propertyAddress}</strong>? 
            This will mark the property as Vacant and remove it from the market.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemoveTenant} disabled={isLoading}>
            {isLoading ? 'Removing...' : 'Remove Tenant'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};