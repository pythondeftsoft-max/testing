import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Award } from "lucide-react";
import { usePortfolioReferralData } from "@/hooks/usePortfolioReferralData";

interface PortfolioReferralAnalyticsProps {
  portfolioId: string;
  startDate?: string;
  endDate?: string;
}

const PortfolioReferralAnalytics = ({ portfolioId, startDate, endDate }: PortfolioReferralAnalyticsProps) => {
  const { performance, roi, loading, error } = usePortfolioReferralData(portfolioId, startDate, endDate);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !performance || !roi) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Unable to load referral analytics</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Referrals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.total_referrals}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <span>{performance.qualified_referrals} qualified</span>
              <span>•</span>
              <span>{performance.pending_referrals} pending</span>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(performance.conversion_rate)}</div>
            <div className="flex items-center space-x-1 text-xs">
              {performance.month_over_month_growth > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-success">+{formatPercentage(performance.month_over_month_growth)}</span>
                </>
              ) : performance.month_over_month_growth < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span className="text-destructive">{formatPercentage(performance.month_over_month_growth)}</span>
                </>
              ) : (
                <span className="text-muted-foreground">No change</span>
              )}
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Referral Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(performance.total_referral_value)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(performance.avg_referral_value)} per qualified
            </p>
          </CardContent>
        </Card>

        {/* ROI Percentage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral ROI</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(roi.referral_roi_percentage)}</div>
            <p className="text-xs text-muted-foreground">
              Cost per referral: {formatCurrency(roi.cost_per_qualified_referral)}
            </p>
          </CardContent>
        </Card>

        {/* Estimated Tenant Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(roi.estimated_tenant_value)}</div>
            <p className="text-xs text-muted-foreground">
              Annual tenant value from referrals
            </p>
          </CardContent>
        </Card>

        {/* Top Source */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Source</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-sm">
              {performance.top_referral_source}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Primary referral source
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Referral Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Performance Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Referrals:</span>
                  <span>{performance.total_referrals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Qualified Rate:</span>
                  <span>{formatPercentage(performance.conversion_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Value:</span>
                  <span>{formatCurrency(performance.avg_referral_value)}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">ROI Analysis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment:</span>
                  <span>{formatCurrency(roi.total_referral_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Return:</span>
                  <span>{formatCurrency(roi.estimated_tenant_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROI:</span>
                  <span className={roi.referral_roi_percentage > 0 ? "text-success" : "text-destructive"}>
                    {formatPercentage(roi.referral_roi_percentage)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioReferralAnalytics;