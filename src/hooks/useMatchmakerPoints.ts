import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';

export const POINT_VALUES = {
  application_created: 50,
  application_approved: 100,
  tenant_housed: 200,
  fast_placement: 50,
  high_risk_housed: 75,
  perfect_match: 100,
  message_response: 10,
  daily_login: 5,
  streak_bonus: 25,
};

export interface LeaderboardEntry {
  worker_id: string;
  worker_name: string;
  total_points: number;
  placements_count: number;
  rank: number;
}

export const useMatchmakerPoints = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useAdminCheck();

  const leaderboard = useQuery({
    queryKey: ['matchmaker-leaderboard'],
    queryFn: async () => {
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const { data: stats, error } = await supabase
        .from('matchmaker_stats')
        .select(`
          worker_id,
          total_points,
          placements_count,
          profiles!matchmaker_stats_worker_id_fkey (first_name, last_name)
        `)
        .eq('period', currentPeriod)
        .order('total_points', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (stats || []).map((stat, index) => ({
        worker_id: stat.worker_id,
        worker_name: `${(stat.profiles as any)?.first_name || ''} ${(stat.profiles as any)?.last_name || ''}`.trim(),
        total_points: stat.total_points,
        placements_count: stat.placements_count,
        rank: index + 1,
      })) as LeaderboardEntry[];
    },
  });

  const userStats = useQuery({
    queryKey: ['matchmaker-user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const currentPeriod = new Date().toISOString().slice(0, 7);
      
      const { data, error } = await supabase
        .from('matchmaker_stats')
        .select('*')
        .eq('worker_id', user.id)
        .eq('period', currentPeriod)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    },
    enabled: !!user?.id,
  });

  const awardPoints = useMutation({
    mutationFn: async ({ 
      actionType, 
      applicationId,
      points 
    }: { 
      actionType: string; 
      applicationId?: string;
      points?: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Admins don't earn points
      if (isAdmin) {
        console.log('Admin action - no points awarded');
        return { pointsAwarded: 0 };
      }

      const pointsToAward = points || POINT_VALUES[actionType as keyof typeof POINT_VALUES] || 0;
      const currentPeriod = new Date().toISOString().slice(0, 7);

      // Record the action
      const { error: actionError } = await supabase
        .from('matchmaker_actions')
        .insert({
          worker_id: user.id,
          action_type: actionType,
          application_id: applicationId,
          points_earned: pointsToAward,
        });

      if (actionError) throw actionError;

      // Update or create stats
      const { data: existing } = await supabase
        .from('matchmaker_stats')
        .select('*')
        .eq('worker_id', user.id)
        .eq('period', currentPeriod)
        .single();

      if (existing) {
        const { error: updateError } = await supabase
          .from('matchmaker_stats')
          .update({
            total_points: existing.total_points + pointsToAward,
            placements_count: actionType.includes('housed') 
              ? existing.placements_count + 1 
              : existing.placements_count,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('matchmaker_stats')
          .insert({
            worker_id: user.id,
            period: currentPeriod,
            total_points: pointsToAward,
            placements_count: actionType.includes('housed') ? 1 : 0,
          });

        if (insertError) throw insertError;
      }

      return { pointsAwarded: pointsToAward };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchmaker-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['matchmaker-user-stats'] });
    },
  });

  return {
    leaderboard,
    userStats,
    awardPoints,
  };
};
