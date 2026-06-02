import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationQuota {
  canApply: boolean;
  remainingApplications: number;
  isSubscriber: boolean;
  subscriptionTier: string;
  loading: boolean;
  error: string | null;
}

export const useApplicationQuota = (userId?: string) => {
  const [quota, setQuota] = useState<ApplicationQuota>({
    canApply: false,
    remainingApplications: 0,
    isSubscriber: false,
    subscriptionTier: 'free',
    loading: true,
    error: null,
  });

  const checkQuota = async () => {
    console.log('[ApplicationQuota] Checking quota for userId:', userId);
    
    if (!userId) {
      console.log('[ApplicationQuota] No userId provided, skipping quota check');
      setQuota(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setQuota(prev => ({ ...prev, loading: true, error: null }));

      console.log('[ApplicationQuota] Calling check_application_quota RPC');
      const { data, error } = await supabase.rpc('check_application_quota', {
        p_tenant_id: userId
      });

      console.log('[ApplicationQuota] RPC response:', { data, error });

      if (error) throw error;

      if (data && data.length > 0) {
        const quotaData = data[0];
        console.log('[ApplicationQuota] Quota data received:', quotaData);
        
        setQuota({
          canApply: quotaData.can_apply,
          remainingApplications: quotaData.remaining_applications,
          isSubscriber: quotaData.is_subscriber,
          subscriptionTier: quotaData.subscription_tier || 'free',
          loading: false,
          error: null,
        });
      } else {
        console.warn('[ApplicationQuota] No quota data returned');
        setQuota(prev => ({
          ...prev,
          loading: false,
          error: 'No quota data available'
        }));
      }
    } catch (error: any) {
      console.error('[ApplicationQuota] Error checking quota:', error);
      setQuota(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to check quota'
      }));
    }
  };

  const consumeQuota = async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase.rpc('consume_application_quota', {
        p_tenant_id: userId
      });

      if (error) throw error;

      if (data) {
        // Refresh quota after consumption
        await checkQuota();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error consuming application quota:', error);
      setQuota(prev => ({
        ...prev,
        error: error.message || 'Failed to consume quota'
      }));
      return false;
    }
  };

  useEffect(() => {
    checkQuota();
  }, [userId]);

  return {
    ...quota,
    refetch: checkQuota,
    consumeQuota,
  };
};