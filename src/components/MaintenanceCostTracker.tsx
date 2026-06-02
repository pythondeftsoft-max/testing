
import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Plus, TrendingUp, Receipt, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useMaintenanceCosts } from '@/hooks/useMaintenanceCosts';
import { formatCurrency } from '@/lib/formatters';
import CostOverviewDashboard from './CostOverviewDashboard';
import CostListTable from './CostListTable';
import CostAnalytics from './CostAnalytics';
import CreateCostDialog from './CreateCostDialog';
import { MetricDisplay } from '@/components/ui/metric-display';

interface MaintenanceCostTrackerProps {
  userId: string;
  portfolioId?: string;
}

const MaintenanceCostTracker = ({ userId, portfolioId }: MaintenanceCostTrackerProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { costs, isLoading, totalCosts } = useMaintenanceCosts();

  // Calculate metrics
  const approvedCosts = costs.filter(cost => cost.approved_at);
  const pendingCosts = costs.filter(cost => !cost.approved_at);
  const totalApprovedAmount = approvedCosts.reduce((sum, cost) => sum + cost.total_cost, 0);
  const totalPendingAmount = pendingCosts.reduce((sum, cost) => sum + cost.total_cost, 0);

  // Cost breakdown by type
  const costsByType = costs.reduce((acc, cost) => {
    acc[cost.cost_type] = (acc[cost.cost_type] || 0) + cost.total_cost;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" hover={false}>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Maintenance Cost Tracking
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
        <CardEnhancedHeader>
          <div className="flex items-center justify-between">
            <CardEnhancedTitle className="flex items-center gap-2" gradient>
              <DollarSign className="h-5 w-5 text-primary" />
              Maintenance Cost Tracking
            </CardEnhancedTitle>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              variant="blue"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Cost
            </Button>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          {/* Cost Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gradient-subtle-blue border border-primary/20 hover:scale-105 transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">Total Costs</p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalCosts)}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-subtle-gold border border-accent/20 hover:scale-105 transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle className="h-4 w-4 text-accent" />
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
              <p className="text-2xl font-bold text-accent">
                {formatCurrency(totalApprovedAmount)}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-subtle-blue border border-primary/20 hover:scale-105 transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalPendingAmount)}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-subtle-gold border border-accent/20 hover:scale-105 transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-1 mb-1">
                <Receipt className="h-4 w-4 text-accent" />
                <p className="text-sm text-muted-foreground">Total Entries</p>
              </div>
              <p className="text-2xl font-bold text-accent">
                {costs.length}
              </p>
            </div>
          </div>

          {/* Cost Breakdown by Type */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(costsByType).map(([type, amount]) => (
              <div 
                key={type} 
                className="text-center p-3 rounded-lg bg-muted border border-border hover:bg-primary/5 transition-all duration-200"
              >
                <div className="text-sm capitalize text-muted-foreground">{type.replace('_', ' ')}</div>
                <div className="text-lg font-semibold text-primary">{formatCurrency(amount)}</div>
              </div>
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
          >
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="costs" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
          >
            <Receipt className="h-4 w-4" />
            All Costs
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200"
          >
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <CostOverviewDashboard costs={costs} />
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <CostListTable costs={costs} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <CostAnalytics costs={costs} />
        </TabsContent>
      </Tabs>

      <CreateCostDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        portfolioId={portfolioId}
      />
    </div>
  );
};

export default MaintenanceCostTracker;
