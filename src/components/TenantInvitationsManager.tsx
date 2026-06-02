
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantInvitations } from '@/hooks/useTenantInvitations';
import { formatDistance } from 'date-fns';
import { Mail, RefreshCw, X, Clock, CheckCircle, XCircle } from 'lucide-react';

interface TenantInvitationsManagerProps {
  landlordId: string;
}

export const TenantInvitationsManager = ({ landlordId }: TenantInvitationsManagerProps) => {
  const { invitations, loading, resendInvitation, cancelInvitation, refetch } = useTenantInvitations(landlordId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'expired':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return <div className="p-4">Loading tenant invitations...</div>;
  }

  if (!invitations || invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenant Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tenant invitations sent yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Tenant Invitations
          <Button size="sm" variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold">{invitation.tenant_name}</h4>
                  <p className="text-sm text-muted-foreground">{invitation.tenant_email}</p>
                  <p className="text-sm text-muted-foreground">
                    Property: {invitation.invitation_data?.property_address || 'Unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(invitation.status)}>
                    {getStatusIcon(invitation.status)}
                    <span className="ml-1 capitalize">{invitation.status}</span>
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tenant Type:</span>
                  <p className="capitalize">{invitation.tenant_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="font-medium">Monthly Rent:</span>
                  <p>${invitation.monthly_rent?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium">Sent:</span>
                  <p>{formatDistance(new Date(invitation.created_at), new Date(), { addSuffix: true })}</p>
                </div>
                <div>
                  <span className="font-medium">Expires:</span>
                  <p>{formatDistance(new Date(invitation.expires_at), new Date(), { addSuffix: true })}</p>
                </div>
              </div>

              {invitation.tenant_type === 'voucher' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Voucher Tenant:</strong> Tenant portion: ${invitation.tenant_portion?.toLocaleString() || 0}, 
                    HAP portion: ${invitation.pha_portion?.toLocaleString() || 0}
                  </p>
                </div>
              )}

              {invitation.tenant_type === 'market_rate' && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">
                    <strong>Market Rate Tenant:</strong> Pays full rent amount (${invitation.monthly_rent?.toLocaleString() || 0})
                  </p>
                </div>
              )}

              {invitation.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resendInvitation(invitation.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelInvitation(invitation.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
