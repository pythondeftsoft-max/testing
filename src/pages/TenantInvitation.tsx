import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2, Home, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationDetails {
  tenant_name: string;
  tenant_email: string;
  property_id: string;
  monthly_rent: number;
  tenant_portion?: number;
  pha_portion?: number;
  tenant_type: string;
  lease_start_date?: string;
  lease_end_date?: string;
  property?: {
    address: string;
  };
}

const TenantInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }
    
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_invitations')
        .select(`
          tenant_name,
          tenant_email,
          property_id,
          monthly_rent,
          tenant_portion,
          pha_portion,
          tenant_type,
          lease_start_date,
          lease_end_date,
          status,
          expires_at,
          properties!inner (
            address
          )
        `)
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setError('Invitation not found or has expired');
        return;
      }

      // Check if invitation has expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      setInvitation({
        ...data,
        property: data.properties
      });
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to accept this invitation",
        variant: "destructive"
      });
      // Redirect to auth with return URL
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.href)}`);
      return;
    }

    if (!token || !invitation) return;

    try {
      setAccepting(true);
      
      // Call the accept_tenant_invitation RPC function
      const { data, error } = await supabase.rpc('accept_tenant_invitation', {
        p_invitation_token: token,
        p_user_id: user.id
      });

      if (error) throw error;
      
      if (data && data.length > 0 && data[0].success) {
        setAccepted(true);
        
        toast({
          title: "Invitation Accepted!",
          description: `You've been connected to ${invitation.property?.address}. You can now pay rent.`
        });

        // Redirect to payments page with property context after short delay
        setTimeout(() => {
          navigate(`/payments?propertyId=${data[0].property_id}`, { replace: true });
        }, 2000);
      } else {
        throw new Error(data?.[0]?.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to accept invitation',
        variant: "destructive"
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invitation Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Invitation Accepted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You've been successfully connected to <strong>{invitation?.property?.address}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your payment portal...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle-blue">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="text-center">
          <Home className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Property Invitation</CardTitle>
          <p className="text-muted-foreground">
            You've been invited to connect to a property
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Property Details */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Property Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium">{invitation?.property?.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant:</span>
                <span className="font-medium">{invitation?.tenant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">
                  {invitation?.tenant_type === 'voucher' ? 'Section 8 Voucher' : 'Market Rate'}
                </span>
              </div>
            </div>
          </div>

          {/* Rent Details */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Rent Information</h3>
            <div className="space-y-2 text-sm">
              {invitation?.tenant_type === 'voucher' && invitation.tenant_portion && invitation.pha_portion ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Monthly Rent:</span>
                    <span className="font-medium">${invitation.monthly_rent?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Portion:</span>
                    <span className="font-medium text-primary">${invitation.tenant_portion?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PHA Portion:</span>
                    <span className="font-medium">${invitation.pha_portion?.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="font-medium text-primary">${invitation?.monthly_rent?.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lease Dates if available */}
          {invitation?.lease_start_date && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Lease Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium">
                    {new Date(invitation.lease_start_date).toLocaleDateString()}
                  </span>
                </div>
                {invitation.lease_end_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">
                      {new Date(invitation.lease_end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Please sign in to accept this invitation
                </p>
                <Button 
                  onClick={() => navigate(`/auth?returnTo=${encodeURIComponent(window.location.href)}`)}
                  className="w-full"
                >
                  Sign In to Accept
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full"
                size="lg"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    Accept & Go to Payments
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Cancel
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground text-center">
            By accepting this invitation, you'll be connected to this property and can pay rent online.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantInvitation;