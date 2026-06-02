import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Building2, CheckCircle2, ExternalLink, Shield,
  Users, Home, Wrench, FileText, StickyNote, DollarSign, Send, Rocket, Circle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PipelineCard } from './usePipelineData';
import { ConvertToCustomerWizard } from './ConvertToCustomerWizard';
import { GrantAdminAccessDialog } from './GrantAdminAccessDialog';
import { StageNotePopover } from './StageNotePopover';

interface Props {
  card: PipelineCard;
}

const SALES_STEPS = ['Plan', 'Modules', 'Integrations', 'Contacts', 'Provision', 'Agreement'];
const PROVISIONING_STEPS = ['Welcome', 'Branding', 'Staff', 'Caseload', 'Notifications', 'Payments', 'Go Live'];
const DATA_LOAD_KINDS: Array<{ kind: string; label: string; icon: React.ElementType }> = [
  { kind: 'staff', label: 'Staff', icon: Users },
  { kind: 'landlords', label: 'Landlords', icon: Home },
  { kind: 'tenants', label: 'Tenants', icon: Users },
  { kind: 'vouchers', label: 'Vouchers', icon: FileText },
  { kind: 'inspectors', label: 'Inspectors', icon: Wrench },
];

function ProgressBar({ value, total, color = 'bg-primary' }: { value: number; total: number; color?: string }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const OnboardingHubRow: React.FC<Props> = ({ card }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [convertOpen, setConvertOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  const salesStep = card.conversion_step ?? 0;

  // Provisioning progress (the agency-side wizard)
  const { data: prov } = useQuery({
    queryKey: ['onboarding-progress', card.housing_authority_id],
    queryFn: async () => {
      if (!card.housing_authority_id) return null;
      const { data } = await supabase
        .from('agency_onboarding_progress')
        .select('current_step, completed_steps, is_completed')
        .eq('agency_id', card.housing_authority_id)
        .maybeSingle();
      return data;
    },
    enabled: !!card.housing_authority_id,
  });

  const provDone = (prov?.completed_steps?.length || 0);
  const provTotal = PROVISIONING_STEPS.length;

  // Data load progress (intake files imported per kind)
  const { data: intake = [] } = useQuery({
    queryKey: ['intake-progress', card.housing_authority_id],
    queryFn: async () => {
      if (!card.housing_authority_id) return [];
      const { data } = await supabase
        .from('agency_intake_files')
        .select('kind, status')
        .eq('agency_id', card.housing_authority_id);
      return data || [];
    },
    enabled: !!card.housing_authority_id,
  });

  const dataLoadDone = DATA_LOAD_KINDS.filter((k) =>
    intake.some((f: any) => f.kind === k.kind && f.status === 'imported')
  ).length;

  // Billing: contract + most recent invoice
  const { data: billing } = useQuery({
    queryKey: ['billing-status', card.housing_authority_id],
    queryFn: async () => {
      if (!card.housing_authority_id) return null;
      const [{ data: contracts }, { data: invoices }] = await Promise.all([
        supabase.from('agency_contracts').select('id, status, monthly_rate, last_invoice_id').eq('agency_id', card.housing_authority_id).order('created_at', { ascending: false }).limit(1),
        supabase.from('agency_invoices').select('id, status, amount, invoice_number, due_date, public_token').eq('agency_id', card.housing_authority_id).order('created_at', { ascending: false }).limit(1),
      ]);
      return { contract: contracts?.[0] || null, invoice: invoices?.[0] || null };
    },
    enabled: !!card.housing_authority_id,
  });

  // Admin staff count (for "Admin invited" readiness check)
  const { data: staffCount = 0 } = useQuery({
    queryKey: ['agency-admin-count', card.housing_authority_id],
    queryFn: async () => {
      if (!card.housing_authority_id) return 0;
      const { count } = await supabase.from('agency_staff').select('id', { count: 'exact', head: true }).eq('agency_id', card.housing_authority_id).eq('is_active', true);
      return count || 0;
    },
    enabled: !!card.housing_authority_id,
  });

  const checks = {
    contract: billing?.contract?.status === 'active',
    invoice_paid: billing?.invoice?.status === 'paid',
    admin: staffCount > 0,
    provisioning: !!prov?.is_completed,
    data: dataLoadDone > 0,
  };
  const allReady = Object.values(checks).every(Boolean);

  const generateInvoice = useMutation({
    mutationFn: async () => {
      if (!billing?.contract?.id) throw new Error('No contract');
      const { data, error } = await supabase.functions.invoke('generate-agency-invoice', {
        body: { contract_id: billing.contract.id },
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || 'Failed');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Invoice generated', description: 'Emailed to billing contact.' });
      qc.invalidateQueries({ queryKey: ['billing-status', card.housing_authority_id] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      if (!billing?.invoice?.id) throw new Error('No invoice');
      const { error } = await supabase.from('agency_invoices').update({
        status: 'paid', paid_date: new Date().toISOString().slice(0, 10), paid_method: 'manual',
      }).eq('id', billing.invoice.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Marked paid' });
      qc.invalidateQueries({ queryKey: ['billing-status', card.housing_authority_id] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const markLive = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('agency-mark-live', {
        body: { agency_id: card.housing_authority_id },
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || 'Not ready');
      return data;
    },
    onSuccess: () => {
      toast({ title: '🚀 Agency is live', description: card.agency_name });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{card.agency_name}</h3>
            <Badge variant="outline" className="text-[10px]">{card.agency_state}</Badge>
            {card.voucher_count != null && (
              <Badge variant="secondary" className="text-[10px]">{card.voucher_count} vouchers</Badge>
            )}
            <Badge className="bg-violet-500 text-white text-[10px]">{card.stage}</Badge>
          </div>
          {card.contact_email && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {card.contact_name || 'Primary contact'} · {card.contact_email}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <StageNotePopover
            source={card.source}
            recordId={card.id}
            stage="onboarding"
            trigger={<Button variant="outline" size="sm" className="h-7"><StickyNote className="h-3.5 w-3.5 mr-1" />Note</Button>}
          />
          <Button variant="outline" size="sm" className="h-7" onClick={() => setAccessOpen(true)}>
            <Shield className="h-3.5 w-3.5 mr-1" /> Grant access
          </Button>
          {card.housing_authority_id && (
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => window.open(`/agency/onboarding?agency_id=${card.housing_authority_id}`, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open as agency
            </Button>
          )}
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="flex items-center justify-between gap-2 flex-wrap rounded border bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">Readiness</span>
          {([
            ['Contract', checks.contract],
            ['Invoice paid', checks.invoice_paid],
            ['Admin invited', checks.admin],
            ['Provisioning', checks.provisioning],
            ['Data loaded', checks.data],
          ] as Array<[string, boolean]>).map(([label, ok]) => (
            <span key={label} className={`flex items-center gap-1 ${ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {label}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          className="h-7"
          disabled={!allReady || markLive.isPending || !card.housing_authority_id}
          onClick={() => markLive.mutate()}
        >
          <Rocket className="h-3.5 w-3.5 mr-1" /> Mark Live
        </Button>
      </div>

      {/* 3 columns: sales conversion → provisioning → data load */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Sales conversion */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sales conversion
            </span>
            <span className="text-xs font-medium">{salesStep}/{SALES_STEPS.length}</span>
          </div>
          <ProgressBar value={salesStep} total={SALES_STEPS.length} color="bg-blue-500" />
          <p className="text-xs text-muted-foreground">
            {salesStep >= SALES_STEPS.length
              ? '✓ Plan, modules, integrations, contacts, provisioning, and agreement captured.'
              : `Next: ${SALES_STEPS[salesStep] || 'done'}`}
          </p>
          <Button
            size="sm"
            variant={salesStep >= SALES_STEPS.length ? 'outline' : 'default'}
            className="w-full h-7"
            onClick={() => setConvertOpen(true)}
          >
            {salesStep === 0 ? 'Start' : salesStep >= SALES_STEPS.length ? 'Edit' : 'Resume'}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Provisioning */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Provisioning
            </span>
            <span className="text-xs font-medium">
              {prov?.is_completed ? <CheckCircle2 className="inline h-3.5 w-3.5 text-emerald-500" /> : `${provDone}/${provTotal}`}
            </span>
          </div>
          <ProgressBar value={provDone} total={provTotal} color="bg-violet-500" />
          <p className="text-xs text-muted-foreground">
            {prov?.is_completed
              ? '✓ Branding, staff, payments configured.'
              : prov ? `Next: ${PROVISIONING_STEPS[prov.current_step - 1] || 'Welcome'}` : 'Not started'}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7"
            disabled={!card.housing_authority_id}
            onClick={() => card.housing_authority_id && window.open(`/agency/onboarding?agency_id=${card.housing_authority_id}`, '_blank')}
          >
            Drive setup <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Data load */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Data load
            </span>
            <span className="text-xs font-medium">{dataLoadDone}/{DATA_LOAD_KINDS.length}</span>
          </div>
          <ProgressBar value={dataLoadDone} total={DATA_LOAD_KINDS.length} color="bg-emerald-500" />
          <div className="grid grid-cols-5 gap-1">
            {DATA_LOAD_KINDS.map((k) => {
              const done = intake.some((f: any) => f.kind === k.kind && f.status === 'imported');
              const pending = intake.some((f: any) => f.kind === k.kind && f.status !== 'imported' && f.status !== 'skipped');
              const Icon = k.icon;
              return (
                <div
                  key={k.kind}
                  className={`flex flex-col items-center gap-0.5 text-[9px] p-1 rounded border ${
                    done ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                    pending ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-muted/30 text-muted-foreground'
                  }`}
                  title={k.label}
                >
                  <Icon className="h-3 w-3" />
                  <span>{k.label}</span>
                </div>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7"
            disabled={!card.housing_authority_id}
            onClick={() => card.housing_authority_id && navigate(`/admin/agencies/${card.housing_authority_id}?tab=intake`)}
          >
            Manage uploads <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Billing */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Billing
            </span>
            <Badge variant={billing?.contract?.status === 'active' ? 'default' : 'secondary'} className="text-[9px]">
              {billing?.contract?.status || 'no contract'}
            </Badge>
          </div>
          <div className="text-xs space-y-0.5">
            {billing?.contract ? (
              <>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  ${Number(billing.contract.monthly_rate || 0).toLocaleString()}/mo
                </div>
                {billing.invoice ? (
                  <div className={`flex items-center gap-1 ${billing.invoice.status === 'paid' ? 'text-emerald-600' : billing.invoice.status === 'overdue' ? 'text-destructive' : 'text-amber-600'}`}>
                    <FileText className="h-3 w-3" />
                    {billing.invoice.invoice_number} · {billing.invoice.status}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No invoices yet</div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">Complete sales conversion to set up billing.</div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7"
              disabled={!billing?.contract || billing.contract.status !== 'active' || generateInvoice.isPending}
              onClick={() => generateInvoice.mutate()}
            >
              <Send className="h-3 w-3 mr-1" /> {billing?.invoice ? 'Next invoice' : 'Send invoice'}
            </Button>
            {billing?.invoice && billing.invoice.status !== 'paid' && (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>
                Mark paid
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer: jump to live agency */}
      {prov?.is_completed && card.housing_authority_id && (
        <div className="pt-2 border-t flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/agencies/${card.housing_authority_id}`)}>
            <Building2 className="h-3.5 w-3.5 mr-1" /> Open agency dashboard
          </Button>
        </div>
      )}

      <ConvertToCustomerWizard
        card={convertOpen ? card : null}
        open={convertOpen}
        onOpenChange={setConvertOpen}
        startStep={Math.max(1, Math.min(6, salesStep + 1))}
      />
      <GrantAdminAccessDialog
        open={accessOpen}
        onOpenChange={setAccessOpen}
        agencyId={card.housing_authority_id || ''}
        agencyName={card.agency_name}
        defaultEmail={card.contact_email || card.ed_email || ''}
        defaultFirstName={(card.contact_name || '').split(' ')[0]}
        defaultLastName={(card.contact_name || '').split(' ').slice(1).join(' ')}
      />
    </Card>
  );
};

export default OnboardingHubRow;
