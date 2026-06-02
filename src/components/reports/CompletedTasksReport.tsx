import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, FileSpreadsheet } from 'lucide-react';
import { generateCompletedTasksCSV, generateCompletedTasksPDF } from '@/utils/completedTasksExportUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCompletedTasksData } from '@/hooks/useCompletedTasksData';
import { normalizePortfolioId } from '@/utils/portfolio';
import { ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioReportFilters } from '@/components/ui/standard-report-filters';
import { useStandardReportFilters } from '@/hooks/useStandardReportFilters';
import { useAllVendors } from '@/hooks/useAllVendors';
import { useAllPropertiesWithUnits } from '@/hooks/useAllPropertiesWithUnits';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface CompletedTasksReportProps {
  portfolioId?: string;
  onBack: () => void;
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

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const columns: ColumnDef<CompletedTask>[] = [
  {
    accessorKey: 'title',
    header: 'Task',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue('title')}</div>
        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
          {row.original.description}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'property_address',
    header: 'Property',
    cell: ({ row }) => {
      const address = row.getValue('property_address') as string;
      const unitNumber = row.original.unit_number;
      return (
        <div className="text-sm">
          {address}
          {unitNumber && <div className="text-xs text-muted-foreground">Unit {unitNumber}</div>}
        </div>
      );
    },
  },
  {
    accessorKey: 'assigned_to_name',
    header: 'Assigned To',
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue('assigned_to_name') || 'Unassigned'}</div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue('category')}</Badge>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const priority = row.getValue('priority') as 'low' | 'medium' | 'high';
      return (
        <Badge className={cn('capitalize', priorityColors[priority])} variant="secondary">
          {priority}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'completed_date',
    header: 'Completion Date',
    cell: ({ row }) => (
      <div className="text-sm">
        {format(new Date(row.getValue('completed_date')), 'MMM dd, yyyy')}
      </div>
    ),
  },
  {
    accessorKey: 'actual_cost',
    header: 'Cost',
    cell: ({ row }) => {
      const cost = row.getValue('actual_cost') as number;
      return (
        <div className="text-sm font-medium">
          {cost ? `$${cost.toLocaleString()}` : '-'}
        </div>
      );
    },
  },
];

const taskCategories = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Appliance Repair',
  'Flooring',
  'Paint/Touch-up',
  'Landscaping',
  'General Maintenance',
  'Emergency Repair',
  'Inspection',
  'Other'
];

const categoryOptions = taskCategories.map(category => ({
  value: category,
  label: category
}));


export const CompletedTasksReport: React.FC<CompletedTasksReportProps> = ({
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
  console.log('🐛 [COMPLETED_TASKS_REPORT] Available data:', {
    vendorsCount: vendors.length,
    propertiesCount: properties.length,
    categoriesCount: taskCategories.length,
    userId
  });
  
  // Debug logging for filter states
  console.log('🐛 [COMPLETED_TASKS_REPORT] Raw filters state:', filters);
  console.log('🐛 [COMPLETED_TASKS_REPORT] Query filters state:', queryFilters);
  
  // Create hook filters with "All" detection logic
  const hookFilters = queryFilters ? (() => {
    // Check if "All" is selected for each filter type
    const allCategoriesSelected = queryFilters.categories ? isAllCategoriesSelected(queryFilters.categories) : false;
    const allVendorsSelected = queryFilters.assignedToIds ? isAllVendorsSelected(queryFilters.assignedToIds, vendors) : false;
    const allPropertiesSelected = isAllPropertiesSelected(queryFilters, properties);
    
    console.log('🐛 [COMPLETED_TASKS_REPORT] Filter detection results:', {
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
    
    console.log('🐛 [COMPLETED_TASKS_REPORT] Final hook filters:', filters);
    return filters;
  })() : null;
  
  const { data: completedTasks, isLoading, error } = useCompletedTasksData(
    hookFilters,
    { enabled: hasUserTriggeredRun && !!queryFilters }
  );

  const handleExportCSV = () => {
    if (!completedTasks || completedTasks.length === 0) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      generateCompletedTasksCSV(
        completedTasks,
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
    if (!completedTasks || completedTasks.length === 0) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      generateCompletedTasksPDF(
        completedTasks,
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
            <h1 className="text-2xl font-bold">Completed Tasks Report</h1>
            <p className="text-muted-foreground">Track completed maintenance requests and their details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={!completedTasks || completedTasks.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={!completedTasks || completedTasks.length === 0}
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
          { table: 'maintenance_requests', description: 'Completed maintenance tasks with resolution details' },
          { table: 'properties', description: 'Property and unit information' },
          { table: 'vendors', description: 'Assigned vendor/contractor information' },
        ]}
        dataRequirements={{
          fields: [
            { field: 'Completion Date', description: 'Date when the maintenance task was marked as completed' },
            { field: 'Cost Information', description: 'Estimated and actual costs for each completed task' },
            { field: 'Task Details', description: 'Title, description, category, and priority information' }
          ],
          calculationSteps: [
            { step: 'Time to Complete', formula: 'Completion Date - Creation Date (in days)' },
            { step: 'Cost Variance', formula: 'Actual Cost - Estimated Cost' },
            { step: 'Avg Completion Time', formula: 'Average days to complete across all filtered tasks' },
            { step: 'Total Cost', formula: 'Sum of all actual costs for completed tasks' }
          ],
          note: 'Shows only tasks with status = Completed. Filter by vendor, category, property, or date range to analyze maintenance performance.'
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Completed Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8 text-red-600">
              Error loading completed tasks: {error.message}
            </div>
          )}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading completed tasks...</p>
            </div>
          )}
          {!hasUserTriggeredRun && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Click "Run report" to view completed tasks data
            </div>
          )}
          {hasUserTriggeredRun && completedTasks && completedTasks.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No completed tasks found for the selected criteria
            </div>
          )}
          {completedTasks && completedTasks.length > 0 && (
            <DataTable columns={columns} data={completedTasks} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};