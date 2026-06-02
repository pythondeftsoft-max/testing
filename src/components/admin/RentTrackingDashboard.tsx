import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { useRentPaymentStats } from '@/hooks/useAdminRentTransactions';
import { useHAPPaymentStats } from '@/hooks/useAdminHAPTransactions';
import { RentPaymentsTable } from './RentPaymentsTable';
import { HAPPaymentsTable } from './HAPPaymentsTable';
import { PlatformRevenueSection } from './PlatformRevenueSection';

export const RentTrackingDashboard = () => {
  const { data: rentStats, isLoading: rentStatsLoading } = useRentPaymentStats();
  const { data: hapStats, isLoading: hapStatsLoading } = useHAPPaymentStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Rent Tracking</h2>
        <p className="text-muted-foreground">
          Monitor all rent payments, HAP transactions, and platform revenue
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rent Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rentStatsLoading ? '...' : formatCurrency(rentStats?.totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month: {formatCurrency(rentStats?.thisMonthCollected || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rentStatsLoading ? '...' : formatCurrency(rentStats?.totalPlatformFees)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month: {formatCurrency(rentStats?.thisMonthFees || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HAP Payments</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hapStatsLoading ? '...' : formatCurrency(hapStats?.totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month: {formatCurrency(hapStats?.thisMonthReceived || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rentStatsLoading ? '...' : rentStats?.totalTransactions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              This month: {rentStats?.thisMonthTransactions || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="rent-payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rent-payments">Rent Payments</TabsTrigger>
          <TabsTrigger value="hap-payments">HAP Payments</TabsTrigger>
          <TabsTrigger value="revenue">Platform Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="rent-payments" className="space-y-4">
          <RentPaymentsTable />
        </TabsContent>

        <TabsContent value="hap-payments" className="space-y-4">
          <HAPPaymentsTable />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <PlatformRevenueSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};
