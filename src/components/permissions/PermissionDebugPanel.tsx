import React from 'react';
import { useAccountRoles } from '@/hooks/useAccountRoles';
import { usePermissions } from '@/providers/PermissionProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PermissionDebugPanelProps {
  object: string;
  action: 'view' | 'edit' | 'delete' | 'create';
  scope?: 'account' | 'portfolio';
  portfolioId?: string | null;
}

export const PermissionDebugPanel: React.FC<PermissionDebugPanelProps> = ({
  object,
  action,
  scope = 'account',
  portfolioId
}) => {
  const { hasPermission: hasRolePermission, highestAccountRole, isAccountOwner } = useAccountRoles();
  const { hasPermission: hasProviderPermission } = usePermissions();
  
  const providerResult = hasProviderPermission(object, action, scope);
  const roleResult = scope === 'account' ? hasRolePermission(object, action) : false;
  
  const finalAccess = providerResult === true || providerResult === 'via_grant' || 
                     (scope === 'account' && (providerResult === null || providerResult === false) ? roleResult : false);

  if (!localStorage.getItem('rbac:debug:enabled')) {
    return null;
  }

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-orange-800">Permission Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <strong>Object:</strong> {object}
          </div>
          <div>
            <strong>Action:</strong> {action}
          </div>
          <div>
            <strong>Scope:</strong> {scope}
          </div>
          <div>
            <strong>Portfolio ID:</strong> {portfolioId || 'N/A'}
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Provider Result:</span>
            <Badge variant={providerResult === true ? 'default' : providerResult === 'via_grant' ? 'secondary' : 'destructive'}>
              {String(providerResult)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Role Result:</span>
            <Badge variant={roleResult ? 'default' : 'destructive'}>
              {String(roleResult)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Final Access:</span>
            <Badge variant={finalAccess ? 'default' : 'destructive'}>
              {String(finalAccess)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">User Role:</span>
            <Badge variant="outline">
              {highestAccountRole || 'None'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Is Owner:</span>
            <Badge variant={isAccountOwner ? 'default' : 'outline'}>
              {String(isAccountOwner)}
            </Badge>
          </div>
        </div>
        
        <div className="text-xs text-orange-700 mt-2">
          <strong>Debug Tip:</strong> Set localStorage 'rbac:debug:enabled' to 'false' to hide this panel
        </div>
      </CardContent>
    </Card>
  );
};