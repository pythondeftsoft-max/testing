import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { PROPERTIES_KEYS } from '@/lib/queryKeys';
import { useEffect } from 'react';

interface Property {
  id: string;
  address: string;
  portfolio_id?: string;
  monthly_rent?: number;
  status?: string;
  bedrooms?: number;
  country?: string;
}

export const useUserProperties = (userId: string, rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();
  
  console.log('🏠 [USER_PROPERTIES_DEBUG] useUserProperties hook called:', { 
    userId, 
    rawPortfolioId, 
    normalizedPortfolioId: portfolioId,
    userIdValid: !!userId, 
    userIdType: typeof userId,
    timestamp: new Date().toISOString()
  });

  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    if (userId) {
      console.log('🏠 [USER_PROPERTIES_DEBUG] Portfolio changed, invalidating cache:', { userId, portfolioId });
      queryClient.invalidateQueries({ 
        queryKey: PROPERTIES_KEYS.all,
        exact: false 
      });
    }
  }, [userId, portfolioId, queryClient]);
  
  return useQuery({
    queryKey: PROPERTIES_KEYS.list(`userId:${userId}-portfolio:${portfolioId || 'all'}`),
    queryFn: async (): Promise<Property[]> => {
      console.log('🏠 [USER_PROPERTIES_DEBUG] useUserProperties queryFn executing:', { userId, portfolioId, userIdIsString: typeof userId === 'string', userIdLength: userId?.length });
      
      if (!userId) {
      console.error('🏠 [USER_PROPERTIES_DEBUG] CRITICAL: No userId provided, returning empty array. userId value:', userId, 'Type:', typeof userId);
        return [];
      }

      try {
        // First verify we have a valid session and auth.uid()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🏠 [USER_PROPERTIES_DEBUG] Session check:', { 
          hasSession: !!session, 
          sessionUserId: session?.user?.id,
          propUserId: userId,
          matchesUserId: session?.user?.id === userId,
          sessionError,
          sessionAccessToken: session?.access_token ? 'present' : 'missing'
        });

        // CRITICAL: If session user ID doesn't match prop user ID, this is a major auth issue
        if (session?.user?.id !== userId) {
          console.error('🏠 [USER_PROPERTIES_DEBUG] CRITICAL AUTH MISMATCH:', {
            sessionUserId: session?.user?.id,
            propUserId: userId,
            hasSession: !!session,
            sessionEmail: session?.user?.email
          });
        }

        // Test auth.uid() directly with a simple query
        const { data: authTest, error: authTestError } = await supabase
          .from('properties')
          .select('owner_id')
          .eq('owner_id', userId)
          .limit(1);
        
        console.log('🏠 [USER_PROPERTIES_DEBUG] Direct auth test query result:', {
          authTestData: authTest,
          authTestError,
          authTestCount: authTest?.length || 0
        });

        // Test with RLS bypassed to see if it's an RLS issue
        const { data: allPropsTest, error: allPropsError } = await supabase
          .from('properties')
          .select('id, address, owner_id, portfolio_id')
          .limit(5);
        
        console.log('🏠 [USER_PROPERTIES_DEBUG] All properties test (first 5):', {
          allPropsTestData: allPropsTest,
          allPropsError,
          availableOwners: allPropsTest?.map(p => p.owner_id).filter((id, index, array) => array.indexOf(id) === index)
        });

        let query = supabase
          .from('properties')
          .select('id, address, portfolio_id, monthly_rent, status, bedrooms, country')
          .eq('owner_id', userId)
          .order('address');

        // Filter by portfolio if specified (portfolioId is already normalized)
        if (portfolioId) {
          console.log('🏠 [USER_PROPERTIES_DEBUG] Adding portfolio filter:', portfolioId);
          query = query.eq('portfolio_id', portfolioId);
        } else {
          console.log('🏠 [USER_PROPERTIES_DEBUG] No portfolio filter applied (showing all user properties). Portfolio ID:', portfolioId);
        }

        // Add explicit .is('deleted_at', null) to exclude deleted properties
        query = query.is('deleted_at', null);

        console.log('🏠 [USER_PROPERTIES_DEBUG] About to execute query with filters:', {
          owner_id: userId,
          portfolio_id: portfolioId && portfolioId !== 'all' && portfolioId !== 'everything' ? portfolioId : 'no filter',
          deleted_at: 'IS NULL'
        });

        const { data, error } = await query;

        console.log('🏠 [USER_PROPERTIES_DEBUG] Query result:', { 
          dataCount: data?.length || 0, 
          error, 
          userId,
          portfolioId,
          sampleData: data?.slice(0, 2)
        });

        if (error) {
          console.error('🏠 [USER_PROPERTIES_DEBUG] Error fetching user properties:', error);
          throw error;
        }

        // Final test: Try hardcoded user ID that we know has properties
        if (data?.length === 0) {
          console.log('🏠 [USER_PROPERTIES_DEBUG] Zero results - testing with known user ID...');
          const { data: hardcodedTest, error: hardcodedError } = await supabase
            .from('properties')
            .select('id, address, owner_id')
            .eq('owner_id', 'ccb8536c-80d1-4834-9614-169b9a7caede')
            .limit(3);
          
          console.log('🏠 [USER_PROPERTIES_DEBUG] Hardcoded test result:', {
            hardcodedTestData: hardcodedTest,
            hardcodedError,
            hardcodedCount: hardcodedTest?.length || 0
          });
        }

        console.log('🏠 [USER_PROPERTIES_DEBUG] Returning data:', data?.length || 0, 'properties');
        return data || [];
      } catch (error) {
        console.error('🔥 [USER_PROPERTIES_DEBUG] Unexpected error fetching properties:', error);
        return [];
      }
    },
    enabled: Boolean(userId),
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    refetchOnMount: true,
    // Remove initialData to prevent cache conflicts
  });
};