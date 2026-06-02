
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PortfolioDistribution {
  id: string;
  user_id: string;
  user_name: string;
  distribution_percent: number;
  role_tag?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateDistributionParams {
  portfolio_id: string;
  user_id: string;
  distribution_percent: number;
  role_tag?: string;
}

interface UpdateDistributionParams {
  id: string;
  distribution_percent: number;
  role_tag?: string;
  active: boolean;
}

export const usePortfolioDistribution = (portfolioId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all distributions for a portfolio
  const { data: distributions, isLoading } = useQuery({
    queryKey: ['portfolio-distributions', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_distributions', {
        p_portfolio_id: portfolioId
      });

      if (error) {
        console.error('Error fetching portfolio distributions:', error);
        throw error;
      }

      return data as PortfolioDistribution[];
    },
    enabled: !!portfolioId,
  });

  // Get remaining percentage available
  const { data: remainingPercent } = useQuery({
    queryKey: ['portfolio-remaining-percent', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_remaining_percent', {
        p_portfolio_id: portfolioId
      });

      if (error) {
        console.error('Error fetching remaining percentage:', error);
        throw error;
      }

      return data as number;
    },
    enabled: !!portfolioId,
  });

  // Check if portfolio distribution totals 100%
  const { data: isComplete } = useQuery({
    queryKey: ['portfolio-distribution-complete', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('validate_portfolio_distribution_total', {
        p_portfolio_id: portfolioId
      });

      if (error) {
        console.error('Error validating distribution total:', error);
        throw error;
      }

      return data as boolean;
    },
    enabled: !!portfolioId,
  });

  // Create new distribution
  const createDistribution = useMutation({
    mutationFn: async (params: CreateDistributionParams) => {
      const { data, error } = await supabase
        .from('portfolio_points_distribution')
        .insert([params])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-distributions', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-remaining-percent', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-distribution-complete', portfolioId] });
      toast({
        title: "Distribution Added",
        description: "Portfolio points distribution has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create distribution",
        variant: "destructive",
      });
    },
  });

  // Update distribution
  const updateDistribution = useMutation({
    mutationFn: async (params: UpdateDistributionParams) => {
      const { data, error } = await supabase
        .from('portfolio_points_distribution')
        .update({
          distribution_percent: params.distribution_percent,
          role_tag: params.role_tag,
          active: params.active,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-distributions', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-remaining-percent', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-distribution-complete', portfolioId] });
      toast({
        title: "Distribution Updated",
        description: "Portfolio points distribution has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update distribution",
        variant: "destructive",
      });
    },
  });

  // Delete distribution
  const deleteDistribution = useMutation({
    mutationFn: async (distributionId: string) => {
      const { error } = await supabase
        .from('portfolio_points_distribution')
        .delete()
        .eq('id', distributionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-distributions', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-remaining-percent', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-distribution-complete', portfolioId] });
      toast({
        title: "Distribution Removed",
        description: "Portfolio points distribution has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove distribution",
        variant: "destructive",
      });
    },
  });

  const totalAllocated = distributions?.reduce((sum, dist) => sum + (dist.active ? dist.distribution_percent : 0), 0) || 0;

  return {
    distributions,
    remainingPercent,
    isComplete,
    totalAllocated,
    loading: isLoading,
    createDistribution,
    updateDistribution,
    deleteDistribution,
  };
};
