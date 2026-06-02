import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Coins, Calendar, Zap } from 'lucide-react';
import { useUserPoints } from '@/hooks/useUserPoints';

interface RentPointsAlertProps {
  userId: string;
  monthlyRent?: number;
}

export const RentPointsAlert = ({ userId, monthlyRent = 1200 }: RentPointsAlertProps) => {
  const { pointsSummary } = useUserPoints(userId);
  
  // Points calculation based on current system
  const basePoints = monthlyRent; // 1 point per dollar
  const earlyPaymentBonus = 500;
  const pointsToUSD = 100; // 100 points = $1
  const cashValue = (basePoints / pointsToUSD).toFixed(0);

  // Get current month's points progress
  const currentMonthPoints = pointsSummary?.points_this_month || 0;
  const progressPercentage = Math.min((currentMonthPoints / basePoints) * 100, 100);

  const handleSetupAutopay = () => {
    // Navigate to autopay setup or rent payments
    window.location.href = '/rent-payments-new';
  };

  return (
    <CardEnhanced variant="default" className="bg-card border border-border h-full flex flex-col card-hover-gold" hover={false}>
      <CardEnhancedHeader className="pb-4">
        <CardEnhancedTitle className="text-lg font-semibold text-foreground flex items-center gap-3">
          <div className="p-2 bg-openkey-blue rounded-lg">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <div>Earn Points Paying Rent</div>
            <div className="text-sm font-normal text-muted-foreground">1 point per dollar paid</div>
          </div>
        </CardEnhancedTitle>
      </CardEnhancedHeader>

      <CardEnhancedContent className="space-y-6 flex-grow flex flex-col">
        {/* Monthly Potential */}
        <div className="text-center space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Monthly Potential</div>
          <div className="text-3xl font-bold text-foreground">{basePoints.toLocaleString()} points</div>
          <div className="text-lg font-semibold text-green-600">${cashValue} value</div>
          <div className="text-xs text-muted-foreground">${monthlyRent.toLocaleString()} rent = {basePoints.toLocaleString()} points</div>
        </div>

        {/* Early Payment Bonus */}
        <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-background">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">Early Payment Bonus</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-amber-600">+{earlyPaymentBonus} points</div>
            <div className="text-xs text-muted-foreground">+${(earlyPaymentBonus / pointsToUSD).toFixed(0)} value</div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">This Month</span>
            <span className="text-sm text-foreground">
              {currentMonthPoints} points
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-full bg-openkey-blue rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {currentMonthPoints.toLocaleString()} / {basePoints.toLocaleString()} points earned this month
          </div>
        </div>

        {/* Maximize Rewards */}
        <div className="space-y-3 flex-grow flex flex-col justify-end">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-openkey-blue" />
            <span className="text-sm font-medium text-foreground">Maximize Your Rewards</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Set up AutoPay to never miss your early payment bonus and automatically earn points every month.
          </p>
          <Button 
            onClick={handleSetupAutopay}
            className="w-full bg-openkey-blue hover:bg-openkey-blue/90 text-white mt-auto"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Set Up AutoPay
          </Button>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};