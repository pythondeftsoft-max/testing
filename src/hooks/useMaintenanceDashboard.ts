
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { useEffect } from 'react';

export interface MaintenanceDashboardMetrics {
  total_requests: number;
  pending_requests: number;
  in_progress_requests: number;
  completed_requests: number;
  overdue_requests: number;
  total_costs: number;
  avg_completion_time: number;
  active_vendors: number;
  scheduled_appointments: number;
  emergency_requests: number;
}

export const useMaintenanceDashboard = (rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();

  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    console.log('🔍 [MAINTENANCE_DASHBOARD] Portfolio changed, invalidating cache:', { portfolioId });
    queryClient.invalidateQueries({ 
      queryKey: ['maintenance-dashboard'],
      exact: false 
    });
  }, [portfolioId, queryClient]);

  const dashboardQuery = useQuery({
    queryKey: ['maintenance-dashboard', portfolioId],
    queryFn: async () => {
      console.log('Fetching maintenance dashboard metrics for portfolio:', portfolioId);
      
      // Build query with proper filtering using inner join
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties!inner(id, owner_id, portfolio_id),
          maintenance_costs(*),
          maintenance_appointments(*)
        `);

      // Apply portfolio filter if provided (portfolioId is already normalized)
      if (portfolioId) {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching maintenance dashboard data:', error);
        throw error;
      }

      // Calculate metrics from the data
      const requests = data || [];
      const totalRequests = requests.length;
      const pendingRequests = requests.filter(r => r.status === 'pending').length;
      const inProgressRequests = requests.filter(r => r.status === 'in_progress').length;
      const completedRequests = requests.filter(r => r.status === 'completed').length;
      const overdueRequests = requests.filter(r => 
        r.status !== 'completed' && r.priority === 'urgent'
      ).length;
      
      // Calculate total costs
      const totalCosts = requests.reduce((sum, request) => {
        if (request.maintenance_costs) {
          return sum + request.maintenance_costs.reduce((costSum: number, cost: any) => 
            costSum + (cost.total_cost || 0), 0
          );
        }
        return sum;
      }, 0);

      // Calculate average completion time (simplified)
      const completedWithTime = requests.filter(r => r.status === 'completed' && r.completed_date);
      const avgCompletionTime = completedWithTime.length > 0 
        ? completedWithTime.reduce((sum, r) => {
            const created = new Date(r.created_at);
            const completed = new Date(r.completed_date);
            return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / completedWithTime.length
        : 0;

      // Get unique vendors
      const vendorIds = new Set();
      requests.forEach(request => {
        if (request.maintenance_appointments) {
          request.maintenance_appointments.forEach((apt: any) => {
            if (apt.vendor_id) vendorIds.add(apt.vendor_id);
          });
        }
      });

      // Count scheduled appointments
      const scheduledAppointments = requests.reduce((count, request) => {
        if (request.maintenance_appointments) {
          return count + request.maintenance_appointments.filter((apt: any) => 
            apt.status === 'scheduled'
          ).length;
        }
        return count;
      }, 0);

      const emergencyRequests = requests.filter(r => r.priority === 'emergency').length;

      const metrics: MaintenanceDashboardMetrics = {
        total_requests: totalRequests,
        pending_requests: pendingRequests,
        in_progress_requests: inProgressRequests,
        completed_requests: completedRequests,
        overdue_requests: overdueRequests,
        total_costs: totalCosts,
        avg_completion_time: avgCompletionTime,
        active_vendors: vendorIds.size,
        scheduled_appointments: scheduledAppointments,
        emergency_requests: emergencyRequests
      };

      console.log('Calculated maintenance dashboard metrics:', metrics);
      return metrics;
    },
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    refetchOnMount: true,
  });

  // Real-time subscription for all maintenance-related tables
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests'
        },
        (payload) => {
          console.log('Real-time maintenance request change affecting dashboard:', payload);
          queryClient.invalidateQueries({ queryKey: ['maintenance-dashboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_costs'
        },
        (payload) => {
          console.log('Real-time maintenance cost change affecting dashboard:', payload);
          queryClient.invalidateQueries({ queryKey: ['maintenance-dashboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_appointments'
        },
        (payload) => {
          console.log('Real-time maintenance appointment change affecting dashboard:', payload);
          queryClient.invalidateQueries({ queryKey: ['maintenance-dashboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_vendors'
        },
        (payload) => {
          console.log('Real-time maintenance vendor change affecting dashboard:', payload);
          queryClient.invalidateQueries({ queryKey: ['maintenance-dashboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    metrics: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error,
  };
};
