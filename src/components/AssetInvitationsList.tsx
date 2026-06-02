import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistance } from 'date-fns';
import { Mail, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAssetInvitations, type AssetInvitation } from '@/hooks/useAssetInvitations';

interface AssetInvitationsListProps {
  assetId: string;
}

export const AssetInvitationsList = ({ assetId }: AssetInvitationsListProps) => {
  const { invitations, loading, resendInvitation, cancelInvitation } = useAssetInvitations(assetId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'declined':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
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
      case 'cancelled':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (loading) {
    return <div>Loading invitations...</div>;
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No invitations sent yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Asset Invitations</h3>
      {invitations.map((invitation: AssetInvitation) => (
        <Card key={invitation.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(invitation.status)}
                  <span className="font-medium">
                    {invitation.metadata?.invitee_name || invitation.invited_email}
                  </span>
                  <Badge variant={getStatusVariant(invitation.status)}>
                    {invitation.status}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Email: {invitation.invited_email}</p>
                  <p>Role: {invitation.role}</p>
                  {invitation.metadata?.monthly_amount && (
                    <p>Monthly Rent: {invitation.metadata.currency_code} {invitation.metadata.monthly_amount}</p>
                  )}
                  {invitation.metadata?.start_date && (
                    <p>Start Date: {new Date(invitation.metadata.start_date).toLocaleDateString()}</p>
                  )}
                  <p>
                    Sent: {formatDistance(new Date(invitation.created_at), new Date(), { addSuffix: true })}
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
                      variant="ghost"
                      size="sm"
                      onClick={() => resendInvitation(invitation.id)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelInvitation(invitation.id)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};