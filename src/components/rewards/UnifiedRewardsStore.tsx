
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Gift, ArrowRightLeft, History, Star, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import RewardsTab from '@/components/RewardsTab';
import UnifiedTransactionHistory from '@/components/unified/UnifiedTransactionHistory';

interface UnifiedRewardsStoreProps {
  userId: string;
  currentBalance: number;
  onBalanceUpdate: (newBalance: number) => void;
  spendLocked?: boolean;
}

interface ConversionRates {
  pointsToGiftCard: number;
  giftCardToPoints: number;
  conversionFee: number;
  minimumConversion: number;
}

const UnifiedRewardsStore = ({ userId, currentBalance, onBalanceUpdate, spendLocked = false }: UnifiedRewardsStoreProps) => {
  const [conversionRates, setConversionRates] = useState<ConversionRates | null>(null);
  const [converting, setConverting] = useState(false);
  const [conversionAmount, setConversionAmount] = useState<string>('');
  const [conversionFrom, setConversionFrom] = useState<'portfolio_points' | 'gift_card_value'>('portfolio_points');
  const [conversionTo, setConversionTo] = useState<'portfolio_points' | 'gift_card_value'>('gift_card_value');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchConversionRates();
  }, []);

  const fetchConversionRates = async () => {
    try {
      // Mock conversion rates for now
      setConversionRates({
        pointsToGiftCard: 100,
        giftCardToPoints: 100,
        conversionFee: 0,
        minimumConversion: 500
      });
    } catch (error) {
      console.error('Error fetching conversion rates:', error);
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
      
      // Mock conversion logic - in real implementation this would call an edge function
      toast({
        title: "Conversion Successful",
        description: `Successfully converted ${amount} ${conversionFrom.replace('_', ' ')} to ${conversionTo.replace('_', ' ')}`,
      });

      setConversionAmount('');
      onBalanceUpdate(currentBalance); // Refresh balance
      
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full grid-cols-3 !bg-white">
          <TabsTrigger value="catalog" className="data-[state=active]:bg-openkey-blue data-[state=active]:text-white">
            <Gift className="w-4 h-4 mr-2" />
            Rewards Catalog
          </TabsTrigger>
          <TabsTrigger value="conversion" className="data-[state=active]:bg-openkey-blue data-[state=active]:text-white">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Points Conversion
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-openkey-blue data-[state=active]:text-white">
            <History className="w-4 h-4 mr-2" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-6">
          <RewardsTab 
            userId={userId} 
            currentBalance={currentBalance}
            onBalanceUpdate={onBalanceUpdate}
            spendLocked={spendLocked}
          />
        </TabsContent>

        <TabsContent value="conversion" className="mt-6">
          <CardEnhanced variant="elevated" className="card-hover">
            <CardEnhancedHeader>
              <CardEnhancedTitle className="flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2 text-openkey-blue" />
                Point Conversion
              </CardEnhancedTitle>
            </CardEnhancedHeader>
            <CardEnhancedContent className="space-y-6">
              <div className="bg-gradient-to-r from-openkey-blue/5 to-openkey-gold/5 border border-openkey-blue/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-900">Available Points</p>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-openkey-gold" />
                      <p className="text-2xl font-bold text-openkey-gold">{currentBalance.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-900">Conversion Rate</p>
                    <p className="text-lg font-semibold text-openkey-gold">
                      {conversionRates?.pointsToGiftCard || 100} pts = $1
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning message about one-way conversion */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">Important:</p>
                    <p className="text-amber-800">
                      Point conversions are <strong>permanent</strong> and <strong>cannot be reversed</strong>. 
                      Gift card value cannot be converted back to points.
                    </p>
                  </div>
                </div>
              </div>

              {/* One-way conversion display */}
              <div className="bg-gradient-to-r from-openkey-blue/10 to-openkey-gold/10 border border-openkey-blue/30 rounded-lg p-4">
                <div className="flex items-center justify-center gap-3 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-openkey-gold" />
                    <span>Portfolio Points</span>
                  </div>
                  <ArrowRightLeft className="h-5 w-5 text-openkey-blue" />
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-green-600" />
                    <span>Gift Card Value</span>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  One-way conversion only
                </p>
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

        <TabsContent value="history" className="mt-6">
          <UnifiedTransactionHistory userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedRewardsStore;
