import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { toast } from 'sonner';
import { LogOut, Users, Home, DollarSign, TrendingUp, Activity, Mail, Settings, BarChart3, UserCheck, Building2, Search, Zap, FileText, Clock, CreditCard, Trophy, Briefcase, MapPin, Trash2, ClipboardList, Wrench, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddTerritoryDialog } from './AddTerritoryDialog';
import { TerritoriesAndTeamsTab } from './TerritoriesAndTeamsTab';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import { useSessionHeartbeat } from '@/hooks/useSessionHeartbeat';
import { useAccessRequests } from '@/hooks/useAccessRequests';
import { Loader2 } from 'lucide-react';

// ── Eager (lightweight) imports kept for overview / shell ──
import AdminStatsOverview from '@/components/admin/AdminStatsOverview';

// ── Lazy-loaded heavy tab panes ──
const TabFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const HousedTenantsTable = React.lazy(() => import('@/components/admin/HousedTenantsTable'));
const AdminEmailHub = React.lazy(() => import('@/components/admin/AdminEmailHub'));
const AdminMessages = React.lazy(() => import('@/components/admin/AdminMessages'));
const UnhousedTenantsTable = React.lazy(() => import('@/components/admin/UnhousedTenantsTable'));
const RequestTenantPropertiesTable = React.lazy(() => import('@/components/admin/RequestTenantPropertiesTable'));
const DirectorySection = React.lazy(() => import('@/components/admin/DirectorySection'));
const UserActivityTab = React.lazy(() => import('@/components/admin/UserActivityTab'));
const EnhancedAnalyticsDashboard = React.lazy(() => import('@/components/analytics/EnhancedAnalyticsDashboard'));
const AdminAnalyticsDashboard = React.lazy(() => import('@/components/analytics/AdminAnalyticsDashboard'));
const PropertyManagementHub = React.lazy(() => import('@/components/admin/PropertyManagementHub'));
const EnterpriseSecurityTab = React.lazy(() => import('@/components/admin/EnterpriseSecurityTab'));
const PointsReferralsTab = React.lazy(() => import('@/components/admin/PointsReferralsTab'));
const PropertiesForSaleTable = React.lazy(() => import('@/components/admin/PropertiesForSaleTable'));
const PlacementFeesTable = React.lazy(() => import('@/components/admin/PlacementFeesTable'));
const NewAcquisitionsTable = React.lazy(() => import('@/components/admin/NewAcquisitionsTable'));
const PlacementFeesMetrics = React.lazy(() => import('@/components/admin/PlacementFeesMetrics'));
const ImplementationCenterPage = React.lazy(() => import('@/pages/admin/ImplementationCenterPage'));
const SystemMap = React.lazy(() => import('@/pages/admin/SystemMap'));

