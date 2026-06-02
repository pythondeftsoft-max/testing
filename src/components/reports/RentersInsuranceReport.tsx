import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileText, Shield } from 'lucide-react';
import { useRentersInsuranceData } from '@/hooks/useRentersInsuranceData';
import { useAllPropertiesWithUnits } from '@/hooks/useAllPropertiesWithUnits';
import { PortfolioReportFilters } from '@/components/ui/standard-report-filters';
import { SimpleDropdownSelect } from '@/components/ui/simple-dropdown-select';
import { useStandardReportFilters } from '@/hooks/useStandardReportFilters';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { toast } from 'sonner';
import { generateRentersInsurancePDF } from '@/utils/rentersInsuranceExportUtils';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

interface RentersInsuranceReportProps {
  portfolioId?: string;
  onBack: () => void;
}

interface InsuranceRecord {
  id: string;
  property_address: string;
  unit_number?: string;
  tenant_name: string;
  provider_name: string;
  policy_number: string;
  policy_type: string;
  liability_coverage: number;
  personal_property_coverage: number;
  effective_date: string;
  expiration_date: string;
  premium_amount: number;
  is_active: boolean;
}

// Filter options for dropdown selectors
const policyTypeOptions = [
  { value: 'HO-4', label: 'HO-4 (Standard Renters)' },
  { value: 'MSI', label: 'MSI (Master Insurance)' },
  { value: 'Third-party', label: 'Third-party Coverage' },
  { value: 'Basic Liability', label: 'Basic Liability' },
  { value: 'Comprehensive Coverage', label: 'Comprehensive Coverage' },
];

const tenantStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const RentersInsuranceReport: React.FC<RentersInsuranceReportProps> = ({
  portfolioId: initialPortfolioId,
  onBack
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  // Custom filters with array-based selections to match checkbox style
  const [customFilters, setCustomFilters] = useState({
    policyTypes: [] as string[],
    tenantStatuses: [] as string[],
  });

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const {
    filters,
    queryFilters,
    isRunning,
    hasUserTriggeredRun,
    updateFilters,
    runReport,
    hasValidFilters
  } = useStandardReportFilters({
    initialPortfolioId: initialPortfolioId || 'everything',
    defaultDateRange: 'year',
    requireFilters: false
  });

  // Custom run report function with enhanced validation
  const handleRunReport = () => {
    runReport();
  };
  useEffect(() => {
    setCustomFilters({
      policyTypes: [],
      tenantStatuses: [],
    });
  }, [filters.portfolioId]);

  // Fix: Don't normalize portfolio ID for this report - pass 'everything' directly
  const currentPortfolioId = filters.portfolioId || 'everything';
  
  
  // Get available properties to compare against selections
  const { data: availableProperties = [] } = useAllPropertiesWithUnits(userId || '', currentPortfolioId);
  
  // Fix: Proper "All Properties" detection using proven pattern from other reports
  const isAllPropertiesSelected = () => {
    // If no queryFilters yet, assume all properties
    if (!queryFilters) return true;
    
    // If no specific properties/units are selected, treat as "all"
    const hasNoPropertySelection = queryFilters.propertyIds.length === 0 && queryFilters.unitIds.length === 0;
    if (hasNoPropertySelection) return true;
    
    // Compare selected count to available count (proven pattern from other reports)
    const totalSelectedProperties = queryFilters.propertyIds.length + queryFilters.unitIds.length;
    const totalAvailableProperties = availableProperties.length;
    
    
    return totalSelectedProperties >= totalAvailableProperties;
  };
  
  // Define all available filter options - must match the actual dropdown options
  const allPolicyTypes = ['HO-4', 'MSI', 'Third-party', 'Basic Liability', 'Comprehensive Coverage'];
  const allTenantStatuses = ['active', 'inactive'];
  
  // Helper functions to determine if all options are selected
  const isAllPolicyTypesSelected = () => {
    return customFilters.policyTypes.length === 0 || 
           (customFilters.policyTypes.length === allPolicyTypes.length && 
            allPolicyTypes.every(type => customFilters.policyTypes.includes(type)));
  };
  
  const isAllTenantStatusesSelected = () => {
    return customFilters.tenantStatuses.length === 0 || 
           (customFilters.tenantStatuses.length === allTenantStatuses.length && 
            allTenantStatuses.every(status => customFilters.tenantStatuses.includes(status)));
  };


  // Convert filters to the format expected by the hook using proven pattern from other reports
  const hookFilters = queryFilters ? {
    // Fix: Use undefined when all options selected (proven pattern from other reports)
    policyType: isAllPolicyTypesSelected() ? undefined : customFilters.policyTypes[0],
    tenantStatus: isAllTenantStatusesSelected() ? undefined : customFilters.tenantStatuses[0],
    // Fix: Pass undefined when all properties selected, or array of selected property IDs
    propertyIds: isAllPropertiesSelected() ? undefined : [...queryFilters.propertyIds, ...queryFilters.unitIds],
    // Set a very inclusive date range when no specific dates are provided
    expirationDateFrom: queryFilters.dateFrom || new Date('2020-01-01'),
    expirationDateTo: queryFilters.dateTo || new Date('2030-12-31'),
  } : null;

  
  // Allow the query to run when user has triggered it and filters are available
  const { data: insuranceData, isLoading, error } = useRentersInsuranceData(
    currentPortfolioId, 
    hookFilters, 
    { enabled: hasUserTriggeredRun && !!queryFilters }
  );


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPolicyTypeBadge = (type: string) => {
    switch (type) {
      case 'HO-4':
        return <Badge variant="default">HO-4</Badge>;
      case 'MSI':
        return <Badge variant="secondary">MSI</Badge>;
      case 'Third-party':
        return <Badge variant="outline">Third-party</Badge>;
      case 'Basic Liability':
        return <Badge variant="outline">Basic Liability</Badge>;
      case 'Comprehensive Coverage':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Comprehensive</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean, expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (!isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    
    if (expDate < today) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (daysUntilExpiration <= 30) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Expires Soon</Badge>;
    }
    
    return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
  };

  const columns: ColumnDef<InsuranceRecord>[] = [
    {
      accessorKey: 'property_address',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.property_address}</div>
          {row.original.unit_number && (
            <div className="text-sm text-muted-foreground">Unit {row.original.unit_number}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'tenant_name',
      header: 'Tenant',
    },
    {
      accessorKey: 'provider_name',
      header: 'Insurance Provider',
    },
    {
      accessorKey: 'policy_number',
      header: 'Policy Number',
    },
    {
      accessorKey: 'policy_type',
      header: 'Policy Type',
      cell: ({ row }) => getPolicyTypeBadge(row.original.policy_type),
    },
    {
      accessorKey: 'liability_coverage',
      header: 'Liability Coverage',
      cell: ({ row }) => formatCurrency(row.original.liability_coverage),
    },
    {
      accessorKey: 'personal_property_coverage',
      header: 'Personal Property',
      cell: ({ row }) => formatCurrency(row.original.personal_property_coverage),
    },
    {
      accessorKey: 'effective_date',
      header: 'Effective Date',
      cell: ({ row }) => format(new Date(row.original.effective_date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'expiration_date',
      header: 'Expiration Date',
      cell: ({ row }) => format(new Date(row.original.expiration_date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'premium_amount',
      header: 'Premium',
      cell: ({ row }) => formatCurrency(row.original.premium_amount),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.is_active, row.original.expiration_date),
    },
  ];

  const handleExportCSV = () => {
    if (!insuranceData?.length) return;

    const headers = [
      'Property Address',
      'Unit Number',
      'Tenant Name',
      'Insurance Provider',
      'Policy Number',
      'Policy Type',
      'Liability Coverage',
      'Personal Property Coverage',
      'Effective Date',
      'Expiration Date',
      'Premium Amount',
      'Status'
    ];

    const csvContent = [
      headers.join(','),
      ...insuranceData.map(record => [
        `"${record.property_address}"`,
        `"${record.unit_number || ''}"`,
        `"${record.tenant_name}"`,
        `"${record.provider_name}"`,
        `"${record.policy_number}"`,
        `"${record.policy_type}"`,
        record.liability_coverage,
        record.personal_property_coverage,
        record.effective_date,
        record.expiration_date,
        record.premium_amount,
        record.is_active ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `renters-insurance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!insuranceData?.length) {
      toast.error('No data available to export');
      return;
    }
    
    try {
      generateRentersInsurancePDF(
        insuranceData,
        format(new Date(), 'yyyy-MM-dd')
      );
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };


  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Renters Insurance Report</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Error loading insurance data: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Renters Insurance Report</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={!insuranceData?.length}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={!insuranceData?.length}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>


      <PortfolioReportFilters
        title="Report Filters"
        filters={filters}
        onFiltersChange={updateFilters}
        onRunReport={handleRunReport}
        userId={userId || ''}
        isRunning={isRunning}
        hasValidFilters={hasValidFilters}
        dateMode="range"
        hideDateRange={true}
      >
        {/* Custom filters with Policy Type, Tenant Status, and Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Policy Type Selection with Checkbox Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Policy Type</label>
            <SimpleDropdownSelect
              options={policyTypeOptions}
              selected={customFilters.policyTypes}
              onChange={(policyTypes) => setCustomFilters(prev => ({ ...prev, policyTypes }))}
              placeholder="Select policy types..."
              allLabel="All Types"
              showSearch={false}
            />
          </div>

          {/* Tenant Status Selection with Checkbox Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tenant Status</label>
            <SimpleDropdownSelect
              options={tenantStatusOptions}
              selected={customFilters.tenantStatuses}
              onChange={(tenantStatuses) => setCustomFilters(prev => ({ ...prev, tenantStatuses }))}
              placeholder="Select tenant status..."
              allLabel="All Tenants"
              showSearch={false}
            />
          </div>
        </div>
        
        {/* Date Range - moved under Policy Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <DateRangePicker
              value={{ from: filters.dateFrom, to: filters.dateTo }}
              onChange={(dateRange) => {
                if (dateRange.from && dateRange.to) {
                  updateFilters({ dateFrom: dateRange.from, dateTo: dateRange.to });
                }
              }}
            />
          </div>
          <div />
        </div>
      </PortfolioReportFilters>

      <DataSourcesSection
        sources={[
          { table: 'renters_insurance', description: 'Tenant insurance policy records with coverage details' },
          { table: 'tenants', description: 'Tenant information and lease status' },
          { table: 'properties', description: 'Property and unit information' },
        ]}
        dataRequirements={{
          fields: [
            { field: 'Policy Number', description: 'Unique insurance policy identifier for each tenant' },
            { field: 'Coverage Amount', description: 'Dollar amount of insurance coverage' },
            { field: 'Policy Dates', description: 'Policy effective date and expiration date' },
            { field: 'Insurance Provider', description: 'Name of insurance company' }
          ],
          calculationSteps: [
            { step: 'Coverage Status', formula: 'Active if current date is between effective and expiration dates' },
            { step: 'Days Until Expiration', formula: 'Expiration Date - Current Date' },
            { step: 'Compliance Rate', formula: '(Units with Active Insurance / Total Occupied Units) × 100%' },
            { step: 'Avg Coverage Amount', formula: 'Sum of all coverage amounts / Number of policies' }
          ],
          note: 'Tracks renters insurance compliance across all tenants. Required for lease compliance and risk management.'
        }}
      />

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasUserTriggeredRun ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Generate Report</h3>
              <p className="text-muted-foreground mb-4">
                Configure your filters above and click "Run Report" to generate the Renters Insurance report
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading insurance data...</div>
          ) : insuranceData?.length ? (
            <>
              <DataTable columns={columns} data={insuranceData} />
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {(() => {
                // Check if user selected specific properties
                const hasSpecificProperties = queryFilters && (queryFilters.propertyIds.length > 0 || queryFilters.unitIds.length > 0);
                
                if (hasSpecificProperties) {
                  // User selected specific properties but no data found
                  const selectedPropertyCount = (queryFilters?.propertyIds.length || 0) + (queryFilters?.unitIds.length || 0);
                  return (
                    <div>
                      <p className="mb-2">No insurance records found for the selected {selectedPropertyCount === 1 ? 'property' : 'properties'}.</p>
                      <p className="text-sm">Try selecting "All Properties" or choose a different property that has insurance records.</p>
                    </div>
                  );
                } else {
                  // User selected "All Properties" but still no data
                  return (
                    <div>
                      <p className="mb-2">No insurance records found in your portfolio.</p>
                      <p className="text-sm">Add insurance records to your properties to see data here.</p>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};