import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Gift, TrendingUp, TrendingDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPoints } from '@/hooks/useUserPoints';
import { usePointsConversion } from '@/hooks/usePointsConversion';
import ModernPointsHero from './points/ModernPointsHero';
import PointsActivityFeed from './points/PointsActivityFeed';
import PointsInsightCards from './points/PointsInsightCards';
import PointsEarningTips from './points/PointsEarningTips';
import UnifiedRewardsStore from './rewards/UnifiedRewardsStore';
import { PointsConversionDialog } from './points/PointsConversionDialog';
import { ConversionHistory } from './points/ConversionHistory';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { ReferralDialog } from '@/components/referral/ReferralDialog';

interface PointsTabProps {
  userId: string;
  defaultSubtab?: string;
  spendLocked?: boolean;
}

const PointsTab = ({ userId, defaultSubtab, spendLocked = false }: PointsTabProps) => {
  const navigate = useNavigate();
  const [currentSubtab, setCurrentSubtab] = useState(defaultSubtab || 'overview');
  const [showReferralDialog, setShowReferralDialog] = useState(false);

  // Use the proper useUserPoints hook for real data
  const { userPoints, pointsSummary, loading, error } = useUserPoints(userId);
  const { giftCardValue } = usePointsConversion(userId);

  // Update subtab when defaultSubtab prop changes
  useEffect(() => {
    if (defaultSubtab) {
      setCurrentSubtab(defaultSubtab);
    }
  }, [defaultSubtab]);

  const handleBalanceUpdate = (newBalance: number) => {
    // Data will be refreshed automatically by the hook
  };

  const formatPointsChange = (change: number): string => {
    return change >= 0 ? `+${change.toLocaleString()}` : change.toLocaleString();
  };

  const getEventDisplayText = (item: any): string => {
    if (item.notes) {
      return item.notes;
    }
    
    // Fallback based on event type
    switch (item.source_event_type) {
      case 'rent_payment':
        return 'Rent Payment';
      case 'referral_milestone':
        return 'Referral Reward';
      case 'reward_redemption':
        return 'Reward Redeemed';
      case 'admin_adjustment':
        return 'Points Adjustment';
      default:
        return item.source_event_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Points Activity';
    }
  };

  const getEventIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-openkey-blue mx-auto" />
          <p className="text-muted-foreground">Loading your points dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <Gift className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">Unable to load points</h3>
          <p className="text-destructive mb-4">{error?.message || 'An error occurred'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-openkey-blue text-white px-6 py-2 rounded-lg hover:bg-openkey-blue-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Use real data from the hook
  const currentBalance = pointsSummary?.total_points || 0;
  const monthlyEarnings = pointsSummary?.points_this_month || 0;
  const lastMonthEarnings = pointsSummary?.points_last_month || 0;
  const weeklyActivity = pointsSummary?.recent_activity_count || 0;
  const recentActivity = userPoints || [];

  // Calculate streak from actual user points data
  const calculateStreak = () => {
    if (!userPoints || userPoints.length === 0) return 0;
    
    const sortedActivity = userPoints
      .filter(item => item.points_awarded > 0)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (sortedActivity.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    const activityDates = new Set(
      sortedActivity.map(item => new Date(item.created_at).toDateString())
    );
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      if (activityDates.has(checkDate.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  return (
    <CardEnhanced variant="elevated" className="card-hover">
      <CardEnhancedContent className="p-6">
        <Tabs value={currentSubtab} onValueChange={setCurrentSubtab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="overview" className="text-sm font-medium data-[state=active]:bg-openkey-blue data-[state=active]:text-white">
              Activity & Tips
            </TabsTrigger>
            <TabsTrigger value="rewards" className="text-sm font-medium data-[state=active]:bg-openkey-blue data-[state=active]:text-white">
              Rewards Store
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Modern Points Hero */}
            <ModernPointsHero
              currentBalance={currentBalance}
              monthlyEarnings={monthlyEarnings}
              streak={streak}
              nextMilestone={{ name: "Next Level", points: 10000 }}
              giftCardValue={giftCardValue}
              onBrowseRewards={() => {
                setCurrentSubtab('rewards');
              }}
              onConvertPoints={() => {
                // Convert points functionality removed - could show modal here if needed
              }}
            />

            {/* Insight Cards */}
            <PointsInsightCards
              totalPoints={currentBalance}
              monthlyPoints={monthlyEarnings}
              lastMonthPoints={lastMonthEarnings}
              weeklyActivity={weeklyActivity}
              streak={streak}
              nextMilestone={10000}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Feed */}
              <PointsActivityFeed 
                activities={recentActivity.slice(0, 5).map(item => ({
                  pointsChange: item.points_awarded,
                  balanceAfter: currentBalance,
                  timestamp: item.created_at,
                  eventType: item.source_event_type,
                  notes: item.notes || undefined
                }))} 
                isLoading={loading}
              />
              
              {/* Earning Tips */}
              <div id="earning-tips">
                <PointsEarningTips 
                  onTipClick={(tip) => {
                    console.log('Tip clicked:', tip);
                  }}
                  onOpenReferralDialog={() => setShowReferralDialog(true)}
                />
              </div>
            </div>
          </TabsContent>


          <TabsContent value="rewards" className="mt-6">
            <UnifiedRewardsStore
              userId={userId}
              currentBalance={currentBalance}
              onBalanceUpdate={handleBalanceUpdate}
              spendLocked={spendLocked}
            />
          </TabsContent>
        </Tabs>
      </CardEnhancedContent>

      {/* Referral Dialog */}
      <ReferralDialog
        isOpen={showReferralDialog}
        onClose={() => setShowReferralDialog(false)}
        userId={userId}
      />
    </CardEnhanced>
  );
};

export default PointsTab;
