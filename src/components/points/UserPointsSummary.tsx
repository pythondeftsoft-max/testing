
import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { TrendingUp, Award, Calendar, Building } from 'lucide-react';
import { useUserPoints } from '@/hooks/useUserPoints';

interface UserPointsSummaryProps {
  userId: string;
  portfolioId?: string;
}

const UserPointsSummary = ({ userId, portfolioId }: UserPointsSummaryProps) => {
  const { pointsSummary, loading, error } = useUserPoints(userId, portfolioId);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <CardEnhanced key={i} variant="elevated" hover={false}>
            <CardEnhancedContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
        ))}
      </div>
    );
  }

  if (error || !pointsSummary) {
    return (
      <CardEnhanced variant="elevated">
        <CardEnhancedContent className="p-6">
          <p className="text-destructive">Failed to load points summary</p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  const monthChange = pointsSummary.points_this_month - pointsSummary.points_last_month;
  const monthChangePercent = pointsSummary.points_last_month > 0 
    ? ((monthChange / pointsSummary.points_last_month) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <CardEnhanced variant="elevated" className="card-hover-gold">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">Total Points</CardEnhancedTitle>
          <Award className="h-4 w-4 text-openkey-blue" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-3xl font-bold text-openkey-blue">{pointsSummary.spendable_points !== undefined ? pointsSummary.spendable_points.toFixed(1) : pointsSummary.total_points.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            {portfolioId && portfolioId !== 'everything' ? 'Spendable from this portfolio' : 'Spendable across all portfolios'}
          </p>
        </CardEnhancedContent>
      </CardEnhanced>

      <CardEnhanced variant="elevated" className="card-hover">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">This Month</CardEnhancedTitle>
          <TrendingUp className="h-4 w-4 text-openkey-blue" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-2xl font-bold text-openkey-blue">{pointsSummary.points_this_month.toFixed(1)}</div>
          {monthChangePercent !== 0 && (
            <p className={`text-xs ${monthChangePercent > 0 ? 'text-success' : 'text-destructive'}`}>
              {monthChangePercent > 0 ? '+' : ''}{monthChangePercent.toFixed(1)}% from last month
            </p>
          )}
        </CardEnhancedContent>
      </CardEnhanced>

      <CardEnhanced variant="subtle" className="card-hover">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">Recent Activity</CardEnhancedTitle>
          <Calendar className="h-4 w-4 text-openkey-gold" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-2xl font-bold text-openkey-gold">{pointsSummary.recent_activity_count}</div>
          <p className="text-xs text-muted-foreground">
            Points earned this week
          </p>
        </CardEnhancedContent>
      </CardEnhanced>

      <CardEnhanced variant="elevated" className="card-hover">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">Portfolios</CardEnhancedTitle>
          <Building className="h-4 w-4 text-openkey-blue" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-2xl font-bold text-openkey-blue">{pointsSummary.portfolio_count}</div>
          <p className="text-xs text-muted-foreground">
            Active portfolios
          </p>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default UserPointsSummary;
