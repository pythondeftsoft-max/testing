import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FileText, FileSpreadsheet, Play, Building, Calendar, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getUnitOptionsFromAllProperties, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useRentalOwnerStatement, RentalOwnerStatementParams } from '@/hooks/useRentalOwnerStatement';
import { formatCurrency } from '@/utils/reportUtils';
import { format, startOfYear } from 'date-fns';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateRentalOwnerStatementCSV, generateRentalOwnerStatementPDF } from '@/utils/rentalOwnerStatementExportUtils';
import type { DateRange } from 'react-day-picker';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface RentalOwnerStatementReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const RentalOwnerStatementReport: React.FC<RentalOwnerStatementReportProps> = ({
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
  
  const [includeIncomeStatement, setIncludeIncomeStatement] = useState(true);
  const [includeTransactionDetails, setIncludeTransactionDetails] = useState(true);
  const [displayTransactionsBy, setDisplayTransactionsBy] = useState<'date' | 'additions_subtractions'>('date');
  const [reportParams, setReportParams] = useState<RentalOwnerStatementParams | undefined>();
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
  const { data: statementData, isLoading, error } = useRentalOwnerStatement(reportParams);

  // Enhanced validation with loading state checks and specific messages
  const validateFilters = () => {
    const validationResult = {
      isValid: true,
      errors: [] as string[],
      isDataLoading: false
    };
    
    // Check if critical data is still loading
    if (propertiesLoading || portfoliosLoading) {
      validationResult.isDataLoading = true;
      validationResult.isValid = false;
      if (propertiesLoading) validationResult.errors.push('Properties are still loading...');
      if (portfoliosLoading) validationResult.errors.push('Portfolios are still loading...');
      return validationResult;
    }
    
    // Check for data loading errors
    if (propertiesError) {
      validationResult.isValid = false;
      validationResult.errors.push('Error loading properties. Please retry.');
      return validationResult;
    }
    
    // Check user authentication
    if (!user?.id) {
      validationResult.isValid = false;
      validationResult.errors.push('User authentication required');
      return validationResult;
    }
    
    // Check date range
    if (!dateRange?.from || !dateRange?.to) {
      validationResult.isValid = false;
      validationResult.errors.push('Please select a date range');
      return validationResult;
    }
    
    // Check property selection - must have properties available and valid selection
    if (!allProperties || allProperties.length === 0) {
      validationResult.isValid = false;
      validationResult.errors.push('No properties available for the selected portfolio');
      return validationResult;
    }
    
    const hasValidPropertySelection = 
      isAllPropertiesMode || 
      selectedUnitIds.length > 0 || 
      selectedProperties.length > 0 ||
      (selectedPortfolio === 'everything' && allProperties.length > 0);
    
    if (!hasValidPropertySelection) {
      validationResult.isValid = false;
      validationResult.errors.push('Please select properties or enable "All Properties" mode');
      return validationResult;
    }
    
    return validationResult;
  };

  // Compute button disabled state and validation status
  const validation = validateFilters();
  const isButtonDisabled = isLoading || !validation.isValid;

  const handleRunReport = () => {
    const validation = validateFilters();
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.length === 1 
        ? validation.errors[0]
        : `Please fix the following issues:\n• ${validation.errors.join('\n• ')}`;
      
      toast.error(`Cannot Run Report\n\n${errorMessage}`, {
        duration: 5000
      });
      return;
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select a valid date range');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    const propertyIds = selectedUnitIds.length > 0 
      ? getPropertyIdsFromAllUnitIds(allProperties, selectedUnitIds)
      : selectedProperties.length > 0 
        ? selectedProperties
        : undefined;

    const params: RentalOwnerStatementParams = {
      propertyIds: propertyIds && propertyIds.length > 0 ? propertyIds : undefined,
      portfolioId: selectedPortfolio === 'everything' ? 'all' : selectedPortfolio,
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
      includeIncomeStatement,
      includeTransactionDetails,
      displayTransactionsBy
    };

    setReportParams(params);
  };

  const handleExportCSV = () => {
    if (!reportParams) {
      toast.error('Please run the report first');
      return;
    }
    
    if (!statementData) return;

    const exportData = statementData.summary_by_property.map(property => ({
      property_address: property.property_address,
      owner_name: property.owner_name,
      beginning_balance: property.beginning_balance,
      additions_to_cash: property.additions_to_cash,
      subtractions_from_cash: property.subtractions_from_cash,
      ending_balance: property.ending_balance,
      adjustments: property.adjustments,
      available_for_payment: property.available_for_payment,
      date_range: getDateRangeLabel()
    }));

    const summary = {
      total_properties: statementData.summary_by_property.length,
      total_beginning_balance: statementData.summary_by_property.reduce((sum, p) => sum + p.beginning_balance, 0),
      total_additions: statementData.summary_by_property.reduce((sum, p) => sum + p.additions_to_cash, 0),
      total_subtractions: statementData.summary_by_property.reduce((sum, p) => sum + p.subtractions_from_cash, 0),
      total_ending_balance: statementData.summary_by_property.reduce((sum, p) => sum + p.ending_balance, 0),
      total_adjustments: statementData.summary_by_property.reduce((sum, p) => sum + p.adjustments, 0),
      total_available_for_payment: statementData.summary_by_property.reduce((sum, p) => sum + p.available_for_payment, 0),
      generation_date: getDateRangeLabel()
    };

    generateRentalOwnerStatementCSV(exportData, summary, reportMessage);
    toast.success('CSV report exported successfully');
  };

  const handleExportPDF = () => {
    if (!reportParams) {
      toast.error('Please run the report first');
      return;
    }
    
    if (!statementData) return;

    const exportData = statementData.summary_by_property.map(property => ({
      property_address: property.property_address,
      owner_name: property.owner_name,
      beginning_balance: property.beginning_balance,
      additions_to_cash: property.additions_to_cash,
      subtractions_from_cash: property.subtractions_from_cash,
      ending_balance: property.ending_balance,
      adjustments: property.adjustments,
      available_for_payment: property.available_for_payment,
      date_range: getDateRangeLabel()
    }));

    const summary = {
      total_properties: statementData.summary_by_property.length,
      total_beginning_balance: statementData.summary_by_property.reduce((sum, p) => sum + p.beginning_balance, 0),
      total_additions: statementData.summary_by_property.reduce((sum, p) => sum + p.additions_to_cash, 0),
      total_subtractions: statementData.summary_by_property.reduce((sum, p) => sum + p.subtractions_from_cash, 0),
      total_ending_balance: statementData.summary_by_property.reduce((sum, p) => sum + p.ending_balance, 0),
      total_adjustments: statementData.summary_by_property.reduce((sum, p) => sum + p.adjustments, 0),
      total_available_for_payment: statementData.summary_by_property.reduce((sum, p) => sum + p.available_for_payment, 0),
      generation_date: getDateRangeLabel()
    };

    generateRentalOwnerStatementPDF(exportData, summary, reportMessage);
    toast.success('PDF report generated successfully');
  };

  const getDateRangeLabel = () => {
    if (!dateRange?.from || !dateRange?.to) return 'No Date Range';
    
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
            <h1 className="text-2xl font-bold gradient-text">Rental Owner Statement</h1>
            <p className="text-muted-foreground">Comprehensive owner statement with cash flow during a specified time frame</p>
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
            <FileSpreadsheet className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Two-column layout for main filters */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Portfolio and Date Range */}
              <div className="space-y-6">
                {/* Portfolio Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">
                      Portfolio
                      <span className="text-destructive ml-1">*</span>
                    </Label>
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

                {/* Date Range Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">
                      Date Range
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                  </div>
                   <DateRangePicker 
                     value={dateRange}
                     onChange={setDateRange}
                     className="w-full"
                   />
                </div>
              </div>

              {/* Right Column - Properties and Accounting Basis */}
              <div className="space-y-6">
                {/* Properties Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">
                      Properties
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                  </div>
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
                        isAllPropertiesMode={isAllPropertiesMode}
                        placeholder={`Select properties/units (${allProperties.length} available)`}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>

                {/* DISPLAY TRANSACTIONS BY Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">DISPLAY TRANSACTIONS BY</Label>
                  <RadioGroup 
                    value={displayTransactionsBy} 
                    onValueChange={(value: 'date' | 'additions_subtractions') => setDisplayTransactionsBy(value)}
                    className="flex flex-row space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="date" id="date" />
                      <Label htmlFor="date" className="text-sm font-normal">Date</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="additions_subtractions" id="additions_subtractions" />
                      <Label htmlFor="additions_subtractions" className="text-sm font-normal">Additions and subtractions</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* INCLUDE Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">INCLUDE</Label>
              <div className="flex flex-row space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeIncomeStatement"
                    checked={includeIncomeStatement}
                    onCheckedChange={(checked) => setIncludeIncomeStatement(checked === true)}
                  />
                  <Label htmlFor="includeIncomeStatement" className="text-sm font-normal">Income statement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeTransactionDetails"
                    checked={includeTransactionDetails}
                    onCheckedChange={(checked) => setIncludeTransactionDetails(checked === true)}
                  />
                  <Label htmlFor="includeTransactionDetails" className="text-sm font-normal">Transaction details</Label>
                </div>
              </div>
            </div>

            {/* Bottom Section - Report Message */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Report Message (Optional)</Label>
              <Input
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Add a message to be included in the report..."
                className="w-full"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {reportParams && !isLoading && statementData && statementData.summary_by_property.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportPDF}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Export PDF
                    </Button>
                  </>
                )}
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleRunReport} 
                  disabled={isButtonDisabled}
                  className={`w-full sm:w-auto font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                    isButtonDisabled 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                      Generating...
                    </>
                  ) : validation.isDataLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Report
                    </>
                  )}
                </Button>
                {!validation.isValid && !validation.isDataLoading && (
                  <p className="text-xs text-destructive">
                    {validation.errors[0]}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'properties', description: 'Property ownership and financial data' },
            { table: 'property_units', description: 'Unit-level rent and tenant assignments' },
            { table: 'rent_payments', description: 'Payment transactions and dates' },
            { table: 'expense_tracking', description: 'Property expenses and disbursements' },
            { table: 'transactions', description: 'All financial transactions by account' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Income Records', description: 'Rent collected and other income for owner properties' },
              { field: 'Expense Records', description: 'All expenses paid on behalf of the property' },
              { field: 'Owner Information', description: 'Property ownership and disbursement preferences' }
            ],
            calculationSteps: [
              { step: 'Total Income', formula: 'Rent + fees + other income collected' },
              { step: 'Total Expenses', formula: 'Sum of all property expenses' },
              { step: 'Net Income', formula: 'Total Income - Total Expenses' },
              { step: 'Owner Distribution', formula: 'Net Income - Management Fees' }
            ],
            note: 'Shows financial performance for properties owned by rental property investors. Used for owner reporting and disbursements.'
          }}
        />

      {/* Loading State */}
      {isLoading && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-lg">Loading rental owner statement...</span>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* Error State */}
      {error && (
        <CardEnhanced>
          <CardEnhancedContent className="p-8">
            <div className="text-center text-destructive">
              <p className="text-lg">Error loading rental owner statement</p>
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
      {!reportParams && !isLoading && (
        <CardEnhanced>
          <CardEnhancedContent className="p-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">Rental Owner Statement Report</p>
              <p className="text-sm mt-2">Select your filters and click "Run Report" to generate the rental owner statement.</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      {/* No Data Found After Running Report */}
      {reportParams && !isLoading && (!statementData || statementData.summary_by_property.length === 0) && (
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
      {reportParams && !isLoading && statementData && statementData.summary_by_property.length > 0 && (
        <div className="space-y-6">
          {/* Report Header */}
          <CardEnhanced>
            <CardEnhancedHeader>
              <CardEnhancedTitle className="text-xl font-bold gradient-text">
                Rental Owner Statement - {getDateRangeLabel()}
              </CardEnhancedTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {statementData.summary_by_property.length} properties included
                </span>
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
                        : 'Property Management Company')
                    )}
                  </h2>
                   <p className="text-sm text-muted-foreground mt-1">Rental Owner Statement</p>
                  <p className="text-sm text-muted-foreground">
                    For the period: {getDateRangeLabel()}
                  </p>
                  {userProfile && userProfile.phone && (
                    <p className="text-sm text-muted-foreground">
                      Phone: {userProfile.phone}
                    </p>
                  )}
                </div>
                
                {reportMessage && (
                  <div className="mt-4 p-3 bg-muted/20 rounded-md">
                    <p className="text-sm text-muted-foreground italic">
                      {reportMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Summary by Property */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Summary by Property</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Property</th>
                        <th className="text-left p-2 font-medium">Owner</th>
                        <th className="text-right p-2 font-medium">Beginning Balance</th>
                        <th className="text-right p-2 font-medium">+ Additions to cash</th>
                        <th className="text-right p-2 font-medium">- Subtractions from cash</th>
                        <th className="text-right p-2 font-medium">Ending Balance</th>
                        <th className="text-right p-2 font-medium">- Adjustments</th>
                        <th className="text-right p-2 font-medium">Available for Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.summary_by_property.map((property, index) => (
                        <tr key={property.property_id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                          <td className="p-2">{property.property_address}</td>
                          <td className="p-2">{property.owner_name}</td>
                          <td className="p-2 text-right">{formatCurrency(property.beginning_balance)}</td>
                          <td className="p-2 text-right">{formatCurrency(property.additions_to_cash)}</td>
                          <td className="p-2 text-right">{formatCurrency(property.subtractions_from_cash)}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(property.ending_balance)}</td>
                          <td className="p-2 text-right">{formatCurrency(property.adjustments)}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(property.available_for_payment)}</td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="border-t-2 bg-primary/10 font-semibold">
                        <td className="p-2" colSpan={2}>TOTALS</td>
                        <td className="p-2 text-right">{formatCurrency(statementData.totals.total_beginning_balance)}</td>
                        <td className="p-2 text-right">{formatCurrency(statementData.totals.total_additions)}</td>
                        <td className="p-2 text-right">{formatCurrency(statementData.totals.total_subtractions)}</td>
                        <td className="p-2 text-right">{formatCurrency(statementData.totals.total_ending_balance)}</td>
                        <td className="p-2 text-right">{formatCurrency(statementData.totals.total_adjustments)}</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(statementData.totals.total_available_for_payment)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardEnhancedContent>
          </CardEnhanced>

          {/* Income Statement */}
          {includeIncomeStatement && statementData && statementData.income_statement && (
            <CardEnhanced>
              <CardEnhancedHeader>
                <CardEnhancedTitle>Income Statement</CardEnhancedTitle>
              </CardEnhancedHeader>
              <CardEnhancedContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-3">Income</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Rent Income</span>
                        <span>{formatCurrency(statementData.income_statement.total_rent_income)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Late Fees</span>
                        <span>{formatCurrency(statementData.income_statement.total_late_fees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Income</span>
                        <span>{formatCurrency(statementData.income_statement.total_other_income)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Income</span>
                        <span>{formatCurrency(statementData.income_statement.total_income)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Expenses</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Repairs & Maintenance</span>
                        <span>{formatCurrency(statementData.income_statement.total_repairs_maintenance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Management Fees</span>
                        <span>{formatCurrency(statementData.income_statement.total_management_fees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Expenses</span>
                        <span>{formatCurrency(statementData.income_statement.total_other_expenses)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Expenses</span>
                        <span>{formatCurrency(statementData.income_statement.total_expenses)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Income</span>
                    <span className={statementData.income_statement.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(statementData.income_statement.net_income)}
                    </span>
                  </div>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          )}

          {/* Detail Transactions */}
          {includeTransactionDetails && statementData && statementData.detail_transactions && statementData.detail_transactions.length > 0 && (
            <CardEnhanced>
              <CardEnhancedHeader>
                <CardEnhancedTitle>Detail Transactions</CardEnhancedTitle>
              </CardEnhancedHeader>
              <CardEnhancedContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Property</th>
                        <th className="text-left p-2 font-medium">Unit</th>
                        <th className="text-left p-2 font-medium">Account</th>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Memo</th>
                        {displayTransactionsBy === 'date' ? (
                          <>
                            <th className="text-right p-2 font-medium">Additions to cash</th>
                            <th className="text-right p-2 font-medium">Subtractions from cash</th>
                          </>
                        ) : (
                          <th className="text-right p-2 font-medium">Amount</th>
                        )}
                        <th className="text-right p-2 font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.detail_transactions.map((transaction, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                          <td className="p-2">{format(new Date(transaction.transaction_date), 'MM/dd/yyyy')}</td>
                          <td className="p-2">{transaction.property_address}</td>
                          <td className="p-2">{transaction.unit_number || ''}</td>
                          <td className="p-2">{transaction.account_name}</td>
                          <td className="p-2">{transaction.transaction_name}</td>
                          <td className="p-2">{transaction.memo || ''}</td>
                          {displayTransactionsBy === 'date' ? (
                            <>
                              <td className="p-2 text-right">
                                {transaction.additions_to_cash > 0 ? formatCurrency(transaction.additions_to_cash) : ''}
                              </td>
                              <td className="p-2 text-right">
                                {transaction.subtractions_from_cash > 0 ? formatCurrency(transaction.subtractions_from_cash) : ''}
                              </td>
                            </>
                          ) : (
                            <td className="p-2 text-right">
                              {transaction.additions_to_cash > 0 
                                ? `+${formatCurrency(transaction.additions_to_cash)}`
                                : transaction.subtractions_from_cash > 0
                                  ? `-${formatCurrency(transaction.subtractions_from_cash)}`
                                  : ''
                              }
                            </td>
                          )}
                          <td className="p-2 text-right font-medium">{formatCurrency(transaction.running_balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardEnhancedContent>
            </CardEnhanced>
          )}
        </div>
      )}
    </div>
  );
};