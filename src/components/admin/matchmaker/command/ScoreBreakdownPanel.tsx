import { cn, formatCurrency } from '@/lib/utils';
import type { MatchBreakdown, CommandMatch } from '@/hooks/useMatchCommandCenter';
import { getTierLabel, getFactorTextColor, normalizeBreakdown } from '@/hooks/useMatchCommandCenter';

interface ScoreBreakdownPanelProps {
  match: CommandMatch;
}

interface ScoreRowProps {
  label: string;
  percentage: number;
  detail: string;
}

const ScoreRow = ({ label, percentage, detail }: ScoreRowProps) => {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
      <div className="w-20 text-sm text-muted-foreground">{label}</div>
      <div className={cn("w-12 font-mono text-sm font-medium", getFactorTextColor(percentage))}>
        {percentage}%
      </div>
      <div className="flex-1 text-sm text-muted-foreground truncate" title={detail}>
        {detail}
      </div>
    </div>
  );
};

const TierBadge = ({ score }: { score: number }) => {
  const tier = getTierLabel(score);
  
  const configs = {
    Strong: { className: 'bg-green-100 text-green-700 border-green-200' },
    Viable: { className: 'bg-blue-100 text-blue-700 border-blue-200' },
    Conditional: { className: 'bg-orange-100 text-orange-700 border-orange-200' },
    Poor: { className: 'bg-red-100 text-red-700 border-red-200' },
  };

  const config = configs[tier.label];

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium",
      config.className
    )}>
      {tier.label.toUpperCase()}
      <span className="font-mono">{score}%</span>
    </div>
  );
};

export const ScoreBreakdownPanel = ({ match }: ScoreBreakdownPanelProps) => {
  // Normalize breakdown to handle legacy point-based data
  const b = normalizeBreakdown(match.breakdown);
  
  // Build detail strings
  const locationDetail = (() => {
    if (match.drive_time_minutes) {
      return `${match.drive_time_minutes} min drive (${match.drive_time_source})`;
    }
    return 'Drive time unknown';
  })();

  const budgetDetail = (() => {
    const budget = match.tenant_budget;
    const rent = match.property_rent;
    if (!budget || !rent) return 'Missing data';
    const ratio = budget / rent;
    if (ratio >= 1.2) return `${formatCurrency(budget)} budget (20%+ buffer)`;
    if (ratio >= 1.0) return `${formatCurrency(budget)} budget ≥ ${formatCurrency(rent)} rent`;
    return `${formatCurrency(budget)} budget < ${formatCurrency(rent)} rent`;
  })();

  const bedroomDetail = (() => {
    const needs = match.tenant_bedrooms;
    const has = match.property_bedrooms;
    if (!needs?.length || !has) return 'Missing data';
    const needsStr = needs.length === 1 ? `${needs[0]}` : `${needs.join('/')}`;
    
    // Parse approved bedrooms
    const parsedNeeds = needs.map(br => {
      if (typeof br === 'number') return br;
      const m = String(br).match(/(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    }).filter((n): n is number => n !== null);
    
    const exactMatch = parsedNeeds.includes(has);
    
    if (exactMatch) return `Approved ${needsStr}, property has ${has}BR ✓`;
    return `Needs ${needsStr}, property has ${has}BR`;
  })();

  const timingDetail = b.move_in >= 80 ? 'Move-in timeline set' : 'No move-in preference';

  return (
    <div className="space-y-4">
      {/* Total Score */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Overall Match</span>
        <TierBadge score={match.score} />
      </div>

      {/* Breakdown Table */}
      <div className="bg-muted/30 rounded-lg p-3 border">
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Factor Breakdown
        </div>
        
        <ScoreRow label="Location" percentage={b.location} detail={locationDetail} />
        <ScoreRow label="Bedrooms" percentage={b.bedrooms} detail={bedroomDetail} />
        <ScoreRow label="Budget" percentage={b.budget} detail={budgetDetail} />
        <ScoreRow label="Timing" percentage={b.move_in} detail={timingDetail} />
        
        <div className="flex items-center gap-3 pt-2 mt-2 border-t border-border font-medium">
          <div className="w-20 text-sm">Weighted</div>
          <div className={cn("w-12 font-mono text-sm font-medium", getFactorTextColor(match.score))}>
            {match.score}%
          </div>
          <div className="flex-1 text-sm">
            {match.score >= 80 && '🔥 Strong recommendation'}
            {match.score >= 60 && match.score < 80 && '✓ Viable match'}
            {match.score >= 40 && match.score < 60 && '⚠️ Conditional - review factors'}
            {match.score < 40 && '✕ Poor fit'}
          </div>
        </div>
      </div>

      {/* Scoring Explanation */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Weights (v4):</strong> Location 40%, Bedrooms 30%, Budget 20%, Timing 10%</p>
        <p><strong>Tiers:</strong> Strong (80%+), Viable (60-79%), Conditional (40-59%), Poor (&lt;40%)</p>
        <p><strong>Hard filters:</strong> Pets mismatch &amp; 45+ min drive time exclude the match.</p>
      </div>
    </div>
  );
};