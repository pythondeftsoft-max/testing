import React, { useState } from 'react';
import { usePaymentAnalytics } from '@/hooks/usePaymentAnalytics';
import { CategorySection } from './CategorySection';
import { TenantPaymentPerformance } from './payment/TenantPaymentPerformance';
import { HAPPaymentTracking } from './payment/HAPPaymentTracking';
import { RevenueSourcesBreakdown } from './payment/RevenueSourcesBreakdown';
import { CollectionEfficiency } from './payment/CollectionEfficiency';
import { TrendingUp, FileDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PaymentAnalyticsHubProps {
  landlordId: string;
  portfolioId?: string;
}

export const PaymentAnalyticsHub: React.FC<PaymentAnalyticsHubProps> = ({
  landlordId,
  portfolioId
}) => {
  const { data: paymentData, loading, error } = usePaymentAnalytics(landlordId, portfolioId);
  const [dateRange, setDateRange] = useState('30d');

  const handleExport = () => {
    // Export functionality can be implemented here
    console.log('Exporting payment analytics data...');
  };

  const getSectionBadge = () => {
    if (!paymentData) return null;
    
    const collectionRate = paymentData.overallCollectionRate;
    if (collectionRate >= 95) return { text: 'Excellent', variant: 'default' as const };
    if (collectionRate >= 85) return { text: 'Good', variant: 'secondary' as const };
    if (collectionRate >= 75) return { text: 'Needs Attention', variant: 'outline' as const };
    return { text: 'Critical', variant: 'destructive' as const };
  };

  const badge = getSectionBadge();

  const headerActions = (
    <div className="flex items-center gap-2">
      <select 
        value={dateRange} 
        onChange={(e) => setDateRange(e.target.value)}
        className="px-3 py-1 border border-openkey-blue/20 rounded-lg text-sm bg-white"
      >
        <option value="30d">Last 30 Days</option>
        <option value="90d">Last 90 Days</option>
        <option value="12m">Last 12 Months</option>
      </select>
      <Button variant="outline" size="sm" onClick={handleExport}>
        <FileDown className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
  );

  return (
    <CategorySection
      title="Forecast Center"
      description="AI-powered forecasting and predictive insights for revenue, occupancy, and financial performance"
      icon={TrendingUp}
      badge={badge}
      isLoading={loading}
      error={error}
      defaultExpanded={true}
      headerActions={headerActions}
      infoText="Get predictive insights and forecasts for revenue trends, occupancy rates, and financial performance across your portfolio"
    >
      <div className="space-y-6">
        {/* Tenant Payment Performance */}
        <TenantPaymentPerformance 
          data={paymentData} 
          loading={loading} 
          dateRange={dateRange}
        />
        
        {/* HAP Payment Tracking */}
        <HAPPaymentTracking 
          data={paymentData} 
          loading={loading} 
          dateRange={dateRange}
        />
        
        {/* Revenue Sources Breakdown */}
        <RevenueSourcesBreakdown 
          data={paymentData} 
          loading={loading} 
          dateRange={dateRange}
        />
        
        {/* Collection Efficiency */}
        <CollectionEfficiency 
          data={paymentData} 
          loading={loading} 
          dateRange={dateRange}
        />
      </div>
    </CategorySection>
  );
};