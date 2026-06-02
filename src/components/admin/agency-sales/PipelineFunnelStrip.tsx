import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { usePipelineCards, PIPELINE_STAGES, type PipelineStage } from './usePipelineData';

interface Props {
  onStageClick?: (stage: PipelineStage | 'all') => void;
  activeStage?: PipelineStage | 'all';
}

const FUNNEL_ORDER: PipelineStage[] = [
  'prospect', 'qualified', 'demo', 'proposal', 'procurement', 'signed', 'live',
];

export function PipelineFunnelStrip({ onStageClick, activeStage = 'all' }: Props) {
  const { data: cards = [] } = usePipelineCards();

  const counts = useMemo(() => {
    const map = {
      prospect: 0, qualified: 0, engaged: 0, demo: 0, proposal: 0, negotiation: 0,
      procurement: 0, signed: 0, agreement: 0, onboarding: 0, live: 0, lost: 0,
    } as Record<PipelineStage, number>;
    cards.forEach((c) => { map[c.stage] = (map[c.stage] ?? 0) + 1; });
    return map;
  }, [cards]);

  // Total monthly recurring revenue across the funnel (proposal_amount stored as monthly).
  const mrrByStage = useMemo(() => {
    const m = {} as Record<PipelineStage, number>;
    cards.forEach((c) => {
      const amt = Number(c.proposal_amount) || 0;
      m[c.stage] = (m[c.stage] ?? 0) + amt;
    });
    return m;
  }, [cards]);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => onStageClick?.('all')}
          className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeStage === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          All <span className="opacity-70">{cards.length}</span>
        </button>
        <div className="h-5 w-px bg-border mx-1" />
        {FUNNEL_ORDER.map((stage, i) => {
          const label = PIPELINE_STAGES.find((s) => s.id === stage)?.label ?? stage;
          const n = counts[stage];
          const prev = i > 0 ? counts[FUNNEL_ORDER[i - 1]] : null;
          const conv = prev && prev > 0 ? Math.round((n / prev) * 100) : null;
          const isActive = activeStage === stage;
          const mrr = mrrByStage[stage] ?? 0;
          return (
            <div key={stage} className="flex items-center shrink-0">
              <button
                onClick={() => onStageClick?.(stage)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                title={mrr > 0 ? `${label} • $${mrr.toLocaleString()}/mo MRR` : label}
              >
                {label} <span className="opacity-70">{n}</span>
                {conv != null && (
                  <span className={`ml-1 text-[10px] ${isActive ? 'opacity-90' : 'text-muted-foreground'}`}>
                    ({conv}%)
                  </span>
                )}
              </button>
              {i < FUNNEL_ORDER.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
              )}
            </div>
          );
        })}
        <div className="h-5 w-px bg-border mx-1" />
        <button
          onClick={() => onStageClick?.('lost')}
          className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeStage === 'lost' ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Lost <span className="opacity-70">{counts.lost}</span>
        </button>
      </div>
    </div>
  );
}
