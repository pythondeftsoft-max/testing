import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Check, Loader2 } from 'lucide-react';
import { useBackgroundCheckPayment } from '@/hooks/useBackgroundCheckPayment';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BackgroundCheckPurchaseCardProps {
  userId: string;
}

export const BackgroundCheckPurchaseCard = ({ userId }: BackgroundCheckPurchaseCardProps) => {
  const { createPaymentSession, loading } = useBackgroundCheckPayment();
  
  const { data: bgCheckProduct, isLoading } = useQuery({
    queryKey: ['background-check-product'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'Background Check')
        .eq('is_active', true)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No active background check plan found
          return null;
        }
        throw error;
      }
      return data;
    },
  });

  const handlePurchase = async () => {
    await createPaymentSession(userId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!bgCheckProduct) {
    return null;
  }

  const features = Array.isArray(bgCheckProduct.features) 
    ? bgCheckProduct.features 
    : [];
  const price = (bgCheckProduct.price / 100).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {bgCheckProduct.name}
        </CardTitle>
        <CardDescription>
          {bgCheckProduct.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">${price}</span>
          <span className="text-muted-foreground">per check</span>
        </div>
        
        <ul className="space-y-2 text-sm">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{String(feature)}</span>
            </li>
          ))}
        </ul>

        <Button 
          onClick={handlePurchase} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Processing...' : 'Buy Background Check'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Payment processed securely through Stripe
        </p>
      </CardContent>
    </Card>
  );
};
