import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar, Plus } from 'lucide-react';
import { useAccessGrants } from '@/hooks/useAccessGrants';
import { useAccessRequests, useCancelAccessRequest } from '@/hooks/useAccessRequests';
import { useActiveGrantsRealtime } from '@/hooks/useActiveGrantsRealtime';
import { useAccessRequestsRealtime } from '@/hooks/useAccessRequestsRealtime';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { RequestAccessDialog } from '@/components/permissions/RequestAccessDialog';
import { useGrantExpiryAlerts } from '@/hooks/useGrantExpiryAlerts';
import { AccessNotificationsBanner } from '@/components/AccessNotificationsBanner';

export default function MyAccess() {
  const { user } = useAuth();
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');

  const { grants, isLoading: grantsLoading, revokeGrant } = useAccessGrants(user?.id);
  const { data: requests, isLoading: requestsLoading } = useAccessRequests();
  const cancelRequest = useCancelAccessRequest();
  const { extensionDialog, setExtensionDialog } = useGrantExpiryAlerts();
  
  // Enable realtime updates
  useActiveGrantsRealtime();
  useAccessRequestsRealtime();

  const [manualExtensionDialog, setManualExtensionDialog] = useState<{
    open: boolean;
    scope: 'account' | 'portfolio';
    portfolioId?: string | null;
    objectName: string;
    action: 'view' | 'edit' | 'delete' | 'create';
  } | null>(null);

  const handleCancelRequest = async () => {
    if (!selectedRequestId) return;
    
    try {
      await cancelRequest.mutateAsync(selectedRequestId);
      setSelectedRequestId('');
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const handleRevoke = async (grantId: string) => {
    try {
      await revokeGrant.mutateAsync({ grantId });
      toast.success('Grant revoked successfully');
    } catch (error) {
      console.error('Failed to revoke grant:', error);
    }
  };

  const getExpiryColor = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) return 'destructive';
    if (hours < 6) return 'default';
    return 'secondary';
  };

  const getExpiryText = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    
    if (expiry < now) return 'Expired';
    
    return formatDistanceToNow(expiry, { addSuffix: true });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'denied':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'outline';
      case 'expired':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const activeGrants = grants?.filter(grant => {
    const now = new Date();
    const expiry = new Date(grant.expires_at);
    return expiry > now && !grant.revoked_at;
  }) || [];

  const pendingRequests = requests?.filter(request => request.status === 'pending') || [];

  return (
    <div className="space-y-6">
      <AccessNotificationsBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Access</h1>
          <p className="text-muted-foreground">
            View your temporary access grants and request history
          </p>
        </div>
        <div className="flex items-center gap-4">
          {activeGrants.length > 0 && (
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {activeGrants.length} active grant{activeGrants.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Active Grants ({activeGrants.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Request History ({requests?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Access Grants</CardTitle>
              <CardDescription>
                Your currently active temporary access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {grantsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : activeGrants.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Active Grants</h3>
                  <p className="text-muted-foreground">
                    You don't have any active temporary access grants at the moment
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeGrants.map((grant) => (
                    <div
                      key={grant.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{grant.object_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {grant.action}
                            </Badge>
                            <Badge variant={grant.scope === 'account' ? 'default' : 'secondary'}>
                              {grant.scope}
                            </Badge>
                            {grant.portfolio && (
                              <span className="text-xs text-muted-foreground">
                                {grant.portfolio.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Badge variant={getExpiryColor(grant.expires_at)}>
                            {getExpiryText(grant.expires_at)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setManualExtensionDialog({
                              open: true,
                              scope: grant.scope,
                              portfolioId: grant.portfolio_id,
                              objectName: grant.object_name,
                              action: grant.action,
                            })}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Extend
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Granted {formatDistanceToNow(new Date(grant.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>
                  Access requests awaiting review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20"
                    >
                      <div className="flex items-center gap-4">
                        <Clock className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium">{request.object_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {request.action}
                            </Badge>
                            <Badge variant={request.scope === 'account' ? 'default' : 'secondary'}>
                              {request.scope}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {request.requested_duration_minutes} minutes requested
                            </span>
                          </div>
                          {request.justification && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {request.justification}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequestId(request.id)}
                            >
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Access Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this access request? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setSelectedRequestId('')}>
                                Keep Request
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleCancelRequest}>
                                Cancel Request
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>
                All your access requests and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : !requests || requests.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Request History</h3>
                  <p className="text-muted-foreground">
                    You haven't made any access requests yet
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.object_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {request.action}
                              </Badge>
                              <Badge variant={request.scope === 'account' ? 'default' : 'secondary'}>
                                {request.scope}
                              </Badge>
                            </div>
                            {request.justification && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {request.justification}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <Badge variant={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          {request.denial_reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {request.denial_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {format(new Date(request.created_at), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </p>
                        </TableCell>
                        <TableCell>
                          {request.decided_at ? (
                            <div>
                              <p className="text-sm">
                                {format(new Date(request.decided_at), 'MMM d, yyyy')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(request.decided_at), { addSuffix: true })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Pending</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Extension dialogs */}
      {extensionDialog && (
        <RequestAccessDialog
          open={extensionDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setExtensionDialog(null);
            }
          }}
          scope={extensionDialog.scope}
          portfolioId={extensionDialog.portfolioId}
          objectName={extensionDialog.objectName}
          action={extensionDialog.action}
        />
      )}

      {manualExtensionDialog && (
        <RequestAccessDialog
          open={manualExtensionDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setManualExtensionDialog(null);
            }
          }}
          scope={manualExtensionDialog.scope}
          portfolioId={manualExtensionDialog.portfolioId}
          objectName={manualExtensionDialog.objectName}
          action={manualExtensionDialog.action}
        />
      )}
    </div>
  );
}