import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { useEffect } from 'react';

interface CompletedTasksFilters {
  portfolioId?: string;
  propertyIds?: string[];
  unitIds?: string[];
  assignedToIds?: string[];
  categories?: string[];
  dateFrom: Date;
  dateTo: Date;
}

interface CompletedTask {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  completed_date: string;
  property_address: string;
  unit_number?: string;
  unit_id?: string;
  assigned_to_name: string;
  estimated_cost: number;
  actual_cost: number;
}

export const useCompletedTasksData = (
  filters: CompletedTasksFilters | null,
  options: { enabled: boolean }
) => {
  const queryClient = useQueryClient();
  const normalizedPortfolioId = normalizePortfolioId(filters?.portfolioId);
  
  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    if (filters) {
      console.log('🔍 [COMPLETED_TASKS] Portfolio changed, invalidating cache:', { 
        portfolioId: normalizedPortfolioId 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['completed-tasks'],
        exact: false 
      });
    }
  }, [normalizedPortfolioId, queryClient]);

  return useQuery({
    queryKey: ['completed-tasks', { 
      ...filters, 
      portfolioId: normalizedPortfolioId 
    }],
    queryFn: async (): Promise<CompletedTask[]> => {
      if (!filters) return [];

      console.log('🔍 [COMPLETED_TASKS] Fetching with filters:', filters);

      // Get current user for owner filter with retry logic
      const currentUser = await supabase.auth.getUser();
      const userId = currentUser.data.user?.id;
      
      console.log('🔍 [COMPLETED_TASKS] Auth state:', {
        user: currentUser.data.user ? 'Present' : 'Missing',
        userId: userId || 'NULL',
        error: currentUser.error ? currentUser.error.message : 'None'
      });
      
      if (!userId) {
        console.error('🚨 [COMPLETED_TASKS] Authentication failed - no user ID available');
        if (currentUser.error) {
          console.error('🚨 [COMPLETED_TASKS] Auth error:', currentUser.error);
        }
        return [];
      }

      // Fix date range to include entire day - convert to next day for proper filtering
      const startDate = filters.dateFrom.toISOString().split('T')[0];
      const nextDay = new Date(filters.dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDate = nextDay.toISOString().split('T')[0];
      
      console.log('🔍 [COMPLETED_TASKS] Date range:', {
        from: startDate,
        to: `< ${endDate}`,
        originalTo: filters.dateTo.toISOString().split('T')[0]
      });

      // Build the base query for completed maintenance requests
      let query = supabase
        .from('maintenance_requests')
        .select(`
          id,
          title,
          description,
          category,
          priority,
          status,
          completed_date,
          estimated_cost,
          actual_cost,
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
        .eq('status', 'completed')
        .not('completed_date', 'is', null)
        .gte('completed_date', startDate)
        .lt('completed_date', endDate)
        .eq('properties.owner_id', userId)
        .order('completed_date', { ascending: false });

      // Apply portfolio filter (use normalized portfolio ID)
      if (normalizedPortfolioId) {
        console.log('🔍 [COMPLETED_TASKS] Applying portfolio filter for:', normalizedPortfolioId);
        // Include both properties with matching portfolio_id AND properties with NULL portfolio_id
        query = query.or(`properties.portfolio_id.eq.${normalizedPortfolioId},properties.portfolio_id.is.null`);
      }

      // Apply property filter
      if (filters.propertyIds && filters.propertyIds.length > 0) {
        query = query.in('property_id', filters.propertyIds);
      }

      // Apply unit filter  
      if (filters.unitIds && filters.unitIds.length > 0) {
        query = query.in('unit_id', filters.unitIds);
      }

      // Apply category filter
      if (filters.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching completed tasks:', error);
        throw error;
      }

      console.log('Raw completed tasks data:', data);

      if (!data) return [];

      // Transform the data to match our interface
      let transformedData: CompletedTask[] = data.map((task: any) => ({
        id: task.id,
        title: task.title || 'Untitled Task',
        description: task.description || '',
        category: task.category || 'General Maintenance',
        priority: task.priority || 'medium',
        status: task.status,
        completed_date: task.completed_date,
        property_address: task.properties?.address || 'Unknown Property',
        unit_number: task.property_units?.unit_number,
        unit_id: task.unit_id,
        assigned_to_name: task.maintenance_vendors 
          ? task.maintenance_vendors.company_name || task.maintenance_vendors.contact_name || 'Unnamed Vendor'
          : 'Unassigned',
        estimated_cost: task.estimated_cost || 0,
        actual_cost: task.actual_cost || 0,
      }));

      // Apply assigned to filter (post-processing since it involves transformed data)
      if (filters.assignedToIds && filters.assignedToIds.length > 0) {
        transformedData = transformedData.filter(task => {
          const assigneeName = task.assigned_to_name || 'Unassigned';
          return filters.assignedToIds!.includes(assigneeName);
        });
      }

      console.log('Transformed completed tasks:', transformedData);
      return transformedData;
    },
    enabled: options.enabled && !!filters,
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    refetchOnMount: true
  });
};