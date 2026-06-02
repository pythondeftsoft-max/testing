import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth } from 'date-fns';

export interface MatchmakerStats {
  pendingApplications: number;
  underReview: number;
  activeConversations: number;
  monthlyApproved: number;
  monthlyApplications: number;
  placementRate: number;
}

export const useMatchmakerStats = () => {
  return useQuery({
    queryKey: ['matchmaker-stats'],
    queryFn: async () => {
      try {
        const startOfCurrentMonth = startOfMonth(new Date()).toISOString();

        // Get all applications with their statuses
        const { data: applications, error: appsError } = await supabase
          .from('property_applications')
          .select('id, status, created_at');

        if (appsError) throw appsError;

        // Count applications by status
        const statusCounts = applications?.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        // Get active conversations (unique application IDs with messages this month)
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('property_application_id')
          .gte('created_at', startOfCurrentMonth);

        if (messagesError) throw messagesError;

        const activeConversations = new Set(
          messages?.map(m => m.property_application_id).filter(Boolean)
        ).size;

        // Calculate monthly metrics
        const monthlyApplications = applications?.filter(
          app => new Date(app.created_at) >= new Date(startOfCurrentMonth)
        ).length || 0;

        const monthlyApproved = applications?.filter(
          app => app.status === 'approved' && new Date(app.created_at) >= new Date(startOfCurrentMonth)
        ).length || 0;

        // Calculate placement rate (approved / total applications)
        const totalApps = applications?.length || 0;
        const totalApproved = statusCounts['approved'] || 0;
        const placementRate = totalApps > 0 ? Math.round((totalApproved / totalApps) * 100) : 0;

        return {
          pendingApplications: statusCounts['pending'] || 0,
          underReview: statusCounts['under_review'] || 0,
          activeConversations,
          monthlyApproved,
          monthlyApplications,
          placementRate,
        } as MatchmakerStats;
      } catch (error) {
        console.error('Error fetching matchmaker stats:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};
