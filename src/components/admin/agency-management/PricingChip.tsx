import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { DollarSign, Info } from 'lucide-react';
import {
  computePricing,
  formatCurrency,
  TIER_BADGE_CLASS,
  TIER_LABELS,
  type PricingInputs,
} from '@/lib/prospectPricing';

interface Props extends PricingInputs {
  compact?: boolean;
}

export function PricingChip({ compact, ...inputs }: Props) {
  const p = computePricing(inputs);

  if (!p.hasData) {
    return (
      <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
        —
      </Badge>
    );
  }

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <Badge
          variant="outline"
          className={`gap-1 cursor-help font-mono ${TIER_BADGE_CLASS[p.tier]}`}
        >
          <DollarSign className="h-3 w-3" />
          {p.bandLabel}
          {!compact && <span className="text-[10px] opacity-70">/yr</span>}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm" align="start">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Info className="h-3 w-3" />
              SaaS WALLET ESTIMATE
            </div>
            <div className="mt-1 text-base font-semibold">
              {p.bandLabel}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / year ({TIER_LABELS[p.tier]})
              </span>
            </div>
          </div>

          <div className="space-y-1 rounded-md border bg-muted/30 p-2 text-xs">
            <Row
              label="Admin fee budget"
              value={formatCurrency(p.adminBudget)}
              hint={p.basisLabel}
            />
            <Row
              label="− Payroll (~65%)"
              value={`−${formatCurrency(p.payrollEstimate)}`}
              hint="Caseworkers, inspectors, ED, support"
              dim
            />
            <Row
              label="= Non-payroll opex"
              value={formatCurrency(p.nonPayrollOpex)}
              hint="Software, rent, training, audits, etc."
              bold
            />
            <div className="my-1 border-t" />
            <Row
              label="Realistic SaaS slice"
              value={p.bandLabel}
              hint={
                inputs.isMtw
                  ? '4–10% of admin budget (MTW agencies have bigger SaaS budgets)'
                  : '2–6% of admin budget (industry benchmark)'
              }
              bold
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            HAP funds (rent subsidy) are a separate pot and cannot fund operations or software.
            {p.isFallback ? ' Replace fallback estimates by seeding HUD admin fee rates.' : ''}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function Row({
  label,
  value,
  hint,
  bold,
  dim,
}: {
  label: string;
  value: string;
  hint?: string;
  bold?: boolean;
  dim?: boolean;
}) {
  return (
    <div className={dim ? 'opacity-70' : ''}>
      <div className="flex items-center justify-between gap-2">
        <span className={bold ? 'font-medium' : ''}>{label}</span>
        <span className={`font-mono ${bold ? 'font-semibold' : ''}`}>{value}</span>
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
