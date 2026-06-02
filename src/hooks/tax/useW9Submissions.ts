import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type W9Status = 'draft' | 'submitted' | 'verified' | 'rejected';

export interface W9Submission {
  id: string;
  landlord_id: string;
  agency_id: string | null;
  tax_year: number;
  legal_name: string;
  business_name: string | null;
  tax_classification: string;
  tin_type: 'ssn' | 'ein';
  tin_last_four: string | null;
  tin_verified: boolean;
  address_line1: string;
  address_line2: string | null;
  address_city: string;
  address_state: string;
  address_zip: string;
  signature_typed_name: string | null;
  signed_at: string | null;
  status: W9Status;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useLandlordW9Submissions = (landlordId?: string) => {
  return useQuery({
    queryKey: ['w9-submissions', 'landlord', landlordId],
    enabled: !!landlordId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landlord_w9_submissions')
        .select('*')
        .eq('landlord_id', landlordId!)
        .order('tax_year', { ascending: false });
      if (error) throw error;
      return (data || []) as W9Submission[];
    },
  });
};

export const useAgencyW9ReviewQueue = (agencyId?: string, status?: W9Status | 'all') => {
  return useQuery({
    queryKey: ['w9-submissions', 'agency', agencyId, status],
    enabled: !!agencyId,
    queryFn: async () => {
      let q = supabase
        .from('landlord_w9_submissions')
        .select('*')
        .eq('agency_id', agencyId!)
        .order('submitted_at', { ascending: false, nullsFirst: false });
      if (status && status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as W9Submission[];
    },
  });
};

export const useUpsertW9Submission = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: Partial<W9Submission> & { landlord_id: string }) => {
      if (payload.id) {
        const { data, error } = await supabase
          .from('landlord_w9_submissions')
          .update(payload as any)
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('landlord_w9_submissions')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['w9-submissions'] });
      toast({ title: 'W-9 saved' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: String(e.message || e), variant: 'destructive' }),
  });
};

export const useReviewW9Submission = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'verify' | 'reject'; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const update: any = {
        status: action === 'verify' ? 'verified' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      };
      if (action === 'verify') {
        update.tin_verified = true;
        update.tin_verified_at = new Date().toISOString();
        update.tin_verified_by = user?.id;
      } else {
        update.rejection_reason = reason || 'No reason provided';
      }
      const { error } = await supabase
        .from('landlord_w9_submissions')
        .update(update)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['w9-submissions'] });
      toast({ title: vars.action === 'verify' ? 'W-9 verified' : 'W-9 rejected' });
    },
    onError: (e: any) => toast({ title: 'Action failed', description: String(e.message || e), variant: 'destructive' }),
  });
};
