
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

type InvitationStatus = 'loading' | 'success' | 'error' | 'expired' | 'not_found';
type InvitationType = 'account' | 'portfolio';

interface AccountInvitationData {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  invited_by?: string;
}

interface PortfolioInvitationData {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  created_at: string;
  inviter_id?: string;
  portfolio_id: string;
  portfolios?: {
    client_name: string;
  } | null;
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [invitationType, setInvitationType] = useState<InvitationType>('account');
  const [accountInvitation, setAccountInvitation] = useState<AccountInvitationData | null>(null);
  const [portfolioInvitation, setPortfolioInvitation] = useState<PortfolioInvitationData | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const token = searchParams.get('token');
  const typeParam = searchParams.get('type') as InvitationType | null;

  useEffect(() => {
    if (!token) {
      setStatus('not_found');
      return;
    }

    // Determine invitation type from URL parameter or try to detect automatically
    const detectedType = typeParam || 'account';
    setInvitationType(detectedType);
    
    fetchInvitation(detectedType);
  }, [token, typeParam]);

  const fetchInvitation = async (type: InvitationType) => {
    if (!token) return;

    try {
      console.log('Fetching invitation for token:', token, 'type:', type);
      
      if (type === 'portfolio') {
        // Fetch portfolio invitation using the token as ID (UUID)
        const { data, error } = await supabase
          .from('portfolio_invitations')
          .select('*')
          .eq('id', token)
          .single();

        if (error) {
          console.error('Error fetching portfolio invitation:', error);
          // If portfolio invitation not found, try account invitation
          if (error.code === 'PGRST116') {
            return fetchInvitation('account');
          }
          setStatus('not_found');
          return;
        }

        if (!data) {
          console.log('No portfolio invitation found for token');
          return fetchInvitation('account');
        }

        console.log('Portfolio invitation data:', data);

        // Fetch portfolio details separately to avoid join issues
        let portfolioData = null;
        if (data.portfolio_id) {
          const { data: portfolio, error: portfolioError } = await supabase
            .from('portfolios')
            .select('client_name')
            .eq('id', data.portfolio_id)
            .single();

          if (!portfolioError && portfolio) {
            portfolioData = portfolio;
          } else {
            console.error('Error fetching portfolio details:', portfolioError);
          }
        }

        // Check if invitation is already accepted
        if (data.status === 'accepted') {
          console.log('Portfolio invitation already accepted');
          setStatus('success');
          setPortfolioInvitation({ ...data, portfolios: portfolioData });
          return;
        }

        setPortfolioInvitation({ ...data, portfolios: portfolioData });
        setInvitationType('portfolio');
        setStatus('success');
        
      } else {
        // Fetch account invitation
        const { data, error } = await supabase
          .from('account_invitations')
          .select('id, email, role, status, expires_at, invited_by')
          .eq('invitation_token', token)
          .single();

        if (error) {
          console.error('Error fetching account invitation:', error);
          // If account invitation not found and we haven't tried portfolio yet, try portfolio
          if (error.code === 'PGRST116' && !typeParam) {
            return fetchInvitation('portfolio');
          }
          setStatus('not_found');
          return;
        }

        if (!data) {
          console.log('No account invitation found for token');
          if (!typeParam) {
            return fetchInvitation('portfolio');
          }
          setStatus('not_found');
          return;
        }

        console.log('Account invitation data:', data);

        // Check if invitation is expired
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          console.log('Account invitation expired at:', expiresAt);
          setStatus('expired');
          return;
        }

        // Check if already accepted
        if (data.status === 'accepted') {
          console.log('Account invitation already accepted');
          setStatus('success');
          setAccountInvitation(data);
          return;
        }

        setAccountInvitation(data);
        setInvitationType('account');
        setStatus('success');
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setStatus('error');
    }
  };

  const handleAcceptInvitation = async () => {
    if ((!accountInvitation && !portfolioInvitation) || !token) return;

    setIsAccepting(true);
    try {
      console.log('Accepting invitation with token:', token, 'type:', invitationType);
      
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: {
          invitationId: token,
          type: invitationType
        }
      });

      if (error) {
        console.error('Error accepting invitation:', error);
        toast.error(error.message || 'Failed to accept invitation');
        return;
      }

      console.log('Invitation accepted successfully:', data);
      toast.success(data.message || 'Invitation accepted successfully!');
      
      // Redirect based on invitation type
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
      } else if (invitationType === 'portfolio' && portfolioInvitation) {
        navigate(`/dashboard?portfolioId=${portfolioInvitation.portfolio_id}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const getInvitationDetails = () => {
    if (invitationType === 'portfolio' && portfolioInvitation) {
      return {
        email: portfolioInvitation.invited_email,
        role: portfolioInvitation.role,
        context: portfolioInvitation.portfolios?.client_name || 'Portfolio',
        expires: null
      };
    } else if (invitationType === 'account' && accountInvitation) {
      return {
        email: accountInvitation.email,
        role: accountInvitation.role,
        context: 'Account',
        expires: accountInvitation.expires_at
      };
    }
    return null;
  };

  const invitationDetails = getInvitationDetails();
  const isAlreadyAccepted = 
    (invitationType === 'portfolio' && portfolioInvitation?.status === 'accepted') ||
    (invitationType === 'account' && accountInvitation?.status === 'accepted');

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading invitation...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              The invitation link is invalid or may have been removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please request a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Error</CardTitle>
            <CardDescription>
              There was an error processing your invitation. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => fetchInvitation(invitationType)} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAlreadyAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitationDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              Unable to load invitation details.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/auth')} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>
            {invitationType === 'portfolio' ? 'Portfolio' : 'Account'} Invitation
          </CardTitle>
          <CardDescription>
            You've been invited to join {invitationDetails.context} as a {invitationDetails.role}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Invitation for: {invitationDetails.email}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Role: <span className="font-medium capitalize">{invitationDetails.role}</span>
          </div>
          {invitationDetails.expires && (
            <div className="text-center text-sm text-muted-foreground">
              Expires: {new Date(invitationDetails.expires).toLocaleDateString()}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleAcceptInvitation}
              disabled={isAccepting}
              className="flex-1"
            >
              {isAccepting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Accept Invitation
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
