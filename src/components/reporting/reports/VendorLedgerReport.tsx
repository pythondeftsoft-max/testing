import React, { useState, useEffect } from 'react';
import { ArrowLeft, Receipt, Download, Calendar, Play, Users, DollarSign, Info, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleDropdownSelect } from '@/components/ui/simple-dropdown-select';
import { DataTable } from '@/components/ui/data-table';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getUnitOptionsFromAllProperties, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useVendorLedger, VendorLedgerSummary } from '@/hooks/useVendorLedger';
import { useAllVendors } from '@/hooks/useAllVendors';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import VendorPaymentModal from '@/components/VendorPaymentModal';
import { toast } from '@/hooks/use-toast';
import { generateVendorLedgerCSV, generateVendorLedgerPDF } from '@/utils/vendorLedgerExportUtils';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface VendorLedgerReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const VendorLedgerReport: React.FC<VendorLedgerReportProps> = ({
  onBack,
  portfolioId
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id || '');
  
  // State for filters
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(
    portfolioId && portfolioId !== 'everything' ? portfolioId : 'everything'
  );
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [selectedVendor, setSelectedVendor] = useState<string[]>([]);
  const [hasRunValidReport, setHasRunValidReport] = useState(false);

  // Check if user has selected specific filters (not defaults)
  const hasValidFilters = () => {
    const hasSpecificPortfolio = selectedPortfolio !== 'everything';
    const hasSpecificProperties = selectedProperties.length > 0 || selectedUnitIds.length > 0;
    const hasSpecificVendor = selectedVendor.length > 0;
    const hasDateRange = dateRange.from || dateRange.to;
    
    return hasSpecificPortfolio || hasSpecificProperties || hasSpecificVendor || hasDateRange;
  };

  // Reset selected properties when portfolio changes
  useEffect(() => {
    setSelectedProperties([]);
    setSelectedUnitIds([]);
    
    if (user?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['user-properties-with-units', user.id] 
      });
    }
  }, [selectedPortfolio, user?.id, queryClient]);

  // Fetch properties with units based on selected portfolio
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError, refetch: refetchProperties } = useAllPropertiesWithUnits(
    user?.id || '',
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );

  const { ledgerData, loading, fetchVendorLedger } = useVendorLedger();
  const { vendors, loading: vendorsLoading } = useAllVendors();

  const handleRunReport = () => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    // Validate that user has selected specific filters
    if (!hasValidFilters()) {
      toast({
        title: "Please set specific filters",
        description: "Select a specific portfolio, properties, vendor, or date range to run the report.",
        variant: "destructive",
      });
      return;
    }

    // Get final property IDs - if nothing selected explicitly, use undefined to query all
    const finalSelectedProperties = selectedUnitIds.length > 0 || selectedProperties.length > 0
      ? getPropertyIdsFromAllUnitIds(properties || [], selectedUnitIds.length > 0 ? selectedUnitIds : selectedProperties)
      : undefined;

    fetchVendorLedger(
      selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
      selectedVendor.length === 0 ? undefined : selectedVendor,
      dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      finalSelectedProperties
    );
    
    setHasRunValidReport(true);
  };


  // Calculate totals from ledgerData instead of filteredLedgerData
  const grandTotalBills = ledgerData.reduce((sum, vendor) => sum + vendor.totalBills, 0);
  const grandTotalPayments = ledgerData.reduce((sum, vendor) => sum + vendor.totalPayments, 0);
  const grandOutstandingBalance = grandTotalBills - grandTotalPayments;

  // Define table columns for vendor transactions
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.getValue('date')), 'MM/dd/yyyy')
    },
    {
      accessorKey: 'propertyAddress',
      header: 'Property'
    },
    {
      accessorKey: 'referenceNumber',
      header: 'Ref. No.'
    },
    {
      accessorKey: 'description',
      header: 'Description'
    },
    {
      accessorKey: 'billAmount',
      header: 'Bill',
      cell: ({ row }) => {
        const amount = row.getValue('billAmount') as number;
        return amount > 0 ? `$${amount.toFixed(2)}` : '';
      }
    },
    {
      accessorKey: 'paymentAmount',
      header: 'Payment',
      cell: ({ row }) => {
        const amount = row.getValue('paymentAmount') as number;
        return amount > 0 ? `$${amount.toFixed(2)}` : '';
      }
    }
  ];

  const handleExportCSV = () => {
    if (!hasRunValidReport || ledgerData.length === 0) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }

    generateVendorLedgerCSV(ledgerData, dateRange);
    toast({
      title: "CSV exported",
      description: "Vendor ledger has been exported to CSV successfully.",
    });
  };

  const handleExportPDF = () => {
    if (!hasRunValidReport || ledgerData.length === 0) {
      toast({
        title: "No data to export",
        description: "Please run the report first to generate data for export.",
        variant: "destructive",
      });
      return;
    }

    generateVendorLedgerPDF(
      ledgerData,
      dateRange,
      grandTotalBills,
      grandTotalPayments,
      grandOutstandingBalance
    );
    toast({
      title: "PDF exported",
      description: "Vendor ledger has been exported to PDF successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vendor Ledger</h1>
            <p className="text-muted-foreground">
              From {dateRange.from ? format(dateRange.from, 'M/d/yyyy') : 'All Time'} to{' '}
              {dateRange.to ? format(dateRange.to, 'M/d/yyyy') : 'Present'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={!hasRunValidReport || ledgerData.length === 0}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={!hasRunValidReport || ledgerData.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Information Section */}
            <div className="bg-card/50 rounded-lg border p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Vendor Ledger Information</h3>
                  <p className="text-sm text-muted-foreground">
                    This report compiles vendor transactions from three sources: Vendor Payment Records, 
                    Expense Tracking entries with vendor names, and Maintenance Requests with actual costs.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
              <Button
                className="flex items-center gap-2"
                onClick={() => {
                  const searchParams = new URLSearchParams(window.location.search);
                  searchParams.set('maintenanceTab', 'vendors');
                  searchParams.set('vendorSubtab', 'vendors');
                  window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
                  window.dispatchEvent(new CustomEvent('maintenance-tab-switch', { detail: 'vendors' }));
                }}
              >
                <Users className="h-4 w-4" />
                Manage Vendors
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  const searchParams = new URLSearchParams(window.location.search);
                  searchParams.set('maintenanceTab', 'vendors');
                  searchParams.set('vendorSubtab', 'payments');
                  window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
                  window.dispatchEvent(new CustomEvent('maintenance-tab-switch', { detail: 'vendors' }));
                }}
              >
                <Receipt className="h-4 w-4" />
                Record Payment
              </Button>
              </div>
            </div>

            {/* Top row filters */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio</label>
                <Select
                  value={selectedPortfolio}
                  onValueChange={setSelectedPortfolio}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everything">Everything</SelectItem>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Properties Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Properties</label>
                <div className="relative">
                  {propertiesLoading ? (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted/10">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  ) : propertiesError ? (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-destructive/10 text-destructive text-xs">
                      Error loading properties
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchProperties()}
                        className="ml-2 h-auto p-1 text-destructive hover:text-destructive/80"
                      >
                        Retry
                      </Button>
                    </div>
                   ) : properties.length > 0 ? (
                     <HierarchicalPropertySelector
                       properties={properties || []}
                       selectedPropertyIds={selectedProperties}
                       selectedUnitIds={selectedUnitIds}
                       onSelectionChange={(propertyIds, unitIds) => {
                         setSelectedProperties(propertyIds);
                         setSelectedUnitIds(unitIds);
                       }}
                     />
                   ) : (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted/20 text-muted-foreground text-xs">
                      No properties available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date Range and Vendor Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Range Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Vendor filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor</label>
                <SimpleDropdownSelect
                  options={vendors.map(vendor => ({
                    value: vendor.name,
                    label: vendor.name
                  }))}
                  selected={selectedVendor}
                  onChange={setSelectedVendor}
                  placeholder="Select vendors"
                  allLabel="All Vendors"
                  showSearch={false}
                />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button 
                onClick={handleRunReport} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'vendor_payments', description: 'Vendor payment records' },
            { table: 'expense_tracking', description: 'Expense entries with vendor assignments' },
            { table: 'maintenance_requests', description: 'Work orders with actual costs' },
            { table: 'vendors', description: 'Vendor contact and account information' },
            { table: 'properties', description: 'Property assignments for expenses' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Vendor Invoices', description: 'Bills and invoices from vendors' },
              { field: 'Payment Records', description: 'Payments made to vendors with dates' },
              { field: 'Work Orders', description: 'Completed maintenance tied to vendor costs' }
            ],
            calculationSteps: [
              { step: 'Total Billed', formula: 'Sum of all vendor invoices' },
              { step: 'Total Paid', formula: 'Sum of all payments to vendor' },
              { step: 'Balance Due', formula: 'Total Billed - Total Paid' },
              { step: 'Avg Invoice Amount', formula: 'Total Billed / Number of Invoices' }
            ],
            note: 'Tracks all financial activity with vendors and contractors. Use to manage vendor relationships and payment schedules.'
          }}
        />

      {/* Summary Totals - Only show when report has been run with valid filters */}
      {hasRunValidReport && ledgerData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardEnhanced>
            <CardEnhancedContent className="p-4">
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground">Total Bills</h3>
                <p className="text-2xl font-bold text-foreground">${grandTotalBills.toFixed(2)}</p>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
          
          <CardEnhanced>
            <CardEnhancedContent className="p-4">
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground">Total Payments</h3>
                <p className="text-2xl font-bold text-foreground">${grandTotalPayments.toFixed(2)}</p>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
          
          <CardEnhanced>
            <CardEnhancedContent className="p-4">
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground">Outstanding Balance</h3>
                <p className={`text-2xl font-bold ${grandOutstandingBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                  ${Math.abs(grandOutstandingBalance).toFixed(2)}
                </p>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>
        </div>
      )}

      {/* Vendor Ledger Details */}
      <CardEnhanced>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Vendor Payment Details
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading vendor data...</p>
            </div>
          ) : !hasRunValidReport ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 mx-auto w-fit">
                  <AlertCircle className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Select Filters to Run Report</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Please select specific filters above (portfolio, properties, vendor, or date range) and click "Run Report" to view vendor data.
                  </p>
                </div>
              </div>
            </div>
          ) : ledgerData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-full bg-muted mx-auto w-fit">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No Vendor Data Found</h3>
                  <p className="text-muted-foreground">
                    No vendor transactions found for the selected filters
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {ledgerData.map((vendor) => (
                <div key={vendor.vendorName} className="space-y-4">
                  {/* Vendor Header */}
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold text-foreground">{vendor.vendorName}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Bills: <span className="font-medium">${vendor.totalBills.toFixed(2)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Payments: <span className="font-medium">${vendor.totalPayments.toFixed(2)}</span>
                      </span>
                      <span className={`font-medium ${vendor.outstandingBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                        Outstanding: ${Math.abs(vendor.outstandingBalance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Vendor Transactions Table */}
                  {vendor.transactions.length > 0 ? (
                    <DataTable
                      columns={columns}
                      data={vendor.transactions}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No transactions found for this vendor</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};