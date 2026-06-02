import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown, ChevronRight, Users, Home, Wrench, DollarSign, Receipt,
  ExternalLink, Mail, Phone, Building2, FileText, Loader2, Power,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PipelineCard } from './usePipelineData';
import { useLiveCustomerStats } from '@/hooks/useLiveCustomerStats';
import { ContractCard } from './ContractCard';

interface Props { card: PipelineCard }

function termSummary(months?: number | null): string {
  if (!months) return 'Month-to-month';
  if (months % 12 === 0) return `${months / 12}-yr`;
  return `${months}mo`;
}

function invoiceBadge(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Paid</Badge>;
  if (s === 'overdue') return <Badge variant="destructive">Overdue</Badge>;
  if (s === 'sent' || s === 'open') return <Badge variant="outline">Sent</Badge>;
  if (s === 'draft') return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>;
  return <Badge variant="outline">No invoice</Badge>;
}

export const LiveCustomerRow: React.FC<Props> = ({ card }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const agencyId = card.housing_authority_id || null;
  const { data: stats, isLoading } = useLiveCustomerStats(agencyId);

  const c = stats?.contract ?? null;
  const lastInv = stats?.lastInvoice ?? null;

  const generateInvoiceMut = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error('No agency');
      const { data, error } = await supabase.functions.invoke('generate-agency-invoice', {
        body: { agency_id: agencyId },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Failed');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['live-customer-stats', agencyId] });
      toast({ title: 'Invoice generated' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const offboardMut = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error('No agency');
      const { data, error } = await supabase.functions.invoke('offboard-agency', {
        body: { agency_id: agencyId },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      toast({ title: 'Agency off-boarded', description: 'Reversible from agency settings.' });
    },
    onError: (e: any) => toast({ title: 'Off-board failed', description: e.message, variant: 'destructive' }),
  });

  const updateBilling = async (patch: Record<string, any>) => {
    if (!c?.id) {
      if (!agencyId) return;
      await supabase.from('agency_contracts').insert({ agency_id: agencyId, status: 'active', ...patch });
    } else {
      await supabase.from('agency_contracts').update(patch).eq('id', c.id);
    }
    qc.invalidateQueries({ queryKey: ['live-customer-stats', agencyId] });
  };

  return (
    <Card className="overflow-hidden">
      {/* Collapsed header row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{card.agency_name}</span>
            {card.agency_state && <Badge variant="outline" className="text-[10px]">{card.agency_state}</Badge>}
            {card.voucher_count != null && (
              <span className="text-xs text-muted-foreground">{card.voucher_count.toLocaleString()} vch</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stats?.tenants ?? 0}</span>
                <span className="flex items-center gap-1"><Home className="h-3 w-3" />{stats?.landlords ?? 0}</span>
                <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{stats?.staff ?? 0}</span>
              </>
            )}
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end gap-1 text-xs">
          <span className="font-semibold flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {c?.monthly_rate ? `${Number(c.monthly_rate).toLocaleString()}/mo` : '—'}
          </span>
          <span className="text-muted-foreground">
            {termSummary(c?.term_months)}{c?.contract_end ? ` · ends ${new Date(c.contract_end).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
          </span>
        </div>

        <div className="ml-2">{invoiceBadge(lastInv?.status)}</div>
      </button>

      {/* Expanded panel */}
      {open && agencyId && (
        <div className="border-t p-4 bg-muted/20 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContractCard agencyId={agencyId} contract={c} />

          {/* Billing card */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Receipt className="h-4 w-4 text-primary" /> Billing
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Monthly rate</Label>
                <Input
                  type="number"
                  className="h-9"
                  defaultValue={c?.monthly_rate ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    if (v !== c?.monthly_rate) updateBilling({ monthly_rate: v });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cycle</Label>
                <Select
                  value={c?.billing_cycle ?? 'monthly'}
                  onValueChange={(v) => updateBilling({ billing_cycle: v })}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Setup fee</Label>
                <Input
                  type="number"
                  className="h-9"
                  defaultValue={c?.setup_fee ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    if (v !== c?.setup_fee) updateBilling({ setup_fee: v });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Bill day</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  className="h-9"
                  defaultValue={c?.billing_day_of_month ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    if (v !== c?.billing_day_of_month) updateBilling({ billing_day_of_month: v });
                  }}
                />
              </div>
            </div>

            <div className="pt-2 border-t space-y-1">
              <Label className="text-xs text-muted-foreground">Recent invoices</Label>
              {(stats?.recentInvoices?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">No invoices yet.</p>
              ) : (
                <div className="space-y-1">
                  {stats!.recentInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono">{inv.invoice_number || inv.id.slice(0, 8)}</span>
                      <span className="text-muted-foreground">${Number(inv.amount || 0).toLocaleString()}</span>
                      {invoiceBadge(inv.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => generateInvoiceMut.mutate()}
              disabled={generateInvoiceMut.isPending}
            >
              {generateInvoiceMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Receipt className="h-3.5 w-3.5 mr-1" />}
              Generate next invoice
            </Button>
          </Card>

          {/* People card */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" /> People
            </div>
            <div className="text-xs space-y-1.5">
              <div>
                <div className="text-muted-foreground">Primary contact</div>
                <div className="font-medium">{card.contact_name || c?.billing_contact_name || '—'}</div>
                {(card.contact_email || c?.billing_contact_email) && (
                  <a href={`mailto:${card.contact_email || c?.billing_contact_email}`} className="text-primary inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />{card.contact_email || c?.billing_contact_email}
                  </a>
                )}
                {card.contact_phone && (
                  <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{card.contact_phone}</div>
                )}
              </div>
              {card.ed_name && card.ed_name !== card.contact_name && (
                <div className="pt-1 border-t">
                  <div className="text-muted-foreground">Executive Director</div>
                  <div className="font-medium">{card.ed_name}</div>
                </div>
              )}
              <div className="pt-1 border-t">
                <div className="text-muted-foreground mb-1">Staff ({stats?.staff ?? 0})</div>
                {Object.keys(stats?.staffByRole || {}).length === 0 ? (
                  <span className="text-muted-foreground">No active staff</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(stats!.staffByRole).map(([role, n]) => (
                      <Badge key={role} variant="outline" className="text-[10px]">
                        {role.replace(/_/g, ' ')} · {n}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {c?.po_number && (
                <div className="pt-1 border-t">
                  <span className="text-muted-foreground">PO: </span><span className="font-mono">{c.po_number}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Quick links */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-primary" /> Quick links
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate(`/admin/agencies/${agencyId}`)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open agency dashboard
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate(`/admin/agencies/${agencyId}?as_agency=1`)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open as agency
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate(`/admin/agencies?intake=${agencyId}`)}
            >
              <FileText className="h-3.5 w-3.5 mr-2" /> Intake hub
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Off-board ${card.agency_name}? This is reversible.`)) offboardMut.mutate();
              }}
              disabled={offboardMut.isPending}
            >
              <Power className="h-3.5 w-3.5 mr-2" /> Off-board (reversible)
            </Button>
          </Card>
        </div>
      )}
    </Card>
  );
};
