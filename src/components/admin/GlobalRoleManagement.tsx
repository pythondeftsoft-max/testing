
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, Building, Activity, Info } from 'lucide-react';
import GlobalAccountOverview from './GlobalAccountOverview';
import GlobalPortfolioOverview from './GlobalPortfolioOverview';
import RbacLogs from '@/pages/admin/RbacLogs';
import { useAdminCheck } from '@/hooks/useAdminCheck';

interface GlobalRoleManagementProps {
  compact?: boolean;
}

const GlobalRoleManagement: React.FC<GlobalRoleManagementProps> = ({ compact = false }) => {
  const { data: isAdmin, isLoading } = useAdminCheck();

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Checking permissions...</div>;
  }

  if (!isAdmin) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This section is only available to platform administrators.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {!compact && (
        <div>
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" />
            Global Role Management
          </h3>
          <p className="text-muted-foreground">
            Platform administrator controls for managing all user roles and permissions across accounts and portfolios.
          </p>
        </div>
      )}

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Platform Admin Access:</strong> You have full control over all user roles and permissions. 
          Changes made here affect users system-wide and are logged for audit purposes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className={compact ? "p-0" : ""}>
          <Tabs defaultValue="portfolios" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="portfolios" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Portfolio Roles
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="portfolios" className="space-y-4">
              <Alert>
                <Building className="h-4 w-4" />
                <AlertDescription>
                  View and manage portfolio-specific roles for all users across all portfolios. 
                  Portfolio roles control access to specific portfolio features and data.
                </AlertDescription>
              </Alert>
              <GlobalPortfolioOverview />
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  Complete audit trail of all role and permission changes made across the platform. 
                  Monitor access control events and track administrative actions.
                </AlertDescription>
              </Alert>
              <RbacLogs />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalRoleManagement;
