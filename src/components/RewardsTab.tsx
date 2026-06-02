
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, Gift, History, Star, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Reward {
  id: string;
  name: string;
  type: string;
  cost: number;
  description: string | null;
  status: string;
  image_url: string | null;
  terms_conditions: string | null;
  stock_quantity: number | null;
  min_amount: number;
  max_amount: number;
  conversion_rate: number;
  brand_category: string;
  is_flexible_amount: boolean;
}

interface Redemption {
  id: string;
  reward_id: string;
  points_used: number;
  status: string;
  redeemed_at: string;
  fulfilled_at: string | null;
  redemption_code: string | null;
  notes: string | null;
  rewards: {
    name: string;
    type: string;
  };
}

interface RewardsTabProps {
  userId: string;
  currentBalance: number;
  onBalanceUpdate: (newBalance: number) => void;
  spendLocked?: boolean;
}

const RewardsTab = ({ userId, currentBalance, onBalanceUpdate, spendLocked = false }: RewardsTabProps) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchRewards();
    fetchRedemptions();
  }, [userId]);

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('status', 'active')
        .eq('is_flexible_amount', true)
        .order('brand_category', { ascending: true });

      if (error) throw error;
      const rewardsData = data || [];
      setRewards(rewardsData);
      
      // Initialize default amounts
      const defaultAmounts: Record<string, number> = {};
      rewardsData.forEach(reward => {
        defaultAmounts[reward.id] = Math.max(reward.min_amount, 10); // Default to $10 or min_amount
      });
      setSelectedAmounts(defaultAmounts);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      toast({
        title: "Error",
        description: "Failed to load rewards catalog",
        variant: "destructive",
      });
    }
  };

  const fetchRedemptions = async () => {
    try {
      const { data, error } = await supabase
        .from('redemptions')
        .select(`
          *,
          rewards!inner(name, type)
        `)
        .eq('user_id', userId)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;
      setRedemptions(data || []);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    const selectedAmount = selectedAmounts[reward.id] || reward.min_amount;
    const pointsNeeded = Math.round(selectedAmount * reward.conversion_rate);
    
    if (currentBalance < pointsNeeded) {
      toast({
        title: "Insufficient Points",
        description: `You need ${pointsNeeded.toLocaleString()} points but only have ${currentBalance.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    setRedeeming(reward.id);

    try {
      const { data, error } = await supabase.rpc('redeem_flexible_reward', {
        p_user_id: userId,
        p_reward_id: reward.id,
        p_amount: selectedAmount
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (result.success) {
        toast({
          title: "Gift Card Redeemed!",
          description: `Successfully redeemed $${selectedAmount.toFixed(2)} ${reward.name}. Your new balance is ${result.new_balance.toLocaleString()} points.`,
        });
        
        onBalanceUpdate(result.new_balance);
        fetchRedemptions(); // Refresh redemption history
      } else {
        throw new Error(result.error || 'Redemption failed');
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast({
        title: "Redemption Failed",
        description: error instanceof Error ? error.message : "Failed to redeem reward",
        variant: "destructive",
      });
    } finally {
      setRedeeming(null);
    }
  };

  const updateAmount = (rewardId: string, amount: number) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;
    
    const clampedAmount = Math.min(Math.max(amount, reward.min_amount), reward.max_amount);
    setSelectedAmounts(prev => ({
      ...prev,
      [rewardId]: clampedAmount
    }));
  };

  const getPointsNeeded = (reward: Reward) => {
    const amount = selectedAmounts[reward.id] || reward.min_amount;
    return Math.round(amount * reward.conversion_rate);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        label: 'Pending', 
        icon: Clock, 
        variant: 'warning' as const 
      },
      processing: { 
        label: 'Processing', 
        icon: AlertTriangle, 
        variant: 'outline' as const 
      },
      fulfilled: { 
        label: 'Fulfilled', 
        icon: CheckCircle, 
        variant: 'success' as const 
      },
      failed: { 
        label: 'Failed', 
        icon: XCircle, 
        variant: 'danger' as const 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-openkey-blue mx-auto mb-2" />
          Loading rewards...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Spending locked warning */}
      {spendLocked && (
        <CardEnhanced variant="elevated" className="border-amber-200 bg-amber-50">
          <CardEnhancedContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800">Global View Mode</h4>
              <p className="text-sm text-amber-700">
                Points spending is disabled when viewing all portfolios. Select a specific portfolio to spend points.
              </p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Current Balance Display */}
      <CardEnhanced variant="elevated" className="bg-gradient-to-r from-openkey-blue/5 to-openkey-gold/5 border-openkey-blue/20">
        <CardEnhancedContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-900">Available Points</p>
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-openkey-gold" />
                <p className="text-3xl font-bold text-openkey-gold">{currentBalance.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-900">Reward Value</p>
              <p className="text-lg font-semibold text-openkey-gold">
                ≈ ${(currentBalance / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Tab Navigation */}
      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm">
          <TabsTrigger 
            value="catalog" 
            className="flex items-center gap-2 text-sm data-[state=active]:bg-openkey-blue data-[state=active]:text-white"
          >
            <Gift className="h-4 w-4" />
            Rewards Catalog
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex items-center gap-2 text-sm data-[state=active]:bg-openkey-blue data-[state=active]:text-white"
          >
            <History className="h-4 w-4" />
            Redemption History
          </TabsTrigger>
        </TabsList>

        {/* Rewards Catalog */}
        <TabsContent value="catalog" className="space-y-6">
          {rewards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rewards available yet.</p>
              <p className="text-sm">Check back soon for exciting rewards!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => {
                const selectedAmount = selectedAmounts[reward.id] || reward.min_amount;
                const pointsNeeded = getPointsNeeded(reward);
                const canAfford = currentBalance >= pointsNeeded;
                
                return (
                  <CardEnhanced 
                    key={reward.id} 
                    variant="elevated" 
                    className="group relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-white border border-border"
                  >
                    <CardEnhancedContent className="p-0">
                      {reward.image_url && (
                        <div className="relative h-32 overflow-hidden">
                          <img 
                            src={reward.image_url} 
                            alt={reward.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                      )}
                      
                      <div className="p-4 space-y-3 flex flex-col">
                        {/* Brand name and description */}
                        <div className="space-y-1 min-h-[72px]">
                          <h3 className="text-lg font-semibold text-foreground leading-tight">
                            {reward.name}
                          </h3>
                          {reward.description && (
                            <p className="text-muted-foreground text-sm line-clamp-2">
                              {reward.description}
                            </p>
                          )}
                        </div>

                        {/* Amount Selection */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between min-h-[20px]">
                            <label className="text-sm font-medium text-foreground">Amount:</label>
                            <span className="text-xs text-muted-foreground">
                              ${reward.min_amount} - ${reward.max_amount}
                            </span>
                          </div>
                          
                          {/* Quick amount buttons */}
                          <div className="grid grid-cols-4 gap-2">
                            {[10, 25, 50, 100].filter(amount => amount >= reward.min_amount && amount <= reward.max_amount).map((amount) => (
                              <Button
                                key={amount}
                                variant={selectedAmount === amount ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateAmount(reward.id, amount)}
                                className="text-xs h-9"
                              >
                                ${amount}
                              </Button>
                            ))}
                          </div>
                          
                          {/* Custom amount input */}
                          <div className="flex items-center gap-2 min-h-[36px]">
                            <span className="text-sm font-medium">$</span>
                            <Input
                              type="number"
                              min={reward.min_amount}
                              max={reward.max_amount}
                              step="0.01"
                              value={selectedAmount}
                              onChange={(e) => updateAmount(reward.id, parseFloat(e.target.value) || reward.min_amount)}
                              className="flex-1 h-9 text-sm"
                            />
                          </div>
                          
                          {/* Points needed display */}
                          <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg min-h-[44px]">
                            <span className="text-sm text-muted-foreground">Points needed:</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-foreground">
                                {pointsNeeded.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Redeem button */}
                        <Button
                          variant="default"
                          onClick={() => handleRedeem(reward)}
                          disabled={spendLocked || !canAfford || redeeming === reward.id}
                          className="w-full h-10 font-medium"
                        >
                          {redeeming === reward.id ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Processing...</span>
                            </div>
                          ) : spendLocked ? (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              <span>Select Portfolio</span>
                            </div>
                          ) : !canAfford ? (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              <span>Need {(pointsNeeded - currentBalance).toLocaleString()} More Points</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Gift className="h-4 w-4" />
                              <span>Redeem ${selectedAmount.toFixed(2)} Gift Card</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Redemption History */}
        <TabsContent value="history" className="space-y-6">
          <CardEnhanced variant="elevated">
            <CardEnhancedHeader>
              <CardEnhancedTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Redemption History
              </CardEnhancedTitle>
            </CardEnhancedHeader>
            <CardEnhancedContent className="p-6">
              {redemptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No redemptions yet</p>
                  <p className="text-sm mt-1">Start earning points and redeem rewards!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {redemptions.map((redemption) => (
                    <div key={redemption.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-openkey-blue/30 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900">{redemption.rewards.name}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-blue-800">
                            {format(new Date(redemption.redeemed_at), 'MMM d, yyyy')}
                          </span>
                          <span className="text-sm text-openkey-gold font-medium">
                            -{redemption.points_used.toLocaleString()} pts
                          </span>
                          {getStatusBadge(redemption.status)}
                        </div>
                        {redemption.redemption_code && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <strong>Code:</strong> {redemption.redemption_code}
                          </div>
                        )}
                        {redemption.notes && (
                          <p className="text-sm text-blue-800 mt-1">{redemption.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardEnhancedContent>
          </CardEnhanced>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RewardsTab;
