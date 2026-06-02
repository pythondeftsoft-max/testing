import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, CheckCircle2, ChevronLeft, ChevronRight, FileText, Package,
  Plug, Users, Building2, FileSignature, Upload,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { computePricing, formatCurrency } from '@/lib/prospectPricing';
import { PLATFORM_MODULES, RECOMMENDED_MODULE_KEYS, modulesByCategory } from '@/lib/platformModules';
import { PLATFORM_INTEGRATIONS, integrationsByCategory } from '@/lib/platformIntegrations';
import type { PipelineCard } from './usePipelineData';

interface Props {
  card: PipelineCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startStep?: number;
}

const STEPS = [
  { id: 1, label: 'Plan & pricing', icon: FileText },
  { id: 2, label: 'Modules & scope', icon: Package },
  { id: 3, label: 'Integrations', icon: Plug },
  { id: 4, label: 'Contacts & billing', icon: Users },
  { id: 5, label: 'Provision agency', icon: Building2 },
  { id: 6, label: 'Agreement & kickoff', icon: FileSignature },
] as const;

const PLAN_TIERS = [
  { value: 'tiny', label: 'Tiny PHA (<250 vch)' },
  { value: 'small', label: 'Small (250–1K)' },
  { value: 'mid', label: 'Mid (1K–5K)' },
  { value: 'large', label: 'Large (5K–15K)' },
  { value: 'enterprise', label: 'Enterprise / MTW (15K+)' },
];

