import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Separator } from '@/components/ui/separator';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ArrowLeft, Wallet, FileText, FileSpreadsheet, Download, Play, ChevronDown, ChevronRight, Building, Calendar, MapPin, Info, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useRentalOwnerEndingBalances } from '@/hooks/useRentalOwnerEndingBalances';
import { useFinancialDataValidation } from '@/hooks/useFinancialDataValidation';
import { formatCurrency } from '@/utils/reportUtils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface RentalOwnerEndingBalancesReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const RentalOwnerEndingBalancesReport: React.FC<RentalOwnerEndingBalancesReportProps> = ({
  onBack,
  portfolioId
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id || '');
  
  // State for filters
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(
    portfolioId && portfolioId !== 'everything' ? portfolioId : 'everything'
  );
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [isAllPropertiesMode, setIsAllPropertiesMode] = useState<boolean>(true);
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

  // Reset filters when portfolio changes
  React.useEffect(() => {
    setSelectedPropertyIds([]);
    setSelectedUnitIds([]);
    setIsAllPropertiesMode(true);
  }, [selectedPortfolio]);

  // Fetch properties with units based on selected portfolio
  const { 
    data: allProperties = [], 
    isLoading: propertiesLoading, 
    error: propertiesError 
  } = useAllPropertiesWithUnits(
    user?.id || '',
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );

  // Financial data validation hook
  const { 
    data: financialValidation, 
    isLoading: validationLoading 
  } = useFinancialDataValidation(
    user?.id || '',
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
    isAllPropertiesMode ? undefined : selectedPropertyIds
  );

  // Data fetching hook
  const { data: reportData, isLoading, error, runReport, hasRunParams } = useRentalOwnerEndingBalances();

  // Auto-expand all owners when report data loads
  React.useEffect(() => {
    if (reportData && reportData.length > 0) {
      const allOwnerIds = reportData.map(owner => owner.owner_id);
      setExpandedOwners(new Set(allOwnerIds));
    }
  }, [reportData]);

  // Check if user has set any filters from defaults
  const hasUserSetFilters = () => {
    const hasDateRange = dateRange.from !== undefined && dateRange.to !== undefined;
    const hasPortfolioSelection = selectedPortfolio !== 'everything';
    const hasPropertySelection = !isAllPropertiesMode && (selectedPropertyIds.length > 0 || selectedUnitIds.length > 0);
    
    return hasDateRange || hasPortfolioSelection || hasPropertySelection;
  };

  // Validation
  const validateFilters = () => {
    const errors: string[] = [];
    
    if (propertiesLoading || validationLoading) {
      errors.push('Properties are still loading. Please wait.');
    }
    
    if (!hasUserSetFilters()) {
      errors.push('Please configure your report filters (date range, portfolio, or specific properties) before running the report');
    }
    
    if (!dateRange.from || !dateRange.to) {
      errors.push('Please select both start and end dates');
    }
    
    if (!isAllPropertiesMode && selectedPropertyIds.length === 0 && selectedUnitIds.length === 0) {
      errors.push('Please select at least one property or unit');
    }
    
    return errors;
  };

  const validationErrors = validateFilters();
  const isValid = validationErrors.length === 0;

  const handleRunReport = () => {
    if (!isValid) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    let propertyIds: string[] | undefined;
    let unitIds: string[] | undefined;

    if (isAllPropertiesMode) {
      // All properties mode - let the backend handle it
      propertyIds = undefined;
      unitIds = undefined;
    } else {
      // Specific selections
      propertyIds = selectedPropertyIds.length > 0 ? selectedPropertyIds : undefined;
      unitIds = selectedUnitIds.length > 0 ? selectedUnitIds : undefined;
      
      // If we have unit selections, also include the property IDs that contain those units
      if (selectedUnitIds.length > 0) {
        const additionalPropertyIds = getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds);
        const originalPropertyIds = propertyIds || [];
        propertyIds = [...new Set([...originalPropertyIds, ...additionalPropertyIds])];
      }
    }

    const finalPortfolioId = selectedPortfolio === 'everything' ? 'all' : selectedPortfolio;

    const reportParams = {
      propertyIds,
      unitIds,
      portfolioId: finalPortfolioId,
      startDate: format(dateRange.from!, 'yyyy-MM-dd'),
      endDate: format(dateRange.to!, 'yyyy-MM-dd')
    };

    runReport(reportParams);
  };

  const handlePropertySelectionChange = (propertyIds: string[], unitIds: string[]) => {
    setSelectedPropertyIds(propertyIds);
    setSelectedUnitIds(unitIds);
  };

  const handleExportCSV = () => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }
    
    if (!reportData) return;

    const csvRows = [];
    csvRows.push(['Owner', 'Property', 'Ending Cash Balance', 'Deposits Held', 'Property Reserve', 'Available Cash', 'Unpaid Bills', 'Cash Less Unpaid Bills']);
    
    reportData.forEach(owner => {
      owner.properties.forEach(property => {
        csvRows.push([
          owner.owner_name,
          property.property_address,
          property.ending_cash_balance.toString(),
          property.deposits_held.toString(),
          property.property_reserve.toString(),
          property.available_cash.toString(),
          property.unpaid_bills.toString(),
          property.cash_less_unpaid_bills.toString()
        ]);
      });
    });

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rental-owner-ending-balances-${format(dateRange.from!, 'yyyy-MM-dd')}-to-${format(dateRange.to!, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }

    if (!reportData) return;

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(16);
      doc.text('Rental Owner Ending Balances Report', pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Date Range: ${format(dateRange.from!, 'MMM dd, yyyy')} - ${format(dateRange.to!, 'MMM dd, yyyy')}`, pageWidth / 2, 22, { align: 'center' });
      
      const tableData: any[] = [];
      
      reportData.forEach(owner => {
        tableData.push([
          { content: owner.owner_name, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]);
        
        owner.properties.forEach(property => {
          tableData.push([
            property.property_address,
            formatCurrency(property.ending_cash_balance),
            formatCurrency(property.deposits_held),
            formatCurrency(property.property_reserve),
            formatCurrency(property.available_cash),
            formatCurrency(property.unpaid_bills),
            formatCurrency(property.cash_less_unpaid_bills),
            ''
          ]);
        });
      });
      
      if (grandTotals) {
        tableData.push([
          { content: 'Grand Totals', styles: { fontStyle: 'bold' } },
          { content: formatCurrency(grandTotals.ending_cash_balance), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(grandTotals.deposits_held), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(grandTotals.property_reserve), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(grandTotals.available_cash), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(grandTotals.unpaid_bills), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(grandTotals.cash_less_unpaid_bills), styles: { fontStyle: 'bold' } },
          ''
        ]);
      }
      
      autoTable(doc, {
        head: [['Property', 'Ending Cash', 'Deposits Held', 'Property Reserve', 'Available Cash', 'Unpaid Bills', 'Cash Less Bills', '']],
        body: tableData,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 153], textColor: 255, fontStyle: 'bold' }
      });
      
      doc.save(`rental-owner-ending-balances-${format(dateRange.from!, 'yyyy-MM-dd')}-to-${format(dateRange.to!, 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportExcel = () => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }

    if (!reportData) return;

    let csvContent = 'Rental Owner Ending Balances Report\n';
    csvContent += `Date Range: ${format(dateRange.from!, 'MMM dd, yyyy')} - ${format(dateRange.to!, 'MMM dd, yyyy')}\n\n`;
    csvContent += 'Owner,Property,Ending Cash Balance,Deposits Held,Property Reserve,Available Cash,Unpaid Bills,Cash Less Unpaid Bills\n';
    
    reportData.forEach(owner => {
      owner.properties.forEach(property => {
        csvContent += `"${owner.owner_name}","${property.property_address}","${formatCurrency(property.ending_cash_balance)}","${formatCurrency(property.deposits_held)}","${formatCurrency(property.property_reserve)}","${formatCurrency(property.available_cash)}","${formatCurrency(property.unpaid_bills)}","${formatCurrency(property.cash_less_unpaid_bills)}"\n`;
      });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rental-owner-ending-balances-${format(dateRange.from!, 'yyyy-MM-dd')}-to-${format(dateRange.to!, 'yyyy-MM-dd')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel export completed');
  };

  const toggleOwnerExpansion = (ownerId: string) => {
    setExpandedOwners(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ownerId)) {
        newSet.delete(ownerId);
      } else {
        newSet.add(ownerId);
      }
      return newSet;
    });
  };

  const calculateGrandTotals = () => {
    if (!reportData) return null;
    
    return reportData.reduce((totals, owner) => ({
      ending_cash_balance: totals.ending_cash_balance + owner.totals.ending_cash_balance,
      deposits_held: totals.deposits_held + owner.totals.deposits_held,
      property_reserve: totals.property_reserve + owner.totals.property_reserve,
      available_cash: totals.available_cash + owner.totals.available_cash,
      unpaid_bills: totals.unpaid_bills + owner.totals.unpaid_bills,
      cash_less_unpaid_bills: totals.cash_less_unpaid_bills + owner.totals.cash_less_unpaid_bills,
    }), {
      ending_cash_balance: 0,
      deposits_held: 0,
      property_reserve: 0,
      available_cash: 0,
      unpaid_bills: 0,
      cash_less_unpaid_bills: 0,
    });
  };

  const grandTotals = calculateGrandTotals();

  // Data requirements for the report
  const dataRequirements = [
    {
      field: 'Ending Cash Balance',
      description: 'Current cash position for each property at the report end date',
      impact: 'Missing values show as $0.00 in Ending Cash Balance column',
      location: 'Property Details → Financial Information'
    },
    {
      field: 'Security Deposits Held',
      description: 'Total tenant security deposits held in trust for each property',
      impact: 'Missing values show as $0.00 in Deposits Held column',
      location: 'Property Details → Financial Information'
    },
    {
      field: 'Property Reserve',
      description: 'Reserve funds allocated to each property for maintenance and expenses',
      impact: 'Missing values show as $0.00 in Property Reserve column',
      location: 'Property Details → Financial Information'
    },
    {
      field: 'Monthly Rent',
      description: 'Monthly rental amount per property (used for unpaid bill calculations)',
      impact: 'Affects accuracy of unpaid bills calculation when cash flow data is incomplete',
      location: 'Property Details → Rental Information'
    },
    {
      field: 'Property Cash Flow',
      description: 'Disbursement transactions after the report end date',
      impact: 'Missing cash flow data may result in inaccurate unpaid bills calculations',
      location: 'Property Management → Cash Flow Tracking'
    },
    {
      field: 'Property Units',
      description: 'Unit-level information for multi-unit properties (optional)',
      impact: 'Missing unit data prevents unit-level breakdowns in the report',
      location: 'Property Details → Units Management'
    }
  ];

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
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-blue-900">
              Rental Owner Ending Balances Report
            </h1>
            <p className="text-sm text-muted-foreground">
              Show ending cash balances by property and owner for comprehensive financial tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Filter Section Title */}
            <div>
              <h3 className="text-lg font-semibold mb-1">Report Filters</h3>
              <p className="text-sm text-muted-foreground">Configure your report parameters</p>
            </div>

            {/* Filters in 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Portfolio Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium">
                      Portfolio <span className="text-destructive">*</span>
                    </label>
                  </div>
                    <Select
                      value={selectedPortfolio}
                      onValueChange={(value) => {
                        setSelectedPortfolio(value);
                      }}
                    >
                    <SelectTrigger className={`${!selectedPortfolio ? 'border-destructive' : ''}`}>
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

                {/* Date Range */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium">
                      Date Range <span className="text-destructive">*</span>
                    </label>
                  </div>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    className={`${!dateRange.from || !dateRange.to ? 'border-destructive' : ''}`}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Properties Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium">
                      Properties/Units
                    </label>
                  </div>
                  {propertiesLoading ? (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted/10">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      <span className="text-sm text-muted-foreground">Loading properties...</span>
                    </div>
                  ) : propertiesError ? (
                    <div className="text-center text-destructive text-sm">
                      Error loading properties. Please try again.
                    </div>
                  ) : allProperties.length > 0 ? (
                    <HierarchicalPropertySelector
                      properties={allProperties}
                      selectedPropertyIds={selectedPropertyIds}
                      selectedUnitIds={selectedUnitIds}
                      onSelectionChange={handlePropertySelectionChange}
                      onAllPropertiesModeChange={(mode) => {
                        setIsAllPropertiesMode(mode);
                      }}
                      isAllPropertiesMode={isAllPropertiesMode}
                      placeholder="Select properties/units"
                      disabled={propertiesLoading}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-3">
                      No properties found for selected portfolio
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button 
                onClick={handleRunReport} 
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
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
            { table: 'properties', description: 'Property financial balances and reserve funds' },
            { table: 'property_units', description: 'Unit-level financial tracking' },
            { table: 'transactions', description: 'Cash flow and disbursement records' },
            { table: 'rent_payments', description: 'Security deposits held' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Ending Cash Balance', description: 'Current cash balance for each property' },
              { field: 'Security Deposits Held', description: 'Tenant security deposits being held' },
              { field: 'Property Reserve', description: 'Reserve funds allocated to the property' },
              { field: 'Monthly Rent', description: 'Current monthly rent amount for accurate unpaid calculations' }
            ],
            calculationSteps: [
              { step: 'Available Cash', formula: 'Ending Cash Balance + Security Deposits + Property Reserve' },
              { step: 'Unpaid Bills', formula: 'Outstanding rent and fees based on payment history' },
              { step: 'Cash Less Unpaid Bills', formula: 'Available Cash - Unpaid Bills' }
            ],
            note: 'Missing financial fields will display as $0.00 in the report. Update your properties with complete data for accurate reporting.',
            updateButton: {
              label: 'Update Properties',
              onClick: () => {
                const currentPortfolioId = searchParams.get('portfolioId') || 'everything';
                navigate(`/dashboard?portfolioId=${currentPortfolioId}#properties`);
              }
            }
          }}
        />

      {/* Loading State */}
      {isLoading && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-lg">Loading rental owner ending balances...</span>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Error State */}
      {error && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="text-center text-destructive">
              <p className="text-lg">Error loading rental owner ending balances</p>
              <Button 
                variant="outline" 
                onClick={handleRunReport}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* No Data or Report Not Run State */}
      {!hasRunParams && !isLoading && (
        <CardEnhanced>
          <CardEnhancedContent className="p-12">
            <div className="text-center text-muted-foreground">
              <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">Rental Owner Ending Balances Report</p>
              <p className="text-sm mt-2">Select your filters and click "Run Report" to generate the ending balances report.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* No Data Found After Running Report */}
      {hasRunParams && !isLoading && (!reportData || reportData.length === 0) && (
        <CardEnhanced>
          <CardEnhancedContent className="p-12">
            <div className="text-center text-muted-foreground">
              <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No Data Found</p>
              <p className="text-sm mt-2">
                No properties found matching your filter criteria. Try adjusting your portfolio or property selections.
              </p>
              <Button 
                variant="outline" 
                onClick={handleRunReport}
                className="mt-4"
              >
                Run Report Again
              </Button>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Report Results */}
      {hasRunParams && !isLoading && reportData && reportData.length > 0 && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-xl font-bold gradient-text">
              Rental Owner Ending Balances - {format(dateRange.from!, 'MMM dd, yyyy')} to {format(dateRange.to!, 'MMM dd, yyyy')}
            </CardEnhancedTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Property</TableHead>
                    <TableHead className="text-right">Ending Cash Balance</TableHead>
                    <TableHead className="text-right">Deposits Held</TableHead>
                    <TableHead className="text-right">Property Reserve</TableHead>
                    <TableHead className="text-right">Available Cash</TableHead>
                    <TableHead className="text-right">Unpaid Bills</TableHead>
                    <TableHead className="text-right">Cash Less Unpaid Bills</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((owner) => (
                    <React.Fragment key={owner.owner_id}>
                      {/* Owner Total Row */}
                      <TableRow 
                        className="font-semibold bg-muted/30 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleOwnerExpansion(owner.owner_id)}
                      >
                        <TableCell className="flex items-center gap-2">
                          {expandedOwners.has(owner.owner_id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <div className="font-semibold">{owner.owner_name}</div>
                            {owner.company_name && (
                              <div className="text-sm text-muted-foreground">{owner.company_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(owner.totals.ending_cash_balance)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(owner.totals.deposits_held)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(owner.totals.property_reserve)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(owner.totals.available_cash)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(owner.totals.unpaid_bills)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(owner.totals.cash_less_unpaid_bills)}
                        </TableCell>
                      </TableRow>

                      {/* Property Rows */}
                      {expandedOwners.has(owner.owner_id) && owner.properties.map((property) => (
                        <TableRow key={property.property_id}>
                          <TableCell className="pl-8">
                            {property.property_address}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(property.ending_cash_balance)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(property.deposits_held)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(property.property_reserve)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(property.available_cash)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(property.unpaid_bills)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(property.cash_less_unpaid_bills)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Grand Totals Row */}
                  {grandTotals && (
                    <TableRow className="font-bold bg-primary/10 border-t-2">
                      <TableCell className="font-bold">Grand Totals</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(grandTotals.ending_cash_balance)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(grandTotals.deposits_held)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(grandTotals.property_reserve)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(grandTotals.available_cash)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(grandTotals.unpaid_bills)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(grandTotals.cash_less_unpaid_bills)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};