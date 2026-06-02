import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRentPaymentStats } from '@/hooks/useAdminRentTransactions';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { TrendingUp, Users, DollarSign, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { PlatformFeeSettings } from './PlatformFeeSettings';

export const PlatformRevenueSection = () => {
  const { data: stats, isLoading } = useRentPaymentStats();
  const { data: config } = usePlatformConfig();
  const [showSettings, setShowSettings] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const feeConfig = config?.config_value as any;
  const cardConfig = feeConfig?.card || { tenant_fee_rate: 0.029, platform_fee_rate: 0.005 };
  const tenantFeePercent = (cardConfig.tenant_fee_rate * 100).toFixed(2);
  const platformFeePercent = (cardConfig.platform_fee_rate * 100).toFixed(2);
  const totalEffectiveRate = ((cardConfig.tenant_fee_rate + cardConfig.platform_fee_rate) * 100).toFixed(2);

  if (showSettings) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowSettings(false)}>
          ← Back to Revenue Overview
        </Button>
        <PlatformFeeSettings />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fee Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Current Fee Configuration</CardTitle>
            </div>
            <Button onClick={() => setShowSettings(true)} size="sm">
              Edit Fee Rates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Tenant Processing Fee</p>
              <p className="text-2xl font-bold">{tenantFeePercent}%</p>
              <p className="text-xs text-muted-foreground mt-1">Added to rent payment</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Platform Service Fee</p>
              <p className="text-2xl font-bold">{platformFeePercent}%</p>
              <p className="text-xs text-muted-foreground mt-1">Deducted from landlord</p>
            </div>
            <div className="p-4 border rounded-lg bg-primary/5 border-primary">
              <p className="text-sm text-muted-foreground mb-1">Total Effective Rate</p>
              <p className="text-2xl font-bold text-primary">{totalEffectiveRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Combined platform revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(stats?.totalPlatformFees || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All-time platform fees collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(stats?.thisMonthFees || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats?.thisMonthTransactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Fee Per Transaction</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? '...'
                : formatCurrency(
                    stats?.totalPlatformFees && stats?.totalTransactions
                      ? stats.totalPlatformFees / stats.totalTransactions
                      : 0
                  )}
            </div>
            <p className="text-xs text-muted-foreground">Based on all completed transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Rent Payment Fees</p>
                <p className="text-sm text-muted-foreground">Fees collected from tenant rent payments</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalPlatformFees || 0)}</p>
                <p className="text-xs text-muted-foreground">{stats?.totalTransactions || 0} transactions</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Average Transaction Value</p>
                <p className="text-sm text-muted-foreground">Mean amount per rent payment</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatCurrency(stats?.averageTransaction || 0)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Total Rent Volume</p>
                <p className="text-sm text-muted-foreground">Total rent collected through platform</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalCollected || 0)}</p>
                <p className="text-xs text-muted-foreground">
                  Fee rate: {stats?.totalCollected ? ((stats.totalPlatformFees / stats.totalCollected) * 100).toFixed(2) : 0}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note about future enhancements */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Detailed landlord-level revenue analytics and top revenue generators
            will be available in a future update. Current view shows aggregate platform metrics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
