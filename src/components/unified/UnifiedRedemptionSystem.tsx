
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Gift, ArrowRightLeft, Coins, CreditCard, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';

interface UnifiedBalance {
  portfolioPoints: number;
  referralPoints: number;
  giftCardValue: number;
  totalUnifiedPoints: number;
  conversionRate: number;
}

interface ConversionRates {
  pointsToGiftCard: number;
  giftCardToPoints: number;
  conversionFee: number;
  minimumConversion: number;
}

interface Reward {
  id: string;
  name: string;
  type: string;
  cost: number;
  description: string | null;
  image_url: string | null;
}

interface UnifiedRedemptionSystemProps {
  userId: string;
}

const UnifiedRedemptionSystem = ({ userId }: UnifiedRedemptionSystemProps) => {
  const [balance, setBalance] = useState<UnifiedBalance | null>(null);
  const [conversionRates, setConversionRates] = useState<ConversionRates | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  
  // Conversion form state
  const [conversionAmount, setConversionAmount] = useState<string>('');
  const [conversionFrom, setConversionFrom] = useState<'portfolio_points' | 'gift_card_value'>('portfolio_points');
  const [conversionTo, setConversionTo] = useState<'portfolio_points' | 'gift_card_value'>('gift_card_value');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUnifiedData();
  }, [userId]);

  const fetchUnifiedData = async () => {
    try {
      setLoading(true);
      
      // Fetch balance, conversion rates, and rewards in parallel
      const [balanceResponse, ratesResponse, rewardsResponse] = await Promise.all([
        supabase.functions.invoke('unified-redemption', {
          body: { action: 'get_balance' }
        }),
        supabase.functions.invoke('unified-redemption', {
          body: { action: 'get_conversion_rates' }
        }),
        supabase.from('rewards').select('*').eq('status', 'active').order('cost', { ascending: true })
      ]);

      if (balanceResponse.error) throw balanceResponse.error;
      if (ratesResponse.error) throw ratesResponse.error;
      if (rewardsResponse.error) throw rewardsResponse.error;

      setBalance(balanceResponse.data.balance);
      setConversionRates(ratesResponse.data.rates);
      setRewards(rewardsResponse.data || []);
      
    } catch (error) {
      console.error('Error fetching unified data:', error);
      toast({
        title: "Error",
        description: "Failed to load redemption data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConversion = async () => {
    if (!conversionAmount || !conversionRates) return;
    
    const amount = parseFloat(conversionAmount);
    
    if (amount < conversionRates.minimumConversion) {
      toast({
        title: "Invalid Amount",
        description: `Minimum conversion amount is ${conversionRates.minimumConversion}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setConverting(true);
      
      const { data, error } = await supabase.functions.invoke('unified-redemption', {
        body: {
          action: 'convert',
          conversionParams: {
            fromType: conversionFrom,
            toType: conversionTo,
            amount: amount
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Conversion Successful",
        description: data.message,
      });

      setConversionAmount('');
      fetchUnifiedData(); // Refresh balances
      
    } catch (error: any) {
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert points",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  const handleRedemption = async (reward: Reward, pointType: 'portfolio' | 'referral') => {
    try {
      setRedeeming(reward.id);
      
      const { data, error } = await supabase.functions.invoke('unified-redemption', {
        body: {
          action: 'redeem',
          rewardId: reward.id,
          pointsUsed: reward.cost,
          pointType: pointType
        }
      });

      if (error) throw error;

      toast({
        title: "Reward Redeemed!",
        description: `Successfully redeemed ${reward.name} using ${pointType} points`,
      });

      fetchUnifiedData(); // Refresh balances
      
    } catch (error: any) {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem reward",
        variant: "destructive",
      });
    } finally {
      setRedeeming(null);
    }
  };

  const getRedemptionOptions = (rewardCost: number) => {
    if (!balance) return [];
    
    const options = [];
    
    if (balance.portfolioPoints >= rewardCost) {
      options.push({
        type: 'portfolio' as const,
        label: `Portfolio Points (${balance.portfolioPoints.toLocaleString()} available)`,
        canAfford: true
      });
    }
    
    if (balance.referralPoints >= rewardCost) {
      options.push({
        type: 'referral' as const,
        label: `Referral Points (${balance.referralPoints.toLocaleString()} available)`,
        canAfford: true
      });
    }
    
    return options;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-openkey-blue" />
        <span className="ml-2 text-muted-foreground">Loading unified redemption system...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unified Balance Overview */}
      <CardEnhanced variant="gradient" className="card-hover-gold bg-gradient-blue-gold">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center text-white">
            <Coins className="w-5 h-5 mr-2" />
            Unified Points Balance
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {balance?.totalUnifiedPoints.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-white/80">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-white">
                {balance?.portfolioPoints.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-white/80">Portfolio Points</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-white">
                {balance?.referralPoints.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-white/80">Referral Points</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-white">
                ${balance?.giftCardValue.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-white/80">Gift Card Value</div>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      <Tabs defaultValue="rewards" className="w-full !bg-white">
        <TabsList className="grid w-full grid-cols-2 !bg-white">
          <TabsTrigger value="rewards" className="data-[state=active]:bg-openkey-blue data-[state=active]:text-white">Rewards Catalog</TabsTrigger>
          <TabsTrigger value="convert" className="data-[state=active]:bg-openkey-blue data-[state=active]:text-white">Point Conversion</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rewards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const redemptionOptions = getRedemptionOptions(reward.cost);
              
              return (
                <CardEnhanced key={reward.id} variant="elevated" className="overflow-hidden card-hover-gold" animate={false}>
                  {reward.image_url && (
                    <div className="h-48 bg-gray-100 overflow-hidden">
                      <img 
                        src={reward.image_url} 
                        alt={reward.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardEnhancedHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardEnhancedTitle className="text-lg">{reward.name}</CardEnhancedTitle>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-openkey-gold mr-1" />
                        <span className="text-sm font-bold text-openkey-blue">
                          {reward.cost.toLocaleString()} pts
                        </span>
                      </div>
                    </div>
                  </CardEnhancedHeader>
                  <CardEnhancedContent className="pt-0">
                    {reward.description && (
                      <p className="text-muted-foreground text-sm mb-4">{reward.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      {redemptionOptions.length > 0 ? (
                        redemptionOptions.map((option) => (
                          <Button
                            key={option.type}
                            onClick={() => handleRedemption(reward, option.type)}
                            disabled={redeeming === reward.id || !option.canAfford}
                            variant="outline"
                            size="lg"
                            className="w-full"
                          >
                            {redeeming === reward.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Gift className="w-4 h-4 mr-2" />
                                {option.type === 'portfolio' ? 'Use Portfolio Points' : 'Use Referral Points'}
                              </>
                            )}
                          </Button>
                        ))
                      ) : (
                        <Button disabled className="w-full">
                          Insufficient Points
                        </Button>
                      )}
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="convert" className="space-y-4">
          <CardEnhanced variant="elevated" className="card-hover">
            <CardEnhancedHeader>
              <CardEnhancedTitle className="flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2 text-openkey-blue" />
                Point Conversion
              </CardEnhancedTitle>
            </CardEnhancedHeader>
            <CardEnhancedContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Convert From</label>
                  <Select value={conversionFrom} onValueChange={(value: any) => setConversionFrom(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portfolio_points">
                        Portfolio Points ({balance?.portfolioPoints.toLocaleString()})
                      </SelectItem>
                      <SelectItem value="gift_card_value">
                        Gift Card Value (${balance?.giftCardValue.toFixed(2)})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Convert To</label>
                  <Select value={conversionTo} onValueChange={(value: any) => setConversionTo(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gift_card_value">Gift Card Value</SelectItem>
                      <SelectItem value="portfolio_points">Portfolio Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <Input
                  type="number"
                  placeholder={`Minimum ${conversionRates?.minimumConversion || 500}`}
                  value={conversionAmount}
                  onChange={(e) => setConversionAmount(e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Conversion Rate: {conversionRates?.pointsToGiftCard || 100} points = $1
                </p>
              </div>
              
              <Button 
                onClick={handleConversion}
                disabled={converting || !conversionAmount}
                className="w-full"
                variant="blue"
              >
                {converting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                )}
                Convert Points
              </Button>
            </CardEnhancedContent>
          </CardEnhanced>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedRedemptionSystem;
