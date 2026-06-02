
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye,
  Edit,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';

// Debug logging utility
const debugLog = (component: string, message: string, data?: any) => {
  const debugEnabled = localStorage.getItem('permission-debug:enabled') === 'true';
  if (debugEnabled) {
    console.log(`[${component}] ${message}`, data);
  }
};

interface EffectivePermissionsDisplayProps {
  permissions: any;
  loading: boolean;
  scope: 'account' | 'portfolio';
  specificCheck?: boolean;
  specificLoading: boolean;
  objectName?: string;
  action?: string;
}

export const EffectivePermissionsDisplay: React.FC<EffectivePermissionsDisplayProps> = ({
  permissions,
  loading,
  scope,
  specificCheck,
  specificLoading,
  objectName,
  action
}) => {
  debugLog('EffectivePermissionsDisplay', 'Component rendered', {
    permissions,
    loading,
    scope,
    specificCheck,
    objectName,
    action
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'view': return <Eye className="h-3 w-3" />;
      case 'edit': return <Edit className="h-3 w-3" />;
      case 'create': return <Plus className="h-3 w-3" />;
      case 'delete': return <Trash2 className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getPermissionBadge = (allowed: boolean) => {
    return allowed ? (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        Allowed
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-300">
        <XCircle className="h-3 w-3 mr-1" />
        Denied
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Effective Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!permissions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Effective Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No permission data available. Please select a user {scope === 'portfolio' ? 'and portfolio' : ''}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const permissionEntries = Object.entries(permissions || {});
  debugLog('EffectivePermissionsDisplay', 'Permission entries processed', permissionEntries);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Effective Permissions ({scope})
        </CardTitle>
        {objectName && action && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Specific Check:</span>
            <Badge variant="outline" className="font-mono">
              {objectName}.{action}
            </Badge>
            {specificLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              getPermissionBadge(specificCheck || false)
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {permissionEntries.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No permissions found for this user in {scope} scope.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {permissionEntries.map(([objectName, perms]: [string, any]) => (
              <div key={objectName} className="border rounded-lg p-3 space-y-2">
                <div className="font-medium text-sm">{objectName}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['view', 'edit', 'create', 'delete'].map((actionType) => (
                    <div key={actionType} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        {getActionIcon(actionType)}
                        {actionType}
                      </span>
                      {getPermissionBadge(perms[actionType] || false)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface DecisionTraceProps {
  userId?: string;
  scope: 'account' | 'portfolio';
  portfolioId?: string;
  objectName?: string;
  action?: string;
  result?: boolean;
}

export const DecisionTrace: React.FC<DecisionTraceProps> = ({
  userId,
  scope,
  portfolioId,
  objectName,
  action,
  result
}) => {
  debugLog('DecisionTrace', 'Component rendered', {
    userId,
    scope,
    portfolioId,
    objectName,
    action,
    result
  });

  const canShowTrace = userId && objectName && action && (scope === 'account' || portfolioId);

  const traceSteps = [
    {
      step: 1,
      description: 'User Identity Verification',
      status: userId ? 'complete' : 'pending',
      details: userId ? `User ID: ${userId}` : 'No user selected'
    },
    {
      step: 2,
      description: 'Scope Determination',
      status: scope ? 'complete' : 'pending',
      details: `Checking ${scope} level permissions`
    },
    {
      step: 3,
      description: 'Resource Context',
      status: (scope === 'account' || portfolioId) ? 'complete' : 'pending',
      details: scope === 'portfolio' 
        ? (portfolioId ? `Portfolio: ${portfolioId}` : 'No portfolio selected')
        : 'Account level access'
    },
    {
      step: 4,
      description: 'Permission Object',
      status: objectName ? 'complete' : 'pending',
      details: objectName ? `Object: ${objectName}` : 'No object selected'
    },
    {
      step: 5,
      description: 'Action Verification',
      status: action ? 'complete' : 'pending',
      details: action ? `Action: ${action}` : 'No action selected'
    },
    {
      step: 6,
      description: 'Final Decision',
      status: canShowTrace ? (result ? 'allowed' : 'denied') : 'pending',
      details: canShowTrace 
        ? (result ? 'Access granted' : 'Access denied')
        : 'Complete all steps to see decision'
    }
  ];

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'allowed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Decision Trace
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {traceSteps.map((step) => (
            <div key={step.step} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center">
                {getStepIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{step.description}</span>
                  <Badge 
                    variant={step.status === 'complete' || step.status === 'allowed' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {step.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{step.details}</p>
              </div>
            </div>
          ))}
        </div>
        
        {canShowTrace && (
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium mb-2">Debug Information:</div>
            <div className="text-xs font-mono space-y-1">
              <div>User: {userId}</div>
              <div>Scope: {scope}</div>
              {portfolioId && <div>Portfolio: {portfolioId}</div>}
              <div>Object: {objectName}</div>
              <div>Action: {action}</div>
              <div>Result: {result ? 'ALLOWED' : 'DENIED'}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