export function ConvertToCustomerWizard({ card, open, onOpenChange, startStep = 1 }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(startStep);

  // Suggested pricing (monthly)
  const suggested = useMemo(() => {
    if (!card) return null;
    const enr = card.enrichment;
    const leased = enr?.leased_units ?? card.voucher_count ?? null;
    return computePricing({
      adminFeeColA: enr?.admin_fee_col_a ?? null,
      adminFeeColB: enr?.admin_fee_col_b ?? null,
      leasedUnits: leased,
      isMtw: enr?.is_mtw ?? false,
      fallbackAdminBudget: enr?.estimated_admin_budget_annual ?? null,
      override: card.pricing_override ?? null,
    });
  }, [card]);

  // ===== Step 1: Plan & pricing =====
  const [planTier, setPlanTier] = useState<string>('small');
  const [monthlyRate, setMonthlyRate] = useState<number>(0);
  const [billingCycle, setBillingCycle] = useState<string>('monthly');
  const [termMonths, setTermMonths] = useState<number>(12);
  const [contractStart, setContractStart] = useState<string>('');
  const [contractEnd, setContractEnd] = useState<string>('');
  const [setupFee, setSetupFee] = useState<number>(0);
  const [poNumber, setPoNumber] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30');

  // ===== Step 2: Modules =====
  const [selectedModules, setSelectedModules] = useState<string[]>(RECOMMENDED_MODULE_KEYS);

  // ===== Step 3: Integrations =====
  const [selectedIntegrations, setSelectedIntegrations] = useState<Record<string, boolean>>({});
  const [migrationScope, setMigrationScope] = useState<string>('');
  const [trainingPackage, setTrainingPackage] = useState<string>('Standard (3 sessions)');

  // ===== Step 4: Contacts =====
  const [primaryName, setPrimaryName] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryTitle, setPrimaryTitle] = useState('Executive Director');
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

  // ===== Step 5: Provision =====
  const [agencySlug, setAgencySlug] = useState('');
  const [provisionedAgencyId, setProvisionedAgencyId] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);

  // ===== Step 6: Agreement & kickoff =====
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [signedAt, setSignedAt] = useState<string>('');
  const [goLiveDate, setGoLiveDate] = useState<string>('');
  const [conversionOwner, setConversionOwner] = useState<string>('');
  const [sendInvite, setSendInvite] = useState(true);
  const [inviteSubject, setInviteSubject] = useState('');
  const [inviteBody, setInviteBody] = useState('');
  const [customTerms, setCustomTerms] = useState('');

  // Reset on open
  useEffect(() => {
    if (!card || !open) return;
    setStep(startStep);
    // Pricing — convert annual proposal → monthly if needed; otherwise use suggested monthly
    const initialMonthly = card.proposal_amount
      ? Number(card.proposal_amount) // assume already monthly going forward
      : suggested?.suggestedMonthly ?? 0;
    setMonthlyRate(Math.round(initialMonthly));
    setPlanTier(suggested?.tier && suggested.tier !== 'unknown' ? suggested.tier : 'small');
    setBillingCycle('monthly');
    setTermMonths(12);
    const today = new Date();
    setContractStart(today.toISOString().slice(0, 10));
    const end = new Date(today);
    end.setMonth(end.getMonth() + 12);
    setContractEnd(end.toISOString().slice(0, 10));
    setSetupFee(0);
    setPoNumber('');
    setPaymentTerms('Net 30');

    setSelectedModules(RECOMMENDED_MODULE_KEYS);
    setSelectedIntegrations({});
    setMigrationScope('');
    setTrainingPackage('Standard (3 sessions)');

    setPrimaryName(card.contact_name || card.ed_name || '');
    setPrimaryEmail(card.contact_email || card.ed_email || '');
    setPrimaryPhone(card.contact_phone || card.ed_phone || '');
    setPrimaryTitle('Executive Director');
    setBillingName(card.contact_name || card.ed_name || '');
    setBillingEmail(card.contact_email || card.ed_email || '');

    const slug = (card.agency_name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || `agency-${Date.now()}`;
    setAgencySlug(slug);
    setProvisionedAgencyId(card.housing_authority_id ?? null);
    setContractId(null);

    setSignedFile(null);
    setSignedAt(today.toISOString().slice(0, 10));
    const plus30 = new Date();
    plus30.setDate(plus30.getDate() + 30);
    setGoLiveDate(plus30.toISOString().slice(0, 10));
    setSendInvite(true);
    setInviteSubject(`Welcome to OpenKey, ${card.agency_name}`);
    setInviteBody(
      `Hi ${card.contact_name || card.ed_name || 'team'},\n\n` +
      `Welcome to OpenKey! We're thrilled to partner with ${card.agency_name}.\n\n` +
      `Your dedicated onboarding owner will reach out within 1 business day to schedule kickoff. ` +
      `In the meantime, your admin login link is in the next email.\n\n— The OpenKey team`
    );
    setCustomTerms('');
    supabase.auth.getUser().then(({ data }) => setConversionOwner(data.user?.id ?? ''));
  }, [card, open, startStep, suggested?.suggestedMonthly, suggested?.tier]);

  const annualValue = monthlyRate * 12;

  // Persist progress
  const saveProgress = async (toStep: number) => {
    if (!card) return;
    const updates: any = { conversion_step: toStep };
    if (toStep === 1 && !card.conversion_step) {
      updates.conversion_started_at = new Date().toISOString();
    }
    if (toStep === 6) {
      updates.conversion_completed_at = new Date().toISOString();
    }
    if (conversionOwner) updates.conversion_owner_user_id = conversionOwner;
    const table = card.source === 'lead' ? 'agency_leads' : 'pha_prospect_status';
    await (supabase as any).from(table).update(updates).eq('id', card.id);
  };

  // ===== Step 1: Save plan & pricing → agency_contracts =====
  const savePlan = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error('No card');
      const { data: { user } } = await supabase.auth.getUser();
      const insertPayload: any = {
        agency_id: provisionedAgencyId, // may still be null for inbound leads
        source_lead_id: card.source === 'lead' ? card.id : null,
        source_prospect_id: card.source === 'prospect' ? card.id : null,
        plan_tier: planTier,
        monthly_rate: monthlyRate,
        setup_fee: setupFee,
        billing_cycle: billingCycle,
        term_months: termMonths,
        contract_start: contractStart || null,
        contract_end: contractEnd || null,
        payment_terms: paymentTerms,
        po_number: poNumber || null,
        status: 'pending',
        created_by: user?.id ?? null,
      };
      let id = contractId;
      if (id) {
        const { error } = await (supabase as any).from('agency_contracts').update(insertPayload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from('agency_contracts').insert(insertPayload).select('id').single();
        if (error) throw error;
        id = data.id;
        setContractId(id);
      }
      // Mirror monthly rate onto the deal so the pipeline list shows it immediately
      if (card.source === 'lead') {
        await supabase.from('agency_leads').update({ proposal_amount: monthlyRate }).eq('id', card.id);
      }
      await saveProgress(1);
    },
    onSuccess: () => {
      toast({
        title: 'Plan saved',
        description: `${formatCurrency(monthlyRate)}/mo · ${termMonths}-month term`,
      });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      setStep(2);
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  // ===== Step 2-3: Save modules + integrations into addendum =====
  const saveAddendum = useMutation({
    mutationFn: async (advanceTo: number) => {
      if (!contractId) {
        // No contract yet — bounce back to step 1
        throw new Error('Save plan first');
      }
      const payload: any = {
        contract_id: contractId,
        modules_included: selectedModules,
        integrations: selectedIntegrations,
        data_migration_scope: migrationScope || null,
        training_package: trainingPackage || null,
      };
      // Upsert
      const { data: existing } = await (supabase as any)
        .from('agency_contract_addendum')
        .select('id')
        .eq('contract_id', contractId)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await (supabase as any)
          .from('agency_contract_addendum')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_contract_addendum').insert(payload);
        if (error) throw error;
      }
      await saveProgress(advanceTo);
    },
    onSuccess: (_d, advanceTo) => {
      toast({ title: 'Saved', description: `Step ${advanceTo} complete` });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      setStep(advanceTo + 1);
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  // ===== Step 4: Save contacts =====
  const saveContacts = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error('No card');
      // Update billing contact on contract
      if (contractId) {
        await (supabase as any).from('agency_contracts').update({
          billing_contact_name: billingName || null,
          billing_contact_email: billingEmail || null,
        }).eq('id', contractId);
      }
      await saveProgress(4);
    },
    onSuccess: () => {
      toast({ title: 'Contacts saved' });
      setStep(5);
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  // ===== Step 5: Provision agency =====
  const provisionAgency = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error('No card');
      let agencyId = provisionedAgencyId;
      if (!agencyId) {
        const { data, error } = await supabase.from('housing_authorities').insert({
          name: card.agency_name,
          slug: agencySlug,
          state: card.agency_state,
          is_onboarded: false,
        } as any).select('id').single();
        if (error) throw error;
        agencyId = data.id;
        setProvisionedAgencyId(agencyId);
      }

      if (contractId && agencyId) {
        await (supabase as any).from('agency_contracts').update({ agency_id: agencyId }).eq('id', contractId);
      }

      // Primary CRM contact
      if (primaryEmail) {
        await (supabase as any).from('agency_crm_contacts').insert({
          agency_id: agencyId,
          name: primaryName,
          email: primaryEmail,
          phone: primaryPhone,
          title: primaryTitle,
          is_primary: true,
        });
      }
      if (billingEmail && billingEmail !== primaryEmail) {
        await (supabase as any).from('agency_crm_contacts').insert({
          agency_id: agencyId,
          name: billingName,
          email: billingEmail,
          title: 'Billing',
          is_primary: false,
        });
      }

      // Pre-seed onboarding progress with modules + integrations
      const { data: existing } = await (supabase as any)
        .from('agency_onboarding_progress')
        .select('id')
        .eq('agency_id', agencyId)
        .maybeSingle();
      const stepData = {
        modules_included: selectedModules,
        integrations: selectedIntegrations,
        plan_tier: planTier,
        monthly_rate: monthlyRate,
        primary_contact: { name: primaryName, email: primaryEmail, phone: primaryPhone },
      };
      if (!existing) {
        await (supabase as any).from('agency_onboarding_progress').insert({
          agency_id: agencyId,
          current_step: 1,
          completed_steps: [],
          step_data: stepData,
          is_completed: false,
        });
      } else {
        await (supabase as any).from('agency_onboarding_progress').update({ step_data: stepData }).eq('id', existing.id);
      }

      // Link converted_agency_id for inbound leads, flip stage to onboarding
      if (card.source === 'lead') {
        await supabase.from('agency_leads').update({
          converted_agency_id: agencyId,
          converted_at: new Date().toISOString(),
          status: 'onboarding' as any,
        }).eq('id', card.id);
      } else {
        await supabase.from('pha_prospect_status').update({ status: 'onboarding' as any }).eq('id', card.id);
      }

      await saveProgress(5);
    },
    onSuccess: () => {
      toast({ title: 'Agency provisioned', description: `${card?.agency_name} is live in admin` });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      setStep(6);
    },
    onError: (e: any) => toast({ title: 'Provision failed', description: e.message, variant: 'destructive' }),
  });

  // ===== Step 6: Upload signed agreement, queue welcome, finalize =====
  const finalizeKickoff = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error('No card');
      if (!provisionedAgencyId) throw new Error('Agency not provisioned — go back to step 5');
      if (!contractId) throw new Error('Contract missing — go back to step 1');

      let signedUrl: string | null = null;
      if (signedFile) {
        const path = `${provisionedAgencyId}/${Date.now()}_${signedFile.name}`;
        const { error: upErr } = await supabase.storage
          .from('signed-agreements')
          .upload(path, signedFile, { upsert: false });
        if (upErr) throw upErr;
        signedUrl = path;
      }

      await (supabase as any).from('agency_contracts').update({
        status: 'active',
        signed_pdf_url: signedUrl,
        signed_at: signedAt || new Date().toISOString(),
        go_live_date: goLiveDate || null,
        onboarding_owner_user_id: conversionOwner || null,
      }).eq('id', contractId);

      // Save custom terms in addendum
      if (customTerms) {
        await (supabase as any).from('agency_contract_addendum').update({ custom_terms: customTerms }).eq('contract_id', contractId);
      }

      // Queue welcome email
      if (sendInvite && primaryEmail) {
        try {
          await (supabase as any).from('email_queue').insert({
            to_email: primaryEmail,
            subject: inviteSubject,
            body_html: inviteBody.replace(/\n/g, '<br/>'),
            body_text: inviteBody,
            status: 'pending',
            related_agency_id: provisionedAgencyId,
            template_key: 'agency_welcome',
          });
        } catch (e) {
          console.warn('[wizard] email_queue insert failed (non-fatal)', e);
        }
      }

      await saveProgress(6);
    },
    onSuccess: () => {
      toast({ title: 'Conversion complete', description: 'Opening agency workspace…' });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      onOpenChange(false);
      if (provisionedAgencyId) navigate(`/admin/agencies/${provisionedAgencyId}`);
    },
    onError: (e: any) => toast({ title: 'Finalize failed', description: e.message, variant: 'destructive' }),
  });

  if (!card) return null;

  const moduleCats = modulesByCategory();
  const integCats = integrationsByCategory();
  const stepDone = (n: number) => (card.conversion_step ?? 0) >= n;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Convert to customer
            <Badge variant="outline">{card.agency_name}</Badge>
            {card.agency_state && <Badge variant="outline">{card.agency_state}</Badge>}
            {card.voucher_count != null && (
              <Badge variant="secondary">{card.voucher_count.toLocaleString()} vch</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Stepper */}
          <div className="w-48 shrink-0 border-r pr-3 space-y-1">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = stepDone(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Icon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{s.id}. {s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Step body */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {/* ===== STEP 1: PLAN & PRICING ===== */}
            {step === 1 && (
              <>
                <div>
                  <h3 className="font-semibold text-base">Plan & pricing</h3>
                  <p className="text-xs text-muted-foreground">
                    {suggested?.hasData
                      ? `Suggested: ${formatCurrency(suggested.suggestedMonthly)}/mo (${suggested.benchmarkRange})`
                      : 'No HUD pricing data available — enter manually.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Plan tier</Label>
                    <Select value={planTier} onValueChange={setPlanTier}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLAN_TIERS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Monthly rate ($)</Label>
                    <Input
                      type="number"
                      value={monthlyRate}
                      onChange={(e) => setMonthlyRate(Number(e.target.value) || 0)}
                    />
                    {card.voucher_count ? (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ${(monthlyRate / card.voucher_count).toFixed(2)}/vch/mo · {formatCurrency(annualValue)}/yr
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatCurrency(annualValue)}/yr</p>
                    )}
                  </div>
                  <div>
                    <Label>Billing cycle</Label>
                    <Select value={billingCycle} onValueChange={setBillingCycle}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual (1 invoice)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Term (months)</Label>
                    <Input
                      type="number"
                      value={termMonths}
                      onChange={(e) => setTermMonths(Number(e.target.value) || 12)}
                    />
                  </div>
                  <div>
                    <Label>Contract start</Label>
                    <Input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>Contract end</Label>
                    <Input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} />
                  </div>
                  <div>
                    <Label>Setup fee ($)</Label>
                    <Input
                      type="number"
                      value={setupFee}
                      onChange={(e) => setSetupFee(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Payment terms</Label>
                    <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 30" />
                  </div>
                  <div className="col-span-2">
                    <Label>PO number (optional)</Label>
                    <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PHA purchase order" />
                  </div>
                </div>
              </>
            )}

            {/* ===== STEP 2: MODULES ===== */}
            {step === 2 && (
              <>
                <div>
                  <h3 className="font-semibold text-base">Modules included</h3>
                  <p className="text-xs text-muted-foreground">
                    Select what the agency gets access to. {selectedModules.length}/{PLATFORM_MODULES.length} selected.
                  </p>
                </div>
                <div className="space-y-3">
                  {moduleCats.map(([cat, mods]) => (
                    <div key={cat} className="rounded border p-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">{cat}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {mods.map((m) => (
                          <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={selectedModules.includes(m.key)}
                              onCheckedChange={(v) => {
                                setSelectedModules((prev) =>
                                  v ? [...prev, m.key] : prev.filter((k) => k !== m.key)
                                );
                              }}
                            />
                            <span className="flex-1">{m.label}</span>
                            {m.recommended && <Badge variant="outline" className="text-[9px] h-4 px-1">rec</Badge>}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== STEP 3: INTEGRATIONS ===== */}
            {step === 3 && (
              <>
                <div>
                  <h3 className="font-semibold text-base">Integrations & data migration</h3>
                  <p className="text-xs text-muted-foreground">
                    What external systems does this PHA need wired up?
                  </p>
                </div>
                <div className="space-y-3">
                  {integCats.map(([cat, items]) => (
                    <div key={cat} className="rounded border p-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">{cat}</div>
                      <div className="space-y-1.5">
                        {items.map((i) => (
                          <label key={i.key} className="flex items-start gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={!!selectedIntegrations[i.key]}
                              onCheckedChange={(v) => {
                                setSelectedIntegrations((prev) => ({ ...prev, [i.key]: !!v }));
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <div>{i.label}</div>
                              <div className="text-[11px] text-muted-foreground">{i.description}{i.setupNote ? ` · ${i.setupNote}` : ''}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <Label>Data migration notes</Label>
                    <Textarea
                      value={migrationScope}
                      onChange={(e) => setMigrationScope(e.target.value)}
                      placeholder="Volumes, source format, cutover plan, deduplication needs…"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Training package</Label>
                    <Select value={trainingPackage} onValueChange={setTrainingPackage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self-serve docs">Self-serve docs</SelectItem>
                        <SelectItem value="Standard (3 sessions)">Standard (3 sessions)</SelectItem>
                        <SelectItem value="Premium (6 sessions + on-site)">Premium (6 sessions + on-site)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* ===== STEP 4: CONTACTS ===== */}
            {step === 4 && (
              <>
                <div>
                  <h3 className="font-semibold text-base">Contacts & billing</h3>
                  <p className="text-xs text-muted-foreground">Primary contact gets the welcome email + admin invite.</p>
                </div>
                <div className="space-y-4">
                  <div className="rounded border p-3 space-y-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Primary admin contact</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Name</Label><Input value={primaryName} onChange={(e) => setPrimaryName(e.target.value)} /></div>
                      <div><Label>Title</Label><Input value={primaryTitle} onChange={(e) => setPrimaryTitle(e.target.value)} /></div>
                      <div><Label>Email</Label><Input type="email" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} /></div>
                      <div><Label>Phone</Label><Input value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="rounded border p-3 space-y-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Billing contact</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Name</Label><Input value={billingName} onChange={(e) => setBillingName(e.target.value)} /></div>
                      <div><Label>Email</Label><Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} /></div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ===== STEP 5: PROVISION ===== */}
            {step === 5 && (
              <>
                <div>
                  <h3 className="font-semibold text-base">Provision agency record</h3>
                  <p className="text-xs text-muted-foreground">
                    {provisionedAgencyId
                      ? 'Agency record exists — this links the contract, contacts, and seeds the onboarding checklist.'
                      : 'Creates the housing_authorities record, links the contract & contacts, seeds onboarding.'}
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Subdomain slug</Label>
                    <Input
                      value={agencySlug}
                      onChange={(e) => setAgencySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Will live at <code>{agencySlug}.openkeyhousing.com</code>.
                    </p>
                  </div>
                  {provisionedAgencyId && (
                    <div className="text-xs text-muted-foreground">
                      Linked agency ID: <code>{provisionedAgencyId}</code>
                    </div>
                  )}
                  <div className="rounded border p-3 bg-muted/30 text-xs space-y-1">
                    <div className="font-semibold">This step will:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      <li>{provisionedAgencyId ? 'Link' : 'Create'} the housing_authorities record</li>
                      <li>Attach the contract ({contractId ? 'saved' : 'NOT SAVED — go back to step 1'})</li>
                      <li>Insert primary + billing CRM contacts</li>
                      <li>Pre-seed agency_onboarding_progress with {selectedModules.length} modules + {Object.values(selectedIntegrations).filter(Boolean).length} integrations</li>
                      <li>Move deal stage to <strong>Onboarding</strong></li>
                    </ul>
                  </div>
                </div>
              </>
            )}

            {/* ===== STEP 6: AGREEMENT & KICKOFF ===== */}
            {step === 6 && (
              <>
                <div>
                  <h3 className="font-semibold text-base">Agreement & kickoff</h3>
                  <p className="text-xs text-muted-foreground">Upload signed PDF, set go-live, queue welcome.</p>
                </div>
                <div className="space-y-3">
                  <div className="rounded border-2 border-dashed p-4">
                    <Label className="flex items-center gap-1 mb-1">
                      <Upload className="h-3.5 w-3.5" /> Upload signed agreement (PDF)
                    </Label>
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setSignedFile(e.target.files?.[0] ?? null)}
                    />
                    {signedFile && (
                      <p className="text-[11px] text-muted-foreground mt-1">{signedFile.name} · {Math.round(signedFile.size / 1024)} KB</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Stored privately in <code>signed-agreements</code> bucket (admin-only).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Signed date</Label>
                      <Input type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
                    </div>
                    <div>
                      <Label>Go-live date</Label>
                      <Input type="date" value={goLiveDate} onChange={(e) => setGoLiveDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Custom terms / addendum notes</Label>
                    <Textarea
                      value={customTerms}
                      onChange={(e) => setCustomTerms(e.target.value)}
                      placeholder="Any negotiated terms outside the standard MSA…"
                      rows={2}
                    />
                  </div>
                  <div className="rounded border p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">Welcome email + admin invite</div>
                        <div className="text-[11px] text-muted-foreground">Sent to {primaryEmail || '(no primary email)'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
                        <span className="text-xs">{sendInvite ? 'Send' : 'Skip'}</span>
                      </div>
                    </div>
                    {sendInvite && (
                      <>
                        <div>
                          <Label>Subject</Label>
                          <Input value={inviteSubject} onChange={(e) => setInviteSubject(e.target.value)} />
                        </div>
                        <div>
                          <Label>Body</Label>
                          <Textarea value={inviteBody} onChange={(e) => setInviteBody(e.target.value)} rows={5} />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Primary admin login */}
                  <div className="rounded border p-3 space-y-2">
                    <div className="text-sm font-medium">Create primary admin login</div>
                    <div className="text-[11px] text-muted-foreground">
                      Issues an agency_admin login for {primaryEmail || '(no email)'} on {card.agency_name}.
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!primaryEmail || !provisionedAgencyId}
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase.functions.invoke('admin-user-operations', {
                              body: {
                                operation: 'invite_agency_staff',
                                agency_id: provisionedAgencyId,
                                email: primaryEmail,
                                first_name: primaryName.split(' ')[0],
                                last_name: primaryName.split(' ').slice(1).join(' '),
                                staff_role: 'agency_admin',
                                redirect_to: `${window.location.origin}/agency/onboarding?agency_id=${provisionedAgencyId}`,
                              },
                            });
                            if (error || !(data as any)?.success) throw new Error((data as any)?.error || error?.message);
                            toast({ title: 'Invite sent', description: primaryEmail });
                          } catch (e: any) {
                            toast({ title: 'Invite failed', description: e.message, variant: 'destructive' });
                          }
                        }}
                      >
                        Send email invite
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!primaryEmail || !provisionedAgencyId}
                        onClick={async () => {
                          const tmp = `OK-${Math.random().toString(36).slice(2, 10)}-${Math.floor(Math.random() * 9999)}`;
                          try {
                            const { data, error } = await supabase.functions.invoke('admin-user-operations', {
                              body: {
                                operation: 'create_agency_staff_with_password',
                                agency_id: provisionedAgencyId,
                                email: primaryEmail,
                                password: tmp,
                                first_name: primaryName.split(' ')[0],
                                last_name: primaryName.split(' ').slice(1).join(' '),
                                staff_role: 'agency_admin',
                              },
                            });
                            if (error || !(data as any)?.success) throw new Error((data as any)?.error || error?.message);
                            await navigator.clipboard.writeText(`Email: ${primaryEmail}\nTemp password: ${tmp}`);
                            toast({ title: 'Login created', description: `Temp password copied — ${tmp}` });
                          } catch (e: any) {
                            toast({ title: 'Failed', description: e.message, variant: 'destructive' });
                          }
                        }}
                      >
                        Set temp password
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</div>
          <div className="flex gap-2">
            {step === 1 && (
              <Button size="sm" onClick={() => savePlan.mutate()} disabled={savePlan.isPending || monthlyRate <= 0}>
                {savePlan.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Save & continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button size="sm" onClick={() => saveAddendum.mutate(2)} disabled={saveAddendum.isPending || !contractId}>
                {saveAddendum.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Save & continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button size="sm" onClick={() => saveAddendum.mutate(3)} disabled={saveAddendum.isPending || !contractId}>
                {saveAddendum.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Save & continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 4 && (
              <Button size="sm" onClick={() => saveContacts.mutate()} disabled={saveContacts.isPending}>
                {saveContacts.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Save & continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 5 && (
              <Button size="sm" onClick={() => provisionAgency.mutate()} disabled={provisionAgency.isPending || !contractId}>
                {provisionAgency.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Provision agency <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 6 && (
              <Button size="sm" onClick={() => finalizeKickoff.mutate()} disabled={finalizeKickoff.isPending}>
                {finalizeKickoff.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Finalize & open agency
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
