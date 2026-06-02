import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Separator } from '@/components/ui/separator';
import { Download, ArrowLeft, FileText, FileSpreadsheet, Play, Building, Calendar, MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { usePropertyStatement } from '@/hooks/usePropertyStatement';
import { formatCurrency } from '@/utils/reportUtils';
import { format, startOfYear } from 'date-fns';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PropertyStatementReportProps {
  onBack: () => void;
  portfolioId?: string;
}

interface PropertyData {
  property_id: string;
  property_address: string;
  beginning_balance: number;
  income: number;
  owner_contributions: number;
  other_additions: number;
  expenses: number;
  owner_draws: number;
  other_subtractions: number;
  ending_balance: number;
  tenant_deposits: number;
  property_reserve: number;
  available_for_payment: number;
  net_income: number;
}

const PropertyStatementReport: React.FC<PropertyStatementReportProps> = ({
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
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfYear(new Date()),
    to: new Date()
  });
  const [includeIncomeStatement, setIncludeIncomeStatement] = useState(true);
  
  // Reset selected properties when portfolio changes
  React.useEffect(() => {
    setSelectedPropertyIds([]);
    setSelectedUnitIds([]);
    
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

  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, company_name, phone')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Data fetching hook
  const { data: propertyData, isLoading, error, runReport, hasRunParams } = usePropertyStatement();

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
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      },
      includeIncomeStatement
    };

    runReport(reportParams);
  };

  const handleExportCSV = () => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }
    
    if (!propertyData) return;

    const csvRows = [];
    csvRows.push(['Property', 'Beginning Balance', 'Income', 'Expenses', 'Ending Balance', 'Available for Payment']);
    
    propertyData.forEach(property => {
      csvRows.push([
        property.property_address || 'Unknown Property',
        property.beginning_cash_balance?.toString() || '0',
        property.total_cash_receipts?.toString() || '0',
        property.total_cash_disbursements?.toString() || '0',
        property.ending_cash_balance?.toString() || '0',
        (property.available_for_payment || 0).toString()
      ]);
    });

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fromStr = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : 'unknown';
    const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : 'unknown';
    a.download = `property-statement-${fromStr}-${toStr}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF({ orientation: 'portrait' });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(16);
      doc.text('Property Statement', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(getDateRangeLabel(), pageWidth / 2, 22, { align: 'center' });
      if (includeIncomeStatement) {
        doc.text('(with Income Statement)', pageWidth / 2, 28, { align: 'center' });
      }
      
      if (!propertyData || propertyData.length === 0) {
        doc.setFontSize(12);
        doc.text('No data found for the selected criteria.', pageWidth / 2, 40, { align: 'center' });
        doc.save(`property-statement-${format(dateRange.from!, 'yyyy-MM-dd')}-to-${format(dateRange.to!, 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF generated successfully');
        return;
      }
      
      // Portfolio Summary Section
      const summaryData = [
        ['Beginning Cash Balance', formatCurrency(propertyData.reduce((sum, p) => sum + (p.beginning_cash_balance || 0), 0))],
        ['Total Additions', formatCurrency(propertyData.reduce((sum, p) => sum + (p.total_cash_receipts || 0), 0))],
        ['Total Subtractions', formatCurrency(propertyData.reduce((sum, p) => sum + (p.total_cash_disbursements || 0), 0))],
        ['Ending Cash Balance', formatCurrency(propertyData.reduce((sum, p) => sum + (p.ending_cash_balance || 0), 0))],
        ['Available for Payment', formatCurrency(propertyData.reduce((sum, p) => sum + (p.available_for_payment || 0), 0))]
      ];

      autoTable(doc, {
        head: [['Portfolio Summary', 'Amount']],
        body: summaryData,
        startY: includeIncomeStatement ? 35 : 30,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 153], fontSize: 11, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 60, halign: 'right' }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      // Loop through each property
      propertyData.forEach((property, index) => {
        // Add page break if needed (check if we're near bottom of page)
        if (currentY > 240 && index > 0) {
          doc.addPage();
          currentY = 20;
        }
        
        // Property header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(property.property_address || 'Unknown Property', 14, currentY);
        currentY += 8;
        
        // Property detail table
        const propertyTableData: any[] = [
          ['Beginning cash balance', formatCurrency(property.beginning_cash_balance || 0)],
          [{ content: '+ Additions to cash', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''],
          ['  Income', formatCurrency(property.income || 0)],
          ['  Owner contributions', formatCurrency(property.owner_contributions || 0)],
          ['  Other additions', formatCurrency(property.other_additions || 0)],
          [{ content: '  Total additions to cash', styles: { fontStyle: 'bold' } }, 
           { content: formatCurrency(property.total_cash_receipts || 0), styles: { fontStyle: 'bold' } }],
          [{ content: 'Total cash available', styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
           { content: formatCurrency(property.total_cash_available || 0), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }],
          [{ content: '- Subtractions from cash', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''],
          ['  Expenses', formatCurrency(property.expenses || 0)],
          ['  Owner draws', formatCurrency(property.owner_draws || 0)],
          ['  Other subtractions', formatCurrency(property.other_subtractions || 0)],
          [{ content: '  Total subtractions from cash', styles: { fontStyle: 'bold' } },
           { content: formatCurrency(property.total_cash_disbursements || 0), styles: { fontStyle: 'bold' } }],
          [{ content: 'Ending cash balance', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
           { content: formatCurrency(property.ending_cash_balance || 0), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }],
          [{ content: '- Adjustments', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''],
          ['  Tenant deposits held', formatCurrency(property.tenant_deposits_held || 0)],
          ['  Property reserve', formatCurrency(property.property_reserve || 0)],
          [{ content: 'Available for payment', styles: { fontStyle: 'bold', fillColor: [200, 255, 200], textColor: [0, 100, 0] } },
           { content: formatCurrency(property.available_for_payment || 0), styles: { fontStyle: 'bold', fillColor: [200, 255, 200], textColor: [0, 100, 0] } }]
        ];
        
        // Add income statement if requested
        if (includeIncomeStatement) {
          propertyTableData.push(
            [{ content: 'INCOME STATEMENT', styles: { fontStyle: 'bold', fillColor: [0, 51, 153], textColor: 255 } }, ''],
            ['  Total Income', formatCurrency(property.income || 0)],
            ['  Total Expenses', formatCurrency(property.expenses || 0)],
            [{ content: '  Net Income', styles: { fontStyle: 'bold', fillColor: [200, 220, 255], textColor: [0, 0, 150] } },
             { content: formatCurrency(property.net_income || 0), styles: { fontStyle: 'bold', fillColor: [200, 220, 255], textColor: [0, 0, 150] } }]
          );
        }
        
        autoTable(doc, {
          body: propertyTableData,
          startY: currentY,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 130 },
            1: { cellWidth: 60, halign: 'right' }
          }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 15;
      });
      
      doc.save(`property-statement-${format(dateRange.from!, 'yyyy-MM-dd')}-to-${format(dateRange.to!, 'yyyy-MM-dd')}.pdf`);
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
      if (!propertyData || propertyData.length === 0) {
        toast.info('No data to export');
        return;
      }

      let csvContent = 'Property Statement\n';
      csvContent += `${getDateRangeLabel()}\n`;
      if (includeIncomeStatement) {
        csvContent += '(with Income Statement)\n';
      }
      csvContent += '\n';
      
      const headers = ['', ...propertyData.map(p => p.property_address), 'ALL PROPERTIES'];
      csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
      
      csvContent += `"Beginning cash balance",${propertyData.map(p => formatCurrency(p.beginning_cash_balance || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.beginning_cash_balance || 0), 0))}\n`;
      
      csvContent += `"+ Additions to cash"\n`;
      csvContent += `"  Income",${propertyData.map(p => formatCurrency(p.income || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.income || 0), 0))}\n`;
      csvContent += `"  Owner contributions",${propertyData.map(p => formatCurrency(p.owner_contributions || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.owner_contributions || 0), 0))}\n`;
      csvContent += `"  Other additions",${propertyData.map(p => formatCurrency(p.other_additions || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.other_additions || 0), 0))}\n`;
      csvContent += `"  Total additions to cash",${propertyData.map(p => formatCurrency(p.total_cash_receipts || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.total_cash_receipts || 0), 0))}\n`;
      
      csvContent += `"Total cash available",${propertyData.map(p => formatCurrency(p.total_cash_available || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.total_cash_available || 0), 0))}\n`;
      
      csvContent += `"- Subtractions from cash"\n`;
      csvContent += `"  Expenses",${propertyData.map(p => formatCurrency(p.expenses || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.expenses || 0), 0))}\n`;
      csvContent += `"  Owner draws",${propertyData.map(p => formatCurrency(p.owner_draws || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.owner_draws || 0), 0))}\n`;
      csvContent += `"  Other subtractions",${propertyData.map(p => formatCurrency(p.other_subtractions || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.other_subtractions || 0), 0))}\n`;
      csvContent += `"  Total subtractions from cash",${propertyData.map(p => formatCurrency(p.total_cash_disbursements || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.total_cash_disbursements || 0), 0))}\n`;
      
      csvContent += `"Ending cash balance",${propertyData.map(p => formatCurrency(p.ending_cash_balance || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.ending_cash_balance || 0), 0))}\n`;
      
      csvContent += `"- Adjustments"\n`;
      csvContent += `"  Tenant deposits held",${propertyData.map(p => formatCurrency(p.tenant_deposits_held || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.tenant_deposits_held || 0), 0))}\n`;
      csvContent += `"  Property reserve",${propertyData.map(p => formatCurrency(p.property_reserve || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.property_reserve || 0), 0))}\n`;
      
      csvContent += `"Available for payment",${propertyData.map(p => formatCurrency(p.available_for_payment || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.available_for_payment || 0), 0))}\n`;
      
      if (includeIncomeStatement) {
        csvContent += `"\n`;
        csvContent += `"INCOME STATEMENT"\n`;
        csvContent += `"  Total Income",${propertyData.map(p => formatCurrency(p.income || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.income || 0), 0))}\n`;
        csvContent += `"  Total Expenses",${propertyData.map(p => formatCurrency(p.expenses || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.expenses || 0), 0))}\n`;
        csvContent += `"  Net Income",${propertyData.map(p => formatCurrency(p.net_income || 0)).join(',')},${formatCurrency(propertyData.reduce((sum, p) => sum + (p.net_income || 0), 0))}\n`;
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `property-statement-${format(dateRange.from!, 'yyyy-MM-dd')}-to-${format(dateRange.to!, 'yyyy-MM-dd')}.xlsx`;
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
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Property Statement</h1>
            <p className="text-muted-foreground">Beginning and ending cash balances by property during a specified time frame</p>
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
                      <SelectItem value="everything">Everything</SelectItem>
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

                {/* Contents Options */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Contents</label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={includeIncomeStatement}
                      onCheckedChange={(checked) => setIncludeIncomeStatement(checked === true)}
                    />
                    <label className="text-sm">Include income statement</label>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button 
                onClick={handleRunReport} 
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
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

      {/* Loading State */}
      {isLoading && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-lg">Loading property statement...</span>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Error State */}
      {error && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="text-center text-destructive">
              <p className="text-lg">Error loading property statement</p>
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
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">Property Statement Report</p>
              <p className="text-sm mt-2">Select your filters and click "Run Report" to generate the property statement.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* No Data Found After Running Report */}
      {hasRunParams && !isLoading && (!propertyData || propertyData.length === 0) && (
        <CardEnhanced>
          <CardEnhancedContent className="p-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
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
      {hasRunParams && !isLoading && propertyData && propertyData.length > 0 && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle className="text-xl font-bold gradient-text">
              Property Statement - {getDateRangeLabel()}
              {hasRunParams?.includeIncomeStatement && ' (with Income Statement)'}
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
            {/* Company Header */}
            <div className="p-6 border-b">
              <div className="text-left">
                <h2 className="text-lg font-bold">
                  {profileLoading ? (
                    <div className="animate-pulse bg-muted h-5 w-48 rounded"></div>
                  ) : (
                    userProfile?.company_name || 
                    (userProfile?.first_name && userProfile?.last_name 
                      ? `${userProfile.first_name} ${userProfile.last_name}` 
                      : 'Property Management')
                  )}
                </h2>
                {!profileLoading && userProfile?.phone && (
                  <p className="text-sm text-muted-foreground">{userProfile.phone}</p>
                )}
              </div>
            </div>

            {/* Report Content */}
            <div className="p-6">
              <h3 className="text-base font-medium mb-6 text-muted-foreground">Summary by property</h3>

              {/* Property Statement Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left p-3 font-medium"></th>
                      {propertyData.map((property) => (
                        <th key={property.property_id} className="text-center p-3 font-medium min-w-32">
                          {property.property_address}
                        </th>
                      ))}
                      <th className="text-center p-3 font-medium min-w-32">ALL PROPERTIES</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background">
                    <tr className="border-b">
                      <td className="p-3 font-medium">Beginning cash balance</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.beginning_cash_balance || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.beginning_cash_balance || 0), 0))}
                      </td>
                    </tr>

                    {/* Additions to cash */}
                    <tr className="bg-muted/20 border-b">
                      <td className="p-3 font-medium">+ Additions to cash</td>
                      {propertyData.map((property) => (
                        <td key={`${property.property_id}-additions-header`} className="p-3"></td>
                      ))}
                      <td className="p-3"></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 pl-6">Income</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.income || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.income || 0), 0))}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 pl-6">Owner contributions</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.owner_contributions || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.owner_contributions || 0), 0))}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 pl-6">Other additions</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.other_additions || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.other_additions || 0), 0))}
                      </td>
                    </tr>
                    <tr className="border-b font-medium bg-muted/10">
                      <td className="p-3 pl-6">Total additions to cash</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.total_cash_receipts || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-bold">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.total_cash_receipts || 0), 0))}
                      </td>
                    </tr>

                    {/* Total cash available */}
                    <tr className="border-b font-medium bg-muted/20">
                      <td className="p-3 font-medium">Total cash available</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.total_cash_available || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-bold">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.total_cash_available || 0), 0))}
                      </td>
                    </tr>

                    {/* Subtractions from cash */}
                    <tr className="bg-muted/20 border-b">
                      <td className="p-3 font-medium">- Subtractions from cash</td>
                      {propertyData.map((property) => (
                        <td key={`${property.property_id}-subtractions-header`} className="p-3"></td>
                      ))}
                      <td className="p-3"></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 pl-6">Expenses</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.expenses || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.expenses || 0), 0))}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 pl-6">Owner draws</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.owner_draws || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.owner_draws || 0), 0))}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 pl-6">Other subtractions</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.other_subtractions || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.other_subtractions || 0), 0))}
                      </td>
                    </tr>
                    <tr className="border-b font-medium bg-muted/10">
                      <td className="p-3 pl-6">Total subtractions from cash</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.total_cash_disbursements || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-bold">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.total_cash_disbursements || 0), 0))}
                      </td>
                    </tr>

                    {/* Ending cash balance */}
                    <tr className="border-b font-bold bg-muted/30">
                      <td className="p-3 font-bold">Ending cash balance</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.ending_cash_balance || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-bold">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.ending_cash_balance || 0), 0))}
                      </td>
                    </tr>

                    {/* Adjustments */}
                    <tr className="bg-muted/20 border-b">
                      <td className="p-3 font-medium">- Adjustments</td>
                      {propertyData.map((property) => (
                        <td key={`${property.property_id}-adjustments-header`} className="p-3"></td>
                      ))}
                      <td className="p-3"></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 pl-6">Tenant deposits held</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.tenant_deposits_held || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.tenant_deposits_held || 0), 0))}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 pl-6">Property reserve</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center">
                          {formatCurrency(property.property_reserve || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-medium">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.property_reserve || 0), 0))}
                      </td>
                    </tr>

                    {/* Available for payment */}
                    <tr className="border-b font-bold bg-green-50 dark:bg-green-900/20">
                      <td className="p-3 font-bold text-green-700 dark:text-green-400">Available for payment</td>
                      {propertyData.map((property) => (
                        <td key={property.property_id} className="p-3 text-center font-bold text-green-700 dark:text-green-400">
                          {formatCurrency(property.available_for_payment || 0)}
                        </td>
                      ))}
                      <td className="p-3 text-center font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(propertyData.reduce((sum, p) => sum + (p.available_for_payment || 0), 0))}
                      </td>
                    </tr>

                    {/* Income Statement section (if enabled) */}
                    {includeIncomeStatement && (
                      <>
                        <tr className="border-t-4 border-primary bg-muted/20">
                          <td className="p-3 font-bold text-primary">INCOME STATEMENT</td>
                          {propertyData.map((property) => (
                            <td key={`${property.property_id}-income-header`} className="p-3"></td>
                          ))}
                          <td className="p-3"></td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 pl-6">Total Income</td>
                          {propertyData.map((property) => (
                            <td key={property.property_id} className="p-3 text-center">
                              {formatCurrency(property.income || 0)}
                            </td>
                          ))}
                          <td className="p-3 text-center font-medium">
                            {formatCurrency(propertyData.reduce((sum, p) => sum + (p.income || 0), 0))}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 pl-6">Total Expenses</td>
                          {propertyData.map((property) => (
                            <td key={property.property_id} className="p-3 text-center">
                              {formatCurrency(property.expenses || 0)}
                            </td>
                          ))}
                          <td className="p-3 text-center font-medium">
                            {formatCurrency(propertyData.reduce((sum, p) => sum + (p.expenses || 0), 0))}
                          </td>
                        </tr>
                        <tr className="border-b font-bold bg-blue-50 dark:bg-blue-900/20">
                          <td className="p-3 font-bold text-blue-700 dark:text-blue-400">Net Income</td>
                          {propertyData.map((property) => (
                            <td key={property.property_id} className="p-3 text-center font-bold text-blue-700 dark:text-blue-400">
                              {formatCurrency(property.net_income || 0)}
                            </td>
                          ))}
                          <td className="p-3 text-center font-bold text-blue-700 dark:text-blue-400">
                            {formatCurrency(propertyData.reduce((sum, p) => sum + (p.net_income || 0), 0))}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
                {/* Income Statement Section - Only if enabled */}
                {hasRunParams?.includeIncomeStatement && (
                  <div className="mt-8">
                    <h3 className="text-base font-medium mb-6 text-muted-foreground">Income Statement</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30">
                            <th className="text-left p-3 font-medium"></th>
                            {propertyData.map((property) => (
                              <th key={property.property_id} className="text-center p-3 font-medium min-w-32">
                                {property.property_address}
                              </th>
                            ))}
                            <th className="text-center p-3 font-medium min-w-32">ALL PROPERTIES</th>
                          </tr>
                        </thead>
                        <tbody className="bg-background">
                          <tr className="border-b">
                            <td className="p-3 font-medium">Net income</td>
                            {propertyData.map((property) => (
                              <td key={property.property_id} className="p-3 text-center">
                                {formatCurrency(property.net_income || 0)}
                              </td>
                            ))}
                            <td className="p-3 text-center font-medium">
                              {formatCurrency(propertyData.reduce((sum, p) => sum + (p.net_income || 0), 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* No Data State */}
      {!isLoading && !error && (!propertyData || propertyData.length === 0) && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No property data available</p>
              <p className="text-sm">Try adjusting your filters or date range</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};

export default PropertyStatementReport;
