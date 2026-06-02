import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricDisplay } from '@/components/ui/metric-display';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, MapPin, Target, DollarSign, BarChart3, ArrowUpRight } from 'lucide-react';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';

interface MarketIntelligenceProps {
  landlordId: string;
  portfolioId: string;
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({
  landlordId,
  portfolioId,
}) => {
  const { data: analytics, isLoading } = useModernPropertyAnalytics(landlordId, portfolioId);
  const predictiveAnalytics = analytics?.predictiveAnalytics;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricDisplay
          label="Optimal Rent Price"
          value={formatCurrency(predictiveAnalytics?.optimalRentPrice || 0)}
          isLoading={isLoading}
          trend="up"
          trendValue="1.8%"
        />
        <MetricDisplay
          label="Market Rent Gap"
          value={formatCurrency(Math.abs(predictiveAnalytics?.marketRentGap || 0))}
          isLoading={isLoading}
          trend={(predictiveAnalytics?.marketRentGap || 0) > 0 ? "up" : "down"}
        />
        <MetricDisplay
          label="Revenue Optimization"
          value={formatCurrency(predictiveAnalytics?.revenueOptimizationPotential || 0)}
          isLoading={isLoading}
          trend="up"
        />
      </div>

      {/* Market Analysis Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Competitive Market Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium mb-1">Market Position</div>
                  <div className="text-2xl font-bold text-primary">Top 25%</div>
                  <div className="text-sm text-muted-foreground">Among comparable properties</div>
                </div>
                <Badge variant="default" className="bg-green-500">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Strong
                </Badge>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Market Rent</span>
                  <span className="text-sm font-medium">{formatCurrency(2450)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Your Average Rent</span>
                  <span className="text-sm font-medium">{formatCurrency(predictiveAnalytics?.optimalRentPrice || 2380)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Occupancy Rate</span>
                  <span className="text-sm font-medium">92% vs 88% market</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pricing Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-3">
                AI-powered pricing optimization suggestions:
              </div>
              
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Immediate Action</span>
                  </div>
                  <div className="text-sm text-green-700">
                    Increase rent by 3.2% on lease renewals (avg. market rate)
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">Strategic</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Consider premium pricing for renovated units (+8% potential)
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-800">Monitor</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    Track competitor pricing changes in Q2 for optimal positioning
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};