import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MarketAlert {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity';
  operator: 'price_above' | 'price_below' | 'change_pct_up' | 'change_pct_down';
  threshold: number;
  is_active: boolean;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMarketAlertData {
  symbol: string;
  asset_type: MarketAlert['asset_type'];
  operator: MarketAlert['operator'];
  threshold: number;
  cooldown_minutes?: number;
  notes?: string;
}

export interface UpdateMarketAlertData extends Partial<CreateMarketAlertData> {
  is_active?: boolean;
}

export const ALERT_KEYS = {
  all: ['market-alerts'] as const,
  userAlerts: (userId: string) => [...ALERT_KEYS.all, 'user', userId] as const,
};

export const useMarketAlerts = (userId?: string) => {
  return useQuery({
    queryKey: ALERT_KEYS.userAlerts(userId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching market alerts:', error);
        throw error;
      }

      return data as MarketAlert[];
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });
};

export const useCreateMarketAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertData: CreateMarketAlertData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('market_alerts')
        .insert({
          ...alertData,
          user_id: user.id,
          cooldown_minutes: alertData.cooldown_minutes || 60,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating market alert:', error);
        throw error;
      }

      return data as MarketAlert;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ALERT_KEYS.userAlerts(data.user_id) });
      toast({
        title: 'Alert Created',
        description: `Created alert for ${data.symbol}`,
      });
    },
    onError: (error) => {
      console.error('Failed to create alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to create alert. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateMarketAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateMarketAlertData }) => {
      const { data, error } = await supabase
        .from('market_alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating market alert:', error);
        throw error;
      }

      return data as MarketAlert;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ALERT_KEYS.userAlerts(data.user_id) });
      toast({
        title: 'Alert Updated',
        description: `Updated alert for ${data.symbol}`,
      });
    },
    onError: (error) => {
      console.error('Failed to update alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alert. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteMarketAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('market_alerts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting market alert:', error);
        throw error;
      }

      return id;
    },
    onSuccess: (_, alertId) => {
      // Invalidate all user alerts queries since we don't know the user_id here
      queryClient.invalidateQueries({ queryKey: ALERT_KEYS.all });
      toast({
        title: 'Alert Deleted',
        description: 'Market alert has been deleted',
      });
    },
    onError: (error) => {
      console.error('Failed to delete alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete alert. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useEvaluateMarketAlerts = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (observations?: Record<string, { price: number; changePct24h?: number }>) => {
      const { data, error } = await supabase.functions.invoke('evaluate-market-alerts', {
        body: { observations }
      });

      if (error) {
        console.error('Error evaluating market alerts:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.triggered && data.triggered.length > 0) {
        let description = `${data.triggered.length} alert${data.triggered.length > 1 ? 's' : ''} triggered`;
        
        // Add email status to toast
        if (data.channelInfo?.emailedNow > 0) {
          description += ' • Email queued';
        } else if (data.channelInfo?.deferredToDigest > 0) {
          description += ' • Added to daily digest';
        }
        
        toast({
          title: 'Market Alerts Triggered',
          description,
        });
      }
    },
    onError: (error) => {
      console.error('Failed to evaluate alerts:', error);
      // Don't show error toast for alert evaluation failures to avoid noise
    },
  });
};