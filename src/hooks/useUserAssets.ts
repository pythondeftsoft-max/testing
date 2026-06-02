import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ASSET_KEYS } from '@/lib/queryKeys';
import { generateMockAssets } from '@/utils/mockFinancialReports';

export interface UserAsset {
  id: string;
  portfolio_id: string;
  asset_category_id: string;
  asset_name: string;
  asset_description: string | null;
  asset_value: number;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  current_value: number | null;
  annual_income: number;
  annual_expenses: number;
  metadata: {
    symbol?: string;
    asset_type?: string;
    sector?: string;
    quantity?: number; // Number of shares/coins/units
    current_price?: number; // Price per share/coin/unit
    allocation_percent?: number; // Portfolio allocation percentage
    performance_24h?: number;
    performance_7d?: number;
    performance_30d?: number;
    performance_ytd?: number;
    [key: string]: any;
  };
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_display_name: string;
  category_color_theme: string;
}

// Toggle to use mock data for testing
const USE_MOCK_DATA = false;

export const useUserAssets = (userId?: string) => {
  return useQuery({
    queryKey: ASSET_KEYS.userAssets(userId || ''),
    queryFn: async () => {
      // Use mock data if flag is enabled
      if (USE_MOCK_DATA) {
        // Simulate network delay for realistic testing
        await new Promise(resolve => setTimeout(resolve, 500));
        return generateMockAssets('mixed-portfolio') as UserAsset[];
      }

      const { data, error } = await supabase.rpc('get_user_assets', {
        user_id_param: userId || null
      });

      if (error) {
        console.error('Error fetching user assets:', error);
        throw error;
      }

      return data as UserAsset[];
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
    retry: 2,
  });
};