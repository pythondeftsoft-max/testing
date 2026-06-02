import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface OpenTasksFilters {
  portfolioId?: string;
  propertyIds?: string[];
  unitIds?: string[];
  assignedToIds?: string[];
  categories?: string[];
  dateFrom: Date;
  dateTo: Date;
}

interface OpenTask {
  id: string;
  task_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  submitted_date: string;
  due_date?: string;
  property_address: string;
  unit_number?: string;
  unit_id?: string;
  assigned_to_name: string;
  estimated_cost: number;
  active_for: string;
}

export const useOpenTasksData = (
  filters: OpenTasksFilters | null,
  options: { enabled: boolean }
) => {
  const queryClient = useQueryClient();
  const normalizedPortfolioId = normalizePortfolioId(filters?.portfolioId);
  
  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    if (filters) {
      console.log('🔍 [OPEN_TASKS] Portfolio changed, invalidating cache:', { 
        portfolioId: normalizedPortfolioId 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['open-tasks'],
        exact: false 
      });
    }
  }, [normalizedPortfolioId, queryClient]);

  return useQuery({
    queryKey: ['open-tasks', { 
      ...filters, 
      portfolioId: normalizedPortfolioId 
    }],
    queryFn: async (): Promise<OpenTask[]> => {
      if (!filters) return [];

      console.log('🔍 [OPEN_TASKS] Starting comprehensive debugging...');
      console.log('🔍 [OPEN_TASKS] Fetching open tasks with filters:', {
        ...filters,
        filtersApplied: {
          portfolioFilter: normalizedPortfolioId && filters.portfolioId !== 'everything',
          propertyFilter: filters.propertyIds && filters.propertyIds.length > 0,
          unitFilter: filters.unitIds && filters.unitIds.length > 0,
          categoryFilter: filters.categories && filters.categories.length > 0,
          assignedToFilter: filters.assignedToIds && filters.assignedToIds.length > 0
        }
      });

      // ============ STEP 1: Test basic query without any filters ============
      console.log('🔍 [STEP 1] Testing basic query without filters...');
      const basicTestQuery = supabase
        .from('maintenance_requests')
        .select('id, title, status, submitted_date, properties!inner(owner_id)')
        .in('status', ['pending', 'in_progress']);
      
      const currentUser = await supabase.auth.getUser();
      console.log('🔍 [STEP 1] Current user ID:', currentUser.data.user?.id);
      
      if (currentUser.data.user?.id) {
        const basicTestWithOwner = basicTestQuery.eq('properties.owner_id', currentUser.data.user.id);
        const { data: basicTestData, error: basicTestError } = await basicTestWithOwner;
        
        console.log('🔍 [STEP 1] Basic test results:', {
          error: basicTestError,
          count: basicTestData?.length || 0,
          sampleTask: basicTestData?.[0] || null
        });
        
        if (basicTestError) {
          console.error('🚨 [STEP 1] Basic test failed:', basicTestError);
        }
      }

      // ============ STEP 2: Build the main query step by step ============
      console.log('🔍 [STEP 2] Building main query step by step...');
      
      // Build the base query for open maintenance requests (pending or in_progress)
      let query = supabase
        .from('maintenance_requests')
        .select(`
          id,
          task_id,
          title,
          description,
          category,
          priority,
          status,
          submitted_date,
          due_date,
          estimated_cost,
          unit_id,
          assigned_vendor_id,
          properties!inner(
            id,
            address,
            portfolio_id,
            owner_id
          ),
          property_units(
            id,
            unit_number
          ),
          maintenance_vendors(
            id,
            company_name,
            contact_name
          )
        `)
        .in('status', ['pending', 'in_progress']);
      
      console.log('🔍 [STEP 2a] Base query built with status filter: [pending, in_progress]');

      // Apply date range filter with proper timestamp handling
      const startOfDay = new Date(filters.dateFrom);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log('🔍 [STEP 2b] Date range filters:', {
        originalFrom: filters.dateFrom.toISOString(),
        originalTo: filters.dateTo.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        truncatedFrom: filters.dateFrom.toISOString().split('T')[0],
        truncatedTo: filters.dateTo.toISOString().split('T')[0]
      });

      query = query
        .gte('submitted_date', startOfDay.toISOString())
        .lte('submitted_date', endOfDay.toISOString())
        .order('submitted_date', { ascending: false });
      
      console.log('🔍 [STEP 2b] Added date range filter');

      // ============ STEP 3: Add owner filter first ============
      console.log('🔍 [STEP 3] Adding owner filter...');
      if (currentUser.data.user?.id) {
        query = query.eq('properties.owner_id', currentUser.data.user.id);
        console.log('🔍 [STEP 3] Added owner_id filter:', currentUser.data.user.id);
      } else {
        console.error('🚨 [STEP 3] No current user found!');
        return [];
      }

      // ============ STEP 4: Test query after owner + date filters ============
      console.log('🔍 [STEP 4] Testing query after owner + date filters...');
      const { data: intermediateData, error: intermediateError } = await query;
      console.log('🔍 [STEP 4] Intermediate results (owner + date + status only):', {
        error: intermediateError,
        count: intermediateData?.length || 0,
        sampleTasks: intermediateData?.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          submitted_date: t.submitted_date,
          status: t.status,
          portfolio_id: t.properties?.portfolio_id
        })) || []
      });

      if (intermediateError) {
        console.error('🚨 [STEP 4] Intermediate query failed:', intermediateError);
        throw intermediateError;
      }

      // If no data at this point, the issue is basic filtering
      if (!intermediateData || intermediateData.length === 0) {
        console.log('🚨 [STEP 4] NO DATA after basic filters - issue is with owner/date/status filters!');
        return [];
      }

      // ============ STEP 5: Apply remaining filters one by one ============
      console.log('🔍 [STEP 5] Applying remaining filters one by one...');

      // Apply portfolio filter if specified
      if (filters.portfolioId && filters.portfolioId !== 'everything') {
        console.log('🔍 [STEP 5a] Applying portfolio filter:', normalizedPortfolioId);
        if (normalizedPortfolioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedPortfolioId)) {
          query = query.eq('properties.portfolio_id', normalizedPortfolioId);
          console.log('🔍 [STEP 5a] Portfolio filter added');
        }
      } else {
        console.log('🔍 [STEP 5a] Portfolio filter: showing ALL portfolios including null');
        // When "everything" is selected, we don't filter by portfolio_id at all
        // This includes properties with null portfolio_id and all other portfolios
      }

      // Apply property filter
      if (filters.propertyIds && filters.propertyIds.length > 0) {
        console.log('🔍 [STEP 5b] Applying property filter:', filters.propertyIds);
        query = query.in('property_id', filters.propertyIds);
      } else {
        console.log('🔍 [STEP 5b] No property filter - showing all properties');
      }

      // Apply unit filter  
      if (filters.unitIds && filters.unitIds.length > 0) {
        console.log('🔍 [STEP 5c] Applying unit filter:', filters.unitIds);
        query = query.in('unit_id', filters.unitIds);
      } else {
        console.log('🔍 [STEP 5c] No unit filter - showing all units');
      }

      // Apply category filter
      if (filters.categories && filters.categories.length > 0) {
        console.log('🔍 [STEP 5d] Applying category filter:', filters.categories);
        query = query.in('category', filters.categories);
      } else {
        console.log('🔍 [STEP 5d] No category filter - showing all categories');
      }

      // Apply vendor filter - first get vendor IDs for selected company names
      if (filters.assignedToIds && filters.assignedToIds.length > 0) {
        console.log('🔍 [STEP 5e] Applying vendor filter for names:', filters.assignedToIds);
        
        // Get vendor IDs for the selected company names
        const { data: vendors, error: vendorError } = await supabase
          .from('maintenance_vendors')
          .select('id, company_name')
          .in('company_name', filters.assignedToIds);
          
        console.log('🔍 [STEP 5e] Vendor lookup results:', {
          error: vendorError,
          vendorsFound: vendors?.length || 0,
          vendors: vendors?.map(v => ({ id: v.id, name: v.company_name })) || []
        });
          
        if (vendorError) {
          console.error('🚨 [STEP 5e] Vendor lookup error:', vendorError);
          throw vendorError;
        }
        
        if (vendors && vendors.length > 0) {
          const vendorIds = vendors.map(v => v.id);
          console.log('🔍 [STEP 5e] Found vendor IDs:', vendorIds);
          query = query.in('assigned_vendor_id', vendorIds);
        } else {
          console.log('🔍 [STEP 5e] No vendors found for names:', filters.assignedToIds);
          // If no vendors found for the selected names, return empty results
          query = query.eq('assigned_vendor_id', '00000000-0000-0000-0000-000000000000');
        }
      } else {
        console.log('🔍 [STEP 5e] No vendor filter - showing all vendors');
      }
       
      console.log('🔍 [STEP 6] Executing final query...');
      console.log('🔍 [STEP 6] Final query filters summary:', {
        portfolioFilter: filters.portfolioId !== 'everything' ? normalizedPortfolioId : 'ALL',
        propertyFilter: filters.propertyIds?.length || 'ALL',
        unitFilter: filters.unitIds?.length || 'ALL', 
        categoryFilter: filters.categories?.length || 'ALL',
        vendorFilter: filters.assignedToIds?.length || 'ALL'
      });

      const { data, error } = await query;

      if (error) {
        console.error('🚨 [STEP 6] Final query error:', error);
        console.error('🚨 [STEP 6] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('🔍 [STEP 6] Final raw data results:', {
        count: data?.length || 0,
        totalFiltersApplied: {
          status: true,
          dateRange: true,
          owner: true,
          portfolio: filters.portfolioId !== 'everything',
          properties: (filters.propertyIds?.length || 0) > 0,
          units: (filters.unitIds?.length || 0) > 0,
          categories: (filters.categories?.length || 0) > 0,
          vendors: (filters.assignedToIds?.length || 0) > 0
        }
      });
      
      if (data && data.length > 0) {
        console.log('🔍 [STEP 6] Sample final raw tasks (first 3):', 
          data.slice(0, 3).map(task => ({
            id: task.id,
            title: task.title,
            property_address: task.properties?.address,
            portfolio_id: task.properties?.portfolio_id,
            unit_id: task.unit_id,
            category: task.category,
            status: task.status,
            submitted_date: task.submitted_date,
            assigned_vendor: task.maintenance_vendors?.company_name
          }))
        );
      } else {
        console.log('🚨 [STEP 6] NO FINAL DATA - All filters eliminated all tasks!');
        console.log('🔍 [STEP 6] Debugging - let me check what would happen without each filter...');
        
        // Test without vendor filter
        if (filters.assignedToIds && filters.assignedToIds.length > 0) {
          console.log('🔍 [STEP 6-DEBUG] Testing without vendor filter...');
          const testQueryWithoutVendor = supabase
            .from('maintenance_requests')
            .select('id, title, assigned_vendor_id, maintenance_vendors(company_name)')
            .in('status', ['pending', 'in_progress'])
            .eq('properties.owner_id', currentUser.data.user.id)
            .gte('submitted_date', startOfDay.toISOString())
            .lte('submitted_date', endOfDay.toISOString());
            
          const { data: testDataWithoutVendor } = await testQueryWithoutVendor;
          console.log('🔍 [STEP 6-DEBUG] Data without vendor filter:', {
            count: testDataWithoutVendor?.length || 0,
            vendorNames: testDataWithoutVendor?.map(t => t.maintenance_vendors?.company_name || 'Unassigned').filter((v, i, arr) => arr.indexOf(v) === i) || []
          });
        }
      }

      if (!data) return [];

      // Transform the data to match our interface
      console.log('🔍 [STEP 7] Transforming data...');
      let transformedData: OpenTask[] = data.map((task: any) => ({
        id: task.id,
        task_id: task.task_id || 'N/A',
        title: task.title || 'Untitled Task',
        description: task.description || '',
        category: task.category || 'General Maintenance',
        priority: task.priority || 'medium',
        status: task.status,
        submitted_date: task.submitted_date,
        due_date: task.due_date,
        property_address: task.properties?.address || 'Unknown Property',
        unit_number: task.property_units?.unit_number,
        unit_id: task.unit_id,
        assigned_to_name: task.maintenance_vendors 
          ? task.maintenance_vendors.company_name || task.maintenance_vendors.contact_name || 'Unnamed Vendor'
          : 'Unassigned',
        estimated_cost: task.estimated_cost || 0,
        active_for: formatDistanceToNow(new Date(task.submitted_date), { addSuffix: false }),
      }));

      // No need for post-processing vendor filter since it's now handled in the database query

      console.log('🔍 [STEP 7] Transformation complete:');
      console.log('🔍 [STEP 7] Final transformed tasks count:', transformedData.length);
      if (transformedData.length > 0) {
        console.log('🔍 [STEP 7] Sample final transformed task:', transformedData[0]);
        console.log('🔍 [STEP 7] All transformed task IDs:', transformedData.map(t => t.id));
      } else {
        console.log('🚨 [STEP 7] NO TRANSFORMED DATA - Return empty array');
      }
      
      console.log('🔍 [FINAL] =================================');
      console.log('🔍 [FINAL] DEBUGGING SUMMARY:');
      console.log('🔍 [FINAL] Input filters:', filters);
      console.log('🔍 [FINAL] Raw data count:', data?.length || 0);
      console.log('🔍 [FINAL] Final return count:', transformedData.length);
      console.log('🔍 [FINAL] =================================');
      
      return transformedData;
    },
    enabled: options.enabled && !!filters,
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    refetchOnMount: true
  });
};