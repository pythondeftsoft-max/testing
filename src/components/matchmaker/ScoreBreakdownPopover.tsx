import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { MATCH_POINTS } from '@/lib/matchScoringConstants';

export interface BreakdownInput {
  location?: number;
  bedrooms?: number;
  budget?: number;
  timing?: number;
  move_in?: number; // legacy alias for timing
}

interface ScoreBreakdownPopoverProps {
  score: number;
  breakdown: BreakdownInput;
  tier?: 'hot_match' | 'decent_match' | 'no_match' | 'excluded' | null;
  children: React.ReactNode;
}

const FACTORS: Array<{ key: 'location' | 'bedrooms' | 'budget' | 'timing'; label: string; max: number }> = [
  { key: 'location', label: 'Location', max: MATCH_POINTS.location },
  { key: 'bedrooms', label: 'Bedrooms', max: MATCH_POINTS.bedrooms },
  { key: 'budget', label: 'Budget', max: MATCH_POINTS.budget },
  { key: 'timing', label: 'Timing', max: MATCH_POINTS.timing },
];

// Detect whether values look like 0-100 percentages or already-weighted point allocations
const looksLikePercentages = (b: BreakdownInput) => {
  const vals = [b.location, b.bedrooms, b.budget, b.timing ?? b.move_in].filter(
    (v): v is number => typeof v === 'number'
  );
  if (vals.length === 0) return true;
  const max = Math.max(...vals);
  return max > MATCH_POINTS.location; // >40 means it's a percentage
};

const tierLabel = (tier?: string | null, score?: number) => {
  if (tier === 'hot_match' || (score ?? 0) >= 80) return { label: '🔥 Hot Match', color: 'text-success' };
  if (tier === 'decent_match' || (score ?? 0) >= 60) return { label: '👍 Decent Match', color: 'text-warning' };
  if (tier === 'excluded') return { label: '✕ Excluded', color: 'text-destructive' };
  return { label: 'No Match', color: 'text-muted-foreground' };
};

export const ScoreBreakdownPopover = ({ score, breakdown, tier, children }: ScoreBreakdownPopoverProps) => {
  const isPct = looksLikePercentages(breakdown);
  const t = tierLabel(tier, score);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Match Score</div>
              <div className="text-3xl font-bold">{score}<span className="text-base text-muted-foreground">/100</span></div>
            </div>
            <span className={cn('text-sm font-medium', t.color)}>{t.label}</span>
          </div>

          <div className="space-y-2 pt-1 border-t">
            {FACTORS.map(({ key, label, max }) => {
              const raw = key === 'timing' ? (breakdown.timing ?? breakdown.move_in ?? 0) : (breakdown[key] ?? 0);
              const points = isPct ? Math.round((raw / 100) * max) : Math.round(raw);
              const pct = Math.max(0, Math.min(100, (points / max) * 100));
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-medium">
                      {points}<span className="text-muted-foreground">/{max}</span>
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground pt-1 border-t">
            Pets &amp; freshness are hard filters, not score factors.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
