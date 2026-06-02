import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioReportFilters } from '@/components/ui/standard-report-filters';
import { useStandardReportFilters } from '@/hooks/useStandardReportFilters';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, FileSpreadsheet } from 'lucide-react';
import { generateWorkOrdersCSV, generateWorkOrdersPDF } from '@/utils/workOrdersExportUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useWorkOrdersData, STATUS_DISPLAY_NAMES } from '@/hooks/useWorkOrdersData';
import { normalizePortfolioId } from '@/utils/portfolio';
import { ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_DISPLAY_NAMES } from '@/utils/maintenanceUtils';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface WorkOrdersReportProps {
  portfolioId?: string;
  onBack: () => void;
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

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  deferred: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800'
};

const columns: ColumnDef<WorkOrder>[] = [
  {
    accessorKey: 'task_id',
    header: 'Work Order ID',
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
    header: 'Title/Description',
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
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as string;
      const displayName = CATEGORY_DISPLAY_NAMES[category] || category;
      return <Badge variant="outline">{displayName}</Badge>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const displayName = STATUS_DISPLAY_NAMES[status] || status;
      return (
        <Badge className={cn('capitalize', statusColors[status] || 'bg-gray-100 text-gray-800')} variant="secondary">
          {displayName}
        </Badge>
      );
    },
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
    accessorKey: 'assigned_to_name',
    header: 'Assigned To',
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue('assigned_to_name') || 'Unassigned'}</div>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Submitted Date',
    cell: ({ row }) => (
      <div className="text-sm">
        {format(new Date(row.getValue('created_at')), 'MMM dd, yyyy')}
      </div>
    ),
  },
  {
    accessorKey: 'due_date',
    header: 'Due Date',
    cell: ({ row }) => {
      const dueDate = row.getValue('due_date') as string | null;
      return (
        <div className="text-sm">
          {dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'estimated_cost',
    header: 'Est. Cost',
    cell: ({ row }) => {
      const cost = row.getValue('estimated_cost') as number;
      return (
        <div className="text-sm">
          {cost ? `$${cost.toLocaleString()}` : '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'actual_cost',
    header: 'Actual Cost',
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

const workOrderStatuses = [
  { value: 'new', label: 'New' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'closed', label: 'Closed' }
];

const workOrderCategories = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'security_systems', label: 'Security Systems' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'construction_request', label: 'Construction Request' },
  { value: 'feedback_suggestion', label: 'Feedback/Suggestion' },
  { value: 'general_inquiry', label: 'General Inquiry' },
  { value: 'other', label: 'Other' }
];

export const WorkOrdersReport: React.FC<WorkOrdersReportProps> = ({
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

  const hookFilters = queryFilters ? {
    portfolioId: currentPortfolioId,
    propertyIds: queryFilters.propertyIds.length > 0 ? queryFilters.propertyIds : undefined,
    unitIds: queryFilters.unitIds.length > 0 ? queryFilters.unitIds : undefined,
    assignedToIds: queryFilters.assignedToIds && queryFilters.assignedToIds.length > 0 ? queryFilters.assignedToIds : undefined,
    categories: queryFilters.categories && queryFilters.categories.length > 0 ? queryFilters.categories : undefined,
    statuses: queryFilters.statuses && queryFilters.statuses.length > 0 ? queryFilters.statuses : undefined,
    dateFrom: queryFilters.dateFrom,
    dateTo: queryFilters.dateTo,
  } : null;
  
  const { data: workOrders, isLoading, error } = useWorkOrdersData(
    hookFilters,
    { enabled: hasUserTriggeredRun && !!queryFilters }
  );

  const handleExportCSV = () => {
    if (!workOrders || workOrders.length === 0) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      generateWorkOrdersCSV(
        workOrders,
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
    if (!workOrders || workOrders.length === 0) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      generateWorkOrdersPDF(
        workOrders,
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

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Work Orders Report</h1>
            <p className="text-muted-foreground">Comprehensive view of all maintenance work orders and their status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={!workOrders || workOrders.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={!workOrders || workOrders.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
      <PortfolioReportFilters
        title="Filters"
        filters={filters}
        onFiltersChange={updateFilters}
        onRunReport={runReport}
        userId={userId}
        isRunning={isRunning}
        hasValidFilters={hasValidFilters}
        showVendorFilter={true}
        showCategoryFilter={true}
        showStatusFilter={true}
        categoryOptions={workOrderCategories}
        statusOptions={workOrderStatuses}
      />
      </Card>

      <DataSourcesSection
        sources={[
          { table: 'maintenance_requests', description: 'Work order records with status, priority, and assignment details' },
          { table: 'properties', description: 'Property and unit information' },
          { table: 'vendors', description: 'Assigned vendor/contractor information' },
        ]}
        dataRequirements={{
          fields: [
            { field: 'Work Order Details', description: 'Title, description, category, and priority for each maintenance request' },
            { field: 'Assignment Information', description: 'Assigned vendor or contractor for each work order' },
            { field: 'Status Tracking', description: 'Current status (New, Pending, In Progress, Completed, Deferred, Closed)' },
            { field: 'Cost Information', description: 'Estimated and actual costs for each work order' }
          ],
          calculationSteps: [
            { step: 'Days Open', formula: 'Current date - Created date (for open work orders)' },
            { step: 'Total Estimated Cost', formula: 'Sum of all estimated costs across filtered work orders' },
            { step: 'Total Actual Cost', formula: 'Sum of all actual costs for completed work orders' },
            { step: 'Cost Variance', formula: 'Total Actual Cost - Total Estimated Cost' }
          ],
          note: 'Filter by status, category, assigned vendor, property, or date range. Work orders are tracked from creation through completion.'
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8 text-red-600">
              Error loading work orders: {error.message}
            </div>
          )}
          
          {!hasUserTriggeredRun ? (
            <div className="text-center py-8 text-muted-foreground">
              Configure your filters and click "Run report" to view work orders.
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              Loading work orders...
            </div>
          ) : workOrders && workOrders.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Found {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}
              </div>
              <DataTable columns={columns} data={workOrders} />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No work orders found with the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};