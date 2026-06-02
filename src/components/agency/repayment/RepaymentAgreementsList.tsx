import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, AlertTriangle, DollarSign, Loader2, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RepaymentAgreementWizard from './RepaymentAgreementWizard';
import RecordPaymentDialog from './RecordPaymentDialog';

interface Props {
  agencyId: string;
  canManage: boolean;
}

interface Agreement {
  id: string;
  tenant_id: string;
  original_debt: number;
  monthly_payment: number;
  balance_remaining: number;
  start_date: string;
  end_date: string | null;
  status: string;
  reason: string;
  last_payment_date: string | null;
  created_at: string;
  tenant_name?: string;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  defaulted: 'destructive',
  terminated: 'outline',
};

const REASON_LABELS: Record<string, string> = {
  unreported_income: 'Unreported Income',
  owed_rent: 'Back Rent',
  damages: 'Damages',
  overpayment: 'HAP Overpayment',
  other: 'Other',
};

const RepaymentAgreementsList: React.FC<Props> = ({ agencyId, canManage }) => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<Agreement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_repayment_agreements')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load agreements');
      setLoading(false);
      return;
    }

    const tenantIds = Array.from(new Set((data || []).map(a => a.tenant_id)));
    const { data: profiles } = tenantIds.length
      ? await supabase.from('profiles').select('id, full_name, email').in('id', tenantIds)
      : { data: [] as any[] };
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || p.email || 'Unknown']));

    setAgreements((data || []).map((a: any) => ({
      ...a,
      original_debt: Number(a.original_debt),
      monthly_payment: Number(a.monthly_payment),
      balance_remaining: Number(a.balance_remaining),
      tenant_name: nameMap.get(a.tenant_id) || 'Unknown',
    })));
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { load(); }, [load]);

  const isAtRisk = (a: Agreement): boolean => {
    if (a.status !== 'active') return false;
    if (!a.last_payment_date) {
      const start = new Date(a.start_date);
      return (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24) > 30;
    }
    const last = new Date(a.last_payment_date);
    return (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24) > 30;
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('agency_repayment_agreements').update({ status }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  const summary = {
    active: agreements.filter(a => a.status === 'active').length,
    atRisk: agreements.filter(isAtRisk).length,
    totalOwed: agreements.filter(a => a.status === 'active').reduce((s, a) => s + a.balance_remaining, 0),
    totalCollected: agreements.reduce((s, a) => s + (a.original_debt - a.balance_remaining), 0),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-bold">{summary.active}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> At Risk (30+ days)</p>
          <p className="text-2xl font-bold text-destructive">{summary.atRisk}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className="text-2xl font-bold">${summary.totalOwed.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">${summary.totalCollected.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4" /> Repayment Agreements</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Agreement
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : agreements.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No repayment agreements yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map(a => {
                    const atRisk = isAtRisk(a);
                    return (
                      <TableRow key={a.id} className={atRisk ? 'bg-destructive/5' : undefined}>
                        <TableCell className="font-medium">{a.tenant_name}</TableCell>
                        <TableCell className="text-xs">{REASON_LABELS[a.reason] || a.reason}</TableCell>
                        <TableCell className="text-right font-mono">${a.original_debt.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">${a.balance_remaining.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">${a.monthly_payment.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">
                          {a.last_payment_date || <span className="text-muted-foreground">Never</span>}
                          {atRisk && <Badge variant="destructive" className="ml-2 text-[10px]">At Risk</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[a.status] || 'outline'} className="capitalize">{a.status}</Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right space-x-1">
                            {a.status === 'active' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setPaymentDialog(a)}>
                                  <DollarSign className="w-3 h-3 mr-1" /> Record
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, 'defaulted')}>Default</Button>
                              </>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RepaymentAgreementWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        agencyId={agencyId}
        onCreated={load}
      />
      {paymentDialog && (
        <RecordPaymentDialog
          open={!!paymentDialog}
          onOpenChange={(o) => !o && setPaymentDialog(null)}
          agreementId={paymentDialog.id}
          balanceRemaining={paymentDialog.balance_remaining}
          monthlyPayment={paymentDialog.monthly_payment}
          onRecorded={load}
        />
      )}
    </div>
  );
};

export default RepaymentAgreementsList;
