import React, { useState, useEffect } from 'react';
import { ChevronRight, Users, Download, Calendar, CalendarIcon, Play, Phone, Mail, Building2, ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { generateDelinquentTenantsCSV, generateDelinquentTenantsPDF } from '@/utils/delinquentTenantsExportUtils';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleDropdownSelect } from '@/components/ui/simple-dropdown-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getUnitOptionsFromAllProperties, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useDelinquentTenants, DelinquentTenant } from '@/hooks/useDelinquentTenants';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface CurrentDelinquentTenantsReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const CurrentDelinquentTenantsReport: React.FC<CurrentDelinquentTenantsReportProps> = ({
  onBack,
  portfolioId
}) => {
  const { user, loading: authLoading } = useAuth();
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
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date() // Today
  });
  const [selectedTenantStatus, setSelectedTenantStatus] = useState<string[]>(['future', 'active', 'past']);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [hasRunReport, setHasRunReport] = useState(false);

  // Fetch properties with units
  const { 
    data: properties, 
    isLoading: propertiesLoading, 
    error: propertiesError, 
    refetch: refetchProperties,
    isFetching: propertiesRefetching 
  } = useAllPropertiesWithUnits(
    user?.id,
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );

  const propertyOptions = getUnitOptionsFromAllProperties(properties || []);

  // Fetch delinquent tenants
  const { data: delinquentData, loading, error, fetchDelinquentTenants } = useDelinquentTenants();


  // Reset selected properties when portfolio changes
  useEffect(() => {
    setSelectedProperties([]);
    setSelectedUnitIds([]);
    if (user?.id && !propertiesLoading) {
      refetchProperties();
    }
  }, [selectedPortfolio, user?.id, refetchProperties, propertiesLoading]);

  const getDisplayName = () => {
    if (selectedPortfolio === 'everything') return 'Everything';
    const portfolio = portfolios.find(p => p.id === selectedPortfolio);
    return portfolio?.client_name || 'Select Portfolio';
  };

  const hasValidFilters = () => {
    // Allow if a specific portfolio is selected (not "everything")
    if (selectedPortfolio !== 'everything') return true;
    
    // Or if specific properties/units are selected
    if (selectedProperties.length > 0 || selectedUnitIds.length > 0) return true;
    
    return false;
  };

  const handleRunReport = () => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    // Validate filters before running report
    if (!hasValidFilters()) {
      toast.error("Please select specific properties, units, portfolio, or tenant status to run the delinquent tenants report.");
      return;
    }

    // Get final property IDs - if nothing selected explicitly, use undefined to query all
    const finalSelectedProperties = selectedUnitIds.length > 0 || selectedProperties.length > 0
      ? getPropertyIdsFromAllUnitIds(properties || [], selectedUnitIds.length > 0 ? selectedUnitIds : selectedProperties)
      : undefined; // undefined means "all properties" rather than empty array

    // Use the end date of the range, fallback to today if no range selected
    const reportDate = dateRange.to || new Date();
    
    const reportParams = {
      userId: user.id,
      portfolioId: selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
      propertyIds: finalSelectedProperties,
      reportDate: format(reportDate, 'yyyy-MM-dd'),
      tenantStatus: selectedTenantStatus,
      filters: {
        selectedPortfolio,
        selectedProperties,
        selectedUnitIds,
        dateRange,
        selectedTenantStatus,
        showPhone,
        showEmail
      },
      computed: {
        finalPropertiesCount: finalSelectedProperties?.length || 0,
        propertyOptionsCount: propertyOptions.length,
        availablePropertiesCount: properties?.length || 0
      }
    };

    
    setHasRunReport(true);
    
    fetchDelinquentTenants(
      selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
      finalSelectedProperties,
      format(reportDate, 'yyyy-MM-dd'),
      selectedTenantStatus
    );
  };

  // Group tenants by property for display
  const groupedTenants = React.useMemo(() => {
    const groups = new Map<string, DelinquentTenant[]>();
    
    delinquentData.tenants.forEach(tenant => {
      if (!groups.has(tenant.propertyAddress)) {
        groups.set(tenant.propertyAddress, []);
      }
      groups.get(tenant.propertyAddress)!.push(tenant);
    });
    
    return Array.from(groups.entries()).map(([propertyAddress, tenants]) => ({
      propertyAddress,
      tenants,
      totalBalance: tenants.reduce((sum, t) => sum + t.totalBalance, 0),
              aging0to30: tenants.reduce((sum, t) => sum + t.breakdown.current, 0),
              aging31to60: tenants.reduce((sum, t) => sum + t.breakdown.days30, 0),
              aging61to90: tenants.reduce((sum, t) => sum + t.breakdown.days60, 0),
              aging91plus: tenants.reduce((sum, t) => sum + t.breakdown.days90Plus, 0),
    }));
  }, [delinquentData.tenants]);

  const handleExportCSV = () => {
    if (!hasRunReport) {
      toast.error('Please run the report first.');
      return;
    }

    generateDelinquentTenantsCSV(
      delinquentData.tenants,
      {
        totalOutstanding: delinquentData.totalOutstanding,
        agingBreakdown: delinquentData.agingBreakdown
      },
      dateRange,
      showPhone,
      showEmail
    );
    
    const message = delinquentData.tenants.length === 0 
      ? 'CSV exported successfully (no data found)'
      : 'CSV exported successfully';
    toast.success(message);
  };

  const handleExportPDF = () => {
    if (!hasRunReport) {
      toast.error('Please run the report first.');
      return;
    }

    generateDelinquentTenantsPDF(
      delinquentData.tenants,
      {
        totalOutstanding: delinquentData.totalOutstanding,
        agingBreakdown: delinquentData.agingBreakdown
      },
      dateRange,
      showPhone,
      showEmail
    );
    
    const message = delinquentData.tenants.length === 0 
      ? 'PDF exported successfully (no data found)'
      : 'PDF exported successfully';
    toast.success(message);
  };

  const tenantStatusOptions = [
    { value: 'future', label: 'Future' },
    { value: 'active', label: 'Active' },
    { value: 'past', label: 'Past' }
  ];

  // Custom table rendering function for Details tab
  const renderDetailsTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading delinquent tenants...</p>
        </div>
      );
    }

    if (delinquentData.tenants.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="p-4 rounded-full bg-success/10 mx-auto w-fit">
              <Users className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No Delinquent Tenants</h3>
              <p className="text-muted-foreground">
                Great! No delinquent tenants found for the selected filters
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg border min-w-[800px]">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-sm">Unit</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Tenant</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Last Payment</th>
                <th className="text-right py-3 px-4 font-medium text-sm">Total</th>
                <th colSpan={4} className="text-center py-3 px-4 font-medium text-sm border-l">
                  Aged balances
                </th>
              </tr>
              <tr className="border-b bg-muted/50">
                <th className="w-20"></th>
                <th className="w-48"></th>
                <th className="w-32"></th>
                <th className="w-28"></th>
                <th className="text-right py-2 px-4 font-medium text-xs text-muted-foreground border-l w-24">0-30 Days</th>
                <th className="text-right py-2 px-4 font-medium text-xs text-muted-foreground w-24">31-60 Days</th>
                <th className="text-right py-2 px-4 font-medium text-xs text-muted-foreground w-24">61-90 Days</th>
                <th className="text-right py-2 px-4 font-medium text-xs text-muted-foreground w-24">91+ Days</th>
              </tr>
            </thead>
            <tbody>
              {groupedTenants.map((group, groupIndex) => (
                <React.Fragment key={group.propertyAddress}>
                  {/* Property Header Row */}
                  <tr className="bg-muted/30 font-bold border-b">
                    <td colSpan={8} className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {group.propertyAddress}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Tenant Rows */}
                  {group.tenants.map((tenant, tenantIndex) => (
                    <tr key={`${group.propertyAddress}-${tenant.unit}`} className="border-b hover:bg-muted/20">
                      <td className="py-2 px-8 text-sm">{tenant.unit}</td>
                      <td className="py-2 px-4 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium">{tenant.tenantName}</div>
                          {showPhone && tenant.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {tenant.phone}
                            </div>
                          )}
                          {showEmail && tenant.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {tenant.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {tenant.lastPayment ? format(new Date(tenant.lastPayment), 'MM/dd/yyyy') : 'Never'}
                      </td>
                      <td className="py-2 px-4 text-sm text-right font-medium text-destructive">
                        ${tenant.totalBalance.toFixed(2)}
                      </td>
                      <td className="py-2 px-4 text-sm text-right border-l">
                        {tenant.breakdown?.current > 0 ? `$${tenant.breakdown.current.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 px-4 text-sm text-right">
                        {tenant.breakdown?.days30 > 0 ? `$${tenant.breakdown.days30.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 px-4 text-sm text-right">
                        {tenant.breakdown?.days60 > 0 ? `$${tenant.breakdown.days60.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 px-4 text-sm text-right">
                        {tenant.breakdown?.days90Plus > 0 ? `$${tenant.breakdown.days90Plus.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Property Subtotal Row */}
                  <tr className="bg-muted/40 font-semibold border-b-2">
                    <td className="py-2 px-6 text-sm">Property Total</td>
                    <td className="py-2 px-4 text-sm">{group.tenants.length} tenant{group.tenants.length !== 1 ? 's' : ''}</td>
                    <td className="py-2 px-4 text-sm"></td>
                    <td className="py-2 px-4 text-sm text-right font-semibold text-destructive">${group.totalBalance.toFixed(2)}</td>
                    <td className="py-2 px-4 text-sm text-right border-l">
                      {group.aging0to30 > 0 ? `$${group.aging0to30.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-4 text-sm text-right">
                      {group.aging31to60 > 0 ? `$${group.aging31to60.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-4 text-sm text-right">
                      {group.aging61to90 > 0 ? `$${group.aging61to90.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-4 text-sm text-right">
                      {group.aging91plus > 0 ? `$${group.aging91plus.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              
              {/* Grand Total Row */}
              {groupedTenants.length > 1 && (
                <tr className="bg-muted/60 font-bold border-t-4 border-muted-foreground/20">
                  <td className="py-3 px-4 text-sm font-bold">Grand Total</td>
                  <td className="py-3 px-4 text-sm font-bold">{delinquentData.tenants.length} tenant{delinquentData.tenants.length !== 1 ? 's' : ''}</td>
                  <td className="py-3 px-4 text-sm"></td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-destructive">${delinquentData.totalOutstanding.toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm text-right border-l font-bold">
                    {delinquentData.agingBreakdown?.current > 0 ? `$${delinquentData.agingBreakdown.current.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold">
                    {delinquentData.agingBreakdown?.days30 > 0 ? `$${delinquentData.agingBreakdown.days30.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold">
                    {delinquentData.agingBreakdown?.days60 > 0 ? `$${delinquentData.agingBreakdown.days60.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold">
                    {delinquentData.agingBreakdown?.days90Plus > 0 ? `$${delinquentData.agingBreakdown.days90Plus.toFixed(2)}` : '—'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Custom table rendering function for Summary tab
  const renderSummaryTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading delinquent tenants...</p>
        </div>
      );
    }

    if (groupedTenants.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="p-4 rounded-full bg-success/10 mx-auto w-fit">
              <Users className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No Delinquent Tenants</h3>
              <p className="text-muted-foreground">
                Great! No delinquent tenants found for the selected filters
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <div className="bg-white rounded-lg border min-w-[600px]">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-sm">Property</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Tenants</th>
                <th className="text-right py-3 px-4 font-medium text-sm">Total</th>
                <th colSpan={4} className="text-center py-3 px-4 font-medium text-sm border-l">
                  Aged balances
                </th>
              </tr>
              <tr className="border-b bg-muted/50">
                <th className="w-64"></th>
                <th className="w-24"></th>
                <th className="w-32"></th>
                <th className="text-right py-2 px-4 font-medium text-xs text-muted-foreground border-l w-24">0-30 Days</th>
                <th className="text-right py-2 px-4 font-medium text-xs text-muted-foreground w-24">31-60 Days</th>
                <th className="text-right py-2 px-4 font-medium text-xs text-muted-foreground w-24">61-90 Days</th>
                <th className="text-left py-2 px-4 font-medium text-xs text-muted-foreground">91+ Days</th>
              </tr>
            </thead>
            <tbody>
              {groupedTenants.map((group, index) => (
                <tr key={group.propertyAddress} className="border-b hover:bg-muted/20">
                  <td className="py-3 px-4 text-sm font-medium">{group.propertyAddress}</td>
                  <td className="py-3 px-4 text-sm">{group.tenants.length}</td>
                  <td className="py-3 px-4 text-sm font-medium text-destructive">${group.totalBalance.toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm border-l">
                    {group.aging0to30 > 0 ? `$${group.aging0to30.toFixed(2)}` : ''}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {group.aging31to60 > 0 ? `$${group.aging31to60.toFixed(2)}` : ''}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {group.aging61to90 > 0 ? `$${group.aging61to90.toFixed(2)}` : ''}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {group.aging91plus > 0 ? `$${group.aging91plus.toFixed(2)}` : ''}
                  </td>
                </tr>
              ))}
              
              {/* Grand Total Row */}
              {groupedTenants.length > 1 && (
                <tr className="bg-muted font-bold border-t-2">
                  <td className="py-3 px-4 text-sm">Grand Total</td>
                  <td className="py-3 px-4 text-sm">{delinquentData.tenants.length}</td>
                  <td className="py-3 px-4 text-sm text-destructive">${delinquentData.totalOutstanding.toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm border-l">
                    {delinquentData.agingBreakdown?.current > 0 ? `$${delinquentData.agingBreakdown.current.toFixed(2)}` : ''}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {delinquentData.agingBreakdown?.days30 > 0 ? `$${delinquentData.agingBreakdown.days30.toFixed(2)}` : ''}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {delinquentData.agingBreakdown?.days60 > 0 ? `$${delinquentData.agingBreakdown.days60.toFixed(2)}` : ''}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {delinquentData.agingBreakdown?.days90Plus > 0 ? `$${delinquentData.agingBreakdown.days90Plus.toFixed(2)}` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Current Delinquent Tenants Report</h1>
          <p className="text-muted-foreground">View tenants with outstanding balances and aging breakdowns</p>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Filters & Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Top row: Portfolio and Properties */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Portfolio Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Portfolio:</label>
              <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
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

            {/* Properties & Units Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Properties & Units:</label>
              {authLoading ? (
                <div className="p-2 text-sm text-muted-foreground border rounded-md">Loading...</div>
              ) : !user?.id ? (
                <div className="p-2 text-sm text-muted-foreground border rounded-md">Auth required</div>
              ) : propertiesLoading || propertiesRefetching ? (
                <div className="p-2 text-sm text-muted-foreground border rounded-md">Loading properties...</div>
              ) : (
                <HierarchicalPropertySelector
                  properties={properties || []}
                  selectedPropertyIds={selectedProperties}
                  selectedUnitIds={selectedUnitIds}
                  onSelectionChange={(propertyIds, unitIds) => {
                    setSelectedProperties(propertyIds);
                    setSelectedUnitIds(unitIds);
                  }}
                />
              )}
            </div>
          </div>

          {/* Second row: Date Range and Tenant Status */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Date Range:
              </label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-full"
              />
            </div>

            {/* Tenant Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant Status</label>
              <SimpleDropdownSelect
                options={tenantStatusOptions}
                selected={selectedTenantStatus}
                onChange={setSelectedTenantStatus}
                placeholder="Select tenant status"
                allLabel="All Status"
                showSearch={false}
              />
            </div>
          </div>

          {/* Bottom row: Tenant Details */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Tenant Details:</label>
            <div className="flex flex-row space-x-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-phone"
                  checked={showPhone}
                  onCheckedChange={(checked) => setShowPhone(!!checked)}
                />
                <label htmlFor="show-phone" className="text-sm">Phone #</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-email"
                  checked={showEmail}
                  onCheckedChange={(checked) => setShowEmail(!!checked)}
                />
                <label htmlFor="show-email" className="text-sm">Email</label>
              </div>
            </div>
          </div>

          {/* Separator and Action Buttons */}
          <div className="border-t pt-4">
            <div className="flex justify-end gap-2">
              <Button 
                onClick={handleRunReport} 
                disabled={
                  loading || 
                  authLoading || 
                  !user?.id ||
                  propertiesLoading || 
                  propertiesRefetching ||
                  propertyOptions.length === 0
                }
                size="sm"
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    Running...
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
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleExportCSV} size="sm" variant="outline" disabled={!hasRunReport || loading}>
          <FileText className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button onClick={handleExportPDF} size="sm" variant="outline" disabled={!hasRunReport || loading}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'rent_payments', description: 'Payment history and outstanding balances' },
            { table: 'properties', description: 'Property details and rent amounts' },
            { table: 'property_units', description: 'Unit-level assignments and rent' },
            { table: 'leases', description: 'Lease agreements and tenant information' },
            { table: 'tenants', description: 'Tenant contact details' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Payment History', description: 'Complete record of all rent payments with dates' },
              { field: 'Expected Rent', description: 'Monthly rent amount from lease agreements' },
              { field: 'Payment Due Dates', description: 'When rent payments were/are due' }
            ],
            calculationSteps: [
              { step: 'Amount Owed', formula: 'Total rent due through the report period' },
              { step: 'Amount Paid', formula: 'Sum of all rent payments received' },
              { step: 'Balance Due', formula: 'Amount Owed - Amount Paid' },
              { step: 'Days Delinquent', formula: 'Current Date - Oldest unpaid due date' }
            ],
            note: 'Shows only tenants with outstanding balances greater than $0. Filter by days delinquent to focus on seriously overdue accounts.'
          }}
        />

      {/* Report Content with Tabs */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            {renderDetailsTable()}
          </TabsContent>
          
          <TabsContent value="summary" className="mt-4">
            {renderSummaryTable()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};