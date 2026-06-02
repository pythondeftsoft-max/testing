import { Gift, TrendingUp, Award } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { useUserPoints } from '@/hooks/useUserPoints';
import { getPointsConfig } from '@/utils/systemConfig';
import { useEffect, useState } from 'react';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';

interface RentPointsRewardsCardProps {
  userId: string;
  monthlyRent: number;
}

export const RentPointsRewardsCard = ({ userId, monthlyRent }: RentPointsRewardsCardProps) => {
  const { userPoints, loading } = useUserPoints(userId);
  const [estimatedNextBonus, setEstimatedNextBonus] = useState<number>(0);

  useEffect(() => {
    const loadConfig = async () => {
      const basePoints = await getPointsConfig.rentPayment();
      setEstimatedNextBonus(basePoints || 1000);
    };
    loadConfig();
  }, []);

  // Calculate total rent payment points
  const rentPoints = userPoints?.filter(p => 
    p.source_event_type === 'rent_payment'
  ).reduce((sum, p) => sum + p.points_awarded, 0) || 0;

  // Calculate this month's points
  const thisMonth = new Date();
  const monthlyPoints = userPoints?.filter(p => 
    p.source_event_type === 'rent_payment' &&
    new Date(p.created_at).getMonth() === thisMonth.getMonth() &&
    new Date(p.created_at).getFullYear() === thisMonth.getFullYear()
  ).reduce((sum, p) => sum + p.points_awarded, 0) || 0;

  return (
    <CardEnhanced variant="elevated" hover animate className="card-hover-gold border-l-4 border-l-amber-500">
      <CardEnhancedHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardEnhancedTitle className="text-sm font-medium text-muted-foreground">
            Rent Payment Rewards
          </CardEnhancedTitle>
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Gift className="w-4 h-4 text-amber-600" />
          </div>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent className="space-y-4">
        {/* Total Points Earned */}
        <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-900">Total Earned</p>
          </div>
          {loading ? (
            <MetricSkeleton />
          ) : (
            <>
              <div className="text-3xl font-bold text-amber-600 mb-1">
                {rentPoints.toLocaleString()}
              </div>
              <p className="text-xs text-amber-700">points from rent payments</p>
            </>
          )}
        </div>

        {/* This Month's Points */}
        <div className="p-4 bg-white border border-gray-100 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-sm font-medium text-gray-700">This Month</p>
            </div>
            {monthlyPoints > 0 && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                NEW
              </Badge>
            )}
          </div>
          {loading ? (
            <MetricSkeleton />
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {monthlyPoints > 0 ? `+${monthlyPoints.toLocaleString()}` : '0'}
              </div>
              <p className="text-xs text-gray-600">points earned</p>
            </>
          )}
        </div>

        {/* Next Payment Bonus */}
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">Next Payment</p>
          </div>
          {loading ? (
            <MetricSkeleton />
          ) : (
            <>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                ~{estimatedNextBonus.toLocaleString()}
              </div>
              <p className="text-xs text-blue-700">estimated bonus points</p>
            </>
          )}
        </div>

        {/* Info Footer */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">
            Earn points with every rent payment. Pay early for bonus rewards!
          </p>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};
