import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PipelineCard } from './usePipelineData';

interface Props {
  card: PipelineCard;
}

interface BillingTerms {
  monthly_rate?: number;
  setup_fee?: number;
  term_months?: number;
  auto_renew?: boolean;
  billing_cycle?: 'monthly' | 'quarterly' | 'annual';
  billing_start_date?: string;
  first_invoice_date?: string;
  payment_terms?: 'net_15' | 'net_30' | 'net_45' | 'net_60';
  billing_contact_id?: string;
  ap_email?: string;
  po_required?: boolean;
  po_number?: string;
  signed_date?: string;
}

const TERM_OPTIONS = [
  { value: 0, label: 'Month-to-month' },
  { value: 12, label: '1 year' },
  { value: 24, label: '2 years' },
  { value: 36, label: '3 years' },
  { value: 60, label: '5 years' },
  { value: 120, label: '10 years' },
];

export function SignedBillingPanel({ card }: Props) {
  const qc = useQueryClient();
  const table = card.source === 'lead' ? 'agency_leads' : 'pha_prospect_status';
  const parentCol = card.source === 'lead' ? 'lead_id' : 'prospect_id';

  const [terms, setTerms] = useState<BillingTerms>({
    monthly_rate: card.proposal_amount ?? undefined,
    auto_renew: true,
    billing_cycle: 'monthly',
    payment_terms: 'net_30',
    po_required: false,
  });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from(table)
        .select('billing_terms')
        .eq('id', card.id)
        .maybeSingle();
      if (data?.billing_terms && Object.keys(data.billing_terms).length) {
        setTerms((prev) => ({ ...prev, ...data.billing_terms }));
      }
    })();
  }, [card.id, table]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['deal-contacts', card.source, card.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('agency_deal_contacts')
        .select('id, name, email, role, is_billing')
        .eq(parentCol, card.id);
      return (data ?? []) as any[];
    },
  });

  const billingContacts = contacts.filter((c) => c.is_billing || c.role === 'finance');

  const set = <K extends keyof BillingTerms>(k: K, v: BillingTerms[K]) =>
    setTerms((prev) => ({ ...prev, [k]: v }));

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!terms.monthly_rate || terms.monthly_rate <= 0) errs.push('Monthly rate required');
    if (terms.term_months == null) errs.push('Contract term required');
    if (!terms.billing_start_date) errs.push('Billing start date required');
    if (!terms.first_invoice_date) errs.push('First invoice date required');
    if (!terms.signed_date) errs.push('Signed date required');
    if (!terms.billing_contact_id && !terms.ap_email) errs.push('Billing contact OR AP email required');
    if (terms.po_required && !terms.po_number) errs.push('PO number required when PO is required');
    return errs;
  };

  const errors = validate();
  const ready = errors.length === 0;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from(table)
        .update({ billing_terms: terms })
        .eq('id', card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Billing terms saved');
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Save failed'),
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Billing & contract terms</h3>
        <p className="text-xs text-muted-foreground">
          Captured at Signed. On flip to Live, this auto-creates the contract and schedules the first invoice + setup-fee invoice.
        </p>
      </div>

      {ready ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 p-2 text-xs flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <span className="text-emerald-900 dark:text-emerald-200">Ready to flip to Live.</span>
        </div>
      ) : (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-2 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-amber-900 dark:text-amber-200">
            {errors.length} item{errors.length === 1 ? '' : 's'} missing: {errors.join('; ')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Monthly rate (USD)</Label>
          <Input
            type="number"
            value={terms.monthly_rate ?? ''}
            onChange={(e) => set('monthly_rate', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="2500"
          />
        </div>
        <div>
          <Label className="text-xs">One-time setup fee (USD)</Label>
          <Input
            type="number"
            value={terms.setup_fee ?? ''}
            onChange={(e) => set('setup_fee', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
          />
        </div>
        <div>
          <Label className="text-xs">Contract term</Label>
          <Select
            value={String(terms.term_months ?? '')}
            onValueChange={(v) => set('term_months', Number(v))}
          >
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {TERM_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={String(t.value)}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Billing cycle</Label>
          <Select
            value={terms.billing_cycle ?? 'monthly'}
            onValueChange={(v) => set('billing_cycle', v as any)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Signed date</Label>
          <Input
            type="date"
            value={terms.signed_date ?? ''}
            onChange={(e) => set('signed_date', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Billing start date</Label>
          <Input
            type="date"
            value={terms.billing_start_date ?? ''}
            onChange={(e) => set('billing_start_date', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">First invoice date</Label>
          <Input
            type="date"
            value={terms.first_invoice_date ?? ''}
            onChange={(e) => set('first_invoice_date', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Payment terms</Label>
          <Select
            value={terms.payment_terms ?? 'net_30'}
            onValueChange={(v) => set('payment_terms', v as any)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="net_15">Net 15</SelectItem>
              <SelectItem value="net_30">Net 30</SelectItem>
              <SelectItem value="net_45">Net 45</SelectItem>
              <SelectItem value="net_60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border p-3 space-y-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Billing recipient</div>
        <div>
          <Label className="text-xs">Billing contact</Label>
          <Select
            value={terms.billing_contact_id ?? ''}
            onValueChange={(v) => set('billing_contact_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={billingContacts.length === 0 ? 'No billing contacts — add in Contacts tab' : 'Select…'} />
            </SelectTrigger>
            <SelectContent>
              {billingContacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.email ? `· ${c.email}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">AP email (override)</Label>
          <Input
            type="email"
            value={terms.ap_email ?? ''}
            onChange={(e) => set('ap_email', e.target.value)}
            placeholder="ap@phaname.org"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="po_req"
            checked={!!terms.po_required}
            onCheckedChange={(v) => set('po_required', !!v)}
          />
          <Label htmlFor="po_req" className="text-xs cursor-pointer">PO required for invoicing</Label>
        </div>
        {terms.po_required && (
          <div>
            <Label className="text-xs">PO number</Label>
            <Input
              value={terms.po_number ?? ''}
              onChange={(e) => set('po_number', e.target.value)}
            />
          </div>
        )}
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
        {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save billing terms
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Use the Stage selector at the top of this drawer to flip to <b>Live</b> — that runs the finalize action.
      </p>
    </div>
  );
}
