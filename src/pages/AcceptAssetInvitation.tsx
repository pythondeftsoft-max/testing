import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAssetInvitations } from '@/hooks/useAssetInvitations';
import { format } from 'date-fns';

interface InvitationDetails {
  id: string;
  asset_id: string;
  inviter_id: string;
  invited_email: string;
  role: string;
  status: string;
  expires_at: string;
  metadata?: any;
  portfolio_assets: {
    asset_name: string;
    portfolio_id: string;
  };
}

export const AcceptAssetInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { acceptInvitation } = useAssetInvitations();
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      fetchInvitation();
    } else {
      setError('No invitation token provided');
      setLoading(false);
    }
  }, [token]);

  const fetchInvitation = async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('portfolio_asset_invitations')
        .select(`
          *,
          portfolio_assets(
            asset_name,
            portfolio_id
          )
        `)
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Invalid or expired invitation');
        return;
      }

      setInvitation(data);
    } catch (error: any) {
      console.error('Error fetching invitation:', error);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token || !user) return;

    try {
      setAccepting(true);
      
      const result = await acceptInvitation(token);
      
      if (result.success) {
        setAccepted(true);
        // Redirect to the portfolio after a short delay
        setTimeout(() => {
          navigate(`/dashboard?portfolioId=${invitation?.portfolio_assets.portfolio_id}&tab=assets`);
        }, 2000);
      } else {
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invitation Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleGoHome} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
            <h2 className="text-xl font-semibold mb-2">Invitation Accepted!</h2>
            <p className="text-muted-foreground mb-4">
              You've successfully joined {invitation?.portfolio_assets.asset_name}. 
              You'll be redirected to the dashboard shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to accept this invitation.
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In to Accept
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Invitation Not Found</h2>
            <p className="text-muted-foreground">This invitation may have expired or been cancelled.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Asset Invitation</CardTitle>
          <p className="text-muted-foreground">
            You've been invited to join an asset
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">
              {invitation.portfolio_assets.asset_name}
            </h3>
            <Badge variant="secondary" className="mb-4">
              {invitation.role}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Invitation Details</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="font-medium">Invitee:</span> {invitation.metadata?.invitee_name}</p>
                <p><span className="font-medium">Email:</span> {invitation.invited_email}</p>
                <p><span className="font-medium">Role:</span> {invitation.role}</p>
                <p><span className="font-medium">Expires:</span> {format(new Date(invitation.expires_at), 'MMM dd, yyyy')}</p>
              </div>
            </div>

            {invitation.role === 'tenant' && invitation.metadata?.monthly_amount && (
              <div>
                <h4 className="font-medium mb-2">Lease Terms</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium">Monthly Rent:</span> {invitation.metadata.currency_code} {invitation.metadata.monthly_amount}</p>
                  {invitation.metadata.start_date && (
                    <p><span className="font-medium">Start Date:</span> {format(new Date(invitation.metadata.start_date), 'MMM dd, yyyy')}</p>
                  )}
                  {invitation.metadata.end_date && (
                    <p><span className="font-medium">End Date:</span> {format(new Date(invitation.metadata.end_date), 'MMM dd, yyyy')}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {invitation.metadata?.notes && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Additional Notes</h4>
              <p className="text-sm">{invitation.metadata.notes}</p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleGoHome}>
              Cancel
            </Button>
            <Button 
              onClick={handleAcceptInvitation} 
              disabled={accepting}
              className="min-w-32"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept & Join Asset'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};