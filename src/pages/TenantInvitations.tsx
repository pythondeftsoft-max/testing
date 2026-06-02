
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TenantInvitationsManager } from '@/components/TenantInvitationsManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Mail, CheckCircle, Clock } from 'lucide-react';

const TenantInvitations = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to view tenant invitations.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tenant Invitations</h1>
        <p className="text-muted-foreground">
          Manage invitations sent to tenants for your occupied properties.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Successfully linked</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Invitations sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How Tenant Invitations Work</CardTitle>
          <CardDescription>
            Understanding the tenant invitation process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
              <div>
                <h4 className="font-semibold">Set Property as Occupied</h4>
                <p className="text-sm text-muted-foreground">Mark your property as "Occupied" and select the tenant type (Voucher or Market Rate).</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
              <div>
                <h4 className="font-semibold">Invite Your Tenant</h4>
                <p className="text-sm text-muted-foreground">Click "Invite Tenant" on the property card to send an invitation email.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
              <div>
                <h4 className="font-semibold">Tenant Signs Up</h4>
                <p className="text-sm text-muted-foreground">Your tenant receives the email and creates their account. Voucher tenants provide HAP information, market-rate tenants skip this step.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">4</div>
              <div>
                <h4 className="font-semibold">Automatic Linking</h4>
                <p className="text-sm text-muted-foreground">Once signed up, the tenant is automatically linked to your property with the correct payment structure.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Invitations Manager */}
      <TenantInvitationsManager landlordId={user.id} />
    </div>
  );
};

export default TenantInvitations;
