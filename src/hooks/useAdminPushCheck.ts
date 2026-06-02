import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminPushCheck {
  hasActiveAdminPush: boolean;
  loading: boolean;
  error: string | null;
}

export const useAdminPushCheck = (tenantId?: string, propertyId?: string) => {
  const [pushCheck, setPushCheck] = useState<AdminPushCheck>({
    hasActiveAdminPush: false,
    loading: true,
    error: null,
  });

  const checkAdminPush = async () => {
    if (!tenantId || !propertyId) {
      setPushCheck(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setPushCheck(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from('property_pushes')
        .select('id, expires_at, quota_bypass')
        .eq('tenant_id', tenantId)
        .eq('property_id', propertyId)
        .eq('quota_bypass', true)
        .gte('expires_at', new Date().toISOString())
        .limit(1);

      if (error) throw error;

      setPushCheck({
        hasActiveAdminPush: data && data.length > 0,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error checking admin push:', error);
      setPushCheck({
        hasActiveAdminPush: false,
        loading: false,
        error: error.message || 'Failed to check admin push'
      });
    }
  };

  useEffect(() => {
    checkAdminPush();
  }, [tenantId, propertyId]);

  return {
    ...pushCheck,
    refetch: checkAdminPush,
  };
};