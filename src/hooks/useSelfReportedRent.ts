import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface SelfReportedRentEntry {
  id: string;
  user_id: string;
  address_text: string;
  landlord_name: string | null;
  monthly_rent: number;
  currency_code: string;
  month: number;
  year: number;
  payment_date: string | null;
  proof_url: string | null;
  verification_status: 'unverified' | 'document_verified' | 'bank_verified' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  plaid_transaction_id: string | null;
  plaid_transaction_data: Record<string, unknown> | null;
  created_at: string;
}

export const useSelfReportedRent = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['self-reported-rent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('self_reported_rent')
        .select('*')
        .eq('user_id', user!.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data as SelfReportedRentEntry[];
    },
    enabled: !!user?.id,
  });
};

/** Delete a self-reported rent entry */
export const useDeleteSelfReportedRent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error, data } = await supabase
        .from('self_reported_rent')
        .delete()
        .eq('id', entryId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No rows were deleted. You may not have permission.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-reported-rent'] });
      queryClient.invalidateQueries({ queryKey: ['unified-rent-history'] });
      toast({ title: 'Payment deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete payment', description: err.message, variant: 'destructive' });
    },
  });
};

/** Group entries by address_text */
export const groupByAddress = (entries: SelfReportedRentEntry[]) => {
  const grouped: Record<string, SelfReportedRentEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.address_text]) grouped[entry.address_text] = [];
    grouped[entry.address_text].push(entry);
  }
  return grouped;
};
