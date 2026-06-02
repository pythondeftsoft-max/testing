
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Portfolio {
  id: string;
  client_name: string;
  property_count?: number;
}

export const useUserPortfolios = (userId: string) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPortfolios = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('useUserPortfolios: Fetching portfolios for user:', userId);

      // Use RPC function that handles account-level and portfolio-level access
      const { data, error } = await (supabase as any).rpc('get_user_accessible_portfolios', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching portfolios:', error);
        setError('Failed to fetch portfolios');
        toast({
          title: "Error",
          description: "Failed to load portfolios. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const portfoliosWithCount = ((data as any[]) || []).map((p: any) => ({
        id: p.id,
        client_name: p.client_name,
        property_count: p.property_count || 0
      }));

      console.log('useUserPortfolios: Found portfolios:', portfoliosWithCount);
      setPortfolios(portfoliosWithCount);
    } catch (err) {
      console.error('Error in fetchPortfolios:', err);
      setError('Failed to fetch portfolios');
      toast({
        title: "Error",
        description: "Failed to load portfolios. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refetch = () => {
    fetchPortfolios();
  };

  return { portfolios, loading, error, refetch };
};
