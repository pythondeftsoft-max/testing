import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface InsuranceFilters {
  policyType?: string;
  tenantStatus?: string;
  propertyIds?: string[]; // Changed to array to handle multiple properties
  expirationDateFrom?: Date;
  expirationDateTo?: Date;
}

interface InsuranceRecord {
  id: string;
  property_address: string;
  unit_number?: string;
  tenant_name: string;
  provider_name: string;
  policy_number: string;
  policy_type: string;
  liability_coverage: number;
  personal_property_coverage: number;
  effective_date: string;
  expiration_date: string;
  premium_amount: number;
  is_active: boolean;
}

export const useRentersInsuranceData = (portfolioId?: string, filters?: InsuranceFilters, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['renters-insurance', portfolioId, filters],
    queryFn: async (): Promise<InsuranceRecord[]> => {
      console.log('🔍 === RENTERS INSURANCE QUERY DEBUG START ===');
      console.log('📋 Input Parameters:', { portfolioId, filters, options });
      
      // Step 1: Handle portfolio filtering first (if needed) to get property IDs
      console.log('🏠 Step 1: Handling portfolio filtering...');
      let propertyIdsFilter: string[] | null = null;
      
      if (portfolioId && portfolioId !== 'everything' && portfolioId !== 'all') {
        console.log(`📌 Getting properties for portfolio: ${portfolioId}`);
        const { data: portfolioProperties, error: portfolioError } = await supabase
          .from('properties')
          .select('id')
          .eq('portfolio_id', portfolioId);
        
        if (portfolioError) {
          console.error('❌ Error fetching portfolio properties:', portfolioError);
          throw portfolioError;
        }
        
        if (portfolioProperties && portfolioProperties.length > 0) {
          propertyIdsFilter = portfolioProperties.map(p => p.id);
          console.log(`📌 Found ${propertyIdsFilter.length} properties in portfolio`);
        } else {
          console.log('📌 No properties found in portfolio - returning empty results');
          return [];
        }
      } else {
        console.log('📌 No portfolio filter (showing all portfolios) - portfolioId:', portfolioId);
      }

      // Step 2: Build base query with proper resource embedding
      console.log('🏗️ Step 2: Building base query with proper resource embedding...');
      let query = supabase
        .from('tenant_insurance')
        .select(`
          id,
          tenant_id,
          provider_name,
          policy_number,
          policy_type,
          liability_coverage,
          personal_property_coverage,
          effective_date,
          expiration_date,
          premium_amount,
          is_active,
          property_id,
          unit_id,
          properties!left (
            id,
            address,
            portfolio_id
          ),
          profiles!left (
            first_name,
            last_name
          )
        `);

      console.log('✅ Base query created with proper resource embedding');

      // Step 3: Apply property ID filtering from portfolio filter (if needed)
      if (propertyIdsFilter && propertyIdsFilter.length > 0) {
        console.log(`📌 Applying portfolio filter: filtering by ${propertyIdsFilter.length} property IDs`);
        query = query.in('property_id', propertyIdsFilter);
      }

      // Step 4: Property filtering with enhanced debug - Fixed to handle multiple properties
      console.log('🏘️ Step 4: Applying property filter...');
      if (filters?.propertyIds && filters.propertyIds.length > 0) {
        console.log(`📌 Property filter detected: ${filters.propertyIds.length} properties/units selected`);
        console.log(`📌 Selected IDs:`, filters.propertyIds);
        
        // Separate property IDs from unit IDs
        const propertyIds = filters.propertyIds.filter(id => !id.includes('unit-'));
        const unitIds = filters.propertyIds.filter(id => id.includes('unit-')).map(id => id.replace('unit-', ''));
        
        console.log(`🏠 Property IDs to filter:`, propertyIds);
        console.log(`🏠 Unit IDs to filter:`, unitIds);
        
        // Apply property or unit filtering
        if (propertyIds.length > 0 && unitIds.length > 0) {
          // Both properties and units selected - use OR logic
          console.log(`🏠 Filtering by both property_id IN (${propertyIds.join(', ')}) OR unit_id IN (${unitIds.join(', ')})`);
          query = query.or(`property_id.in.(${propertyIds.join(',')}),unit_id.in.(${unitIds.join(',')})`);
        } else if (propertyIds.length > 0) {
          // Only properties selected
          console.log(`🏠 Filtering by property_id IN (${propertyIds.join(', ')})`);
          query = query.in('property_id', propertyIds);
        } else if (unitIds.length > 0) {
          // Only units selected
          console.log(`🏠 Filtering by unit_id IN (${unitIds.join(', ')})`);
          query = query.in('unit_id', unitIds);
        }
      } else {
        console.log('📌 No property filter (showing all properties) - propertyIds is undefined or empty');
      }

      // Step 5: Policy type filtering with debug - Fixed to handle undefined
      console.log('📋 Step 5: Applying policy type filter...');
      if (filters?.policyType) {
        console.log(`📌 Filtering by policy_type: ${filters.policyType}`);
        query = query.eq('policy_type', filters.policyType);
      } else {
        console.log('📌 No policy type filter (showing all policy types) - policyType is undefined');
      }

      // Step 6: Status filtering with debug - Fixed to handle undefined
      console.log('✅ Step 6: Applying tenant status filter...');
      if (filters?.tenantStatus === 'active') {
        console.log('📌 Filtering for active tenants only');
        query = query.eq('is_active', true);
      } else if (filters?.tenantStatus === 'inactive') {
        console.log('📌 Filtering for inactive tenants only');
        query = query.eq('is_active', false);
      } else {
        console.log('📌 No tenant status filter (showing all statuses) - tenantStatus is undefined or "all"');
      }

      // Step 7: Date range filtering with debug
      console.log('📅 Step 7: Applying date range filters...');
      if (filters?.expirationDateFrom) {
        const fromDate = filters.expirationDateFrom.toISOString().split('T')[0];
        console.log(`📌 Expiration date from: ${fromDate}`);
        query = query.gte('expiration_date', fromDate);
      } else {
        console.log('📌 No start date filter');
      }
      
      if (filters?.expirationDateTo) {
        const toDate = filters.expirationDateTo.toISOString().split('T')[0];
        console.log(`📌 Expiration date to: ${toDate}`);
        query = query.lte('expiration_date', toDate);
      } else {
        console.log('📌 No end date filter');
      }

      // Step 8: Execute query with comprehensive logging
      console.log('🚀 Step 8: Executing query...');
      console.log('📝 Final query filters applied:', {
        portfolio: portfolioId !== 'everything' ? portfolioId : 'ALL',
        propertyIds: filters?.propertyIds ? filters.propertyIds : 'ALL (undefined)',
        policyType: filters?.policyType || 'ALL (undefined)',
        tenantStatus: filters?.tenantStatus || 'ALL (undefined)',
        dateRange: filters?.expirationDateFrom || filters?.expirationDateTo ? 
          `${filters?.expirationDateFrom?.toISOString().split('T')[0] || 'no-start'} to ${filters?.expirationDateTo?.toISOString().split('T')[0] || 'no-end'}` : 'ALL'
      });

      const { data, error } = await query.order('expiration_date', { ascending: true });

      // Step 9: Result analysis
      console.log('📊 Step 9: Analyzing query results...');
      if (error) {
        console.error('❌ Query error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ Query executed successfully');
      console.log('📈 Raw data count:', data?.length || 0);
      console.log('📋 Sample raw record (first item):', data?.[0]);
      
      // Log each record for debugging
      if (data && data.length > 0) {
        console.log('📝 All raw records:');
        data.forEach((record, index) => {
          console.log(`   ${index + 1}:`, {
            id: record.id,
            tenant_id: record.tenant_id,
            property_id: record.property_id,
            unit_id: record.unit_id,
            policy_type: record.policy_type,
            is_active: record.is_active,
            property_address: record.properties?.address,
            tenant_name: record.profiles ? `${record.profiles.first_name} ${record.profiles.last_name}` : 'No Profile'
          });
        });
      } else {
        console.log('❌ No records returned from database');
      }

      // Step 10: Transform data with debug
      console.log('🔄 Step 10: Transforming data...');
      console.log(`📊 Records to transform: ${(data || []).length}`);
      
      const transformedData = (data || []).map((record: any, index: number) => {
        console.log(`🔍 Raw record ${index + 1}:`, {
          id: record.id,
          properties: record.properties,
          profiles: record.profiles,
          provider_name: record.provider_name
        });
        
        const transformed = {
          id: record.id,
          property_address: record.properties?.address || 'Unknown Address',
          unit_number: record.unit_id, // This would need to be joined from units table if needed
          tenant_name: record.profiles 
            ? `${record.profiles.first_name || ''} ${record.profiles.last_name || ''}`.trim()
            : 'Unknown Tenant',
          provider_name: record.provider_name,
          policy_number: record.policy_number,
          policy_type: record.policy_type,
          liability_coverage: record.liability_coverage || 0,
          personal_property_coverage: record.personal_property_coverage || 0,
          effective_date: record.effective_date,
          expiration_date: record.expiration_date,
          premium_amount: record.premium_amount || 0,
          is_active: record.is_active,
        };
        
        console.log(`   Transformed ${index + 1}:`, transformed);
        return transformed;
      });

      console.log('🎯 Final transformed data count:', transformedData.length);
      console.log('🔍 === RENTERS INSURANCE QUERY DEBUG END ===');
      
      return transformedData;
    },
    enabled: options?.enabled ?? false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};