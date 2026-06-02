import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, Trash2, Shield, Timer, Beaker, ExternalLink, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface SeededAgency { id: string; name: string; size?: string; }
interface RlsCheck { name: string; passed: boolean; detail: string; }

type SizeKey = 'micro' | 'small' | 'mid' | 'large' | 'mega' | 'stress';
const SIZE_DEFS: { key: SizeKey; label: string; tenants: string; async: boolean }[] = [
  { key: 'micro',  label: 'Micro',  tenants: '~50 tenants',     async: false },
  { key: 'small',  label: 'Small',  tenants: '~250 tenants',    async: false },
  { key: 'mid',    label: 'Mid',    tenants: '~1.5k tenants',   async: false },
  { key: 'large',  label: 'Large',  tenants: '~8k tenants',     async: true },
  { key: 'mega',   label: 'Mega',   tenants: '~50k tenants',    async: true },
  { key: 'stress', label: 'Stress', tenants: '~250k tenants',   async: true },
];

interface WorkflowDef { key: string; label: string; route: string; }
const WORKFLOWS: WorkflowDef[] = [
  { key: 'onboard',          label: 'Agency onboarding wizard',          route: '/agency/onboarding' },
  { key: 'csv_import',       label: 'CSV import (caseload)',             route: '/agency?tab=tenants&sub=import' },
  { key: 'waitlist_intake',  label: 'Waitlist intake + embed',           route: '/agency?tab=waitlist' },
  { key: 'landlord_onboard', label: 'Landlord onboarding (Path A/B/C)',  route: '/agency?tab=landlords' },
  { key: 'rfta',             label: 'RFTA workflow',                     route: '/agency?tab=landlords&sub=rfta' },
  { key: 'inspection',       label: 'Inspection schedule + complete',    route: '/agency?tab=compliance&sub=inspections' },
  { key: 'hap_batch',        label: 'HAP batch full lifecycle',          route: '/agency?tab=finance&sub=hap-batches' },
  { key: 'special_claim',    label: 'Special claim review',              route: '/agency?tab=finance&sub=special-claims' },
  { key: 'recert',           label: 'Recertification flow',              route: '/agency?tab=tenants&sub=recerts' },
  { key: 'port_out',         label: 'Port out (HUD-52665)',              route: '/agency?tab=tenants&sub=porting' },
  { key: 'port_in',          label: 'Port in (absorb / bill)',           route: '/agency?tab=tenants&sub=porting' },
  { key: 'grievance',        label: 'Grievance hearing',                 route: '/agency?tab=compliance&sub=grievances' },
  { key: 'repayment',        label: 'Repayment agreement',               route: '/agency?tab=finance&sub=repayments' },
  { key: 'pic_transmit',     label: 'PIC transmit (SFTP)',               route: '/agency?tab=compliance&sub=pic' },
  { key: 'semap',            label: 'SEMAP calc + designation',          route: '/agency?tab=compliance&sub=semap' },
];

const MANUAL_ITEMS = [
  { key: 'external_waitlist', label: 'Submit a waitlist app from outside (incognito)' },
  { key: 'embed_test',        label: 'Embed waitlist form on a test external page' },
  { key: 'merge_2_phas',      label: 'Landlord merge across 2 PHAs (duplicate email)' },
  { key: 'multi_property',    label: 'Multi-property landlord across 3 PHAs (single account)' },
  { key: 'tenant_merge',      label: 'Tenant identity merge via claim token' },
  { key: 'tenant_port',       label: 'Tenant port end-to-end (Alpha → Beta absorb)' },
  { key: 'disbursement_loop', label: 'Disbursement loop end-to-end (NACHA + Checkbook + ACK)' },
];

