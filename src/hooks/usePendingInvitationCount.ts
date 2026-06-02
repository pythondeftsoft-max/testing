import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePendingInvitationCount = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPendingCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setPendingCount(0);
        setLoading(false);
        return;
      }

      const { count, error } = await supabase
        .from('portfolio_asset_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString());

      if (error) throw error;

      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending invitation count:', error);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCount();

    // Set up real-time subscription for invitations
    const channel = supabase
      .channel('invitation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_asset_invitations'
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { pendingCount, loading, refetch: fetchPendingCount };
};