import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Home, Calendar } from 'lucide-react';

interface HAPPaymentsTabProps {
  hapPayments: any[];
  getStatusBadge: (status: string) => React.ReactNode;
}

const groupByMonth = (payments: any[]) => {
  const groups: Record<string, any[]> = {};
  payments.forEach(p => {
    const date = p.created_at ? new Date(p.created_at) : new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
};

const formatMonth = (key: string) => {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

export const HAPPaymentsTab = ({ hapPayments, getStatusBadge }: HAPPaymentsTabProps) => {
  if (hapPayments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No HAP Payments</h3>
          <p className="text-muted-foreground">No Housing Assistance Payments have been processed for your units yet.</p>
        </CardContent>
      </Card>
    );
  }

  const grouped = groupByMonth(hapPayments);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold">{hapPayments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total HAP Amount</p>
            <p className="text-2xl font-bold text-primary">
              ${hapPayments.reduce((sum: number, p: any) => sum + (p.hap_amount || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net Payments</p>
            <p className="text-2xl font-bold">
              ${hapPayments.reduce((sum: number, p: any) => sum + (p.net_payment || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {grouped.map(([monthKey, payments]) => {
        const monthTotal = payments.reduce((s: number, p: any) => s + (p.net_payment || 0), 0);
        return (
          <div key={monthKey} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {formatMonth(monthKey)}
              </h3>
              <Badge variant="outline" className="text-xs">${monthTotal.toLocaleString()}</Badge>
            </div>
            {payments.map((payment: any) => (
              <Card key={payment.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="font-medium">
                          {payment.property_address
                            ? `${payment.property_address}${payment.unit_number ? ` — Unit ${payment.unit_number}` : ''}`
                            : `Unit #${payment.unit_id?.slice(0, 8) || '—'}`
                          }
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        HAP: ${payment.hap_amount?.toLocaleString() || '0'} ·
                        Tenant: ${payment.tenant_portion?.toLocaleString() || '0'} ·
                        Gross: ${payment.gross_rent?.toLocaleString() || '0'}
                      </p>
                      {payment.adjustment_amount !== 0 && payment.adjustment_amount != null && (
                        <p className="text-sm text-amber-600 ml-6">
                          Adjustment: ${payment.adjustment_amount?.toLocaleString() || '0'}
                          {payment.adjustment_reason && ` — ${payment.adjustment_reason}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">${payment.net_payment?.toLocaleString() || '0'}</p>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
};
