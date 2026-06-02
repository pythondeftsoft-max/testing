import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSubscriptionPlans, useCreatePlan, useUpdatePlan, useDeletePlan, useSyncPlanToStripe, SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { useSubscriptionPlanMetrics } from '@/hooks/useSubscriptionPlanMetrics';
import { PlanManagementCard } from './PlanManagementCard';
import { PlanEditorDialog } from './PlanEditorDialog';
import { AdminSubscriptionManagement } from './AdminSubscriptionManagement';
import FeatureMatrix from './FeatureMatrix';
import { DollarSign, Users, Plus, TrendingUp, TableProperties } from 'lucide-react';

export const AdminSubscriptionPlans = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: metricsData, isLoading: metricsLoading } = useSubscriptionPlanMetrics();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const syncToStripe = useSyncPlanToStripe();

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setIsEditorOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsEditorOpen(true);
  };

  const handleSavePlan = async (planData: any) => {
    if (editingPlan) {
      await updatePlan.mutateAsync(planData);
    } else {
      await createPlan.mutateAsync(planData);
    }
    setIsEditorOpen(false);
    setEditingPlan(null);
  };

  const handleDeletePlan = async (planId: string) => {
    await deletePlan.mutateAsync(planId);
  };

  const handleSyncPlan = async (planId: string) => {
    setSyncingPlanId(planId);
    await syncToStripe.mutateAsync(planId);
    setSyncingPlanId(null);
  };

  // If a plan is selected, show the subscriber list filtered by that plan
  if (selectedPlan) {
    return (
      <div>
        <Button
          variant="outline"
          onClick={() => setSelectedPlan(null)}
          className="mb-4"
        >
          ← Back to Plans Overview
        </Button>
        <AdminSubscriptionManagement filterPlanType={selectedPlan} />
      </div>
    );
  }

  if (plansLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const landlordPlans = plans?.filter(
    plan => plan.role === 'landlord' || plan.role === 'both'
  ) || [];
  
  const tenantPlans = plans?.filter(
    plan => plan.role === 'tenant' || plan.role === 'both'
  ) || [];

  // Calculate role-specific metrics
  const { metrics = [], totals } = metricsData || {};
  const tenantMetrics = metrics.filter(m => tenantPlans.some(p => p.id === m.planType));
  const landlordMetrics = metrics.filter(m => landlordPlans.some(p => p.id === m.planType));

  const tenantTotals = {
    subscribers: tenantMetrics.reduce((sum, m) => sum + m.activeSubscribers, 0),
    mrr: tenantMetrics.reduce((sum, m) => sum + m.monthlyRevenue, 0),
  };

  const landlordTotals = {
    subscribers: landlordMetrics.reduce((sum, m) => sum + m.activeSubscribers, 0),
    mrr: landlordMetrics.reduce((sum, m) => sum + m.monthlyRevenue, 0),
  };

  const renderPlansGrid = (plansList: SubscriptionPlan[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plansList.map((plan) => (
        <PlanManagementCard
          key={plan.id}
          plan={plan}
          onEdit={handleEditPlan}
          onDelete={handleDeletePlan}
          onSync={handleSyncPlan}
          isSyncing={syncingPlanId === plan.id}
        />
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription Plans Management</CardTitle>
            <CardDescription>
              Create, edit, and manage subscription plans with Stripe sync
            </CardDescription>
          </div>
          <Button onClick={handleCreatePlan}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals?.totalSubscribers || 0}</div>
              <p className="text-xs text-muted-foreground">Active subscriptions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(totals?.totalMRR || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">MRR</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(totals?.totalARR || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">ARR</p>
            </CardContent>
          </Card>
        </div>

        {/* Plans Tabs */}
        <Tabs defaultValue="landlord" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="landlord">
              Landlord Plans ({landlordPlans.length})
            </TabsTrigger>
            <TabsTrigger value="tenant">
              Tenant Plans ({tenantPlans.length})
            </TabsTrigger>
            <TabsTrigger value="matrix">
              <TableProperties className="h-4 w-4 mr-2" />
              Feature Matrix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="landlord" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Landlord Plans</h3>
                <p className="text-sm text-muted-foreground">
                  {landlordTotals.subscribers} subscribers · ${landlordTotals.mrr.toLocaleString()} MRR
                </p>
              </div>
            </div>
            {renderPlansGrid(landlordPlans)}
          </TabsContent>

          <TabsContent value="tenant" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">Tenant Plans</h3>
                <p className="text-sm text-muted-foreground">
                  {tenantTotals.subscribers} subscribers · ${tenantTotals.mrr.toLocaleString()} MRR
                </p>
              </div>
            </div>
            {renderPlansGrid(tenantPlans)}
          </TabsContent>

          <TabsContent value="matrix" className="mt-6">
            <FeatureMatrix />
          </TabsContent>
        </Tabs>
      </CardContent>

      <PlanEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        plan={editingPlan}
        onSave={handleSavePlan}
        isLoading={createPlan.isPending || updatePlan.isPending}
      />
    </Card>
  );
};
