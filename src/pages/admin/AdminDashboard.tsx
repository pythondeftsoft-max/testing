import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Home, 
  Settings, 
  BarChart3, 
  Shield, 
  Database,
  UserCheck,
  DollarSign,
  Building,
  CreditCard,
  FileText,
  UserPlus,
  MapPin,
  Star,
  RefreshCw
} from 'lucide-react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import RequestTenantPropertiesTable from '@/components/admin/RequestTenantPropertiesTable';
import PlacementFeesTable from '@/components/admin/PlacementFeesTable';
import SmartMatches from '@/components/admin/SmartMatches';
import { AdminBilling } from '@/components/admin/AdminBilling';
import { UnmatchedTransactionsPanel } from '@/components/admin/UnmatchedTransactionsPanel';
import { supabase } from '@/integrations/supabase/client';
import { BlogControlCenter } from '@/components/admin/BlogControlCenter';
import GlobalRoleManagement from '@/components/admin/GlobalRoleManagement';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { AccountRoleManager } from '@/components/account/AccountRoleManager';
import { AutoAssignmentMonitor } from '@/components/admin/matchmaker/AutoAssignmentMonitor';
import { AdminPaymentMethods } from '@/components/admin/AdminPaymentMethods';
import { GrowthHub } from '@/components/admin/growth/GrowthHub';

const AdminDashboard = () => {
  const { data: isAdmin, isLoading } = useAdminCheck();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'match-maker');
  const [activeMatchMakerSubTab, setActiveMatchMakerSubTab] = useState('housed-tenants');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-destructive">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-blue-gold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, properties, and system settings
          </p>
        </div>
        <Badge variant="outline" className="bg-gradient-blue-gold text-white border-0">
          Administrator
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-10 bg-card h-12">
          <TabsTrigger 
            value="match-maker" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Match Maker
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="system-health" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <Database className="h-4 w-4 mr-2" />
            System Health
          </TabsTrigger>
          <TabsTrigger 
            value="permissions" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
          <TabsTrigger 
            value="access-requests" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Access Requests
          </TabsTrigger>
          <TabsTrigger 
            value="billing" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger 
            value="blog" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Blog
          </TabsTrigger>
          <TabsTrigger 
            value="territories-teams" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Territories
          </TabsTrigger>
          <TabsTrigger 
            value="important" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <Star className="h-4 w-4 mr-2" />
            Important
          </TabsTrigger>
          <TabsTrigger 
            value="growth" 
            className="data-[state=active]:bg-gradient-blue-gold data-[state=active]:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Growth
          </TabsTrigger>
        </TabsList>

        {/* Match Maker Tab */}
        <TabsContent value="match-maker">
          <Card className="border-openkey-blue/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
                <Users className="h-5 w-5" />
                Match Maker Hub
              </CardTitle>
              <CardDescription>
                Manage tenant-property matching, housing requests, and placement fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeMatchMakerSubTab} onValueChange={setActiveMatchMakerSubTab}>
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="housed-tenants">
                    <Home className="h-4 w-4 mr-2" />
                    Housed Tenants
                  </TabsTrigger>
                  <TabsTrigger value="seeking-housing">
                    <Users className="h-4 w-4 mr-2" />
                    Seeking Housing
                  </TabsTrigger>
                  <TabsTrigger value="property-requests">
                    <Building className="h-4 w-4 mr-2" />
                    Property Requests
                  </TabsTrigger>
                  <TabsTrigger value="placement-fees">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Placement Fees
                  </TabsTrigger>
                  <TabsTrigger value="smart-matches">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Smart Matches
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="housed-tenants">
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Housed Tenants management will be implemented here</p>
                  </div>
                </TabsContent>

                <TabsContent value="seeking-housing">
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Seeking Housing management will be implemented here</p>
                  </div>
                </TabsContent>

                <TabsContent value="property-requests">
                  <RequestTenantPropertiesTable />
                </TabsContent>

                <TabsContent value="placement-fees">
                  <PermissionGuard
                    object="billing"
                    action="view"
                    scope="account"
                    fallback={
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Contact account owner for financial reports</p>
                      </div>
                    }
                  >
                    <div className="space-y-6">
                      {userId && <UnmatchedTransactionsPanel landlordId={userId} />}
                      <PlacementFeesTable />
                    </div>
                  </PermissionGuard>
                </TabsContent>

                <TabsContent value="smart-matches">
                  <SmartMatches />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card className="border-openkey-blue/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
                <BarChart3 className="h-5 w-5" />
                Analytics Hub
              </CardTitle>
              <CardDescription>
                View system analytics and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system-health">
          <Card className="border-openkey-blue/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
                <Database className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>
                Monitor system performance and health metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>System health monitoring will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Tabs defaultValue="account-roles" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account-roles">
                <UserPlus className="w-4 h-4 mr-2" />
                Account Access
              </TabsTrigger>
              <TabsTrigger value="global-management">
                <Shield className="w-4 h-4 mr-2" />
                Global Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account-roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Invite & Manage Staff</CardTitle>
                  <CardDescription>
                    Invite new match-makers and manage their access to the admin portal.
                    Use "Admin Partner" role for match-making staff who should access properties and tenants but NOT financial data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AccountRoleManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="global-management">
              <GlobalRoleManagement compact={false} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Access Requests Tab */}
        <TabsContent value="access-requests">
          <Card className="border-openkey-blue/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
                <UserCheck className="h-5 w-5" />
                Access Requests
              </CardTitle>
              <CardDescription>
                Review and manage access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Access requests management will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <AdminBilling />
        </TabsContent>

        {/* Blog Tab */}
        <TabsContent value="blog">
          <BlogControlCenter />
        </TabsContent>

        {/* Territories & Teams Tab */}
        <TabsContent value="territories-teams">
          <div className="space-y-6">
            <Card className="border-openkey-blue/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
                  <MapPin className="h-5 w-5" />
                  Territories & Teams
                </CardTitle>
                <CardDescription>
                  Set up territories so tenants and properties are routed to the right team members based on region, state, or country.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search and Add Button Row */}
                <div className="flex items-center justify-between gap-4">
                  <Input 
                    placeholder="Search territories..." 
                    className="max-w-md"
                  />
                  <Button variant="blue">
                    Add Territory
                  </Button>
                </div>
                
                {/* Empty State */}
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No territories have been created yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    Territories determine which team member handles tenants and properties based on region, state, or country. Add your first territory to begin assigning leads automatically.
                  </p>
                  <Button variant="outline" className="mt-4">
                    Add Your First Territory
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Assignment Monitor */}
            <AutoAssignmentMonitor />
          </div>
        </TabsContent>

        {/* Important Tab */}
        <TabsContent value="important">
          <Card className="border-openkey-blue/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
                <Star className="h-5 w-5" />
                Important Settings
              </CardTitle>
              <CardDescription>
                Critical platform configuration and payment settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="payment-methods" className="space-y-4">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="payment-methods">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Admin Payment Methods
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="payment-methods">
                  <AdminPaymentMethods />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Growth Tab */}
        <TabsContent value="growth">
          <Card className="border-openkey-blue/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
                <RefreshCw className="h-5 w-5" />
                Tenant Growth Hub
              </CardTitle>
              <CardDescription>
                Revive dormant accounts and import leads from external sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GrowthHub />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
