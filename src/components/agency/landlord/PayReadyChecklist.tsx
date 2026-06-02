import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyLandlordId: string;
  agencyId: string;
  payReady: boolean;
  payHoldReason: string | null;
  isAdmin: boolean;
  onUpdate?: () => void;
}

interface ChecklistResult {
  ready: boolean;
  w9_ok: boolean;
  payee_ok: boolean;
  bank_ok: boolean;
  contract_ok: boolean;
  insurance_ok: boolean;
  details: any;
}

const Row: React.FC<{ ok: boolean; label: string; hint?: string }> = ({ ok, label, hint }) => (
  <div className="flex items-start gap-2 py-1.5">
    {ok ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
    )}
    <div className="flex-1">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  </div>
);

const PayReadyChecklist: React.FC<Props> = ({ agencyLandlordId, agencyId, payReady, payHoldReason, isAdmin, onUpdate }) => {
  const [data, setData] = useState<ChecklistResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase.rpc('is_landlord_pay_ready' as any, { _landlord_id: agencyLandlordId });
    if (!error && rows && Array.isArray(rows) && rows.length > 0) {
      setData(rows[0] as ChecklistResult);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (agencyLandlordId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyLandlordId]);

  const flipPayReady = async (next: boolean, reason?: string) => {
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const update: any = {
      pay_ready: next,
      pay_ready_at: next ? new Date().toISOString() : null,
      pay_ready_by: next ? user?.id ?? null : null,
      pay_hold_reason: next ? null : (reason || 'Manually placed on hold'),
    };
    const { error } = await supabase.from('agency_landlords').update(update).eq('id', agencyLandlordId);
    setSaving(false);
    if (error) {
      toast.error('Failed to update pay-ready status');
      return;
    }
    toast.success(next ? 'Approved for payment' : 'Payment hold applied');

    // Best-effort audit log
    try {
      await supabase.from('agency_audit_log' as any).insert({
        agency_id: agencyId,
        action: next ? 'landlord_pay_ready_approved' : 'landlord_pay_hold_applied',
        entity_type: 'agency_landlord',
        entity_id: agencyLandlordId,
        actor_user_id: user?.id,
        details: { reason: reason || null, override: next && data && !data.ready },
      } as any);
    } catch {
      /* ignore */
    }

    setOverrideOpen(false);
    setOverrideReason('');
    onUpdate?.();
  };

  const allGreen = data?.ready ?? false;
  const canApprove = isAdmin && (allGreen || overrideReason.trim().length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Pay-Ready Checklist
            {payReady ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300">Approved for Payment</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">Not Pay-Ready</Badge>
            )}
          </CardTitle>
          {isAdmin && (
            <div className="flex gap-2">
              {!payReady ? (
                <Button
                  size="sm"
                  onClick={() => (allGreen ? flipPayReady(true) : setOverrideOpen(true))}
                  disabled={saving || loading}
                >
                  {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
                  {allGreen ? 'Approve for Payment' : 'Override & Approve'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOverrideOpen(true)}
                  disabled={saving}
                >
                  <ShieldOff className="w-3 h-3 mr-1" /> Place on Hold
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading || !data ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            <Row ok={data.w9_ok} label="W-9 on file & approved" hint={!data.w9_ok ? 'Approve the W-9 in the Requirements tab' : undefined} />
            <Row ok={data.payee_ok} label="Payee profile created" hint={!data.payee_ok ? 'Landlord needs to create a payout profile in their portal' : undefined} />
            <Row ok={data.bank_ok} label="Bank account verified" hint={!data.bank_ok ? 'Bank verification (Plaid or micro-deposit) required' : undefined} />
            <Row ok={data.contract_ok} label="Executed HAP contract" hint={!data.contract_ok ? 'Create an active HAP contract for at least one unit' : undefined} />
            <Row ok={data.insurance_ok} label="No expired insurance / debarment" />
          </div>
        )}
        {payHoldReason && (
          <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-medium">Hold reason:</span> {payHoldReason}
          </div>
        )}
      </CardContent>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{payReady ? 'Place landlord on payment hold' : 'Override and approve for payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{payReady ? 'Reason for hold (required)' : 'Override justification (required)'}</Label>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder={payReady ? 'e.g., Bank account flagged, awaiting re-verification' : 'e.g., Manual paper W-9 received, scanned to docs vault'}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">This decision is logged to the agency audit log.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button
              onClick={() => flipPayReady(!payReady, overrideReason)}
              disabled={overrideReason.trim().length === 0 || saving}
            >
              {payReady ? 'Apply Hold' : 'Approve with Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PayReadyChecklist;
