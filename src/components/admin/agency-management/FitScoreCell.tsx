import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  TIER_BADGE_CLASS,
  DATA_QUALITY_LABEL,
  DATA_QUALITY_DOT_CLASS,
  type ScoringResult,
} from '@/lib/prospectScoring';

interface Props {
  scoring: ScoringResult;
}

export function FitScoreCell({ scoring }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5"
        >
          <Badge variant="outline" className={`${TIER_BADGE_CLASS[scoring.tier]} cursor-help`}>
            {scoring.score}
          </Badge>
          <span
            className={`h-2 w-2 rounded-full ${DATA_QUALITY_DOT_CLASS[scoring.dataQuality]}`}
            aria-label={DATA_QUALITY_LABEL[scoring.dataQuality]}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">{scoring.tierLabel} · {scoring.score}/100</span>
          <span className="text-xs text-muted-foreground">{DATA_QUALITY_LABEL[scoring.dataQuality]}</span>
        </div>
        <ul className="space-y-1.5 text-xs">
          {scoring.breakdown.map((b, i) => (
            <li key={i} className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{b.label}</div>
                <div className="text-muted-foreground">{b.detail}</div>
              </div>
              <span className={`font-mono ${b.points < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {b.points >= 0 ? '+' : ''}{b.points}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
