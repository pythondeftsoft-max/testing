
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserPointsSummary } from '@/hooks/useUserPoints';

export interface PointAdjustmentParams {
  userId: string;
  pointsChange: number;
  reason: string;
  notes?: string;
  adjustmentType: 'add' | 'subtract' | 'set';
}

export interface PointDelegationParams {
  fromUserId: string;
  toUserId: string;
  points: number;
  reason: string;
  notes?: string;
}

export const useAdminPointsManagement = () => {
  const queryClient = useQueryClient();

  const adjustUserPoints = useMutation({
    mutationFn: async (params: PointAdjustmentParams) => {
      const { userId, pointsChange, reason, notes, adjustmentType } = params;
      
      const { data, error } = await supabase.rpc('admin_adjust_user_points', {
        p_target_user_id: userId,
        p_adjustment_type: adjustmentType,
        p_points: pointsChange,
        p_reason: reason,
        p_notes: notes || null
      });

      if (error) throw error;
      return data?.[0]; // The RPC returns a table with single row
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['user-points-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-search'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-directory'] });
    },
  });

  const delegateUserPoints = useMutation({
    mutationFn: async (params: PointDelegationParams) => {
      const { fromUserId, toUserId, points, reason, notes } = params;
      
      const { data, error } = await supabase.rpc('admin_delegate_points', {
        p_from_user_id: fromUserId,
        p_to_user_id: toUserId,
        p_points: points,
        p_reason: reason,
        p_notes: notes || null
      });

      if (error) throw error;
      return data?.[0]; // The RPC returns a table with single row
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['user-points-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-search'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-directory'] });
    },
  });

  return {
    adjustUserPoints,
    isAdjusting: adjustUserPoints.isPending,
    delegateUserPoints,
    isDelegating: delegateUserPoints.isPending,
  };
};
