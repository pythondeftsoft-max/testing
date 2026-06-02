import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Separator } from '@/components/ui/separator';
import { Download, Play, ArrowLeft, FileText, FileSpreadsheet, Building, MapPin, Calendar, BookmarkPlus } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { useGeneralLedgerConsolidated } from '@/hooks/useGeneralLedgerConsolidated';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { format as formatDate, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useSavedReports, SavedReportConfig } from '@/hooks/useSavedReports';
import { SaveCustomReportDialog } from '@/components/reporting/SaveCustomReportDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface GeneralLedgerConsolidatedReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const GeneralLedgerConsolidatedReport: React.FC<GeneralLedgerConsolidatedReportProps> = ({ 
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
  const [datePreset, setDatePreset] = useState<string>('');
  const [accountingBasis, setAccountingBasis] = useState<'cash' | 'accrual'>('accrual');
  const [saveAsCustom, setSaveAsCustom] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedSavedReport, setSelectedSavedReport] = useState<string>('');

  // Fetch saved reports
  const { data: savedReports = [], refetch: refetchSavedReports } = useSavedReports(
    user?.id || '',
    'general_ledger_consolidated'
  );

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
  const { sections, grandTotal, loading, error, runReport, refetch, hasRunParams } = useGeneralLedgerConsolidated();

  // Handle date preset changes
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    
    switch (preset) {
      case 'monthly':
        setDateRange({
          from: startOfMonth(today),
          to: endOfMonth(today)
        });
        break;
      case '3-month':
        setDateRange({
          from: startOfMonth(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
          to: endOfMonth(today)
        });
        break;
      case '6-month':
        setDateRange({
          from: startOfMonth(new Date(today.getFullYear(), today.getMonth() - 5, 1)),
          to: endOfMonth(today)
        });
        break;
      case 'year-to-date':
        setDateRange({
          from: startOfYear(today),
          to: today
        });
        break;
      case 'year':
        setDateRange({
          from: startOfYear(today),
          to: endOfYear(today)
        });
        break;
      case '5-year':
        setDateRange({
          from: new Date(today.getFullYear() - 4, 0, 1),
          to: endOfYear(today)
        });
        break;
      case 'all-time':
        setDateRange({
          from: new Date(2000, 0, 1),
          to: today
        });
        break;
      default:
        break;
    }
  };

  // Handle running the report
  const handleRunReport = () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Please select a valid date range');
      return;
    }

    // Validate property/unit selection
    if (!allPropertiesMode && selectedPropertyIds.length === 0 && selectedUnitIds.length === 0) {
      toast.error(
        'No Properties Selected\n\n' +
        'Please select at least one property or unit to generate the report.\n\n' +
        'Options:\n' +
        '• Select specific properties/units from the dropdown\n' +
        '• Check "All Properties" to include all properties in the selected portfolio',
        {
          duration: 8000,
        }
      );
      return;
    }

    const propertyIds = !allPropertiesMode && selectedPropertyIds.length > 0 
      ? selectedPropertyIds
      : !allPropertiesMode && selectedUnitIds.length > 0
      ? getPropertyIdsFromAllUnitIds(userProperties, selectedUnitIds)
      : undefined;

    runReport(
      selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
      dateRange.from.toISOString().split('T')[0],
      dateRange.to.toISOString().split('T')[0],
      propertyIds,
      accountingBasis
    );
    
    if (saveAsCustom) {
      setShowSaveDialog(true);
    }
  };

  const handleLoadSavedReport = (reportId: string) => {
    const report = savedReports.find((r) => r.id === reportId);
    if (!report) return;

    const config = report.config as SavedReportConfig;

    // Load all the saved configuration
    if (config.portfolioId) {
      setSelectedPortfolio(config.portfolioId);
    }
    if (config.propertyIds) {
      setSelectedPropertyIds(config.propertyIds);
    }
    if (config.unitIds) {
      setSelectedUnitIds(config.unitIds);
    }
    if (config.allPropertiesMode !== undefined) {
      setAllPropertiesMode(config.allPropertiesMode);
    }
    if (config.dateRange) {
      setDateRange({
        from: new Date(config.dateRange.start),
        to: new Date(config.dateRange.end),
      });
    }
    if (config.accountingBasis) {
      setAccountingBasis(config.accountingBasis);
    }
    if (config.datePreset) {
      setDatePreset(config.datePreset);
    }

    toast.success(`Loaded report: ${report.name}`);
    setSelectedSavedReport(reportId);

    // Auto-run the report after a short delay to allow state to update
    setTimeout(() => {
      handleRunReport();
    }, 100);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }

    if (format === 'csv') {
      const csvHeaders = ['Section', 'Account Type', 'Account Name', 'Previous Balance', 'Debits', 'Credits', 'Ending Balance'];
      const csvRows = [csvHeaders.join(',')];

      sections.forEach(section => {
        csvRows.push(`\n"${section.sectionName}",,,,,,,`);
        
        section.accounts.forEach(account => {
          const row = [
            `"${section.sectionName}"`,
            `"${account.accountType}"`,
            `"${account.accountName}"`,
            account.previousBalance.toString(),
            account.totalDebits.toString(),
            account.totalCredits.toString(),
            account.endingBalance.toString()
          ];
          csvRows.push(row.join(','));
        });

        csvRows.push(`"Total ${section.sectionName}",,,,,,"${section.sectionTotal}"`);
      });

      csvRows.push(`\n"Grand Total",,,,,,"${grandTotal}"`);

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `general-ledger-consolidated-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(16);
      doc.text('General Ledger Consolidated Report', pageWidth / 2, 15, { align: 'center' });
      
      // Date range and accounting basis
      doc.setFontSize(10);
      const startDate = dateRange.from!;
      const endDate = dateRange.to!;
      const dateText = `${formatDate(startDate, 'MMM dd, yyyy')} - ${formatDate(endDate, 'MMM dd, yyyy')}`;
      const basisCapitalized = accountingBasis.charAt(0).toUpperCase() + accountingBasis.slice(1);
      const basisText = `Accounting Basis: ${basisCapitalized}`;
      doc.text(dateText, pageWidth / 2, 22, { align: 'center' });
      doc.text(basisText, pageWidth / 2, 28, { align: 'center' });
      
      // Check if there's no data
      if (sections.length === 0) {
        doc.setFontSize(12);
        doc.text('No data found for the selected criteria.', pageWidth / 2, 40, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Try adjusting your filters or date range.', pageWidth / 2, 50, { align: 'center' });
        
        doc.save(`general-ledger-consolidated-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
        toast.success('PDF generated successfully');
        return;
      }
      
      // Prepare table data
      const tableData: any[] = [];
      
      sections.forEach(section => {
        // Section header
        tableData.push([
          { content: section.sectionName, colSpan: 6, styles: { fillColor: [220, 220, 220], fontStyle: 'bold' } }
        ]);
        
        // Accounts in this section
        section.accounts.forEach(account => {
          tableData.push([
            account.accountType,
            account.accountName,
            formatCurrency(account.previousBalance),
            formatCurrency(account.totalDebits),
            formatCurrency(account.totalCredits),
            formatCurrency(account.endingBalance)
          ]);
        });
        
        // Section total
        tableData.push([
          { content: `Total ${section.sectionName}`, colSpan: 5, styles: { fontStyle: 'bold' } },
          { content: formatCurrency(section.sectionTotal), styles: { fontStyle: 'bold' } }
        ]);
      });
      
      // Grand total
      tableData.push([
        { content: 'Grand Total', colSpan: 5, styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: formatCurrency(grandTotal), styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } }
      ]);
      
      // Generate table
      autoTable(doc, {
        startY: 35,
        head: [['Account Type', 'Account Name', 'Previous Balance', 'Debits', 'Credits', 'Ending Balance']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });
      
      // Save PDF
      doc.save(`general-ledger-consolidated-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
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
            <p className="text-destructive mb-4">Error loading consolidated general ledger: {error}</p>
            <Button onClick={onBack} variant="outline">
              Back to Reports
            </Button>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

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
            <h1 className="text-3xl font-bold gradient-text">General Ledger Consolidated</h1>
            <p className="text-muted-foreground">
              Consolidated account summaries across all properties
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
            <Button onClick={() => handleExport('csv')} size="sm" variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Load Saved Report Section */}
            {savedReports.length > 0 && (
              <div className="space-y-2 pb-4 border-b">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <BookmarkPlus className="h-4 w-4" />
                  Load Saved Report
                </Label>
                <Select
                  value={selectedSavedReport}
                  onValueChange={handleLoadSavedReport}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a saved report configuration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{report.name}</span>
                          {report.description && (
                            <span className="text-xs text-muted-foreground">
                              {report.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Two Column Grid: Portfolio/Date/Basis on left, Properties/Save on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Portfolio Filter */}
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

                {/* Save as custom report */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="save-custom"
                    checked={saveAsCustom}
                    onCheckedChange={(checked) => setSaveAsCustom(checked === true)}
                  />
                  <Label htmlFor="save-custom" className="text-sm cursor-pointer">
                    Save as custom report
                  </Label>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Properties Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4" />
                    Properties & Units
                  </Label>
                  {propertiesLoading ? (
                    <div className="flex items-center justify-center h-10 border rounded-md bg-muted/10">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  ) : propertiesError ? (
                    <div className="flex items-center justify-center h-10 border rounded-md bg-destructive/10 text-destructive text-sm">
                      Error loading properties
                    </div>
                  ) : (
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
                  )}
                </div>

                {/* Accounting Basis */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Accounting Basis</Label>
                  <RadioGroup
                    value={accountingBasis}
                    onValueChange={(value) => setAccountingBasis(value as 'cash' | 'accrual')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="accrual" id="accrual" />
                      <Label htmlFor="accrual" className="cursor-pointer">Accrual</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="cursor-pointer">Cash</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            <Separator />

            {/* Run Report Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleRunReport}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Run Report
              </Button>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'transactions', description: 'All financial transactions consolidated across properties' },
            { table: 'chart_of_accounts', description: 'Account types and categories' },
            { table: 'properties', description: 'Property information for aggregation' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'All Transaction Records', description: 'Complete transaction history for each account' },
              { field: 'Account Classifications', description: 'Account types and categories' },
              { field: 'Property Assignments', description: 'Property associations for each transaction' }
            ],
            calculationSteps: [
              { step: 'Previous Balance', formula: 'Starting balance before date range' },
              { step: 'Total Debits', formula: 'Sum of all debit transactions in period' },
              { step: 'Total Credits', formula: 'Sum of all credit transactions in period' },
              { step: 'Ending Balance', formula: 'Previous Balance + Debits - Credits' },
              { step: 'Section Totals', formula: 'Aggregated by account type' }
            ],
            note: 'Consolidated view of all accounting activity across properties. Filter by date range and accounting basis.'
          }}
        />

      {/* Report Results */}
      {hasRunParams && !loading && sections.length > 0 && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-xl font-bold gradient-text">
              Consolidated General Ledger Summary
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
            <div className="space-y-8">
              {sections.map((section, sectionIndex) => (
                <div key={section.sectionName} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold text-openkey-blue">{section.sectionName}</h3>
                  </div>
                  
                   <div className="overflow-x-auto">
                     <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/20">
                            <th className="text-left p-2 font-medium">DATE</th>
                            <th className="text-left p-2 font-medium">TYPE</th>
                            <th className="text-left p-2 font-medium">UNIT</th>
                            <th className="text-left p-2 font-medium min-w-[200px]">PROPERTY</th>
                            <th className="text-left p-2 font-medium">NAME</th>
                            <th className="text-left p-2 font-medium min-w-[250px]">DESCRIPTION</th>
                            <th className="text-right p-2 font-medium">DEBIT</th>
                            <th className="text-right p-2 font-medium">CREDIT</th>
                            <th className="text-right p-2 font-medium">BALANCE</th>
                          </tr>
                        </thead>
                       <tbody>
                         {section.accounts.map((account) => (
                           <React.Fragment key={account.accountName}>
                             {/* Account header row */}
                             <tr className="bg-muted/10 border-b font-semibold">
                               <td colSpan={9} className="p-2 text-left font-bold text-openkey-blue">
                                 {account.accountName}
                               </td>
                             </tr>
                             
                             {/* Previous balance row if exists */}
                             {account.previousBalance !== 0 && (
                               <tr className="border-b hover:bg-muted/5">
                                 <td className="p-2"></td>
                                 <td className="p-2">Previous Balance</td>
                                 <td className="p-2"></td>
                                 <td className="p-2"></td>
                                 <td className="p-2">Previous Balance</td>
                                 <td className="p-2">Beginning balance</td>
                                 <td className="p-2 text-right">
                                   {account.previousBalance > 0 ? formatCurrency(Math.abs(account.previousBalance)) : ''}
                                 </td>
                                 <td className="p-2 text-right">
                                   {account.previousBalance < 0 ? formatCurrency(Math.abs(account.previousBalance)) : ''}
                                 </td>
                                 <td className="p-2 text-right font-medium">
                                   {formatCurrency(account.previousBalance)}
                                 </td>
                               </tr>
                             )}
                             
                             {/* Transaction rows */}
                             {account.transactions.map((transaction, transIndex) => (
                                <tr key={`${account.accountName}-${transIndex}`} className="border-b hover:bg-muted/5">
                                  <td className="p-2">{formatDate(new Date(transaction.date), 'M/d/yyyy')}</td>
                                  <td className="p-2">{transaction.type}</td>
                                  <td className="p-2">{transaction.unit}</td>
                                  <td className="p-2 truncate max-w-[250px]" title={transaction.property}>
                                    {transaction.property}
                                  </td>
                                  <td className="p-2">{transaction.name}</td>
                                  <td className="p-2 truncate max-w-[300px]" title={transaction.description}>
                                    {transaction.description}
                                  </td>
                                  <td className="p-2 text-right">
                                    {transaction.debit > 0 ? formatCurrency(transaction.debit) : ''}
                                  </td>
                                  <td className="p-2 text-right">
                                    {transaction.credit > 0 ? formatCurrency(transaction.credit) : ''}
                                  </td>
                                  <td className="p-2 text-right font-medium">
                                    {formatCurrency(transaction.balance)}
                                  </td>
                                </tr>
                             ))}
                             
                             {/* Account total row */}
                             <tr className="border-b-2 border-openkey-blue bg-openkey-blue/5 font-semibold">
                               <td colSpan={6} className="p-2">Total {account.accountName}</td>
                               <td className="p-2 text-right">
                                 {formatCurrency(account.totalDebits)}
                               </td>
                               <td className="p-2 text-right">
                                 {formatCurrency(account.totalCredits)}
                               </td>
                               <td className="p-2 text-right font-bold text-openkey-blue">
                                 {formatCurrency(account.endingBalance)}
                               </td>
                             </tr>
                           </React.Fragment>
                         ))}
                         
                         {/* Section total row */}
                         <tr className="border-b-2 border-openkey-gold bg-openkey-gold/10 font-bold text-lg">
                           <td colSpan={6} className="p-3">TOTAL {section.sectionName.toUpperCase()}</td>
                           <td className="p-3 text-right">
                             {formatCurrency(section.accounts.reduce((sum, acc) => sum + acc.totalDebits, 0))}
                           </td>
                           <td className="p-3 text-right">
                             {formatCurrency(section.accounts.reduce((sum, acc) => sum + acc.totalCredits, 0))}
                           </td>
                           <td className="p-3 text-right font-bold text-openkey-gold">
                             {formatCurrency(section.sectionTotal)}
                           </td>
                         </tr>
                       </tbody>
                     </table>
                   </div>
                </div>
              ))}

              {/* Grand Total */}
              <div className="mt-8 pt-6 border-t-2 border-openkey-blue">
                <div className="flex justify-between items-center bg-gradient-blue-gold text-white p-4 rounded-lg">
                  <span className="text-xl font-bold">Grand Total</span>
                  <span className="text-2xl font-bold">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Empty State */}
      {hasRunParams && !loading && sections.length === 0 && (
        <CardEnhanced>
          <CardEnhancedContent className="p-12 text-center">
            <div className="text-muted-foreground space-y-4">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>
                <p className="text-lg font-medium">No financial data found</p>
                <p>No data found for the selected filters and date range.</p>
              </div>
              <div className="text-sm space-y-1">
                <p>• Selected Portfolio: {selectedPortfolio === 'everything' ? 'Everything' : portfolios.find(p => p.id === selectedPortfolio)?.client_name || 'Unknown'}</p>
                <p>• Properties Available: {userProperties.length}</p>
                <p>• Date Range: {dateRange.from && formatDate(dateRange.from, 'MMM d, yyyy')} - {dateRange.to && formatDate(dateRange.to, 'MMM d, yyyy')}</p>
              </div>
              <p className="text-xs">Try adjusting your filters or date range, or ensure your properties have financial transactions for this period.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Instructions */}
      {!hasRunParams && (
        <CardEnhanced>
          <CardEnhancedContent className="p-12 text-center">
            <div className="text-muted-foreground space-y-2">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Configure and Run Your Consolidated Report</p>
              <p>Select your portfolio, properties, and date range above, then click "Run Report" to generate the consolidated general ledger.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Save Custom Report Dialog */}
      <SaveCustomReportDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        userId={user?.id || ''}
        reportConfig={{
          reportType: 'general_ledger_consolidated',
          portfolioId: selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
          propertyIds: selectedPropertyIds,
          unitIds: selectedUnitIds,
          allPropertiesMode,
          dateRange: {
            start: dateRange.from?.toISOString() || '',
            end: dateRange.to?.toISOString() || '',
          },
          datePreset,
          accountingBasis,
        }}
        onSaveSuccess={() => {
          refetchSavedReports();
          setSaveAsCustom(false);
        }}
      />
    </div>
  );
};