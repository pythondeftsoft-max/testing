import React, { useState, useEffect } from 'react';
import { Plus, Gift, Trophy, Flame, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPointsConfig } from '@/utils/systemConfig';

interface ModernPointsHeroProps {
  currentBalance: number;
  monthlyEarnings: number;
  streak?: number;
  nextMilestone?: {
    name: string;
    points: number;
  };
  giftCardValue?: number;
  onBrowseRewards?: () => void;
  onConvertPoints?: () => void;
}

const ModernPointsHero = ({
  currentBalance,
  monthlyEarnings,
  streak,
  nextMilestone,
  giftCardValue = 0,
  onBrowseRewards,
  onConvertPoints
}: ModernPointsHeroProps) => {
  const [animatedBalance, setAnimatedBalance] = useState(0);
  const [pointsConfig, setPointsConfig] = useState({
    dollarRatio: 100,
    rentPaymentPoints: 1000,
    referralPoints: 10000,
    maxPointsPerMonth: 50000,
    systemEnabled: true
  });

  // Load points configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [dollarRatio, rentPaymentPoints, referralPoints, maxPointsPerMonth, systemEnabled] = await Promise.all([
          getPointsConfig.dollarRatio(),
          getPointsConfig.rentPayment(),
          getPointsConfig.referral(),
          getPointsConfig.maxPointsPerMonth(),
          getPointsConfig.systemEnabled()
        ]);

        setPointsConfig({
          dollarRatio,
          rentPaymentPoints,
          referralPoints,
          maxPointsPerMonth,
          systemEnabled
        });
      } catch (error) {
        console.error('Failed to load points configuration:', error);
      }
    };

    loadConfig();
  }, []);

  // Animate balance
  useEffect(() => {
    const timer = setTimeout(() => {
      const increment = currentBalance / 30;
      const animate = () => {
        setAnimatedBalance(prev => {
          const next = prev + increment;
          if (next >= currentBalance) {
            return currentBalance;
          }
          requestAnimationFrame(animate);
          return next;
        });
      };
      animate();
    }, 200);

    return () => clearTimeout(timer);
  }, [currentBalance]);

  // Calculate reward value using dynamic config
  const rewardValue = currentBalance / pointsConfig.dollarRatio;
  
  // Calculate exchange rate (points per dollar or cents per point)
  const centsPerPoint = 100 / pointsConfig.dollarRatio;
  const exchangeRateDisplay = centsPerPoint >= 1 
    ? `${centsPerPoint}¢ per point`
    : `${pointsConfig.dollarRatio} points per $1`;
  
  // Calculate progress to next referral milestone (10,000 points)
  const milestonePoints = pointsConfig.referralPoints;
  const progressToNext = nextMilestone 
    ? ((currentBalance % milestonePoints) / milestonePoints) * 100
    : ((currentBalance % milestonePoints) / milestonePoints) * 100;
  
  const nextRewardThreshold = Math.ceil(currentBalance / milestonePoints) * milestonePoints;

  return (
    <Card className="bg-card shadow-lg card-hover-gold">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge className="bg-openkey-blue text-white hover:bg-openkey-blue-light border-0">
                <Trophy className="h-4 w-4 mr-1" />
                Level {Math.floor(currentBalance / pointsConfig.referralPoints) + 1}
              </Badge>
              {streak && streak > 0 && (
                <Badge className="bg-openkey-gold text-white hover:bg-openkey-gold-light border-0">
                  <Flame className="h-4 w-4 mr-1" />
                  {streak} day streak
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg font-semibold text-openkey-blue">
              Your Points Balance
            </CardTitle>
          </div>
          <Star className="h-8 w-8 text-openkey-gold" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="text-5xl font-bold text-openkey-blue">
            {animatedBalance.toLocaleString()}
          </div>
          <p className="text-openkey-gold font-medium">
            ≈ ${rewardValue.toFixed(2)} in rewards
          </p>
          {giftCardValue > 0 && (
            <p className="text-green-600 font-medium">
              ${giftCardValue.toFixed(2)} gift card balance
            </p>
          )}
        </div>

        {nextMilestone && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to next milestone</span>
              <span className="font-medium text-openkey-blue">{progressToNext.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-openkey-gold h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressToNext}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground">
              {nextRewardThreshold - currentBalance} points to next level
            </p>
          </div>
        )}

        <div className="space-y-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-xl font-semibold text-openkey-blue">+{monthlyEarnings}</p>
              <p className="text-xs text-muted-foreground">Max: {pointsConfig.maxPointsPerMonth.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exchange Rate</p>
              <p className="text-xl font-semibold text-openkey-gold">{exchangeRateDisplay}</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rent payments:</span>
              <span className="text-openkey-blue font-medium">1 point per $1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Successful referrals:</span>
              <span className="text-openkey-gold font-medium">{pointsConfig.referralPoints.toLocaleString()} points</span>
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button 
            onClick={onBrowseRewards}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            size="sm"
          >
            <Gift className="h-4 w-4 mr-2" />
            Browse Rewards
          </Button>
          
          {currentBalance >= 500 && onConvertPoints && (
            <Button 
              onClick={onConvertPoints}
              variant="outline"
              className="w-full border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Convert to Gift Card
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModernPointsHero;