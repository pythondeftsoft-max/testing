import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { BarChart3, PieChart, TrendingUp, MapPin, Calendar, Download } from 'lucide-react';
import { PortfolioOverview } from '@/hooks/useLandlordAnalytics';
import ModernAnalyticsCard from './ModernAnalyticsCard';
import PropertyPerformanceChart from './charts/PropertyPerformanceChart';
import FinancialWaterfallChart from './charts/FinancialWaterfallChart';
import PropertyHeatMap from './charts/PropertyHeatMap';

interface EnhancedPortfolioOverviewProps {
  data: PortfolioOverview | null;
  loading: boolean;
  landlordId: string;
  portfolioId?: string;
}

const EnhancedPortfolioOverview = ({ data, loading, landlordId, portfolioId }: EnhancedPortfolioOverviewProps) => {
  const [activeView, setActiveView] = useState<'overview' | 'performance' | 'financial' | 'geographic'>('overview');

  // Mock data for charts - in production, this would come from your analytics hooks
  const performanceData = [
    { month: 'Jan', revenue: 25000, expenses: 18000, profit: 7000, occupancyRate: 92 },
    { month: 'Feb', revenue: 26000, expenses: 17500, profit: 8500, occupancyRate: 95 },
    { month: 'Mar', revenue: 24000, expenses: 19000, profit: 5000, occupancyRate: 88 },
    { month: 'Apr', revenue: 27000, expenses: 18500, profit: 8500, occupancyRate: 96 },
    { month: 'May', revenue: 28000, expenses: 19500, profit: 8500, occupancyRate: 94 },
    { month: 'Jun', revenue: 29000, expenses: 20000, profit: 9000, occupancyRate: 98 }
  ];

  const mockProperties = [
    { id: '1', address: '123 Main St', monthlyRent: 2500, occupancyRate: 100, profitMargin: 65, maintenanceScore: 15, status: 'occupied' as const },
    { id: '2', address: '456 Oak Ave', monthlyRent: 2200, occupancyRate: 0, profitMargin: 0, maintenanceScore: 8, status: 'available' as const },
    { id: '3', address: '789 Pine Rd', monthlyRent: 2800, occupancyRate: 100, profitMargin: 45, maintenanceScore: 35, status: 'occupied' as const },
    { id: '4', address: '321 Elm St', monthlyRent: 2400, occupancyRate: 0, profitMargin: 0, maintenanceScore: 65, status: 'maintenance' as const }
  ];

  const expenses = {
    mortgage: data ? data.gross_rent * 0.4 : 0,
    insurance: data ? data.gross_rent * 0.08 : 0,
    maintenance: data ? data.gross_rent * 0.15 : 0,
    management: data ? data.gross_rent * 0.10 : 0,
    taxes: data ? data.gross_rent * 0.12 : 0,
    other: data ? data.gross_rent * 0.05 : 0
  };

  if (loading) {
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Enhanced Portfolio Analytics
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <ModernAnalyticsCard
                key={i}
                title=""
                value={0}
                icon={BarChart3}
                loading={true}
              />
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (!data) {
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Enhanced Portfolio Analytics
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>No portfolio data available</p>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
      <CardEnhancedHeader>
        <div className="flex items-center justify-between">
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Enhanced Portfolio Analytics
          </CardEnhancedTitle>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent>
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-subtle-blue">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2">
              <PieChart className="w-4 h-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="geographic" className="gap-2">
              <MapPin className="w-4 h-4" />
              Properties
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModernAnalyticsCard
                title="Total Properties"
                value={data.total_units}
                icon={BarChart3 as any}
                formatValue="number"
              />
              
              <ModernAnalyticsCard
                title="Occupancy Rate"
                value={100 - data.vacancy_rate}
                icon={TrendingUp as any}
                formatValue="percentage"
                subtitle={`${data.total_units - data.vacant_units} occupied`}
              />
              
              <ModernAnalyticsCard
                title="Monthly Revenue"
                value={data.gross_rent}
                icon={BarChart3 as any}
                formatValue="currency"
                subtitle={`${data.collection_rate.toFixed(1)}% collected`}
              />
              
              <ModernAnalyticsCard
                title="Net Cash Flow"
                value={data.net_operating_income}
                icon={TrendingUp as any}
                formatValue="currency"
                subtitle="Monthly NOI"
              />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PropertyPerformanceChart data={performanceData} height={400} />
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <FinancialWaterfallChart 
              grossRent={data.gross_rent}
              expenses={expenses}
              height={400}
            />
          </TabsContent>

          <TabsContent value="geographic" className="space-y-6">
            <PropertyHeatMap 
              properties={mockProperties}
              metric="profitMargin"
              onPropertyClick={(propertyId) => console.log('Property clicked:', propertyId)}
            />
          </TabsContent>
        </Tabs>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default EnhancedPortfolioOverview;