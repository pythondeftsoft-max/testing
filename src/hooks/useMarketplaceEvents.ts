import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePreferences } from '@/contexts/PreferencesContext';

interface MarketplaceEventParams {
  eventType: 'guard_shown' | 'opt_in_clicked' | 'access_granted' | 'search_view_loaded' | 'search_performed' | 'application_started' | 'application_submitted' | 'card_shown' | 'cta_clicked';
  metadata?: Record<string, any>;
}

export const useMarketplaceEvents = () => {
  const { businessPhase, tenantContext } = usePreferences();

  return useMutation({
    mutationFn: async ({ eventType, metadata = {} }: MarketplaceEventParams) => {
      const { data, error } = await supabase
        .from('marketplace_events')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          event_type: eventType,
          metadata: {
            business_phase: businessPhase,
            tenant_type: tenantContext?.isVoucherHolder ? 'voucher' : 
                        tenantContext?.hasMarineTenancy ? 'marine' : 'none',
            ...metadata
          }
        });

      if (error) {
        console.warn('Failed to log marketplace event:', error);
        throw error;
      }

      return data;
    },
    onError: (error) => {
      console.warn('Marketplace event logging failed:', error);
    },
  });
};