
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Key, Banknote, TrendingUp, Clock, BarChart3, Users } from 'lucide-react';
import { PortfolioOverview } from '@/hooks/useLandlordAnalytics';
import PropertyBreakdownModal from './PropertyBreakdownModal';
import EnhancedMetricCard from '../EnhancedMetricCard';
import PortfolioReferralAnalytics from '@/components/portfolio/PortfolioReferralAnalytics';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { usePortfolioAssetSummary } from '@/hooks/usePortfolioAssets';
import { PortfolioAssetDashboard } from '@/components/portfolio/PortfolioAssetDashboard';

interface PortfolioOverviewPanelProps {
  data: PortfolioOverview | null;
  loading: boolean;
  landlordId: string;
  portfolioId?: string;
}

const PortfolioOverviewPanel = ({ data, loading, landlordId, portfolioId }: PortfolioOverviewPanelProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  
  // Fetch multi-asset summary if portfolioId is provided
  const { data: assetSummary, isLoading: assetSummaryLoading } = usePortfolioAssetSummary(
    portfolioId || ''
  );

  const handleCardClick = (title: string) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
        <CardEnhancedHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-openkey-blue" />
            <CardEnhancedTitle gradient>Portfolio Analytics</CardEnhancedTitle>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <CardEnhanced key={i} variant="subtle" className="animate-pulse">
                <CardEnhancedHeader className="pb-3">
                  <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                </CardEnhancedHeader>
                <CardEnhancedContent>
                  <div className="h-8 bg-muted/50 rounded w-1/2"></div>
                </CardEnhancedContent>
              </CardEnhanced>
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
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-openkey-blue" />
            <CardEnhancedTitle gradient>Portfolio Analytics</CardEnhancedTitle>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
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
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-openkey-blue" />
            <CardEnhancedTitle gradient>Portfolio Analytics</CardEnhancedTitle>
          </div>
          <div className="text-sm text-muted-foreground">Comprehensive portfolio insights</div>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-subtle-blue">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-openkey-blue data-[state=active]:text-white hover:scale-105 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Portfolio Overview
                <Badge variant="secondary" className="ml-1 text-xs">
                  {data?.total_units || 0}
                </Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="assets"
              className="data-[state=active]:bg-openkey-blue data-[state=active]:text-white hover:scale-105 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Asset Portfolio
                <Badge variant="secondary" className="ml-1 text-xs">
                  {assetSummary?.total_assets || 0}
                </Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="referrals"
              className="data-[state=active]:bg-openkey-blue data-[state=active]:text-white hover:scale-105 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Referral Analytics
                <Badge variant="secondary" className="ml-1 text-xs">
                  Active
                </Badge>
              </div>
            </TabsTrigger>
          </TabsList>
        
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Properties */}
              <EnhancedMetricCard
                title="Total Properties"
                value={data.total_units}
                icon={Building2}
                iconColor="bg-openkey-blue"
                subtitle="Total Units"
                onClick={() => handleCardClick('Total Properties')}
              />

              {/* Available Units */}
              <EnhancedMetricCard
                title="Available Units"
                value={data.available_units}
                icon={Key}
                iconColor="bg-success"
                percentage={data.availability_rate}
                percentageLabel="Available Rate"
                onClick={() => handleCardClick('Available Units')}
              />

              {/* Monthly Rent */}
              <EnhancedMetricCard
                title="Monthly Rent"
                value={data.gross_rent}
                icon={Banknote}
                iconColor="bg-openkey-gold"
                percentage={data.collection_rate}
                percentageLabel="Collection Rate"
                onClick={() => handleCardClick('Monthly Rent Collection')}
              />

              {/* Cash Flow / NOI */}
              <EnhancedMetricCard
                title="Cash Flow"
                value={data.net_operating_income}
                icon={TrendingUp}
                iconColor={data.net_operating_income >= 0 ? "bg-success" : "bg-destructive"}
                subtitle="Net Operating Income"
                isPositive={data.net_operating_income >= 0}
                showAsSuccess={true}
                onClick={() => handleCardClick('Cash Flow Analysis')}
              />
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            {portfolioId ? (
              <PortfolioAssetDashboard portfolioId={portfolioId} />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Asset portfolio management is available for individual portfolios
                </p>
              </div>
            )}
          </TabsContent>
        
          <TabsContent value="referrals" className="space-y-6">
            {portfolioId && (
              <PortfolioReferralAnalytics portfolioId={portfolioId} />
            )}
          </TabsContent>
        </Tabs>
      </CardEnhancedContent>

      <PropertyBreakdownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        landlordId={landlordId}
        portfolioId={portfolioId}
        title={modalTitle}
      />
    </CardEnhanced>
  );
};

export default PortfolioOverviewPanel;
