import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Download, FileText, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { SimpleDropdownSelect } from '@/components/ui/simple-dropdown-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getUnitOptionsFromAllProperties, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useRentPaidData, RentPaidDataItem, RentPaidSummaryItem } from '@/hooks/useRentPaidData';
import { formatCurrency } from '@/lib/formatters';
import { generateRentPaidCSV, generateRentPaidPDF } from '@/utils/rentPaidExportUtils';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';


interface RentPaidReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const RentPaidReport: React.FC<RentPaidReportProps> = ({ onBack, portfolioId }) => {
  const { user, loading: authLoading } = useAuth();
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id);
  const [selectedPortfolio, setSelectedPortfolio] = useState(
    portfolioId && portfolioId !== 'everything' ? portfolioId : 'everything'
  );
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedLeaseStatus, setSelectedLeaseStatus] = useState<string[]>([]);
  const [selectedBalanceFilter, setSelectedBalanceFilter] = useState<string[]>([]);
  const [hasRunReport, setHasRunReport] = useState(false);
  const [hasFilterChanges, setHasFilterChanges] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().getFullYear(), 0, 1), // Start of year
    to: new Date(), // Today
  });

  const { data: properties, refetch: refetchProperties } = useAllPropertiesWithUnits(
    user?.id,
    selectedPortfolio !== 'everything' ? selectedPortfolio : undefined
  );


  const { data: rentPaidData, isLoading, fetchRentPaidData } = useRentPaidData();

  const propertyOptions = getUnitOptionsFromAllProperties(properties || []);

  // Reset selected properties when portfolio changes
  useEffect(() => {
    setSelectedProperties([]);
    setSelectedUnitIds([]);
    setSelectedLeaseStatus([]);
    setSelectedBalanceFilter([]);
    setHasFilterChanges(true);
    if (user?.id) {
      refetchProperties();
    }
  }, [selectedPortfolio, user?.id, refetchProperties]);

  // Helper function to detect if all properties are selected
  const isAllPropertiesSelected = () => {
    // If no properties are loaded yet, return false
    if (!properties || properties.length === 0) return false;
    
    // Case 1: Nothing selected (which means "All Properties" by default)
    if (selectedProperties.length === 0 && selectedUnitIds.length === 0) {
      return true;
    }
    
    // Case 2: Check if all individual properties/units are explicitly selected
    let totalSelectableItems = 0;
    let totalSelectedItems = selectedProperties.length + selectedUnitIds.length;
    
    properties.forEach(property => {
      if (property.property_units.length > 0) {
        // Property has units - count the units
        totalSelectableItems += property.property_units.length;
      } else {
        // Property has no units - count the property itself
        totalSelectableItems += 1;
      }
    });
    
    return totalSelectedItems === totalSelectableItems;
  };

  // Helper function to detect if all lease statuses are selected
  const isAllLeaseStatusSelected = () => {
    return selectedLeaseStatus.length === 0 || selectedLeaseStatus.length === leaseStatusOptions.length;
  };

  // Helper function to detect if all balance filters are selected
  const isAllBalanceFiltersSelected = () => {
    return selectedBalanceFilter.length === 0 || selectedBalanceFilter.length === balanceFilterOptions.length;
  };

  // Helper function to check if a custom date range is selected
  const hasCustomDateRange = () => {
    const defaultStartOfYear = new Date(new Date().getFullYear(), 0, 1);
    const defaultToday = new Date();
    
    // Check if the selected date range differs from the default (start of year to today)
    const isDefaultRange = 
      dateRange.from?.getTime() === defaultStartOfYear.getTime() &&
      dateRange.to?.getTime() >= defaultToday.getTime() - 24 * 60 * 60 * 1000; // Allow for same day difference
    
    return !isDefaultRange;
  };

  // Helper function to check if specific filters are selected
  const hasSpecificFiltersSelected = () => {
    const hasSpecificProperties = !isAllPropertiesSelected();
    const hasSpecificLeaseStatus = !isAllLeaseStatusSelected();
    const hasSpecificBalanceFilter = !isAllBalanceFiltersSelected();
    const hasCustomDate = hasCustomDateRange();
    
    return hasSpecificProperties || hasSpecificLeaseStatus || hasSpecificBalanceFilter || hasCustomDate;
  };

  const handleRunReport = () => {
    // Validate that specific filters are selected
    if (!hasSpecificFiltersSelected()) {
      toast.error("Please select specific filters before running the report. Choose specific properties, lease statuses, balance filters, or a custom date range.");
      return;
    }

    if (dateRange.from && dateRange.to) {
      setHasRunReport(true);
      setHasFilterChanges(false);
      
      // Convert unit selections to property IDs if needed
      const allPropertyIds = getPropertyIdsFromAllUnitIds(properties || [], selectedUnitIds);
      
      // FIXED: Properly handle "All Properties" selection
      // When all properties are selected, pass undefined to fetch data for all properties
      let finalPropertyIds: string[] | undefined;
      let finalUnitIds: string[] | undefined;
      
      if (isAllPropertiesSelected()) {
        // All properties selected - don't apply any property filter
        finalPropertyIds = undefined;
        finalUnitIds = undefined;
      } else {
        // Specific properties/units selected
        finalPropertyIds = selectedProperties.length > 0 ? selectedProperties : 
                          selectedUnitIds.length > 0 ? allPropertyIds : undefined;
        finalUnitIds = selectedUnitIds.length > 0 ? selectedUnitIds : undefined;
      }
      
      
      fetchRentPaidData(
        selectedPortfolio,
        finalPropertyIds,
        finalUnitIds,
        dateRange.from.toISOString().split('T')[0],
        dateRange.to.toISOString().split('T')[0]
      );
    }
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

  const getPortfolioName = () => {
    if (selectedPortfolio === 'everything') return 'Everything';
    const portfolio = portfolios?.find(p => p.id === selectedPortfolio);
    return portfolio?.client_name || `Portfolio ${selectedPortfolio}`;
  };

  const handleExportCSV = () => {
    if (!hasRunReport) {
      toast.error('Please run the report first.');
      return;
    }
    
    generateRentPaidCSV(rentPaidData, dateRange, getPortfolioName());
    
    const message = rentPaidData.details.length === 0 
      ? 'CSV exported successfully (no data found)'
      : 'CSV exported successfully';
    toast.success(message);
  };

  const handleExportPDF = async () => {
    if (!hasRunReport) {
      toast.error('Please run the report first.');
      return;
    }
    
    await generateRentPaidPDF(rentPaidData, dateRange, getPortfolioName());
    
    const message = rentPaidData.details.length === 0 
      ? 'PDF exported successfully (no data found)'
      : 'PDF exported successfully';
    toast.success(message);
  };

  // Custom summary table component with perfect alignment
  const RentPaidSummaryTable = () => {
    if (!rentPaidData.summary.length) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No rent payment data found for the selected criteria.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2">
              <th className="text-left p-3 border-r font-medium">Property</th>
              <th className="text-right p-3 border-r font-medium">Rent</th>
              <th className="text-right p-3 border-r font-medium">Non-Rent</th>
              <th className="text-right p-3 border-r font-medium bg-muted/30">Total Charges</th>
              <th className="text-right p-3 border-r font-medium">Rent Paid</th>
              <th className="text-right p-3 border-r font-medium">Non-Rent Paid</th>
              <th className="text-right p-3 border-r font-medium bg-muted/30">Total Paid</th>
              <th className="text-right p-3 border-r font-medium">Previous Balance</th>
              <th className="text-right p-3 font-medium">Balance Due</th>
            </tr>
          </thead>
          <tbody>
            {rentPaidData.summary.map((item, index) => (
              <tr key={item.property} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                <td className="p-3 border-r font-medium">{item.property}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.recurringChargesRent)}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.recurringChargesNonRent)}</td>
                <td className="p-3 border-r text-right text-sm font-medium bg-muted/30">{formatCurrency(item.recurringChargesTotal)}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.amountPaidRent)}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.amountPaidNonRent)}</td>
                <td className="p-3 border-r text-right text-sm font-medium bg-muted/30">{formatCurrency(item.amountPaidTotal)}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.previousBalance)}</td>
                <td className="p-3 text-right text-sm font-medium">{formatCurrency(item.balanceDue)}</td>
              </tr>
            ))}
            {/* Grand Total Row */}
            <tr className="border-t-2 bg-muted/50 font-semibold">
              <td className="p-3 border-r">Grand Total</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.recurringChargesRent)}</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.recurringChargesNonRent)}</td>
              <td className="p-3 border-r text-right bg-muted/70">{formatCurrency(rentPaidData.totals.recurringChargesTotal)}</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.amountPaidRent)}</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.amountPaidNonRent)}</td>
              <td className="p-3 border-r text-right bg-muted/70">{formatCurrency(rentPaidData.totals.amountPaidTotal)}</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.previousBalance)}</td>
              <td className="p-3 text-right">{formatCurrency(rentPaidData.totals.balanceDue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Custom table component with grouped headers
  const RentPaidDetailsTable = () => {
    if (!rentPaidData.details.length) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No rent payment data found for the selected criteria.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2">
              <th rowSpan={2} className="text-left p-3 border-r font-medium">Unit</th>
              <th rowSpan={2} className="text-left p-3 border-r font-medium">Tenant</th>
              <th rowSpan={2} className="text-left p-3 border-r font-medium">Lease Start</th>
              <th rowSpan={2} className="text-left p-3 border-r font-medium">Lease End</th>
              <th colSpan={3} className="text-center p-3 border-r font-medium bg-muted/30">Recurring Charges</th>
              <th colSpan={3} className="text-center p-3 border-r font-medium bg-muted/30">Amount Paid</th>
              <th rowSpan={2} className="text-right p-3 border-r font-medium">Previous Balance</th>
              <th rowSpan={2} className="text-right p-3 font-medium">Balance Due</th>
            </tr>
            <tr>
              <th className="text-right p-2 border-r text-sm">Rent</th>
              <th className="text-right p-2 border-r text-sm">Non-Rent</th>
              <th className="text-right p-2 border-r text-sm bg-muted/50">Total</th>
              <th className="text-right p-2 border-r text-sm">Rent</th>
              <th className="text-right p-2 border-r text-sm">Non-Rent</th>
              <th className="text-right p-2 border-r text-sm bg-muted/50">Total</th>
            </tr>
          </thead>
          <tbody>
            {rentPaidData.details.map((item, index) => (
              <tr key={item.unitId} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                <td className="p-3 border-r">
                  <div className="font-medium text-sm">
                    {item.property}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.unit.split(' - Unit ')[1] || '1'}
                  </div>
                </td>
                <td className="p-3 border-r text-sm">{item.tenant}</td>
                <td className="p-3 border-r text-sm">
                  {item.leaseStart ? format(new Date(item.leaseStart), 'MM/dd/yyyy') : 'N/A'}
                </td>
                <td className="p-3 border-r text-sm">
                  {item.leaseEnd ? format(new Date(item.leaseEnd), 'MM/dd/yyyy') : 'N/A'}
                </td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.recurringChargesRent)}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.recurringChargesNonRent)}</td>
                <td className="p-3 border-r text-right text-sm font-medium bg-muted/30">{formatCurrency(item.recurringChargesTotal)}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.amountPaidRent)}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.amountPaidNonRent)}</td>
                <td className="p-3 border-r text-right text-sm font-medium bg-muted/30">{formatCurrency(item.amountPaidTotal)}</td>
                <td className="p-3 border-r text-right text-sm">{formatCurrency(item.previousBalance)}</td>
                <td className="p-3 text-right text-sm font-medium">{formatCurrency(item.balanceDue)}</td>
              </tr>
            ))}
            {/* Grand Total Row */}
            <tr className="border-t-2 bg-muted/50 font-semibold">
              <td colSpan={4} className="p-3 border-r">Grand Total</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.recurringChargesRent)}</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.recurringChargesNonRent)}</td>
              <td className="p-3 border-r text-right bg-muted/70">{formatCurrency(rentPaidData.totals.recurringChargesTotal)}</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.amountPaidRent)}</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.amountPaidNonRent)}</td>
              <td className="p-3 border-r text-right bg-muted/70">{formatCurrency(rentPaidData.totals.amountPaidTotal)}</td>
              <td className="p-3 border-r text-right">{formatCurrency(rentPaidData.totals.previousBalance)}</td>
              <td className="p-3 text-right">{formatCurrency(rentPaidData.totals.balanceDue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Define columns for summary table
  const summaryColumns: ColumnDef<RentPaidSummaryItem>[] = [
    {
      accessorKey: 'property',
      header: 'Property',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('property')}</div>
      ),
    },
    {
      accessorKey: 'recurringChargesRent',
      header: 'Rent',
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.getValue('recurringChargesRent'))}</div>
      ),
    },
    {
      accessorKey: 'recurringChargesNonRent',
      header: 'Non-Rent',
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.getValue('recurringChargesNonRent'))}</div>
      ),
    },
    {
      accessorKey: 'recurringChargesTotal',
      header: 'Total Charges',
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.getValue('recurringChargesTotal'))}</div>
      ),
    },
    {
      accessorKey: 'amountPaidRent',
      header: 'Rent Paid',
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.getValue('amountPaidRent'))}</div>
      ),
    },
    {
      accessorKey: 'amountPaidNonRent',
      header: 'Non-Rent Paid',
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.getValue('amountPaidNonRent'))}</div>
      ),
    },
    {
      accessorKey: 'amountPaidTotal',
      header: 'Total Paid',
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.getValue('amountPaidTotal'))}</div>
      ),
    },
    {
      accessorKey: 'previousBalance',
      header: 'Previous Balance',
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.getValue('previousBalance'))}</div>
      ),
    },
    {
      accessorKey: 'balanceDue',
      header: 'Balance Due',
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.getValue('balanceDue'))}</div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Rent Paid Report</h1>
          <p className="text-muted-foreground">Track rent payments and balances by property and tenant</p>
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
              <Select value={selectedPortfolio} onValueChange={(value) => {
                setSelectedPortfolio(value);
                setHasFilterChanges(true);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everything">Everything</SelectItem>
                  {portfolios?.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.client_name || `Portfolio ${portfolio.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <HierarchicalPropertySelector
                properties={properties || []}
                selectedPropertyIds={selectedProperties}
                selectedUnitIds={selectedUnitIds}
                onSelectionChange={(propertyIds, unitIds) => {
                  setSelectedProperties(propertyIds);
                  setSelectedUnitIds(unitIds);
                  setHasFilterChanges(true);
                }}
                placeholder="Select properties and units..."
                className="w-full"
              />
            </div>

            {/* Lease Status Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lease Status</label>
              <SimpleDropdownSelect
                options={leaseStatusOptions}
                selected={selectedLeaseStatus}
                onChange={(status) => {
                  setSelectedLeaseStatus(status);
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
                value={dateRange}
                onChange={(dateRange) => {
                  setDateRange(dateRange);
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
                selected={selectedBalanceFilter}
                onChange={(balanceFilter) => {
                  setSelectedBalanceFilter(balanceFilter);
                  setHasFilterChanges(true);
                }}
                placeholder="Select balance types..."
                allLabel="All Balances"
                showSearch={false}
              />
            </div>
          </div>

          {/* Run Now Button Section */}
          <div className="border-t pt-4 flex justify-end items-end">
            <div className="flex flex-col gap-2 items-end">
              <Button 
                onClick={handleRunReport}
                disabled={!dateRange.from || !dateRange.to || isLoading}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isLoading ? 'Running...' : 'Run Now'}
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

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'rent_payments', description: 'Rent payment transactions and dates' },
            { table: 'properties', description: 'Property details and rent amounts' },
            { table: 'property_units', description: 'Unit-level rent and tenant assignments' },
            { table: 'leases', description: 'Active and historical lease agreements' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Payment Date', description: 'Date when each rent payment was received' },
              { field: 'Payment Amount', description: 'Dollar amount of each payment' },
              { field: 'Payment Method', description: 'How payment was received (check, ACH, etc.)' },
              { field: 'Payment Status', description: 'Completed, pending, or failed status' }
            ],
            calculationSteps: [
              { step: 'Total Collected', formula: 'Sum of all completed payments in date range' },
              { step: 'Collection Rate', formula: '(Amount Collected / Amount Expected) × 100%' },
              { step: 'Avg Payment Amount', formula: 'Total Collected / Number of Payments' },
              { step: 'On-Time Payments', formula: 'Count of payments received by due date' }
            ],
            note: 'Shows rent payments received during the selected period. Use to track cash flow and identify payment patterns.'
          }}
        />

      {/* Report Content */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Rent Payment Details</h2>
            {hasRunReport && (
              <div className="text-sm text-muted-foreground">
                {rentPaidData.details.length} record{rentPaidData.details.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          
          {!hasRunReport ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Click "Run Report" to generate rent paid data</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading rent paid data...</p>
            </div>
          ) : (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <RentPaidDetailsTable />
              </TabsContent>
              
              <TabsContent value="summary" className="space-y-4">
                <RentPaidSummaryTable />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </Card>
    </div>
  );
};