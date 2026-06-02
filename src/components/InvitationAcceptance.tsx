
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  invited_email: string;
  invitee_type: string;
  role: string;
  status: string;
  expires_at: string;
  metadata: any;
  asset?: {
    asset_name: string;
    metadata: any;
    portfolio_id: string;
  };
  portfolio?: {
    name: string;
  };
  scope: 'portfolio' | 'asset';
}

export const InvitationAcceptance = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token') || searchParams.get('invite');

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    if (!token) return;

    try {
      setLoading(true);
      
        // First, try to fetch asset invitation
        const { data: assetInvitation, error: assetError } = await supabase
          .from('portfolio_asset_invitations')
          .select(`
            id,
            invited_email,
            invitee_type,
            role,
            status,
            expires_at,
            metadata,
            asset:portfolio_assets!portfolio_asset_invitations_asset_id_fkey(asset_name, metadata, portfolio_id)
          `)
          .eq('invitation_token', token)
          .eq('status', 'pending')
          .gte('expires_at', new Date().toISOString())
          .single();

        if (!assetError && assetInvitation) {
          // Handle potential array response
          const asset = Array.isArray(assetInvitation.asset) ? assetInvitation.asset[0] : assetInvitation.asset;
          setInvitation({
            ...assetInvitation,
            asset: asset || { asset_name: 'Unknown Asset', metadata: {}, portfolio_id: '' },
            scope: 'asset'
          });
          setLoading(false);
          return;
        }

        // If no asset invitation, try portfolio invitation
        const { data: portfolioInvitation, error: portfolioError } = await supabase
          .from('portfolio_invitations')
          .select(`
            id,
            invited_email,
            invitee_type:role,
            role,
            status,
            expires_at,
            metadata,
            portfolio:portfolios!portfolio_invitations_portfolio_id_fkey(name)
          `)
          .eq('invitation_token', token)
          .single();

        if (!portfolioError && portfolioInvitation) {
          // Handle potential array response
          const portfolio = Array.isArray(portfolioInvitation.portfolio) ? portfolioInvitation.portfolio[0] : portfolioInvitation.portfolio;
          setInvitation({
            ...portfolioInvitation,
            portfolio: portfolio || { name: 'Unknown Portfolio' },
            scope: 'portfolio'
          });
        } else {
          setError('Invitation not found or expired');
        }
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user || !invitation || !token) {
      toast.error('Please sign in to accept this invitation');
      return;
    }

    setAccepting(true);

    try {
      if (invitation.scope === 'asset') {
        // Accept asset invitation using edge function
        const { data, error } = await supabase.functions.invoke('accept-asset-invitation', {
          body: { invitationToken: token }
        });

        if (error) throw error;

        if (data.success) {
          toast.success('Asset invitation accepted successfully!');
          navigate(`/dashboard?portfolioId=everything&tab=assets`);
        } else {
          throw new Error(data.message || 'Failed to accept invitation');
        }
      } else {
        // Accept portfolio invitation (existing logic)
        const { data, error } = await supabase.rpc('accept_portfolio_invitation', {
          invitation_id: token
        });

        if (error) throw error;

        const result = data[0];
        if (result.success) {
          toast.success('Portfolio invitation accepted successfully!');
          navigate(`/dashboard?portfolioId=${result.portfolio_id}`);
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <XCircle className="h-5 w-5 mr-2" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This invitation may have expired or already been used.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Invitation Already {invitation.status === 'accepted' ? 'Accepted' : 'Processed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This invitation has already been {invitation.status}.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <XCircle className="h-5 w-5 mr-2" />
              Invitation Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This invitation expired on {new Date(invitation.expires_at).toLocaleDateString()}.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              You're Invited!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">You've been invited to access:</p>
                <p className="font-medium">
                  {invitation.scope === 'asset' 
                    ? invitation.asset?.asset_name 
                    : invitation.portfolio?.name}
                </p>
                <Badge variant="secondary" className="mt-1">
                  {invitation.invitee_type} • {invitation.role}
                </Badge>
              </div>
              
              <p className="text-muted-foreground text-sm">
                Please sign in or create an account to accept this invitation.
              </p>
              
              <Button onClick={() => navigate('/auth')} className="w-full">
                Sign In / Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Accept Invitation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">You've been invited to access:</p>
              <p className="font-medium">
                {invitation.scope === 'asset' 
                  ? invitation.asset?.asset_name 
                  : invitation.portfolio?.name}
              </p>
              <Badge variant="secondary" className="mt-1">
                {invitation.invitee_type} • {invitation.role}
              </Badge>
            </div>

            {invitation.scope === 'asset' && invitation.asset && (
              <div className="text-sm text-muted-foreground">
                <p>Asset Type: {invitation.asset.metadata?.asset_type || 'Real Estate'}</p>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              <p>Invited: {invitation.invited_email}</p>
              <p>Expires: {new Date(invitation.expires_at).toLocaleDateString()}</p>
            </div>
            
            <Button 
              onClick={handleAcceptInvitation} 
              disabled={accepting}
              className="w-full"
            >
              {accepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Accept Invitation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
