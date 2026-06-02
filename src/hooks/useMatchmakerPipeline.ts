import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PipelineStats {
  new: number;
  pending: number;
  under_review: number;
  approved: number;
  total_housed: number;
  urgent_followups: number;
  pending_payouts: number;
  this_month_placements: number;
}

export interface ActivityItem {
  id: string;
  type: 'application' | 'approval' | 'request';
  message: string;
  timestamp: string;
  tenant_name?: string;
  property_address?: string;
}

export const useMatchmakerPipeline = () => {
  return useQuery({
    queryKey: ['matchmaker-pipeline'],
    queryFn: async () => {
      // Fetch application stats
      const { data: applications, error: appError } = await supabase
        .from('property_applications')
        .select('*');

      if (appError) throw appError;

      const stats: PipelineStats = {
        new: applications?.filter(a => a.status === 'pending' && !a.assigned_worker_id).length || 0,
        pending: applications?.filter(a => a.status === 'pending').length || 0,
        under_review: applications?.filter(a => a.status === 'under_review').length || 0,
        approved: applications?.filter(a => a.status === 'approved' && !a.move_in_date).length || 0,
        total_housed: applications?.filter(a => a.status === 'approved' && a.move_in_date).length || 0,
        urgent_followups: applications?.filter(a => 
          a.priority_level === 'urgent' && 
          ['pending', 'under_review'].includes(a.status)
        ).length || 0,
        pending_payouts: 0, // Will be calculated from payouts
        this_month_placements: 0, // Will be calculated
      };

      // Calculate pending payouts
      const { data: payouts } = await supabase
        .from('worker_payouts')
        .select('total_amount')
        .eq('status', 'pending');

      stats.pending_payouts = payouts?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;

      // Calculate this month's placements
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: monthPlacements } = await supabase
        .from('property_applications')
        .select('id')
        .eq('status', 'approved')
        .gte('updated_at', firstDay);

      stats.this_month_placements = monthPlacements?.length || 0;

      // Fetch recent activity
      const { data: recentApps } = await supabase
        .from('property_applications')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          properties (address),
          profiles!property_applications_tenant_id_fkey (first_name, last_name)
        `)
        .order('updated_at', { ascending: false })
        .limit(10);

      const activity: ActivityItem[] = (recentApps || []).map(app => {
        const tenantName = `${(app.profiles as any)?.first_name || ''} ${(app.profiles as any)?.last_name || ''}`.trim();
        const propertyAddress = (app.properties as any)?.address || 'Unknown Property';
        
        let message = '';
        let type: 'application' | 'approval' | 'request' = 'application';
        
        if (app.status === 'approved') {
          message = `${tenantName} → Approved for ${propertyAddress}`;
          type = 'approval';
        } else if (app.status === 'pending') {
          message = `${tenantName} → Application submitted for ${propertyAddress}`;
          type = 'application';
        } else {
          message = `${tenantName} → Status: ${app.status}`;
          type = 'application';
        }

        return {
          id: app.id,
          type,
          message,
          timestamp: app.updated_at,
          tenant_name: tenantName,
          property_address: propertyAddress,
        };
      });

      return { stats, activity };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