const MultiAgencyQa: React.FC = () => {
  // Legacy quick-seed state (kept)
  const [seeding, setSeeding] = useState(false);
  const [agencies, setAgencies] = useState<SeededAgency[]>([]);
  const [rlsResults, setRlsResults] = useState<RlsCheck[]>([]);
  const [perfMs, setPerfMs] = useState<number | null>(null);
  const [tearing, setTearing] = useState(false);

  // Portfolio harness state
  const [sizeMix, setSizeMix] = useState<Record<SizeKey, number>>({
    micro: 0, small: 0, mid: 0, large: 0, mega: 0, stress: 0,
  });
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [activeRun, setActiveRun] = useState<any | null>(null);

  // Workflow walker state
  const [walkRunId, setWalkRunId] = useState<string | null>(null);
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});
  const [stageBusy, setStageBusy] = useState<string | null>(null);
  const [stageResults, setStageResults] = useState<Record<string, { passed: boolean; ts: string }>>({});

  // Manual checklist state
  const [manualState, setManualState] = useState<Record<string, { passed: boolean; notes: string; saved?: boolean }>>(
    Object.fromEntries(MANUAL_ITEMS.map(i => [i.key, { passed: false, notes: '' }]))
  );
  const [manualSavingKey, setManualSavingKey] = useState<string | null>(null);

  // ---------- Legacy seed/teardown ----------
  const seed = async () => {
    setSeeding(true);
    const { data, error } = await supabase.functions.invoke('seed-demo-data', { body: { mode: 'multi_agency' } });
    setSeeding(false);
    if (error || !data?.success) {
      toast.error(error?.message || data?.error || 'Seed failed');
      return;
    }
    setAgencies(data.agencies || []);
    toast.success(`Seeded ${data.agencies?.length || 0} demo PHAs`);
  };

  const runRlsChecks = async () => {
    if (agencies.length < 2) { toast.error('Seed multi-agency first'); return; }
    const checks: RlsCheck[] = [];
    const [a, b] = agencies;
    const { data: aRows } = await supabase.from('agency_hap_contracts').select('id, agency_id').eq('agency_id', a.id);
    const leakedToA = (aRows || []).filter(r => r.agency_id !== a.id);
    checks.push({
      name: `HAP contracts isolation (${a.name})`,
      passed: leakedToA.length === 0,
      detail: leakedToA.length === 0 ? `${aRows?.length || 0} rows, all scoped` : `LEAK: ${leakedToA.length} foreign rows`,
    });
    const { data: bLandlords } = await supabase.from('agency_landlords').select('id, agency_id, landlord_email').eq('agency_id', b.id);
    const leakedToB = (bLandlords || []).filter(r => r.agency_id !== b.id);
    checks.push({
      name: `Landlord isolation (${b.name})`,
      passed: leakedToB.length === 0,
      detail: leakedToB.length === 0 ? `${bLandlords?.length || 0} rows, all scoped` : `LEAK: ${leakedToB.length} foreign rows`,
    });
    const { data: shared } = await supabase.from('agency_landlords').select('agency_id').eq('landlord_email', 'shared+multi@openkey.dev');
    const uniqueAgencies = new Set((shared || []).map(s => s.agency_id));
    checks.push({
      name: 'Shared landlord across PHAs (porting scenario)',
      passed: uniqueAgencies.size >= 2,
      detail: `Registered to ${uniqueAgencies.size} agencies`,
    });
    setRlsResults(checks);
  };

  const runPerf = async () => {
    const t0 = performance.now();
    await Promise.all(agencies.map(a =>
      supabase.from('agency_hap_contracts').select('id, gross_rent, hap_amount').eq('agency_id', a.id).limit(500)
    ));
    setPerfMs(Math.round(performance.now() - t0));
  };

  const teardown = async () => {
    if (!confirm('Delete ALL QA-Demo + QA-Port agencies and their data?')) return;
    setTearing(true);
    const { data, error } = await supabase.functions.invoke('seed-demo-data', { body: { mode: 'teardown_multi' } });
    setTearing(false);
    if (error || !data?.success) {
      toast.error(error?.message || data?.error || 'Teardown failed');
      return;
    }
    setAgencies([]); setRlsResults([]); setPerfMs(null); setActiveRun(null);
    toast.success(`Removed ${data.removed} demo agencies`);
  };

  // ---------- Portfolio seed ----------
  const totalAgencies = Object.values(sizeMix).reduce((a, b) => a + b, 0);
  const isAsync = sizeMix.large + sizeMix.mega + sizeMix.stress > 0;

  const seedPortfolio = async () => {
    if (totalAgencies === 0) { toast.error('Pick at least one size'); return; }
    setPortfolioLoading(true);
    const { data, error } = await supabase.functions.invoke('seed-demo-data', {
      body: { mode: 'portfolio', sizes: sizeMix },
    });
    setPortfolioLoading(false);
    if (error || !data?.success) {
      // For async, success may be true without summary — show different message
      if (!data?.async) {
        toast.error(error?.message || data?.error || 'Portfolio seed failed');
        return;
      }
    }
    if (data?.run_id) {
      setWalkRunId(data.run_id);
      pollRun(data.run_id);
      toast.success(data.async ? 'Portfolio seeding in background…' : 'Portfolio seeded');
    }
  };

  const pollRun = useCallback((runId: string) => {
    let cancelled = false;
    const tick = async () => {
      const { data } = await supabase.from('qa_pipeline_runs').select('*').eq('id', runId).single();
      if (cancelled || !data) return;
      setActiveRun(data);
      if (data.status === 'running') setTimeout(tick, 2500);
    };
    tick();
    return () => { cancelled = true; };
  }, []);

  // Load latest run on mount so reload preserves context
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('qa_pipeline_runs')
        .select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        setActiveRun(data);
        setWalkRunId(data.id);
        if (data.status === 'running') pollRun(data.id);
      }
      const { data: manual } = await supabase.from('qa_manual_runs')
        .select('item_key, passed, notes').order('updated_at', { ascending: false }).limit(50);
      if (manual) {
        const seen = new Set<string>();
        const next = { ...manualState };
        for (const row of manual) {
          if (seen.has(row.item_key)) continue;
          seen.add(row.item_key);
          if (next[row.item_key]) next[row.item_key] = { passed: !!row.passed, notes: row.notes || '', saved: true };
        }
        setManualState(next);
      }
      const { data: stages } = await supabase.from('qa_pipeline_stage_results')
        .select('workflow_key, passed, created_at').order('created_at', { ascending: false }).limit(100);
      if (stages) {
        const seen = new Set<string>();
        const map: Record<string, { passed: boolean; ts: string }> = {};
        for (const s of stages) {
          if (seen.has(s.workflow_key)) continue;
          seen.add(s.workflow_key);
          map[s.workflow_key] = { passed: !!s.passed, ts: s.created_at };
        }
        setStageResults(map);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Workflow walker ----------
  const recordStage = async (workflowKey: string, passed: boolean) => {
    setStageBusy(workflowKey);
    const { error } = await supabase.from('qa_pipeline_stage_results').insert({
      run_id: walkRunId,
      workflow_key: workflowKey,
      passed,
      manual_flag: true,
      notes: stageNotes[workflowKey] || null,
    });
    setStageBusy(null);
    if (error) { toast.error('Save failed: ' + error.message); return; }
    setStageResults(prev => ({ ...prev, [workflowKey]: { passed, ts: new Date().toISOString() } }));
    setStageNotes(prev => ({ ...prev, [workflowKey]: '' }));
    toast.success(`${workflowKey}: ${passed ? 'PASS' : 'FAIL'}`);
  };

  // ---------- Manual checklist ----------
  const saveManual = async (key: string) => {
    setManualSavingKey(key);
    const cur = manualState[key];
    const { error } = await supabase.from('qa_manual_runs').insert({
      item_key: key, passed: cur.passed, notes: cur.notes || null,
    });
    setManualSavingKey(null);
    if (error) { toast.error('Save failed: ' + error.message); return; }
    setManualState(prev => ({ ...prev, [key]: { ...cur, saved: true } }));
    toast.success('Saved');
  };

  return (
    <AdminLayout activeTab="multi-agency-qa">
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Beaker className="w-6 h-6 text-primary" /> Pipeline QA Harness
            </h1>
            <p className="text-sm text-muted-foreground">
              Seed sized portfolios, walk every workflow, and track manual practice runs. All rows tagged <code>is_demo:true</code>.
            </p>
          </div>
          <Button onClick={teardown} variant="destructive" size="sm" disabled={tearing}>
            {tearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Teardown all demo
          </Button>
        </div>

        {/* ---------- Portfolio seeder ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Seed portfolio (pick size × count)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {SIZE_DEFS.map(s => (
                <div key={s.key} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">{s.label}</Label>
                    {s.async && <Badge variant="outline" className="text-[9px] py-0 px-1">async</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.tenants}</p>
                  <Input
                    type="number" min={0} max={s.async ? 5 : 20}
                    value={sizeMix[s.key]}
                    onChange={e => setSizeMix(prev => ({ ...prev, [s.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="h-8"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={seedPortfolio} disabled={portfolioLoading || totalAgencies === 0}>
                {portfolioLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Seed Portfolio ({totalAgencies} PHAs{isAsync ? ', background' : ''})
              </Button>
              <p className="text-xs text-muted-foreground">
                Auto-includes 1 shared landlord across first 4 PHAs + 1 duplicate-email landlord on first 2 (forces merge flow).
              </p>
            </div>
            {activeRun && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Run {String(activeRun.id).slice(0, 8)}</span>
                  <Badge variant={
                    activeRun.status === 'completed' ? 'default'
                    : activeRun.status === 'failed' ? 'destructive' : 'secondary'
                  }>{activeRun.status}</Badge>
                </div>
                <Progress value={activeRun.progress_pct || 0} />
                {activeRun.summary?.counts && (
                  <p className="text-xs text-muted-foreground">
                    {activeRun.summary.counts.agencies} agencies · {activeRun.summary.counts.landlords} landlords · {activeRun.summary.counts.hap_contracts} HAP contracts
                  </p>
                )}
                {activeRun.error && <p className="text-xs text-destructive">{activeRun.error}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------- Quick 3-PHA seed (legacy, kept) ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1b. Quick 3-PHA seed (RLS + perf checks)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={seed} disabled={seeding} variant="outline" size="sm">
                {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Seed 3 Demo PHAs
              </Button>
              {agencies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {agencies.map(a => <Badge key={a.id} variant="secondary">{a.name}</Badge>)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap pt-2 border-t">
              <Button onClick={runRlsChecks} variant="outline" size="sm" disabled={agencies.length < 2}>
                <Shield className="w-4 h-4 mr-2" /> Run RLS checks
              </Button>
              <Button onClick={runPerf} variant="outline" size="sm" disabled={agencies.length === 0}>
                <Timer className="w-4 h-4 mr-2" /> Time HAP fetches
              </Button>
              {perfMs !== null && <Badge variant="secondary">{perfMs} ms × {agencies.length} agencies</Badge>}
            </div>
            {rlsResults.length > 0 && (
              <ul className="space-y-2">
                {rlsResults.map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-sm border rounded p-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{c.detail}</span>
                      <Badge variant={c.passed ? 'default' : 'destructive'}>{c.passed ? 'PASS' : 'FAIL'}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ---------- Workflow walker ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Walk the workflows</CardTitle>
            <p className="text-xs text-muted-foreground">
              Click "Walk it" to open the workflow in a new tab, then mark Pass/Fail. Notes optional. Recorded against latest run.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {WORKFLOWS.map(wf => {
              const result = stageResults[wf.key];
              return (
                <div key={wf.key} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{wf.label}</span>
                      {result && (
                        <Badge variant={result.passed ? 'default' : 'destructive'} className="text-[10px]">
                          {result.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button asChild size="sm" variant="outline">
                        <a href={wf.route} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" /> Walk it
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" disabled={stageBusy === wf.key}
                        onClick={() => recordStage(wf.key, true)}>
                        <Check className="w-3 h-3 mr-1 text-green-600" /> Pass
                      </Button>
                      <Button size="sm" variant="outline" disabled={stageBusy === wf.key}
                        onClick={() => recordStage(wf.key, false)}>
                        <X className="w-3 h-3 mr-1 text-destructive" /> Fail
                      </Button>
                    </div>
                  </div>
                  <Input
                    placeholder="Optional note (issue, blocker, time taken…)"
                    value={stageNotes[wf.key] || ''}
                    onChange={e => setStageNotes(prev => ({ ...prev, [wf.key]: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ---------- Manual checklist ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Manual practice checklist</CardTitle>
            <p className="text-xs text-muted-foreground">
              Off-platform / human-in-the-loop tests. Check, add notes, save.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {MANUAL_ITEMS.map(item => {
              const cur = manualState[item.key];
              return (
                <div key={item.key} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={cur.passed}
                      onCheckedChange={(v) => setManualState(prev => ({
                        ...prev, [item.key]: { ...prev[item.key], passed: !!v, saved: false },
                      }))}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm font-medium cursor-pointer">{item.label}</Label>
                        {cur.saved && <Badge variant="secondary" className="text-[10px]">saved</Badge>}
                      </div>
                      <Textarea
                        placeholder="Notes / observations…"
                        value={cur.notes}
                        onChange={e => setManualState(prev => ({
                          ...prev, [item.key]: { ...prev[item.key], notes: e.target.value, saved: false },
                        }))}
                        rows={2}
                        className="text-xs"
                      />
                      <Button size="sm" variant="outline"
                        disabled={manualSavingKey === item.key}
                        onClick={() => saveManual(item.key)}>
                        {manualSavingKey === item.key ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                        Save run
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default MultiAgencyQa;
