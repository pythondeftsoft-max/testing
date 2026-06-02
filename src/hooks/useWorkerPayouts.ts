import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerPayout {
  id: string;
  worker_id: string;
  worker_name: string;
  period: string;
  placements_count: number;
  base_earnings: number;
  bonuses: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
}

export const useWorkerPayouts = (workerId?: string) => {
  const queryClient = useQueryClient();

  const payouts = useQuery({
    queryKey: ['worker-payouts', workerId],
    queryFn: async () => {
      let query = supabase
        .from('worker_payouts')
        .select(`
          *,
          profiles!worker_payouts_worker_id_fkey (first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (workerId) {
        query = query.eq('worker_id', workerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(payout => ({
        ...payout,
        worker_name: `${(payout.profiles as any)?.first_name || ''} ${(payout.profiles as any)?.last_name || ''}`.trim(),
      })) as WorkerPayout[];
    },
  });

  const updatePayoutStatus = useMutation({
    mutationFn: async ({ 
      payoutId, 
      status, 
      paymentDate, 
      paymentMethod, 
      notes 
    }: { 
      payoutId: string; 
      status: 'pending' | 'approved' | 'paid' | 'cancelled';
      paymentDate?: string;
      paymentMethod?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('worker_payouts')
        .update({
          status,
          payment_date: paymentDate || null,
          payment_method: paymentMethod || null,
          notes: notes || null,
        })
        .eq('id', payoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-payouts'] });
    },
  });

  const calculatePayout = useMutation({
    mutationFn: async ({ 
      workerId, 
      period 
    }: { 
      workerId: string; 
      period: string;
    }) => {
      // Get placements for the period
      const { data: applications, error: appError } = await supabase
        .from('property_applications')
        .select('*, created_at, updated_at, priority_level')
        .eq('assigned_worker_id', workerId)
        .eq('status', 'approved')
        .gte('updated_at', `${period}-01`)
        .lt('updated_at', `${period}-32`);

      if (appError) throw appError;

      const placementsCount = applications?.length || 0;
      let baseEarnings = placementsCount * 100; // $100 per placement
      let bonuses = 0;

      // Calculate bonuses
      applications?.forEach(app => {
        // Priority placement bonus
        if (app.priority_level === 'urgent') {
          bonuses += 50;
        }
        
        // Fast placement bonus (< 7 days)
        const createdDate = new Date(app.created_at);
        const approvedDate = new Date(app.updated_at);
        const daysDiff = Math.floor((approvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 7) {
          bonuses += 50;
        }
      });

      // Volume bonus (10+ placements)
      if (placementsCount >= 10) {
        bonuses += 250;
      }

      const totalAmount = baseEarnings + bonuses;

      // Create or update payout
      const { data: existing } = await supabase
        .from('worker_payouts')
        .select('*')
        .eq('worker_id', workerId)
        .eq('period', period)
        .single();

      if (existing) {
        const { error: updateError } = await supabase
          .from('worker_payouts')
          .update({
            placements_count: placementsCount,
            base_earnings: baseEarnings,
            bonuses: bonuses,
            total_amount: totalAmount,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('worker_payouts')
          .insert({
            worker_id: workerId,
            period,
            placements_count: placementsCount,
            base_earnings: baseEarnings,
            bonuses: bonuses,
            total_amount: totalAmount,
            status: 'pending',
          });

        if (insertError) throw insertError;
      }

      return { placementsCount, baseEarnings, bonuses, totalAmount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-payouts'] });
    },
  });

  return {
    payouts,
    updatePayoutStatus,
    calculatePayout,
  };
};
