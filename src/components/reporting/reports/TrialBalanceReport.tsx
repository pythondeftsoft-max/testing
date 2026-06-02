import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Play, Calculator, UserCheck, AlertCircle, Building, Calendar, FileText, MapPin, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getUnitOptionsFromAllProperties, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useTrialBalance, TrialBalanceParams } from '@/hooks/useTrialBalance';
import { formatCurrency } from '@/utils/reportUtils';
import { format, startOfYear } from 'date-fns';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateTrialBalanceCSV, generateTrialBalancePDF } from '@/utils/trialBalanceExportUtils';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface TrialBalanceReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const TrialBalanceReport: React.FC<TrialBalanceReportProps> = ({
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
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [isAllPropertiesMode, setIsAllPropertiesMode] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfYear(new Date()),
    to: new Date()
  });
  const [accountingBasis, setAccountingBasis] = useState<'cash' | 'accrual'>('cash');
  const [reportParams, setReportParams] = useState<TrialBalanceParams | undefined>();
  const [reportMessage, setReportMessage] = useState('');
  
  // Reset selected properties when portfolio changes
  React.useEffect(() => {
    setSelectedProperties([]);
    setSelectedUnitIds([]);
    setIsAllPropertiesMode(false);
    
    if (user?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['all-properties-with-units', user.id] 
      });
    }
  }, [selectedPortfolio, user?.id, queryClient]);

  // Fetch properties with units based on selected portfolio
  const { data: allProperties = [], isLoading: propertiesLoading, error: propertiesError, refetch: refetchProperties } = useAllPropertiesWithUnits(
    user?.id || '',
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );

  const propertyOptions = React.useMemo(() => {
    if (!allProperties || allProperties.length === 0) {
      return [];
    }
    
    return getUnitOptionsFromAllProperties(allProperties);
  }, [allProperties]);
  
  // Data fetching hook
  const { data: trialBalanceData, isLoading, error } = useTrialBalance(reportParams);

  // Validate filters before running report
  const validateFilters = () => {
    const missingFilters = [];
    
    if (!dateRange.from || !dateRange.to) {
      missingFilters.push('Date Range');
    }
    
    if (!user?.id) {
      missingFilters.push('User Authentication');
    }
    
    // Require either specific property/unit selection OR "All Properties" mode
    if (selectedUnitIds.length === 0 && selectedProperties.length === 0 && !isAllPropertiesMode) {
      missingFilters.push('Property Selection');
    }
    
    return missingFilters;
  };

  const handleRunReport = async () => {
    const missingFilters = validateFilters();
    
    if (missingFilters.length > 0) {
      const filterText = missingFilters.length === 1 
        ? `${missingFilters[0]} is required`
        : `The following filters are required: ${missingFilters.join(', ')}`;
      
      toast.error(`Cannot Run Report\n\n${filterText}. Please set the required filters and try again.`, {
        duration: 5000
      });
      return;
    }

    // Validate cash transactions for cash basis reports
    if (accountingBasis === 'cash') {
      try {
        const startDate = format(dateRange.from!, 'yyyy-MM-dd');
        const endDate = format(dateRange.to!, 'yyyy-MM-dd');
        
        // Check for rent payments in the date range
        const { data: rentPayments, error: rentError } = await supabase
          .from('rent_payments')
          .select('id')
          .gte('payment_date', startDate)
          .lte('payment_date', endDate)
          .eq('status', 'completed')
          .limit(1);

        if (rentError) {
          console.error('Error validating rent payments:', rentError);
          toast.error('Error validating cash transactions. Please try again.');
          return;
        }

        // Check for expense activity (properties with cost data)
        let propertyQuery = supabase
          .from('properties')
          .select('id, insurance_cost, mortgage_cost, management_fee, repair_costs, property_taxes, utilities_expense, legal_professional_fees, advertising_expense, other_operating_expenses')
          .in('status', ['available', 'occupied', 'vacant'])
          .is('deleted_at', null);

        // Apply same portfolio/property filters as the report
        if (selectedPortfolio !== 'everything') {
          propertyQuery = propertyQuery.eq('portfolio_id', selectedPortfolio);
        }

        const propertyIds = selectedUnitIds.length > 0 
          ? getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds)
          : undefined;

        if (propertyIds && propertyIds.length > 0) {
          propertyQuery = propertyQuery.in('id', propertyIds);
        }

        const { data: expenseData, error: expenseError } = await propertyQuery.limit(5);

        if (expenseError) {
          console.error('Error validating expense data:', expenseError);
          toast.error('Error validating expense transactions. Please try again.');
          return;
        }

        const hasRentPayments = (rentPayments?.length || 0) > 0;
        const hasExpenseActivity = expenseData?.some(p => 
          (p.insurance_cost || 0) > 0 || (p.mortgage_cost || 0) > 0 || 
          (p.management_fee || 0) > 0 || (p.repair_costs || 0) > 0 ||
          (p.property_taxes || 0) > 0 || (p.utilities_expense || 0) > 0 ||
          (p.legal_professional_fees || 0) > 0 || (p.advertising_expense || 0) > 0 ||
          (p.other_operating_expenses || 0) > 0
        ) || false;

        if (!hasRentPayments && !hasExpenseActivity) {
          toast.error(
            `Cash Basis Report Cannot Be Generated\n\n` +
            `Cash basis accounting requires actual cash transactions within the selected period. ` +
            `No rent payments or expense payments were found for ${getDateRangeLabel()}.\n\n` +
            `To generate this report, you need:\n` +
            `• Completed rent payments during this period, OR\n` +
            `• Property expense records (insurance, mortgage, repairs, etc.)\n\n` +
            `Options:\n` +
            `• Switch to Accrual basis to see expected rent and obligations\n` +
            `• Select a different date range with payment activity\n` +
            `• Add payment records for this period first`,
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

    const propertyIds = selectedUnitIds.length > 0 
      ? getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds)
      : undefined;

    const params: TrialBalanceParams = {
      propertyIds: propertyIds && propertyIds.length > 0 ? propertyIds : undefined,
      portfolioId: selectedPortfolio === 'everything' ? 'all' : selectedPortfolio,
      startDate: format(dateRange.from!, 'yyyy-MM-dd'),
      endDate: format(dateRange.to!, 'yyyy-MM-dd'),
      accountingBasis
    };

    setReportParams(params);
  };

  const handleExportCSV = () => {
    if (!reportParams) {
      toast.error('Please run the report first');
      return;
    }
    
    if (!trialBalanceData) return;

    const exportData = {
      accounts: trialBalanceData.accounts,
      summary: trialBalanceData.summary,
      date_range: getDateRangeLabel()
    };

    generateTrialBalanceCSV(exportData, reportMessage);
    toast.success('CSV report exported successfully');
  };

  const handleExportPDF = () => {
    if (!reportParams) {
      toast.error('Please run the report first');
      return;
    }
    
    if (!trialBalanceData) return;

    const exportData = {
      accounts: trialBalanceData.accounts,
      summary: trialBalanceData.summary,
      date_range: getDateRangeLabel()
    };

    generateTrialBalancePDF(exportData, reportMessage);
    toast.success('PDF report exported successfully');
  };

  const getDateRangeLabel = () => {
    if (!dateRange.from || !dateRange.to) return 'No Date Range';
    
    return `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
  };

  // Group accounts by type for display
  const accountsByType = React.useMemo(() => {
    if (!trialBalanceData?.accounts) return {};
    
    return trialBalanceData.accounts.reduce((acc, account) => {
      if (!acc[account.account_type]) {
        acc[account.account_type] = [];
      }
      acc[account.account_type].push(account);
      return acc;
    }, {} as Record<string, typeof trialBalanceData.accounts>);
  }, [trialBalanceData?.accounts]);

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
            <h1 className="text-2xl font-bold gradient-text">Trial Balance</h1>
            <p className="text-muted-foreground">Individual property account balances organized by account type</p>
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
        </div>
      </div>

      {/* Enhanced Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Portfolio */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Portfolio</label>
                <Select
                  value={selectedPortfolio}
                  onValueChange={setSelectedPortfolio}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Portfolio" />
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
                <label className="text-sm font-medium text-foreground">Date Range</label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              {/* Properties */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Properties</label>
                {propertiesLoading ? (
                  <div className="flex items-center justify-center h-10 border rounded-md bg-muted/10">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : propertiesError ? (
                  <div className="flex items-center justify-center h-10 border rounded-md bg-destructive/10 text-destructive">
                    Error loading properties
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchProperties()}
                      className="ml-2"
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <HierarchicalPropertySelector
                    properties={allProperties}
                    selectedPropertyIds={selectedProperties}
                    selectedUnitIds={selectedUnitIds}
                    onSelectionChange={(propertyIds, unitIds) => {
                      setSelectedProperties(propertyIds);
                      setSelectedUnitIds(unitIds);
                    }}
                    onAllPropertiesModeChange={setIsAllPropertiesMode}
                  />
                )}
              </div>
              
              {/* Accounting Basis */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Accounting Basis</label>
                <RadioGroup 
                  value={accountingBasis} 
                  onValueChange={(value: 'cash' | 'accrual') => setAccountingBasis(value)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash-basis" />
                    <Label htmlFor="cash-basis">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="accrual" id="accrual-basis" />
                    <Label htmlFor="accrual-basis">Accrual</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
          
          {/* Report Message and Actions Row */}
          <div className="flex items-end justify-between gap-4 mt-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-foreground">Report Message (Optional)</label>
              <Input
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Add a message to appear on the report..."
              />
            </div>
            
            <div className="flex items-center gap-3">
              {reportParams && !isLoading && trialBalanceData && trialBalanceData.accounts.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => toast.info('Save as custom report feature coming soon!')}
                  >
                    Save as custom report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                  >
                    Export
                  </Button>
                </>
              )}
              
              <Button 
                onClick={handleRunReport} 
                disabled={isLoading}
                variant="default"
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
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
            { table: 'transactions', description: 'Financial transactions by property' },
            { table: 'chart_of_accounts', description: 'Account classifications and types' },
            { table: 'properties', description: 'Property details and ownership' },
            { table: 'property_units', description: 'Unit-level financial tracking' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Account Balances', description: 'Debit and credit balances for each account' },
              { field: 'Account Classifications', description: 'Account types properly set in chart of accounts' },
              { field: 'Transaction History', description: 'All transactions through the report period' }
            ],
            calculationSteps: [
              { step: 'Account Balance', formula: 'Sum of debits - Sum of credits for each account' },
              { step: 'Total Debits', formula: 'Sum of all debit balances across accounts' },
              { step: 'Total Credits', formula: 'Sum of all credit balances across accounts' },
              { step: 'Balance Verification', formula: 'Total Debits must equal Total Credits' }
            ],
            note: 'Trial balance verifies accounting accuracy by ensuring debits equal credits. Use to identify data entry errors before generating financial statements.'
          }}
        />

      {/* Report Results */}
      {reportParams && (
        <div className="space-y-6">
          {isLoading && (
            <CardEnhanced>
              <CardEnhancedContent className="p-8">
                <div className="flex items-center justify-center space-y-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold">Generating Trial Balance</h3>
                    <p className="text-muted-foreground">Please wait while we compile your account balances...</p>
                  </div>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          )}

          {!isLoading && error && (
            <CardEnhanced>
              <CardEnhancedContent className="p-8">
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-destructive/10 mx-auto w-fit">
                    <UserCheck className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">Error Loading Report</h3>
                    <p className="text-muted-foreground">
                      {error instanceof Error ? error.message : 'Failed to load trial balance data'}
                    </p>
                  </div>
                  <Button onClick={handleRunReport} variant="outline">
                    Try Again
                  </Button>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          )}

          {!isLoading && !error && trialBalanceData && (
            <>
              {/* Cash Transaction Warning */}
              {accountingBasis === 'cash' && !trialBalanceData.hasCashTransactions && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <strong>Limited cash transaction data for the selected period.</strong>
                    <br />
                    Cash basis accounting shows accounts with actual cash activity. The report below reflects available transaction data. 
                    For complete financial reporting, ensure all cash transactions (rent payments, expense payments) are recorded in the system.
                  </AlertDescription>
                </Alert>
              )}

              {/* Show report data if there are cash transactions (for cash basis) or if using accrual basis */}
              {((accountingBasis === 'cash' && trialBalanceData.hasCashTransactions) || accountingBasis === 'accrual') && trialBalanceData.accounts.length > 0 && (
                <>
                  {/* Trial Balance Report Table */}
                  <CardEnhanced>
                    <CardEnhancedHeader>
                      <CardEnhancedTitle className="text-lg font-semibold">
                        Trial Balance Report - {getDateRangeLabel()}
                      </CardEnhancedTitle>
                    </CardEnhancedHeader>
                    
                    {/* Property Information Display */}
                    <div className="px-6 pt-4 pb-2">
                      <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Portfolio Info */}
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-full bg-primary/10">
                              <Building className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Portfolio</p>
                              <p className="text-sm font-medium text-foreground truncate">
                                {selectedPortfolio === 'everything' 
                                  ? 'All Portfolios' 
                                  : portfolios?.find(p => p.id === selectedPortfolio)?.client_name || 'Unknown Portfolio'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Property Selection */}
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-full bg-secondary/10">
                              <MapPin className="h-4 w-4 text-secondary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Properties</p>
                              <p className="text-sm font-medium text-foreground truncate">
                                {isAllPropertiesMode 
                                  ? 'All Properties'
                                  : selectedUnitIds.length > 0 || selectedProperties.length > 0
                                    ? `${selectedUnitIds.length + selectedProperties.length} Selected`
                                    : 'None Selected'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Date Range */}
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-full bg-accent/10">
                              <Calendar className="h-4 w-4 text-accent" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Period</p>
                              <p className="text-sm font-medium text-foreground truncate">
                                {getDateRangeLabel()}
                              </p>
                            </div>
                          </div>

                          {/* Accounting Basis */}
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-full bg-accent-variant/10">
                              <FileText className="h-4 w-4 text-accent-variant" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Basis</p>
                              <p className="text-sm font-medium text-foreground capitalize">
                                {accountingBasis} Basis
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Selected Properties Detail (when specific properties are selected) */}
                        {!isAllPropertiesMode && (selectedUnitIds.length > 0 || selectedProperties.length > 0) && (
                          <div className="mt-4 pt-4 border-t border-border/30">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Selected Properties</p>
                            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                              {getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds)
                                .concat(selectedProperties.filter(id => !getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds).includes(id)))
                                .slice(0, 10)
                                .map(propertyId => {
                                  const property = allProperties.find(p => p.id === propertyId);
                                  return (
                                    <span 
                                      key={propertyId}
                                      className="inline-flex items-center px-2 py-1 rounded-md bg-primary/5 text-xs font-medium text-primary border border-primary/20"
                                    >
                                      {property?.address || 'Unknown Property'}
                                    </span>
                                  );
                                })}
                              {(getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds).length + 
                                selectedProperties.filter(id => !getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds).includes(id)).length) > 10 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                  +{(getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds).length + 
                                    selectedProperties.filter(id => !getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds).includes(id)).length) - 10} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Report Message Display */}
                    {reportMessage && reportMessage.trim() && (
                      <div className="px-6 pt-4 pb-2">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-1 rounded-full bg-primary/10">
                              <Calculator className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-foreground mb-1">Report Message</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {reportMessage.trim()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <CardEnhancedContent className="p-0">
                      <div className="overflow-x-auto">
                         <table className="w-full">
                           <thead>
                             <tr className="border-b bg-muted/20">
                               <th className="text-left p-3 text-xs font-medium text-muted-foreground">ACCOUNT CODE</th>
                               <th className="text-left p-3 text-xs font-medium text-muted-foreground">ACCOUNT NAME</th>
                               <th className="text-right p-3 text-xs font-medium text-muted-foreground">BEGINNING BALANCE</th>
                               <th className="text-right p-3 text-xs font-medium text-muted-foreground">TOTAL DEBIT</th>
                               <th className="text-right p-3 text-xs font-medium text-muted-foreground">TOTAL CREDIT</th>
                               <th className="text-right p-3 text-xs font-medium text-muted-foreground">NET ACTIVITY</th>
                               <th className="text-right p-3 text-xs font-medium text-muted-foreground">ENDING BALANCE</th>
                             </tr>
                           </thead>
                           <tbody>
                             {Object.entries(accountsByType).map(([accountType, accounts]) => (
                               <React.Fragment key={accountType}>
                                 {/* Account Type Header */}
                                 <tr className="bg-muted/10 border-b">
                                   <td colSpan={7} className="p-3 font-medium text-sm text-foreground uppercase">
                                     {accountType}
                                   </td>
                                 </tr>
                                 
                                 {/* Account Rows */}
                                 {accounts.map((account, index) => (
                                   <tr key={`${account.account_code}-${index}`} className="border-b hover:bg-muted/5">
                                     <td className="p-3 text-sm text-muted-foreground pl-6">{account.account_code}</td>
                                     <td className="p-3 text-sm">{account.account_name}</td>
                                     <td className="p-3 text-sm text-right">{formatCurrency(account.beginning_balance)}</td>
                                     <td className="p-3 text-sm text-right">{formatCurrency(account.debits)}</td>
                                     <td className="p-3 text-sm text-right">{formatCurrency(account.credits)}</td>
                                     <td className="p-3 text-sm text-right">{formatCurrency(account.net_activity)}</td>
                                     <td className="p-3 text-sm text-right font-medium">{formatCurrency(account.ending_balance)}</td>
                                   </tr>
                                 ))}
                                 
                                 {/* Account Type Subtotal */}
                                 <tr className="border-b-2 bg-muted/5">
                                   <td colSpan={6} className="p-3 text-sm font-medium text-right">
                                     Total {accountType}:
                                   </td>
                                   <td className="p-3 text-sm text-right font-bold">
                                     {formatCurrency(
                                       accounts.reduce((sum, account) => sum + account.ending_balance, 0)
                                     )}
                                   </td>
                                 </tr>
                               </React.Fragment>
                             ))}
                             
                             {/* Grand Totals */}
                             <tr className="bg-primary/10 border-t-2 border-primary font-bold">
                               <td className="p-3 text-sm" colSpan={2}>
                                 TOTAL
                               </td>
                               <td className="p-3 text-sm text-right">
                                 {formatCurrency(trialBalanceData.accounts.reduce((sum, acc) => sum + acc.beginning_balance, 0))}
                               </td>
                               <td className="p-3 text-sm text-right">
                                 {formatCurrency(trialBalanceData.summary.total_debits)}
                               </td>
                               <td className="p-3 text-sm text-right">
                                 {formatCurrency(trialBalanceData.summary.total_credits)}
                               </td>
                               <td className="p-3 text-sm text-right">
                                 {formatCurrency(trialBalanceData.summary.total_debits - trialBalanceData.summary.total_credits)}
                               </td>
                               <td className="p-3 text-sm text-right">
                                 {formatCurrency(trialBalanceData.accounts.reduce((sum, acc) => sum + acc.ending_balance, 0))}
                               </td>
                             </tr>
                           </tbody>
                         </table>
                      </div>
                      
                      {/* Balance Verification */}
                      <div className="p-4 border-t bg-muted/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Trial Balance Status: 
                          </span>
                          <span className={`font-medium ${Math.abs(trialBalanceData.summary.total_debits - trialBalanceData.summary.total_credits) < 0.01 ? 'text-green-600' : 'text-orange-600'}`}>
                            {Math.abs(trialBalanceData.summary.total_debits - trialBalanceData.summary.total_credits) < 0.01 ? 'In Balance' : 'Out of Balance'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span>Properties included: {trialBalanceData.summary.properties_count}</span>
                          <span>Difference: {formatCurrency(Math.abs(trialBalanceData.summary.total_debits - trialBalanceData.summary.total_credits))}</span>
                        </div>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>
                </>
              )}
            </>
          )}

          {!isLoading && !error && trialBalanceData && trialBalanceData.accounts.length === 0 && (
            <CardEnhanced>
              <CardEnhancedContent className="p-8">
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-muted/20 mx-auto w-fit">
                    <Calculator className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No Data Available</h3>
                    <p className="text-muted-foreground">
                      No financial data was found for the selected properties and date range.
                    </p>
                  </div>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          )}
        </div>
      )}
    </div>
  );
};
