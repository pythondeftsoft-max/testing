import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortfolioTaxProfile {
  id: string;
  portfolio_id: string;
  legal_name: string;
  ein: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  edelivery_default: boolean;
  w9_required_for_payouts: boolean;
  iris_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const usePortfolioTaxProfile = (portfolioId?: string) => {
  return useQuery({
    queryKey: ['portfolioTaxProfile', portfolioId],
    enabled: !!portfolioId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('portfolio_tax_profiles')
        .select('*')
        .eq('portfolio_id', portfolioId!)
        .maybeSingle();

      if (error) throw error;
      return data as PortfolioTaxProfile | null;
    },
  });
};

export const usePortfolioTaxProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PortfolioTaxProfile> & { portfolio_id: string }) => {
      const { data, error } = await (supabase as any)
        .from('portfolio_tax_profiles')
        .upsert(payload, { onConflict: 'portfolio_id' })
        .select()
        .single();
      if (error) throw error;
      return data as PortfolioTaxProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolioTaxProfile'] });
      toast.success('Portfolio tax profile saved');
    },
    onError: (e: any) => toast.error(`Failed to save portfolio tax profile: ${e.message}`),
  });
};
