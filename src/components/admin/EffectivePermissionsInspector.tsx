import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserSearch, 
  PortfolioSelector, 
  ObjectSelector, 
  ActionSelector 
} from '@/components/admin/PermissionExplorerControls';
import { 
  EffectivePermissionsDisplay, 
  DecisionTrace 
} from '@/components/admin/PermissionExplorerResults';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountEffectivePermissions, usePortfolioEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { useAccountRoles } from '@/hooks/useAccountRoles';
import { 
  Search, 
  Shield, 
  User, 
  Building, 
  Eye, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface InspectionState {
  userId: string;
  scope: 'account' | 'portfolio';
  portfolioId: string | null;
  objectName: string;
  action: 'view' | 'edit' | 'create' | 'delete';
}

const EffectivePermissionsInspector = () => {
  const [inspectionState, setInspectionState] = useState<InspectionState>({
    userId: '',
    scope: 'account',
    portfolioId: null,
    objectName: '',
    action: 'view'
  });

  const [lastInspection, setLastInspection] = useState<InspectionState | null>(null);

  // Get effective permissions for the selected user
  const { data: accountPermissions } = useAccountEffectivePermissions();
  
  const { data: portfolioPermissions } = usePortfolioEffectivePermissions(
    inspectionState.scope === 'portfolio' ? inspectionState.portfolioId : null
  );

  // Get user info for display
  const { data: userInfo } = useQuery({
    queryKey: ['user-info', inspectionState.userId],
    queryFn: async () => {
      if (!inspectionState.userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, user_type, email')
        .eq('id', inspectionState.userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!inspectionState.userId
  });

  // Get user's account roles
  const { data: userAccountRoles } = useQuery({
    queryKey: ['user-account-roles', inspectionState.userId],
    queryFn: async () => {
      if (!inspectionState.userId) return [];
      
      const { data, error } = await supabase
        .from('account_roles')
        .select('role_name, is_active, created_at')
        .eq('user_id', inspectionState.userId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!inspectionState.userId
  });

  // Get user's portfolio roles
  const { data: userPortfolioRoles } = useQuery({
    queryKey: ['user-portfolio-roles', inspectionState.userId],
    queryFn: async () => {
      if (!inspectionState.userId) return [];
      
      const { data, error } = await supabase
        .from('portfolio_roles')
        .select(`
          role_name, 
          is_active, 
          created_at,
          portfolio_id,
          portfolios!inner(client_name)
        `)
        .eq('user_id', inspectionState.userId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!inspectionState.userId
  });

  // Get permission objects for the current scope
  const { data: permissionObjects = [] } = useQuery({
    queryKey: ['permission-objects', inspectionState.scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_objects')
        .select('name, display_name, category')
        .eq('scope', inspectionState.scope)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) {
        console.error('Error fetching permission objects:', error);
        return [];
      }

      return data;
    },
    staleTime: 300000,
  });

  // Test specific permission
  const { data: specificPermissionCheck, isLoading: isCheckingPermission } = useQuery({
    queryKey: ['specific-permission-check', lastInspection],
    queryFn: async () => {
      if (!lastInspection || !lastInspection.userId || !lastInspection.objectName) return null;
      
      if (lastInspection.scope === 'account') {
        const { data, error } = await (supabase as any).rpc('has_account_permission', {
          p_user_id: lastInspection.userId,
          p_object: lastInspection.objectName,
          p_action: lastInspection.action
        });
        
        if (error) throw error;
        return { allowed: data, scope: 'account' };
      } else {
        const { data, error } = await (supabase as any).rpc('has_portfolio_permission', {
          p_user_id: lastInspection.userId,
          p_portfolio_id: lastInspection.portfolioId,
          p_object: lastInspection.objectName,
          p_action: lastInspection.action
        });
        
        if (error) throw error;
        return { allowed: data, scope: 'portfolio' };
      }
    },
    enabled: !!lastInspection?.userId && !!lastInspection?.objectName
  });

  const handleInspect = () => {
    setLastInspection({ ...inspectionState });
  };

  const handleReset = () => {
    setInspectionState({
      userId: '',
      scope: 'account',
      portfolioId: null,
      objectName: '',
      action: 'view'
    });
    setLastInspection(null);
  };

  const isReadyToInspect = inspectionState.userId && inspectionState.objectName;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Search className="w-5 h-5" />
            Effective Permissions Inspector
          </h3>
          <p className="text-sm text-muted-foreground">
            Inspect and troubleshoot user permissions across account and portfolio scopes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            size="sm" 
            onClick={handleInspect} 
            disabled={!isReadyToInspect}
          >
            <Eye className="w-4 h-4 mr-2" />
            Inspect Permissions
          </Button>
        </div>
      </div>

      {/* Inspection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Inspection Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <UserSearch
                value={inspectionState.userId}
                onChange={(userId) => setInspectionState(prev => ({ ...prev, userId }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Permission Scope</label>
              <div className="flex gap-2">
                <Button
                  variant={inspectionState.scope === 'account' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInspectionState(prev => ({ 
                    ...prev, 
                    scope: 'account', 
                    portfolioId: null 
                  }))}
                  className="flex-1"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Account
                </Button>
                <Button
                  variant={inspectionState.scope === 'portfolio' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInspectionState(prev => ({ ...prev, scope: 'portfolio' }))}
                  className="flex-1"
                >
                  <Building className="w-4 h-4 mr-2" />
                  Portfolio
                </Button>
              </div>
            </div>

            {inspectionState.scope === 'portfolio' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio</label>
                <PortfolioSelector
                  value={inspectionState.portfolioId}
                  onChange={(portfolioId) => setInspectionState(prev => ({ ...prev, portfolioId }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Permission Object</label>
              <ObjectSelector
                value={inspectionState.objectName}
                onValueChange={(objectName) => setInspectionState(prev => ({ ...prev, objectName }))}
                objects={permissionObjects}
                placeholder={`Select ${inspectionState.scope} object...`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <ActionSelector
                value={inspectionState.action}
                onChange={(action) => setInspectionState(prev => ({ ...prev, action }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Information Display */}
      {userInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Basic Info</h4>
                <div className="mt-2">
                  <p className="font-medium">
                    {userInfo.first_name} {userInfo.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                  <Badge variant="outline" className="mt-1">
                    {userInfo.user_type}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Account Roles</h4>
                <div className="mt-2 space-y-1">
                  {userAccountRoles?.length ? (
                    userAccountRoles.map((role, index) => (
                      <Badge key={index} variant="default" className="mr-1">
                        {role.role_name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No account roles</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Portfolio Roles</h4>
                <div className="mt-2 space-y-1">
                  {userPortfolioRoles?.length ? (
                    userPortfolioRoles.map((role, index) => (
                      <Badge key={index} variant="secondary" className="mr-1 text-xs">
                        {role.role_name} - {(role.portfolios as any)?.client_name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No portfolio roles</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Specific Permission Check Result */}
      {lastInspection && specificPermissionCheck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {specificPermissionCheck.allowed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              Permission Check Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={specificPermissionCheck.allowed ? "border-green-200" : "border-red-200"}>
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {lastInspection.action.toUpperCase()} access to "{lastInspection.objectName}" 
                    in {lastInspection.scope} scope: 
                    <Badge 
                      variant={specificPermissionCheck.allowed ? "default" : "destructive"}
                      className="ml-2"
                    >
                      {specificPermissionCheck.allowed ? 'ALLOWED' : 'DENIED'}
                    </Badge>
                  </p>
                  {lastInspection.scope === 'portfolio' && lastInspection.portfolioId && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Portfolio ID: {lastInspection.portfolioId}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Effective Permissions Display */}
      {lastInspection && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EffectivePermissionsDisplay
            permissions={lastInspection.scope === 'account' ? accountPermissions : portfolioPermissions}
            loading={false}
            scope={lastInspection.scope}
            specificCheck={!!specificPermissionCheck?.allowed}
            specificLoading={isCheckingPermission}
            objectName={lastInspection.objectName}
            action={lastInspection.action}
          />

          <DecisionTrace
            userId={lastInspection.userId}
            objectName={lastInspection.objectName}
            action={lastInspection.action}
            scope={lastInspection.scope}
            portfolioId={lastInspection.portfolioId}
            result={specificPermissionCheck?.allowed}
          />
        </div>
      )}

      {!inspectionState.userId && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Select a user and permission object to begin inspecting effective permissions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default EffectivePermissionsInspector;