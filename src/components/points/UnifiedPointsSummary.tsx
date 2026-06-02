import React from 'react';
import { TrendingUp, Award, Calendar, Building, Gift, Coins } from 'lucide-react';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useUnifiedReferralData } from '@/hooks/useUnifiedReferralData';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';

interface UnifiedPointsSummaryProps {
  userId: string;
  portfolioId?: string;
}

const UnifiedPointsSummary = ({ userId, portfolioId }: UnifiedPointsSummaryProps) => {
  const { pointsSummary, loading: pointsLoading, error: pointsError } = useUserPoints(userId, portfolioId);
  const { unifiedValue, loading: referralLoading, error: referralError } = useUnifiedReferralData(userId);

  const loading = pointsLoading || referralLoading;
  const error = pointsError || referralError;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
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

  if (error) {
    const errorMessage = pointsError 
      ? `Points Error: ${pointsError instanceof Error ? pointsError.message : JSON.stringify(pointsError)}`
      : `Referral Error: ${referralError instanceof Error ? referralError.message : JSON.stringify(referralError)}`;
    
    return (
      <CardEnhanced variant="elevated">
        <CardEnhancedContent className="p-6">
          <p className="text-destructive font-semibold">Failed to load points summary</p>
          <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (!pointsSummary) {
    return null;
  }

  const monthChange = (pointsSummary.points_this_month || 0) - (pointsSummary.points_last_month || 0);
  const monthChangePercent = (pointsSummary.points_last_month || 0) > 0 
    ? ((monthChange / (pointsSummary.points_last_month || 1)) * 100) 
    : 0;

  // Calculate total unified points (portfolio points + referral points)
  const totalUnifiedPoints = (pointsSummary.total_points || 0) + (unifiedValue?.total_unified_points || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <CardEnhanced variant="elevated" className="card-hover-gold">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">Total Points</CardEnhancedTitle>
          <Award className="h-4 w-4 text-openkey-blue" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-3xl font-bold text-openkey-blue">{totalUnifiedPoints.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            Portfolio + Referral points
          </p>
        </CardEnhancedContent>
      </CardEnhanced>

      <CardEnhanced variant="elevated" className="card-hover-gold">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">Portfolio Points</CardEnhancedTitle>
          <Building className="h-4 w-4 text-openkey-blue" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-2xl font-bold text-openkey-blue">{(pointsSummary.total_points || 0).toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            From {pointsSummary.portfolio_count || 0} portfolios
          </p>
        </CardEnhancedContent>
      </CardEnhanced>

      <CardEnhanced variant="elevated" className="card-hover-gold">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">Referral Value</CardEnhancedTitle>
          <Gift className="h-4 w-4 text-openkey-blue" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-2xl font-bold text-openkey-blue">${unifiedValue?.total_gift_card_value?.toFixed(0) || '0'}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="h-3 w-3" />
            {unifiedValue?.total_point_equivalent?.toLocaleString() || '0'} pts equivalent
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      <CardEnhanced variant="elevated" className="card-hover-gold">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">This Month</CardEnhancedTitle>
          <TrendingUp className="h-4 w-4 text-openkey-blue" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-2xl font-bold text-openkey-blue">{(pointsSummary.points_this_month || 0).toFixed(1)}</div>
          {monthChangePercent !== 0 && (
            <p className={`text-xs ${monthChangePercent > 0 ? 'text-success' : 'text-destructive'}`}>
              {monthChangePercent > 0 ? '+' : ''}{monthChangePercent.toFixed(1)}% from last month
            </p>
          )}
        </CardEnhancedContent>
      </CardEnhanced>

      <CardEnhanced variant="elevated" className="card-hover-gold">
        <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardEnhancedTitle className="text-sm font-medium">Recent Activity</CardEnhancedTitle>
          <Calendar className="h-4 w-4 text-openkey-blue" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-2xl font-bold text-openkey-blue">{pointsSummary.recent_activity_count || 0}</div>
          <p className="text-xs text-muted-foreground">
            Points earned this week
          </p>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default UnifiedPointsSummary;