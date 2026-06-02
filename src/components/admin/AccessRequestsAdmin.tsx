import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, User, Shield, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useAccessRequests, useApproveAccessRequest, useDenyAccessRequest, AccessRequest } from '@/hooks/useAccessRequests';
import { ApproveRequestDialog } from './ApproveRequestDialog';
import { DenyRequestDialog } from './DenyRequestDialog';
import { formatDistanceToNow } from 'date-fns';

export const AccessRequestsAdmin: React.FC = () => {
  const { data: requests = [], isLoading } = useAccessRequests();
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  const getStatusBadge = (status: AccessRequest['status']) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      denied: 'destructive',
      cancelled: 'secondary',
      expired: 'secondary',
    } as const;

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      denied: XCircle,
      cancelled: XCircle,
      expired: Calendar,
    };

    const Icon = icons[status];

    return (
      <Badge variant={variants[status] || 'secondary'} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleApprove = (request: AccessRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const handleDeny = (request: AccessRequest) => {
    setSelectedRequest(request);
    setShowDenyDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 animate-spin" />
          Loading access requests...
        </div>
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  No pending access requests
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onDeny={handleDeny}
                showActions={true}
                getStatusBadge={getStatusBadge}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  No request history
                </div>
              </CardContent>
            </Card>
          ) : (
            historyRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onDeny={handleDeny}
                showActions={false}
                getStatusBadge={getStatusBadge}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {selectedRequest && (
        <>
          <ApproveRequestDialog
            open={showApproveDialog}
            onOpenChange={setShowApproveDialog}
            request={selectedRequest}
          />
          <DenyRequestDialog
            open={showDenyDialog}
            onOpenChange={setShowDenyDialog}
            request={selectedRequest}
          />
        </>
      )}
    </>
  );
};

interface RequestCardProps {
  request: AccessRequest;
  onApprove: (request: AccessRequest) => void;
  onDeny: (request: AccessRequest) => void;
  showActions: boolean;
  getStatusBadge: (status: AccessRequest['status']) => JSX.Element;
}

const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onApprove,
  onDeny,
  showActions,
  getStatusBadge,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                {request.action} access to {request.object_name}
              </CardTitle>
              {getStatusBadge(request.status)}
            </div>
            <CardDescription className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Requester ID: {request.requester_id.slice(0, 8)}...
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {request.scope} scope
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {request.requested_duration_minutes} minutes
              </span>
            </CardDescription>
          </div>
          
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(request)}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeny(request)}
              >
                Deny
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {request.justification && (
          <div>
            <h4 className="font-medium mb-2">Justification:</h4>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
              {request.justification}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Requested: {formatDistanceToNow(new Date(request.created_at))} ago</p>
          {request.decided_at && (
            <p>
              Decided: {formatDistanceToNow(new Date(request.decided_at))} ago
              {request.decision_reason && ` - ${request.decision_reason}`}
            </p>
          )}
          {request.expires_at && (
            <p>Expires: {new Date(request.expires_at).toLocaleString()}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};