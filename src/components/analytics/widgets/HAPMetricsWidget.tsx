import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Receipt, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Building2
} from 'lucide-react';
import { useHAPAnalytics } from '@/hooks/useHAPAnalytics';

interface HAPMetricsWidgetProps {
  landlordId: string;
  variant?: 'full' | 'compact';
}

export const HAPMetricsWidget = ({ landlordId, variant = 'full' }: HAPMetricsWidgetProps) => {
  const { data: hapData, loading, error } = useHAPAnalytics(landlordId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !hapData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">HAP data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  if (hapData.propertiesWithVouchers === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No voucher properties found</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            HAP Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Collection Rate</span>
            <Badge variant={hapData.collectionRate >= 95 ? 'default' : 'secondary'}>
              {hapData.collectionRate.toFixed(1)}%
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Properties</span>
            <span className="text-sm font-medium">{hapData.propertiesWithVouchers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">This Month</span>
            <span className="text-sm font-medium">{formatCurrency(hapData.currentMonthExpected)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Collection Rate Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Collection Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-2xl font-bold">
              {hapData.collectionRate.toFixed(1)}%
            </div>
            <Progress 
              value={hapData.collectionRate} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: 95%</span>
              <Badge variant={hapData.collectionRate >= 95 ? 'default' : 'secondary'}>
                {hapData.collectionRate >= 95 ? 'On Track' : 'Below Target'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total HAP Revenue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Total HAP Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(hapData.totalReceived)}
            </div>
            <div className="text-xs text-muted-foreground">
              Expected: {formatCurrency(hapData.totalExpected)}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {hapData.propertiesWithVouchers} Properties
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Month Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600" />
            Current Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {formatCurrency(hapData.currentMonthReceived)}
            </div>
            <div className="text-xs text-muted-foreground">
              Expected: {formatCurrency(hapData.currentMonthExpected)}
            </div>
            <Progress 
              value={hapData.currentMonthExpected > 0 ? (hapData.currentMonthReceived / hapData.currentMonthExpected) * 100 : 0}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Issues */}
      {(hapData.latePayments > 0 || hapData.missedPayments > 0) && (
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Payment Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hapData.latePayments > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Late Payments</span>
                  <Badge variant="secondary">{hapData.latePayments}</Badge>
                </div>
              )}
              {hapData.missedPayments > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Missed Payments</span>
                  <Badge variant="destructive">{hapData.missedPayments}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};