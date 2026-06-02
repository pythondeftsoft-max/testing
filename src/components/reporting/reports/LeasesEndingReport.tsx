import React, { useState, useEffect } from 'react';
import { ChevronRight, Download, Calendar, Play, Phone, Mail, Building2, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateLeasesEndingPDF } from '@/utils/leasesEndingExportUtils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAllPropertiesWithUnits, getUnitOptionsFromAllProperties, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import { useLeasesEnding, LeaseEndingInfo } from '@/hooks/useLeasesEnding';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { DataSourcesSection } from '@/components/reports/DataSourcesSection';

// Helper functions for filter validation
const isAllPortfolioSelected = (portfolioId: string) => portfolioId === 'everything';

const isAllPropertiesSelected = (properties: string[], units: string[]) => 
  properties.length === 0 && units.length === 0;

const hasCustomDateRange = (dateRange: { from: Date | undefined; to: Date | undefined }) => {
  if (!dateRange.from || !dateRange.to) return false;
  
  const today = new Date();
  const defaultEnd = new Date('2026-12-31');
  
  // Check if it's different from default range (today to 2026-12-31)
  const fromIsDifferent = dateRange.from.toDateString() !== today.toDateString();
  const toIsDifferent = dateRange.to.toDateString() !== defaultEnd.toDateString();
  
  return fromIsDifferent || toIsDifferent;
};

const hasSpecificFiltersSelected = (
  portfolioId: string, 
  properties: string[], 
  units: string[], 
  dateRange: { from: Date | undefined; to: Date | undefined }
) => {
  // If specific portfolio is selected (not "Everything"), that's a specific filter
  if (!isAllPortfolioSelected(portfolioId)) return true;
  
  // If specific properties/units are selected, that's a specific filter
  if (!isAllPropertiesSelected(properties, units)) return true;
  
  // If custom date range is selected, that's a specific filter
  if (hasCustomDateRange(dateRange)) return true;
  
  // No specific filters selected
  return false;
};

interface LeasesEndingReportProps {
  onBack: () => void;
  portfolioId?: string;
}

