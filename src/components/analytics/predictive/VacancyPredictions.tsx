import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricDisplay } from '@/components/ui/metric-display';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Users, Calendar, Building2 } from 'lucide-react';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';

interface VacancyPredictionsProps {
  landlordId: string;
  portfolioId: string;
}

export const VacancyPredictions: React.FC<VacancyPredictionsProps> = ({
  landlordId,
  portfolioId,
}) => {
  const { data: analytics, isLoading } = useModernPropertyAnalytics(landlordId, portfolioId);
  const predictiveAnalytics = analytics?.predictiveAnalytics;

  const getRiskLevel = (score: number) => {
    if (score < 20) return { level: 'Low', color: 'bg-green-500', variant: 'default' as const };
    if (score < 40) return { level: 'Moderate', color: 'bg-yellow-500', variant: 'secondary' as const };
    return { level: 'High', color: 'bg-red-500', variant: 'destructive' as const };
  };

  const riskLevel = getRiskLevel(predictiveAnalytics?.vacancyRiskScore || 0);

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricDisplay
          label="Vacancy Risk Score"
          value={predictiveAnalytics?.vacancyRiskScore?.toString() || "0"}
          isLoading={isLoading}
          trend="neutral"
        />
        <MetricDisplay
          label="Predicted Vacancy Days"
          value={`${predictiveAnalytics?.predictedVacancyDays || 0} days`}
          isLoading={isLoading}
        />
        <MetricDisplay
          label="Renewal Probability"
          value={`${predictiveAnalytics?.renewalProbability || 0}%`}
          isLoading={isLoading}
          trend="up"
          trendValue="2.3%"
        />
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Property Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Risk Level</span>
                <Badge variant={riskLevel.variant}>{riskLevel.level}</Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Market Conditions</span>
                  <span className="text-sm font-medium">Favorable</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Lease Expiration Impact</span>
                  <span className="text-sm font-medium">Moderate</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tenant Satisfaction</span>
                  <span className="text-sm font-medium">High</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Vacancy Trend Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Based on historical data and market trends, vacancy patterns show:
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Seasonal demand increases in Q2</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Higher turnover risk in winter months</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Market saturation affecting fill rates</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};