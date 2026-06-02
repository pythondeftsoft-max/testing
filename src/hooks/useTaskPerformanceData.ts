import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';

interface TaskPerformanceFilters {
  portfolioId?: string | null;
  propertyIds?: string[];
  unitIds?: string[];
  assignedToIds?: string[];
  categories?: string[];
  statuses?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

interface TaskPerformanceMetrics {
  // Completion Statistics
  totalTasks: number;
  completedTasks: number;
  avgCompletionTimeDays: number;
  onTimeCompletionRate: number;
  overdueTasks: number;
  avgOverdueDays: number;
  
  // Priority Analysis
  priorityBreakdown: {
    high: { count: number; avgCompletionTime: number };
    medium: { count: number; avgCompletionTime: number };
    low: { count: number; avgCompletionTime: number };
  };
  
  // Category Performance
  categoryPerformance: Array<{
    category: string;
    taskCount: number;
    avgCompletionTime: number;
    completionRate: number;
  }>;
  
  // Vendor Performance
  vendorPerformance: Array<{
    vendorName: string;
    tasksCompleted: number;
    avgCompletionTime: number;
    onTimeRate: number;
    totalCost: number;
    avgCostPerTask: number;
  }>;
  
  // Cost Analysis
  costAnalysis: {
    totalEstimatedCost: number;
    totalActualCost: number;
    costVariance: number;
    costVariancePercent: number;
    avgCostPerTask: number;
  };
  
  // Raw task data for detailed view
  taskDetails: Array<{
    id: string;
    task_id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    due_date: string | null;
    completed_date: string | null;
    property_address: string;
    unit_number?: string;
    assigned_to_name: string;
    estimated_cost: number;
    actual_cost: number;
    completion_time_days: number | null;
    is_overdue: boolean;
    days_overdue: number | null;
  }>;
}

export const useTaskPerformanceData = (
  filters: TaskPerformanceFilters | null,
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['task-performance', filters],
    queryFn: async (): Promise<TaskPerformanceMetrics> => {
      if (!filters) {
        return {
          totalTasks: 0,
          completedTasks: 0,
          avgCompletionTimeDays: 0,
          onTimeCompletionRate: 0,
          overdueTasks: 0,
          avgOverdueDays: 0,
          priorityBreakdown: {
            high: { count: 0, avgCompletionTime: 0 },
            medium: { count: 0, avgCompletionTime: 0 },
            low: { count: 0, avgCompletionTime: 0 }
          },
          categoryPerformance: [],
          vendorPerformance: [],
          costAnalysis: {
            totalEstimatedCost: 0,
            totalActualCost: 0,
            costVariance: 0,
            costVariancePercent: 0,
            avgCostPerTask: 0
          },
          taskDetails: []
        };
      }

      console.log('Task Performance Data Hook - Fetching with filters:', filters);

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
      }

      // Apply property and unit filters with OR logic
      const hasPropertyFilter = filters.propertyIds && filters.propertyIds.length > 0;
      const hasUnitFilter = filters.unitIds && filters.unitIds.length > 0;
      
      if (hasPropertyFilter && hasUnitFilter) {
        query = query.or(`and(property_id.in.(${filters.propertyIds.join(',')}),unit_id.is.null),unit_id.in.(${filters.unitIds.join(',')})`);
      } else if (hasPropertyFilter) {
        query = query.in('property_id', filters.propertyIds);
      } else if (hasUnitFilter) {
        query = query.in('unit_id', filters.unitIds);
      }

      // Apply other filters
      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      if (filters.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories);
      }

      if (filters.assignedToIds && filters.assignedToIds.length > 0) {
        query = query.in('assigned_vendor.company_name', filters.assignedToIds);
      }