// Lazy named-export wrappers
const ComprehensiveAdminAnalytics = React.lazy(() =>
  import('@/components/admin/ComprehensiveAdminAnalytics').then(m => ({ default: m.ComprehensiveAdminAnalytics }))
);
const SecurityOverviewCard = React.lazy(() =>
  import('@/components/enterprise/SecurityOverviewCard').then(m => ({ default: m.SecurityOverviewCard }))
);
const AdminBilling = React.lazy(() =>
  import('@/components/admin/AdminBilling').then(m => ({ default: m.AdminBilling }))
);
const AdminMatchmakerStats = React.lazy(() =>
  import('@/components/admin/AdminMatchmakerStats').then(m => ({ default: m.AdminMatchmakerStats }))
);
const BlogControlCenter = React.lazy(() =>
  import('@/components/admin/BlogControlCenter').then(m => ({ default: m.BlogControlCenter }))
);
const WhiteLabelAdminDashboard = React.lazy(() =>
  import('@/components/admin/WhiteLabelAdminDashboard').then(m => ({ default: m.WhiteLabelAdminDashboard }))
);
const UnifiedAccessPermissions = React.lazy(() =>
  import('@/components/admin/UnifiedAccessPermissions').then(m => ({ default: m.default }))
);
const AdminCommunicationsHub = React.lazy(() =>
  import('@/components/admin/AdminCommunicationsHub').then(m => ({ default: m.AdminCommunicationsHub }))
);
const QuickMatchStudio = React.lazy(() =>
  import('@/components/admin/matchmaker/QuickMatchStudio').then(m => ({ default: m.QuickMatchStudio }))
);
const MatchCommandCenter = React.lazy(() =>
  import('@/components/admin/matchmaker/MatchCommandCenter').then(m => ({ default: m.MatchCommandCenter }))
);
const ActiveApplicationsTable = React.lazy(() =>
  import('@/components/admin/matchmaker/ActiveApplicationsTable').then(m => ({ default: m.ActiveApplicationsTable }))
);
const MarketplaceAuditTable = React.lazy(() =>
  import('@/components/admin/matchmaker/MarketplaceAuditTable').then(m => ({ default: m.MarketplaceAuditTable }))
);
const PropertyFinderTab = React.lazy(() =>
  import('@/components/admin/matchmaker/PropertyFinderTab').then(m => ({ default: m.PropertyFinderTab }))
);
const UnassignedEntitiesQueue = React.lazy(() =>
  import('@/components/admin/matchmaker/UnassignedEntitiesQueue').then(m => ({ default: m.UnassignedEntitiesQueue }))
);
const EntityPipelineView = React.lazy(() =>
  import('@/components/admin/matchmaker/EntityPipelineView').then(m => ({ default: m.EntityPipelineView }))
);
const InnovationInbox = React.lazy(() =>
  import('@/components/innovation/InnovationInbox').then(m => ({ default: m.InnovationInbox }))
);
const AnalyticsHub = React.lazy(() =>
  import('@/components/admin/matchmaker/AnalyticsHub').then(m => ({ default: m.AnalyticsHub }))
);
const ComplexImportFlow = React.lazy(() =>
  import('@/components/property-import/ComplexImportFlow').then(m => ({ default: m.ComplexImportFlow }))
);
const AllMatchesTable = React.lazy(() =>
  import('@/components/admin/matchmaker/AllMatchesTable').then(m => ({ default: m.AllMatchesTable }))
);
const ClientServicesTab = React.lazy(() =>
  import('@/components/admin/ClientServicesTab').then(m => ({ default: m.ClientServicesTab }))
);
const AdminLeaseRenewalsView = React.lazy(() =>
  import('@/components/admin/AdminLeaseRenewalsView').then(m => ({ default: m.AdminLeaseRenewalsView }))
);
const AdminNotificationCenter = React.lazy(() =>
  import('@/components/admin/notifications/AdminNotificationCenter').then(m => ({ default: m.AdminNotificationCenter }))
);
const AdminSubscriptionPlans = React.lazy(() =>
  import('@/components/admin/AdminSubscriptionPlans').then(m => ({ default: m.AdminSubscriptionPlans }))
);
const RentTrackingDashboard = React.lazy(() =>
  import('@/components/admin/RentTrackingDashboard').then(m => ({ default: m.RentTrackingDashboard }))
);
const WorkerPerformanceHub = React.lazy(() =>
  import('@/components/admin/analytics/WorkerPerformanceHub').then(m => ({ default: m.WorkerPerformanceHub }))
);
const FormulasReferenceTab = React.lazy(() =>
  import('@/components/admin/analytics/FormulasReferenceTab').then(m => ({ default: m.FormulasReferenceTab }))
);
const TimeClocked = React.lazy(() =>
  import('@/components/admin/timetracking/TimeClocked')
);
const DeletedPropertiesTable = React.lazy(() =>
  import('@/components/admin/DeletedPropertiesTable').then(m => ({ default: m.DeletedPropertiesTable }))
);
const HousingContractsLogTable = React.lazy(() =>
  import('@/components/admin/HousingContractsLogTable').then(m => ({ default: m.HousingContractsLogTable }))
);
const SubscriptionPaymentsLog = React.lazy(() =>
  import('@/components/admin/SubscriptionPaymentsLog').then(m => ({ default: m.SubscriptionPaymentsLog }))
);
const BillingInvoicesLog = React.lazy(() =>
  import('@/components/admin/BillingInvoicesLog').then(m => ({ default: m.BillingInvoicesLog }))
);
const RentTrackingLog = React.lazy(() =>
  import('@/components/admin/RentTrackingLog').then(m => ({ default: m.RentTrackingLog }))
);
const HouseHunterFeesLog = React.lazy(() =>
  import('@/components/admin/HouseHunterFeesLog').then(m => ({ default: m.HouseHunterFeesLog }))
);
const OpenKeyPayoutsLog = React.lazy(() =>
  import('@/components/admin/OpenKeyPayoutsLog').then(m => ({ default: m.OpenKeyPayoutsLog }))
);
const AdminPaymentMethods = React.lazy(() =>
  import('@/components/admin/AdminPaymentMethods').then(m => ({ default: m.AdminPaymentMethods }))
);
const AdminIntegrations = React.lazy(() =>
  import('@/components/admin/AdminIntegrations').then(m => ({ default: m.AdminIntegrations }))
);
const SalesPipeline = React.lazy(() =>
  import('@/components/admin/sales/SalesPipeline').then(m => ({ default: m.SalesPipeline }))
);
const CostEstimator = React.lazy(() => import('@/pages/admin/CostEstimator'));
const SupportTickets = React.lazy(() => import('@/pages/admin/SupportTickets'));
const AdminMaintenanceHub = React.lazy(() =>
  import('@/components/admin/AdminMaintenanceHub').then(m => ({ default: m.AdminMaintenanceHub }))
);
const AdminAppointmentsLog = React.lazy(() =>
  import('@/components/admin/AdminAppointmentsLog').then(m => ({ default: m.AdminAppointmentsLog }))
);
const PitchDeckTab = React.lazy(() =>
  import('@/components/admin/pitch-deck/PitchDeckTab').then(m => ({ default: m.PitchDeckTab }))
);
const WorkflowFiguresTab = React.lazy(() =>
  import('@/components/admin/pitch-deck/WorkflowFiguresTab').then(m => ({ default: m.WorkflowFiguresTab }))
);
const AgentApiHub = React.lazy(() =>
  import('@/components/admin/api/AgentApiHub').then(m => ({ default: m.AgentApiHub }))
);
const WorkerMessagingPanel = React.lazy(() =>
  import('@/components/admin/WorkerMessagingPanel').then(m => ({ default: m.WorkerMessagingPanel }))
);
const AgentCommandCenter = React.lazy(() =>
  import('@/components/admin/agents/AgentCommandCenter').then(m => ({ default: m.AgentCommandCenter }))
);
const AgencyManagement = React.lazy(() =>
  import('@/components/admin/AgencyManagement')
);
const AgencySalesShell = React.lazy(() =>
  import('@/components/admin/agency-sales/AgencySalesShell')
);
const AgencyMap = React.lazy(() =>
  import('@/components/admin/AgencyMap')
);
const CompetitiveAnalysis = React.lazy(() =>
  import('@/components/agency/admin/CompetitiveAnalysis')
);
const AdminAnalyticsExpansion = React.lazy(() =>
  import('@/components/admin/AdminAnalyticsExpansion')
);
const AgencyBillingOverview = React.lazy(() =>
  import('@/components/admin/AgencyBillingOverview').then(m => ({ default: m.AgencyBillingOverview }))
);

