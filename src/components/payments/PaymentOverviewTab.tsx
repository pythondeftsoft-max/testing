import { useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePaymentOverview } from '@/hooks/usePaymentOverview';
import { PaymentKPICards } from './overview/PaymentKPICards';
import { RentHealthScore } from './overview/RentHealthScore';
import { CollectionActivityList } from './overview/CollectionActivityList';
import { LateUnitsTable } from './overview/LateUnitsTable';
import { PaymentAllStars } from './overview/PaymentAllStars';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentOverviewTabProps {
  landlordId: string;
  portfolioId?: string;
}

type ViewMode = 'month' | 'quarter' | 'year' | 'all';

export const PaymentOverviewTab = ({ landlordId, portfolioId }: PaymentOverviewTabProps) => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Calculate date filters based on selected view mode
  const getDateFilters = () => {
    switch (viewMode) {
      case 'month':
        return {
          dateFrom: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'),
          dateTo: format(endOfMonth(selectedMonth), 'yyyy-MM-dd'),
        };
      case 'quarter':
        return {
          dateFrom: format(startOfQuarter(selectedMonth), 'yyyy-MM-dd'),
          dateTo: format(endOfQuarter(selectedMonth), 'yyyy-MM-dd'),
        };
      case 'year':
        return {
          dateFrom: format(startOfYear(selectedMonth), 'yyyy-MM-dd'),
          dateTo: format(endOfYear(selectedMonth), 'yyyy-MM-dd'),
        };
      case 'all':
      default:
        return {
          dateFrom: undefined,
          dateTo: undefined,
        };
    }
  };

  const { dateFrom, dateTo } = getDateFilters();

  const data = usePaymentOverview(landlordId, {
    dateFrom,
    dateTo,
    portfolioId,
  });

  const handleSendReminder = async (tenantId: string) => {
    try {
      const lateUnit = data.lateUnits.find(u => u.tenantId === tenantId);
      const { error } = await supabase
        .from('payment_reminders')
        .insert({
          tenant_id: tenantId,
          property_id: lateUnit?.propertyId || '',
          due_date: format(selectedMonth, 'yyyy-MM-dd'),
          amount_due: lateUnit?.amountOwed || 0,
          reminder_type: 'late_payment',
          status: 'pending',
        });
      if (error) throw error;
      toast.success('Payment reminder sent to tenant');
    } catch (err: any) {
      toast.error('Failed to send reminder: ' + err.message);
    }
  };

  const handleViewLedger = (unitId: string) => {
    // Navigate to the unit's financial details by setting URL params
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'payments');
    params.set('unitLedger', unitId);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    toast.success('Opening unit ledger...');
  };

  const handleTagPayment = (unitId: string) => {
    toast.info('Navigate to Payment Tagging tab to tag payments');
  };

  const viaOpenKeyPercent = data.totalCollected > 0 
    ? (data.viaOpenKey / data.totalCollected) * 100 
    : 0;

  // Check if there's any data at all
  const hasAnyData = data.totalCollected > 0 || data.totalExpected > 0 || data.lateUnits.length > 0;

  const getDisplayLabel = () => {
    switch (viewMode) {
      case 'month':
        return format(selectedMonth, 'MMMM yyyy');
      case 'quarter':
        const quarter = Math.floor(selectedMonth.getMonth() / 3) + 1;
        return `Q${quarter} ${format(selectedMonth, 'yyyy')}`;
      case 'year':
        return format(selectedMonth, 'yyyy');
      case 'all':
        return 'All Time';
    }
  };

  const navigatePrev = () => {
    switch (viewMode) {
      case 'month':
        setSelectedMonth(prev => subMonths(prev, 1));
        break;
      case 'quarter':
        setSelectedMonth(prev => subMonths(prev, 3));
        break;
      case 'year':
        setSelectedMonth(prev => subMonths(prev, 12));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case 'month':
        setSelectedMonth(prev => addMonths(prev, 1));
        break;
      case 'quarter':
        setSelectedMonth(prev => addMonths(prev, 3));
        break;
      case 'year':
        setSelectedMonth(prev => addMonths(prev, 12));
        break;
    }
  };

  const DateNavigator = () => (
    <div className="flex items-center gap-2">
      <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <SelectTrigger className="w-[100px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Month</SelectItem>
          <SelectItem value="quarter">Quarter</SelectItem>
          <SelectItem value="year">Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>

      {viewMode !== 'all' && (
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {getDisplayLabel()}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

  if (!data.loading && !hasAnyData) {
    return (
      <div className="space-y-6">
        {/* Header with Month Navigator */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Payment Overview</h2>
            <p className="text-muted-foreground">Track your portfolio's payment performance</p>
          </div>
          <DateNavigator />
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Payment Activity Yet</h3>
          <p className="text-muted-foreground max-w-sm">
            Activity will appear here once rent is collected or HAP deposits are tagged
            for {viewMode === 'all' ? 'your portfolio' : getDisplayLabel()}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Navigator */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Payment Overview</h2>
          <p className="text-muted-foreground">Track your portfolio's payment performance</p>
        </div>
        <DateNavigator />
      </div>

      {/* KPI Cards */}
      <PaymentKPICards
        totalCollected={data.totalCollected}
        unitsPaid={data.unitsPaid}
        totalUnits={data.totalUnits}
        viaOpenKey={data.viaOpenKey}
        hapPortion={data.hapPortion}
        tenantPortion={data.tenantPortion}
        totalExpected={data.totalExpected}
        expectedHap={data.expectedHap}
        expectedStripeTenant={data.expectedStripeTenant}
        expectedExternalTenant={data.expectedExternalTenant}
        propertiesAccountedFor={data.propertiesAccountedFor}
        totalProperties={data.totalProperties}
        amountAccountedFor={data.amountAccountedFor}
        loading={data.loading}
      />

      {/* Rent Health Score & Collection Status */}
      <RentHealthScore
        score={data.rentHealthScore}
        totalCollected={data.totalCollected}
        totalExpected={data.totalExpected}
        onTimeCount={data.onTimeCount}
        pendingCount={data.pendingCount}
        lateCount={data.lateCount}
        gracePeriodCount={data.gracePeriodCount}
        loading={data.loading}
      />

      {/* Collection Activity */}
      <CollectionActivityList
        recentPayments={data.recentPayments}
        loading={data.loading}
      />

      {/* Late Units Table */}
      <LateUnitsTable
        lateUnits={data.lateUnits}
        loading={data.loading}
        onSendReminder={handleSendReminder}
        onViewLedger={handleViewLedger}
        onTagPayment={handleTagPayment}
      />

      {/* All-Stars & Achievements */}
      <PaymentAllStars
        allStars={data.allStars}
        collectionRate={data.collectionRate}
        viaOpenKeyPercent={viaOpenKeyPercent}
        loading={data.loading}
      />
    </div>
  );
};
