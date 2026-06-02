
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Award, Clock } from 'lucide-react';
import ModernMetricCard from '@/components/analytics/ModernMetricCard';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { usePortfolioPoints } from '@/hooks/usePortfolioPoints';
import { useUserPoints } from '@/hooks/useUserPoints';

interface PortfolioPointsOverviewProps {
  portfolioId: string;
  currentUserId: string;
  compact?: boolean;
}

const PortfolioPointsOverview = ({ portfolioId, currentUserId, compact = false }: PortfolioPointsOverviewProps) => {
  const { pointsSummary, loading: portfolioLoading } = usePortfolioPoints(portfolioId);
  const { pointsSummary: userSummary, loading: userLoading } = useUserPoints(currentUserId, portfolioId);

  if (portfolioLoading || userLoading) {
    return (
      <div className="space-y-6">
        <CardEnhanced variant="premium" className="animate-pulse">
          <CardEnhancedHeader>
            <div className="h-8 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </CardEnhancedHeader>
        </CardEnhanced>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <ModernMetricCard
              key={i}
              title="Loading..."
              value="--"
              icon={Award}
              loading={true}
            />
          ))}
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    return (
      <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <TrendingUp className={`h-4 w-4 mr-1 ${!isPositive ? 'rotate-180' : ''}`} />
        {Math.abs(change).toFixed(1)}%
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!compact && (
        <CardEnhanced variant="premium">
          <CardEnhancedHeader>
            <CardEnhancedTitle gradient className="text-2xl">Points Overview</CardEnhancedTitle>
            <p className="text-muted-foreground">Track points activity and distribution across your portfolio</p>
          </CardEnhancedHeader>
        </CardEnhanced>
      )}

      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4'} gap-4`}>
        <ModernMetricCard
          title="Total Points"
          value={pointsSummary?.total_points || 0}
          icon={Award}
          iconColor="text-openkey-blue"
          trend={pointsSummary?.points_this_month && pointsSummary.points_last_month && pointsSummary.points_last_month > 0
            ? {
                value: (((pointsSummary.points_this_month - pointsSummary.points_last_month) / pointsSummary.points_last_month) * 100),
                isPositive: pointsSummary.points_this_month > pointsSummary.points_last_month,
                period: 'vs last month'
              }
            : undefined}
          variant="default"
        />
        
        <ModernMetricCard
          title="This Month"
          value={pointsSummary?.points_this_month || 0}
          icon={TrendingUp}
          iconColor="text-openkey-gold"
          subtitle={pointsSummary?.points_last_month ? `Last month: ${formatNumber(pointsSummary.points_last_month)}` : undefined}
          variant="default"
        />
        
        <ModernMetricCard
          title="Your Points"
          value={userSummary?.total_points || 0}
          icon={Users}
          iconColor="text-openkey-blue"
          subtitle={userSummary?.points_this_month ? `This month: ${formatNumber(userSummary.points_this_month)}` : undefined}
          variant="default"
        />
        
        <ModernMetricCard
          title="Recent Activity"
          value={pointsSummary?.recent_activity_count || 0}
          icon={Clock}
          iconColor="text-openkey-gold"
          subtitle="Last 7 days"
          variant="default"
        />
      </div>

      {/* Top Source Event */}
      {pointsSummary?.top_source_event && (
        <CardEnhanced variant="subtle">
          <CardEnhancedHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-openkey-blue/10">
                  <Award className="h-5 w-5 text-openkey-blue" />
                </div>
                <div>
                  <CardEnhancedTitle>Top Points Source</CardEnhancedTitle>
                  <p className="text-sm text-muted-foreground">Most common points earning activity</p>
                </div>
              </div>
              <Badge className="bg-gradient-blue-gold text-white border-0 px-4 py-2">
                Primary Source
              </Badge>
            </div>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="text-xl font-bold text-foreground capitalize">
              {pointsSummary.top_source_event.replace(/_/g, ' ')}
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};

export default PortfolioPointsOverview;
