import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PortfolioInvitation {
  id: string;
  portfolio_id: string;
  invited_email: string;
  invited_user_id?: string;
  inviter_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  accepted_at?: string;
  declined_at?: string;
  invitation_token: string;
  metadata?: any;
}

export const usePortfolioInvitations = (portfolioId?: string) => {
  const [invitations, setInvitations] = useState<PortfolioInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    if (!portfolioId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolio_invitations')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data || []) as PortfolioInvitation[]);
    } catch (error) {
      console.error('Error fetching portfolio invitations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch portfolio invitations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (invitationData: {
    portfolioId: string;
    inviteeEmail: string;
    inviteeName: string;
    roleType: string;
    inviteeType: string;
    additionalData?: any;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-portfolio-invitation', {
        body: invitationData
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio invitation sent successfully.",
      });

      await fetchInvitations();
      return data;
    } catch (error) {
      console.error('Error sending portfolio invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send portfolio invitation.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) throw new Error('Invitation not found');

      const { data, error } = await supabase.functions.invoke('send-portfolio-invitation', {
        body: {
          portfolioId: invitation.portfolio_id,
          inviteeEmail: invitation.invited_email,
          inviteeName: invitation.invited_email,
          roleType: invitation.role,
          inviteeType: 'existing_user',
          isResend: true,
          originalInvitationId: invitationId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio invitation resent successfully.",
      });

      await fetchInvitations();
    } catch (error) {
      console.error('Error resending portfolio invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend portfolio invitation.",
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_invitations')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio invitation cancelled.",
      });

      await fetchInvitations();
    } catch (error) {
      console.error('Error cancelling portfolio invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel portfolio invitation.",
        variant: "destructive",
      });
    }
  };

  const updateInvitationRole = async (invitationId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_invitations')
        .update({ 
          role: newRole as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('status', 'pending'); // Only update pending invitations

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation role updated successfully.",
      });

      await fetchInvitations();
    } catch (error) {
      console.error('Error updating invitation role:', error);
      toast({
        title: "Error",
        description: "Failed to update invitation role.",
        variant: "destructive",
      });
    }
  };

  const getInvitationLink = (invitation: PortfolioInvitation) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/accept-portfolio-invitation?token=${invitation.invitation_token}`;
  };

  const copyInvitationLink = async (invitation: PortfolioInvitation) => {
    try {
      const link = getInvitationLink(invitation);
      await navigator.clipboard.writeText(link);
      toast({
        title: "Success",
        description: "Invitation link copied to clipboard.",
      });
    } catch (error) {
      console.error('Error copying invitation link:', error);
      toast({
        title: "Error",
        description: "Failed to copy invitation link.",
        variant: "destructive",
      });
    }
  };

  const isExpiringSoon = (invitation: PortfolioInvitation) => {
    const expiryDate = new Date(invitation.expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  const isExpired = (invitation: PortfolioInvitation) => {
    const expiryDate = new Date(invitation.expires_at);
    const now = new Date();
    return now > expiryDate;
  };

  useEffect(() => {
    fetchInvitations();
  }, [portfolioId]);

  return {
    invitations,
    loading,
    sendInvitation,
    resendInvitation,
    cancelInvitation,
    updateInvitationRole,
    copyInvitationLink,
    getInvitationLink,
    isExpiringSoon,
    isExpired,
    refetch: fetchInvitations
  };
};