      // Apply date range filter
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Task Performance Data Hook - Query error:', error);
        throw error;
      }

      console.log('Task Performance Data Hook - Raw results:', data?.length || 0, 'tasks');

      // Transform and calculate performance metrics
      const tasks = (data || []).map((item: any) => {
        const now = new Date();
        const createdDate = new Date(item.created_at);
        const dueDate = item.due_date ? new Date(item.due_date) : null;
        const completedDate = item.completed_date ? new Date(item.completed_date) : null;
        
        let completionTimeDays = null;
        let isOverdue = false;
        let daysOverdue = null;
        
        if (completedDate) {
          completionTimeDays = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        if (dueDate && !completedDate && now > dueDate) {
          isOverdue = true;
          daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        } else if (dueDate && completedDate && completedDate > dueDate) {
          isOverdue = true;
          daysOverdue = Math.ceil((completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          id: item.id,
          task_id: item.task_id || item.id,
          title: item.title,
          category: item.category,
          priority: item.priority,
          status: item.status,
          created_at: item.created_at,
          due_date: item.due_date,
          completed_date: item.completed_date,
          property_address: item.property?.address || 'Unknown Property',
          unit_number: item.unit?.unit_number,
          assigned_to_name: item.assigned_vendor?.company_name || 'Unassigned',
          estimated_cost: item.estimated_cost || 0,
          actual_cost: item.actual_cost || 0,
          completion_time_days: completionTimeDays,
          is_overdue: isOverdue,
          days_overdue: daysOverdue
        };
      });

      // Calculate metrics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overdueTasks = tasks.filter(t => t.is_overdue).length;
      
      const completedTasksWithTime = tasks.filter(t => t.completion_time_days !== null);
      const avgCompletionTimeDays = completedTasksWithTime.length > 0 
        ? completedTasksWithTime.reduce((sum, t) => sum + (t.completion_time_days || 0), 0) / completedTasksWithTime.length
        : 0;

      const onTimeCompletedTasks = tasks.filter(t => t.status === 'completed' && !t.is_overdue).length;
      const onTimeCompletionRate = completedTasks > 0 ? (onTimeCompletedTasks / completedTasks) * 100 : 0;

      const overdueTasksWithDays = tasks.filter(t => t.days_overdue !== null);
      const avgOverdueDays = overdueTasksWithDays.length > 0
        ? overdueTasksWithDays.reduce((sum, t) => sum + (t.days_overdue || 0), 0) / overdueTasksWithDays.length
        : 0;

      // Priority breakdown
      const priorityBreakdown = {
        high: {
          count: tasks.filter(t => t.priority === 'high').length,
          avgCompletionTime: 0
        },
        medium: {
          count: tasks.filter(t => t.priority === 'medium').length,
          avgCompletionTime: 0
        },
        low: {
          count: tasks.filter(t => t.priority === 'low').length,
          avgCompletionTime: 0
        }
      };

      // Calculate avg completion time by priority
      ['high', 'medium', 'low'].forEach(priority => {
        const priorityTasks = tasks.filter(t => t.priority === priority && t.completion_time_days !== null);
        if (priorityTasks.length > 0) {
          priorityBreakdown[priority as keyof typeof priorityBreakdown].avgCompletionTime = 
            priorityTasks.reduce((sum, t) => sum + (t.completion_time_days || 0), 0) / priorityTasks.length;
        }
      });

      // Category performance
      const categoryMap = new Map();
      tasks.forEach(task => {
        if (!categoryMap.has(task.category)) {
          categoryMap.set(task.category, { 
            taskCount: 0, 
            completedCount: 0, 
            totalCompletionTime: 0, 
            completionTimeCount: 0 
          });
        }
        const cat = categoryMap.get(task.category);
        cat.taskCount++;
        if (task.status === 'completed') {
          cat.completedCount++;
          if (task.completion_time_days !== null) {
            cat.totalCompletionTime += task.completion_time_days;
            cat.completionTimeCount++;
          }
        }
      });

      const categoryPerformance = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        taskCount: data.taskCount,
        avgCompletionTime: data.completionTimeCount > 0 ? data.totalCompletionTime / data.completionTimeCount : 0,
        completionRate: data.taskCount > 0 ? (data.completedCount / data.taskCount) * 100 : 0
      }));

      // Vendor performance
      const vendorMap = new Map();
      tasks.forEach(task => {
        const vendor = task.assigned_to_name;
        if (!vendorMap.has(vendor)) {
          vendorMap.set(vendor, { 
            tasksCompleted: 0, 
            totalCompletionTime: 0, 
            completionTimeCount: 0,
            totalTasks: 0,
            onTimeTasks: 0,
            totalCost: 0
          });
        }
        const v = vendorMap.get(vendor);
        v.totalTasks++;
        v.totalCost += task.actual_cost;
        
        if (task.status === 'completed') {
          v.tasksCompleted++;
          if (!task.is_overdue) v.onTimeTasks++;
          if (task.completion_time_days !== null) {
            v.totalCompletionTime += task.completion_time_days;
            v.completionTimeCount++;
          }
        }
      });

      const vendorPerformance = Array.from(vendorMap.entries()).map(([vendorName, data]) => ({
        vendorName,
        tasksCompleted: data.tasksCompleted,
        avgCompletionTime: data.completionTimeCount > 0 ? data.totalCompletionTime / data.completionTimeCount : 0,
        onTimeRate: data.tasksCompleted > 0 ? (data.onTimeTasks / data.tasksCompleted) * 100 : 0,
        totalCost: data.totalCost,
        avgCostPerTask: data.totalTasks > 0 ? data.totalCost / data.totalTasks : 0
      }));

      // Cost analysis
      const totalEstimatedCost = tasks.reduce((sum, t) => sum + t.estimated_cost, 0);
      const totalActualCost = tasks.reduce((sum, t) => sum + t.actual_cost, 0);
      const costVariance = totalActualCost - totalEstimatedCost;
      const costVariancePercent = totalEstimatedCost > 0 ? (costVariance / totalEstimatedCost) * 100 : 0;
      const avgCostPerTask = totalTasks > 0 ? totalActualCost / totalTasks : 0;

      return {
        totalTasks,
        completedTasks,
        avgCompletionTimeDays,
        onTimeCompletionRate,
        overdueTasks,
        avgOverdueDays,
        priorityBreakdown,
        categoryPerformance,
        vendorPerformance,
        costAnalysis: {
          totalEstimatedCost,
          totalActualCost,
          costVariance,
          costVariancePercent,
          avgCostPerTask
        },
        taskDetails: tasks
      };
    },
    enabled: options.enabled !== false && !!filters,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};