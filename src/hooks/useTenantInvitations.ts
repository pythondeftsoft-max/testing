
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TenantInvitation {
  id: string;
  property_id: string;
  unit_id?: string;
  tenant_name: string;
  tenant_email: string;
  tenant_type: string;
  status: string;
  created_at: string;
  expires_at: string;
  monthly_rent?: number;
  tenant_portion?: number;
  pha_portion?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  invitation_data?: any;
}

export const useTenantInvitations = (landlordId?: string) => {
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    if (!landlordId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_invitations')
        .select('*')
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching tenant invitations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenant invitations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canInviteTenant = (propertyStatus: string, tenantId?: string) => {
    return propertyStatus !== 'occupied' && !tenantId;
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      // Update the expires_at to extend the invitation
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 7);

      const { error } = await supabase
        .from('tenant_invitations')
        .update({ 
          expires_at: newExpiryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation has been resent successfully.",
      });

      await fetchInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation.",
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('tenant_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation has been cancelled.",
      });

      await fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [landlordId]);

  return {
    invitations,
    loading,
    canInviteTenant,
    resendInvitation,
    cancelInvitation,
    refetch: fetchInvitations
  };
};
