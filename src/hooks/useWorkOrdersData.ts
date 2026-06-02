import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { CATEGORY_DISPLAY_NAMES } from '@/utils/maintenanceUtils';

interface WorkOrderFilters {
  portfolioId?: string | null;
  propertyIds?: string[];
  unitIds?: string[];
  assignedToIds?: string[];
  categories?: string[];
  statuses?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

interface WorkOrder {
  id: string;
  task_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  created_at: string;
  due_date: string | null;
  completed_date: string | null;
  property_address: string;
  unit_number?: string;
  unit_id?: string;
  assigned_to_name: string;
  estimated_cost: number;
  actual_cost: number;
}

const STATUS_DISPLAY_NAMES = {
  new: 'New',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
  closed: 'Closed'
} as const;

export const useWorkOrdersData = (
  filters: WorkOrderFilters | null,
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['work-orders', filters],
    queryFn: async () => {
      if (!filters) return [];

      console.log('Work Orders Data Hook - Fetching with filters:', filters);

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
          created_at,
          due_date,
          completed_date,
          estimated_cost,
          actual_cost,
          property:properties!maintenance_requests_property_id_fkey (
            id,
            address,
            owner_id,
            portfolio_id
          ),
          unit:property_units!maintenance_requests_unit_id_fkey (
            id,
            unit_number
          ),
          assigned_vendor:maintenance_vendors!maintenance_requests_assigned_vendor_id_fkey (
            company_name
          )
        `);

      // Apply portfolio filter
      const normalizedPortfolioId = normalizePortfolioId(filters.portfolioId);
      if (normalizedPortfolioId && normalizedPortfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', normalizedPortfolioId);
      } else if (normalizedPortfolioId === 'everything') {
        // For "everything", include both properties with portfolio_id and those with null portfolio_id
        // This will be handled by not applying any portfolio filter
      }

      // Apply property and unit filters with OR logic
      const hasPropertyFilter = filters.propertyIds && filters.propertyIds.length > 0;
      const hasUnitFilter = filters.unitIds && filters.unitIds.length > 0;
      
      if (hasPropertyFilter && hasUnitFilter) {
        // When both properties and units are selected, use OR logic:
        // Show work orders that are either property-level for selected properties OR unit-level for selected units
        query = query.or(`and(property_id.in.(${filters.propertyIds.join(',')}),unit_id.is.null),unit_id.in.(${filters.unitIds.join(',')})`);
      } else if (hasPropertyFilter) {
        // Only property filter: show all work orders for selected properties
        query = query.in('property_id', filters.propertyIds);
      } else if (hasUnitFilter) {
        // Only unit filter: show work orders for selected units
        query = query.in('unit_id', filters.unitIds);
      }

      // Apply status filter
      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      // Apply category filter
      if (filters.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories);
      }

      // Apply assigned to filter
      if (filters.assignedToIds && filters.assignedToIds.length > 0) {
        query = query.in('assigned_vendor.company_name', filters.assignedToIds);
      }

      // Apply date range filter (created_at)
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      console.log('Work Orders Data Hook - Executing query...');

      const { data, error } = await query;

      if (error) {
        console.error('Work Orders Data Hook - Query error:', error);
        throw error;
      }

      console.log('Work Orders Data Hook - Raw results:', data?.length || 0, 'work orders');

      // Transform the data
      const workOrders: WorkOrder[] = (data || []).map((item: any) => ({
        id: item.id,
        task_id: item.task_id || item.id,
        title: item.title,
        description: item.description || '',
        category: item.category,
        priority: item.priority,
        status: item.status,
        created_at: item.created_at,
        due_date: item.due_date,
        completed_date: item.completed_date,
        property_address: item.property?.address || 'Unknown Property',
        unit_number: item.unit?.unit_number,
        unit_id: item.unit?.id,
        assigned_to_name: item.assigned_vendor?.company_name || 'Unassigned',
        estimated_cost: item.estimated_cost || 0,
        actual_cost: item.actual_cost || 0,
      }));

      console.log('Work Orders Data Hook - Transformed results:', workOrders.length, 'work orders');
      
      return workOrders;
    },
    enabled: options.enabled !== false && !!filters,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export { STATUS_DISPLAY_NAMES };