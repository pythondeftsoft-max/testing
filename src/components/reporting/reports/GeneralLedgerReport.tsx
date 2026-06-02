import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Separator } from '@/components/ui/separator';
import { Download, Calendar, Filter, Play, ArrowLeft, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useGeneralLedger, GeneralLedgerAccount, GeneralLedgerProperty } from '@/hooks/useGeneralLedger';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useUserPropertiesWithUnits, getUnitOptionsFromProperties, getPropertyIdsFromUnitIds } from '@/hooks/useUserPropertiesWithUnits';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface GeneralLedgerReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const GeneralLedgerReport: React.FC<GeneralLedgerReportProps> = ({ 
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
  const [dateRange, setDateRange] = useState<{from: Date | undefined; to: Date | undefined}>({
    from: new Date('2025-01-01'),
    to: new Date('2025-09-01')
  });
  const [datePreset, setDatePreset] = useState<string>('year-to-date');
  const [accountingBasis, setAccountingBasis] = useState<'cash' | 'accrual'>('accrual');
  const [saveAsCustom, setSaveAsCustom] = useState<boolean>(false);
  const [filterAccount, setFilterAccount] = useState('');
  
  // State for running report - remove since we're using the hook's internal state
  // const [runParams, setRunParams] = useState<null | {
  //   portfolioId?: string;
  //   propertyIds?: string[];
  //   startDate: string;
  //   endDate: string;
  //   accountingBasis: 'cash' | 'accrual';
  // }>(null);

  // Reset selected properties when portfolio changes and force cache invalidation
  React.useEffect(() => {
    console.log('🔍 [GL_REPORT] Portfolio changed effect triggered:', {
      selectedPortfolio,
      userId: user?.id
    });
    setSelectedProperties([]);
    
    // Force invalidate relevant queries when portfolio changes
    if (user?.id) {
      console.log('🔍 [GL_REPORT] Invalidating relevant queries for portfolio change...');
      queryClient.invalidateQueries({ 
        queryKey: ['user-properties-with-units', user.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['general-ledger'] 
      });
    }
  }, [selectedPortfolio, user?.id, queryClient]);

  // Fetch properties with units based on selected portfolio
  const { data: userProperties = [], isLoading: propertiesLoading, error: propertiesError, refetch: refetchProperties } = useUserPropertiesWithUnits(
    user?.id || '',
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );

  // Force properties refetch when portfolio changes
  React.useEffect(() => {
    if (user?.id && selectedPortfolio) {
      console.log('🔍 [GL_REPORT] Forcing properties refetch due to portfolio change');
      refetchProperties();
    }
  }, [selectedPortfolio, user?.id, refetchProperties]);

  // Debug property loading
  React.useEffect(() => {
    console.log('🔍 [GL_REPORT] Properties effect triggered - Properties loaded:', {
      selectedPortfolio,
      propertiesCount: userProperties.length,
      propertiesLoading,
      propertiesError,
      userProperties: userProperties.slice(0, 2).map(p => ({ 
        id: p.id, 
        address: p.address, 
        portfolio_id: p.portfolio_id,
        units: p.property_units?.length || 0
      })) // Show first 2 for debugging
    });
  }, [selectedPortfolio, userProperties, propertiesLoading, propertiesError]);

  const propertyOptions = React.useMemo(() => {
    console.log('🔍 [GL_REPORT] Computing property options from properties:', {
      propertiesCount: userProperties?.length || 0,
      selectedPortfolio: selectedPortfolio,
      propertiesLoading,
      propertiesError: propertiesError?.message,
      rawPropertiesData: userProperties?.map(p => ({ 
        id: p.id, 
        address: p.address, 
        portfolio_id: p.portfolio_id,
        units: p.property_units?.length || 0,
        hasUnits: !!p.property_units && p.property_units.length > 0
      }))
    });
    
    if (!userProperties || userProperties.length === 0) {
      console.log('🚨 [GL_REPORT] No properties available for options generation');
      return [];
    }
    
    const options = getUnitOptionsFromProperties(userProperties);
    console.log('🔍 [GL_REPORT] Generated property options:', {
      optionsCount: options.length,
      sampleOptions: options.slice(0, 3),
      allOptions: options
    });
    return options;
  }, [userProperties, selectedPortfolio, propertiesLoading, propertiesError]);

  // Use the updated hook (no parameters, manual trigger only)
  const { properties, accounts, grandTotal, loading, error, runReport, refetch, hasRunParams } = useGeneralLedger();

  // Remove auto-initialization - reports should only run when "Run Report" is clicked
  // (keeping this comment for context but removing the useEffect that auto-runs reports)
  // Remove auto-initialization - reports should only run when "Run Report" is clicked
  React.useEffect(() => {
    console.log('🔍 [GL_REPORT] Component mounted, but reports will only run when explicitly requested');
    // No longer auto-initializing runParams - user must click "Run Report"
  }, [user?.id]);

  const filteredProperties = React.useMemo(() => {
    if (!filterAccount) return properties;
    
    return properties.map(property => ({
      ...property,
      accounts: property.accounts.filter(account => 
        account.name.toLowerCase().includes(filterAccount.toLowerCase())
      )
    })).filter(property => property.accounts.length > 0);
  }, [properties, filterAccount]);

  // Maintain backward compatibility for old account filtering
  const filteredAccounts = React.useMemo(() => {
    return properties.flatMap(p => p.accounts).filter(account => 
      !filterAccount || account.name.toLowerCase().includes(filterAccount.toLowerCase())
    );
  }, [properties, filterAccount]);

  // Handle date preset changes
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    
    switch (preset) {
      case 'year-to-date':
        setDateRange({
          from: new Date(today.getFullYear(), 0, 1),
          to: today
        });
        break;
      case 'custom':
        // Keep current date range
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

    const propertyIds = selectedProperties.length > 0 
      ? getPropertyIdsFromUnitIds(userProperties, selectedProperties)
      : undefined;

    console.log('🔍 [GL_REPORT] handleRunReport called with:', {
      selectedPortfolio,
      selectedProperties: selectedProperties.length,
      propertyIds,
      startDate: dateRange.from.toISOString().split('T')[0],
      endDate: dateRange.to.toISOString().split('T')[0],
      availableProperties: userProperties?.length || 0
    });
    
    // Call the hook's runReport function instead of setting runParams
    runReport(
      selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
      dateRange.from.toISOString().split('T')[0],
      dateRange.to.toISOString().split('T')[0],
      propertyIds,
      accountingBasis
    );
    
    if (saveAsCustom) {
      toast.success('Report saved as custom report');
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!hasRunParams) {
      toast.error('Please run the report first');
      return;
    }

    if (format === 'csv') {
      // Create CSV content
      const csvHeaders = ['Property', 'Account', 'Date', 'Type', 'Unit', 'Name', 'Description', 'Debit', 'Credit', 'Balance'];
      const csvRows = [csvHeaders.join(',')];

      filteredProperties.forEach(property => {
        // Add property header
        csvRows.push(`\n"${property.address}",,,,,,,,,`);
        
        property.accounts.forEach(account => {
          // Add account header
          csvRows.push(`,"${account.name}",,,,,,,`);
          
          // Add transactions
          account.transactions.forEach(transaction => {
            const row = [
              `"${property.address}"`,
              `"${account.name}"`,
              `"${new Date(transaction.date).toLocaleDateString()}"`,
              `"${transaction.type}"`,
              `"${transaction.unit}"`,
              `"${transaction.name}"`,
              `"${transaction.description}"`,
              transaction.debit.toString(),
              transaction.credit.toString(),
              transaction.balance.toString()
            ];
            csvRows.push(row.join(','));
          });

          // Add account totals
          csvRows.push(`,"Total ${account.name}",,,,,,"${account.totalDebits}","${account.totalCredits}","${account.endingBalance}"`);
        });

        // Add property totals
        csvRows.push(`"Total ${property.address}",,,,,,,,"${property.totalDebits}","${property.totalCredits}","${property.netBalance}"`);
      });

      // Add grand total
      csvRows.push(`\n"Grand Total",,,,,,,,"${grandTotal}"`);

      // Download CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `general-ledger-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // Generate PDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('General Ledger Report', 14, 20);
      
      // Add date range
      doc.setFontSize(10);
      doc.text(`Date Range: ${dateRange.from?.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString()}`, 14, 28);
      
      // Prepare table data
      const tableData: any[] = [];
      
      filteredProperties.forEach(property => {
        // Property header
        tableData.push([
          { content: property.address, colSpan: 10, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]);
        
        property.accounts.forEach(account => {
          // Account header
          tableData.push([
            '',
            { content: account.name, colSpan: 9, styles: { fontStyle: 'bold' } }
          ]);
          
          // Transactions
          account.transactions.forEach(transaction => {
            tableData.push([
              property.address,
              account.name,
              new Date(transaction.date).toLocaleDateString(),
              transaction.type,
              transaction.unit,
              transaction.name,
              transaction.description,
              formatCurrency(transaction.debit),
              formatCurrency(transaction.credit),
              formatCurrency(transaction.balance)
            ]);
          });
          
          // Account totals
          tableData.push([
            '',
            `Total ${account.name}`,
            '', '', '', '', '',
            formatCurrency(account.totalDebits),
            formatCurrency(account.totalCredits),
            formatCurrency(account.endingBalance)
          ]);
        });
        
        // Property totals
        tableData.push([
          `Total ${property.address}`,
          '', '', '', '', '', '',
          formatCurrency(property.totalDebits),
          formatCurrency(property.totalCredits),
          formatCurrency(property.netBalance)
        ]);
      });
      
      // Add grand total
      tableData.push([
        { content: 'Grand Total', colSpan: 9, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        { content: formatCurrency(grandTotal), styles: { fontStyle: 'bold' } }
      ]);
      
      // Generate table
      autoTable(doc, {
        startY: 35,
        head: [['Property', 'Account', 'Date', 'Type', 'Unit', 'Name', 'Description', 'Debit', 'Credit', 'Balance']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 153], textColor: 255 }
      });
      
      // Download PDF
      doc.save(`general-ledger-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
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
            <p className="text-destructive mb-4">Error loading general ledger: {error}</p>
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
          <h1 className="text-3xl font-bold gradient-text">General Ledger Report</h1>
          <p className="text-muted-foreground">
            Detailed transaction history for all accounts
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

      {/* Enhanced Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Top row - Simple dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year-to-date">Year to Date</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  ) : propertyOptions.length > 0 ? (
                    <MultiSelect
                      options={propertyOptions}
                      selected={selectedProperties}
                      onChange={setSelectedProperties}
                      placeholder={`All Properties (${propertyOptions.length} available)`}
                      className="w-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted/20 text-muted-foreground text-xs">
                      {selectedPortfolio === 'everything' ? 'All Properties' : 'No properties available'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date Picker - Full Width Row */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-full"
              />
            </div>

            {/* Second row - Accounting basis and run button */}
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="space-y-2 md:col-start-5">
                <label className="text-sm font-medium">Accounting Basis</label>
                <RadioGroup
                  value={accountingBasis}
                  onValueChange={(value: 'cash' | 'accrual') => setAccountingBasis(value)}
                  className="flex flex-row space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="accrual" id="accrual" />
                    <Label htmlFor="accrual" className="text-sm">Accrual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="text-sm">Cash</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Options</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="save-custom"
                    checked={saveAsCustom}
                    onCheckedChange={(checked) => setSaveAsCustom(checked === true)}
                  />
                  <Label htmlFor="save-custom" className="text-sm">
                    Save as Custom Report
                  </Label>
                </div>
              </div>

              <div className="md:col-span-2">
                <Button 
                  onClick={handleRunReport}
                  className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                  disabled={!dateRange.from || !dateRange.to || propertiesLoading}
                >
                  <Play className="h-4 w-4" />
                  Run Report
                </Button>
              </div>
            </div>
          </div>

          {hasRunParams && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <Label htmlFor="filter-account">Filter by Account</Label>
                <input
                  id="filter-account"
                  className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Search accounts..."
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                />
              </div>
            </>
          )}
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'transactions', description: 'All financial transactions and entries' },
            { table: 'chart_of_accounts', description: 'Account types and classifications' },
            { table: 'properties', description: 'Property information and assignments' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Transaction Details', description: 'Date, amount, description, and account for each transaction' },
              { field: 'Account Assignment', description: 'Each transaction must be assigned to a chart of accounts entry' }
            ],
            calculationSteps: [
              { step: 'Account Activity', formula: 'List all transactions for selected accounts' },
              { step: 'Running Balance', formula: 'Beginning Balance + Debits - Credits (cumulative)' }
            ],
            note: 'Shows detailed transaction history for specific accounts. Filter by account to see individual account activity.'
          }}
        />

      {/* Report Content */}
      {hasRunParams && (
        <CardEnhanced>
          <CardEnhancedHeader>
            <CardEnhancedTitle>
              General Ledger - {dateRange.from?.toLocaleDateString()} to {dateRange.to?.toLocaleDateString()}
            </CardEnhancedTitle>
            <div className="text-sm text-muted-foreground">
              Accounting Basis: {accountingBasis.charAt(0).toUpperCase() + accountingBasis.slice(1)}
            </div>
          </CardEnhancedHeader>
          <CardEnhancedContent>
          <div className="space-y-8">
            {filteredAccounts.map((account: GeneralLedgerAccount) => (
              <div key={account.name} className="space-y-4">
                {/* Account Header */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold">{account.name}</h3>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-semibold">Date</th>
                        <th className="text-left p-2 font-semibold">Type</th>
                        <th className="text-left p-2 font-semibold">Unit</th>
                        <th className="text-left p-2 font-semibold">Name</th>
                        <th className="text-left p-2 font-semibold">Description</th>
                        <th className="text-right p-2 font-semibold">Debit</th>
                        <th className="text-right p-2 font-semibold">Credit</th>
                        <th className="text-right p-2 font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.transactions.map((transaction, index) => (
                        <tr 
                          key={transaction.id} 
                          className={`border-b border-border/50 ${
                            transaction.type === 'Previous Balance' 
                              ? 'bg-muted/30 font-medium' 
                              : 'hover:bg-muted/20'
                          }`}
                        >
                          <td className="p-2">
                            {transaction.type === 'Previous Balance' 
                              ? '' 
                              : new Date(transaction.date).toLocaleDateString()
                            }
                          </td>
                          <td className="p-2">{transaction.type}</td>
                          <td className="p-2">{transaction.unit}</td>
                          <td className="p-2">{transaction.name}</td>
                          <td className="p-2">{transaction.description}</td>
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
                    </tbody>
                  </table>
                </div>

                {/* Account Summary */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="font-semibold">{formatCurrency(account.totalDebits)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="font-semibold">{formatCurrency(account.totalCredits)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Beginning Balance</p>
                      <p className="font-semibold">{formatCurrency(account.previousBalance)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ending Balance</p>
                      <p className="font-semibold">{formatCurrency(account.endingBalance)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Grand Total */}
            {filteredAccounts.length > 0 && (
              <div className="bg-primary/5 p-6 rounded-lg border-2 border-primary/20">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-primary">Grand Total</h2>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(grandTotal)}
                  </p>
                </div>
              </div>
            )}

            {/* No Data Message */}
            {filteredAccounts.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-muted/20 rounded-lg p-8">
                  <h3 className="text-lg font-semibold mb-2">No Data Found</h3>
                  <p className="text-muted-foreground">
                    No general ledger data was found for the selected criteria.
                  </p>
                  <div className="mt-4 text-sm text-muted-foreground">
                    Selected Parameters:
                  </div>
                  <div className="mt-2 text-sm bg-muted/50 p-4 rounded">
                    <p><strong>Portfolio:</strong> {selectedPortfolio === 'everything' ? 'All Portfolios' : portfolios.find(p => p.id === selectedPortfolio)?.client_name || 'Unknown'}</p>
                    <p><strong>Properties:</strong> {selectedProperties.length > 0 ? `${selectedProperties.length} selected` : 'All Properties'}</p>
                    <p><strong>Date Range:</strong> {hasRunParams ? 
                      `${dateRange.from?.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString()}` : 
                      'No report run yet'
                    }</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}
    </div>
  );
};
