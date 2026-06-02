import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';

interface Props {
  userId: string;
}

const REASON_LABELS: Record<string, string> = {
  unreported_income: 'Unreported Income',
  owed_rent: 'Back Rent Owed',
  damages: 'Property Damages',
  overpayment: 'HAP Overpayment',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  defaulted: 'destructive',
  terminated: 'outline',
};

const TenantRepaymentView: React.FC<Props> = ({ userId }) => {
  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['tenant-repayment-agreements', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_repayment_agreements')
        .select('*')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const agreementIds = agreements.map((a: any) => a.id);
  const { data: payments = [] } = useQuery({
    queryKey: ['tenant-repayment-payments', agreementIds.join(',')],
    queryFn: async () => {
      if (!agreementIds.length) return [];
      const { data, error } = await (supabase as any)
        .from('agency_repayment_payments')
        .select('*')
        .in('agreement_id', agreementIds)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: agreementIds.length > 0,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading repayment plans...</div>;
  }

  if (!agreements.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">You have no active repayment agreements.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <DollarSign className="w-5 h-5" /> Repayment Agreements
      </h3>

      {agreements.map((agreement: any) => {
        const paid = Number(agreement.original_debt) - Number(agreement.balance_remaining);
        const pct = Number(agreement.original_debt) > 0
          ? Math.round((paid / Number(agreement.original_debt)) * 100)
          : 0;
        const agreementPayments = payments.filter((p: any) => p.agreement_id === agreement.id);
        const nextDue = agreement.last_payment_date
          ? addMonths(new Date(agreement.last_payment_date), 1)
          : new Date(agreement.start_date);
        const isOverdue = agreement.status === 'active' && nextDue < new Date();

        return (
          <Card key={agreement.id} className={isOverdue ? 'border-destructive/50' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{REASON_LABELS[agreement.reason] || agreement.reason}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Started {format(new Date(agreement.start_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[agreement.status] || 'secondary'}>
                  {agreement.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Original Debt</p>
                  <p className="text-lg font-semibold">${Number(agreement.original_debt).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining Balance</p>
                  <p className="text-lg font-semibold">${Number(agreement.balance_remaining).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Payment</p>
                  <p className="text-lg font-semibold">${Number(agreement.monthly_payment).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next Due</p>
                  <p className={`text-lg font-semibold ${isOverdue ? 'text-destructive' : ''}`}>
                    {format(nextDue, 'MMM d')}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{pct}% paid</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>

              {isOverdue && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Payment overdue. Contact your caseworker.
                </div>
              )}

              {agreementPayments.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Payment History
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agreementPayments.slice(0, 6).map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">{format(new Date(p.payment_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-xs text-right font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {agreement.notes && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
                  {agreement.notes}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TenantRepaymentView;
