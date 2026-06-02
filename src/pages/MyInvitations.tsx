import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Clock, CheckCircle, XCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistance } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface MyInvitation {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  metadata?: any;
  portfolio_assets: {
    asset_name: string;
    asset_type: string;
  } | null;
  invitation_token: string;
}

export const MyInvitations = () => {
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchMyInvitations();
    }
  }, [user]);

  const fetchMyInvitations = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('portfolio_asset_invitations')
        .select(`
          id,
          invited_email,
          role,
          status,
          expires_at,
          created_at,
          metadata,
          invitation_token,
          portfolio_assets!inner(
            asset_name,
            asset_type
          )
        `)
        .eq('invited_email', user.email)
        .in('status', ['pending', 'expired'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      toast({
        title: "Error",
        description: "Failed to load invitations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = (invitation: MyInvitation) => {
    navigate(`/accept-asset-invitation?token=${invitation.invitation_token}`);
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_asset_invitations')
        .update({ 
          status: 'declined',
          declined_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation declined.",
      });

      fetchMyInvitations();
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      toast({
        title: "Error",
        description: "Failed to decline invitation.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'declined':
        return <XCircle className="w-4 h-4" />;
      case 'expired':
        return <X className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary' as const;
      case 'accepted':
        return 'default' as const;
      case 'declined':
        return 'destructive' as const;
      case 'expired':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">My Invitations</h1>
          <p className="text-muted-foreground">Loading your invitations...</p>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">My Invitations</h1>
          <p className="text-muted-foreground">
            Manage invitations you've received to join assets.
          </p>
        </div>

        <Card>
          <CardContent className="text-center py-8">
            <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Invitations</h3>
            <p className="text-muted-foreground">
              You don't have any pending invitations at this time.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">My Invitations</h1>
        <p className="text-muted-foreground">
          Manage invitations you've received to join assets.
        </p>
      </div>

      <div className="space-y-4">
        {invitations.map((invitation) => (
          <Card key={invitation.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(invitation.status)}
                    <span className="font-medium">
                      {invitation.portfolio_assets?.asset_name || 'Unknown Asset'}
                    </span>
                    <Badge variant={getStatusVariant(invitation.status)}>
                      {invitation.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Role: {invitation.role}</p>
                    <p>Asset Type: {invitation.portfolio_assets?.asset_type || 'Unknown'}</p>
                    {invitation.metadata?.monthly_amount && (
                      <p>Monthly Rent: {invitation.metadata.currency_code} {invitation.metadata.monthly_amount}</p>
                    )}
                    {invitation.metadata?.start_date && (
                      <p>Start Date: {new Date(invitation.metadata.start_date).toLocaleDateString()}</p>
                    )}
                    <p>
                      Received: {formatDistance(new Date(invitation.created_at), new Date(), { addSuffix: true })}
                    </p>
                    {invitation.status === 'pending' && (
                      <p className="text-warning">
                        Expires: {formatDistance(new Date(invitation.expires_at), new Date(), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {invitation.metadata?.notes && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm">{invitation.metadata.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {invitation.status === 'pending' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAcceptInvitation(invitation)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeclineInvitation(invitation.id)}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};