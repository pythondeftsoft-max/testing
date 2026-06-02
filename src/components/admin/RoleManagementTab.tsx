
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  Building, 
  Activity, 
  AlertTriangle,
  UserCheck,
  Settings,
  Eye,
  Globe
} from 'lucide-react';
import { AccountRoleManager } from '@/components/account/AccountRoleManager';
import { AccountPermissionsManager } from '@/components/permissions/AccountPermissionsManager';
import PermissionExplorer from '@/components/admin/PermissionExplorer';
import RbacLogs from '@/pages/admin/RbacLogs';
import EffectivePermissionsInspector from './EffectivePermissionsInspector';
import GlobalRoleManagement from './GlobalRoleManagement';
import { useAuth } from '@/hooks/useAuth';
import { useAccountRoles } from '@/hooks/useAccountRoles';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RoleManagementTabProps {
  compact?: boolean;
}

const RoleManagementTab: React.FC<RoleManagementTabProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const { highestAccountRole, isAccountOwner, hasPermission } = useAccountRoles();
  const { data: isAdmin } = useAdminCheck();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'global' : 'account-roles');

  // Get basic stats for overview
  const { data: roleStats } = useQuery({
    queryKey: ['role-management-stats'],
    queryFn: async () => {
      const [accountRoles, portfolioRoles, recentActivity] = await Promise.all([
        supabase.from('account_roles').select('id, role_name').eq('is_active', true),
        supabase.from('portfolio_roles').select('id, role_name').eq('is_active', true),
        supabase.from('rbac_audit_logs').select('id').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      return {
        activeAccountRoles: accountRoles.data?.length || 0,
        activePortfolioRoles: portfolioRoles.data?.length || 0,
        recent24hActivity: recentActivity.data?.length || 0,
        accountRoleBreakdown: accountRoles.data?.reduce((acc, role) => {
          acc[role.role_name] = (acc[role.role_name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {}
      };
    },
    enabled: !!user && (isAccountOwner || hasPermission('admin.role_management', 'view') || isAdmin)
  });

  // Check if user has appropriate permissions - include admin_partner access and platform admin
  const hasRoleManagementAccess = isAccountOwner || hasPermission('admin.role_management', 'view') || 
    (highestAccountRole && ['admin_partner', 'owner'].includes(highestAccountRole)) || isAdmin;

  if (!hasRoleManagementAccess) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access role management. Contact an account owner or administrator.
          <div className="mt-2">
            <Badge variant="outline">{highestAccountRole || 'No role'}</Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Role Management
            </h2>
            <p className="text-muted-foreground">
              Manage user roles, permissions, and access control across your account and portfolios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {highestAccountRole}
            </Badge>
            {isAdmin && (
              <Badge variant="default" className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Platform Admin
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats Overview */}
      {roleStats && !compact && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Account Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.activeAccountRoles}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {Object.entries(roleStats.accountRoleBreakdown).map(([role, count]) => (
                  <Badge key={role} variant="outline" className="mr-1 text-xs">
                    {role}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Portfolio Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.activePortfolioRoles}</div>
              <div className="text-xs text-muted-foreground">across all portfolios</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                24h Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.recent24hActivity}</div>
              <div className="text-xs text-muted-foreground">permission events</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Your Access Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={isAccountOwner || isAdmin ? "default" : "secondary"}>
                {isAdmin ? "Platform Admin" : isAccountOwner ? "Full Access" : highestAccountRole || "Limited"}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {isAdmin ? "Platform Administrator" : isAccountOwner ? "Account Owner" : "Role-based permissions"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs Interface */}
      <Card>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Role & Permission Management
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? "p-0" : ""}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
              {/* Show Global Admin tab first for platform admins */}
              {isAdmin && (
                <TabsTrigger value="global" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Global Admin
                </TabsTrigger>
              )}
              <TabsTrigger value="account-roles" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Account Roles
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="inspector" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Permission Inspector
              </TabsTrigger>
              <TabsTrigger value="explorer" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Permission Explorer
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account-roles" className="space-y-4">
              <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertDescription>
                  Manage user roles and invitations for your account. Only account owners can assign roles.
                </AlertDescription>
              </Alert>
              <AccountRoleManager />
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Configure what each role can access. Changes affect all users with that role immediately.
                </AlertDescription>
              </Alert>
              <AccountPermissionsManager 
                currentUserId={user?.id || ''} 
                isAccountOwner={isAccountOwner} 
              />
            </TabsContent>

            <TabsContent value="inspector" className="space-y-4">
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Test and inspect effective permissions for any user. Useful for troubleshooting access issues.
                </AlertDescription>
              </Alert>
              <EffectivePermissionsInspector />
            </TabsContent>

            <TabsContent value="explorer" className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Advanced permission testing tool. Simulate permission checks and debug access control logic.
                </AlertDescription>
              </Alert>
              <PermissionExplorer />
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  Monitor all access control events. Track permission checks, denials, and user activity.
                </AlertDescription>
              </Alert>
              <RbacLogs />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="global" className="space-y-4">
                <GlobalRoleManagement compact={true} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagementTab;
