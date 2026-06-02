import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Calendar, Play, ArrowLeft, FileText, Building, MapPin, AlertCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { useIncomeStatementConsolidated, useCheckCashTransactions } from '@/hooks/useIncomeStatementConsolidated';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { format as formatDate } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface IncomeStatementConsolidatedReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const IncomeStatementConsolidatedReport: React.FC<IncomeStatementConsolidatedReportProps> = ({ 
  onBack, 
  portfolioId 
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id || '');
  
  // State for filters
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(
    portfolioId && portfolioId !== 'everything' ? portfolioId : 'everything'
  );
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [allPropertiesMode, setAllPropertiesMode] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<{from: Date | undefined; to: Date | undefined}>({
    from: new Date('2025-01-01'),
    to: new Date('2025-09-01')
  });
  const [interval, setInterval] = useState<'none' | 'month' | 'quarter'>('quarter');
  const [accountingBasis, setAccountingBasis] = useState<'cash' | 'accrual'>('accrual');
  const [shouldCheckCash, setShouldCheckCash] = useState(false);

  // Reset selected properties when portfolio changes
  React.useEffect(() => {
    setSelectedPropertyIds([]);
    setSelectedUnitIds([]);
    setAllPropertiesMode(true);
    
    if (user?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['all-properties-with-units', user.id] 
      });
    }
  }, [selectedPortfolio, user?.id, queryClient]);

  // Fetch properties with units based on selected portfolio
  const { data: userProperties = [], isLoading: propertiesLoading, error: propertiesError } = useAllPropertiesWithUnits(
    user?.id || '',
    selectedPortfolio === 'everything' ? 'all' : selectedPortfolio
  );

  // Use the consolidated hook
  const { data, loading, error, runReport, hasRunParams } = useIncomeStatementConsolidated();

  // Check for cash transactions proactively
  const { data: cashTransactionsExist = false, isLoading: checkingCashTransactions } = useCheckCashTransactions({
    propertyIds: !allPropertiesMode && selectedPropertyIds.length > 0 ? selectedPropertyIds : undefined,
    unitIds: !allPropertiesMode && selectedUnitIds.length > 0 ? selectedUnitIds : undefined,
    portfolioId: selectedPortfolio === 'everything' ? 'all' : selectedPortfolio,
    dateRange: dateRange.from && dateRange.to ? {
      from: dateRange.from.toISOString().split('T')[0],
      to: dateRange.to.toISOString().split('T')[0]
    } : undefined
  }, shouldCheckCash && hasRunParams);

  const shouldShowCashWarning = accountingBasis === 'cash' && 
    dateRange.from && 
    dateRange.to && 
    !checkingCashTransactions && 
    !cashTransactionsExist;

  // Handle running the report
  const handleRunReport = () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Please select a valid date range');
      return;
    }

    const propertyIds = !allPropertiesMode && selectedPropertyIds.length > 0 
      ? selectedPropertyIds
      : !allPropertiesMode && selectedUnitIds.length > 0
      ? getPropertyIdsFromAllUnitIds(userProperties, selectedUnitIds)
      : undefined;

    setShouldCheckCash(true);
    
    runReport(
      selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
      dateRange.from.toISOString().split('T')[0],
      dateRange.to.toISOString().split('T')[0],
      propertyIds,
      interval,
      accountingBasis
    );
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }

    if (format === 'csv') {
      // Export logic here
      toast.success('CSV export started');
    } else {
      // Generate PDF
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(16);
      doc.text('Income Statement - Consolidated', pageWidth / 2, 15, { align: 'center' });
      
      // Date range, interval, and accounting basis
      doc.setFontSize(10);
      const startDate = dateRange.from!;
      const endDate = dateRange.to!;
      const dateText = `${formatDate(startDate, 'MMM dd, yyyy')} - ${formatDate(endDate, 'MMM dd, yyyy')}`;
      const intervalCapitalized = interval === 'none' ? 'No Intervals' : interval.charAt(0).toUpperCase() + interval.slice(1);
      const intervalText = `Interval: ${intervalCapitalized}`;
      const basisCapitalized = accountingBasis.charAt(0).toUpperCase() + accountingBasis.slice(1);
      const basisText = `Accounting Basis: ${basisCapitalized}`;
      doc.text(dateText, pageWidth / 2, 22, { align: 'center' });
      doc.text(`${intervalText} | ${basisText}`, pageWidth / 2, 28, { align: 'center' });
      
      // Check if there's no data
      const hasData = data && data.income.totalIncome > 0;

      if (!hasData) {
        // Generate PDF with "No data found" message
        doc.setFontSize(12);
        doc.text('No data found for the selected criteria.', pageWidth / 2, 40, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Try adjusting your filters, date range, or accounting basis.', pageWidth / 2, 50, { align: 'center' });
        
        // Save PDF
        doc.save(`income-statement-consolidated-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
        toast.success('PDF generated successfully');
        return;
      }
      
      // Prepare table headers
      const headers = ['Category', ...intervalColumns, 'TOTAL'];
      
      // Prepare table data
      const tableData: any[] = [];
      
      // INCOME section
      tableData.push([{ content: 'INCOME', colSpan: headers.length, styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } }]);
      
      // Rent Income
      const rentRow = ['Rent Income'];
      intervalColumns.forEach(interval => {
        rentRow.push(formatCurrency(data.intervals?.[interval]?.income.rentIncome || 0));
      });
      rentRow.push(formatCurrency(data.income.rentIncome));
      tableData.push(rentRow);
      
      // Utility Income
      const utilityRow = ['Utility Income'];
      intervalColumns.forEach(interval => {
        utilityRow.push(formatCurrency(data.intervals?.[interval]?.income.utilityIncome || 0));
      });
      utilityRow.push(formatCurrency(data.income.utilityIncome));
      tableData.push(utilityRow);
      
      // Total Income
      const totalIncomeRow = [{ content: 'Total Income', styles: { fontStyle: 'bold' } }];
      intervalColumns.forEach(interval => {
        totalIncomeRow.push({ content: formatCurrency(data.intervals?.[interval]?.income.totalIncome || 0), styles: { fontStyle: 'bold' } });
      });
      totalIncomeRow.push({ content: formatCurrency(data.income.totalIncome), styles: { fontStyle: 'bold' } });
      tableData.push(totalIncomeRow);
      
      // Net Operating Income
      const noiRow = [{ content: 'Net Operating Income', styles: { fillColor: [220, 220, 220], fontStyle: 'bold' } }];
      intervalColumns.forEach(interval => {
        noiRow.push({ content: formatCurrency(data.intervals?.[interval]?.netOperatingIncome || 0), styles: { fillColor: [220, 220, 220], fontStyle: 'bold' } });
      });
      noiRow.push({ content: formatCurrency(data.netOperatingIncome), styles: { fillColor: [220, 220, 220], fontStyle: 'bold' } });
      tableData.push(noiRow);
      
      // Net Income
      const netIncomeRow = [{ content: 'Net Income', styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } }];
      intervalColumns.forEach(interval => {
        netIncomeRow.push({ content: formatCurrency(data.intervals?.[interval]?.netIncome || 0), styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } });
      });
      netIncomeRow.push({ content: formatCurrency(data.netIncome || 0), styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } });
      tableData.push(netIncomeRow);
      
      // Generate table
      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 60 }
        }
      });
      
      // Save PDF
      doc.save(`income-statement-consolidated-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated successfully');
    }
  };

  if (portfoliosLoading || (loading && hasRunParams) || propertiesLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <CardEnhanced className="w-full">
        <CardEnhancedContent className="p-6">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">Error loading income statement: {error}</p>
            <Button onClick={onBack} variant="outline">
              Back to Reports
            </Button>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  const intervalColumns = (data?.intervals && Object.keys(data.intervals).length > 0) ? Object.keys(data.intervals) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Back Button */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-1 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        {/* Title and Actions */}
        <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Income Statement Consolidated</h1>
            <p className="text-muted-foreground">
              Consolidated income statement across all properties
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('csv')} size="sm" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={() => handleExport('pdf')} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Two-column filter layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Portfolio, Date Range, and Interval */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Building className="h-4 w-4" />
                    Portfolio
                  </Label>
                  <Select
                    value={selectedPortfolio}
                    onValueChange={setSelectedPortfolio}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everything">All Portfolios</SelectItem>
                      {portfolios.map((portfolio) => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </Label>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Accounting Basis</Label>
                  <RadioGroup
                    value={accountingBasis}
                    onValueChange={(value) => setAccountingBasis(value as 'cash' | 'accrual')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="accrual" id="accrual-consolidated" />
                      <Label htmlFor="accrual-consolidated" className="cursor-pointer">Accrual</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash-consolidated" />
                      <Label htmlFor="cash-consolidated" className="cursor-pointer">Cash</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Right Column - Properties and Accounting Basis */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4" />
                    Properties
                  </Label>
                  <HierarchicalPropertySelector
                    properties={userProperties}
                    selectedPropertyIds={selectedPropertyIds}
                    selectedUnitIds={selectedUnitIds}
                    onSelectionChange={(propertyIds, unitIds) => {
                      setSelectedPropertyIds(propertyIds);
                      setSelectedUnitIds(unitIds);
                    }}
                    isAllPropertiesMode={allPropertiesMode}
                    onAllPropertiesModeChange={setAllPropertiesMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Interval</Label>
                  <Select value={interval} onValueChange={(value) => setInterval(value as 'none' | 'month' | 'quarter')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Intervals</SelectItem>
                      <SelectItem value="quarter">Quarterly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Proactive Cash Basis Warning */}
            {shouldShowCashWarning && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>No cash transactions found</strong> for the selected criteria. Please:
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>Switch to <strong>Accrual Basis</strong> to see expected income</li>
                    <li>Select a different date range that includes actual payments</li>
                    <li>Change your property selection</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Separator className="my-4" />

            {/* Run Report Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleRunReport}
                disabled={loading || (accountingBasis === 'cash' && !cashTransactionsExist)}
                className="bg-openkey-blue hover:bg-openkey-blue/90 text-white"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Report
              </Button>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'transactions', description: 'Consolidated financial transactions' },
            { table: 'chart_of_accounts', description: 'Income and expense categories' },
            { table: 'properties', description: 'All properties in portfolio' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Transaction Data', description: 'Income and expense transactions across all properties' },
              { field: 'Chart of Accounts', description: 'Account categories for proper grouping' },
              { field: 'Property Information', description: 'Properties included in consolidation' }
            ],
            calculationSteps: [
              { step: 'Rent Income', formula: 'Sum of rental income across all properties' },
              { step: 'Utility Income', formula: 'Sum of utility payments across all properties' },
              { step: 'Total Income', formula: 'Rent Income + Utility Income + Other Income' },
              { step: 'Net Operating Income', formula: 'Total Income - Operating Expenses' },
              { step: 'Net Income', formula: 'Net Operating Income - Non-Operating Expenses' }
            ],
            note: 'Consolidates data across multiple properties. Cash basis requires payment transactions in the date range.'
          }}
        />

      {/* Report Results */}
      {hasRunParams && !loading && data && (accountingBasis === 'accrual' || data.hasCashTransactions) && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-xl font-bold gradient-text">
              Income Statement - Consolidated
            </CardEnhancedTitle>
            <div className="text-sm text-muted-foreground">
              {dateRange.from && dateRange.to && (
                <>
                  Period: {formatDate(dateRange.from, 'MMM d, yyyy')} - {formatDate(dateRange.to, 'MMM d, yyyy')}
                </>
              )}
            </div>
          </CardEnhancedHeader>
          <CardEnhancedContent>
            <div className="space-y-4">
              {/* Property Header */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-openkey-blue mb-4">All properties</h2>
              </div>

              {/* Income Statement Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium w-1/3"></th>
                      {intervalColumns.map((interval) => (
                        <th key={interval} className="text-right p-2 font-medium">
                          {interval}
                        </th>
                      ))}
                      <th className="text-right p-2 font-medium">
                        <strong>TOTAL</strong>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* INCOME Section */}
                    <tr className="border-b bg-muted/20">
                      <td className="p-2 font-bold text-openkey-blue">INCOME</td>
                      {intervalColumns.map((interval) => (
                        <td key={interval} className="p-2"></td>
                      ))}
                      <td className="p-2"></td>
                    </tr>
                    
                    <tr className="hover:bg-muted/5">
                      <td className="p-2 pl-6">Rent Income</td>
                      {intervalColumns.map((interval) => (
                        <td key={interval} className="text-right p-2">
                          {formatCurrency(data.intervals?.[interval]?.income.rentIncome || 0)}
                        </td>
                      ))}
                      <td className="text-right p-2">
                        {formatCurrency(data.income.rentIncome)}
                      </td>
                    </tr>
                    
                    <tr className="hover:bg-muted/5">
                      <td className="p-2 pl-6">Utility Income</td>
                      {intervalColumns.map((interval) => (
                        <td key={interval} className="text-right p-2">
                          {formatCurrency(data.intervals?.[interval]?.income.utilityIncome || 0)}
                        </td>
                      ))}
                      <td className="text-right p-2">
                        {formatCurrency(data.income.utilityIncome)}
                      </td>
                    </tr>

                    <tr className="border-b font-semibold bg-muted/10">
                      <td className="p-2 pl-6">Total Income</td>
                      {intervalColumns.map((interval) => (
                        <td key={interval} className="text-right p-2">
                          {formatCurrency(data.intervals?.[interval]?.income.totalIncome || 0)}
                        </td>
                      ))}
                      <td className="text-right p-2">
                        {formatCurrency(data.income.totalIncome)}
                      </td>
                    </tr>

                    {/* NET OPERATING INCOME */}
                    <tr className="border-b font-bold bg-muted/20">
                      <td className="p-2 text-openkey-blue">Net Operating Income</td>
                      {intervalColumns.map((interval) => (
                        <td key={interval} className="text-right p-2">
                          {formatCurrency(data.intervals?.[interval]?.netOperatingIncome || 0)}
                        </td>
                      ))}
                      <td className="text-right p-2">
                        {formatCurrency(data.netOperatingIncome)}
                      </td>
                    </tr>

                    {/* NET INCOME */}
                    <tr className="border-b font-bold bg-muted/20">
                      <td className="p-2 text-openkey-blue">Net Income</td>
                      {intervalColumns.map((interval) => (
                        <td key={interval} className="text-right p-2">
                          {formatCurrency(data.intervals?.[interval]?.netIncome || 0)}
                        </td>
                      ))}
                      <td className="text-right p-2">
                        {formatCurrency(data.netIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Empty State - No Data Found */}
      {hasRunParams && !loading && (!data || 
        (accountingBasis === 'cash' && !data.hasCashTransactions) || 
        data.income.totalIncome === 0) && (
        <CardEnhanced>
          <CardEnhancedContent className="p-12 text-center">
            <div className="text-muted-foreground space-y-4">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>
                <p className="text-lg font-medium">No Data Found</p>
                <p>No income statement data found for the selected criteria.</p>
              </div>
              <div className="text-sm space-y-1">
                <p>• Selected Portfolio: {selectedPortfolio === 'everything' ? 'All Portfolios' : portfolios.find(p => p.id === selectedPortfolio)?.client_name || 'Unknown'}</p>
                <p>• Properties Mode: {allPropertiesMode ? 'All Properties' : `${selectedPropertyIds.length} properties, ${selectedUnitIds.length} units selected`}</p>
                <p>• Date Range: {dateRange.from && formatDate(dateRange.from, 'MMM d, yyyy')} - {dateRange.to && formatDate(dateRange.to, 'MMM d, yyyy')}</p>
                <p>• Accounting Basis: {accountingBasis === 'cash' ? 'Cash' : 'Accrual'}</p>
              </div>
              <p className="text-xs">Try adjusting your filters, date range, or accounting basis. For cash basis, ensure there are recorded payments in this period.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Instructions - Before Report is Run */}
      {!hasRunParams && (
        <CardEnhanced>
          <CardEnhancedContent className="p-12 text-center">
            <div className="text-muted-foreground space-y-2">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Configure and Run Your Report</p>
              <p>Select your portfolio, properties, date range, and interval above, then click "Run Report" to generate the consolidated income statement.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};