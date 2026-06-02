import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet, FileText, ArrowLeft, Calendar, Play } from 'lucide-react';
import { useBalanceSheetData } from '@/hooks/reports/useBalanceSheetData';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useUserPropertiesWithUnits, getUnitOptionsFromProperties, getPropertyIdsFromUnitIds } from '@/hooks/useUserPropertiesWithUnits';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/reportUtils';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { DataCompletenessIndicator } from '@/components/reporting/DataCompletenessIndicator';
import { DataSourceLabel } from '@/components/reporting/DataSourceLabel';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { MultiSelect } from '@/components/ui/multi-select';
import { AsOfDatePicker } from '@/components/ui/as-of-date-picker';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import LandlordPropertyDetailsModal from '@/components/LandlordPropertyDetailsModal';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface BalanceSheetReportProps {
  onBack?: () => void;
  portfolioId?: string;
}

export const BalanceSheetReport: React.FC<BalanceSheetReportProps> = ({ onBack, portfolioId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id || '');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(
    portfolioId && portfolioId !== 'everything' ? portfolioId : 'everything'
  );
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [accountingBasis, setAccountingBasis] = useState<'cash' | 'accrual'>('accrual');
  const [saveAsCustom, setSaveAsCustom] = useState<boolean>(false);
  const [selectedPropertyForFinancials, setSelectedPropertyForFinancials] = useState<any>(null);
  const [showPropertyFinancialsModal, setShowPropertyFinancialsModal] = useState(false);
  
  const [runParams, setRunParams] = useState<null | {
    portfolioId?: string;
    propertyIds?: string[];
    asOfDate: string;
    accountingBasis: 'cash' | 'accrual';
  }>(null);

  // Reset selected properties when portfolio changes and force cache invalidation
  React.useEffect(() => {
    console.log('🔍 [BS_REPORT] Portfolio changed effect triggered:', {
      selectedPortfolio,
      userId: user?.id
    });
    setSelectedProperties([]);
    
    // Force invalidate relevant queries when portfolio changes
    if (user?.id) {
      console.log('🔍 [BS_REPORT] Invalidating relevant queries for portfolio change...');
      queryClient.invalidateQueries({ 
        queryKey: ['user-properties-with-units', user.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['balanceSheet'] 
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
      console.log('🔍 [BS_REPORT] Forcing properties refetch due to portfolio change');
      refetchProperties();
    }
  }, [selectedPortfolio, user?.id, refetchProperties]);

  // Debug property loading
  React.useEffect(() => {
    console.log('🔍 [BS_REPORT] Properties effect triggered - Properties loaded:', {
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
    console.log('🔍 [BS_REPORT] Computing property options from properties:', {
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
      console.log('🚨 [BS_REPORT] No properties available for options generation');
      return [];
    }
    
    const options = getUnitOptionsFromProperties(properties);
    console.log('🔍 [BS_REPORT] Generated property options:', {
      optionsCount: options.length,
      sampleOptions: options.slice(0, 3),
      allOptions: options
    });
    return options;
  }, [properties, selectedPortfolio, propertiesLoading, propertiesError]);


  // Note: Removed auto-initialization to prevent reports from running automatically
  // Reports will only run when the "Run Report" button is clicked

  const { data: balanceSheetData, isLoading, error, refetch } = useBalanceSheetData({
    userId: user?.id || '',
    portfolioId: runParams?.portfolioId,
    propertyIds: runParams?.propertyIds,
    asOfDate: runParams?.asOfDate || '',
    accountingBasis: runParams?.accountingBasis || 'accrual',
    enabled: !!runParams
  });

  // Debug balance sheet data loading
  React.useEffect(() => {
    console.log('🔍 [BS_REPORT] Balance sheet data state changed:', {
      runParams,
      isLoading,
      error,
      hasData: !!balanceSheetData,
      propertiesCount: balanceSheetData?.properties?.length || 0,
      summaryTotal: balanceSheetData?.summary?.totalAssets || 0
    });
  }, [runParams, isLoading, error, balanceSheetData]);

  const handleRunReport = () => {
    const effectiveDate = asOfDate;
    const propertyIds = selectedProperties.length > 0
      ? getPropertyIdsFromUnitIds(properties, selectedProperties)
      : undefined;

    console.log('🔍 [BS_REPORT] handleRunReport called with:', {
      selectedPortfolio,
      selectedProperties: selectedProperties.length,
      propertyIds,
      asOfDate: effectiveDate.toISOString().split('T')[0],
      accountingBasis,
      availableProperties: properties?.length || 0
    });

    const newRunParams = {
      portfolioId: selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
      propertyIds,
      asOfDate: effectiveDate.toISOString().split('T')[0],
      accountingBasis
    };

    console.log('🔍 [BS_REPORT] Setting new runParams:', newRunParams);
    setRunParams(newRunParams);
    
    console.log('🔍 [BS_REPORT] Triggering refetch...');
    refetch();
    if (saveAsCustom) {
      toast.success('Report saved as custom report');
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Balance Sheet', 20, 30);
      doc.setFontSize(12);
      doc.text(`As of: ${format(new Date(runParams?.asOfDate || new Date()), 'MM/dd/yyyy')}`, 20, 45);
      doc.text(`Accounting Basis: ${accountingBasis.charAt(0).toUpperCase() + accountingBasis.slice(1)}`, 20, 55);
      
      let yPosition = 75;
      
      balanceSheetData?.properties?.forEach((property) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }
        
        doc.setFontSize(14);
        doc.text(property.propertyAddress, 20, yPosition);
        yPosition += 15;
        
        // Assets
        doc.setFontSize(12);
        doc.text('ASSETS', 20, yPosition);
        yPosition += 10;
        
        property.assets.forEach((asset) => {
          const indent = asset.level * 10;
          doc.setFontSize(asset.isTotal ? 11 : 10);
          doc.text(asset.name, 20 + indent, yPosition);
          doc.text(`$${asset.amount.toFixed(2)}`, 150, yPosition);
          yPosition += 8;
        });
        
        yPosition += 10;
      });
      
      doc.save(`balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF export completed');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      let csvContent = 'Balance Sheet\n';
      csvContent += `As of: ${format(new Date(runParams?.asOfDate || new Date()), 'MM/dd/yyyy')}\n`;
      csvContent += `Accounting Basis: ${accountingBasis.charAt(0).toUpperCase() + accountingBasis.slice(1)}\n\n`;
      
      balanceSheetData?.properties?.forEach((property) => {
        csvContent += `${property.propertyAddress}\n`;
        csvContent += 'ASSETS\n';
        
        property.assets.forEach((asset) => {
          const indent = '  '.repeat(asset.level - 1);
          csvContent += `${indent}${asset.name},$${asset.amount.toFixed(2)}\n`;
        });
        
        csvContent += '\nLIABILITIES\n';
        property.liabilities.forEach((liability) => {
          const indent = '  '.repeat(liability.level - 1);
          csvContent += `${indent}${liability.name},$${liability.amount.toFixed(2)}\n`;
        });
        
        csvContent += '\nEQUITY\n';
        property.equity.forEach((equity) => {
          const indent = '  '.repeat(equity.level - 1);
          csvContent += `${indent}${equity.name},$${equity.amount.toFixed(2)}\n`;
        });
        
        csvContent += `\nTotal Assets,$${property.totalAssets.toFixed(2)}\n`;
        csvContent += `Total Liabilities & Equity,$${(property.totalLiabilities + property.totalEquity).toFixed(2)}\n\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Excel export completed');
    } catch (error) {
    toast.error('Failed to export Excel');
  }
};

const handleImproveData = (propertyId: string) => {
  // Find the property and open financial modal directly
  const property = properties.find(p => p.id === propertyId);
  if (property) {
    setSelectedPropertyForFinancials(property);
    setShowPropertyFinancialsModal(true);
  }
};

const handleClosePropertyModal = () => {
  setShowPropertyFinancialsModal(false);
  setSelectedPropertyForFinancials(null);
  // Refresh balance sheet data after potential changes
  if (runParams) {
    refetch();
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
          <h1 className="text-3xl font-bold gradient-text">Balance Sheet</h1>
          <p className="text-muted-foreground">
            View financial position and net worth across your properties
          </p>
        </div>
        <div className="flex gap-2">
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

      {/* Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Top row filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">As of Date</label>
                <AsOfDatePicker
                  value={asOfDate}
                  onChange={setAsOfDate}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio</label>
                <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everything">Everything</SelectItem>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.client_name || portfolio.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Accounting Basis</label>
                <RadioGroup value={accountingBasis} onValueChange={(value: 'cash' | 'accrual') => setAccountingBasis(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="accrual" id="accrual" />
                    <Label htmlFor="accrual">Accrual</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">Cash</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Property filter and actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Properties (Optional)</label>
                <MultiSelect
                  options={propertyOptions}
                  selected={selectedProperties}
                  onChange={setSelectedProperties}
                  placeholder="Select specific properties"
                  className="w-full"
                />
              </div>
              
              <div className="flex flex-col justify-end space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="save-custom" 
                    checked={saveAsCustom}
                    onCheckedChange={(checked) => setSaveAsCustom(checked === true)}
                  />
                  <Label htmlFor="save-custom" className="text-sm">Save as custom report</Label>
                </div>
                <Button onClick={handleRunReport} className="w-full">
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
            { table: 'transactions', description: 'Financial transactions and accounting entries' },
            { table: 'chart_of_accounts', description: 'Account classifications and types' },
            { table: 'properties', description: 'Property details and ownership information' },
            { table: 'property_units', description: 'Unit-level financial data' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Account Classifications', description: 'Assets, Liabilities, and Equity accounts properly categorized in chart of accounts' },
              { field: 'Transaction History', description: 'Complete financial transaction records up to the as-of date' },
              { field: 'Beginning Balances', description: 'Starting balances for all accounts at the beginning of the period' }
            ],
            calculationSteps: [
              { step: 'Total Assets', formula: 'Sum of all asset account balances (cash, receivables, property value, etc.)' },
              { step: 'Total Liabilities', formula: 'Sum of all liability account balances (payables, mortgages, deposits, etc.)' },
              { step: 'Total Equity', formula: 'Sum of all equity account balances (owner equity, retained earnings, etc.)' },
              { step: 'Verification', formula: 'Total Assets must equal Total Liabilities + Total Equity' }
            ],
            note: 'Uses accrual or cash accounting basis. The balance sheet shows your financial position at a specific point in time.'
          }}
        />

      {/* Report Content */}
      {!runParams ? (
        <CardEnhanced>
          <CardEnhancedContent className="p-6">
            <div className="text-center py-12">
              <div className="mb-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Ready to Generate Balance Sheet</h3>
              <p className="text-muted-foreground mb-4">
                Configure your filters above and click "Run Report" to generate your balance sheet
              </p>
              <Button onClick={handleRunReport} className="px-6">
                <Play className="h-4 w-4 mr-2" />
                Run Report
              </Button>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      ) : error ? (
        <CardEnhanced>
          <CardEnhancedContent className="p-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Error loading balance sheet data: {error.message}</p>
              <Button onClick={handleRunReport} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      ) : balanceSheetData?.properties && balanceSheetData.properties.length > 0 ? (
        <CardEnhanced>
          <CardEnhancedContent className="p-6">
            <div className="space-y-6">
              {/* Summary Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-semibold">Balance Sheet</h2>
                <p className="text-muted-foreground">
                  As of {format(new Date(runParams?.asOfDate || new Date()), 'MMMM dd, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Accounting Basis: {accountingBasis.charAt(0).toUpperCase() + accountingBasis.slice(1)}
                </p>
              </div>

              {/* Data Quality Assessment */}
              {balanceSheetData?.dataQuality && balanceSheetData.dataQuality.length > 0 && (
                <div className="mb-6">
                  <DataCompletenessIndicator 
                    properties={balanceSheetData.dataQuality}
                    onImproveData={handleImproveData}
                  />
                </div>
              )}

              {/* Balance Sheet Table */}
              <div className="space-y-8">
                {balanceSheetData.properties.map((property) => (
                  <div key={property.propertyId} className="mb-8 last:mb-0">
                    {/* Property Header */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                      <h3 className="text-xl font-bold text-primary mb-2">
                        {property.propertyAddress}
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-2 bg-background/50 rounded">
                          <div className="text-muted-foreground">Total Assets</div>
                          <div className="font-semibold text-primary">{formatCurrency(property.totalAssets)}</div>
                        </div>
                        <div className="text-center p-2 bg-background/50 rounded">
                          <div className="text-muted-foreground">Total Liabilities</div>
                          <div className="font-semibold text-destructive">{formatCurrency(property.totalLiabilities)}</div>
                        </div>
                        <div className="text-center p-2 bg-background/50 rounded">
                          <div className="text-muted-foreground">Total Equity</div>
                          <div className="font-semibold text-success">{formatCurrency(property.totalEquity)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Balance Sheet Table for Property */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Assets Column */}
                      <div className="bg-card border rounded-lg p-4">
                        <h4 className="text-lg font-bold mb-4 text-primary border-b border-primary/20 pb-2">
                          ASSETS
                        </h4>
                        <div className="space-y-1">
                          {property.assets.map((asset) => (
                             <div key={asset.id} 
                               className={cn(
                                 "flex justify-between items-center py-2 px-1 rounded transition-colors",
                                 asset.isTotal && "bg-primary/5 border border-primary/10 font-semibold mt-2 mb-1",
                                 !asset.isTotal && "hover:bg-muted/30"
                               )}
                             >
                               <div className="flex-1">
                                 <span 
                                   className={cn(
                                     "text-sm",
                                     asset.level === 1 && asset.isTotal && "font-bold text-primary",
                                     asset.level === 1 && !asset.isTotal && "font-semibold",
                                     asset.level === 2 && "pl-4 text-muted-foreground",
                                     asset.level === 3 && "pl-8 text-muted-foreground"
                                   )}
                                 >
                                   {asset.name}
                                 </span>
                                 {asset.dataAssessment && (
                                   <div className="ml-2 mt-1">
                                     <DataSourceLabel 
                                       source={asset.dataAssessment.source}
                                       description={asset.dataAssessment.description}
                                       className="text-xs"
                                     />
                                   </div>
                                 )}
                               </div>
                               <span className={cn(
                                 "text-sm font-mono text-right ml-4",
                                 asset.isTotal && "font-bold",
                                 asset.amount < 0 && "text-destructive"
                               )}>
                                 {formatCurrency(asset.amount)}
                               </span>
                             </div>
                          ))}
                          <div className="border-t-2 border-primary/30 pt-2 mt-2">
                            <div className="flex justify-between items-center py-2 px-1 bg-primary/10 rounded font-bold">
                              <span className="text-primary">Total Assets</span>
                              <span className="font-mono text-primary">
                                {formatCurrency(property.totalAssets)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Liabilities Column */}
                      <div className="bg-card border rounded-lg p-4">
                        <h4 className="text-lg font-bold mb-4 text-primary border-b border-primary/20 pb-2">
                          LIABILITIES
                        </h4>
                        <div className="space-y-1">
                          {property.liabilities.map((liability) => (
                            <div key={liability.id} 
                              className={cn(
                                "flex justify-between items-center py-2 px-1 rounded transition-colors",
                                liability.isTotal && "bg-destructive/5 border border-destructive/10 font-semibold mt-2 mb-1",
                                !liability.isTotal && "hover:bg-muted/30"
                              )}
                            >
                              <span 
                                className={cn(
                                  "text-sm",
                                  liability.level === 1 && liability.isTotal && "font-bold text-destructive",
                                  liability.level === 1 && !liability.isTotal && "font-semibold",
                                  liability.level === 2 && "pl-4 text-muted-foreground",
                                  liability.level === 3 && "pl-8 text-muted-foreground"
                                )}
                              >
                                {liability.name}
                              </span>
                              <span className={cn(
                                "text-sm font-mono text-right",
                                liability.isTotal && "font-bold"
                              )}>
                                {formatCurrency(liability.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="border-t-2 border-destructive/30 pt-2 mt-2">
                            <div className="flex justify-between items-center py-2 px-1 bg-destructive/10 rounded font-bold">
                              <span className="text-destructive">Total Liabilities</span>
                              <span className="font-mono text-destructive">
                                {formatCurrency(property.totalLiabilities)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Equity Column */}
                      <div className="bg-card border rounded-lg p-4">
                        <h4 className="text-lg font-bold mb-4 text-primary border-b border-primary/20 pb-2">
                          EQUITY
                        </h4>
                        <div className="space-y-1">
                          {property.equity.map((equity) => (
                            <div key={equity.id} 
                              className="flex justify-between items-center py-2 px-1 rounded hover:bg-muted/30 transition-colors"
                            >
                              <span 
                                className={cn(
                                  "text-sm",
                                  equity.level === 1 && "font-semibold",
                                  equity.level === 2 && "pl-4 text-muted-foreground"
                                )}
                              >
                                {equity.name}
                              </span>
                              <span className="text-sm font-mono text-right">
                                {formatCurrency(equity.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="border-t-2 border-success/30 pt-2 mt-2">
                            <div className="flex justify-between items-center py-2 px-1 bg-success/10 rounded font-bold">
                              <span className="text-success">Total Equity</span>
                              <span className="font-mono text-success">
                                {formatCurrency(property.totalEquity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Balance Check */}
                    <div className="mt-4 p-3 rounded-lg border">
                      <div className={cn(
                        "flex justify-between items-center text-sm",
                        Math.abs(property.totalAssets - (property.totalLiabilities + property.totalEquity)) < 0.01 
                          ? "bg-success/5 border-success/20 text-success" 
                          : "bg-destructive/5 border-destructive/20 text-destructive"
                      )}>
                        <span className="font-medium">Balance Check:</span>
                        <span className="font-mono font-medium">
                          Assets ({formatCurrency(property.totalAssets)}) = 
                          Liabilities + Equity ({formatCurrency(property.totalLiabilities + property.totalEquity)})
                          {Math.abs(property.totalAssets - (property.totalLiabilities + property.totalEquity)) >= 0.01 && (
                            <span className="ml-2 text-destructive">
                              (Difference: {formatCurrency(property.totalAssets - (property.totalLiabilities + property.totalEquity))})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Portfolio Summary */}
                {balanceSheetData.properties.length > 1 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Portfolio Summary</h3>
                      <Table>
                        <TableBody>
                          <TableRow className="font-semibold">
                            <TableCell>Total Assets</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(balanceSheetData.summary.totalAssets)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="font-semibold">
                            <TableCell>Total Liabilities</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(balanceSheetData.summary.totalLiabilities)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="font-semibold">
                            <TableCell>Total Equity</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(balanceSheetData.summary.totalEquity)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="font-bold border-t-2 border-black">
                            <TableCell>Net Worth (Assets - Liabilities)</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(balanceSheetData.summary.totalAssets - balanceSheetData.summary.totalLiabilities)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                     </div>
                   </>
                 )}
               </div>
             </div>
           </CardEnhancedContent>
         </CardEnhanced>
      ) : (
         <CardEnhanced>
           <CardEnhancedContent className="p-6 text-center">
             <p className="text-muted-foreground">No balance sheet data available for the selected criteria.</p>
             <Button onClick={handleRunReport} className="mt-4">
               Re-run Report
             </Button>
           </CardEnhancedContent>
         </CardEnhanced>
       )}

       {/* Property Financial Details Modal */}
       {selectedPropertyForFinancials && (
         <LandlordPropertyDetailsModal
           property={selectedPropertyForFinancials}
           isOpen={showPropertyFinancialsModal}
           onClose={handleClosePropertyModal}
           onEdit={() => {}} // Not needed for this use case
           onViewApplications={() => {}} // Not needed for this use case  
           onViewMessages={() => {}} // Not needed for this use case
         />
       )}

     </div>
   );
 };