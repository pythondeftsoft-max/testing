
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AssetInvitation {
  id: string;
  asset_id: string;
  inviter_id: string;
  invited_email: string;
  invited_user_id?: string;
  invitee_type: string;
  role: string;
  status: string;
  invitation_token: string;
  expires_at: string;
  accepted_at?: string;
  declined_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  portfolio_assets?: {
    asset_name: string;
  };
}

export const useAssetInvitations = (assetId?: string) => {
  const [invitations, setInvitations] = useState<AssetInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    if (!assetId) return;
    
    setLoading(true);
    try {
      console.log('Fetching invitations for asset:', assetId);
      
      // Use the new RPC function to bypass RLS issues
      const { data, error } = await supabase.rpc('get_asset_invitations', {
        p_asset_id: assetId
      });

      if (error) {
        console.error('Error fetching asset invitations via RPC:', error);
        throw error;
      }
      
      console.log('Fetched invitations:', data?.length || 0);
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error fetching asset invitations:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load invitations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (invitationData: {
    assetId: string;
    inviteeEmail: string;
    inviteeName: string;
    roleType: string;
    inviteeType: string;
    monthlyAmount?: number;
    currencyCode?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
  }) => {
    try {
      setLoading(true);
      
      console.log('Sending asset invitation:', {
        asset_id: invitationData.assetId,
        invited_email: invitationData.inviteeEmail,
        role: invitationData.roleType,
        invitee_type: invitationData.inviteeType
      });
      
      const { data, error } = await supabase.functions.invoke('send-asset-invitation', {
        body: {
          asset_id: invitationData.assetId,
          invited_email: invitationData.inviteeEmail,
          role: invitationData.roleType,
          invitee_type: invitationData.inviteeType,
          metadata: {
            invitee_name: invitationData.inviteeName,
            monthly_amount: invitationData.monthlyAmount,
            currency_code: invitationData.currencyCode || 'USD',
            start_date: invitationData.startDate,
            end_date: invitationData.endDate,
            notes: invitationData.notes,
          }
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Invitation sent successfully:', data);

      toast({
        title: "Success",
        description: "Invitation sent successfully.",
      });

      // Refresh invitations list
      fetchInvitations();
      return { success: true };
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || "Failed to send invitation.";
      if (error.message?.includes("Tenant invites are not supported")) {
        errorMessage = "This asset doesn't support tenant invites. Try using a collaborator role instead.";
      } else if (error.message?.includes("Insufficient permissions")) {
        errorMessage = "You don't have permission to invite users to this asset.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      setLoading(true);
      
      // Get invitation details
      const { data: invitation, error: fetchError } = await supabase.rpc('get_asset_invitations', {
        p_asset_id: assetId
      });

      if (fetchError) {
        throw new Error('Failed to fetch invitation details');
      }

      const invitationToResend = invitation?.find((inv: AssetInvitation) => inv.id === invitationId);
      if (!invitationToResend) {
        throw new Error('Invitation not found');
      }

      const { error } = await supabase.functions.invoke('send-asset-invitation', {
        body: {
          asset_id: invitationToResend.asset_id,
          invited_email: invitationToResend.invited_email,
          role: invitationToResend.role,
          invitee_type: invitationToResend.invitee_type,
          metadata: invitationToResend.metadata,
          resend: true,
          original_invitation_id: invitationId
        }
      });

      if (error) throw error;

      // Update resend count
      await supabase
        .from('portfolio_asset_invitations')
        .update({ 
          resent_count: (invitationToResend.resent_count || 0) + 1,
          last_resent_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      toast({
        title: "Success",
        description: "Invitation resent successfully.",
      });

      fetchInvitations();
      return { success: true };
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async (invitationToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('accept-asset-invitation', {
        body: {
          invitationToken: invitationToken
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation accepted successfully.",
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_asset_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation cancelled.",
      });

      // Refresh the list
      fetchInvitations();
      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchInvitations();
    }
  }, [assetId]);

  return {
    invitations,
    loading,
    sendInvitation,
    resendInvitation,
    acceptInvitation,
    cancelInvitation,
    fetchInvitations,
  };
};
