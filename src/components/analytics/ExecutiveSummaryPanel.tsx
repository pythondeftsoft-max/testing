import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { TrendingUp, DollarSign, Home, Users, AlertTriangle, Target } from 'lucide-react';
import ModernMetricCard from './ModernMetricCard';
import ModernGaugeChart from './charts/ModernGaugeChart';
import ModernDonutChart from './charts/ModernDonutChart';
import PortfolioHealthDashboard from './PortfolioHealthDashboard';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface ExecutiveSummaryData {
  portfolioHealth: number; // 0-100 score
  totalRevenue: number;
  totalUnits: number;
  portfolioUnits: number; // Added for the new dashboard
  occupancyRate: number;
  netOperatingIncome: number;
  maintenanceIssues: number;
  monthlyGoalProgress: number;
  revenueBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

interface ExecutiveSummaryPanelProps {
  data: ExecutiveSummaryData | null;
  loading: boolean;
}

const ExecutiveSummaryPanel = ({ data, loading }: ExecutiveSummaryPanelProps) => {
  // Mock sparkline data for demonstration
  const mockSparklineData = [
    { value: 85 }, { value: 87 }, { value: 89 }, { value: 86 }, { value: 92 }, { value: 90 }, { value: 94 }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <CardEnhanced variant="elevated" className="animate-pulse">
          <CardEnhancedHeader>
            <CardEnhancedTitle gradient className="flex items-center gap-2">
              <Target className="w-5 h-5 text-openkey-blue" />
              Executive Summary
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted/50 rounded"></div>
              ))}
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>
    );
  }

  if (!data) {
    return (
      <CardEnhanced variant="elevated">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Target className="w-5 h-5 text-openkey-blue" />
            Executive Summary
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-center py-8 text-muted-foreground">
            No executive summary data available
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive KPIs */}
      <CardEnhanced variant="elevated" className="card-hover-gold">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Target className="w-5 h-5 text-openkey-blue" />
            Executive Summary
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModernMetricCard
              title="Total Monthly Revenue"
              value={data.totalRevenue}
              icon={DollarSign}
              iconColor="text-success"
              formatValue="currency"
              subtitle="Gross rental income"
              sparklineData={mockSparklineData}
              trend={{ value: 8.2, isPositive: true, period: "last month" }}
              variant="gradient"
            />
            
            <ModernMetricCard
              title="Portfolio Units"
              value={data.totalUnits}
              icon={Home}
              iconColor="text-openkey-blue"
              subtitle={`${formatPercentage(data.occupancyRate)} occupied`}
              badge={{ 
                text: data.occupancyRate > 95 ? 'Excellent' : data.occupancyRate > 85 ? 'Good' : 'Needs Attention', 
                variant: data.occupancyRate > 95 ? 'success' : data.occupancyRate > 85 ? 'secondary' : 'warning' 
              }}
              variant="gradient"
            />
            
            <ModernMetricCard
              title="Net Operating Income"
              value={data.netOperatingIncome}
              icon={TrendingUp}
              iconColor="text-openkey-gold"
              formatValue="currency"
              subtitle="After expenses"
              trend={{ value: 12.5, isPositive: true, period: "YTD" }}
              variant="gradient"
            />
            
            <ModernMetricCard
              title="Active Issues"
              value={data.maintenanceIssues}
              icon={AlertTriangle}
              iconColor={data.maintenanceIssues > 10 ? "text-destructive" : data.maintenanceIssues > 5 ? "text-warning" : "text-success"}
              subtitle="Maintenance requests"
              badge={{ 
                text: data.maintenanceIssues === 0 ? 'All Clear' : data.maintenanceIssues > 10 ? 'High' : 'Normal', 
                variant: data.maintenanceIssues === 0 ? 'success' : data.maintenanceIssues > 10 ? 'destructive' : 'warning' 
              }}
              variant="gradient"
            />
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Portfolio Health & Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Health Score - Now using the new dashboard */}
        <div className="lg:col-span-2">
          <PortfolioHealthDashboard
            occupancyRate={data.occupancyRate}
            collectionRate={95} // Default high collection rate for demo - should be replaced with real data
            averageMaintenanceResolutionDays={data.maintenanceIssues > 0 ? 5 : 1}
            onTimePaymentRate={88} // Default rate for demo - should be replaced with real data
            openMaintenanceRequests={data.maintenanceIssues}
            totalUnits={data.portfolioUnits}
          />
        </div>

        {/* Revenue Breakdown */}
        <CardEnhanced variant="elevated" className="card-hover-gold">
          <CardEnhancedHeader>
            <CardEnhancedTitle>Revenue Sources</CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <ModernDonutChart
              data={data.revenueBreakdown}
              centerMetric={{
                value: formatCurrency(data.totalRevenue),
                label: "Total Revenue"
              }}
              height={200}
            />
          </CardEnhancedContent>
        </CardEnhanced>
      </div>

      {/* Monthly Goal Progress */}
      <CardEnhanced variant="elevated" className="card-hover-gold">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-openkey-blue" />
            Monthly Goal Progress
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Revenue Target</span>
              <span className="text-sm text-muted-foreground">
                {formatPercentage(data.monthlyGoalProgress)} achieved
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  data.monthlyGoalProgress >= 100 ? 'bg-success' :
                  data.monthlyGoalProgress >= 80 ? 'bg-openkey-blue' :
                  data.monthlyGoalProgress >= 60 ? 'bg-warning' : 'bg-destructive'
                }`}
                style={{ 
                  width: `${Math.min(data.monthlyGoalProgress, 100)}%`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {data.monthlyGoalProgress >= 100 ? 
                '🎉 Goal exceeded! Great work this month.' :
                data.monthlyGoalProgress >= 80 ?
                '📈 On track to meet monthly targets.' :
                '⚠️ Additional focus needed to reach monthly goals.'
              }
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default ExecutiveSummaryPanel;