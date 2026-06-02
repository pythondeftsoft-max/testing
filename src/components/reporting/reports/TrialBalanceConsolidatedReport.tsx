import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Play, Calculator, UserCheck, AlertCircle, Calendar, FileText, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useTrialBalanceConsolidated, ConsolidatedTrialBalanceParams } from '@/hooks/useTrialBalanceConsolidated';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateTrialBalanceConsolidatedCSV, generateTrialBalanceConsolidatedPDF } from '@/utils/trialBalanceConsolidatedExportUtils';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface TrialBalanceConsolidatedReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const TrialBalanceConsolidatedReport: React.FC<TrialBalanceConsolidatedReportProps> = ({
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
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [accountingBasis, setAccountingBasis] = useState<'cash' | 'accrual'>('cash');
  const [reportParams, setReportParams] = useState<ConsolidatedTrialBalanceParams | undefined>();
  const [reportMessage, setReportMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Reset selected properties when portfolio changes
  React.useEffect(() => {
    setSelectedProperties([]);
    setSelectedUnitIds([]);
    
    if (user?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['all-properties-with-units'] 
      });
    }
  }, [selectedPortfolio, user?.id, queryClient]);

  // Fetch properties with units based on selected portfolio
  const { data: allProperties = [], isLoading: propertiesLoading, error: propertiesError, refetch: refetchProperties } = useAllPropertiesWithUnits(
    user?.id || '',
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );
  
  // Data fetching hook
  const { data: consolidatedData, isLoading, error, refetch } = useTrialBalanceConsolidated(reportParams);
  
  // Check if filters have changed since last report
  const filtersChanged = React.useMemo(() => {
    if (!reportParams || !dateRange.from || !dateRange.to) return false;
    
    const propertyIds = selectedUnitIds.length > 0 || selectedProperties.length > 0
      ? [
          ...selectedProperties,
          ...getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds)
        ]
      : undefined;

    const currentPortfolioId = selectedPortfolio === 'everything' ? 'all' : selectedPortfolio;
    const currentStartDate = format(dateRange.from, 'yyyy-MM-dd');
    const currentEndDate = format(dateRange.to, 'yyyy-MM-dd');
    
    return (
      reportParams.portfolioId !== currentPortfolioId ||
      reportParams.startDate !== currentStartDate ||
      reportParams.endDate !== currentEndDate ||
      reportParams.accountingBasis !== accountingBasis ||
      JSON.stringify(reportParams.propertyIds || []) !== JSON.stringify(propertyIds || [])
    );
  }, [reportParams, selectedPortfolio, selectedProperties, selectedUnitIds, dateRange, accountingBasis, allProperties]);

  // Validate filters before running report
  const validateFilters = () => {
    const missingFilters = [];
    
    if (!dateRange.from || !dateRange.to) {
      missingFilters.push('Date Range');
    }
    
    if (!user?.id) {
      missingFilters.push('User Authentication');
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

    // Show refresh animation
    setIsRefreshing(true);
    
    // Brief delay to show refresh effect
    await new Promise(resolve => setTimeout(resolve, 100));

    const propertyIds = selectedUnitIds.length > 0 || selectedProperties.length > 0
      ? [
          ...selectedProperties,
          ...getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds)
        ]
      : undefined;

    const params: ConsolidatedTrialBalanceParams = {
      propertyIds: propertyIds && propertyIds.length > 0 ? propertyIds : undefined,
      portfolioId: selectedPortfolio === 'everything' ? 'all' : selectedPortfolio,
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
      accountingBasis
    };

    // Validate cash transactions for cash basis reports
    if (accountingBasis === 'cash') {
      try {
        // Check for rent payments
        const { data: rentPayments, error: rentError } = await supabase
          .from('rent_payments')
          .select('id')
          .gte('payment_date', params.startDate)
          .lte('payment_date', params.endDate)
          .eq('status', 'completed')
          .limit(1);

        if (rentError) {
          toast.error('Error validating cash transactions. Please try again.');
          return;
        }

        // Check for expense activity (properties with cost data)
        const { data: expenseData, error: expenseError } = await supabase
          .from('properties')
          .select('id, insurance_cost, mortgage_cost, management_fee, repair_costs, property_taxes, utilities_expense, legal_professional_fees, advertising_expense, other_operating_expenses')
          .in('status', ['available', 'occupied', 'vacant'])
          .is('deleted_at', null)
          .limit(5);

        if (expenseError) {
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
            `Options:\n` +
            `• Switch to Accrual basis to see expected rent and obligations\n` +
            `• Select a different date range with payment activity\n` +
            `• Add payment records for this period first`,
            {
              duration: 8000,
            }
          );
          setIsRefreshing(false);
          return;
        }
      } catch (error) {
        console.error('Error validating cash transactions:', error);
        toast.error('Error validating cash transactions. Please try again.');
        setIsRefreshing(false);
        return;
      }
    }

    setReportParams(params);
    
    // Reset refresh state after a moment
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const handleExportCSV = () => {
    if (!reportParams) {
      toast.error('Please run the report first');
      return;
    }
    
    if (!consolidatedData) return;

    const exportData = {
      accounts: consolidatedData.accounts,
      date_range: getDateRangeLabel()
    };

    generateTrialBalanceConsolidatedCSV(exportData, reportMessage);
    toast.success('CSV report exported successfully');
  };

  const handleExportPDF = () => {
    if (!reportParams) {
      toast.error('Please run the report first');
      return;
    }
    
    if (!consolidatedData) return;

    const exportData = {
      accounts: consolidatedData.accounts,
      date_range: getDateRangeLabel()
    };

    generateTrialBalanceConsolidatedPDF(exportData, reportMessage);
    toast.success('PDF report exported successfully');
  };

  const getDateRangeLabel = () => {
    if (!dateRange.from || !dateRange.to) return 'No Date Range';
    
    return `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
  };

  // Group accounts by type for display with proper ordering
  const accountsByType = React.useMemo(() => {
    if (!consolidatedData?.accounts) return {};
    
    const grouped = consolidatedData.accounts.reduce((acc, account) => {
      if (!acc[account.account_type]) {
        acc[account.account_type] = [];
      }
      acc[account.account_type].push(account);
      return acc;
    }, {} as Record<string, typeof consolidatedData.accounts>);

    // Calculate subtotals for each account type
    const groupedWithSubtotals = Object.entries(grouped).reduce((acc, [type, accounts]) => {
      const subtotal = {
        beginning_balance: accounts.reduce((sum, a) => sum + a.beginning_balance, 0),
        debits: accounts.reduce((sum, a) => sum + a.debits, 0),
        credits: accounts.reduce((sum, a) => sum + a.credits, 0),
        net_activity: accounts.reduce((sum, a) => sum + a.net_activity, 0),
        ending_balance: accounts.reduce((sum, a) => sum + a.ending_balance, 0)
      };
      acc[type] = { accounts, subtotal };
      return acc;
    }, {} as Record<string, { accounts: typeof consolidatedData.accounts, subtotal: any }>);

    return groupedWithSubtotals;
  }, [consolidatedData?.accounts]);

  // Calculate grand totals
  const grandTotals = React.useMemo(() => {
    if (!consolidatedData?.accounts) return null;
    
    return {
      beginning_balance: consolidatedData.accounts.reduce((sum, a) => sum + a.beginning_balance, 0),
      debits: consolidatedData.accounts.reduce((sum, a) => sum + a.debits, 0),
      credits: consolidatedData.accounts.reduce((sum, a) => sum + a.credits, 0),
      net_activity: consolidatedData.accounts.reduce((sum, a) => sum + a.net_activity, 0),
      ending_balance: consolidatedData.accounts.reduce((sum, a) => sum + a.ending_balance, 0)
    };
  }, [consolidatedData?.accounts]);

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
            <h1 className="text-2xl font-bold gradient-text">Trial Balance Consolidated</h1>
            <p className="text-muted-foreground">Consolidated account balances across properties</p>
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
        <CardEnhancedContent className="p-4">
          <div className="space-y-3">
            {/* Restructured filter layout matching Vendor Ledger Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Properties */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Properties</label>
                <HierarchicalPropertySelector
                  properties={allProperties}
                  selectedPropertyIds={selectedProperties}
                  selectedUnitIds={selectedUnitIds}
                  onSelectionChange={(propertyIds, unitIds) => {
                    setSelectedProperties(propertyIds);
                    setSelectedUnitIds(unitIds);
                  }}
                  placeholder="All Properties"
                  disabled={propertiesLoading}
                />
              </div>
            </div>

            {/* Second row - Date Range + Accounting Basis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date Range</label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  className="w-full"
                />
              </div>

              {/* Accounting Basis */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Accounting Basis</label>
                <RadioGroup 
                  value={accountingBasis} 
                  onValueChange={(value: 'cash' | 'accrual') => setAccountingBasis(value)} 
                  className="flex flex-row space-x-4"
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

            {/* Report Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Report Message (Optional)</label>
              <Input
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Add a message to appear on the report..."
              />
            </div>

            {/* Run Report Button Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-end">
                <div className="flex items-center gap-2">
                  {reportParams && !isLoading && consolidatedData && consolidatedData.accounts.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => toast.info('Save as custom report feature coming soon!')}
                      >
                        Save as custom report
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
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'transactions', description: 'All financial transactions consolidated' },
            { table: 'chart_of_accounts', description: 'Account types and classifications' },
            { table: 'properties', description: 'All properties in scope' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Account Balances', description: 'Beginning balance for each account' },
              { field: 'Transaction Activity', description: 'All debits and credits in the period' },
              { field: 'Account Classifications', description: 'Account types (Assets, Liabilities, Revenue, Expenses)' }
            ],
            calculationSteps: [
              { step: 'Beginning Balance', formula: 'Previous period ending balance' },
              { step: 'Net Activity', formula: 'Total Debits - Total Credits' },
              { step: 'Ending Balance', formula: 'Beginning Balance + Net Activity' },
              { step: 'Account Totals', formula: 'Sum by account type' }
            ],
            note: 'Ensures debits equal credits. Cash basis uses actual transactions, accrual basis uses all recorded amounts.'
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
                    <h3 className="text-lg font-semibold">Generating {accountingBasis.toUpperCase()} Basis Trial Balance</h3>
                    <p className="text-muted-foreground">
                      {accountingBasis === 'cash' 
                        ? 'Processing actual cash transactions and payments...'
                        : 'Consolidating account balances and accruals across properties...'
                      }
                    </p>
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
                      {error instanceof Error ? error.message : 'Failed to load consolidated trial balance data'}
                    </p>
                  </div>
                  <Button onClick={handleRunReport} variant="outline">
                    Try Again
                  </Button>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          )}

          {!isLoading && !error && consolidatedData && (
            <div className={`transition-all duration-300 ${isRefreshing ? 'opacity-50 scale-[0.99]' : 'opacity-100 scale-100'}`}>
              {/* Cash Transaction Warning */}
              {accountingBasis === 'cash' && !consolidatedData.hasCashTransactions && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 mb-6">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <strong>No cash transactions found for the selected period.</strong>
                    <br />
                    Cash basis accounting only shows accounts with actual cash activity. Consider switching to <strong>Accrual</strong> basis to see expected rent and expenses, or select a different date range where cash transactions occurred.
                  </AlertDescription>
                </Alert>
              )}

              {/* Show report data if there are cash transactions (for cash basis) or if using accrual basis */}
              {(accountingBasis === 'accrual' || consolidatedData.hasCashTransactions) && consolidatedData.accounts.length > 0 && (
                <>
                  <CardEnhanced>
                    <CardEnhancedHeader className="px-6 py-4 border-b">
                      <CardEnhancedTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calculator className="h-6 w-6 text-primary" />
                          <span className="text-xl font-bold">
                            Trial Balance Consolidated - {getDateRangeLabel()}
                            {isRefreshing && <span className="ml-2 text-sm text-muted-foreground animate-pulse">(Refreshing...)</span>}
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          accountingBasis === 'cash' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {accountingBasis === 'cash' ? 'Cash Basis' : 'Accrual Basis'}
                        </span>
                      </CardEnhancedTitle>
                    </CardEnhancedHeader>
                    <CardEnhancedContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/20">
                              <th className="text-left p-4 font-semibold">Account Code</th>
                              <th className="text-left p-4 font-semibold">Account Name</th>
                              <th className="text-right p-4 font-semibold">Beginning Balance</th>
                              <th className="text-right p-4 font-semibold">Debits</th>
                              <th className="text-right p-4 font-semibold">Credits</th>
                              <th className="text-right p-4 font-semibold">Net Activity</th>
                              <th className="text-right p-4 font-semibold">Ending Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(accountsByType).map(([accountType, { accounts, subtotal }]) => (
                              <React.Fragment key={accountType}>
                                {/* Account Type Header */}
                                <tr className="bg-muted/10 border-b">
                                  <td className="p-4 font-bold text-lg" colSpan={7}>
                                    {accountType}
                                  </td>
                                </tr>
                                
                                {/* Individual Accounts */}
                                {accounts.map((account) => (
                                  <tr key={`${account.account_code}-${account.account_name}`} className="border-b hover:bg-muted/5">
                                    <td className="p-4 text-sm font-mono">{account.account_code}</td>
                                    <td className="p-4 text-sm">{account.account_name}</td>
                                    <td className="p-4 text-sm text-right font-mono">
                                      {formatCurrency(account.beginning_balance)}
                                    </td>
                                    <td className="p-4 text-sm text-right font-mono">
                                      {formatCurrency(account.debits)}
                                    </td>
                                    <td className="p-4 text-sm text-right font-mono">
                                      {formatCurrency(account.credits)}
                                    </td>
                                    <td className="p-4 text-sm text-right font-mono">
                                      {formatCurrency(account.net_activity)}
                                    </td>
                                    <td className="p-4 text-sm text-right font-mono font-semibold">
                                      {formatCurrency(account.ending_balance)}
                                    </td>
                                  </tr>
                                ))}
                                
                                {/* Subtotal Row */}
                                <tr className="bg-muted/20 border-b-2 font-semibold">
                                  <td className="p-4 text-sm" colSpan={2}>
                                    Total {accountType}
                                  </td>
                                  <td className="p-4 text-sm text-right font-mono">
                                    {formatCurrency(subtotal.beginning_balance)}
                                  </td>
                                  <td className="p-4 text-sm text-right font-mono">
                                    {formatCurrency(subtotal.debits)}
                                  </td>
                                  <td className="p-4 text-sm text-right font-mono">
                                    {formatCurrency(subtotal.credits)}
                                  </td>
                                  <td className="p-4 text-sm text-right font-mono">
                                    {formatCurrency(subtotal.net_activity)}
                                  </td>
                                  <td className="p-4 text-sm text-right font-mono font-bold">
                                    {formatCurrency(subtotal.ending_balance)}
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}
                            
                            {/* Grand Total Row */}
                            {grandTotals && (
                              <tr className="bg-primary/10 border-t-4 border-primary font-bold text-lg">
                                <td className="p-4" colSpan={2}>
                                  GRAND TOTAL
                                </td>
                                <td className="p-4 text-right font-mono">
                                  {formatCurrency(grandTotals.beginning_balance)}
                                </td>
                                <td className="p-4 text-right font-mono">
                                  {formatCurrency(grandTotals.debits)}
                                </td>
                                <td className="p-4 text-right font-mono">
                                  {formatCurrency(grandTotals.credits)}
                                </td>
                                <td className="p-4 text-right font-mono">
                                  {formatCurrency(grandTotals.net_activity)}
                                </td>
                                <td className="p-4 text-right font-mono text-xl">
                                  {formatCurrency(grandTotals.ending_balance)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>
                </>
              )}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && consolidatedData && consolidatedData.accounts.length === 0 && (
            <CardEnhanced>
              <CardEnhancedContent className="p-8">
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-muted mx-auto w-fit">
                    <Calculator className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No Financial Data Found</h3>
                    <p className="text-muted-foreground">
                      No account balances or financial transactions were found for the selected criteria.
                    </p>
                  </div>
                  <Button onClick={handleRunReport} variant="outline">
                    Try Different Parameters
                  </Button>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          )}
        </div>
      )}
    </div>
  );
};