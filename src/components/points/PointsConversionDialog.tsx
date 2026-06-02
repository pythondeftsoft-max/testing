import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, CreditCard, ArrowRight } from 'lucide-react';
import { usePointsConversion } from '@/hooks/usePointsConversion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PointsConversionDialogProps {
  userId: string;
  currentPoints: number;
  trigger?: React.ReactNode;
}

export const PointsConversionDialog = ({ userId, currentPoints, trigger }: PointsConversionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [pointsToConvert, setPointsToConvert] = useState('');
  
  const { convertPoints, isConverting, giftCardValue } = usePointsConversion(userId);

  // Fetch user profile to determine user type
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();
      return data;
    }
  });

  // Fetch conversion rate based on user type
  const { data: conversionRate } = useQuery({
    queryKey: ['redemption-rate', userProfile?.user_type],
    queryFn: async () => {
      const configKey = userProfile?.user_type === 'tenant' 
        ? 'redemption_rate_tenant' 
        : 'redemption_rate_landlord';
      
      const { data } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', configKey)
        .single();
      
      return Number(data?.config_value) || 100;
    },
    enabled: !!userProfile
  });

  // Fetch minimum points based on user type
  const { data: minPoints } = useQuery({
    queryKey: ['redemption-min-points', userProfile?.user_type],
    queryFn: async () => {
      const configKey = userProfile?.user_type === 'tenant' 
        ? 'redemption_min_points_tenant' 
        : 'redemption_min_points_landlord';
      
      const { data } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', configKey)
        .single();
      
      return Number(data?.config_value) || 500;
    },
    enabled: !!userProfile
  });

  const effectiveRate = conversionRate || 100;
  const effectiveMinPoints = minPoints || 500;
  const dollarValue = pointsToConvert ? (parseInt(pointsToConvert) / effectiveRate) : 0;

  const handleConvert = () => {
    const points = parseInt(pointsToConvert);
    if (points >= effectiveMinPoints && points <= currentPoints) {
      convertPoints(
        { points },
        {
          onSuccess: () => {
            setOpen(false);
            setPointsToConvert('');
          }
        }
      );
    }
  };

  const isValidAmount = pointsToConvert && 
    parseInt(pointsToConvert) >= effectiveMinPoints && 
    parseInt(pointsToConvert) <= currentPoints;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Gift className="h-4 w-4" />
            Convert Points
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Convert Points to Gift Card
          </DialogTitle>
          <DialogDescription>
            Convert your portfolio points to gift card value at {effectiveRate} points = $1
            {userProfile?.user_type === 'tenant' && (
              <span className="block text-xs mt-1">💡 Earn more points through referrals!</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Balances */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Available Points</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-primary">{currentPoints.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gift Card Value</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-green-600">${giftCardValue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Input */}
          <div className="space-y-2">
            <Label htmlFor="points">Points to Convert</Label>
            <Input
              id="points"
              type="number"
              placeholder={`Minimum ${effectiveMinPoints} points`}
              value={pointsToConvert}
              onChange={(e) => setPointsToConvert(e.target.value)}
              min={effectiveMinPoints}
              max={currentPoints}
            />
            <div className="text-xs text-muted-foreground">
              Minimum: {effectiveMinPoints} points • Available: {currentPoints} points • Rate: {effectiveRate} pts = $1
            </div>
          </div>

          {/* Conversion Preview */}
          {pointsToConvert && (
            <Card className="bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversion Preview</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">{parseInt(pointsToConvert).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">points</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <div className="text-lg font-semibold text-green-600">${dollarValue.toFixed(2)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleConvert}
              disabled={!isValidAmount || isConverting}
            >
              {isConverting ? 'Converting...' : 'Convert Points'}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground text-center">
            Converted points cannot be reversed. Gift card value can be used for rewards and purchases.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};