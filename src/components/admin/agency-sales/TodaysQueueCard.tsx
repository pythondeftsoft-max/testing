import { useMemo } from 'react';
import { AlertCircle, Clock, CalendarDays, Flame } from 'lucide-react';
import { usePipelineCards, queueBucket, isStuck } from './usePipelineData';

export type QueueFilter = 'overdue' | 'today' | 'upcoming' | 'stuck' | null;

interface Props {
  active: QueueFilter;
  onChange: (next: QueueFilter) => void;
}

/**
 * Compact "what to do now" strip. Replaces the standalone Follow-ups tab —
 * same data (next_action_at), surfaced in-place above the deal table.
 */
export function TodaysQueueCard({ active, onChange }: Props) {
  const { data: cards = [] } = usePipelineCards();

  const buckets = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let stuck = 0;
    for (const c of cards) {
      if (c.stage === 'live' || c.stage === 'lost') continue;
      const b = queueBucket(c.next_action_at);
      if (b === 'overdue') overdue++;
      else if (b === 'today') today++;
      else if (b === 'upcoming') upcoming++;
      if (isStuck(c)) stuck++;
    }
    return { overdue, today, upcoming, stuck };
  }, [cards]);

  const tile = (key: Exclude<QueueFilter, null>, icon: React.ReactNode, label: string, value: number, tone: string) => {
    const isActive = active === key;
    return (
      <button
        type="button"
        onClick={() => onChange(isActive ? null : key)}
        className={`flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
          isActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
        }`}
      >
        <div className={`rounded-md p-2 ${tone}`}>{icon}</div>
        <div className="leading-tight">
          <div className="text-xl font-semibold tabular-nums">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </button>
    );
  };

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">Today's queue</div>
        {active && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tile('overdue', <AlertCircle className="h-4 w-4 text-destructive" />, 'Overdue follow-ups', buckets.overdue, 'bg-destructive/10')}
        {tile('today', <Clock className="h-4 w-4 text-amber-600" />, 'Due today', buckets.today, 'bg-amber-100 dark:bg-amber-900/30')}
        {tile('upcoming', <CalendarDays className="h-4 w-4 text-emerald-600" />, 'Upcoming', buckets.upcoming, 'bg-emerald-100 dark:bg-emerald-900/30')}
        {tile('stuck', <Flame className="h-4 w-4 text-orange-600" />, 'Stuck (past stage SLA)', buckets.stuck, 'bg-orange-100 dark:bg-orange-900/30')}
      </div>
    </div>
  );
}
