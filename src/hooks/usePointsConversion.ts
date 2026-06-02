import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ConvertPointsParams {
  points: number;
  notes?: string;
}

interface ConversionResult {
  success: boolean;
  points_converted: number;
  dollar_amount: number;
  fee_amount: number;
  new_balance: number;
}

export const usePointsConversion = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's current gift card value
  const { data: giftCardValue, isLoading: loadingGiftCardValue } = useQuery({
    queryKey: ['gift-card-value', userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const { data, error } = await supabase.rpc('get_user_gift_card_value', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching gift card value:', error);
        throw error;
      }

      return data as number;
    },
    enabled: !!userId,
  });

  // Get conversion history
  const { data: conversions, isLoading: loadingConversions } = useQuery({
    queryKey: ['point-conversions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('point_conversions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Convert points mutation
  const convertPointsMutation = useMutation({
    mutationFn: async (params: ConvertPointsParams) => {
      if (!userId) throw new Error('User ID required');
      
      // Validate points
      if (params.points <= 0) {
        throw new Error('Points must be greater than 0');
      }

      const { data, error } = await supabase.rpc('convert_points', {
        p_user_id: userId,
        p_points: params.points,
        p_notes: params.notes || null,
        p_direction: 'points_to_gift_card' // Hardcoded for security - one-way conversion only
      });

      if (error) throw error;
      return data as unknown as ConversionResult;
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['gift-card-value', userId] });
      queryClient.invalidateQueries({ queryKey: ['point-conversions', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-points', userId] });

      toast({
        title: "Points Converted Successfully",
        description: `Converted ${result.points_converted} points to $${result.dollar_amount.toFixed(2)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert points",
        variant: "destructive",
      });
    },
  });

  return {
    giftCardValue: giftCardValue || 0,
    conversions: conversions || [],
    loadingGiftCardValue,
    loadingConversions,
    convertPoints: convertPointsMutation.mutate,
    isConverting: convertPointsMutation.isPending,
  };
};