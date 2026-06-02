import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

const AcceptAdminInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    if (!user) {
      // Redirect to login with return URL
      navigate(`/auth?redirect=/accept-admin-invite?token=${token}`);
      return;
    }

    fetchInvitation();
  }, [token, user]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('system_admin_invitations')
        .select(`
          *,
          inviter:profiles!system_admin_invitations_invited_by_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        setError('This invitation is invalid or has already been used');
        setLoading(false);
        return;
      }

      // Check expiration
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      // Check email match
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user!.id)
        .single();

      if (profile?.email !== data.email) {
        setError(`This invitation was sent to ${data.email}. Please log in with that email address.`);
        setLoading(false);
        return;
      }

      setInvitation(data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation');
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-system-admin-invitation', {
        body: { token }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to accept invitation');
      }

      setSuccess(true);
      toast.success('System admin access granted!');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard?tab=access-permissions');
      }, 2000);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast.error(err.message || 'Failed to accept invitation');
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Access Granted!</CardTitle>
            <CardDescription>
              You now have system administrator access. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const inviterName = invitation.inviter
    ? `${invitation.inviter.first_name || ''} ${invitation.inviter.last_name || ''}`.trim() || invitation.inviter.email
    : 'Unknown';

  const expiresDate = new Date(invitation.expires_at);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">System Administrator Invitation</CardTitle>
          <CardDescription>
            You've been invited to become a system administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Role:</span>
                  <span className="capitalize">{invitation.role_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Invited by:</span>
                  <span>{inviterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Expires:</span>
                  <span>{expiresDate.toLocaleDateString()} at {expiresDate.toLocaleTimeString()}</span>
                </div>
                {invitation.notes && (
                  <div className="pt-2 border-t">
                    <span className="font-medium">Notes:</span>
                    <p className="mt-1 text-sm">{invitation.notes}</p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={handleDecline}
              variant="outline"
              className="flex-1"
              disabled={accepting}
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1"
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptAdminInvitePage;
