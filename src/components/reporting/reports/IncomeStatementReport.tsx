import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Separator } from '@/components/ui/separator';
import { Download, Calendar, Play, ArrowLeft, FileText, FileSpreadsheet, Building, MapPin, BookmarkPlus } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { useIncomeStatement } from '@/hooks/useIncomeStatement';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { format as formatDate, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSavedReports, SavedReportConfig } from '@/hooks/useSavedReports';
import { SaveCustomReportDialog } from '@/components/reporting/SaveCustomReportDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface IncomeStatementReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const IncomeStatementReport: React.FC<IncomeStatementReportProps> = ({ 
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
  const [interval, setInterval] = useState<'month' | 'quarter' | 'year' | 'none'>('month');
  const [accountingBasis, setAccountingBasis] = useState<'cash' | 'accrual'>('accrual');
  const [saveAsCustom, setSaveAsCustom] = useState<boolean>(false);
  const [datePreset, setDatePreset] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedSavedReport, setSelectedSavedReport] = useState<string>('');

  // Fetch saved reports
  const { data: savedReports = [], refetch: refetchSavedReports } = useSavedReports(
    user?.id || '',
    'income_statement'
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

  // Use the income statement hook
  const { properties, loading, error, runReport, hasRunParams } = useIncomeStatement();


  // Handle running the report
  const handleRunReport = async () => {
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

    // Validate cash transactions for cash basis reports
    if (accountingBasis === 'cash') {
      try {
        const startDate = dateRange.from.toISOString().split('T')[0];
        const endDate = dateRange.to.toISOString().split('T')[0];
        
        const propertyIds = !allPropertiesMode && selectedPropertyIds.length > 0 
          ? selectedPropertyIds
          : !allPropertiesMode && selectedUnitIds.length > 0
          ? getPropertyIdsFromAllUnitIds(userProperties, selectedUnitIds)
          : undefined;

        // Check for rent payments in the date range
        let rentPaymentsQuery = supabase
          .from('rent_payments')
          .select('id')
          .gte('payment_date', startDate)
          .lte('payment_date', endDate)
          .in('status', ['completed', 'paid']);

        if (propertyIds && propertyIds.length > 0) {
          rentPaymentsQuery = rentPaymentsQuery.in('property_id', propertyIds);
        }

        const { data: rentPayments, error: rentError } = await rentPaymentsQuery.limit(1);

        if (rentError) {
          console.error('Error validating rent payments:', rentError);
          toast.error('Error validating cash transactions. Please try again.');
          return;
        }

        // Check for expense tracking records in the date range
        let expenseQuery = supabase
          .from('expense_tracking')
          .select('id')
          .gte('expense_date', startDate)
          .lte('expense_date', endDate);

        if (propertyIds && propertyIds.length > 0) {
          expenseQuery = expenseQuery.in('property_id', propertyIds);
        }

        const { data: expenseData, error: expenseError } = await expenseQuery.limit(1);

        if (expenseError) {
          console.error('Error validating expense data:', expenseError);
          toast.error('Error validating expense transactions. Please try again.');
          return;
        }

        const hasRentPayments = (rentPayments?.length || 0) > 0;
        const hasExpenseActivity = (expenseData?.length || 0) > 0;

        if (!hasRentPayments && !hasExpenseActivity) {
          toast.error(
            `Cash Basis Report Cannot Be Generated\n\n` +
            `Cash basis accounting requires actual cash transactions within the selected period. ` +
            `No rent payments or expense records were found for ${formatDate(dateRange.from, 'MMM dd, yyyy')} - ${formatDate(dateRange.to, 'MMM dd, yyyy')}.\n\n` +
            `To generate this report, you need:\n` +
            `• Completed rent payments during this period, OR\n` +
            `• Expense records in the expense tracking table\n\n` +
            `Options:\n` +
            `• Switch to Accrual basis to see expected income and expenses\n` +
            `• Select a different date range with transaction activity\n` +
            `• Add payment/expense records for this period first`,
            {
              duration: 10000,
            }
          );
          return;
        }
      } catch (error) {
        console.error('Error validating cash transactions:', error);
        toast.error('Error validating cash transactions. Please try again.');
        return;
      }
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
      accountingBasis,
      interval
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
    if (config.interval) {
      setInterval(config.interval);
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
      // Create CSV content for income statement
      const csvHeaders = ['Property', 'Account', 'Amount'];
      const csvRows = [csvHeaders.join(',')];

      // Check if there's no data
      if (properties.length === 0) {
        csvRows.push('No data found for the selected criteria.');
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `income-statement-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('CSV exported successfully');
        return;
      }

      properties.forEach(property => {
        csvRows.push(`\n\"${property.address}\",,,`);
        
        // Income section
        csvRows.push(`,\"INCOME\",,`);
        csvRows.push(`,\"Rent Income\",\"${property.rentIncome}\"`);
        if (property.lateFeeIncome > 0) csvRows.push(`,\"Late Fee Income\",\"${property.lateFeeIncome}\"`);
        if (property.utilityIncome > 0) csvRows.push(`,\"Utility Income\",\"${property.utilityIncome}\"`);
        if (property.laundryIncome > 0) csvRows.push(`,\"Laundry Income\",\"${property.laundryIncome}\"`);
        if (property.petFeeIncome > 0) csvRows.push(`,\"Pet Fees\",\"${property.petFeeIncome}\"`);
        if (property.parkingIncome > 0) csvRows.push(`,\"Parking Income\",\"${property.parkingIncome}\"`);
        if (property.storageIncome > 0) csvRows.push(`,\"Storage Income\",\"${property.storageIncome}\"`);
        if (property.vendingIncome > 0) csvRows.push(`,\"Vending Income\",\"${property.vendingIncome}\"`);
        if (property.amenityFees > 0) csvRows.push(`,\"Amenity Fees\",\"${property.amenityFees}\"`);
        if (property.otherIncome > 0) csvRows.push(`,\"Other Income\",\"${property.otherIncome}\"`);
        csvRows.push(`,\"Total Income\",\"${property.totalIncome}\"`);
        
        // Operating Expenses section
        csvRows.push(`,\"OPERATING EXPENSES\",,`);
        if (property.insuranceExpense > 0) csvRows.push(`,\"Insurance\",\"${property.insuranceExpense}\"`);
        if (property.propertyTaxesExpense > 0) csvRows.push(`,\"Property Taxes\",\"${property.propertyTaxesExpense}\"`);
        if (property.managementExpense > 0) csvRows.push(`,\"Management Fees\",\"${property.managementExpense}\"`);
        if (property.repairMaintenanceExpense > 0) csvRows.push(`,\"Repairs & Maintenance\",\"${property.repairMaintenanceExpense}\"`);
        if (property.waterExpense > 0) csvRows.push(`,\"Water\",\"${property.waterExpense}\"`);
        if (property.electricExpense > 0) csvRows.push(`,\"Electric\",\"${property.electricExpense}\"`);
        if (property.gasExpense > 0) csvRows.push(`,\"Gas\",\"${property.gasExpense}\"`);
        if (property.sewerExpense > 0) csvRows.push(`,\"Sewer\",\"${property.sewerExpense}\"`);
        if (property.trashExpense > 0) csvRows.push(`,\"Trash\",\"${property.trashExpense}\"`);
        if (property.landscapingExpense > 0) csvRows.push(`,\"Landscaping\",\"${property.landscapingExpense}\"`);
        if (property.cleaningExpense > 0) csvRows.push(`,\"Cleaning\",\"${property.cleaningExpense}\"`);
        if (property.legalFeesExpense > 0) csvRows.push(`,\"Legal Fees\",\"${property.legalFeesExpense}\"`);
        if (property.accountingFeesExpense > 0) csvRows.push(`,\"Accounting Fees\",\"${property.accountingFeesExpense}\"`);
        if (property.marketingExpense > 0) csvRows.push(`,\"Marketing\",\"${property.marketingExpense}\"`);
        if (property.hoaFeesExpense > 0) csvRows.push(`,\"HOA Fees\",\"${property.hoaFeesExpense}\"`);
        if (property.otherOperatingExpenses > 0) csvRows.push(`,\"Other Operating Expenses\",\"${property.otherOperatingExpenses}\"`);
        csvRows.push(`,\"Total Operating Expenses\",\"${property.totalOperatingExpenses}\"`);
        
        csvRows.push(`,\"Net Operating Income\",\"${property.netOperatingIncome}\"`);
        
        // Non-Operating Expenses
        if (property.mortgageExpense > 0) {
          csvRows.push(`,\"NON-OPERATING EXPENSES\",,`);
          csvRows.push(`,\"Mortgage\",\"${property.mortgageExpense}\"`);
          csvRows.push(`,\"Total Non-Operating Expenses\",\"${property.totalNonOperatingExpenses}\"`);
        }
        
        csvRows.push(`,\"Net Income\",\"${property.netIncome}\"`);
      });

      // Download CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `income-statement-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } else {
      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(16);
      doc.text('Income Statement Report', pageWidth / 2, 15, { align: 'center' });
      
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
      if (properties.length === 0) {
        doc.setFontSize(12);
        doc.text('No data found for the selected criteria.', pageWidth / 2, 40, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Try adjusting your filters or date range.', pageWidth / 2, 50, { align: 'center' });
        
        doc.save(`income-statement-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
        toast.success('PDF generated successfully');
        return;
      }
      
      let currentY = 35;
      
      // Loop through each property
      properties.forEach((property, index) => {
        if (index > 0) {
          doc.addPage();
          currentY = 15;
        }
        
        // Property header
        doc.setFontSize(14);
        doc.text(property.address, 14, currentY);
        currentY += 10;
        
        const tableData: any[] = [];
        
        // INCOME section
        tableData.push([{ content: 'INCOME', colSpan: 2, styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } }]);
        tableData.push(['Rent Income', formatCurrency(property.rentIncome)]);
        if (property.lateFeeIncome > 0) tableData.push(['Late Fee Income', formatCurrency(property.lateFeeIncome)]);
        if (property.utilityIncome > 0) tableData.push(['Utility Income', formatCurrency(property.utilityIncome)]);
        if (property.laundryIncome > 0) tableData.push(['Laundry Income', formatCurrency(property.laundryIncome)]);
        if (property.petFeeIncome > 0) tableData.push(['Pet Fees', formatCurrency(property.petFeeIncome)]);
        if (property.parkingIncome > 0) tableData.push(['Parking Income', formatCurrency(property.parkingIncome)]);
        if (property.storageIncome > 0) tableData.push(['Storage Income', formatCurrency(property.storageIncome)]);
        if (property.vendingIncome > 0) tableData.push(['Vending Income', formatCurrency(property.vendingIncome)]);
        if (property.amenityFees > 0) tableData.push(['Amenity Fees', formatCurrency(property.amenityFees)]);
        if (property.otherIncome > 0) tableData.push(['Other Income', formatCurrency(property.otherIncome)]);
        tableData.push([{ content: 'Total Income', styles: { fontStyle: 'bold' } }, { content: formatCurrency(property.totalIncome), styles: { fontStyle: 'bold' } }]);
        
        // OPERATING EXPENSES section
        tableData.push([{ content: 'OPERATING EXPENSES', colSpan: 2, styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } }]);
        if (property.insuranceExpense > 0) tableData.push(['Insurance', formatCurrency(property.insuranceExpense)]);
        if (property.propertyTaxesExpense > 0) tableData.push(['Property Taxes', formatCurrency(property.propertyTaxesExpense)]);
        if (property.managementExpense > 0) tableData.push(['Management Fees', formatCurrency(property.managementExpense)]);
        if (property.repairMaintenanceExpense > 0) tableData.push(['Repairs & Maintenance', formatCurrency(property.repairMaintenanceExpense)]);
        if (property.waterExpense > 0) tableData.push(['Water', formatCurrency(property.waterExpense)]);
        if (property.electricExpense > 0) tableData.push(['Electric', formatCurrency(property.electricExpense)]);
        if (property.gasExpense > 0) tableData.push(['Gas', formatCurrency(property.gasExpense)]);
        if (property.sewerExpense > 0) tableData.push(['Sewer', formatCurrency(property.sewerExpense)]);
        if (property.trashExpense > 0) tableData.push(['Trash', formatCurrency(property.trashExpense)]);
        if (property.landscapingExpense > 0) tableData.push(['Landscaping', formatCurrency(property.landscapingExpense)]);
        if (property.cleaningExpense > 0) tableData.push(['Cleaning', formatCurrency(property.cleaningExpense)]);
        if (property.legalFeesExpense > 0) tableData.push(['Legal Fees', formatCurrency(property.legalFeesExpense)]);
        if (property.accountingFeesExpense > 0) tableData.push(['Accounting Fees', formatCurrency(property.accountingFeesExpense)]);
        if (property.marketingExpense > 0) tableData.push(['Marketing', formatCurrency(property.marketingExpense)]);
        if (property.hoaFeesExpense > 0) tableData.push(['HOA Fees', formatCurrency(property.hoaFeesExpense)]);
        if (property.otherOperatingExpenses > 0) tableData.push(['Other Operating Expenses', formatCurrency(property.otherOperatingExpenses)]);
        tableData.push([{ content: 'Total Operating Expenses', styles: { fontStyle: 'bold' } }, { content: formatCurrency(property.totalOperatingExpenses), styles: { fontStyle: 'bold' } }]);
        
        // Net Operating Income
        tableData.push([{ content: 'Net Operating Income', styles: { fillColor: [220, 220, 220], fontStyle: 'bold' } }, { content: formatCurrency(property.netOperatingIncome), styles: { fillColor: [220, 220, 220], fontStyle: 'bold' } }]);
        
        // NON-OPERATING EXPENSES
        if (property.mortgageExpense > 0) {
          tableData.push([{ content: 'NON-OPERATING EXPENSES', colSpan: 2, styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } }]);
          tableData.push(['Mortgage', formatCurrency(property.mortgageExpense)]);
          tableData.push([{ content: 'Total Non-Operating Expenses', styles: { fontStyle: 'bold' } }, { content: formatCurrency(property.totalNonOperatingExpenses), styles: { fontStyle: 'bold' } }]);
        }
        
        // Net Income
        tableData.push([{ content: 'Net Income', styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } }, { content: formatCurrency(property.netIncome), styles: { fillColor: [0, 51, 153], textColor: [255, 255, 255], fontStyle: 'bold' } }]);
        
        // Generate table
        autoTable(doc, {
          startY: currentY,
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { halign: 'right', cellWidth: 80 }
          }
        });
      });
      
      // Save PDF
      doc.save(`income-statement-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
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
            <h1 className="text-3xl font-bold gradient-text">Income Statement</h1>
            <p className="text-muted-foreground">
              Detailed income and expense analysis by property
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

            {/* Two-column filter layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Portfolio, Date Range, and Accounting Basis */}
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

              {/* Right Column - Properties and Interval */}
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
                  <Select value={interval} onValueChange={(value) => setInterval(value as 'month' | 'quarter' | 'year' | 'none')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Intervals</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="quarter">Quarterly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
            </div>

            {/* Run Report Button */}
            <Separator />
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
            { table: 'transactions', description: 'Financial transactions for income and expenses' },
            { table: 'chart_of_accounts', description: 'Account categories' },
            { table: 'properties', description: 'Property details' },
            { table: 'property_units', description: 'Unit-level data' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Income Accounts', description: 'Rent, fees, and other revenue properly categorized' },
              { field: 'Expense Accounts', description: 'Operating and non-operating expenses correctly recorded' },
              { field: 'Transaction Dates', description: 'Accurate dates for all income and expense transactions' }
            ],
            calculationSteps: [
              { step: 'Total Income', formula: 'Sum of rent + late fees + utilities + laundry + pet fees + parking + storage + other income' },
              { step: 'Total Operating Expenses', formula: 'Sum of insurance + taxes + management + maintenance + utilities + other operating costs' },
              { step: 'Net Operating Income (NOI)', formula: 'Total Income - Total Operating Expenses' },
              { step: 'Net Income', formula: 'NOI - Non-Operating Expenses (mortgage, etc.)' }
            ],
            note: 'Supports both cash basis (actual payments) and accrual basis (billed amounts). Intervals show month-by-month, quarter-by-quarter, or year-by-year breakdown.'
          }}
        />

      {/* Report Results */}
      {hasRunParams && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Income Statement Results
            </CardEnhancedTitle>
          </CardEnhancedHeader>
          <CardEnhancedContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Generating income statement...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No data found for the selected criteria.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {properties.map((property, index) => (
                  <div key={property.id} className="space-y-4">
                    {/* Property Header */}
                    <div className="border-b pb-2">
                      <h3 className="text-lg font-semibold text-primary">{property.address}</h3>
                    </div>

                    {/* Income Statement Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium w-1/3">Account</th>
                            {property.intervalLabels && property.intervalLabels.map((label, index) => (
                              <th key={index} className="text-right py-2 font-medium w-20">{label}</th>
                            ))}
                            <th className="text-right py-2 font-medium w-24">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Income Section */}
                          <tr className="bg-muted/10">
                            <td className="py-3 font-bold text-sm tracking-wide">INCOME</td>
                            {property.intervalLabels && property.intervalLabels.map((_, index) => (
                              <td key={index}></td>
                            ))}
                            <td></td>
                          </tr>
                          
                          <tr className="hover:bg-muted/5">
                            <td className="pl-8 py-2 text-sm">Rent Income</td>
                            {property.intervalData && property.intervalData.map((data, index) => (
                              <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.rentIncome)}</td>
                            ))}
                            <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.rentIncome)}</td>
                          </tr>
                          
                          {(property.lateFeeIncome > 0 || (property.intervalData && property.intervalData.some(d => d.lateFeeIncome > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Late Fee Income</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.lateFeeIncome)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.lateFeeIncome)}</td>
                            </tr>
                          )}
                          
                          {(property.utilityIncome > 0 || (property.intervalData && property.intervalData.some(d => d.utilityIncome > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Utility Income</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.utilityIncome)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.utilityIncome)}</td>
                            </tr>
                          )}
                          
                          {(property.laundryIncome > 0 || (property.intervalData && property.intervalData.some(d => d.laundryIncome > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Laundry Income</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.laundryIncome)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.laundryIncome)}</td>
                            </tr>
                          )}
                          
                          {(property.petFeeIncome > 0 || (property.intervalData && property.intervalData.some(d => d.petFeeIncome > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Pet Fees</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.petFeeIncome)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.petFeeIncome)}</td>
                            </tr>
                          )}
                          
                          {(property.parkingIncome > 0 || (property.intervalData && property.intervalData.some(d => d.parkingIncome > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Parking Income</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.parkingIncome)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.parkingIncome)}</td>
                            </tr>
                          )}
                          
                          {(property.storageIncome > 0 || (property.intervalData && property.intervalData.some(d => d.storageIncome > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Storage Income</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.storageIncome)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.storageIncome)}</td>
                            </tr>
                          )}
                          
                          {(property.vendingIncome > 0 || (property.intervalData && property.intervalData.some(d => d.vendingIncome > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Vending Income</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.vendingIncome)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.vendingIncome)}</td>
                            </tr>
                          )}
                          
                          {(property.amenityFees > 0 || (property.intervalData && property.intervalData.some(d => d.amenityFees > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Amenity Fees</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.amenityFees)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.amenityFees)}</td>
                            </tr>
                          )}
                          
                          {(property.otherIncome > 0 || (property.intervalData && property.intervalData.some(d => d.otherIncome > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Other Income</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.otherIncome)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.otherIncome)}</td>
                            </tr>
                          )}
                          
                          <tr className="border-t border-muted/20 font-semibold bg-muted/5">
                            <td className="pl-4 py-3 text-sm">Total Income</td>
                            {property.intervalData && property.intervalData.map((data, index) => (
                              <td key={index} className="text-right py-3 text-sm font-semibold">{formatCurrency(data.totalIncome)}</td>
                            ))}
                            <td className="text-right py-3 text-sm font-bold">{formatCurrency(property.totalIncome)}</td>
                          </tr>

                          {/* Spacer Row */}
                          <tr><td colSpan={100} className="py-2"></td></tr>

                          {/* Operating Expenses Section */}
                          <tr className="bg-muted/10">
                            <td className="py-3 font-bold text-sm tracking-wide">OPERATING EXPENSES</td>
                            {property.intervalLabels && property.intervalLabels.map((_, index) => (
                              <td key={index}></td>
                            ))}
                            <td></td>
                          </tr>
                          
                          {(property.insuranceExpense > 0 || (property.intervalData && property.intervalData.some(d => d.insuranceExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Insurance</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.insuranceExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.insuranceExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.propertyTaxesExpense > 0 || (property.intervalData && property.intervalData.some(d => d.propertyTaxesExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Property Taxes</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.propertyTaxesExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.propertyTaxesExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.managementExpense > 0 || (property.intervalData && property.intervalData.some(d => d.managementExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Management Fees</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.managementExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.managementExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.repairMaintenanceExpense > 0 || (property.intervalData && property.intervalData.some(d => d.repairMaintenanceExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Repairs & Maintenance</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.repairMaintenanceExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.repairMaintenanceExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.waterExpense > 0 || (property.intervalData && property.intervalData.some(d => d.waterExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Water</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.waterExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.waterExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.electricExpense > 0 || (property.intervalData && property.intervalData.some(d => d.electricExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Electric</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.electricExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.electricExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.gasExpense > 0 || (property.intervalData && property.intervalData.some(d => d.gasExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Gas</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.gasExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.gasExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.sewerExpense > 0 || (property.intervalData && property.intervalData.some(d => d.sewerExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Sewer</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.sewerExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.sewerExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.trashExpense > 0 || (property.intervalData && property.intervalData.some(d => d.trashExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Trash</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.trashExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.trashExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.landscapingExpense > 0 || (property.intervalData && property.intervalData.some(d => d.landscapingExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Landscaping</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.landscapingExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.landscapingExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.cleaningExpense > 0 || (property.intervalData && property.intervalData.some(d => d.cleaningExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Cleaning</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.cleaningExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.cleaningExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.legalFeesExpense > 0 || (property.intervalData && property.intervalData.some(d => d.legalFeesExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Legal Fees</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.legalFeesExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.legalFeesExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.accountingFeesExpense > 0 || (property.intervalData && property.intervalData.some(d => d.accountingFeesExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Accounting Fees</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.accountingFeesExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.accountingFeesExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.marketingExpense > 0 || (property.intervalData && property.intervalData.some(d => d.marketingExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Marketing</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.marketingExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.marketingExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.hoaFeesExpense > 0 || (property.intervalData && property.intervalData.some(d => d.hoaFeesExpense > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">HOA Fees</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.hoaFeesExpense)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.hoaFeesExpense)}</td>
                            </tr>
                          )}
                          
                          {(property.otherOperatingExpenses > 0 || (property.intervalData && property.intervalData.some(d => d.otherOperatingExpenses > 0))) && (
                            <tr className="hover:bg-muted/5">
                              <td className="pl-8 py-2 text-sm">Other Operating Expenses</td>
                              {property.intervalData && property.intervalData.map((data, index) => (
                                <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.otherOperatingExpenses)}</td>
                              ))}
                              <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.otherOperatingExpenses)}</td>
                            </tr>
                          )}
                          
                          <tr className="border-t border-muted/20 font-semibold bg-muted/5">
                            <td className="pl-4 py-3 text-sm">Total Operating Expenses</td>
                            {property.intervalData && property.intervalData.map((data, index) => (
                              <td key={index} className="text-right py-3 text-sm font-semibold">{formatCurrency(data.totalOperatingExpenses)}</td>
                            ))}
                            <td className="text-right py-3 text-sm font-bold">{formatCurrency(property.totalOperatingExpenses)}</td>
                          </tr>

                          {/* Spacer Row */}
                          <tr><td colSpan={100} className="py-2"></td></tr>

                          {/* Net Operating Income */}
                          <tr className="border-t-2 border-primary/20 bg-primary/5">
                            <td className="pl-4 py-3 text-sm font-bold">Net Operating Income</td>
                            {property.intervalData && property.intervalData.map((data, index) => (
                              <td key={index} className="text-right py-3 text-sm font-bold">{formatCurrency(data.netOperatingIncome)}</td>
                            ))}
                            <td className="text-right py-3 text-sm font-bold">{formatCurrency(property.netOperatingIncome)}</td>
                          </tr>

                          {/* Non-Operating Expenses Section */}
                          {(property.mortgageExpense > 0 || (property.intervalData && property.intervalData.some(d => d.mortgageExpense > 0))) && (
                            <>
                              <tr><td colSpan={100} className="py-2"></td></tr>
                              
                              <tr className="bg-muted/10">
                                <td className="py-3 font-bold text-sm tracking-wide">NON-OPERATING EXPENSES</td>
                                {property.intervalLabels && property.intervalLabels.map((_, index) => (
                                  <td key={index}></td>
                                ))}
                                <td></td>
                              </tr>
                              
                              <tr className="hover:bg-muted/5">
                                <td className="pl-8 py-2 text-sm">Mortgage</td>
                                {property.intervalData && property.intervalData.map((data, index) => (
                                  <td key={index} className="text-right py-2 text-sm">{formatCurrency(data.mortgageExpense)}</td>
                                ))}
                                <td className="text-right py-2 text-sm font-medium">{formatCurrency(property.mortgageExpense)}</td>
                              </tr>
                              
                              <tr className="border-t border-muted/20 font-semibold bg-muted/5">
                                <td className="pl-4 py-3 text-sm">Total Non-Operating Expenses</td>
                                {property.intervalData && property.intervalData.map((data, index) => (
                                  <td key={index} className="text-right py-3 text-sm font-semibold">{formatCurrency(data.totalNonOperatingExpenses)}</td>
                                ))}
                                <td className="text-right py-3 text-sm font-bold">{formatCurrency(property.totalNonOperatingExpenses)}</td>
                              </tr>
                              
                              <tr><td colSpan={100} className="py-2"></td></tr>
                            </>
                          )}

                          {/* Net Income */}
                          <tr className="border-t-2 border-primary/20 bg-primary/10">
                            <td className="pl-4 py-3 text-sm font-bold text-primary">Net Income</td>
                            {property.intervalData && property.intervalData.map((data, index) => (
                              <td key={index} className="text-right py-3 text-sm font-bold text-primary">{formatCurrency(data.netIncome)}</td>
                            ))}
                            <td className="text-right py-3 text-sm font-bold text-primary">{formatCurrency(property.netIncome)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {index < properties.length - 1 && <Separator className="my-6" />}
                  </div>
                ))}
              </div>
            )}
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Save Custom Report Dialog */}
      <SaveCustomReportDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        userId={user?.id || ''}
        reportConfig={{
          reportType: 'income_statement',
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
          interval,
        }}
        onSaveSuccess={() => {
          refetchSavedReports();
          setSaveAsCustom(false);
        }}
      />
    </div>
  );
};