interface AdminDashboardProps {
  user?: any;
  profile?: any;
}

const AdminDashboard = ({ user: propUser, profile: propProfile }: AdminDashboardProps) => {
  const { user: authUser, loading: authLoading } = useAuth();
  const user = propUser || authUser;
  const [profile, setProfile] = useState<any>(propProfile || null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [isAddTerritoryOpen, setIsAddTerritoryOpen] = useState(false);
  const [activeHouseHunterSubTab, setActiveHouseHunterSubTab] = useState(
    searchParams.get('subtab') || 'entity-pipeline'
  );
  const [activePropertyMgmtSubTab, setActivePropertyMgmtSubTab] = useState('overview');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string | undefined>(undefined);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const { logAdminAccess } = useAdminAudit();
  const { data: accessRequests } = useAccessRequests();
  
  const pendingAccessRequests = accessRequests?.filter(req => req.status === 'pending').length || 0;
  
  useSessionHeartbeat({ interval: 10 * 60 * 1000 });
  
  // Only fetch profile if not passed as prop
  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
      return;
    }
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, [user?.id, propProfile]);
  
  useEffect(() => {
    const subtab = searchParams.get('subtab');
    if (subtab && activeTab === 'house-hunter') {
      setActiveHouseHunterSubTab(subtab);
    }
  }, [searchParams, activeTab]);
  
  useEffect(() => {
    logAdminAccess('admin_dashboard', 'admin_overview', 'view', {
      dashboard_section: 'main', user_role: 'admin'
    });
  }, []);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const subFromUrl = searchParams.get('sub');
    // Backwards-compat: old "Prospecting" sub-tab moved to Agency Sales
    if (tabFromUrl === 'agency-management' && subFromUrl === 'prospecting') {
      const params = new URLSearchParams(searchParams);
      params.set('tab', 'agency-sales');
      params.set('sub', 'prospects');
      setSearchParams(params, { replace: true });
      return;
    }
    if (tabFromUrl && tabFromUrl !== activeTab) setActiveTab(tabFromUrl);
  }, [searchParams, activeTab, setSearchParams]);


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handlePushProperties = (tenantId: string) => {
    setActiveTab('house-hunter');
    setActiveHouseHunterSubTab('quick-match');
    setSearchParams({ tab: 'house-hunter', tenantId });
    toast.info('Loading property matches...', { description: 'Finding best properties for this tenant' });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-50">
        <AdminSidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          pendingAccessRequests={pendingAccessRequests}
        />
        
        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-40 h-16">
            <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  OpenKey
                </button>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <Settings className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-xs text-gray-500">Platform Administrator</p>
                </div>
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-2">Manage your platform, users, and monitor activity</p>
              </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Overview & Analytics
                </CardTitle>
                <p className="text-sm text-gray-600">Platform statistics and performance analytics</p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<TabFallback />}>
                  <ComprehensiveAdminAnalytics />
                </Suspense>
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === 'house-hunter' && (
            <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  House Hunter Management
                </CardTitle>
                <p className="text-sm text-gray-600">Manage tenants and housing requests</p>
              </CardHeader>
              <CardContent>
                <Tabs value={activeHouseHunterSubTab} onValueChange={setActiveHouseHunterSubTab}>
                  <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 gap-1">
                     <TabsTrigger value="unassigned" className="flex items-center gap-1"><Clock className="w-4 h-4" />Queue</TabsTrigger>
                     <TabsTrigger value="entity-pipeline" className="flex items-center gap-1"><TrendingUp className="w-4 h-4" />Pipeline</TabsTrigger>
                     <TabsTrigger value="quick-match" className="flex items-center gap-1"><Zap className="w-4 h-4" />Match</TabsTrigger>
                     <TabsTrigger value="finder" className="flex items-center gap-1"><MapPin className="w-4 h-4" />Finder</TabsTrigger>
                     <TabsTrigger value="active-applications" className="flex items-center gap-1"><FileText className="w-4 h-4" />Apps</TabsTrigger>
                     <TabsTrigger value="market-listings" className="flex items-center gap-1"><Building2 className="w-4 h-4" />Listings</TabsTrigger>
                     <TabsTrigger value="complex-import" className="flex items-center gap-1"><Building2 className="w-4 h-4" />Import</TabsTrigger>
                     <TabsTrigger value="marketplace-audit" className="flex items-center gap-1"><ClipboardList className="w-4 h-4" />Audit</TabsTrigger>
                     <TabsTrigger value="analytics" className="flex items-center gap-1"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
                   </TabsList>
                  
                  <Suspense fallback={<TabFallback />}>
                    <TabsContent value="unassigned" className="mt-6"><UnassignedEntitiesQueue /></TabsContent>
                    <TabsContent value="entity-pipeline" className="mt-6"><EntityPipelineView /></TabsContent>
                    <TabsContent value="quick-match" className="mt-6"><MatchCommandCenter /></TabsContent>
                    <TabsContent value="finder" className="mt-6"><PropertyFinderTab /></TabsContent>
                    <TabsContent value="active-applications" className="mt-6">
                      <ActiveApplicationsTable statusFilter={applicationStatusFilter} onClearFilter={() => setApplicationStatusFilter(undefined)} />
                    </TabsContent>
                    <TabsContent value="marketplace-audit" className="mt-6"><MarketplaceAuditTable /></TabsContent>
                    <TabsContent value="market-listings" className="mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-md font-medium">Market Listings</h4>
                          <p className="text-sm text-muted-foreground">Properties actively seeking tenants</p>
                        </div>
                        <RequestTenantPropertiesTable />
                      </div>
                    </TabsContent>
                    <TabsContent value="complex-import" className="mt-6"><ComplexImportFlow /></TabsContent>
                    <TabsContent value="analytics" className="mt-6"><AnalyticsHub /></TabsContent>
                  </Suspense>
                </Tabs>
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Platform Activity Feed</CardTitle>
                <p className="text-sm text-gray-600">Monitor all user activity and platform events in real-time</p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<TabFallback />}><UserActivityTab /></Suspense>
              </CardContent>
            </Card>
          )}

          {activeTab === 'worker-performance' && (
            <Suspense fallback={<TabFallback />}><WorkerPerformanceHub /></Suspense>
          )}

          {activeTab === 'communications' && (
            <Suspense fallback={<TabFallback />}><AdminEmailHub /></Suspense>
          )}

          {activeTab === 'messages' && (
            <Suspense fallback={<TabFallback />}><AdminMessages /></Suspense>
          )}

          {activeTab === 'admin-messaging' && (
            <Suspense fallback={<TabFallback />}><AdminCommunicationsHub /></Suspense>
          )}

          {activeTab === 'worker-messaging' && (
            <Suspense fallback={<TabFallback />}><WorkerMessagingPanel /></Suspense>
          )}

          {activeTab === 'property-management' && (
            <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Property Management</CardTitle>
                <p className="text-sm text-gray-600">Manage properties, sales requests, and property-related activities</p>
              </CardHeader>
              <CardContent>
                <Tabs value={activePropertyMgmtSubTab} onValueChange={setActivePropertyMgmtSubTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview" className="flex items-center gap-2"><Building2 className="w-4 h-4" />Property Overview</TabsTrigger>
                    <TabsTrigger value="for-sale" className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Properties for Sale</TabsTrigger>
                    <TabsTrigger value="deleted" className="flex items-center gap-2"><Trash2 className="w-4 h-4" />Deleted Properties</TabsTrigger>
                  </TabsList>
                  <Suspense fallback={<TabFallback />}>
                    <TabsContent value="overview" className="mt-6"><PropertyManagementHub /></TabsContent>
                    <TabsContent value="for-sale" className="mt-6"><PropertiesForSaleTable /></TabsContent>
                    <TabsContent value="deleted" className="mt-6"><DeletedPropertiesTable /></TabsContent>
                  </Suspense>
                </Tabs>
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === 'client-services' && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Client Services Management</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Manage properties for external clients without OpenKey accounts</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Building2 className="w-4 h-4" />
                        Import Building
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Import Building for Client</DialogTitle>
                        <DialogDescription>Scrape and import an apartment complex for a client portfolio.</DialogDescription>
                      </DialogHeader>
                      <Suspense fallback={<TabFallback />}>
                        <ComplexImportFlow onImportComplete={() => setClientRefreshKey(k => k + 1)} />
                      </Suspense>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<TabFallback />}><ClientServicesTab adminUserId={user.id} refreshKey={clientRefreshKey} /></Suspense>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5" />Maintenance Management</CardTitle>
                  <p className="text-sm text-gray-600">View all maintenance requests, appointments, and vendor payments across the platform</p>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="requests">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                      <TabsTrigger value="requests" className="flex items-center gap-1"><Wrench className="w-4 h-4" />Requests</TabsTrigger>
                      <TabsTrigger value="appointments" className="flex items-center gap-1"><Calendar className="w-4 h-4" />Appointments</TabsTrigger>
                    </TabsList>
                    <Suspense fallback={<TabFallback />}>
                      <TabsContent value="requests" className="mt-6"><AdminMaintenanceHub /></TabsContent>
                      <TabsContent value="appointments" className="mt-6"><AdminAppointmentsLog /></TabsContent>
                    </Suspense>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'lease-renewals' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Lease Renewals Management</CardTitle>
                  <p className="text-sm text-gray-600">Monitor and manage all lease renewals across the platform</p>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<TabFallback />}><AdminLeaseRenewalsView /></Suspense>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'territories-teams' && (
            <TerritoriesAndTeamsTab isAddTerritoryOpen={isAddTerritoryOpen} setIsAddTerritoryOpen={setIsAddTerritoryOpen} />
          )}

          <AddTerritoryDialog isOpen={isAddTerritoryOpen} onClose={() => setIsAddTerritoryOpen(false)} />

          {activeTab === 'directory' && (
            <Suspense fallback={<TabFallback />}><DirectorySection /></Suspense>
          )}

          {activeTab === 'access-permissions' && (
            <Suspense fallback={<TabFallback />}><UnifiedAccessPermissions /></Suspense>
          )}

          {activeTab === 'important' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Important Records & Audit Logs</CardTitle>
                  <p className="text-sm text-muted-foreground">Centralized logging for all contracts, billing, rent, fees, and payouts</p>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="contracts" className="w-full">
                     <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1">
                       <TabsTrigger value="contracts" className="flex items-center gap-1"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Housing Contracts</span><span className="sm:hidden">Contracts</span></TabsTrigger>
                       <TabsTrigger value="billing" className="flex items-center gap-1"><CreditCard className="w-4 h-4" /><span className="hidden sm:inline">Billing</span><span className="sm:hidden">Bill</span></TabsTrigger>
                       <TabsTrigger value="agency-billing" className="flex items-center gap-1"><Building2 className="w-4 h-4" /><span className="hidden sm:inline">Agency Billing</span><span className="sm:hidden">Agency</span></TabsTrigger>
                       <TabsTrigger value="rent-tracking" className="flex items-center gap-1"><Home className="w-4 h-4" /><span className="hidden sm:inline">Rent Tracking</span><span className="sm:hidden">Rent</span></TabsTrigger>
                       <TabsTrigger value="house-hunter-fees" className="flex items-center gap-1"><Users className="w-4 h-4" /><span className="hidden sm:inline">House Hunter Fees</span><span className="sm:hidden">Fees</span></TabsTrigger>
                       <TabsTrigger value="openkey-payouts" className="flex items-center gap-1"><DollarSign className="w-4 h-4" /><span className="hidden sm:inline">OpenKey Payouts</span><span className="sm:hidden">Payouts</span></TabsTrigger>
                       <TabsTrigger value="admin-payment-methods" className="flex items-center gap-1"><CreditCard className="w-4 h-4" /><span className="hidden sm:inline">Admin Payment Methods</span><span className="sm:hidden">Payment</span></TabsTrigger>
                       <TabsTrigger value="integrations" className="flex items-center gap-1"><Settings className="w-4 h-4" /><span className="hidden sm:inline">Integrations</span><span className="sm:hidden">Integrations</span></TabsTrigger>
                     </TabsList>
                    <Suspense fallback={<TabFallback />}>
                       <TabsContent value="contracts" className="mt-6"><HousingContractsLogTable /></TabsContent>
                       <TabsContent value="billing" className="mt-6"><AdminBilling /></TabsContent>
                       <TabsContent value="agency-billing" className="mt-6"><AgencyBillingOverview /></TabsContent>
                      <TabsContent value="rent-tracking" className="mt-6"><RentTrackingLog /></TabsContent>
                      <TabsContent value="house-hunter-fees" className="mt-6"><HouseHunterFeesLog /></TabsContent>
                      <TabsContent value="openkey-payouts" className="mt-6"><OpenKeyPayoutsLog /></TabsContent>
                      <TabsContent value="admin-payment-methods" className="mt-6"><AdminPaymentMethods /></TabsContent>
                      <TabsContent value="integrations" className="mt-6"><AdminIntegrations /></TabsContent>
                    </Suspense>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'enterprise-security' && (
            <Suspense fallback={<TabFallback />}><EnterpriseSecurityTab /></Suspense>
          )}

          {activeTab === 'billing' && (
            <Suspense fallback={<TabFallback />}><AdminBilling /></Suspense>
          )}

          {activeTab === 'white-label' && (
            <Suspense fallback={<TabFallback />}><WhiteLabelAdminDashboard /></Suspense>
          )}

          {activeTab === 'points-referrals' && (
            <Suspense fallback={<TabFallback />}><PointsReferralsTab /></Suspense>
          )}

          {activeTab === 'blog' && (
            <Suspense fallback={<TabFallback />}><BlogControlCenter /></Suspense>
          )}

          {activeTab === 'implementation-center' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><ImplementationCenterPage /></Suspense></div>
          )}

          {activeTab === 'notification-center' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><AdminNotificationCenter /></Suspense></div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><AdminSubscriptionPlans /></Suspense></div>
          )}

          {activeTab === 'rent-tracking' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><RentTrackingDashboard /></Suspense></div>
          )}

          {activeTab === 'formulas' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><FormulasReferenceTab /></Suspense></div>
          )}

          {activeTab === 'time-clocked' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><TimeClocked /></Suspense></div>
          )}

          {activeTab === 'pitch-deck' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><PitchDeckTab /></Suspense></div>
          )}

          {activeTab === 'workflow-figures' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><WorkflowFiguresTab /></Suspense></div>
          )}

          {activeTab === 'innovation-inbox' && (
            <Suspense fallback={<TabFallback />}><InnovationInbox /></Suspense>
          )}

          {activeTab === 'agent-command-center' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><AgentCommandCenter /></Suspense></div>
          )}

          {activeTab === 'agent-api' && (
            <div className="p-6"><Suspense fallback={<TabFallback />}><AgentApiHub /></Suspense></div>
          )}

          {activeTab === 'agency-management' && (
            <Suspense fallback={<TabFallback />}><AgencyManagement /></Suspense>
          )}

          {activeTab === 'agency-sales' && (
            <Suspense fallback={<TabFallback />}><AgencySalesShell /></Suspense>
          )}

          {activeTab === 'agency-map' && (
            <Suspense fallback={<TabFallback />}><AgencyMap /></Suspense>
          )}

          {activeTab === 'competitive-analysis' && (
            <Suspense fallback={<TabFallback />}><CompetitiveAnalysis /></Suspense>
          )}

          {activeTab === 'platform-analytics' && (
            <Suspense fallback={<TabFallback />}><AdminAnalyticsExpansion /></Suspense>
          )}

          {activeTab === 'system-map' && (
            <Suspense fallback={<TabFallback />}><SystemMap /></Suspense>
          )}

          {activeTab === 'sales-pipeline' && (
            <Suspense fallback={<TabFallback />}><SalesPipeline /></Suspense>
          )}

          {activeTab === 'cost-estimator' && (
            <Suspense fallback={<TabFallback />}><CostEstimator /></Suspense>
          )}

          {activeTab === 'support-tickets' && (
            <Suspense fallback={<TabFallback />}><SupportTickets /></Suspense>
          )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
