import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioReportFilters } from '@/components/ui/standard-report-filters';
import { useStandardReportFilters } from '@/hooks/useStandardReportFilters';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, FileSpreadsheet } from 'lucide-react';
import { format, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTaskPerformanceData } from '@/hooks/useTaskPerformanceData';
import { normalizePortfolioId } from '@/utils/portfolio';
import { ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_DISPLAY_NAMES } from '@/utils/maintenanceUtils';
import { generateTaskPerformanceCSV, generateTaskPerformancePDF } from '@/utils/taskPerformanceExportUtils';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface TaskPerformanceReportProps {
  portfolioId?: string;
  onBack: () => void;
}


const taskDetailColumns: ColumnDef<any>[] = [
  {
    accessorKey: 'task_id',
    header: 'Task ID',
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue('task_id')}</div>
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
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <div className="font-medium max-w-[200px] truncate">{row.getValue('title')}</div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as string;
      return <Badge variant="outline">{CATEGORY_DISPLAY_NAMES[category] || category}</Badge>;
    },
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const priority = row.getValue('priority') as string;
      return (
        <Badge variant="outline" className={cn(
          priority === 'high' && 'border-red-200 text-red-800 bg-red-50',
          priority === 'medium' && 'border-yellow-200 text-yellow-800 bg-yellow-50',
          priority === 'low' && 'border-green-200 text-green-800 bg-green-50'
        )}>
          {priority}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'assigned_to_name',
    header: 'Assigned To',
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue('assigned_to_name')}</div>
    ),
  },
  {
    accessorKey: 'completion_time_days',
    header: 'Completion Time',
    cell: ({ row }) => {
      const days = row.getValue('completion_time_days') as number | null;
      const isOverdue = row.original.is_overdue;
      return (
        <div className="text-sm">
          {days !== null ? (
            <span className={cn(isOverdue && 'text-red-600')}>
              {days} days
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'actual_cost',
    header: 'Cost',
    cell: ({ row }) => {
      const cost = row.getValue('actual_cost') as number;
      return <div className="text-sm">{cost > 0 ? `$${cost.toLocaleString()}` : '-'}</div>;
    },
  },
];

const workOrderCategories = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'security', label: 'Security' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' }
];

const workOrderStatuses = [
  { value: 'new', label: 'New' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'closed', label: 'Closed' }
];

export const TaskPerformanceReport: React.FC<TaskPerformanceReportProps> = ({ portfolioId, onBack }) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
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
    initialPortfolioId: portfolioId || 'everything',
    defaultDateRange: 'year',
    requireFilters: true
  });

  const currentPortfolioId = normalizePortfolioId(filters.portfolioId);
  
  const hookFilters = queryFilters ? {
    portfolioId: currentPortfolioId,
    propertyIds: queryFilters.propertyIds.length > 0 ? queryFilters.propertyIds : undefined,
    unitIds: queryFilters.unitIds.length > 0 ? queryFilters.unitIds : undefined,
    assignedToIds: (queryFilters.assignedToIds && queryFilters.assignedToIds.length > 0) ? queryFilters.assignedToIds : undefined,
    categories: queryFilters.categories && queryFilters.categories.length > 0 ? queryFilters.categories : undefined,
    dateFrom: queryFilters.dateFrom,
    dateTo: queryFilters.dateTo,
  } : null;
  
  const { data: performanceData, isLoading, error } = useTaskPerformanceData(
    hookFilters,
    { enabled: hasUserTriggeredRun && !!queryFilters }
  );

  const handleExportCSV = () => {
    if (!performanceData) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      generateTaskPerformanceCSV(
        performanceData.taskDetails,
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
    if (!performanceData) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      generateTaskPerformancePDF(
        performanceData,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Task Performance Report</h1>
            <p className="text-muted-foreground">Analyze maintenance task completion metrics and vendor performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            disabled={!performanceData}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={!performanceData}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <PortfolioReportFilters
        title="Report Filters"
        filters={filters}
        onFiltersChange={updateFilters}
        onRunReport={runReport}
        userId={userId || ''}
        isRunning={isRunning}
        hasValidFilters={hasValidFilters}
        showVendorFilter={true}
        showCategoryFilter={true}
        showStatusFilter={true}
        categoryOptions={workOrderCategories}
        statusOptions={workOrderStatuses}
      />

      <DataSourcesSection
        sources={[
          { table: 'maintenance_requests', description: 'Completed tasks with timing and cost metrics' },
          { table: 'properties', description: 'Property and unit information' },
          { table: 'vendors', description: 'Vendor/contractor performance data' },
        ]}
        dataRequirements={{
          fields: [
            { field: 'Completion Time', description: 'Days from creation to completion for each task' },
            { field: 'Cost Accuracy', description: 'Comparison of estimated vs actual costs' },
            { field: 'Vendor Assignment', description: 'Which vendor completed each task' }
          ],
          calculationSteps: [
            { step: 'Avg Days to Complete', formula: 'Sum(Completion Date - Creation Date) / Number of Tasks' },
            { step: 'Cost Variance %', formula: '((Actual Cost - Estimated Cost) / Estimated Cost) × 100%' },
            { step: 'On-Time Completion %', formula: '(Tasks completed by due date / Total Tasks) × 100%' },
            { step: 'Vendor Efficiency', formula: 'Average days to complete per vendor' }
          ],
          note: 'Analyzes performance metrics for completed maintenance tasks. Use to identify bottlenecks and improve vendor selection.'
        }}
      />

      {/* Results */}
      {!hasUserTriggeredRun && !isLoading && (
        <Card>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Click "Run report" to view task performance data
            </div>
          </CardContent>
        </Card>
      )}
      
      {performanceData && (
        <div className="space-y-6">
          {/* Task Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={taskDetailColumns}
                data={performanceData.taskDetails}
              />
            </CardContent>
          </Card>

          {/* Vendor Performance Table */}
          {performanceData.vendorPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Vendor Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Vendor</th>
                        <th className="text-right p-2">Tasks Completed</th>
                        <th className="text-right p-2">Avg Completion Time</th>
                        <th className="text-right p-2">On-Time Rate</th>
                        <th className="text-right p-2">Total Cost</th>
                        <th className="text-right p-2">Avg Cost/Task</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceData.vendorPerformance.map((vendor, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-medium">{vendor.vendorName}</td>
                          <td className="p-2 text-right">{vendor.tasksCompleted}</td>
                          <td className="p-2 text-right">{vendor.avgCompletionTime.toFixed(1)} days</td>
                          <td className="p-2 text-right">{vendor.onTimeRate.toFixed(1)}%</td>
                          <td className="p-2 text-right">${vendor.totalCost.toLocaleString()}</td>
                          <td className="p-2 text-right">${vendor.avgCostPerTask.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error loading performance data: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasUserTriggeredRun && !isLoading && !performanceData && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No tasks found matching the selected filters.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};