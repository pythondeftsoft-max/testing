import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckCircle2, AlertCircle, Trash2, DollarSign, Banknote, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import CheckbookOnboardingWizard from './CheckbookOnboardingWizard';
import CheckbookWebhookInfo from './CheckbookWebhookInfo';
import DisbursementRailSettings from './DisbursementRailSettings';

interface PaymentRail {
  id: string;
  agency_id: string;
  rail_type: 'checkbook' | 'nacha' | 'modern_treasury';
  display_name: string;
  is_default: boolean;
  is_active: boolean;
  config: any;
  verification_status: 'pending' | 'verified' | 'failed';
  verification_error: string | null;
  last_verified_at: string | null;
  credentials_is_encrypted: boolean;
  created_at: string;
}

interface FeeLedgerEntry {
  id: string;
  rail_type: string;
  payout_amount: number;
  platform_fee: number;
  processor_fee: number;
  invoiced: boolean;
  created_at: string;
}

interface Props {
  agencyId: string;
  canManage: boolean;
}

const RAIL_LABELS: Record<string, string> = {
  checkbook: 'Checkbook.io',
  nacha: 'NACHA / Direct Bank ACH',
  modern_treasury: 'Modern Treasury',
};

export default function AgencyPaymentRails({ agencyId, canManage }: Props) {
  const { toast } = useToast();
  const [rails, setRails] = useState<PaymentRail[]>([]);
  const [ledger, setLedger] = useState<FeeLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    rail_type: 'checkbook' as PaymentRail['rail_type'],
    display_name: '',
    api_key: '',
    account_email: '',
    is_default: true,
  });

  const load = async () => {
    setLoading(true);
    const [{ data: railData }, { data: ledgerData }] = await Promise.all([
      supabase
        .from('agency_payment_rails')
        .select('id, agency_id, rail_type, display_name, is_default, is_active, config, verification_status, verification_error, last_verified_at, credentials_is_encrypted, created_at')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false }),
      supabase.from('platform_fee_ledger').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }).limit(100),
    ]);
    setRails((railData ?? []) as PaymentRail[]);
    setLedger((ledgerData ?? []) as FeeLedgerEntry[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agencyId]);

  const handleAdd = async () => {
    if (!form.display_name.trim() || !form.api_key.trim()) {
      toast({ title: 'Missing fields', description: 'Display name and API key are required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    // Route through the edge function so the API key is encrypted server-side
    // and never stored as plaintext in the database.
    const { data, error } = await supabase.functions.invoke('save-payment-rail', {
      body: {
        agency_id: agencyId,
        rail_type: form.rail_type,
        display_name: form.display_name.trim(),
        is_default: form.is_default,
        credentials: { api_key: form.api_key.trim() },
        config: { account_email: form.account_email.trim() || null },
      },
    });

    setSaving(false);
    if (error || !data?.success) {
      toast({
        title: 'Failed to add rail',
        description: error?.message || data?.error || 'Unknown error',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Payment rail connected', description: `${RAIL_LABELS[form.rail_type]} is ready to use. Credentials are encrypted at rest.` });
    setOpen(false);
    setForm({ rail_type: 'checkbook', display_name: '', api_key: '', account_email: '', is_default: true });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this payment rail? Pending batches using it will fail.')) return;
    const { error } = await supabase.from('agency_payment_rails').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('agency_payment_rails').update({ is_default: false }).eq('agency_id', agencyId).eq('is_default', true);
    await supabase.from('agency_payment_rails').update({ is_default: true }).eq('id', id);
    load();
  };

  const totalUninvoicedFees = ledger.filter(l => !l.invoiced).reduce((s, l) => s + Number(l.platform_fee), 0);
  const totalProcessorFees = ledger.reduce((s, l) => s + Number(l.processor_fee), 0);

  return (
    <div className="space-y-4">
      <DisbursementRailSettings agencyId={agencyId} canManage={canManage} />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" /> Payment Rails
            </CardTitle>
            <CardDescription>
              Connect your agency's own payment processor. Funds flow from your bank → your processor → landlord. The platform never holds your money.
            </CardDescription>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setWizardOpen(true)}>
                <Wand2 className="w-4 h-4 mr-1" /> Connect Checkbook
              </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Advanced</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect a payment rail (advanced)</DialogTitle>
                  <DialogDescription>
                    Power-user form. For guided Checkbook setup, click "Connect Checkbook" instead.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Rail type</Label>
                    <Select value={form.rail_type} onValueChange={(v: any) => setForm(f => ({ ...f, rail_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checkbook">Checkbook.io</SelectItem>
                        <SelectItem value="nacha">NACHA / Direct Bank ACH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Display name</Label>
                    <Input
                      placeholder="e.g. Operating Account – Checkbook"
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Account email (optional)</Label>
                    <Input
                      placeholder="finance@yourpha.gov"
                      value={form.account_email}
                      onChange={e => setForm(f => ({ ...f, account_email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>API key</Label>
                    <Input
                      type="password"
                      placeholder="Paste your Checkbook API key"
                      value={form.api_key}
                      onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Find this in Checkbook → Settings → Developer → API Keys.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
                    <Label>Set as default rail for this agency</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleAdd} disabled={saving}>{saving ? 'Connecting…' : 'Connect'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rails.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No payment rails connected. HAP payouts will fail until you connect one.
            </div>
          ) : (
            <div className="space-y-2">
              {rails.map(rail => (
                <div key={rail.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rail.display_name}</span>
                      <Badge variant="outline">{RAIL_LABELS[rail.rail_type]}</Badge>
                      {rail.is_default && <Badge>Default</Badge>}
                      {rail.verification_status === 'verified' && (
                        <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</Badge>
                      )}
                      {rail.verification_status === 'failed' && (
                        <Badge variant="destructive">Verification failed</Badge>
                      )}
                      {rail.credentials_is_encrypted && (
                        <Badge variant="outline" className="gap-1 text-xs">🔒 Encrypted</Badge>
                      )}
                    </div>
                    {rail.config?.account_email && (
                      <p className="text-xs text-muted-foreground mt-1">{rail.config.account_email}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      {!rail.is_default && (
                        <Button size="sm" variant="ghost" onClick={() => handleSetDefault(rail.id)}>
                          Make default
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(rail.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Platform Fee Ledger
          </CardTitle>
          <CardDescription>
            Per-transaction platform fees billed to this agency. Pass-through processor fees are shown for reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">Uninvoiced platform fees</p>
              <p className="text-2xl font-semibold">${totalUninvoicedFees.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">Processor fees (pass-through)</p>
              <p className="text-2xl font-semibold">${totalProcessorFees.toFixed(2)}</p>
            </div>
          </div>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payouts processed yet.</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {ledger.map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">${Number(entry.payout_amount).toFixed(2)}</span>
                    <span className="text-muted-foreground ml-2">{entry.rail_type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </span>
                    <Badge variant="outline">+${Number(entry.platform_fee).toFixed(2)} fee</Badge>
                    {entry.invoiced && <Badge variant="secondary">Invoiced</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {rails.some(r => r.rail_type === 'checkbook') && <CheckbookWebhookInfo />}

      <CheckbookOnboardingWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        agencyId={agencyId}
        onConnected={load}
      />
    </div>
  );
}
