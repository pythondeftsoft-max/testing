import React, { useState } from 'react';
import { 
  Building, Users, DollarSign, TrendingUp, RefreshCw, FileDown, Activity, 
  CreditCard, Calculator, Calendar, Clock, AlertTriangle, Wrench, AlertCircle, 
  Trophy, Gauge, Target, Percent, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import EnhancedMetricCard from '@/components/EnhancedMetricCard';
import { useEnhancedPortfolioAnalytics } from '@/hooks/useEnhancedPortfolioAnalytics';
import { usePaymentAnalytics } from '@/hooks/usePaymentAnalytics';
import PaymentAnalyticsPanel from './PaymentAnalyticsPanel';
import PortfolioHealthDashboard from './PortfolioHealthDashboard';
import { AnalyticsPermissionWrapper } from './AnalyticsPermissionWrapper';
import { useNavigate } from 'react-router-dom';
import RevenueBreakdownPro from './RevenueBreakdownPro';

interface EnhancedAnalyticsDashboardProps {
  landlordId: string;
  portfolioId?: string;
}

const EnhancedAnalyticsDashboard = ({ landlordId, portfolioId }: EnhancedAnalyticsDashboardProps) => {
  const { data: portfolioAnalytics, isLoading, error, refetch } = useEnhancedPortfolioAnalytics(landlordId, portfolioId);
  const { data: paymentData, loading: paymentLoading } = usePaymentAnalytics(landlordId, portfolioId);
  const navigate = useNavigate();

  if (error || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-openkey-blue mb-2">
            {error ? 'Unable to Load Analytics' : 'Loading Analytics...'}
          </h3>
          {error && (
            <Button onClick={() => refetch()} variant="outline" className="gap-2 border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-blue-gold text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Enhanced Portfolio Analytics</h1>
              <p className="text-white/90 text-lg">Unit-level insights and comprehensive performance metrics</p>
            </div>
            <Button onClick={() => refetch()} variant="outline" className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white bg-white/90">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <EnhancedMetricCard
            title="Total Units"
            value={portfolioAnalytics?.enhancedMetrics?.totalUnits?.toString() || "0"}
            icon={Building}
            iconColor="text-openkey-blue"
            subtitle={`${portfolioAnalytics?.enhancedMetrics?.occupiedUnits || 0} occupied`}
          />
          
          <EnhancedMetricCard
            title="Occupancy Rate"
            value={`${portfolioAnalytics?.enhancedMetrics?.occupancyRate?.toFixed(1) || "0"}%`}
            icon={Users}
            iconColor="text-openkey-blue"
            percentage={portfolioAnalytics?.enhancedMetrics?.occupancyRate}
            isPositive={portfolioAnalytics?.enhancedMetrics ? portfolioAnalytics.enhancedMetrics.occupancyRate > 90 : undefined}
          />
          
          <EnhancedMetricCard
            title="Gross Revenue"
            value={`$${portfolioAnalytics?.enhancedMetrics?.grossRevenue?.toLocaleString() || "0"}`}
            icon={DollarSign}
            iconColor="text-openkey-blue"
            subtitle="Monthly total"
          />
          
          <EnhancedMetricCard
            title="Collection Rate"
            value={`${portfolioAnalytics?.enhancedMetrics?.collectionRate?.toFixed(1) || "0"}%`}
            icon={CreditCard}
            iconColor="text-openkey-blue"
            percentage={portfolioAnalytics?.enhancedMetrics?.collectionRate}
            isPositive={portfolioAnalytics?.enhancedMetrics ? portfolioAnalytics.enhancedMetrics.collectionRate > 95 : undefined}
          />
          
          <EnhancedMetricCard
            title="Net Operating Income"
            value={`$${portfolioAnalytics?.enhancedMetrics?.netOperatingIncome?.toLocaleString() || "0"}`}
            icon={TrendingUp}
            iconColor="text-openkey-blue"
            percentage={portfolioAnalytics?.enhancedMetrics ? 
              ((portfolioAnalytics.enhancedMetrics.netOperatingIncome / (portfolioAnalytics.enhancedMetrics.grossRevenue || 1)) * 100) : undefined
            }
            isPositive={portfolioAnalytics?.enhancedMetrics ? portfolioAnalytics.enhancedMetrics.netOperatingIncome > 0 : undefined}
          />
          
          {/* Portfolio Health will be shown in its own section below */}
        </div>

        {/* Portfolio Health Dashboard */}
        <AnalyticsPermissionWrapper
          portfolioId={portfolioId || 'default'}
          analyticsType="dashboard"
        >
          <div className="mb-8">
            <PortfolioHealthDashboard
              occupancyRate={portfolioAnalytics?.enhancedMetrics?.occupancyRate || 0}
              collectionRate={portfolioAnalytics?.enhancedMetrics?.collectionRate || 0}
              averageMaintenanceResolutionDays={portfolioAnalytics?.maintenanceMetrics?.averageResolutionDays || 0}
              onTimePaymentRate={portfolioAnalytics?.paymentPerformance?.onTimePaymentRate || 90}
              openMaintenanceRequests={portfolioAnalytics?.maintenanceMetrics?.totalOpenRequests || 0}
              totalUnits={portfolioAnalytics?.enhancedMetrics?.totalUnits || 0}
            />
          </div>
        </AnalyticsPermissionWrapper>

        {/* Payment Analytics Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="h-6 w-6 text-openkey-blue" />
            <h2 className="text-2xl font-semibold text-openkey-blue">Payment Analytics & Revenue</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <PaymentAnalyticsPanel 
                data={paymentData} 
                loading={paymentLoading} 
                landlordId={landlordId} 
              />
            </div>
            <div className="lg:col-span-1">
              <CardEnhanced variant="command" className="command-card h-full">
                <CardEnhancedHeader>
                  <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
                    <DollarSign className="h-5 w-5" />
                    Revenue Breakdown
                  </CardEnhancedTitle>
                </CardEnhancedHeader>
                <CardEnhancedContent>
                  <RevenueBreakdownPro landlordId={landlordId} portfolioId={portfolioId} />
                </CardEnhancedContent>
              </CardEnhanced>
            </div>
            <div className="lg:col-span-1">
              <CardEnhanced variant="premium" className="card-hover-gold h-full">
                <CardEnhancedHeader>
                  <CardEnhancedTitle className="text-white">Quick Actions</CardEnhancedTitle>
                </CardEnhancedHeader>
                <CardEnhancedContent className="space-y-4">
                  <Button 
                    onClick={() => navigate('/payment-analytics')} 
                    className="w-full bg-white/20 border border-white/30 text-white hover:bg-white/30 hover:scale-105 transition-all"
                  >
                    View Full Payment Dashboard
                  </Button>
                  <div className="text-sm text-white/80">
                    Access detailed payment tracking, rent roll management, and collection analytics.
                  </div>
                </CardEnhancedContent>
              </CardEnhanced>
            </div>
          </div>
        </div>

        {/* Financial Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          <CardEnhanced variant="command" className="command-card">
            <CardEnhancedHeader>
              <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
                <Calculator className="h-5 w-5" />
                Expense Analysis
              </CardEnhancedTitle>
            </CardEnhancedHeader>
            <CardEnhancedContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mortgage/Debt</span>
                  <span className="font-semibold text-foreground">
                    ${portfolioAnalytics?.enhancedMetrics?.mortgageExpenses?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Maintenance</span>
                  <span className="font-semibold text-foreground">
                    ${portfolioAnalytics?.enhancedMetrics?.maintenanceExpenses?.toLocaleString() || "0"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-destructive">Total Expenses</span>
                  <span className="text-destructive text-lg">
                    ${portfolioAnalytics?.enhancedMetrics?.totalExpenses?.toLocaleString() || "0"}
                  </span>
                </div>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>

          <CardEnhanced variant="command" className="command-card">
            <CardEnhancedHeader>
              <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
                <Trophy className="h-5 w-5" />
                Property Rankings
              </CardEnhancedTitle>
            </CardEnhancedHeader>
            <CardEnhancedContent>
              <div className="space-y-3">
              {portfolioAnalytics?.propertyRankings?.slice(0, 3).map((property, index) => (
                  <div key={property.propertyId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                        {property.rank}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm text-foreground">{property.address}</div>
                        <div className="text-xs text-muted-foreground">ROI: {property.roi.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm text-openkey-blue">
                        ${property.netIncome.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-4">No data available</div>
                )}
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAnalyticsDashboard;