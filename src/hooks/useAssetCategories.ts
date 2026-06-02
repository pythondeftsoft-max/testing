
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AssetCategory } from '@/types/portfolio-assets';

export const useAssetCategories = () => {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      console.log('🔍 Fetching asset categories from database...');
      
      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Error fetching asset categories:', error);
        throw error;
      }

      console.log('✅ Asset categories fetched:', data?.length, 'categories');
      
      // Log the real_estate category specifically to verify subcategories
      const realEstateCategory = data?.find(cat => cat.name === 'real_estate');
      if (realEstateCategory) {
        console.log('🏠 Real Estate subcategories:', realEstateCategory.subcategories);
      }

      // Log the bonds category to verify subcategories
      const bondsCategory = data?.find(cat => cat.name === 'bonds');
      if (bondsCategory) {
        console.log('💰 Bonds subcategories:', bondsCategory.subcategories);
      }

      return data as AssetCategory[];
    },
    staleTime: 10000, // 10 seconds for development
  });
};
