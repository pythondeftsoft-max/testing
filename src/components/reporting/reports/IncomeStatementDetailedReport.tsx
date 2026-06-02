import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Calendar, Filter, Play, ArrowLeft, FileText, FileSpreadsheet, AlertCircle, Building, MapPin } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useIncomeStatementDetailed, useCheckCashTransactions } from '@/hooks/useIncomeStatementDetailed';
import { formatCurrency } from '@/utils/reportUtils';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface IncomeStatementDetailedReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const IncomeStatementDetailedReport: React.FC<IncomeStatementDetailedReportProps> = ({
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
  const [allPropertiesMode, setAllPropertiesMode] = useState(true);
  const [dateRange, setDateRange] = useState<{from: Date | undefined; to: Date | undefined}>({
    from: startOfYear(new Date()),
    to: new Date()
  });
  
  const [accountingBasis, setAccountingBasis] = useState<'cash' | 'accrual'>('accrual');

  // Reset selected properties when portfolio changes
  React.useEffect(() => {
    setSelectedPropertyIds([]);
    setSelectedUnitIds([]);
    setAllPropertiesMode(true);
    
    if (user?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['user-properties-with-units', user.id] 
      });
    }
  }, [selectedPortfolio, user?.id, queryClient]);

  // Fetch properties with units based on selected portfolio
  const { data: allProperties = [], isLoading: propertiesLoading, error: propertiesError, refetch: refetchProperties } = useAllPropertiesWithUnits(
    user?.id || '',
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );

  // Data fetching hook
  const { data, isLoading, error, runReport, hasRunParams, hasCashTransactions } = useIncomeStatementDetailed();

  // Proactive check for cash transactions
  const { data: cashTransactionsExist, isLoading: checkingCashTransactions } = useCheckCashTransactions({
    propertyIds: !allPropertiesMode && selectedPropertyIds.length > 0 ? selectedPropertyIds : undefined,
    unitIds: !allPropertiesMode && selectedUnitIds.length > 0 ? selectedUnitIds : undefined,
    portfolioId: selectedPortfolio === 'everything' ? 'all' : selectedPortfolio,
    dateRange: dateRange.from && dateRange.to ? {
      from: dateRange.from.toISOString().split('T')[0],
      to: dateRange.to.toISOString().split('T')[0]
    } : undefined
  });

  // Determine if we should show the cash warning proactively
  const shouldShowCashWarning = accountingBasis === 'cash' && 
    dateRange.from && 
    dateRange.to && 
    !checkingCashTransactions && 
    cashTransactionsExist === false;


  const handleRunReport = () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Please select a valid date range');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    const propertyIds = !allPropertiesMode && selectedPropertyIds.length > 0
      ? selectedPropertyIds
      : undefined;

    const unitIds = !allPropertiesMode && selectedUnitIds.length > 0
      ? selectedUnitIds
      : undefined;

    const reportParams = {
      propertyIds: propertyIds && propertyIds.length > 0 ? propertyIds : undefined,
      unitIds: unitIds && unitIds.length > 0 ? unitIds : undefined,
      portfolioId: selectedPortfolio === 'everything' ? 'all' : selectedPortfolio,
      dateRange: {
        from: dateRange.from.toISOString().split('T')[0],
        to: dateRange.to.toISOString().split('T')[0]
      },
      accountingBasis
    };

    runReport(reportParams);
  };

  const handleExportCSV = () => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }

    if (!data || data.length === 0) {
      toast.info('No data to export');
      return;
    }

    const csvRows = [];
    csvRows.push(['Property', 'Category', 'Date', 'Type', 'Check No.', 'Name', 'Memo', 'Amount', 'Data Source']);

    data.forEach(item => {
      if (item.type === 'transaction') {
        csvRows.push([
          '', // Will be filled by property context
          '', // Will be filled by category context
          item.date || '',
          item.transactionType || '',
          item.checkNo || '',
          item.name,
          item.memo || '',
          item.amount?.toString() || '0',
          item.dataSource
        ]);
      }
    });

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-statement-detailed-${getDateRangeLabel()}-${hasRunParams?.accountingBasis || accountingBasis}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV export completed');
  };

  const handleExportPDF = async () => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(16);
      doc.text('Income Statement Detailed', pageWidth / 2, 15, { align: 'center' });
      
      // Report details
      doc.setFontSize(10);
      doc.text(`Date Range: ${getDateRangeLabel()}`, pageWidth / 2, 22, { align: 'center' });
      doc.text(`Accounting Basis: ${hasRunParams?.accountingBasis?.charAt(0).toUpperCase() + hasRunParams?.accountingBasis?.slice(1)}`, pageWidth / 2, 28, { align: 'center' });
      
      // Handle empty data case
      if (!data || data.length === 0) {
        doc.setFontSize(12);
        doc.text('No data found for the selected criteria.', pageWidth / 2, 40, { align: 'center' });
        doc.save(`income-statement-detailed-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
        toast.success('PDF generated successfully');
        return;
      }
      
      // Prepare table data
      const tableData: any[] = [];
      
      data.forEach(item => {
        if (item.type === 'transaction') {
          tableData.push([
            item.name,
            item.date || '',
            item.transactionType || '',
            item.checkNo || '',
            item.memo || '',
            formatCurrency(item.amount || 0),
            item.dataSource === 'actual' ? 'Actual' : item.dataSource === 'pending' ? 'Pending' : 'Expected'
          ]);
        } else if (item.isTotal) {
          // Add totals as bold rows
          tableData.push([
            { content: item.name, colSpan: 5, styles: { fontStyle: 'bold' } },
            { content: formatCurrency(item.amount || 0), styles: { fontStyle: 'bold' } },
            ''
          ]);
        } else {
          // Category/section headers
          tableData.push([
            { content: item.name, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
          ]);
        }
      });
      
      // Generate table
      autoTable(doc, {
        head: [['Description', 'Date', 'Type', 'Check No.', 'Memo', 'Amount', 'Source']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [0, 51, 153],
          textColor: 255,
          fontStyle: 'bold'
        }
      });
      
      // Save PDF
      doc.save(`income-statement-detailed-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
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

    try {
      if (!data || data.length === 0) {
        toast.info('No data to export');
        return;
      }

      // Create Excel-formatted CSV
      let csvContent = 'Income Statement Detailed\n';
      csvContent += `Date Range: ${getDateRangeLabel()}\n`;
      csvContent += `Accounting Basis: ${hasRunParams?.accountingBasis?.charAt(0).toUpperCase() + hasRunParams?.accountingBasis?.slice(1)}\n\n`;
      csvContent += 'Description,Date,Type,Check No.,Name,Memo,Amount,Source\n';
      
      data.forEach(item => {
        if (item.type === 'transaction') {
          const indent = '  '.repeat(item.level || 0);
          csvContent += `"${indent}${item.name}","${item.date || ''}","${item.transactionType || ''}","${item.checkNo || ''}","${item.name}","${item.memo || ''}","${formatCurrency(item.amount || 0)}","${item.dataSource === 'actual' ? 'Actual' : item.dataSource === 'pending' ? 'Pending' : 'Expected'}"\n`;
        } else if (item.isTotal) {
          const indent = '  '.repeat(item.level || 0);
          csvContent += `"${indent}${item.name}","","","","","","${formatCurrency(item.amount || 0)}",""\n`;
        } else {
          // Category/section headers
          const indent = '  '.repeat(item.level || 0);
          csvContent += `"${indent}${item.name}","","","","","","",""\n`;
        }
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `income-statement-detailed-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Excel export completed');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel');
    }
  };

  const getDateRangeLabel = () => {
    if (!dateRange.from || !dateRange.to) return 'No Date Range';
    
    return `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Income Statement Detailed</h1>
            <p className="text-muted-foreground">Individual transaction details with line-by-line breakdown</p>
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

      {/* Report Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Report Filters</h2>
              <p className="text-sm text-muted-foreground">
                Configure your report parameters below
              </p>
            </div>

            <Separator />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Portfolio Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Portfolio</label>
                  </div>
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

                {/* Date Range Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Date Range</label>
                  </div>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Property Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Properties</label>
                  </div>
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
                  ) : (
                    <HierarchicalPropertySelector
                      properties={allProperties}
                      selectedPropertyIds={selectedPropertyIds}
                      selectedUnitIds={selectedUnitIds}
                      onSelectionChange={(propIds, unitIds) => {
                        setSelectedPropertyIds(propIds);
                        setSelectedUnitIds(unitIds);
                      }}
                      isAllPropertiesMode={allPropertiesMode}
                      onAllPropertiesModeChange={setAllPropertiesMode}
                    />
                  )}
                </div>

                {/* Accounting Basis */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Accounting Basis</label>
                  <RadioGroup
                    value={accountingBasis}
                    onValueChange={(value: 'cash' | 'accrual') => setAccountingBasis(value)}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash">Cash</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="accrual" id="accrual" />
                      <Label htmlFor="accrual">Accrual</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            <Separator />

            {/* Proactive Cash Basis Warning */}
            {shouldShowCashWarning && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="space-y-2">
                    <p><strong>No cash transactions found</strong> for the selected criteria.</p>
                    <p className="text-sm">Please consider:</p>
                    <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                      <li>Switch to <strong>Accrual Basis</strong> to see expected income</li>
                      <li>Select a different date range that includes actual payments</li>
                      <li>Change your property or portfolio selection</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={handleRunReport} 
                disabled={isLoading || (accountingBasis === 'cash' && cashTransactionsExist === false)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            { table: 'transactions', description: 'Individual transactions with line-by-line details' },
            { table: 'chart_of_accounts', description: 'Account categories for income and expenses' },
            { table: 'properties', description: 'Property information' },
            { table: 'property_units', description: 'Unit-level assignments' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Transaction Details', description: 'Date, type, amount, and memo for each transaction' },
              { field: 'Chart of Accounts', description: 'Account assignments for proper categorization' },
              { field: 'Property Associations', description: 'Link transactions to specific properties/units' }
            ],
            calculationSteps: [
              { step: 'Total Income', formula: 'Sum of all income transactions in period' },
              { step: 'Total Expenses', formula: 'Sum of all expense transactions in period' },
              { step: 'Net Operating Income', formula: 'Total Income - Operating Expenses' },
              { step: 'Net Income', formula: 'Net Operating Income - Non-Operating Expenses' }
            ],
            note: 'Cash basis requires actual payment transactions. Accrual basis uses expected amounts based on lease terms.'
          }}
        />

      {/* Report Results */}
      {hasRunParams && !isLoading && data && data.length > 0 && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-xl font-bold gradient-text">
              Detailed Income Statement - {getDateRangeLabel()} ({hasRunParams?.accountingBasis?.charAt(0).toUpperCase() + hasRunParams?.accountingBasis?.slice(1)} Basis)
            </CardEnhancedTitle>
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
          </CardEnhancedHeader>
          <CardEnhancedContent>
            {/* Hierarchical Income Statement Display */}
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-2 mb-4">
                <div className="col-span-4">DESCRIPTION</div>
                <div className="col-span-1">DATE</div>
                <div className="col-span-1">TYPE</div>
                <div className="col-span-1">CHECK NO.</div>
                <div className="col-span-2">NAME</div>
                <div className="col-span-2">MEMO</div>
                <div className="col-span-1 text-right">AMOUNT</div>
              </div>
              
              {data.map((item) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 gap-2 py-1 text-sm ${
                    item.isTotal 
                      ? 'font-semibold border-t border-muted pt-2' 
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <div 
                    className="col-span-4 flex items-center gap-2"
                    style={{ paddingLeft: `${item.level}rem` }}
                  >
                    <span className={item.isTotal ? 'font-semibold' : ''}>{item.name}</span>
                    {item.type === 'transaction' && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.dataSource === 'actual' 
                          ? 'bg-green-100 text-green-800' 
                          : item.dataSource === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.dataSource === 'actual' ? 'Actual' : item.dataSource === 'pending' ? 'Pending' : 'Expected'}
                      </span>
                    )}
                  </div>
                  
                  {/* Transaction fields only for transaction types */}
                  {item.type === 'transaction' ? (
                    <>
                      <div className="col-span-1 text-muted-foreground">{item.date}</div>
                      <div className="col-span-1 text-muted-foreground">{item.transactionType}</div>
                      <div className="col-span-1 text-muted-foreground">{item.checkNo}</div>
                      <div className="col-span-2 text-muted-foreground">{item.name}</div>
                      <div className="col-span-2 text-muted-foreground">{item.memo}</div>
                    </>
                  ) : (
                    <div className="col-span-7"></div>
                  )}
                  
                  <div className="col-span-1 text-right">
                    {item.amount !== null && (
                      <span className={item.amount < 0 ? 'text-red-600' : ''}>
                        {formatCurrency(item.amount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Loading State */}
      {isLoading && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Generating detailed income statement...</span>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Error State */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* No Data State */}
      {hasRunParams && !isLoading && !error && (!data || data.length === 0) && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No data available</h3>
              <p>No transactions found for the selected criteria. Try adjusting your filters or date range.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};
