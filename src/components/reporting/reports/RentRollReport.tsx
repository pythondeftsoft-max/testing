import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { SimpleDropdownSelect } from '@/components/ui/simple-dropdown-select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileText, Play, CalendarIcon } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useRentRollData, RentRollUnit } from '@/hooks/useRentRollData';
import { useAllPropertiesWithUnits, getUnitOptionsFromAllProperties } from '@/hooks/useAllPropertiesWithUnits';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAuth } from '@/hooks/useAuth';
import { generateRentRollCSV, generateRentRollPDF } from '@/utils/rentRollExportUtils';
import { toast } from 'sonner';
import { GrandTotalsSection } from '@/components/reports/rent-roll/GrandTotalsSection';
import { SummaryByBedBathTable } from '@/components/reports/rent-roll/SummaryByBedBathTable';
import { SummaryByPropertyTable } from '@/components/reports/rent-roll/SummaryByPropertyTable';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface RentRollReportProps {
  userId?: string;
  portfolioId?: string;
  onBack: () => void;
}

export const RentRollReport: React.FC<RentRollReportProps> = ({ userId, portfolioId = 'everything', onBack }) => {
  const { user } = useAuth();
  const actualUserId = userId || user?.id;
  
  // UI filters - updated immediately when user changes filters
  const [uiFilters, setUiFilters] = useState({
    portfolioId: portfolioId,
    propertyIds: [] as string[], // Changed from propertyId to propertyIds array
    unitIds: [] as string[], // Added for hierarchical property selector
    dateRange: {
      from: new Date(new Date().getFullYear(), 0, 1), // Start of year
      to: new Date(), // Today
    },
    leaseStatus: [] as string[],
    balanceFilter: [] as string[] // Changed to array for multi-select
  });
  
  // Query filters - only updated when "Run Now" is clicked
  const [queryFilters, setQueryFilters] = useState(null as typeof uiFilters | null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFilterChanges, setHasFilterChanges] = useState(false);
  const [hasRunReport, setHasRunReport] = useState(false);

  // Fetch user portfolios
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(actualUserId || '');
  
  // Fetch properties based on selected portfolio
  const currentPortfolioId = uiFilters.portfolioId === 'everything' ? undefined : uiFilters.portfolioId;
  const { data: propertiesData, refetch: refetchProperties } = useAllPropertiesWithUnits(actualUserId, currentPortfolioId);
  const { data: rentRollData, isLoading } = useRentRollData(queryFilters, { enabled: !!queryFilters });

  // Generate property options using the same helper as Rent Paid Report
  const propertyOptions = getUnitOptionsFromAllProperties(propertiesData || []);

  // Reset property selection when portfolio changes and refetch properties
  useEffect(() => {
    setUiFilters(prev => ({ ...prev, propertyIds: [], unitIds: [] })); // Reset both arrays
    setHasFilterChanges(true);
    if (actualUserId) {
      refetchProperties();
    }
  }, [uiFilters.portfolioId, actualUserId, refetchProperties]);

  const handleExportCSV = () => {
    if (!hasRunReport) {
      toast.error('Please run the report first.');
      return;
    }
    
    if (!rentRollData?.summary) {
      toast.error('No summary data available to export');
      return;
    }
    
    try {
      generateRentRollCSV(
        rentRollData.units || [], 
        rentRollData.summary, 
        uiFilters.dateRange.to ? format(uiFilters.dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      );
      
      const message = rentRollData.units.length === 0
        ? 'CSV exported successfully (no data found)'
        : 'CSV exported successfully';
      toast.success(message);
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPDF = () => {
    if (!hasRunReport) {
      toast.error('Please run the report first.');
      return;
    }
    
    if (!rentRollData?.summary) {
      toast.error('No summary data available to export');
      return;
    }
    
    try {
      generateRentRollPDF(
        rentRollData.units || [], 
        rentRollData.summary, 
        uiFilters.dateRange.to ? format(uiFilters.dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      );
      
      const message = rentRollData.units.length === 0
        ? 'PDF exported successfully (no data found)'
        : 'PDF exported successfully';
      toast.success(message);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Helper function to detect if all properties are selected
  const isAllPropertiesSelected = () => {
    return (uiFilters.propertyIds.length === 0 && uiFilters.unitIds.length === 0) || 
           (uiFilters.propertyIds.length === propertyOptions.length && uiFilters.unitIds.length === 0);
  };

  // Helper function to detect if all lease statuses are selected
  const isAllLeaseStatusSelected = () => {
    return uiFilters.leaseStatus.length === 0 || uiFilters.leaseStatus.length === leaseStatusOptions.length;
  };

  // Helper function to detect if all balance filters are selected
  const isAllBalanceFiltersSelected = () => {
    return uiFilters.balanceFilter.length === 0 || uiFilters.balanceFilter.length === balanceFilterOptions.length;
  };

  // Helper function to check if a custom date range is selected
  const hasCustomDateRange = () => {
    const defaultStartOfYear = new Date(new Date().getFullYear(), 0, 1);
    const defaultToday = new Date();
    
    // Check if the selected date range differs from the default (start of year to today)
    const isDefaultRange = 
      uiFilters.dateRange.from?.getTime() === defaultStartOfYear.getTime() &&
      uiFilters.dateRange.to?.getTime() >= defaultToday.getTime() - 24 * 60 * 60 * 1000; // Allow for same day difference
    
    return !isDefaultRange;
  };

  // Helper function to check if specific filters are selected
  const hasSpecificFilters = () => {
    const hasSpecificProperties = !isAllPropertiesSelected();
    const hasSpecificLeaseStatus = !isAllLeaseStatusSelected();
    const hasSpecificBalanceFilter = !isAllBalanceFiltersSelected();
    const hasCustomDate = hasCustomDateRange();
    
    return hasSpecificProperties || hasSpecificLeaseStatus || hasSpecificBalanceFilter || hasCustomDate;
  };

  const handleRunReport = () => {
    console.log('🔍 [RentRollReport] Raw UI Filters:', uiFilters);
    console.log('🔍 [RentRollReport] Property Options Available:', propertyOptions.length);
    console.log('🔍 [RentRollReport] All Properties Selected?', isAllPropertiesSelected());
    console.log('🔍 [RentRollReport] All Lease Status Selected?', isAllLeaseStatusSelected());
    console.log('🔍 [RentRollReport] All Balance Filters Selected?', isAllBalanceFiltersSelected());
    console.log('🔍 [RentRollReport] Has Specific Filters?', hasSpecificFilters());

    // Validate that at least one specific filter is selected
    if (!hasSpecificFilters()) {
      toast.error(
        'Please select specific filters to generate a meaningful report. Choose specific properties, lease statuses, or balance types instead of selecting "All" for everything.',
        { duration: 5000 }
      );
      return;
    }
    console.log('🔍 [RentRollReport] Raw UI Filters:', uiFilters);
    console.log('🔍 [RentRollReport] Property Options Available:', propertyOptions.length);
    console.log('🔍 [RentRollReport] All Properties Selected?', isAllPropertiesSelected());
    console.log('🔍 [RentRollReport] All Lease Status Selected?', isAllLeaseStatusSelected());
    console.log('🔍 [RentRollReport] All Balance Filters Selected?', isAllBalanceFiltersSelected());

    setIsRunning(true);
    
    // Apply "All Selection → Undefined" pattern
    const processedFilters = {
      ...uiFilters,
      // Pass undefined for propertyIds when all properties are selected
      propertyIds: isAllPropertiesSelected() ? undefined : uiFilters.propertyIds,
      // Pass undefined for unitIds when all properties are selected
      unitIds: isAllPropertiesSelected() ? undefined : uiFilters.unitIds,
      // Pass empty array for leaseStatus when all statuses are selected  
      leaseStatus: isAllLeaseStatusSelected() ? [] : uiFilters.leaseStatus,
      // Pass empty array for balanceFilter when all balances are selected
      balanceFilter: isAllBalanceFiltersSelected() ? [] : uiFilters.balanceFilter
    };

    console.log('🔍 [RentRollReport] Processed Filters for Query:', processedFilters);
    
    setQueryFilters(processedFilters);
    setHasRunReport(true);
    setHasFilterChanges(false);
    toast.success('Report updated successfully');
    setTimeout(() => setIsRunning(false), 1000);
  };

  const leaseStatusOptions = [
    { label: 'Current', value: 'Current' },
    { label: 'Expired', value: 'Expired' },
    { label: 'Vacant', value: 'Vacant' },
  ];

  const balanceFilterOptions = [
    { label: 'Outstanding Only', value: 'outstanding' },
    { label: 'Zero Balance', value: 'zero' },
    { label: 'Credit Balance', value: 'credit' },
  ];

  const detailsColumns: ColumnDef<RentRollUnit>[] = [
    {
      accessorKey: 'unit_number',
      header: 'Unit',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.unit_number}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.property_address}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'tenant_names',
      header: 'Tenants',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.original.tenant_names}</span>
          <Badge variant={row.original.tenant_names === 'Vacant' ? 'secondary' : 'default'} className="w-fit mt-1 text-xs">
            {row.original.lease_status}
          </Badge>
        </div>
      )
    },
    {
      accessorKey: 'lease_dates',
      header: 'Lease Dates',
      cell: ({ row }) => (
        <div className="flex flex-col text-sm">
          <span>Start: {row.original.lease_start_date ? format(new Date(row.original.lease_start_date), 'MM/dd/yyyy') : 'N/A'}</span>
          <span>End: {row.original.lease_end_date ? format(new Date(row.original.lease_end_date), 'MM/dd/yyyy') : 'N/A'}</span>
        </div>
      )
    },
    {
      accessorKey: 'bed_bath',
      header: 'Bed/Bath',
      cell: ({ row }) => `${row.original.bedrooms || 0}/${row.original.bathrooms || 0}`
    },
    {
      accessorKey: 'rent_cycle',
      header: 'Rent Cycle',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.rent_cycle}
        </Badge>
      )
    },
    {
      accessorKey: 'monthly_rent',
      header: 'Base Rent',
      cell: ({ row }) => `$${row.original.monthly_rent?.toLocaleString() || '0'}`
    },
    {
      accessorKey: 'recurring_charges_total',
      header: 'Charges',
      cell: ({ row }) => `$${row.original.recurring_charges_total.toLocaleString()}`
    },
    {
      accessorKey: 'recurring_credits_total',
      header: 'Credits',
      cell: ({ row }) => `$${row.original.recurring_credits_total.toLocaleString()}`
    },
    {
      accessorKey: 'deposits_held',
      header: 'Deposits',
      cell: ({ row }) => `$${row.original.deposits_held.toLocaleString()}`
    },
    {
      accessorKey: 'prepayments_balance',
      header: 'Prepayments',
      cell: ({ row }) => `$${row.original.prepayments_balance.toLocaleString()}`
    },
    {
      accessorKey: 'balance_due',
      header: 'Balance Due',
      cell: ({ row }) => (
        <span className={row.original.balance_due < 0 ? 'text-green-600' : row.original.balance_due > 0 ? 'text-red-600' : ''}>
          ${row.original.balance_due.toLocaleString()}
        </span>
      )
    },
    {
      accessorKey: 'total_amount',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-medium">
          ${row.original.total_amount.toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Rent Roll Report</h1>
          <p className="text-muted-foreground">View current rent roll and occupancy details</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Portfolio Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Portfolio</label>
              <Select value={uiFilters.portfolioId} onValueChange={(value) => {
                setUiFilters(prev => ({ 
                  ...prev, 
                  portfolioId: value,
                  propertyIds: [], // Reset property selection when portfolio changes
                  unitIds: [] // Reset unit selection when portfolio changes
                }));
                setHasFilterChanges(true);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everything">Everything</SelectItem>
                  {portfolios.map(portfolio => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Properties & Units</label>
              <HierarchicalPropertySelector
                properties={propertiesData || []}
                selectedPropertyIds={uiFilters.propertyIds}
                selectedUnitIds={uiFilters.unitIds}
                onSelectionChange={(propertyIds, unitIds) => {
                  setUiFilters(prev => ({ ...prev, propertyIds, unitIds }));
                  setHasFilterChanges(true);
                }}
                placeholder="Select properties & units..."
              />
            </div>

            {/* Lease Status Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lease Status</label>
              <SimpleDropdownSelect
                options={leaseStatusOptions}
                selected={uiFilters.leaseStatus}
                onChange={(leaseStatus) => {
                  setUiFilters(prev => ({ ...prev, leaseStatus }));
                  setHasFilterChanges(true);
                }}
                placeholder="Select lease status..."
                allLabel="All Status"
                showSearch={false}
              />
            </div>
          </div>

          {/* Date Range and Balance Filter Row */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Date Range */}
            <div className="space-y-2 max-w-2xl">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Report Date Range
              </label>
              <DateRangePicker
                value={uiFilters.dateRange}
                onChange={(dateRange) => {
                  setUiFilters(prev => ({ ...prev, dateRange }));
                  setHasFilterChanges(true);
                }}
                className="w-full"
              />
            </div>

            {/* Balance Filter */}
            <div className="space-y-2 min-w-[180px]">
              <label className="text-sm font-medium">Balance Filter</label>
              <SimpleDropdownSelect
                options={balanceFilterOptions}
                selected={uiFilters.balanceFilter}
                onChange={(balanceFilter) => {
                  setUiFilters(prev => ({ ...prev, balanceFilter }));
                  setHasFilterChanges(true);
                }}
                placeholder="Select balance types..."
                allLabel="All Balances"
                showSearch={false}
              />
            </div>
          </div>

          {/* Run Now Button Section */}
          <div className="border-t pt-4 flex justify-end">
            <div className="flex flex-col gap-2 items-end">
              <Button 
                onClick={handleRunReport} 
                disabled={isRunning || isLoading}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isRunning ? 'Running...' : 'Run Now'}
              </Button>
              {hasFilterChanges && (
                <span className="text-xs text-muted-foreground">
                  Filters changed - click Run Now to update
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'leases', description: 'Active lease agreements and terms' },
            { table: 'tenants', description: 'Tenant contact information' },
            { table: 'properties', description: 'Property addresses and details' },
            { table: 'property_units', description: 'Unit numbers, bed/bath counts, and occupancy' },
            { table: 'lease_payment_schedules', description: 'Rent amounts and payment cycles' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Unit Details', description: 'Bedrooms, bathrooms, and unit configuration' },
              { field: 'Lease Information', description: 'Active leases with start/end dates and rent amounts' },
              { field: 'Tenant Names', description: 'Current tenant information from lease agreements' },
              { field: 'Payment Records', description: 'Balance due, deposits held, and prepayments' }
            ],
            calculationSteps: [
              { step: 'Total Rent', formula: 'Base monthly rent for the unit' },
              { step: 'Charges', formula: 'Sum of recurring charges (utilities, amenities, etc.)' },
              { step: 'Credits', formula: 'Sum of recurring credits/discounts' },
              { step: 'Total Amount', formula: 'Base Rent + Charges - Credits' }
            ],
            note: 'Shows lease status (Current, Expired, Vacant), occupancy rates, and financial summary by property and bedroom/bathroom count.'
          }}
        />

      {/* Export Buttons */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleExportCSV} size="sm" variant="outline" disabled={!hasRunReport || isLoading}>
          <FileText className="h-4 w-4 mr-2" />
          CSV
        </Button>
        <Button onClick={handleExportPDF} size="sm" variant="outline" disabled={!hasRunReport || isLoading}>
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>

      {/* Report Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <DataTable
              columns={detailsColumns}
              data={rentRollData?.units || []}
            />
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          {rentRollData?.summary ? (
            <div className="space-y-6">
              <GrandTotalsSection summary={rentRollData.summary} />
              <SummaryByBedBathTable data={rentRollData.summary.bedBathSummary} />
              <SummaryByPropertyTable data={rentRollData.summary.propertySummary} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

