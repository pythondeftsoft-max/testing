import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, FileSpreadsheet } from 'lucide-react';
import { generateOpenTasksCSV, generateOpenTasksPDF } from '@/utils/openTasksExportUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useOpenTasksData } from '@/hooks/useOpenTasksData';
import { normalizePortfolioId } from '@/utils/portfolio';
import { ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/integrations/supabase/client';
import { MAINTENANCE_CATEGORIES, formatSpecialty } from '@/utils/maintenanceUtils';
import { PortfolioReportFilters } from '@/components/ui/standard-report-filters';
import { useStandardReportFilters } from '@/hooks/useStandardReportFilters';
import { useAllVendors } from '@/hooks/useAllVendors';
import { useAllPropertiesWithUnits } from '@/hooks/useAllPropertiesWithUnits';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface OpenTasksReportProps {
  portfolioId?: string;
  onBack: () => void;
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

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const statusColors = {
  pending: 'bg-orange-100 text-orange-800',
  in_progress: 'bg-blue-100 text-blue-800'
};

const columns: ColumnDef<OpenTask>[] = [
  {
    accessorKey: 'property_address',
    header: 'Unit',
    cell: ({ row }) => {
      const address = row.getValue('property_address') as string;
      const unitNumber = row.original.unit_number;
      const title = row.original.title;
      const description = row.original.description;
      const category = row.original.category;
      const priority = row.original.priority;
      
      return (
        <div className="space-y-1">
          <div className="font-medium text-sm">{address}</div>
          {unitNumber && <div className="text-xs text-muted-foreground">Unit {unitNumber}</div>}
          <div className="text-sm text-foreground mt-2">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground max-w-md truncate" title={description}>
              {description}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs px-1 py-0">
              {category}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn("text-xs px-1 py-0", priorityColors[priority])}
            >
              {priority}
            </Badge>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'task_id',
    header: 'Task ID',
    cell: ({ row }) => (
      <div className="text-sm font-mono">{row.getValue('task_id')}</div>
    ),
  },
  {
    accessorKey: 'submitted_date',
    header: 'Created',
    cell: ({ row }) => (
      <div className="text-sm">
        {format(new Date(row.getValue('submitted_date')), 'MMM dd, yyyy')}
      </div>
    ),
  },
  {
    accessorKey: 'due_date',
    header: 'Due Date',
    cell: ({ row }) => {
      const dueDate = row.getValue('due_date') as string;
      const isOverdue = dueDate && new Date(dueDate) < new Date();
      return (
        <div className={cn("text-sm", isOverdue && "text-red-600 font-medium")}>
          {dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : '-'}
          {isOverdue && (
            <div className="text-xs text-red-500">Overdue</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'active_for',
    header: 'Active For',
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue('active_for')}</div>
    ),
  },
  {
    accessorKey: 'assigned_to_name',
    header: 'Vendors',
    cell: ({ row }) => {
      const assignedTo = row.getValue('assigned_to_name') as string;
      const status = row.original.status;
      
      return (
        <div className="space-y-1">
          <div className="text-sm">{assignedTo || 'Unassigned'}</div>
          <Badge 
            variant="outline" 
            className={cn("text-xs px-1 py-0", statusColors[status as keyof typeof statusColors])}
          >
            {status.replace('_', ' ')}
          </Badge>
        </div>
      );
    },
  },
];

// Define task categories for the filter - use database values but display user-friendly names
const taskCategories = MAINTENANCE_CATEGORIES;

// Get display names for categories
const getCategoryDisplayName = (category: string) => {
  const displayMap: Record<string, string> = {
    plumbing: 'Plumbing',
    electrical: 'Electrical', 
    hvac: 'HVAC',
    appliance_repair: 'Appliance Repair',
    flooring: 'Flooring',
    painting: 'Painting',
    roofing: 'Roofing',
    landscaping: 'Landscaping',
    cleaning: 'Cleaning',
    pest_control: 'Pest Control',
    security_systems: 'Security Systems',
    other: 'Other'
  };
  return displayMap[category] || category;
};

const categoryOptions = taskCategories.map(category => ({
  value: category,
  label: getCategoryDisplayName(category)
}));

export const OpenTasksReport: React.FC<OpenTasksReportProps> = ({
  portfolioId: initialPortfolioId = 'everything',
  onBack
}) => {
  const { toast } = useToast();
  
  // Get current user ID
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const {
    filters,
    queryFilters,
    isRunning,
    hasUserTriggeredRun,
    updateFilters,
    runReport,
    hasValidFilters
  } = useStandardReportFilters({
    initialPortfolioId,
    defaultDateRange: 'month',
    requireFilters: true
  });

  const currentPortfolioId = normalizePortfolioId(filters.portfolioId);
  
  // Get vendor and property data for "All" detection
  const { vendors } = useAllVendors();
  const { data: properties = [] } = useAllPropertiesWithUnits(userId || '', currentPortfolioId);
  
  // Helper function to detect if all categories are selected
  const isAllCategoriesSelected = (selectedCategories: string[]) => {
    if (!selectedCategories || selectedCategories.length === 0) return false;
    return selectedCategories.length === taskCategories.length;
  };
  
  // Helper function to detect if all vendors are selected
  const isAllVendorsSelected = (selectedVendors: string[], availableVendors: any[]) => {
    if (!selectedVendors || selectedVendors.length === 0) return false;
    if (!availableVendors || availableVendors.length === 0) return false;
    return selectedVendors.length === availableVendors.length;
  };

  // Helper function to detect if all properties are selected
  const isAllPropertiesSelected = (queryFilters: any, properties: any[]) => {
    if (!queryFilters || !properties || properties.length === 0) return false;
    
    // Count total selectable items (properties without units + units from properties with units)
    let totalSelectableItems = 0;
    properties.forEach(property => {
      const hasUnits = property.property_units && property.property_units.length > 0;
      if (hasUnits) {
        totalSelectableItems += property.property_units.length;
      } else {
        totalSelectableItems += 1;
      }
    });
    
    const totalSelectedItems = (queryFilters.propertyIds?.length || 0) + (queryFilters.unitIds?.length || 0);
    return totalSelectedItems === totalSelectableItems;
  };
  
  // Debug logging for available data
  console.log('🐛 [OPEN_TASKS_REPORT] Available data:', {
    vendorsCount: vendors.length,
    propertiesCount: properties.length,
    categoriesCount: taskCategories.length,
    userId
  });
  
  // Debug logging for filter states
  console.log('🐛 [OPEN_TASKS_REPORT] Raw filters state:', filters);
  console.log('🐛 [OPEN_TASKS_REPORT] Query filters state:', queryFilters);
  
  // Create hook filters with "All" detection logic
  const hookFilters = queryFilters ? (() => {
    // Check if "All" is selected for each filter type
    const allCategoriesSelected = queryFilters.categories ? isAllCategoriesSelected(queryFilters.categories) : false;
    const allVendorsSelected = queryFilters.assignedToIds ? isAllVendorsSelected(queryFilters.assignedToIds, vendors) : false;
    const allPropertiesSelected = isAllPropertiesSelected(queryFilters, properties);
    
    console.log('🐛 [OPEN_TASKS_REPORT] Filter detection results:', {
      allCategoriesSelected,
      allVendorsSelected,
      allPropertiesSelected,
      categoriesCount: queryFilters.categories?.length || 0,
      vendorsCount: queryFilters.assignedToIds?.length || 0,
      propertiesCount: queryFilters.propertyIds?.length || 0,
      unitsCount: queryFilters.unitIds?.length || 0,
      totalAvailableVendors: vendors.length,
      totalAvailableProperties: properties.length,
      totalAvailableCategories: taskCategories.length
    });
    
    const filters = {
      portfolioId: currentPortfolioId,
      dateFrom: queryFilters.dateFrom,
      dateTo: queryFilters.dateTo,
      // Only pass property/unit filters if they exist and not all are selected
      propertyIds: (queryFilters.propertyIds && queryFilters.propertyIds.length > 0 && !allPropertiesSelected) ? queryFilters.propertyIds : undefined,
      unitIds: (queryFilters.unitIds && queryFilters.unitIds.length > 0 && !allPropertiesSelected) ? queryFilters.unitIds : undefined,
      // Only pass vendor filter if not all vendors are selected
      assignedToIds: (queryFilters.assignedToIds && queryFilters.assignedToIds.length > 0 && !allVendorsSelected) ? queryFilters.assignedToIds : undefined,
      // Only pass category filter if not all categories are selected  
      categories: (queryFilters.categories && queryFilters.categories.length > 0 && !allCategoriesSelected) ? queryFilters.categories : undefined
    };
    
    console.log('🐛 [OPEN_TASKS_REPORT] Final hook filters:', filters);
    return filters;
  })() : null;
  
  const { data: openTasks, isLoading, error } = useOpenTasksData(
    hookFilters,
    { enabled: hasUserTriggeredRun && !!queryFilters }
  );

  const handleExportCSV = () => {
    if (!openTasks || openTasks.length === 0) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      generateOpenTasksCSV(
        openTasks,
        format(new Date(), 'yyyy-MM-dd')
      );
      toast({
        title: "Export successful",
        description: "Report has been exported as CSV file.",
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    if (!openTasks || openTasks.length === 0) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      generateOpenTasksPDF(
        openTasks,
        format(new Date(), 'yyyy-MM-dd')
      );
      toast({
        title: "Export successful",
        description: "Report has been exported as PDF file.",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export PDF file.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Open Tasks Report</h1>
            <p className="text-muted-foreground">Track pending and in-progress maintenance requests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={!openTasks || openTasks.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={!openTasks || openTasks.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <PortfolioReportFilters
        title="Filters"
        filters={filters}
        onFiltersChange={updateFilters}
        onRunReport={runReport}
        userId={userId || ''}
        isRunning={isRunning}
        hasValidFilters={hasValidFilters}
        showVendorFilter={true}
        showCategoryFilter={true}
        categoryOptions={categoryOptions}
      />

      <DataSourcesSection
        sources={[
          { table: 'maintenance_requests', description: 'Pending and in-progress maintenance tasks' },
          { table: 'properties', description: 'Property and unit information' },
          { table: 'vendors', description: 'Assigned vendor/contractor information' },
        ]}
        dataRequirements={{
          fields: [
            { field: 'Task Status', description: 'Current status (New, Pending, In Progress, Deferred)' },
            { field: 'Due Date', description: 'Expected completion date for each task' },
            { field: 'Assignment', description: 'Vendor or contractor assigned to the task' },
            { field: 'Priority Level', description: 'Low, Medium, or High priority classification' }
          ],
          calculationSteps: [
            { step: 'Days Open', formula: 'Current Date - Creation Date' },
            { step: 'Days Until Due', formula: 'Due Date - Current Date (negative if overdue)' },
            { step: 'Total Estimated Cost', formula: 'Sum of estimated costs for all open tasks' },
            { step: 'High Priority Count', formula: 'Count of tasks with priority = High' }
          ],
          note: 'Shows tasks that are not yet completed. Excludes Completed and Closed status tasks. Useful for workload planning and resource allocation.'
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Open Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8 text-red-600">
              Error loading open tasks: {error.message}
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              Loading open tasks...
            </div>
          ) : !hasUserTriggeredRun ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Please select at least one filter to run the report:</p>
              <ul className="text-sm space-y-1">
                <li>• Select specific properties or units</li>
                <li>• Choose specific vendors</li>
                <li>• Filter by maintenance categories</li>
              </ul>
              <p className="mt-4">Then click "Run report" to view results.</p>
            </div>
          ) : openTasks && openTasks.length > 0 ? (
            <DataTable
              columns={columns}
              data={openTasks}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No open tasks found for the selected criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};