import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationLimit {
  canAccept: boolean;
  currentCount: number;
  maxAllowed: number;
  isAtLimit: boolean;
  loading: boolean;
  error: string | null;
}

export const useUnitApplicationLimit = (unitId?: string) => {
  const [limit, setLimit] = useState<ApplicationLimit>({
    canAccept: true,
    currentCount: 0,
    maxAllowed: 6,
    isAtLimit: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!unitId) {
      setLimit({
        canAccept: true,
        currentCount: 0,
        maxAllowed: 6,
        isAtLimit: false,
        loading: false,
        error: null,
      });
      return;
    }

    checkLimit();
  }, [unitId]);

  const checkLimit = async () => {
    if (!unitId) return;

    try {
      setLimit(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.rpc('check_unit_application_limit', {
        p_unit_id: unitId,
      });

      if (error) throw error;

      const result = data as any;

      setLimit({
        canAccept: result.can_accept || false,
        currentCount: result.current_count || 0,
        maxAllowed: result.max_allowed || 6,
        isAtLimit: result.is_at_limit || false,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error checking application limit:', error);
      setLimit(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to check application limit',
      }));
    }
  };

  return {
    ...limit,
    refetch: checkLimit,
  };
};