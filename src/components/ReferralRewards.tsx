import React, { useState, useEffect } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, Users, Share2, Award, Copy, Check, ArrowRight, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedReferralData } from '@/hooks/useUnifiedReferralData';
import { ReferralDialog } from '@/components/referral/ReferralDialog';

interface ReferralStats {
  total_referrals: number;
  qualified_referrals: number;
  pending_referrals: number;
  total_rewards_earned: number;
  available_rewards_count: number;
  progress_to_milestone: number;
}

interface ReferralRewardsProps {
  userId: string;
}

export const ReferralRewards: React.FC<ReferralRewardsProps> = ({ userId }) => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const { toast } = useToast();
  const { enhancedStats } = useUnifiedReferralData(userId);

  useEffect(() => {
    fetchReferralData();
  }, [userId]);

  const fetchReferralData = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_referral_stats', { p_user_id: userId });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <CardEnhanced className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced className="p-6 h-full flex flex-col card-hover-gold" hover={false}>
      <div className="space-y-6 flex-grow flex flex-col">
        {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-rose-500">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Refer & Earn</h3>
          <p className="text-sm text-muted-foreground">Turn your network into income</p>
        </div>
      </div>

      {/* Main Stats Display */}
      <div className="text-center space-y-2">
        <div className="text-4xl font-bold text-foreground">
          {enhancedStats?.qualified_referrals || stats?.qualified_referrals || 0}
        </div>
        <div className="text-sm text-muted-foreground">successful referrals</div>
        <div className="text-2xl font-semibold text-amber-600">
          ${enhancedStats?.total_rewards_earned || stats?.total_rewards_earned || 0}
        </div>
        <div className="text-sm text-muted-foreground">earned</div>
      </div>

      {/* Reward Information */}
      <div className="text-center p-4 border border-border/50 rounded-lg bg-background">
        <div className="text-xl font-bold text-amber-600">$100 Reward Points</div>
        <div className="text-sm text-muted-foreground">per qualified referral</div>
      </div>

        {/* Network Income Section */}
        <div className="text-center space-y-2 flex-grow">
          <h4 className="text-base font-semibold text-foreground">Turn Your Network Into Income!</h4>
          <p className="text-sm text-muted-foreground">
            Share OpenKey with friends and earn real cash rewards for every successful referral.
          </p>
        </div>


        {/* Call to Action */}
        <Button
          onClick={() => setShowReferralDialog(true)}
          className="w-full mt-auto"
          size="lg"
        >
          Start Referring
        </Button>
      </div>

      {/* Referral Dialog */}
      <ReferralDialog
        isOpen={showReferralDialog}
        onClose={() => setShowReferralDialog(false)}
        userId={userId}
        onReferralSent={fetchReferralData}
      />
    </CardEnhanced>
  );
};