export const LeasesEndingReport: React.FC<LeasesEndingReportProps> = ({
  onBack,
  portfolioId
}) => {
  const { user, loading: authLoading } = useAuth();
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id || '');
  
  // State for filters
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(
    portfolioId && portfolioId !== 'everything' ? portfolioId : 'everything'
  );
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [hasRunReport, setHasRunReport] = useState(false);
  const [hasFilterChanges, setHasFilterChanges] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: new Date('2026-12-31') // Extended to include 2026 lease endings
  });

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

  // Get leases ending data
  const {
    data: leasesData,
    loading: leasesLoading,
    error: leasesError,
    fetchLeasesEnding
  } = useLeasesEnding();


  // Reset selected properties when portfolio changes
  useEffect(() => {
    setSelectedProperties([]);
    setSelectedUnitIds([]);
    setHasFilterChanges(true);
    if (user?.id) {
      refetchProperties();
    }
  }, [selectedPortfolio, user?.id, refetchProperties]);

  // Get property and unit options for hierarchical selector
  const propertyOptions = React.useMemo(() => {
    return getUnitOptionsFromAllProperties(properties || []);
  }, [properties]);

  // Remove automatic data loading - only load when user clicks Run Report

  const handleRunReport = () => {
    // Validate that specific filters are selected
    if (!hasSpecificFiltersSelected(selectedPortfolio, selectedProperties, selectedUnitIds, dateRange)) {
      toast.error(
        "Please select specific filters to generate a meaningful report. Choose a specific portfolio, properties/units, or a custom date range.",
        {
          duration: 5000,
        }
      );
      return;
    }

    if (dateRange.from && dateRange.to) {
      setHasRunReport(true);
      setHasFilterChanges(false);
      
      // Smart filtering: If "All Properties" is intended, fetch all units with lease end dates
      let finalUnitIds: string[] | undefined;
      
      // Check for "All Properties" mode: empty arrays represent show all data
      const isAllPropertiesMode = selectedUnitIds.length === 0 && selectedProperties.length === 0;
      
      if (isAllPropertiesMode) {
        // "All Properties" selected - fetch all units (pass undefined)
        finalUnitIds = undefined;
      } else {
        // User has selected specific properties/units
        finalUnitIds = selectedUnitIds.length > 0 ? selectedUnitIds : undefined;
      }
      
      fetchLeasesEnding(
        selectedPortfolio,
        finalUnitIds, // Pass undefined for all units, or specific unit IDs
        dateRange.from.toISOString().split('T')[0],
        dateRange.to.toISOString().split('T')[0]
      );
    }
  };

  const handleExportCSV = () => {
    if (!hasRunReport) {
      toast.error('Please run the report first.');
      return;
    }

    // Create CSV content
    const headers = ['Property', 'Unit', 'Tenant', 'Rent', 'Non-Rent', 'Credits', 'Lease Start', 'Lease End', 'When Lease Ends', 'Next Lease', 'Status', 'Days Until Expiry'];
    const csvContent = [
      headers.join(','),
      ...leasesData.leases.map(lease => [
        `"${lease.propertyAddress}"`,
        `"${lease.unit}"`,
        `"${lease.tenantName}"`,
        lease.rent.toFixed(2),
        lease.nonRent.toFixed(2),
        lease.credits.toFixed(2),
        lease.leaseStart ? format(new Date(lease.leaseStart), 'MM/dd/yyyy') : '',
        lease.leaseEnd ? format(new Date(lease.leaseEnd), 'MM/dd/yyyy') : '',
        `"${lease.whenLeaseEnds}"`,
        `"${lease.nextLease}"`,
        `"${lease.leaseStatus}"`,
        lease.daysUntilExpiry
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leases-ending-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    const message = leasesData.leases.length === 0 
      ? 'CSV exported successfully (no data found)'
      : 'CSV exported successfully';
    toast.success(message);
  };

  const handleExportPDF = () => {
    if (!hasRunReport || !dateRange.from || !dateRange.to) {
      toast.error('Please run the report first.');
      return;
    }

    generateLeasesEndingPDF(leasesData.leases, {
      from: dateRange.from,
      to: dateRange.to
    });
    
    const message = leasesData.leases.length === 0 
      ? 'PDF exported successfully (no data found)'
      : 'PDF exported successfully';
    toast.success(message);
  };

  const columns: ColumnDef<LeaseEndingInfo>[] = [
    {
      accessorKey: 'propertyAddress',
      header: 'Property',
      cell: ({ row }) => {
        const lease = row.original;
        const unit = lease.unit === 'N/A' || lease.unit.includes('Main') ? 'Main Unit' : lease.unit;
        return (
          <div className="min-w-0 max-w-[200px]">
            <div className="flex items-center space-x-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm truncate">{row.getValue('propertyAddress')}</span>
            </div>
            <div className="text-xs text-muted-foreground">Unit: {unit}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'tenantName',
      header: 'Tenant',
      cell: ({ row }) => {
        const lease = row.original;
        return (
          <div className="min-w-0 max-w-[160px]">
            <div className="font-medium text-sm mb-1 truncate">{lease.tenantName}</div>
            <div className="text-xs text-muted-foreground truncate" title={lease.email}>
              {lease.email || lease.phone || '-'}
            </div>
          </div>
        );
      },
    },
    {
      id: 'financial',
      header: () => <div className="text-right">Financial</div>,
      cell: ({ row }) => {
        const lease = row.original;
        const rent = lease.rent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const nonRent = lease.nonRent;
        const credits = lease.credits;
        return (
          <div className="text-right min-w-0">
            <div className="font-medium text-sm">${rent}</div>
            {(nonRent > 0 || credits > 0) && (
              <div className="text-xs text-muted-foreground">
                {nonRent > 0 && `+$${nonRent.toFixed(0)}`}
                {credits > 0 && ` -$${credits.toFixed(0)}`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'leasePeriod',
      header: 'Lease Period',
      cell: ({ row }) => {
        const lease = row.original;
        const startDate = lease.leaseStart ? format(new Date(lease.leaseStart), 'MM/dd/yy') : '-';
        const endDate = lease.leaseEnd ? format(new Date(lease.leaseEnd), 'MM/dd/yy') : '-';
        return (
          <div className="text-sm min-w-0">
            <div className="font-medium">{endDate}</div>
            <div className="text-xs text-muted-foreground">From {startDate}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'whenLeaseEnds',
      header: 'When Lease Ends',
      cell: ({ row }) => {
        const whenEnds = row.getValue<string>('whenLeaseEnds');
        return (
          <div className="text-sm min-w-0">
            <div className="font-medium">{whenEnds}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'nextLease',
      header: 'Next Lease',
      cell: ({ row }) => {
        const nextLease = row.getValue<string>('nextLease');
        return (
          <div className="text-sm min-w-0">
            <div className="text-muted-foreground">{nextLease}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'leaseStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue<string>('leaseStatus');
        const statusColors = {
          'Expired': 'text-destructive bg-destructive/10 border-destructive/20',
          'Expiring Soon': 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800',
          'Expiring': 'text-warning bg-warning/10 border-warning/20',
          'Active': 'text-success bg-success/10 border-success/20'
        };
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors] || 'text-muted-foreground bg-muted border-border'}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'daysUntilExpiry',
      header: () => <div className="text-center">Days Left</div>,
      cell: ({ row }) => {
        const days = row.getValue<number>('daysUntilExpiry');
        return (
          <div className="text-center">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              days <= 0 ? 'text-destructive bg-destructive/10' :
              days <= 30 ? 'text-destructive bg-destructive/10' : 
              days <= 60 ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950' : 
              'text-success bg-success/10'
            }`}>
              {days <= 0 ? 'Expired' : `${days}d`}
            </span>
          </div>
        );
      },
    }
  ];

  const isLoading = authLoading || portfoliosLoading || propertiesLoading || leasesLoading;

  if (authLoading || portfoliosLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <nav className="flex items-center text-sm text-muted-foreground">
          <span>Reports</span>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground font-medium">Leases ending</span>
        </nav>
        
        <div className="flex items-center gap-3">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Leases ending</h1>
            <p className="text-muted-foreground">All leases that will end during a specified time frame</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Portfolio Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Portfolio</label>
              <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                <SelectTrigger>
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everything">Everything</SelectItem>
                  {portfolios?.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Properties & Units Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Properties & Units</label>
              <HierarchicalPropertySelector
                properties={properties || []}
                selectedPropertyIds={selectedProperties}
                selectedUnitIds={selectedUnitIds}
                onSelectionChange={(propertyIds, unitIds) => {
                  setSelectedProperties(propertyIds);
                  setSelectedUnitIds(unitIds);
                  setHasFilterChanges(true);
                }}
                placeholder="Select properties and units"
              />
            </div>
          </div>

          {/* Date Range - Full Width */}
          <div className="mt-6 space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </label>
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setHasFilterChanges(true);
              }}
              className="w-fit"
            />
          </div>

          {/* Actions Section */}
          <div className="border-t pt-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasFilterChanges && (
                  <p className="text-sm text-muted-foreground">
                    Click "Run Report" to apply filter changes
                  </p>
                )}
                {selectedUnitIds.length > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Filtering by {selectedUnitIds.length} specific unit{selectedUnitIds.length === 1 ? '' : 's'}. 
                    If no results appear, try selecting "All Properties" to include all units with lease end dates.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <Button 
                  onClick={handleRunReport}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
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
                <Button 
                  variant="outline" 
                  onClick={handleExportCSV}
                  disabled={!hasRunReport || isLoading}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF}
                  disabled={!hasRunReport || isLoading}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources Section */}
      <DataSourcesSection
          sources={[
            { table: 'leases', description: 'Active lease agreements and end dates' },
            { table: 'tenants', description: 'Tenant contact information' },
            { table: 'properties', description: 'Property addresses and details' },
            { table: 'property_units', description: 'Unit numbers and configurations' }
          ]}
          dataRequirements={{
            fields: [
              { field: 'Lease End Date', description: 'When each lease agreement expires' },
              { field: 'Lease Start Date', description: 'When the lease began' },
              { field: 'Monthly Rent', description: 'Current rent amount for each unit' },
              { field: 'Tenant Information', description: 'Tenant names and contact details' }
            ],
            calculationSteps: [
              { step: 'Days Until Expiration', formula: 'Lease End Date - Current Date' },
              { step: 'Lease Duration', formula: 'Lease End Date - Lease Start Date (in months)' },
              { step: 'Potential Revenue at Risk', formula: 'Sum of monthly rent for expiring leases' },
              { step: 'Renewals Needed', formula: 'Count of leases expiring in selected date range' }
            ],
            note: 'Use to plan lease renewals and prevent vacancy gaps. Filter by date range to see which leases are expiring soon.'
          }}
        />

      {/* Data Table */}
      <div className="bg-card border rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Lease Details</h2>
            {hasRunReport && (
              <div className="text-sm text-muted-foreground">
                {leasesData.leases.length} lease{leasesData.leases.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          
          {!hasRunReport ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Click "Run Report" to generate leases ending data</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading lease data...</p>
            </div>
          ) : leasesError ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">Error loading data: {leasesError}</p>
              <Button onClick={handleRunReport} variant="outline" className="mt-4">
                <Play className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : leasesData.leases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No leases ending in the selected date range.</p>
              <Button onClick={handleRunReport} variant="outline" className="mt-4">
                <Play className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          ) : (
            <DataTable columns={columns} data={leasesData.leases} />
          )}
        </div>
      </div>

    </div>
  );
};