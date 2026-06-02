import { useComprehensiveAdminMetrics } from '@/hooks/useComprehensiveAdminMetrics';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, LayoutDashboard, DollarSign, Building2, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KPISection } from './analytics/KPISection';
import { FinancialSection } from './analytics/FinancialSection';
import { PropertySection } from './analytics/PropertySection';
import { MaintenanceSection } from './analytics/MaintenanceSection';
import { EngagementSection } from './analytics/EngagementSection';
import { SubscriptionSection } from './analytics/SubscriptionSection';
import { RentCollectionHealthCard } from './analytics/RentCollectionHealthCard';
import { AdminMatchmakerStats } from './AdminMatchmakerStats';
import { SecurityOverviewCard } from '@/components/enterprise/SecurityOverviewCard';

export const ComprehensiveAdminAnalytics = () => {
  const { data: metrics, isLoading, error, refetch, isRefetching } = useComprehensiveAdminMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-6">
              <MetricSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Provide default empty metrics structure if data is unavailable
  const displayMetrics = metrics || {
    properties: { 
      total: 0, 
      by_status: {}, 
      by_type: {}, 
      average_rent: 0, 
      occupancy_rate: 0, 
      vacancy_cost: 0, 
      units_breakdown: {}
    },
    users: { 
      landlords: 0, 
      tenants: 0, 
      total: 0, 
      signups_this_month: 0, 
      signups_last_month: 0, 
      by_user_type: {} 
    },
    applications: { 
      total: 0,
      by_status: {},
      this_month: 0
    },
    maintenance: { 
      total: 0,
      by_status: {},
      by_priority: {},
      avg_completion_days: null
    },
    financial: { 
      total_collected: 0,
      total_pending: 0,
      total_late: 0,
      payment_count: 0,
      collection_rate: 0,
      on_time_rate: 0,
      late_payment_count: 0,
      avg_days_late: null
    },
    messages: { 
      total: 0,
      this_month: 0,
      by_sender_role: {}
    },
    portfolios: { 
      total: 0,
      total_assets: 0,
      avg_properties: null
    },
    referrals: { 
      total: 0,
      by_status: {},
      conversion_rate: 0
    },
    points: { 
      total_distributed: 0,
      active_users: 0,
      this_month: 0
    },
    matchmaker: { 
      total_interactions: 0,
      this_month: 0,
      by_action_type: {},
      successful_matches: 0
    },
    subscriptions: { 
      total: 0,
      active: 0,
      by_status: {},
      by_plan_type: {},
      by_role: {},
      total_units: 0,
      active_units: 0,
      autopay_enabled_count: 0,
      subscribed_users: 0
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Banner - Non-intrusive */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load some analytics data. Displaying available information.
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="ml-2"
              disabled={isRefetching}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Overview</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Financial</span>
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Properties</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <KPISection metrics={displayMetrics} />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="space-y-4">
            <RentCollectionHealthCard metrics={displayMetrics} />
            <FinancialSection metrics={displayMetrics} />
          </div>
          <SubscriptionSection metrics={displayMetrics} />
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          <PropertySection metrics={displayMetrics} />
          <MaintenanceSection metrics={displayMetrics} />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <EngagementSection metrics={displayMetrics} />
          <AdminMatchmakerStats />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <SecurityOverviewCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};
