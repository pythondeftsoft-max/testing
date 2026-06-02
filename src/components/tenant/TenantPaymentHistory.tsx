import { Info, CheckCircle, AlertCircle, Lock, Crown } from 'lucide-react';
import { useTenantPaymentHistory } from '@/hooks/useTenantPaymentHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

interface TenantPaymentHistoryProps {
  tenantId: string;
  isPrimary?: boolean;
}

export const TenantPaymentHistory = ({ tenantId, isPrimary = true }: TenantPaymentHistoryProps) => {
  const { data, isLoading } = useTenantPaymentHistory(tenantId);

  // Show locked state for non-primary applicants
  if (!isPrimary) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <Lock className="h-16 w-16 text-muted-foreground/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-muted-foreground">Payment History Locked</h3>
            <p className="text-sm text-muted-foreground/80">
              Set this applicant as primary to view their payment history and financial track record.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
            <Crown className="h-5 w-5" />
            <span className="text-sm font-medium">Set as Primary to Unlock</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading payment history...</div>;
  }

  const { payments = [], stats } = data || { payments: [], stats: null };

  const getQualityBadgeConfig = () => {
    switch (stats?.qualityBadge) {
      case 'excellent':
        return { label: 'Excellent Payment History', variant: 'default' as const, color: 'bg-green-500' };
      case 'good':
        return { label: 'Good Payment History', variant: 'secondary' as const, color: 'bg-blue-500' };
      case 'limited':
        return { label: 'Limited History Available', variant: 'outline' as const, color: 'bg-yellow-500' };
      default:
        return { label: 'No Payment History in System', variant: 'outline' as const, color: 'bg-muted' };
    }
  };

  const getStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'completed' || normalized === 'paid') {
      return <Badge variant="default" className="bg-green-600">Completed</Badge>;
    }
    if (normalized === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }
    if (normalized === 'late' || normalized === 'overdue') {
      return <Badge variant="destructive">Late</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const badgeConfig = getQualityBadgeConfig();

  return (
    <div className="space-y-6">
      {/* Informational Alert */}
      <Alert className="border-openkey-blue/20 bg-openkey-blue/5">
        <Info className="h-5 w-5 text-openkey-blue" />
        <AlertDescription className="ml-2">
          <strong className="font-semibold">Limited or No Payment Data?</strong>
          <p className="mt-1 text-sm text-muted-foreground">
            This tenant may not currently pay rent through our system, or their current landlord 
            doesn't use our platform. Lack of payment history here doesn't indicate poor payment 
            behavior - it just means they're not yet in our payment tracking system.
          </p>
        </AlertDescription>
      </Alert>

      {/* Quality Badge */}
      {stats && (
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${badgeConfig.color}`} />
          <Badge variant={badgeConfig.variant} className="text-sm">
            {badgeConfig.label}
          </Badge>
        </div>
      )}

      {/* Summary Cards */}
      {stats && stats.totalPayments > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                On-Time Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.onTimeRate.toFixed(0)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.averageAmount.toFixed(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                History Span
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.historySpanMonths} {stats.historySpanMonths === 1 ? 'month' : 'months'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Info className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No payment history available</p>
              <p className="text-sm mt-2">
                This tenant hasn't made payments through our system yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Property</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Source</th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Days Late</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm">
                        {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-sm">{payment.propertyAddress}</td>
                      <td className="py-3 px-4 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {payment.type === 'tenant_rent' ? 'Tenant Rent' : 'HAP Payment'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm">{payment.paymentSource}</td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        {payment.daysLate ? (
                          <span className={payment.daysLate > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                            {payment.daysLate > 0 ? `+${payment.daysLate}` : payment.daysLate}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
