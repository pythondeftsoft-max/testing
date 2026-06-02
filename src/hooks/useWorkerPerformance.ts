import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerPerformanceData {
  worker_id: string;
  worker_name: string;
  territory_name: string | null;
  total_points: number;
  lease_signed_moves: number;
  paid_housed_moves: number;
  backwards_moves: number;
  conversion_rate: number;
  last_activity_date: string | null;
}

export interface WorkerPerformanceFilters {
  dateRange: { from: Date; to: Date };
  workerId?: string;
  territoryId?: string;
  entityType?: 'tenant' | 'property' | 'all';
}

export const useWorkerPerformance = (filters: WorkerPerformanceFilters) => {
  return useQuery({
    queryKey: ['worker-performance', filters],
    queryFn: async () => {
      const { dateRange, workerId, territoryId, entityType } = filters;

      // Build query for stage change events
      let query = supabase
        .from('stage_change_events')
        .select(`
          *,
          changed_by:profiles!stage_change_events_changed_by_id_fkey(
            id,
            first_name,
            last_name,
            email,
            territory_id
          )
        `)
        .eq('changed_by_type', 'worker')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      // Apply filters
      if (workerId) {
        query = query.eq('changed_by_id', workerId);
      }

      if (entityType && entityType !== 'all') {
        query = query.eq('entity_type', entityType);
      }

      const { data: events, error } = await query;

      if (error) throw error;

      // Group by worker and calculate metrics
      const workerStats = new Map<string, WorkerPerformanceData>();

      for (const event of events || []) {
        const worker = event.changed_by as any;
        if (!worker?.id) continue;

        // Filter by territory if specified
        if (territoryId && worker.territory_id !== territoryId) continue;

        const workerId = worker.id;
        const workerName = `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || worker.email || 'Unknown';

        if (!workerStats.has(workerId)) {
          workerStats.set(workerId, {
            worker_id: workerId,
            worker_name: workerName,
            territory_name: null, // Will be fetched separately if needed
            total_points: 0,
            lease_signed_moves: 0,
            paid_housed_moves: 0,
            backwards_moves: 0,
            conversion_rate: 0,
            last_activity_date: event.created_at,
          });
        }

        const stats = workerStats.get(workerId)!;

        // Update stats
        stats.total_points += event.points_earned || 0;

        // Count lease signed moves (tenant: seeking->applied, property: available->lease_signed)
        if (
          (event.entity_type === 'tenant' && event.to_stage === 'applied') ||
          (event.entity_type === 'property' && event.to_stage === 'lease_signed')
        ) {
          stats.lease_signed_moves++;
        }

        // Count paid/housed moves (tenant: approved->housed, property: lease_signed->housed)
        if (
          (event.entity_type === 'tenant' && event.to_stage === 'housed') ||
          (event.entity_type === 'property' && event.to_stage === 'housed')
        ) {
          stats.paid_housed_moves++;
        }

        // Count backwards moves
        if (!event.is_forward_move) {
          stats.backwards_moves++;
        }

        // Update last activity date
        if (new Date(event.created_at) > new Date(stats.last_activity_date || 0)) {
          stats.last_activity_date = event.created_at;
        }
      }

      // Calculate conversion rates
      const results = Array.from(workerStats.values()).map(stats => ({
        ...stats,
        conversion_rate: stats.lease_signed_moves > 0
          ? Math.round((stats.paid_housed_moves / stats.lease_signed_moves) * 100)
          : 0,
      }));

      // Sort by total points descending
      results.sort((a, b) => b.total_points - a.total_points);

      return results;
    },
  });
};

// Hook for aggregate KPIs
export const useWorkerPerformanceKPIs = (filters: WorkerPerformanceFilters) => {
  return useQuery({
    queryKey: ['worker-performance-kpis', filters],
    queryFn: async () => {
      const { dateRange, workerId, territoryId, entityType } = filters;

      let query = supabase
        .from('stage_change_events')
        .select('*')
        .eq('changed_by_type', 'worker')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (workerId) {
        query = query.eq('changed_by_id', workerId);
      }

      if (entityType && entityType !== 'all') {
        query = query.eq('entity_type', entityType);
      }

      const { data: events, error } = await query;

      if (error) throw error;

      // Calculate aggregate KPIs
      const totalPoints = events?.reduce((sum, e) => sum + (e.points_earned || 0), 0) || 0;
      const leaseSignedMoves = events?.filter(e =>
        (e.entity_type === 'tenant' && e.to_stage === 'applied') ||
        (e.entity_type === 'property' && e.to_stage === 'lease_signed')
      ).length || 0;
      const paidHousedMoves = events?.filter(e =>
        (e.entity_type === 'tenant' && e.to_stage === 'housed') ||
        (e.entity_type === 'property' && e.to_stage === 'housed')
      ).length || 0;
      const backwardsMoves = events?.filter(e => !e.is_forward_move).length || 0;
      const conversionRate = leaseSignedMoves > 0
        ? Math.round((paidHousedMoves / leaseSignedMoves) * 100)
        : 0;

      return {
        totalPoints,
        leaseSignedMoves,
        paidHousedMoves,
        backwardsMoves,
        conversionRate,
      };
    },
  });
};
