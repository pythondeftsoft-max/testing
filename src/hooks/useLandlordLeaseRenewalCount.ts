import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLandlordLeaseRenewalCount = (landlordId?: string, portfolioId?: string) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!landlordId) return;

    const fetchCount = async () => {
      try {
        let query = supabase
          .from('lease_renewals')
          .select(`
            id,
            properties!inner(owner_id, portfolio_id)
          `)
          .eq('properties.owner_id', landlordId)
          .eq('renewal_status', 'pending');

        // Apply portfolio filter if not "everything"
        if (portfolioId && portfolioId !== 'everything') {
          query = query.eq('properties.portfolio_id', portfolioId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching lease renewal count:', error);
          setPendingCount(0);
        } else {
          setPendingCount(data?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching lease renewal count:', error);
        setPendingCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // Set up real-time subscription for lease renewals
    const subscription = supabase
      .channel('lease_renewal_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lease_renewals',
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [landlordId, portfolioId]);

  return { pendingCount, loading };
};