import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TerritoryWorkerPerformance {
  worker_id: string;
  worker_name: string;
  territory_id: string;
  territory_name: string;
  total_points: number;
  lease_signed_moves: number;
  paid_housed_moves: number;
  leaderboard_rank: number;
}

export interface TerritoryTotals {
  territory_id: string;
  territory_name: string;
  total_workers: number;
  total_points: number;
  total_lease_signed: number;
  total_paid_housed: number;
  avg_conversion_rate: number;
}

export const useTerritoryAnalytics = (
  territoryId: string | undefined,
  dateRange: { from: Date; to: Date }
) => {
  return useQuery({
    queryKey: ['territory-analytics', territoryId, dateRange],
    queryFn: async () => {
      if (!territoryId) return null;

      // Fetch territory details
      const { data: territoryData, error: territoryError } = await supabase
        .from('territories')
        .select('*')
        .eq('id', territoryId)
        .single();

      if (territoryError) throw territoryError;

      // Fetch all workers in this territory
      const { data: workersData, error: workersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('territory_id', territoryId);

      if (workersError) throw workersError;

      // Fetch stage change events for workers in this territory
      const { data: eventsData, error: eventsError } = await supabase
        .from('stage_change_events')
        .select('*')
        .in('changed_by_id', workersData.map(w => w.id))
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (eventsError) throw eventsError;

      // Calculate per-worker performance
      const workerPerformance = workersData.map(worker => {
        const workerEvents = eventsData.filter(e => e.changed_by_id === worker.id);
        
        return {
          worker_id: worker.id,
          worker_name: `${worker.first_name} ${worker.last_name}`,
          territory_id: territoryId,
          territory_name: territoryData.territory_name,
          total_points: workerEvents.reduce((sum, e) => sum + (e.points_earned || 0), 0),
          lease_signed_moves: workerEvents.filter(
            e => e.to_stage === 'lease_signed' && e.is_forward_move
          ).length,
          paid_housed_moves: workerEvents.filter(
            e => ['paid', 'housed', 'housed_paid'].includes(e.to_stage) && e.is_forward_move
          ).length,
          leaderboard_rank: 0, // Will be set after sorting
        };
      });

      // Sort by points and assign ranks
      workerPerformance.sort((a, b) => b.total_points - a.total_points);
      workerPerformance.forEach((worker, index) => {
        worker.leaderboard_rank = index + 1;
      });

      // Calculate territory totals
      const totals: TerritoryTotals = {
        territory_id: territoryId,
        territory_name: territoryData.territory_name,
        total_workers: workersData.length,
        total_points: workerPerformance.reduce((sum, w) => sum + w.total_points, 0),
        total_lease_signed: workerPerformance.reduce((sum, w) => sum + w.lease_signed_moves, 0),
        total_paid_housed: workerPerformance.reduce((sum, w) => sum + w.paid_housed_moves, 0),
        avg_conversion_rate: eventsData.length > 0
          ? (eventsData.filter(e => e.is_forward_move).length / eventsData.length) * 100
          : 0,
      };

      return {
        workers: workerPerformance,
        totals,
      };
    },
    enabled: !!territoryId && !!(dateRange.from && dateRange.to),
  });
};
