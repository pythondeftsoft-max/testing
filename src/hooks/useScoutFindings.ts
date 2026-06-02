import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useScoutFindings(status: 'active' | 'done') {
  return useQuery({
    queryKey: ['scout-findings', status],
    queryFn: async () => {
      let query = supabase
        .from('scout_leads' as any)
        .select('id, street_address, city, state, bedrooms, rent, source_url, listing_title, search_query, status, notes, created_at, reviewed_at')
        .order('created_at', { ascending: false });

      if (status === 'active') {
        query = query.eq('status', 'pending');
      } else {
        query = query.in('status', ['approved', 'called', 'dismissed']);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useUpdateScoutStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'called' | 'dismissed' | 'approved' }) => {
      const { error } = await supabase
        .from('scout_leads' as any)
        .update({ status, reviewed_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-findings'] });
    },
  });
}

export function usePromoteScoutLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lead, ownerId, portfolioId }: { lead: any; ownerId: string; portfolioId?: string }) => {
      // Create real property from lead
      const displayAddress = lead.street_address 
        ? `${lead.street_address}, ${lead.city}, ${lead.state}`
        : `${lead.city}, ${lead.state} (Pending Address)`;

      const { error: propError } = await supabase
        .from('properties')
        .insert({
          address: displayAddress,
          street_address: lead.street_address,
          city: lead.city,
          state: lead.state,
          country: 'US',
          bedrooms: lead.bedrooms,
          desired_rent: lead.rent,
          acquisition_source: 'scout_agent',
          owner_id: ownerId,
          portfolio_id: portfolioId || null,
          status: 'available',
          unit_count: 1,
          description: `${lead.listing_title ? lead.listing_title + ' | ' : ''}Source: ${lead.source_url}`,
          is_voucher_property: true,
          default_tenant_type: 'voucher',
        } as any);

      if (propError) throw propError;

      // Mark lead as approved
      const { error: updateError } = await supabase
        .from('scout_leads' as any)
        .update({ status: 'approved', reviewed_at: new Date().toISOString() } as any)
        .eq('id', lead.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-findings'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
