import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calculator,
} from 'lucide-react';
import { fmt } from '@/lib/cost-model';
import {
  estimateProspectCost,
  computeProfit,
} from '@/lib/prospectCostEstimate';

interface Props {
  leasedUnits: number;
  annualQuote: number;
  monthlyQuote: number;
  setupFee: number;
}

const TIER_BADGE: Record<'healthy' | 'thin' | 'low', string> = {
  healthy:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  thin: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  low: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
};

const TIER_ICON = {
  healthy: CheckCircle2,
  thin: AlertTriangle,
  low: AlertTriangle,
};

export function CostToServePanel({
  leasedUnits,
  annualQuote,
  monthlyQuote,
  setupFee,
}: Props) {
  const navigate = useNavigate();
  const [showStack, setShowStack] = useState(false);

  const estimate = useMemo(
    () => estimateProspectCost(leasedUnits),
    [leasedUnits],
  );
  const profit = useMemo(
    () =>
      computeProfit(annualQuote, monthlyQuote, estimate.monthlyCost, setupFee),
    [annualQuote, monthlyQuote, estimate.monthlyCost, setupFee],
  );

  if (leasedUnits <= 0 || annualQuote <= 0) return null;

  const TierIcon = TIER_ICON[profit.tier];
  const tierLabel =
    profit.tier === 'healthy'
      ? 'Healthy margin'
      : profit.tier === 'thin'
      ? 'Thin margin'
      : 'Low margin — consider bumping quote';

  const stack = [
    { label: 'Database', value: estimate.breakdown.database },
    { label: 'File storage', value: estimate.breakdown.fileStorage },
    { label: 'Edge functions', value: estimate.breakdown.edgeFunctions },
    { label: 'Bandwidth', value: estimate.breakdown.bandwidth },
    { label: 'Email (Resend)', value: estimate.breakdown.email },
    { label: 'SMS (Quo)', value: estimate.breakdown.sms },
    { label: 'AI (OCR)', value: estimate.breakdown.ai },
    { label: 'Checkbook.io', value: estimate.breakdown.checkbook },
  ];

  const openEstimator = () => {
    const params = new URLSearchParams({
      units: String(leasedUnits),
      quote: String(Math.round(annualQuote)),
    });
    navigate(`/admin/cost-estimator?${params.toString()}`);
  };

  return (
    <div className="rounded-md border border-primary/20 bg-background p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Calculator className="h-3 w-3" />
          Cost to serve & profit
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={openEstimator}
          className="h-6 px-2 text-[11px]"
        >
          Open in Cost Estimator <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>

      {/* 3-row mini grid: cost / quote / profit */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-sm">
        <div className="text-muted-foreground">Our infra cost</div>
        <div className="text-right font-mono tabular-nums">
          {fmt(estimate.monthlyCost)}/mo
        </div>
        <div className="text-right font-mono tabular-nums text-muted-foreground">
          {fmt(estimate.annualCost)}/yr
        </div>

        <div className="text-muted-foreground">Suggested quote</div>
        <div className="text-right font-mono tabular-nums">
          {fmt(monthlyQuote)}/mo
        </div>
        <div className="text-right font-mono tabular-nums text-muted-foreground">
          {fmt(annualQuote)}/yr
        </div>

        <div className="font-medium text-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          Gross profit
        </div>
        <div
          className={`text-right font-mono tabular-nums font-semibold ${
            profit.marginMonthly >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          {fmt(profit.marginMonthly)}/mo
        </div>
        <div
          className={`text-right font-mono tabular-nums font-semibold ${
            profit.marginAnnual >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          {fmt(profit.marginAnnual)}/yr
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={`gap-1 text-[11px] ${TIER_BADGE[profit.tier]}`}
        >
          <TierIcon className="h-3 w-3" />
          {profit.marginPct.toFixed(0)}% margin · {tierLabel}
        </Badge>
        {profit.paybackMonths != null && setupFee > 0 && (
          <span className="text-[11px] text-muted-foreground">
            Payback on {fmt(setupFee)} setup ≈ {profit.paybackMonths.toFixed(1)} mo
          </span>
        )}
      </div>

      <Collapsible open={showStack} onOpenChange={setShowStack}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                showStack ? 'rotate-180' : ''
              }`}
            />
            {showStack ? 'Hide' : 'Show'} cost stack
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-1 rounded border bg-muted/30 p-2">
            {stack.map((s) => (
              <div
                key={s.label}
                className="flex justify-between text-[11px] text-muted-foreground"
              >
                <span>{s.label}</span>
                <span className="font-mono tabular-nums">{fmt(s.value)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t pt-1 text-[11px] font-semibold text-foreground">
              <span>Total / mo</span>
              <span className="font-mono tabular-nums">
                {fmt(estimate.monthlyCost)}
              </span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground italic">
            Estimate based on {leasedUnits.toLocaleString()} vouchers using
            standard staff/workflow ratios. Tweak in Cost Estimator.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
