import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  RotateCcw,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  formatCurrency,
  TIER_BADGE_CLASS,
  TIER_LABELS,
  type PricingResult,
  type PricingOverride,
  type SetupFeeOption,
} from '@/lib/prospectPricing';
import { CostToServePanel } from './CostToServePanel';

interface Props {
  pricing: PricingResult;
  utilizationPct?: number | null;
  onSaveOverride?: (override: PricingOverride | null) => Promise<void> | void;
  onSyncHud?: () => Promise<void> | void;
  hudSyncing?: boolean;
  saving?: boolean;
}

export function WalletQuoteCard({
  pricing,
  utilizationPct,
  onSaveOverride,
  onSyncHud,
  hudSyncing,
  saving,
}: Props) {
  const [showStack, setShowStack] = useState(false);
  const [setupChoice, setSetupChoice] = useState<SetupFeeOption['key']>('standard');
  const [editing, setEditing] = useState(false);
  const [draftAnnual, setDraftAnnual] = useState<string>('');
  const [draftSetup, setDraftSetup] = useState<string>('');
  const [draftRationale, setDraftRationale] = useState<string>('');

  if (!pricing.hasData) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        No unit count or admin fee data available — can't size this PHA yet.
      </div>
    );
  }

  const chosenSetup = pricing.setupFeeOptions.find((o) => o.key === setupChoice);
  const units = pricing.leasedUnits;

  const startEdit = () => {
    setDraftAnnual(String(pricing.finalAnnual || pricing.suggestedAnnual));
    setDraftSetup(String(pricing.finalSetup || 0));
    setDraftRationale(pricing.override?.rationale ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    const annual = Number(draftAnnual.replace(/[^\d.]/g, ''));
    const setup = Number(draftSetup.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(annual) || annual < 0) return;
    await onSaveOverride?.({
      annual_usd: annual,
      setup_usd: Number.isFinite(setup) ? setup : null,
      rationale: draftRationale.trim() || null,
    });
    setEditing(false);
  };

  const revertOverride = async () => {
    await onSaveOverride?.(null);
    setEditing(false);
  };

  // Live preview of per-vch from draft
  const draftAnnualNum = Number(draftAnnual.replace(/[^\d.]/g, '')) || 0;
  const draftPerVch = units > 0 ? draftAnnualNum / 12 / units : 0;

  return (
    <div className="space-y-3 rounded-md border p-3">
      {/* Top: tier + basis */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className={TIER_BADGE_CLASS[pricing.tier]}>
          {TIER_LABELS[pricing.tier]}
        </Badge>
        {pricing.isFallback ? (
          <Badge
            variant="outline"
            className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
          >
            <AlertTriangle className="h-3 w-3" /> Fallback estimate
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          >
            <CheckCircle2 className="h-3 w-3" /> Official HUD
          </Badge>
        )}
        {pricing.hasOverride && (
          <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
            Manual quote
          </Badge>
        )}
        {utilizationPct != null && (
          <span
            className={`ml-auto font-mono ${
              utilizationPct < 90
                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            HCV util: {utilizationPct.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Per-PHA HUD rate check (cheap DB lookup, no global re-sync) */}
      {onSyncHud && (
        <div
          className={`flex items-start justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
            pricing.isFallback
              ? 'border-amber-500/30 bg-amber-500/10'
              : 'border-emerald-500/30 bg-emerald-500/10'
          }`}
        >
          <span className={pricing.isFallback ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>
            {pricing.isFallback ? (
              <>
                Using <span className="font-mono">$85/unit</span> fallback. ~1,640 PHAs aren't in the
                published HUD CY 2025 schedule (too small, recently merged, or state-funded). Click to
                check, then set a manual quote if no rate exists.
              </>
            ) : (
              'Official HUD admin-fee rate in use for this PHA'
            )}
          </span>
          <Button
            size="sm"
            variant={pricing.isFallback ? 'default' : 'ghost'}
            onClick={() => onSyncHud()}
            disabled={hudSyncing}
            className="h-6 shrink-0 px-2 text-[11px]"
          >
            {hudSyncing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Check HUD rate
          </Button>
        </div>
      )}

      {/* Quote — headline */}
      {!editing ? (
        <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {pricing.hasOverride ? 'Your quote' : 'Suggested quote'}
            </div>
            {onSaveOverride && (
              <Button
                size="sm"
                variant="ghost"
                onClick={startEdit}
                className="h-6 px-2 text-[11px]"
              >
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
            )}
          </div>
          <div className="mt-1 grid grid-cols-3 gap-3">
            <div>
              <div className="text-lg font-semibold tabular-nums">
                {formatCurrency(pricing.finalAnnual)}
              </div>
              <div className="text-[11px] text-muted-foreground">per year</div>
            </div>
            <div>
              <div className="text-lg font-semibold tabular-nums">
                {formatCurrency(pricing.finalMonthly)}
              </div>
              <div className="text-[11px] text-muted-foreground">per month</div>
            </div>
            <div>
              <div className="text-lg font-semibold tabular-nums">
                ${pricing.finalPerVoucherMonthly.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground">per voucher / mo</div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {pricing.hasOverride ? (
              <>
                vs suggested {formatCurrency(pricing.suggestedAnnual)} ·{' '}
                {pricing.override?.rationale && <em>"{pricing.override.rationale}"</em>}
              </>
            ) : (
              <>
                Midpoint of {(pricing.walletLowPct * 100).toFixed(1)}–
                {(pricing.walletHighPct * 100).toFixed(1)}% of admin budget · industry benchmark{' '}
                {pricing.benchmarkRange}
              </>
            )}
          </div>

          {/* TCO seats — what they GET for the quote */}
          {pricing.seats.totalUsers > 0 && (
            <div className="mt-3 rounded border border-primary/15 bg-background/60 p-2">
              <div className="text-[11px] font-medium text-foreground">
                All-in: {formatCurrency(pricing.finalMonthly)}/mo covers ~
                {pricing.seats.totalUsers.toLocaleString()} total users · unlimited workflows
              </div>
              <div className="mt-1 grid grid-cols-4 gap-2 text-[11px]">
                <SeatStat label="Tenants" value={pricing.seats.tenants} />
                <SeatStat label="Landlords" value={pricing.seats.landlords} />
                <SeatStat label="Caseworkers" value={pricing.seats.caseworkers} />
                <SeatStat label="Inspectors" value={pricing.seats.inspectors} />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                ≈ ${pricing.seats.perUserPerMonth.toFixed(2)}/user/mo (flat per-voucher pricing — no
                seat caps).
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Edit quote ({units.toLocaleString()} vouchers)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Annual ($)</label>
              <Input
                type="text"
                value={draftAnnual}
                onChange={(e) => setDraftAnnual(e.target.value)}
                className="h-8 text-sm"
                placeholder="e.g. 48000"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Setup fee ($)</label>
              <Input
                type="text"
                value={draftSetup}
                onChange={(e) => setDraftSetup(e.target.value)}
                className="h-8 text-sm"
                placeholder="0 = free"
              />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            ≈ {formatCurrency(draftAnnualNum / 12)}/mo · ${draftPerVch.toFixed(2)}/vch/mo
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Rationale (optional)</label>
            <Textarea
              value={draftRationale}
              onChange={(e) => setDraftRationale(e.target.value)}
              className="text-sm"
              rows={2}
              placeholder="e.g. matched ProLink renewal, MTW discount, pilot pricing"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button size="sm" onClick={saveEdit} disabled={saving} className="h-7 text-xs">
              {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Save quote
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            {pricing.hasOverride && (
              <Button
                size="sm"
                variant="ghost"
                onClick={revertOverride}
                className="ml-auto h-7 text-xs text-muted-foreground"
              >
                <RotateCcw className="mr-1 h-3 w-3" /> Revert to suggested
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Cost to serve & profit (inline summary, deep-links to full estimator) */}
      <CostToServePanel
        leasedUnits={units}
        annualQuote={pricing.finalAnnual}
        monthlyQuote={pricing.finalMonthly}
        setupFee={chosenSetup?.amount ?? 0}
      />

      {/* Setup fee picker (only relevant when no override) */}
      {!pricing.hasOverride && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium">Setup fee</div>
          <div className="flex flex-wrap gap-1.5">
            {pricing.setupFeeOptions.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={setupChoice === opt.key ? 'default' : 'outline'}
                onClick={() => setSetupChoice(opt.key)}
                className="h-auto py-1.5 px-2.5 text-xs"
              >
                <span className="mr-1.5 font-mono">
                  {opt.amount === 0 ? '$0' : formatCurrency(opt.amount)}
                </span>
                {opt.label}
              </Button>
            ))}
          </div>
          {chosenSetup && (
            <p className="text-[11px] text-muted-foreground">{chosenSetup.rationale}</p>
          )}
        </div>
      )}

      {/* Cost-stack disclosure */}
      <Collapsible open={showStack} onOpenChange={setShowStack}>
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="text-muted-foreground">Admin fee budget (CY total)</div>
            <div className="font-mono text-sm font-semibold">
              {formatCurrency(pricing.adminBudget)}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
              {showStack ? 'Hide' : 'Show'} cost stack
              <ChevronDown
                className={`ml-1 h-3 w-3 transition-transform ${showStack ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2 space-y-1">
          {pricing.costStack.map((line) => {
            const isItLine = line.key === 'software_it';
            return (
              <div
                key={line.key}
                className={`flex items-center justify-between text-xs ${
                  isItLine ? 'rounded bg-primary/10 px-1.5 py-0.5 font-medium' : ''
                }`}
              >
                <span className="text-muted-foreground">
                  − {line.label} ({(line.pct * 100).toFixed(0)}%)
                </span>
                <span className="font-mono">−{formatCurrency(line.amount)}</span>
              </div>
            );
          })}
          <div className="mt-1.5 flex items-center justify-between border-t pt-1.5 text-xs">
            <span className="font-medium">Discretionary remaining</span>
            <span className="font-mono font-semibold">
              {formatCurrency(pricing.discretionaryRemaining)}
            </span>
          </div>
          <div className="mt-1 rounded border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
            Their current IT line (~5% of admin) ≈{' '}
            <span className="font-mono">{formatCurrency(pricing.currentItSpend)}</span>. That's the
            existing operating-budget pot we displace — landing inside it avoids a procurement
            cycle.
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Basis line */}
      <p className="text-[10px] text-muted-foreground">{pricing.basisLabel}</p>
    </div>
  );
}

function SeatStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-muted/40 px-1.5 py-1 text-center">
      <div className="font-mono text-[12px] font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
