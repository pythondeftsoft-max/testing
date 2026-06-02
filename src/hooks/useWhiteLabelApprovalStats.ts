import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface ApprovalStats {
  pendingCount: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  averageReviewTimeHours: number;
}

export const useWhiteLabelApprovalStats = () => {
  return useQuery({
    queryKey: ['white-label-approval-stats'],
    queryFn: async (): Promise<ApprovalStats> => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Get pending count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('white_label_configs')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      if (pendingError) throw pendingError;

      // Get approved this month
      const { count: approvedThisMonth, error: approvedError } = await supabase
        .from('white_label_configs')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved')
        .gte('approved_at', thirtyDaysAgo);

      if (approvedError) throw approvedError;

      // Get rejected this month
      const { count: rejectedThisMonth, error: rejectedError } = await supabase
        .from('white_label_configs')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'rejected')
        .gte('approved_at', thirtyDaysAgo);

      if (rejectedError) throw rejectedError;

      // Calculate average review time
      const { data: approvalRequests, error: reviewError } = await supabase
        .from('white_label_approval_requests')
        .select('created_at, reviewed_at')
        .not('reviewed_at', 'is', null)
        .gte('reviewed_at', thirtyDaysAgo);

      if (reviewError) throw reviewError;

      let averageReviewTimeHours = 0;
      if (approvalRequests && approvalRequests.length > 0) {
        const totalHours = approvalRequests.reduce((sum, request) => {
          const created = new Date(request.created_at).getTime();
          const reviewed = new Date(request.reviewed_at!).getTime();
          const hours = (reviewed - created) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        averageReviewTimeHours = Math.round(totalHours / approvalRequests.length);
      }

      return {
        pendingCount: pendingCount || 0,
        approvedThisMonth: approvedThisMonth || 0,
        rejectedThisMonth: rejectedThisMonth || 0,
        averageReviewTimeHours,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
