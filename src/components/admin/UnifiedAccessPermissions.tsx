import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Building2, Shield, FileCheck, Activity, Info } from 'lucide-react';
import { AccountRoleManager } from '@/components/account/AccountRoleManager';
import { SystemAdminManager } from '@/components/admin/SystemAdminManager';
import PortfolioAccessManager from '@/components/admin/PortfolioAccessManager';
import { AccessRequestsAdmin } from '@/components/admin/AccessRequestsAdmin';
import { AccountPermissionsManager } from '@/components/permissions/AccountPermissionsManager';
import { SystemAdminPermissionsManager } from '@/components/permissions/SystemAdminPermissionsManager';
import PortfolioPermissionsDrillDown from '@/components/admin/PortfolioPermissionsDrillDown';
import PortfolioAuditLogs from '@/components/admin/PortfolioAuditLogs';
import PortfolioSimulationTools from '@/components/admin/PortfolioSimulationTools';
import GlobalRoleManagement from '@/components/admin/GlobalRoleManagement';
import { useAuth } from '@/hooks/useAuth';
import { useAccessRequests } from '@/hooks/useAccessRequests';

interface UnifiedAccessPermissionsProps {
  compact?: boolean;
}

const UnifiedAccessPermissions: React.FC<UnifiedAccessPermissionsProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const { data: accessRequests } = useAccessRequests();
  
  // Count pending access requests
  const pendingCount = accessRequests?.filter(req => req.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      {!compact && (
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Access & Permissions
          </h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive access control and permission management for your platform
          </p>
        </div>
      )}

      <Card>
        <CardContent className={compact ? "p-0" : "p-6"}>
          <Tabs defaultValue="invite" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="invite" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invite Staff
              </TabsTrigger>
              <TabsTrigger value="portfolio-access" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Portfolio Access
              </TabsTrigger>
              <TabsTrigger value="role-permissions" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Role Permissions
              </TabsTrigger>
              <TabsTrigger value="access-requests" className="flex items-center gap-2 relative">
                <FileCheck className="w-4 h-4" />
                Access Requests
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="admin-tools" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Admin Tools
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invite" className="space-y-4">
              <Alert>
                <UserPlus className="h-4 w-4" />
                <AlertDescription>
                  Manage platform staff and landlord account teams. Admin staff have full platform access, 
                  while landlord staff manage specific accounts.
                </AlertDescription>
              </Alert>
              
              <Tabs defaultValue="admin-staff" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="admin-staff">Admin Staff</TabsTrigger>
                  <TabsTrigger value="landlord-staff">Landlord Staff</TabsTrigger>
                </TabsList>
                
                <TabsContent value="admin-staff">
                  <SystemAdminManager />
                </TabsContent>
                
                <TabsContent value="landlord-staff">
                  <AccountRoleManager />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="portfolio-access" className="space-y-4">
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  Manage portfolio-specific access. Grant users permissions to specific properties 
                  within a landlord's account.
                </AlertDescription>
              </Alert>
              <PortfolioAccessManager />
            </TabsContent>

            <TabsContent value="role-permissions" className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Configure permissions for each role type. Define what actions users with specific 
                  roles can perform across the platform.
                </AlertDescription>
              </Alert>
              
              <Tabs defaultValue="account" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="account">Account Permissions</TabsTrigger>
                  <TabsTrigger value="portfolio">Portfolio Permissions</TabsTrigger>
                  <TabsTrigger value="admin">Admin Permissions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="account">
                  <AccountPermissionsManager 
                    currentUserId={user?.id || ''} 
                    isAccountOwner={true} 
                  />
                </TabsContent>
                
                <TabsContent value="portfolio">
                  <PortfolioPermissionsDrillDown />
                </TabsContent>

                <TabsContent value="admin">
                  <SystemAdminPermissionsManager />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="access-requests" className="space-y-4">
              <Alert>
                <FileCheck className="h-4 w-4" />
                <AlertDescription>
                  Review and manage temporary access requests from users. Approve or deny requests 
                  for elevated permissions with time-limited grants.
                </AlertDescription>
              </Alert>
              <AccessRequestsAdmin />
            </TabsContent>

            <TabsContent value="admin-tools" className="space-y-4">
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  Advanced administrative tools for managing global roles, viewing audit logs, 
                  and simulating user permissions across the platform.
                </AlertDescription>
              </Alert>
              
              <Tabs defaultValue="global-roles" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="global-roles">Global Management</TabsTrigger>
                  <TabsTrigger value="audit">Audit Logs</TabsTrigger>
                  <TabsTrigger value="simulation">Simulation Tools</TabsTrigger>
                </TabsList>
                
                <TabsContent value="global-roles">
                  <GlobalRoleManagement compact={true} />
                </TabsContent>
                
                <TabsContent value="audit">
                  <PortfolioAuditLogs />
                </TabsContent>
                
                <TabsContent value="simulation">
                  <PortfolioSimulationTools />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedAccessPermissions;
