import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet, FileText, ArrowLeft, Calendar, Play } from 'lucide-react';
import { useAccountsReceivableData } from '@/hooks/reports/useAccountsReceivableData';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useUserPropertiesWithUnits, getUnitOptionsFromProperties, getPropertyIdsFromUnitIds } from '@/hooks/useUserPropertiesWithUnits';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/reportUtils';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { MultiSelect } from '@/components/ui/multi-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface AccountsReceivableReportProps {
  onBack?: () => void;
  portfolioId?: string;
}

export const AccountsReceivableReport: React.FC<AccountsReceivableReportProps> = ({ onBack, portfolioId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id || '');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(
    portfolioId && portfolioId !== 'everything' ? portfolioId : 'everything'
  );
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<string>('current-date');
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [saveAsCustom, setSaveAsCustom] = useState<boolean>(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // State for manual report execution
  const [runParams, setRunParams] = useState<null | {
    portfolioId?: string;
    propertyIds?: string[];
    asOfDate: string;
    startDate: string;
    endDate: string;
  }>(null);

  // Reset selected properties when portfolio changes and force cache invalidation
  React.useEffect(() => {
    console.log('🔍 [AR_REPORT] Portfolio changed effect triggered:', {
      selectedPortfolio,
      userId: user?.id
    });
    setSelectedProperties([]);
    
    // Force invalidate relevant queries when portfolio changes
    if (user?.id) {
      console.log('🔍 [AR_REPORT] Invalidating relevant queries for portfolio change...');
      queryClient.invalidateQueries({ 
        queryKey: ['user-properties-with-units', user.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['accountsReceivable'] 
      });
    }
  }, [selectedPortfolio, user?.id, queryClient]);

  // Fetch properties with units based on selected portfolio
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError, refetch: refetchProperties } = useUserPropertiesWithUnits(
    user?.id || '',
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );

  // Force properties refetch when portfolio changes
  React.useEffect(() => {
    if (user?.id && selectedPortfolio) {
      console.log('🔍 [AR_REPORT] Forcing properties refetch due to portfolio change');
      refetchProperties();
    }
  }, [selectedPortfolio, user?.id, refetchProperties]);

   // Debug property loading
   React.useEffect(() => {
     console.log('🔍 [AR_REPORT] Properties effect triggered - Properties loaded:', {
       selectedPortfolio,
       propertiesCount: properties.length,
       propertiesLoading,
       propertiesError,
       properties: properties.slice(0, 2).map(p => ({ 
         id: p.id, 
         address: p.address, 
         portfolio_id: p.portfolio_id,
         units: p.property_units?.length || 0
       })) // Show first 2 for debugging
     });
   }, [selectedPortfolio, properties, propertiesLoading, propertiesError]);

   const propertyOptions = React.useMemo(() => {
     console.log('🔍 [AR_REPORT] Computing property options from properties:', {
       propertiesCount: properties?.length || 0,
       selectedPortfolio: selectedPortfolio,
       propertiesLoading,
       propertiesError: propertiesError?.message,
       rawPropertiesData: properties?.map(p => ({ 
         id: p.id, 
         address: p.address, 
         portfolio_id: p.portfolio_id,
         units: p.property_units?.length || 0,
         hasUnits: !!p.property_units && p.property_units.length > 0
       }))
     });
     
     if (!properties || properties.length === 0) {
       console.log('🚨 [AR_REPORT] No properties available for options generation');
       return [];
     }
     
     const options = getUnitOptionsFromProperties(properties);
     console.log('🔍 [AR_REPORT] Generated property options:', {
       optionsCount: options.length,
       sampleOptions: options.slice(0, 3),
       allOptions: options
     });
     return options;
   }, [properties, selectedPortfolio, propertiesLoading, propertiesError]);

  // Calculate date range based on preset
  const getDateRange = () => {
    const today = asOfDate;
    switch (datePreset) {
      case 'current-date':
        return { startDate: today, endDate: today };
      case 'day-of-current-month':
        const firstOfMonth = startOfMonth(today);
        return { startDate: firstOfMonth, endDate: today };
      case 'day-of-previous-month':
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        const firstOfPrevMonth = startOfMonth(prevMonth);
        return { startDate: firstOfPrevMonth, endDate: prevMonth };
      case 'last-day-of-current-quarter':
        return { startDate: startOfQuarter(today), endDate: endOfQuarter(today) };
      case 'last-day-of-previous-quarter':
        const prevQuarter = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
        return { startDate: startOfQuarter(prevQuarter), endDate: endOfQuarter(prevQuarter) };
      default:
        return { startDate: today, endDate: today };
    }
  };

  // Initialize runParams on mount to show data immediately
  React.useEffect(() => {
    if (user?.id) {
      const { startDate: calcStartDate, endDate: calcEndDate } = getDateRange();
      console.log('🚀 [AR_REPORT] Initializing runParams on mount/change:', {
        selectedPortfolio,
        hasRunParams: !!runParams,
        portfolioId: selectedPortfolio === 'everything' ? undefined : selectedPortfolio
      });
      setRunParams({
        portfolioId: selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
        propertyIds: selectedProperties.length > 0
          ? getPropertyIdsFromUnitIds(properties, selectedProperties)
          : undefined,
        asOfDate: asOfDate.toISOString().split('T')[0],
        startDate: calcStartDate.toISOString().split('T')[0],
        endDate: calcEndDate.toISOString().split('T')[0],
      });
    }
  }, [user?.id, selectedPortfolio, selectedProperties, properties, asOfDate, datePreset]);

  const { startDate, endDate } = getDateRange();

   const { data: accountsData, isLoading, error, refetch } = useAccountsReceivableData({
     userId: user?.id || '',
     portfolioId: runParams?.portfolioId,
     propertyIds: runParams?.propertyIds,
     asOfDate: runParams?.asOfDate ?? '',
     startDate: runParams?.startDate ?? '',
     endDate: runParams?.endDate ?? '',
   });

   // Debug accounts data loading
   React.useEffect(() => {
     console.log('🔍 [AR_REPORT] Accounts data state changed:', {
       runParams,
       isLoading,
       error,
       hasData: !!accountsData,
       propertiesCount: accountsData?.properties?.length || 0,
       summaryTotal: accountsData?.summary?.totalOutstanding || 0
     });
   }, [runParams, isLoading, error, accountsData]);

   const handleRunReport = () => {
     const { startDate: calcStartDate, endDate: calcEndDate } = getDateRange();
     const propertyIds = selectedProperties.length > 0
       ? getPropertyIdsFromUnitIds(properties, selectedProperties)
       : undefined;

     console.log('🔍 [AR_REPORT] handleRunReport called with:', {
       selectedPortfolio,
       selectedProperties: selectedProperties.length,
       propertyIds,
       asOfDate: asOfDate.toISOString().split('T')[0],
       startDate: calcStartDate.toISOString().split('T')[0],
       endDate: calcEndDate.toISOString().split('T')[0],
       availableProperties: properties?.length || 0
     });

     const newRunParams = {
       portfolioId: selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
       propertyIds,
       asOfDate: asOfDate.toISOString().split('T')[0],
       startDate: calcStartDate.toISOString().split('T')[0],
       endDate: calcEndDate.toISOString().split('T')[0],
     };

     console.log('🔍 [AR_REPORT] Setting new runParams:', newRunParams);
     setRunParams(newRunParams);
     
     console.log('🔍 [AR_REPORT] Triggering refetch...');
     refetch();
     if (saveAsCustom) {
       toast.success('Report saved as custom report');
     }
   };

  const handleExportCSV = async () => {
    try {
      if (!accountsData?.properties) return;
      
      const csvData = accountsData.properties.map(property => ({
        'Property': property.address,
        'Unit': property.unit || 'N/A',
        'Resident': property.tenantName || 'Vacant',
        'Status': property.status,
        'Current Balance': property.outstandingBalance,
        'Last Payment Date': property.lastPaymentDate || 'N/A',
        'Last Payment Amount': property.lastPaymentAmount,
        'Days Outstanding': property.daysOutstanding,
        'Monthly Rent': property.monthlyRent
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts-receivable-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('CSV export completed');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      // Create PDF content
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Accounts Receivable Summary', 20, 30);
      doc.setFontSize(12);
      doc.text(`Report Date: ${format(new Date(), 'MM/dd/yyyy')}`, 20, 45);
      
      let yPosition = 65;
      accountsData?.propertyGroups?.forEach((group) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }
        
        doc.setFontSize(14);
        doc.text(group.propertyAddress, 20, yPosition);
        yPosition += 20;
        
        group.units.forEach((unit) => {
          doc.setFontSize(10);
          doc.text(`${unit.unit} - ${unit.tenantName || 'Vacant'} - $${unit.outstandingBalance.toFixed(2)}`, 30, yPosition);
          yPosition += 15;
        });
        
        if (group.adjustments.length > 0) {
          doc.text(`Adjustments - $${group.adjustments[0].outstandingBalance.toFixed(2)}`, 30, yPosition);
          yPosition += 15;
        }
        
        doc.setFontSize(12);
        doc.text(`Total: $${group.total.toFixed(2)}`, 30, yPosition);
        yPosition += 25;
      });
      
      doc.save(`accounts-receivable-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF export completed');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      // Create Excel-like CSV with proper formatting
      let csvContent = 'Accounts Receivable Summary\n';
      csvContent += `Report Date: ${format(new Date(), 'MM/dd/yyyy')}\n\n`;
      csvContent += 'Property,Unit,Resident,Status,Balance\n';
      
      accountsData?.propertyGroups?.forEach((group) => {
        group.units.forEach((unit) => {
          csvContent += `${group.propertyAddress},${unit.unit},${unit.tenantName || 'Vacant'},${unit.status},$${unit.outstandingBalance.toFixed(2)}\n`;
        });
        
        if (group.adjustments.length > 0) {
          csvContent += `${group.propertyAddress},Adjustments,,$${group.adjustments[0].outstandingBalance.toFixed(2)}\n`;
        }
        
        csvContent += `Total for ${group.propertyAddress},,,,${group.total.toFixed(2)}\n\n`;
      });
      
      csvContent += `Grand Total,,,,${accountsData?.summary.totalOutstanding.toFixed(2)}\n`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts-receivable-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Excel export completed');
    } catch (error) {
      toast.error('Failed to export Excel');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Past Due': return 'destructive';
      case 'Vacant': return 'secondary';
      default: return 'outline';
    }
  };

  if (portfoliosLoading || isLoading || propertiesLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Accounts Receivable Summary</h1>
          <p className="text-muted-foreground">
            Track outstanding balances and payment status across your properties
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} size="sm" variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleExportPDF} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={handleExportExcel} size="sm" variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Top row filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">AS OF</label>
                <Select value={datePreset} onValueChange={setDatePreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-date">Current date</SelectItem>
                    <SelectItem value="day-of-current-month">Day of current month</SelectItem>
                    <SelectItem value="day-of-previous-month">Day of previous month</SelectItem>
                    <SelectItem value="last-day-of-current-quarter">Last day of current quarter</SelectItem>
                    <SelectItem value="last-day-of-previous-quarter">Last day of previous quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !asOfDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {asOfDate ? format(asOfDate, "MM/dd/yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={asOfDate}
                      onSelect={(date) => {
                        if (date) {
                          setAsOfDate(date);
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio</label>
                {portfolioId && portfolioId !== 'everything' ? (
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                    <span>
                      {portfolios.find(p => p.id === portfolioId)?.client_name || 'Selected Portfolio'} 
                      ({portfolios.find(p => p.id === portfolioId)?.property_count || 0} properties)
                    </span>
                  </div>
                ) : (
                  <Select value={selectedPortfolio} onValueChange={(value) => {
                    console.log('🔍 [AR_REPORT] Portfolio dropdown changed from:', selectedPortfolio, 'to:', value);
                    console.log('🔍 [AR_REPORT] Available portfolios:', portfolios?.map(p => ({ id: p.id, name: p.client_name, property_count: p.property_count })));
                    console.log('🔍 [AR_REPORT] Setting selectedPortfolio to:', value);
                    setSelectedPortfolio(value);
                    setSelectedProperties([]); // Reset property selection when portfolio changes
                    console.log('🔍 [AR_REPORT] Portfolio state updated, selectedPortfolio should now be:', value);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everything">All Portfolios</SelectItem>
                      {portfolios.map((portfolio) => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.client_name} ({portfolio.property_count || 0} properties)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Properties
                  {!propertiesLoading && propertyOptions.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({propertyOptions.length} available)
                    </span>
                  )}
                </label>
                {propertiesLoading ? (
                  <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 flex items-center text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" />
                    Loading properties...
                  </div>
                 ) : propertyOptions.length === 0 ? (
                   <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 flex items-center text-sm text-muted-foreground">
                     {propertiesError ? (
                       <>
                         <span className="text-destructive">Error loading properties: {propertiesError.message}</span>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="ml-2 h-6 px-2" 
                           onClick={() => {
                             console.log('🔍 [AR_REPORT] Manual properties refetch triggered');
                             refetchProperties();
                           }}
                         >
                           Retry
                         </Button>
                       </>
                      ) : (
                        <span>0 properties</span>
                      )}
                   </div>
                  ) : (
                    <>
                      <MultiSelect
                        options={propertyOptions}
                        selected={selectedProperties}
                        onChange={(selected) => {
                          setSelectedProperties(selected);
                        }}
                       placeholder={
                         selectedProperties.length === 0
                           ? `All Properties (${propertyOptions.length})`
                           : selectedProperties.length === propertyOptions.length
                           ? `All Properties Selected (${propertyOptions.length})`
                           : `${selectedProperties.length} of ${propertyOptions.length} Properties`
                       }
                     />
                   </>
                 )}
              </div>
            </div>

            <Separator />

            {/* Bottom row with checkbox and run button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-custom"
                  checked={saveAsCustom}
                  onCheckedChange={(checked) => setSaveAsCustom(checked === true)}
                />
                <label htmlFor="save-custom" className="text-sm font-medium">
                  Save as custom report
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <Button onClick={handleExportCSV} size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button onClick={handleExportPDF} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button onClick={handleExportExcel} size="sm" variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
                <Button onClick={handleRunReport} className="bg-primary hover:bg-primary/90">
                  <Play className="h-4 w-4 mr-2" />
                  Run Report
                </Button>
              </div>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'leases', description: 'Active lease agreements with payment terms' },
            { table: 'lease_payment_schedules', description: 'Expected payment schedules and due dates' },
            { table: 'payments', description: 'Actual rent payments received from tenants' },
            { table: 'properties', description: 'Property addresses and details' },
            { table: 'property_units', description: 'Individual unit information' },
            { table: 'tenants', description: 'Tenant contact and lease information' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Monthly Rent Amount', description: 'Set in lease agreements for each unit' },
              { field: 'Payment History', description: 'Complete record of rent payments with dates and amounts' },
              { field: 'Lease Status', description: 'Active leases linked to current tenants' }
            ],
            calculationSteps: [
              { step: 'Amount Owed', formula: 'Total billed rent through the as-of date' },
              { step: 'Amount Paid', formula: 'Sum of all completed rent payments' },
              { step: 'Outstanding Balance', formula: 'Amount Owed - Amount Paid' },
              { step: 'Days Outstanding', formula: 'Days since the oldest unpaid balance' }
            ],
            note: 'Shows only units with active tenants. Vacant units are excluded from this report.'
          }}
        />

      {/* Detailed Table */}
      <CardEnhanced>
        <CardEnhancedHeader>
          <CardEnhancedTitle>Accounts Receivable Details</CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">UNIT</TableHead>
                  <TableHead className="w-[25%]">RESIDENT</TableHead>
                  <TableHead className="w-[15%]">STATUS</TableHead>
                  <TableHead className="text-right w-[15%]">BALANCE</TableHead>
                  <TableHead className="text-right w-[15%]">DAYS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsData?.propertyGroups?.map((group) => (
                  <React.Fragment key={group.propertyAddress}>
                    {/* Property Address Header */}
                    <TableRow className="bg-muted/20 border-b-2">
                      <TableCell colSpan={5} className="font-bold text-base py-3">
                        {group.propertyAddress}
                      </TableCell>
                    </TableRow>

                    {/* Property units with indentation */}
                    {group.units.map((unit, index) => (
                      <TableRow key={`${group.propertyAddress}-${unit.id}-${index}`} className="hover:bg-muted/30">
                        <TableCell className="pl-8 font-mono text-sm">
                          Unit {unit.unit}
                        </TableCell>
                        <TableCell className="pl-8">
                          {unit.tenantName || (
                            <span className="text-muted-foreground italic">Vacant</span>
                          )}
                        </TableCell>
                        <TableCell className="pl-8">
                          <Badge 
                            variant={getStatusBadgeVariant(unit.status)}
                            className={unit.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                                      unit.status === 'Past Due' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : 
                                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}
                          >
                            {unit.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <span className={unit.outstandingBalance > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                            {formatCurrency(unit.outstandingBalance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <span className="text-muted-foreground">
                            {unit.outstandingBalance > 0 ? unit.daysOutstanding : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Adjustments row with indentation */}
                    {group.adjustments.map((adjustment, index) => (
                      <TableRow key={`${group.propertyAddress}-adjustment-${index}`} className="hover:bg-muted/30">
                        <TableCell className="pl-8 font-medium text-muted-foreground">
                          Adjustments
                        </TableCell>
                        <TableCell className="pl-8"></TableCell>
                        <TableCell className="pl-8"></TableCell>
                        <TableCell className="text-right pr-8">
                          <span className={adjustment.outstandingBalance !== 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                            {formatCurrency(adjustment.outstandingBalance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Property total with indentation */}
                    <TableRow className="border-t bg-muted/40">
                      <TableCell className="pl-8 font-semibold text-primary">
                        Total for {group.propertyAddress}
                      </TableCell>
                      <TableCell className="pl-8"></TableCell>
                      <TableCell className="pl-8"></TableCell>
                      <TableCell className="text-right font-semibold text-primary pr-8">
                        {formatCurrency(group.total)}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <span className="text-muted-foreground">-</span>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}

                {/* Grand Total - no indentation */}
                {accountsData?.propertyGroups && accountsData.propertyGroups.length > 0 && (
                  <TableRow className="border-t-4 border-primary font-bold bg-primary/10">
                    <TableCell className="font-bold text-base">
                      Grand total for all properties
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-base">
                      {formatCurrency(accountsData.summary.totalOutstanding)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {(!accountsData?.propertyGroups || accountsData.propertyGroups.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-lg font-medium mb-2">No accounts receivable data found</div>
              <div className="text-sm">Try adjusting your filters and run the report again.</div>
            </div>
          )}
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};