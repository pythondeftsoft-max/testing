import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AccountInvitation {
  id: string;
  email: string;
  role: string;
  permissions?: any;
  invited_by: string;
  invitation_token: string;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  created_at: string;
  updated_at: string;
  status: string;
}

export const useAccountInvitations = () => {
  const [invitations, setInvitations] = useState<AccountInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching account invitations:', error);
        // Handle specific RLS errors
        if (error.message?.includes('permission denied') || error.message?.includes('policy')) {
          throw new Error('You do not have permission to view account invitations. Please ensure you have the correct role.');
        }
        throw error;
      }
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error fetching account invitations:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch account invitations. Please check your permissions.",
        variant: "destructive",
      });
      setInvitations([]); // Set empty array on error to prevent UI issues
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('resend-account-invitation', {
        body: { invitationId },
      });
      if (error) {
        throw error as any;
      }
      toast({
        title: "Success",
        description: data?.message || "Invitation has been resent successfully.",
      });
      await fetchInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: error?.message || error?.error || "Failed to resend invitation.",
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('account_invitations')
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

    // Set up real-time subscription
    const channel = supabase
      .channel('account-invitations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_invitations'
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    invitations,
    loading,
    resendInvitation,
    cancelInvitation,
    refetch: fetchInvitations
  };
};