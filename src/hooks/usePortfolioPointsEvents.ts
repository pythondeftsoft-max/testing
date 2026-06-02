
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface AwardPortfolioPointsParams {
  portfolioId: string;
  sourceEventType: string;
  pointsAwarded: number;
  propertyId?: string;
  tenantId?: string;
  notes?: string;
}

export const usePortfolioPointsEvents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Award points for portfolio events
  const awardPortfolioPoints = useMutation({
    mutationFn: async (params: AwardPortfolioPointsParams) => {
      const { data, error } = await supabase.rpc('award_portfolio_points', {
        p_portfolio_id: params.portfolioId,
        p_source_event_type: params.sourceEventType,
        p_points_awarded: params.pointsAwarded,
        p_property_id: params.propertyId || null,
        p_tenant_id: params.tenantId || null,
        p_notes: params.notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-points', variables.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-points-summary', variables.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      
      toast({
        title: "Points Awarded",
        description: `Successfully awarded ${variables.pointsAwarded} points for ${variables.sourceEventType.replace(/_/g, ' ')}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to award points",
        variant: "destructive",
      });
    },
  });

  // Distribute portfolio points to team members
  const distributePortfolioPoints = useMutation({
    mutationFn: async (portfolioPointsId: string) => {
      const { data, error } = await supabase.rpc('distribute_portfolio_points', {
        p_portfolio_points_id: portfolioPointsId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-points'] });
      
      toast({
        title: "Points Distributed",
        description: "Portfolio points successfully distributed to team members",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to distribute points",
        variant: "destructive",
      });
    },
  });

  return {
    awardPortfolioPoints,
    distributePortfolioPoints,
  };
};
